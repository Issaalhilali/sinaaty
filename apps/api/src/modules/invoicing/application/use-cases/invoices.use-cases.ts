import { Inject, Injectable } from '@nestjs/common';
import { buildInvoiceXml, encodeQr, GENESIS_PIH, invoiceHash } from '@sinaaty/zatca-ubl';
import type { InvoiceStatus, PaymentTerms } from '@sinaaty/shared-types';
import { AppError } from '../../../../common/errors';
import { AuditLogWriter } from '../../../../common/audit';
import { OutboxWriter } from '../../../../common/outbox';
import { Money } from '../../../../common/domain/money';
import { computeLine } from '../../../../common/domain/vat';
import { newId } from '../../../../common/domain/ids';
import { UNIT_OF_WORK, type TxHandle, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../../organizations/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../../work-orders/domain/repositories';
import { ACTIVE_STATUSES, type Invoice, invoiceTypeFor, isVoidable, type PartySnapshot } from '../../domain/invoice';
import { INVOICE_REPOSITORY, type InvoiceRepository, type NewInvoiceLine } from '../../domain/repositories';
import { INVOICE_RENDERER_PORT, type InvoiceRendererPort } from '../ports/invoice-renderer.port';
import type { CreditNoteDto, IssueFromWorkOrderDto, VoidDto } from '../dto/invoices.dto';

/** الرقم الضريبي السعودي: 15 رقماً يبدأ وينتهي بـ3. غيابه أو بطلانه يجب أن يُقال للورشة بوضوح —
 *  لا أن يسقط رمز الاستجابة السريعة بـ500 وهي تنتظر مالها (اكتشاف الفاحص 2026-08-23). */
const assertSellerVat = (vat: string | null | undefined, whoAr: string): string => {
  if (!vat) throw new AppError('VALIDATION', { messageAr: `أضف الرقم الضريبي ${whoAr} قبل إصدار الفواتير.`, messageEn: 'Organization VAT number is required to issue invoices.' });
  if (!/^3\d{13}3$/.test(vat)) throw new AppError('VALIDATION', { messageAr: `الرقم الضريبي ${whoAr} غير صالح (15 رقماً يبدأ وينتهي بـ3). صحّحه من ملف المنشأة ثم أعد الإصدار.`, messageEn: `Invalid VAT number «${vat}» — must be 15 digits starting and ending with 3.`, details: { vat_number: vat } });
  return vat;
};
const FINANCE_ROLES = ['owner', 'manager', 'accountant'];
const INVOICEABLE = ['ready', 'delivered', 'closed'];
const isoNoMs = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

@Injectable()
export class InvoicesUseCases {
  constructor(
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(INVOICE_RENDERER_PORT) private readonly renderer: InvoiceRendererPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    private readonly outbox: OutboxWriter,
  ) {}

  private canRead(inv: Invoice, u: AuthUser) {
    return isPlatformStaff(u) || u.orgs.some((o) => o.orgId === inv.orgId) || inv.customerUserId === u.id || (inv.customerOrgId != null && u.orgs.some((o) => o.orgId === inv.customerOrgId));
  }
  private mustFinance(orgId: string, u: AuthUser) {
    if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === orgId && FINANCE_ROLES.includes(o.role))) throw new AppError('FORBIDDEN');
  }
  private async load(id: string) { const i = await this.invoices.findById(id); if (!i) throw new AppError('NOT_FOUND'); return i; }

  /** Issue the tax invoice for a work order from its LAST SIGNED version — totals must equal the snapshot. */
  async issueFromWorkOrder(u: AuthUser, dto: IssueFromWorkOrderDto): Promise<Invoice> {
    const wo = await this.workOrders.findById(dto.work_order_id); if (!wo) throw new AppError('NOT_FOUND');
    this.mustFinance(wo.orgId, u);
    if (!wo.approvedAt || !INVOICEABLE.includes(wo.status)) throw new AppError('INV_WO_NOT_INVOICEABLE');
    if (await this.invoices.findActiveByWorkOrder(wo.id)) throw new AppError('INV_ALREADY_ISSUED');
    const version = await this.workOrders.getVersion(wo.id, wo.currentVersion);
    if (!version || !(await this.workOrders.hasSignature(version.id, 'approve_scope'))) throw new AppError('INV_WO_NOT_INVOICEABLE', { messageAr: 'آخر نسخة من أمر العمل غير معتمدة من العميل.', messageEn: 'Latest work order version is not customer-approved.' });
    const org = await this.orgs.findById(wo.orgId); if (!org) throw new AppError('NOT_FOUND');
    const sellerVat = assertSellerVat(org.vatNumber, 'للمنشأة');
    const customer = wo.customerUserId ? await this.users.findById(wo.customerUserId) : null;
    const customerOrg = wo.customerOrgId ? await this.orgs.findById(wo.customerOrgId) : null;
    const seller: PartySnapshot = { name_ar: org.tradeNameAr ?? org.legalNameAr, name_en: org.legalNameEn, vat_number: org.vatNumber, cr_number: org.crNumber, org_id: org.id };
    const buyer: PartySnapshot = customerOrg
      ? { name_ar: customerOrg.legalNameAr, name_en: customerOrg.legalNameEn, vat_number: customerOrg.vatNumber, cr_number: customerOrg.crNumber, org_id: customerOrg.id }
      : { name_ar: customer?.fullNameAr ?? 'عميل', phone: customer?.phone ?? null, user_id: customer?.id ?? null };
    // Lines come from the signed snapshot — the source of truth for what the customer agreed to.
    const lines: NewInvoiceLine[] = version.snapshot.items.map((it, idx) => {
      const l = computeLine({ quantity: it.quantity, unitPrice: Money.of(it.unit_price), discount: Money.of(it.discount), vatRatePct: Number(it.vat_rate) });
      return { workOrderItemId: it.id, descriptionAr: it.description_ar, descriptionEn: it.description_en, quantity: it.quantity, unitPrice: Money.of(it.unit_price).toString(), discount: Money.of(it.discount).toString(), vatRate: it.vat_rate, vatAmount: l.vat.toString(), lineTotal: l.net.toString(), sortOrder: idx };
    });
    const subtotal = Money.sum(lines.map((l) => Money.of(l.lineTotal)));
    const vatTotal = Money.sum(lines.map((l) => Money.of(l.vatAmount)));
    const discountTotal = Money.sum(lines.map((l) => Money.of(l.discount)));
    const total = subtotal.plus(vatTotal);
    if (total.toString() !== version.snapshot.totals.total || vatTotal.toString() !== version.snapshot.totals.vat) {
      throw new AppError('INTERNAL', { messageAr: 'إجمالي الفاتورة لا يطابق النسخة المعتمدة.', messageEn: 'Invoice totals do not match the approved snapshot.', details: { invoice: total.toString(), snapshot: version.snapshot.totals.total } });
    }
    const type = invoiceTypeFor(buyer); const now = new Date(); const timestamp = isoNoMs(now); const zatcaUuid = newId();
    const qr = encodeQr({ sellerName: seller.name_ar, vatNumber: sellerVat, timestamp, total: total.toString(), vat: vatTotal.toString() });
    const dueDate = dto.due_date ? new Date(dto.due_date) : wo.dueDate;
    return this.uow.run(async (tx) => {
      const number = await this.invoices.nextNumber(org.id, 'INV', now.getFullYear(), tx);
      const payload = { number, uuid: zatcaUuid, seller, buyer, lines, totals: { subtotal: subtotal.toString(), vat: vatTotal.toString(), total: total.toString() }, issued_at: timestamp, work_order: wo.number, version: version.version, snapshot_sha256: version.sha256 };
      const created = await this.invoices.create({ orgId: org.id, number, type, status: 'issued', workOrderId: wo.id, customerUserId: wo.customerUserId ?? undefined, customerOrgId: wo.customerOrgId ?? undefined, buyerSnapshot: buyer, sellerSnapshot: seller, subtotal: subtotal.toString(), discountTotal: discountTotal.toString(), vatTotal: vatTotal.toString(), total: total.toString(), paymentTerms: wo.paymentTerms, issueDate: now, dueDate, supplyDate: wo.deliveredAt ?? now, zatcaUuid, zatcaHash: invoiceHash(payload), zatcaQr: qr, zatcaStatus: 'not_required', notesAr: dto.notes_ar, createdBy: u.id, lines }, tx);
      await this.audit.write(tx, { action: 'invoice.issue', entityType: 'invoice', entityId: created.id, orgId: org.id, actorUserId: u.id, after: { number, total: total.toString(), workOrder: wo.number, version: version.version } });
      await this.outbox.publish(tx, { eventType: 'InvoiceIssued', aggregateType: 'invoice', aggregateId: created.id, payload: { number, orgId: org.id, workOrderId: wo.id, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, total: total.toString(), paymentTerms: wo.paymentTerms, dueDate: dueDate?.toISOString() ?? null } });
      return created;
    });
  }

  /** Parts marketplace: invoice for a part order (supplier → buyer). Lines are the order items; VAT per line (ZATCA). */
  /**
   * Transport invoice, issued automatically when the tow is delivered with proof (P1 scope doc §2).
   * Idempotent per job; seller is the transport provider (must be VAT-registered — a tax invoice
   * without a seller VAT number is void on arrival, so the refusal is loud and lands in the DLQ),
   * buyer is whoever requested the tow. One line, VAT 15%.
   */
  async issueForTransportJob(p: { transportJobId: string; jobNumber: string; providerOrgId: string; requesterUserId: string | null; requesterOrgId: string | null; amount: string; descriptionAr: string }) {
    const existing = await this.invoices.findByTransportJob(p.transportJobId);
    if (existing) return existing;
    const org = await this.orgs.findById(p.providerOrgId); if (!org) throw new AppError('NOT_FOUND');
    const sellerVat = assertSellerVat(org.vatNumber, 'لمنشأة النقل');
    const buyerUser = p.requesterUserId ? await this.users.findById(p.requesterUserId) : null; const buyerOrg = p.requesterOrgId ? await this.orgs.findById(p.requesterOrgId) : null;
    const seller: PartySnapshot = { name_ar: org.tradeNameAr ?? org.legalNameAr, name_en: org.legalNameEn, vat_number: org.vatNumber, cr_number: org.crNumber, org_id: org.id };
    const buyer: PartySnapshot = buyerOrg ? { name_ar: buyerOrg.legalNameAr, name_en: buyerOrg.legalNameEn, vat_number: buyerOrg.vatNumber, cr_number: buyerOrg.crNumber, org_id: buyerOrg.id } : { name_ar: buyerUser?.fullNameAr ?? 'عميل', phone: buyerUser?.phone ?? null, user_id: buyerUser?.id ?? null };
    const l = computeLine({ quantity: '1', unitPrice: Money.of(p.amount), vatRatePct: 15 });
    const lines: NewInvoiceLine[] = [{ descriptionAr: p.descriptionAr, quantity: '1', unitPrice: Money.of(p.amount).toString(), discount: '0.00', vatRate: '15.00', vatAmount: l.vat.toString(), lineTotal: l.net.toString(), sortOrder: 0 }];
    const subtotal = l.net; const vatTotal = l.vat; const total = subtotal.plus(vatTotal);
    const type = invoiceTypeFor(buyer); const now = new Date(); const timestamp = isoNoMs(now); const zatcaUuid = newId();
    const qr = encodeQr({ sellerName: seller.name_ar, vatNumber: sellerVat, timestamp, total: total.toString(), vat: vatTotal.toString() });
    return this.uow.run(async (t) => {
      const number = await this.invoices.nextNumber(org.id, 'INV', now.getFullYear(), t);
      const created = await this.invoices.create({ orgId: org.id, number, type, status: 'issued', transportJobId: p.transportJobId, customerUserId: p.requesterUserId ?? undefined, customerOrgId: p.requesterOrgId ?? undefined, buyerSnapshot: buyer, sellerSnapshot: seller, subtotal: subtotal.toString(), discountTotal: '0.00', vatTotal: vatTotal.toString(), total: total.toString(), paymentTerms: 'on_delivery', issueDate: now, supplyDate: now, zatcaUuid, zatcaHash: invoiceHash({ number, uuid: zatcaUuid, seller, buyer, lines, totals: { subtotal: subtotal.toString(), vat: vatTotal.toString(), total: total.toString() }, issued_at: timestamp, transport_job: p.jobNumber }), zatcaQr: qr, zatcaStatus: 'not_required', createdBy: null, lines }, t);
      await this.audit.write(t, { action: 'invoice.issue', entityType: 'invoice', entityId: created.id, orgId: org.id, actorType: 'system', after: { number, total: total.toString(), transportJob: p.jobNumber } });
      await this.outbox.publish(t, { eventType: 'InvoiceIssued', aggregateType: 'invoice', aggregateId: created.id, payload: { number, orgId: org.id, transportJobId: p.transportJobId, customerUserId: p.requesterUserId, customerOrgId: p.requesterOrgId, total: total.toString(), paymentTerms: 'on_delivery', dueDate: null } });
      return created;
    });
  }

  async issueForPartOrder(p: { partOrderId: string; orderNumber: string; supplierOrgId: string; buyerUserId: string | null; buyerOrgId: string | null; items: Array<{ id?: string | null; descriptionAr: string; quantity: number; unitPrice: string; vatRate: string }>; deliveryFee: string; paymentTerms: PaymentTerms; dueDate: Date | null; actorUserId?: string | null }, tx?: TxHandle) {
    const org = await this.orgs.findById(p.supplierOrgId); if (!org) throw new AppError('NOT_FOUND');
    const sellerVat = assertSellerVat(org.vatNumber, 'للمنشأة');
    const buyerUser = p.buyerUserId ? await this.users.findById(p.buyerUserId) : null; const buyerOrg = p.buyerOrgId ? await this.orgs.findById(p.buyerOrgId) : null;
    const seller: PartySnapshot = { name_ar: org.tradeNameAr ?? org.legalNameAr, name_en: org.legalNameEn, vat_number: org.vatNumber, cr_number: org.crNumber, org_id: org.id };
    const buyer: PartySnapshot = buyerOrg ? { name_ar: buyerOrg.legalNameAr, name_en: buyerOrg.legalNameEn, vat_number: buyerOrg.vatNumber, cr_number: buyerOrg.crNumber, org_id: buyerOrg.id } : { name_ar: buyerUser?.fullNameAr ?? 'عميل', phone: buyerUser?.phone ?? null, user_id: buyerUser?.id ?? null };
    const src = [...p.items.map((i) => ({ descriptionAr: i.descriptionAr, quantity: String(i.quantity), unitPrice: i.unitPrice, vatRate: i.vatRate })), ...(Number(p.deliveryFee) > 0 ? [{ descriptionAr: 'رسوم توصيل', quantity: '1', unitPrice: p.deliveryFee, vatRate: '15.00' }] : [])];
    const lines: NewInvoiceLine[] = src.map((it, idx) => { const l = computeLine({ quantity: it.quantity, unitPrice: Money.of(it.unitPrice), vatRatePct: Number(it.vatRate) }); return { descriptionAr: it.descriptionAr, quantity: it.quantity, unitPrice: Money.of(it.unitPrice).toString(), discount: '0.00', vatRate: it.vatRate, vatAmount: l.vat.toString(), lineTotal: l.net.toString(), sortOrder: idx }; });
    const subtotal = Money.sum(lines.map((l) => Money.of(l.lineTotal))); const vatTotal = Money.sum(lines.map((l) => Money.of(l.vatAmount))); const total = subtotal.plus(vatTotal);
    const type = invoiceTypeFor(buyer); const now = new Date(); const timestamp = isoNoMs(now); const zatcaUuid = newId();
    const qr = encodeQr({ sellerName: seller.name_ar, vatNumber: sellerVat, timestamp, total: total.toString(), vat: vatTotal.toString() });
    const run = async (t: TxHandle) => {
      const number = await this.invoices.nextNumber(org.id, 'INV', now.getFullYear(), t);
      const created = await this.invoices.create({ orgId: org.id, number, type, status: 'issued', partOrderId: p.partOrderId, customerUserId: p.buyerUserId ?? undefined, customerOrgId: p.buyerOrgId ?? undefined, buyerSnapshot: buyer, sellerSnapshot: seller, subtotal: subtotal.toString(), discountTotal: '0.00', vatTotal: vatTotal.toString(), total: total.toString(), paymentTerms: p.paymentTerms, issueDate: now, dueDate: p.dueDate, supplyDate: now, zatcaUuid, zatcaHash: invoiceHash({ number, uuid: zatcaUuid, seller, buyer, lines, totals: { subtotal: subtotal.toString(), vat: vatTotal.toString(), total: total.toString() }, issued_at: timestamp, part_order: p.orderNumber }), zatcaQr: qr, zatcaStatus: 'not_required', createdBy: p.actorUserId ?? null, lines }, t);
      await this.audit.write(t, { action: 'invoice.issue', entityType: 'invoice', entityId: created.id, orgId: org.id, actorType: 'system', after: { number, total: total.toString(), partOrder: p.orderNumber } });
      await this.outbox.publish(t, { eventType: 'InvoiceIssued', aggregateType: 'invoice', aggregateId: created.id, payload: { number, orgId: org.id, partOrderId: p.partOrderId, customerUserId: p.buyerUserId, customerOrgId: p.buyerOrgId, total: total.toString(), paymentTerms: p.paymentTerms, dueDate: p.dueDate?.toISOString() ?? null } });
      return created;
    };
    return tx ? run(tx) : this.uow.run(run);
  }
  async get(u: AuthUser, id: string) { const i = await this.load(id); if (!this.canRead(i, u)) throw new AppError('FORBIDDEN'); return i; }
  /** `as=customer` lists what the org RECEIVED (parts bought on credit, tow invoices) — before this a
   *  buying workshop could only open its purchase invoices by id (seam walk 2026-08-23). */
  async list(u: AuthUser, q: { org_id?: string; as?: 'seller' | 'customer'; status?: InvoiceStatus[]; limit?: number }) {
    if (q.org_id) {
      if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === q.org_id)) throw new AppError('FORBIDDEN');
      const side = q.as === 'customer' ? { customerOrgId: q.org_id } : { orgId: q.org_id };
      return this.invoices.list({ ...side, status: q.status, limit: q.limit ?? 50 });
    }
    return this.invoices.list({ customerUserId: u.id, status: q.status, limit: q.limit ?? 50 });
  }

  async void(u: AuthUser, id: string, dto: VoidDto) {
    const inv = await this.load(id); this.mustFinance(inv.orgId, u);
    if (!isVoidable(inv)) throw new AppError('INV_NOT_VOIDABLE');
    await this.uow.run(async (tx) => {
      await this.invoices.setStatus(id, 'void', { voidedAt: new Date(), voidReason: dto.reason_ar }, tx);
      await this.audit.write(tx, { action: 'invoice.void', entityType: 'invoice', entityId: id, orgId: inv.orgId, actorUserId: u.id, after: { reason: dto.reason_ar } });
      await this.outbox.publish(tx, { eventType: 'InvoiceVoided', aggregateType: 'invoice', aggregateId: id, payload: { number: inv.number, reason: dto.reason_ar } });
    });
    return this.load(id);
  }

  /** Credit note (UBL 381) referencing the parent; full by default or per-line partial. */
  async creditNote(u: AuthUser, id: string, dto: CreditNoteDto) {
    const parent = await this.load(id); this.mustFinance(parent.orgId, u);
    if (!ACTIVE_STATUSES.includes(parent.status) || (parent.type !== 'standard_tax' && parent.type !== 'simplified_tax')) throw new AppError('CONFLICT', { messageAr: 'إشعار الدائن يُصدر فقط لفاتورة ضريبية سارية.', messageEn: 'Credit notes apply to active tax invoices only.' });
    const src = dto.lines
      ? dto.lines.map((sel) => { const l = parent.lines.find((x) => x.id === sel.invoice_line_id); if (!l) throw new AppError('NOT_FOUND', { messageAr: 'بند الفاتورة غير موجود.', messageEn: 'Invoice line not found.' }); return { ...l, quantity: sel.quantity ?? l.quantity, unitPrice: sel.amount ? Money.of(sel.amount).toString() : l.unitPrice, discount: '0.00' }; })
      : parent.lines;
    const lines: NewInvoiceLine[] = src.map((l, idx) => { const c = computeLine({ quantity: l.quantity, unitPrice: Money.of(l.unitPrice), discount: Money.of(l.discount), vatRatePct: Number(l.vatRate) }); return { workOrderItemId: l.workOrderItemId, descriptionAr: l.descriptionAr, descriptionEn: l.descriptionEn, quantity: l.quantity, unitPrice: Money.of(l.unitPrice).toString(), discount: Money.of(l.discount).toString(), vatRate: l.vatRate, vatAmount: c.vat.toString(), lineTotal: c.net.toString(), sortOrder: idx }; });
    const subtotal = Money.sum(lines.map((l) => Money.of(l.lineTotal))); const vatTotal = Money.sum(lines.map((l) => Money.of(l.vatAmount))); const total = subtotal.plus(vatTotal);
    if (total.gt(Money.of(parent.total))) throw new AppError('VALIDATION', { messageAr: 'قيمة الإشعار تتجاوز الفاتورة الأصلية.', messageEn: 'Credit note exceeds the original invoice.' });
    const now = new Date(); const timestamp = isoNoMs(now); const zatcaUuid = newId();
    const qr = encodeQr({ sellerName: parent.sellerSnapshot.name_ar, vatNumber: parent.sellerSnapshot.vat_number ?? '', timestamp, total: total.toString(), vat: vatTotal.toString() });
    return this.uow.run(async (tx) => {
      const number = await this.invoices.nextNumber(parent.orgId, 'CN', now.getFullYear(), tx);
      const cn = await this.invoices.create({ orgId: parent.orgId, number, type: 'credit_note', status: 'issued', workOrderId: parent.workOrderId ?? undefined, parentInvoiceId: parent.id, customerUserId: parent.customerUserId ?? undefined, customerOrgId: parent.customerOrgId ?? undefined, buyerSnapshot: parent.buyerSnapshot, sellerSnapshot: parent.sellerSnapshot, subtotal: subtotal.toString(), discountTotal: '0.00', vatTotal: vatTotal.toString(), total: total.toString(), paymentTerms: parent.paymentTerms, issueDate: now, supplyDate: now, zatcaUuid, zatcaHash: invoiceHash({ number, parent: parent.number, lines, total: total.toString(), timestamp }), zatcaQr: qr, zatcaStatus: 'not_required', notesAr: dto.reason_ar, createdBy: u.id, lines }, tx);
      if (total.equals(Money.of(parent.total)) && Number(parent.paidTotal) === 0) await this.invoices.setStatus(parent.id, 'void', { voidedAt: now, voidReason: `إشعار دائن ${number}` }, tx);
      await this.audit.write(tx, { action: 'invoice.credit_note', entityType: 'invoice', entityId: cn.id, orgId: parent.orgId, actorUserId: u.id, after: { number, parent: parent.number, total: total.toString(), reason: dto.reason_ar } });
      await this.outbox.publish(tx, { eventType: 'CreditNoteIssued', aggregateType: 'invoice', aggregateId: cn.id, payload: { number, parentInvoiceId: parent.id, total: total.toString() } });
      return cn;
    });
  }

  /** A credit/debit note's BillingReference carries the ORIGINAL invoice number (BR-KSA-56), never its own. */
  private async parentNumberOf(inv: Invoice): Promise<string | null> {
    return inv.parentInvoiceId ? (await this.invoices.findById(inv.parentInvoiceId))?.number ?? null : null;
  }
  private xmlFor(inv: Invoice, parentNumber: string | null): string {
    const issue = (inv.issueDate ?? inv.createdAt).toISOString();
    const b2b = !!(inv.buyerSnapshot.org_id || inv.buyerSnapshot.vat_number);
    return buildInvoiceXml({
      id: inv.number, uuid: inv.zatcaUuid ?? inv.id, issueDate: issue.slice(0, 10), issueTime: issue.slice(11, 19),
      // Chain values as recorded when the invoice was issued; a Phase-2 seller has real ones, otherwise the genesis PIH.
      icv: Number(inv.zatcaIcv ?? 0), pih: inv.zatcaPih ?? GENESIS_PIH,
      typeCode: inv.type === 'credit_note' ? '381' : inv.type === 'debit_note' ? '383' : '388', subtype: b2b ? '0100000' : '0200000', currency: 'SAR',
      seller: { registrationName: inv.sellerSnapshot.name_ar, vatNumber: inv.sellerSnapshot.vat_number, city: 'الرياض' },
      buyer: b2b ? { registrationName: inv.buyerSnapshot.name_ar, vatNumber: inv.buyerSnapshot.vat_number } : null,
      lines: inv.lines.map((l) => ({ id: String(l.sortOrder + 1), name: l.descriptionAr, quantity: l.quantity, unitPrice: l.unitPrice, lineExtension: l.lineTotal, taxPercent: l.vatRate, taxAmount: l.vatAmount, roundingAmount: Money.of(l.lineTotal).plus(Money.of(l.vatAmount)).toString() })),
      taxExclusive: inv.subtotal, taxInclusive: inv.total, taxAmount: inv.vatTotal, allowanceTotal: inv.discountTotal, payableAmount: inv.total, qrBase64: inv.zatcaQr ?? '', note: inv.notesAr,
      billingReferenceId: parentNumber,
    });
  }
  async xml(u: AuthUser, id: string) { const inv = await this.get(u, id); return this.xmlFor(inv, await this.parentNumberOf(inv)); }
  async document(u: AuthUser, id: string) { const inv = await this.get(u, id); return this.renderer.render(inv, { qrBase64: inv.zatcaQr ?? '', xml: this.xmlFor(inv, await this.parentNumberOf(inv)) }); }
}
