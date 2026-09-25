import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { buildInvoiceXml, csrToBase64, encodeQr, generateCsr, publicKeyPoint, readCertificate, signInvoice, type UblInvoice } from '@sinaaty/zatca-ubl';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { PiiCryptoService } from '../../../common/crypto';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import type { Invoice } from '../domain/invoice';
import { submissionMode, type CsidMaterial } from '../domain/zatca';
import { INVOICE_REPOSITORY, ZATCA_REPOSITORY, type InvoiceRepository, type ZatcaRepository } from '../domain/repositories';
import { ZATCA_PORT, type ZatcaPort } from './ports/zatca.port';

/**
 * ZATCA Phase 2 pipeline.
 *
 * Onboarding (per EGS unit): generate a secp256k1 key + CSR → compliance CSID → ZATCA replays compliance
 * documents against it → production CSID. The CSID (key + certificate) is stored AES-256-GCM encrypted.
 *
 * Issuing: reserve ICV + previous hash under a row lock → build UBL → sign (XAdES) → compute the hash →
 * build the Phase-2 QR from the signature and certificate → clear (B2B) or report (B2C) → persist the
 * signed XML, hash and QR, advance the chain, log the submission.
 *
 * A rejected invoice never advances the chain and never claims to be cleared.
 */
@Injectable()
export class ZatcaService {
  private readonly log = new Logger('Zatca');
  constructor(
    @Inject(ZATCA_REPOSITORY) private readonly repo: ZatcaRepository, @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(ZATCA_PORT) private readonly zatca: ZatcaPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly crypto: PiiCryptoService, private readonly audit: AuditLogWriter, private readonly config: AppConfig,
  ) {}
  private mustManage(u: AuthUser, orgId: string) { const m = membership(u, orgId); if (!isPlatformStaff(u) && (!m || !['owner', 'manager', 'accountant'].includes(m.role))) throw new AppError('FORBIDDEN'); }
  private material(enc: Buffer | null): CsidMaterial { if (!enc) throw new AppError('CONFLICT', { messageAr: 'لا توجد شهادة CSID لهذه الوحدة.', messageEn: 'Device has no CSID.' }); return JSON.parse(this.crypto.decrypt(enc)) as CsidMaterial; }
  private seal(m: CsidMaterial): Buffer { return this.crypto.encrypt(JSON.stringify(m)); }

