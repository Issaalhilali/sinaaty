import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { VehicleEventsWriter } from '../../vehicles/application/vehicle-events.writer';
import { SERIAL_SCAN_ALERT_THRESHOLD } from '../domain/parts';
import { PARTS_REPOSITORY, type PartsRepository } from '../domain/repositories';
import type { SerialBatchDto, SerialInstallDto, SerialTransferDto } from './dto/parts.dto';
import { OrdersUseCases } from './orders.use-cases';

/** Anti-counterfeit: agent issues QR serials per unit → sold to a workshop with the order → scanned at install (part_and_labor warranty). Duplicate scans raise an alert. */
@Injectable()
export class SerialsUseCases {
  constructor(@Inject(PARTS_REPOSITORY) private readonly repo: PartsRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly passport: VehicleEventsWriter, private readonly orders: OrdersUseCases) {}
  private mustMember(u: AuthUser, orgId: string) { if (!membership(u, orgId) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  /** Agent issues a batch (explicit serial numbers, or `count` generated). Each unit gets an unguessable QR token. */
  async issueBatch(u: AuthUser, dto: SerialBatchDto) {
    this.mustMember(u, dto.org_id); const cat = await this.repo.findCatalog(dto.catalog_id); if (!cat) throw new AppError('NOT_FOUND');
    if (cat.createdByOrgId && cat.createdByOrgId !== dto.org_id && !isPlatformStaff(u)) throw new AppError('FORBIDDEN', { messageAr: 'إصدار الأرقام التسلسلية متاح لوكيل القطعة فقط.', messageEn: 'Only the catalog owner can issue serials.' });
    const batch = dto.batch_code ?? `B${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const serials = dto.serial_numbers?.length ? dto.serial_numbers : Array.from({ length: dto.count ?? 0 }, (_, i) => `${cat.partNumber}-${batch}-${String(i + 1).padStart(5, '0')}`);
    if (!serials.length) throw new AppError('VALIDATION', { messageEn: 'count or serial_numbers required' });
    const rows = serials.map((sn) => ({ catalogId: cat.id, serialNumber: sn, qrToken: randomBytes(24).toString('base64url'), batchCode: batch, issuerOrgId: dto.org_id, ownerOrgId: dto.org_id }));
    const created = await this.uow.run(async (tx) => { const n = await this.repo.createSerials(rows, tx); await this.audit.write(tx, { action: 'part_serial.issue', entityType: 'parts_catalog', entityId: cat.id, orgId: dto.org_id, actorUserId: u.id, after: { batch, catalog: cat.partNumber, count: n } }); return n; });
    return { batch_code: batch, issued: created, serials: rows.map((r) => ({ serial_number: r.serialNumber, qr_token: r.qrToken, verify_url: `/v1/parts/verify/${r.qrToken}` })) };
  }
  /** Sale: move serials to the buyer org of a part order (status sold). */
  async transfer(u: AuthUser, dto: SerialTransferDto) {
    const o = await this.repo.findOrder(dto.part_order_id); if (!o) throw new AppError('NOT_FOUND'); this.mustMember(u, o.supplierOrgId);
    return this.uow.run(async (tx) => { let n = 0; for (const t of dto.qr_tokens) { const s = await this.repo.findSerialByToken(t, tx); if (!s || s.ownerOrgId !== o.supplierOrgId || s.status !== 'in_stock') continue; await this.repo.updateSerial(s.id, { status: 'sold', ownerOrgId: o.buyerOrgId ?? null, partOrderId: o.id }, tx); n++; } await this.audit.write(tx, { action: 'part_serial.transfer', entityType: 'part_order', entityId: o.id, orgId: o.supplierOrgId, actorUserId: u.id, after: { transferred: n } }); return { transferred: n }; });
  }
  /** Public verify (customer/anyone scans the QR): genuine or not, status, and an alert flag when scans look abnormal. Counts scans. */
  async verify(qrToken: string) {
    const s = await this.repo.findSerialByToken(qrToken); if (!s) return { genuine: false, message_ar: 'هذا الرمز غير مسجّل — القطعة غير موثّقة عبر صناعية.', message_en: 'Unknown code — this part is not Sinaaty-verified.' };
    await this.uow.run((tx) => this.repo.updateSerial(s.id, { bumpScan: true }, tx));
    const cat = await this.repo.findCatalog(s.catalogId); const issuer = await this.orgs.findById(s.issuerOrgId);
    const scans = s.scanCount + 1; const alert = scans > SERIAL_SCAN_ALERT_THRESHOLD || s.status === 'void';
    if (alert) await this.uow.run((tx) => this.outbox.publish(tx, { eventType: 'PartSerialScanAlert', aggregateType: 'part_serial', aggregateId: s.id, payload: { serial: s.serialNumber, scans, status: s.status, issuerOrgId: s.issuerOrgId } }));
    return { genuine: s.status !== 'void', alert, scans, status: s.status, serial_number: s.serialNumber, part: cat ? { name_ar: cat.nameAr, part_number: cat.partNumber, brand_ar: cat.brandNameAr } : null, issuer_ar: issuer?.tradeNameAr ?? issuer?.legalNameAr ?? null, installed_at: s.installedAt, message_ar: s.status === 'void' ? 'هذا الرقم ملغى — يُحتمل تقليد.' : alert ? 'تنبيه: مُسح هذا الرمز مرات كثيرة — تحقق من المصدر.' : s.status === 'installed' ? 'قطعة أصلية موثّقة — مُركَّبة.' : 'قطعة أصلية موثّقة.', message_en: s.status === 'void' ? 'Void serial — possible counterfeit.' : alert ? 'Alert: scanned unusually often — verify the source.' : 'Genuine, Sinaaty-verified part.' };
  }
  /** Workshop scans at install: serial → installed on the WO item's vehicle; issues part_and_labor warranty (agent part days + workshop labor days). */
  async install(u: AuthUser, dto: SerialInstallDto) {
    const s = await this.repo.findSerialByToken(dto.qr_token); if (!s) throw new AppError('NOT_FOUND', { messageAr: 'رمز غير معروف.', messageEn: 'Unknown serial.' });
    const item = await this.repo.findWorkOrderItem(dto.work_order_item_id); if (!item) throw new AppError('NOT_FOUND'); this.mustMember(u, item.orgId);
    if (s.status === 'installed') { await this.uow.run((tx) => this.outbox.publish(tx, { eventType: 'PartSerialScanAlert', aggregateType: 'part_serial', aggregateId: s.id, payload: { serial: s.serialNumber, reason: 'install_twice', firstVehicleId: s.vehicleId, secondVehicleId: item.vehicleId, issuerOrgId: s.issuerOrgId } })); throw new AppError('CONFLICT', { messageAr: 'هذه القطعة مُركَّبة مسبقاً في سيارة أخرى — تنبيه تقليد/تكرار.', messageEn: 'Serial already installed elsewhere — duplicate alert raised.' }); }
    if (s.status === 'void') throw new AppError('CONFLICT', { messageAr: 'رقم ملغى.', messageEn: 'Void serial.' });
    if (s.ownerOrgId && s.ownerOrgId !== item.orgId && !isPlatformStaff(u)) throw new AppError('FORBIDDEN', { messageAr: 'هذه القطعة مسجّلة باسم منشأة أخرى.', messageEn: 'Serial is owned by another organization.' });
    const cat = await this.repo.findCatalog(s.catalogId); const order = s.partOrderId ? await this.repo.findOrder(s.partOrderId) : null; const partDays = order?.items.find((i) => i.catalogId === s.catalogId)?.warrantyDays ?? 365;
    return this.uow.run(async (tx) => {
      await this.repo.updateSerial(s.id, { status: 'installed', ownerOrgId: item.orgId, workOrderItemId: item.id, vehicleId: item.vehicleId, installedAt: new Date() }, tx);
      const w = await this.orders.issueWarranty(tx, { issuerOrgId: s.issuerOrgId, beneficiaryUserId: item.customerUserId, beneficiaryOrgId: item.customerOrgId, vehicleId: item.vehicleId, partOrderId: s.partOrderId, workOrderItemId: item.id, partSerialId: s.id, installerOrgId: item.orgId, covers: 'part_and_labor', condition: 'oem_new', coverageAr: `ضمان ثلاثي: القطعة «${cat?.nameAr ?? s.serialNumber}» ${partDays} يوماً من الوكيل + التركيب ${dto.labor_warranty_days} يوماً من الورشة`, days: Math.max(partDays, dto.labor_warranty_days) });
      await this.passport.record({ vehicleId: item.vehicleId, type: 'part_installed', orgId: item.orgId, refTable: 'part_serials', refId: s.id, summaryAr: `تركيب قطعة أصلية موثّقة ${cat?.nameAr ?? ''} (${s.serialNumber})`, summaryEn: `Genuine part installed ${cat?.partNumber ?? ''} (${s.serialNumber})`, isPublic: true }, tx);
      await this.audit.write(tx, { action: 'part_serial.install', entityType: 'part_serial', entityId: s.id, orgId: item.orgId, actorUserId: u.id, after: { work_order_item: item.id, warranty: w.number } });
      return { serial: await this.repo.findSerial(s.id, tx), warranty: w };
    });
  }
  async listForOrg(u: AuthUser, orgId: string, q: { status?: string[]; batch?: string }) { this.mustMember(u, orgId); return this.repo.listSerials({ issuerOrgId: orgId, status: q.status as never, batchCode: q.batch, limit: 500 }); }
}