  /**
   * Full onboarding in one call (the Fatoora portal OTP is the only human input).
   * Compliance checks run against the compliance CSID before production is requested — exactly ZATCA's order.
   */
  async onboard(u: AuthUser, orgId: string, dto: { unit_name: string; otp: string; production?: boolean }) {
    this.mustManage(u, orgId);
    const org = await this.orgs.findById(orgId); if (!org) throw new AppError('NOT_FOUND');
    if (!org.vatNumber) throw new AppError('VALIDATION', { messageAr: 'أضف الرقم الضريبي قبل تفعيل الفوترة الإلكترونية.', messageEn: 'Organization VAT number is required.' });
    const locations = await this.orgs.listLocations(orgId); const address = locations[0] ? `${locations[0].city}${locations[0].district ? ` - ${locations[0].district}` : ''}` : 'الرياض';
    const csr = generateCsr({
      commonName: `${org.slug ?? org.id.slice(0, 8)}-${dto.unit_name}`, organizationName: org.legalNameAr, organizationUnit: locations[0]?.nameAr ?? 'الفرع الرئيسي',
      egsSerialNumber: `1-Sinaaty|2-API|3-${dto.unit_name}`, vatNumber: org.vatNumber, invoiceTypeMask: '1100', registeredAddress: address,
      businessCategory: org.type, production: dto.production ?? this.config.get('INTEGRATION_ZATCA') === 'live', otp: dto.otp,
    });
    const key = `zatca.compliance:${orgId}:${dto.unit_name}`;
    const compliance = await this.zatca.complianceCsid(csrToBase64(csr.csrPem), dto.otp, key);
    // ZATCA validates sample documents signed by the compliance CSID before granting production access.
    const probe = this.complianceProbe(org.legalNameAr, org.vatNumber, csr.privateKeyPem, compliance.certificatePem);
    const check = await this.zatca.complianceCheck(compliance, probe.signedXml, probe.hash, probe.uuid, `${key}:check`);
    if (check.errors.length) throw new AppError('CONFLICT', { messageAr: 'فشل فحص التوافق مع هيئة الزكاة.', messageEn: 'ZATCA compliance check failed.', details: check.errors });
    const production = await this.zatca.productionCsid(compliance, compliance.requestId ?? '', `${key}:prod`);
    const material: CsidMaterial = { privateKeyPem: csr.privateKeyPem, certificatePem: production.certificatePem, binarySecurityToken: production.binarySecurityToken, secret: production.secret, complianceRequestId: compliance.requestId, production: true };
    const cert = readCertificate(production.certificatePem);
    const device = await this.uow.run(async (tx) => {
      const d = await this.repo.createDevice({ orgId, unitName: dto.unit_name, csidEnc: this.seal(material), isProduction: true, csidExpiresAt: null }, tx);
      await this.audit.write(tx, { action: 'zatca.onboard', entityType: 'zatca_device', entityId: d.id, orgId, actorUserId: u.id, after: { unit: dto.unit_name, cert_serial: cert.serialNumber, issuer: cert.issuerName, compliance_checked: true } });
      return d;
    });
    this.log.log(`org ${orgId} onboarded EGS ${dto.unit_name} (device ${device.id})`);
    return { device_id: device.id, unit_name: dto.unit_name, is_production: true, certificate_serial: cert.serialNumber, issuer: cert.issuerName };
  }
  /** A minimal but real invoice signed with the compliance CSID — what ZATCA replays during onboarding. */
  private complianceProbe(sellerName: string, vat: string, privateKeyPem: string, certificatePem: string) {
    const now = new Date().toISOString();
    const inv: UblInvoice = { id: 'COMPLIANCE-1', uuid: '00000000-0000-4000-8000-000000000001', issueDate: now.slice(0, 10), issueTime: now.slice(11, 19), typeCode: '388', subtype: '0200000', currency: 'SAR', icv: 1, pih: 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==', seller: { registrationName: sellerName, vatNumber: vat, city: 'الرياض' }, buyer: null, lines: [{ id: '1', name: 'compliance', quantity: '1', unitPrice: '1.00', lineExtension: '1.00', taxPercent: '15.00', taxAmount: '0.15', roundingAmount: '1.15' }], taxExclusive: '1.00', taxInclusive: '1.15', taxAmount: '0.15', allowanceTotal: '0.00', payableAmount: '1.15' };
    const xml = buildInvoiceXml(inv);
    const signed = signInvoice({ invoiceXml: xml, privateKeyPem, certificatePem });
    return { signedXml: signed.signedXml, hash: signed.invoiceHashBase64, uuid: inv.uuid };
  }
  devices(u: AuthUser, orgId: string) { this.mustManage(u, orgId); return this.repo.listDevices(orgId); }
  submissions(u: AuthUser, invoiceId: string) { return this.repo.listSubmissions(invoiceId).then(async (s) => { const inv = await this.invoices.findById(invoiceId); if (!inv) throw new AppError('NOT_FOUND'); this.mustManage(u, inv.orgId); return s; }); }

  /**
   * Signs and submits an issued invoice. Idempotent: an invoice already cleared/reported is returned as-is.
   * Returns `null` when the seller has no production CSID (Phase 1 QR stays in force — documented, not silent).
   */
  async signAndSubmit(invoice: Invoice, actorUserId: string | null): Promise<{ status: string; hash: string; qr: string } | null> {
    if (invoice.zatcaStatus === 'cleared' || invoice.zatcaStatus === 'reported') return { status: invoice.zatcaStatus, hash: invoice.zatcaHash ?? '', qr: invoice.zatcaQr ?? '' };
    const device = await this.repo.findActiveDevice(invoice.orgId);
    if (!device?.isProduction) return null;
    const material = this.material(device.csidEnc);
    const mode = submissionMode(invoice.type);
    // A credit/debit note must reference the ORIGINAL invoice's number in BillingReference (BR-KSA-56),
    // not its own — resolved before the transaction because it is a plain read.
    const parentNumber = invoice.parentInvoiceId ? (await this.invoices.findById(invoice.parentInvoiceId))?.number ?? null : null;
    const result = await this.uow.run(async (tx) => {
      const { icv, pih } = await this.repo.advanceChain(device.id, tx);      // row-locked: no duplicate counters
      const xml = buildInvoiceXml(this.toUbl(invoice, icv, pih, parentNumber));
      const signed = signInvoice({ invoiceXml: xml, privateKeyPem: material.privateKeyPem, certificatePem: material.certificatePem });
      const cert = readCertificate(material.certificatePem);
      const issuedAt = (invoice.issueDate ?? invoice.createdAt).toISOString().replace(/\.\d{3}Z$/, 'Z');
      const qr = encodeQr({ sellerName: invoice.sellerSnapshot.name_ar, vatNumber: invoice.sellerSnapshot.vat_number ?? '', timestamp: issuedAt, total: invoice.total, vat: invoice.vatTotal, invoiceHash: signed.invoiceHashBase64, signature: signed.signatureBase64, publicKey: publicKeyPoint(cert.publicKeyDer).toString('base64'), certSignature: cert.certSignatureBase64 });
      // The QR sits inside the document but outside the hash, so it is injected after signing.
      const finalXml = signed.signedXml.replace('<cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain"></cbc:EmbeddedDocumentBinaryObject>', `<cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${qr}</cbc:EmbeddedDocumentBinaryObject>`);
      const key = `zatca.${mode}:${invoice.id}`;
      const res = mode === 'clearance'
        ? await this.zatca.clearInvoice(material, finalXml, signed.invoiceHashBase64, invoice.zatcaUuid ?? invoice.id, key)
        : await this.zatca.reportInvoice(material, finalXml, signed.invoiceHashBase64, invoice.zatcaUuid ?? invoice.id, key);
      const accepted = res.status === 'CLEARED' || res.status === 'REPORTED';
      const status = accepted ? (mode === 'clearance' ? 'cleared' : 'reported') : 'rejected';
      await this.repo.addSubmission({ invoiceId: invoice.id, deviceId: device.id, mode, requestHash: createHash('sha256').update(finalXml).digest('hex'), responseCode: accepted ? 200 : 400, response: res.raw ?? null, warnings: res.warnings, errors: res.errors, status }, tx);
      if (!accepted) { await this.repo.setInvoiceZatca(invoice.id, { zatcaStatus: 'rejected' }, tx); throw new AppError('CONFLICT', { messageAr: 'رفضت هيئة الزكاة الفاتورة.', messageEn: 'ZATCA rejected the invoice.', details: res.errors }); }
      // Only a successful submission advances the chain — the next invoice's PIH is this invoice's hash.
      await this.repo.setChainHash(device.id, icv, signed.invoiceHashBase64, tx);
      await this.repo.setInvoiceZatca(invoice.id, { zatcaStatus: status, zatcaHash: signed.invoiceHashBase64, zatcaQr: qr, zatcaXml: res.clearedInvoiceXml ?? finalXml, zatcaIcv: icv, zatcaPih: pih }, tx);
      await this.audit.write(tx, { action: `zatca.${mode}`, entityType: 'invoice', entityId: invoice.id, orgId: invoice.orgId, actorUserId, actorType: actorUserId ? 'user' : 'system', after: { status, icv, hash: signed.invoiceHashBase64, warnings: res.warnings } });
      return { status, hash: signed.invoiceHashBase64, qr };
    });
    return result;
  }
  private toUbl(inv: Invoice, icv: number, pih: string, parentNumber: string | null = null): UblInvoice {
    const issue = (inv.issueDate ?? inv.createdAt).toISOString();
    const b2b = inv.type === 'standard_tax';
    return {
      id: inv.number, uuid: inv.zatcaUuid ?? inv.id, issueDate: issue.slice(0, 10), issueTime: issue.slice(11, 19),
      typeCode: inv.type === 'credit_note' ? '381' : inv.type === 'debit_note' ? '383' : '388', subtype: b2b ? '0100000' : '0200000', currency: 'SAR', icv, pih,
      seller: { registrationName: inv.sellerSnapshot.name_ar, vatNumber: inv.sellerSnapshot.vat_number, city: 'الرياض', countryCode: 'SA' },
      buyer: b2b ? { registrationName: inv.buyerSnapshot.name_ar, vatNumber: inv.buyerSnapshot.vat_number, otherId: inv.buyerSnapshot.cr_number ? { scheme: 'CRN', value: inv.buyerSnapshot.cr_number } : null } : (inv.buyerSnapshot.name_ar ? { registrationName: inv.buyerSnapshot.name_ar } : null),
      lines: inv.lines.map((l) => ({ id: String(l.sortOrder + 1), name: l.descriptionAr, quantity: l.quantity, unitPrice: l.unitPrice, lineExtension: l.lineTotal, discount: l.discount, taxPercent: l.vatRate, taxAmount: l.vatAmount, roundingAmount: (Number(l.lineTotal) + Number(l.vatAmount)).toFixed(2) })),
      taxExclusive: inv.subtotal, taxInclusive: inv.total, taxAmount: inv.vatTotal, allowanceTotal: inv.discountTotal, payableAmount: inv.total,
      qrBase64: '', billingReferenceId: parentNumber,
    };
  }
}
