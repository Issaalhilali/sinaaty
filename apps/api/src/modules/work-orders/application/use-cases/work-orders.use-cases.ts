import { forwardRef, Inject, Injectable, Optional } from '@nestjs/common';
import Decimal from 'decimal.js';
import type { InspectionType, PartCondition, PaymentTerms, WoItemType, WorkOrderStatus } from '@sinaaty/shared-types';
import { FleetUseCases } from '../../../fleet/application/fleet.use-cases';
import { OrdersUseCases } from '../../../parts/application/orders.use-cases';
import { PARTS_REPOSITORY, type PartsRepository } from '../../../parts/domain/repositories';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { AuditLogWriter } from '../../../../common/audit';
import { OutboxWriter } from '../../../../common/outbox';
import { Money } from '../../../../common/domain/money';
import { computeLine, computeTotals } from '../../../../common/domain/vat';
import { UNIT_OF_WORK, type TxHandle, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { normalizeSaudiPhone } from '../../../identity/domain/otp';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { HASHER_PORT, type HasherPort, NAFATH_PORT, type NafathPort, OTP_REPOSITORY_TOKEN } from './identity-bridge';
import { OTP_REPOSITORY, type OtpRepository } from '../../../identity/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../../organizations/domain/repositories';
import { VEHICLE_REPOSITORY, type VehicleRepository } from '../../../vehicles/domain/repositories';
import { VehicleEventsWriter } from '../../../vehicles/application/vehicle-events.writer';
import { normalizePlate, normalizeVin } from '../../../vehicles/domain/vin';
import { AFTER_APPROVAL, CHANGE_ORDER_FROM, EDITABLE_STATUSES, TERMINAL, WORKSHOP_TRANSITIONS } from '../../domain/state-machine';
import { type Snapshot, snapshotHash } from '../../domain/snapshot';
import { activeItems, isCustomer, isStaff, isWorkshopMember, WORKSHOP_WRITE_ROLES, type WorkOrder } from '../../domain/work-order';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../domain/repositories';
import { PDF_RENDERER_PORT, type PdfRendererPort } from '../ports/pdf-renderer.port';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../ports/realtime.port';
import { WoTransitionService } from '../wo-transition.service';
import { ApprovalLinkService } from '../approval-link.service';
import type { ApproveCompleteDto, ApproveInitDto, AttachMediaDto, CancelDto, ChangeOrderDto, CreateWorkOrderDto, InspectionDto, ItemDto, TransitionDto, UpdateItemDto, UpdateWorkOrderDto } from '../dto/work-orders.dto';
void OTP_REPOSITORY_TOKEN;

const lineOf = (i: { quantity: string; unit_price: string; discount?: string; vat_rate?: number }) => computeLine({ quantity: i.quantity, unitPrice: Money.of(i.unit_price), discount: Money.of(i.discount ?? '0'), vatRatePct: i.vat_rate ?? 15 });
/** A title that says something when the advisor typed none: «تغيير زيت وفلتر +2» — never a row that
 *  identifies itself by its own number. (Seen on screen: a whole order list of bare numbers, because
 *  the title is optional and nobody fills it in the rush of receiving a car.) */
const summariseItems = (items?: Array<{ description_ar: string }>): string | undefined => {
  if (!items?.length) return undefined;
  const first = items[0]!.description_ar.trim();
  return items.length > 1 ? `${first} +${items.length - 1}` : first;
};

@Injectable()
export class WorkOrdersUseCases {
  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository,
    @Inject(PARTS_REPOSITORY) private readonly parts: PartsRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository,
    @Inject(NAFATH_PORT) private readonly nafath: NafathPort,
    @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    @Inject(PDF_RENDERER_PORT) private readonly pdf: PdfRendererPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly transitions: WoTransitionService,
    private readonly passport: VehicleEventsWriter,
    private readonly audit: AuditLogWriter,
    private readonly outbox: OutboxWriter,
    private readonly config: AppConfig,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
    // Optional: work orders exist without the fleet module (a private customer has no policy).
    @Optional() @Inject(forwardRef(() => FleetUseCases)) private readonly fleet?: FleetUseCases,
    @Optional() @Inject(forwardRef(() => ApprovalLinkService)) private readonly approvalLinks?: ApprovalLinkService,
    @Optional() @Inject(forwardRef(() => OrdersUseCases)) private readonly partOrders?: OrdersUseCases,
  ) {}

  // ---------- access ----------
  private async load(id: string): Promise<WorkOrder> { const wo = await this.repo.findById(id); if (!wo) throw new AppError('NOT_FOUND'); return wo; }
  canRead(wo: WorkOrder, u: AuthUser) { return isWorkshopMember(wo, u) || isCustomer(wo, u) || isStaff(u); }
  private mustRead(wo: WorkOrder, u: AuthUser) { if (!this.canRead(wo, u)) throw new AppError('FORBIDDEN'); }
  private mustWrite(wo: WorkOrder, u: AuthUser) { if (!isWorkshopMember(wo, u, WORKSHOP_WRITE_ROLES) && !isStaff(u)) throw new AppError('FORBIDDEN'); if (TERMINAL.includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'أمر العمل مغلق.', messageEn: 'Work order is closed.' }); }
  private mustCustomer(wo: WorkOrder, u: AuthUser) { if (!isCustomer(wo, u) && !isStaff(u)) throw new AppError('FORBIDDEN'); }
  async canAccessId(id: string, u: AuthUser) { const wo = await this.repo.findById(id); return !!wo && this.canRead(wo, u); }

  // ---------- create / read ----------
  /** «أعدها؟» — the customer's own repeatable history, shaped ready for prefilled forms. The card is
   *  the gift; the SEND stays their explicit tap (review arbitration: no blind one-tap repeats). */
  async repeatables(u: AuthUser) {
    const done = (await this.repo.list({ customerUserId: u.id, status: ['closed', 'delivered'], limit: 5 }))[0] ?? null;
    let service = null;
    if (done) {
      const org = await this.orgs.findById(done.orgId); const v = done.vehicleId ? await this.vehicles.findById(done.vehicleId) : null;
      if (org?.status === 'active') service = { kind: 'service_revisit', work_order_id: done.id, org_id: done.orgId, org_name_ar: org.tradeNameAr ?? org.legalNameAr, title_ar: done.titleAr, vehicle_id: done.vehicleId, vehicle_label: v ? `${v.makeNameAr ?? ''} ${v.plateNumber ?? ''}`.trim() || null : null, last_at: done.deliveredAt ?? done.createdAt };
    }
    let part = null;
    {
      const pr = (await this.parts.listRequests({ requesterUserId: u.id, limit: 3 })).find((x) => !!x.partNameAr) ?? null;
      if (pr) part = { kind: 'part_request', part_request_id: pr.id, last_at: pr.createdAt, prefill: { part_name_ar: pr.partNameAr, part_number: pr.partNumber, accepted_conditions: pr.acceptedConditions, quantity: pr.quantity, vehicle_id: pr.vehicleId, vin: pr.vin, radius_km: pr.searchRadiusKm } };
    }
    return { cards: [service, part].filter(Boolean) };
  }

  /** «أعد الصيانة عند نفس الورشة» — a DRAFT order at the workshop that served them before; the workshop
   *  is told its customer is coming back. Price/items follow the normal legal chain from zero. */
  async repeat(u: AuthUser, dto: { work_order_id: string; title_ar?: string; note_ar?: string }) {
    const src = await this.repo.findById(dto.work_order_id); if (!src) throw new AppError('NOT_FOUND');
    if (src.customerUserId !== u.id) throw new AppError('FORBIDDEN');
    if (!['closed', 'delivered'].includes(src.status)) throw new AppError('CONFLICT', { messageAr: 'الإعادة لأمر مكتمل.', messageEn: 'Repeat a completed order.' });
    const org = await this.orgs.findById(src.orgId);
    if (org?.status !== 'active') throw new AppError('CONFLICT', { messageAr: 'الورشة غير متاحة حالياً.', messageEn: 'The workshop is not available.' });
    const wo = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber(tx);
      const created = await this.repo.create({ number, orgId: src.orgId, vehicleId: src.vehicleId, customerUserId: u.id, paymentTerms: src.paymentTerms, titleAr: dto.title_ar ?? src.titleAr ?? 'إعادة صيانة', complaintAr: dto.note_ar ?? `إعادة زيارة — الأمر السابق ${src.number}`, createdBy: u.id }, tx);
      await this.audit.write(tx, { action: 'work_order.repeat', entityType: 'work_order', entityId: created.id, orgId: src.orgId, actorUserId: u.id, after: { number: created.number, source: src.number } });
      await this.outbox.publish(tx, { eventType: 'WorkOrderRepeated', aggregateType: 'work_order', aggregateId: created.id, payload: { number: created.number, sourceNumber: src.number, orgId: src.orgId, customerUserId: u.id, titleAr: created.titleAr } });
      return created;
    });
    return { work_order: { id: wo.id, number: wo.number, status: wo.status, org_id: src.orgId }, source_number: src.number };
  }

  async create(u: AuthUser, dto: CreateWorkOrderDto) {
    if (!u.orgs.some((o) => o.orgId === dto.org_id && WORKSHOP_WRITE_ROLES.includes(o.role)) && !isStaff(u)) throw new AppError('FORBIDDEN');
    const org = await this.orgs.findById(dto.org_id); if (!org || org.status !== 'active') throw new AppError('CONFLICT', { messageAr: 'المنشأة غير مفعّلة بعد.', messageEn: 'Organization is not active.' });
    // customer
    let customerUserId: string | undefined; const customerOrgId = dto.customer_org_id;
    if (dto.customer_phone) { const phone = normalizeSaudiPhone(dto.customer_phone); if (!phone) throw new AppError('VALIDATION', { details: [{ path: 'customer_phone', message: 'invalid Saudi mobile' }] }); customerUserId = ((await this.users.findByPhone(phone)) ?? (await this.users.upsertByPhone(phone))).id; }
    // vehicle
    let vehicleId = dto.vehicle_id;
    if (!vehicleId) {
      const vin = dto.vin ? normalizeVin(dto.vin) : null; if (dto.vin && !vin) throw new AppError('VALIDATION', { details: [{ path: 'vin', message: 'invalid VIN' }] });
      const plate = dto.plate ? normalizePlate(dto.plate) : null; if (dto.plate && !plate) throw new AppError('VALIDATION', { details: [{ path: 'plate', message: 'invalid plate' }] });
      const existing = vin ? await this.vehicles.findByVin(vin) : null;
      vehicleId = existing?.id ?? (await this.vehicles.create({ vin: vin ?? undefined, plateAr: plate?.ar, plateEn: plate?.en, ownerType: customerOrgId ? 'organization' : 'user', ownerUserId: customerOrgId ? undefined : customerUserId, ownerOrgId: customerOrgId })).id;
    } else if (!(await this.vehicles.findById(vehicleId))) throw new AppError('NOT_FOUND', { messageAr: 'المركبة غير موجودة.', messageEn: 'Vehicle not found.' });
    const wo = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber(tx);
      const created = await this.repo.create({ number, orgId: dto.org_id, vehicleId: vehicleId, customerUserId, customerOrgId, paymentTerms: dto.payment_terms as PaymentTerms, titleAr: dto.title_ar ?? summariseItems(dto.items), complaintAr: dto.complaint_ar, depositRequired: dto.deposit_required, dueDate: dto.due_date ? new Date(dto.due_date) : undefined, promisedReadyAt: dto.promised_ready_at ? new Date(dto.promised_ready_at) : undefined, createdBy: u.id }, tx);
      for (const [idx, i] of dto.items.entries()) await this.insertItem(created.id, 1, i, idx, tx);
      await this.recomputeTotals(created.id, tx);
      await this.repo.addHistory({ woId: created.id, from: null, to: 'draft', actorUserId: u.id }, tx);
      await this.audit.write(tx, { action: 'work_order.create', entityType: 'work_order', entityId: created.id, orgId: dto.org_id, actorUserId: u.id, after: { number, vehicleId, customerUserId, customerOrgId } });
      await this.outbox.publish(tx, { eventType: 'WorkOrderCreated', aggregateType: 'work_order', aggregateId: created.id, payload: { number, orgId: dto.org_id, customerUserId, customerOrgId } });
      return created;
    });
    return this.load(wo.id);
  }
  async get(u: AuthUser, id: string) {
    const wo = await this.load(id); this.mustRead(wo, u);
    // رحلة القطعة تركب الأمر: «بانتظار القطع» بلا تفصيلٍ كانت تولّد مكالمات «وين وصلنا؟» —
    // وصفٌ وحالة بلا أسعار (كلفة الورشة ليست شأن العميل). عبر خدمة وحدة القطع لا مستودعها.
    const parts = await this.partOrders?.summaryForWorkOrder(id) ?? [];
    return { ...wo, part_orders: parts };
  }
  async list(u: AuthUser, q: { org_id?: string; status?: WorkOrderStatus[]; limit?: number }) {
    if (q.org_id) { if (!isWorkshopMember({ orgId: q.org_id }, u) && !isStaff(u)) throw new AppError('FORBIDDEN'); return this.repo.list({ orgId: q.org_id, status: q.status, limit: q.limit ?? 50 }); }
    const fleetOrgs = u.orgs.filter((o) => o.role.startsWith('fleet_') || o.role === 'owner').map((o) => o.orgId);
    const mine = await this.repo.list({ customerUserId: u.id, status: q.status, limit: q.limit ?? 50 });
    const fleet = fleetOrgs.length ? (await Promise.all(fleetOrgs.map((orgId) => this.repo.list({ customerOrgId: orgId, status: q.status, limit: q.limit ?? 50 })))).flat() : [];
    return [...mine, ...fleet].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async timeline(u: AuthUser, id: string) { const wo = await this.load(id); this.mustRead(wo, u); return { status: wo.status, history: await this.repo.listHistory(id), versions: await this.repo.listVersions(id), inspections: await this.repo.listInspections(id), media: await this.repo.listMedia(id) }; }
  async update(u: AuthUser, id: string, dto: UpdateWorkOrderDto) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    if (AFTER_APPROVAL.includes(wo.status) && (dto.payment_terms || dto.deposit_required)) throw new AppError('CONFLICT', { messageAr: 'لا يمكن تغيير شروط الدفع بعد الاعتماد.', messageEn: 'Payment terms cannot change after approval.' });
    await this.repo.update(id, { titleAr: dto.title_ar, complaintAr: dto.complaint_ar, diagnosisAr: dto.diagnosis_ar, paymentTerms: dto.payment_terms as PaymentTerms | undefined, depositRequired: dto.deposit_required, dueDate: dto.due_date === undefined ? undefined : dto.due_date ? new Date(dto.due_date) : null, promisedReadyAt: dto.promised_ready_at === undefined ? undefined : dto.promised_ready_at ? new Date(dto.promised_ready_at) : null, assignedTechnicianId: dto.assigned_technician_id });
    return this.load(id);
  }

  // ---------- items (only before approval; after → change order) ----------
  private async insertItem(woId: string, version: number, i: ItemDto, idx: number, tx?: TxHandle) {
    const l = lineOf(i);
    return this.repo.addItem(woId, version, { type: i.type as WoItemType, descriptionAr: i.description_ar, descriptionEn: i.description_en, partCondition: i.part_condition as PartCondition | undefined, partNumber: i.part_number, quantity: String(i.quantity), unitPrice: Money.of(i.unit_price).toString(), discount: Money.of(i.discount).toString(), vatRate: i.vat_rate.toFixed(2), lineTotal: l.net.toString(), warrantyDays: i.warranty_days, sortOrder: i.sort_order ?? idx }, tx);
  }
  private async recomputeTotals(woId: string, tx?: TxHandle) {
    const wo = await this.repo.findById(woId, tx); if (!wo) return;
    const items = activeItems(wo);
    const t = computeTotals(items.map((i) => ({ quantity: i.quantity, unitPrice: Money.of(i.unitPrice), discount: Money.of(i.discount), vatRatePct: Number(i.vatRate) })));
    await this.repo.setTotals(woId, { subtotal: t.subtotal.toString(), discount: t.discountTotal.toString(), vatAmount: t.vatTotal.toString(), total: t.total.toString() }, tx);
  }
  private assertEditable(wo: WorkOrder) { if (!EDITABLE_STATUSES.includes(wo.status) && wo.status !== 'awaiting_approval') throw new AppError('CONFLICT', { messageAr: 'بعد الاعتماد استخدم "تعديل الأمر" (نسخة جديدة تحتاج اعتماد العميل).', messageEn: 'After approval use a change order (new version, re-approval).' }); }
  async addItem(u: AuthUser, id: string, dto: ItemDto) { const wo = await this.load(id); this.mustWrite(wo, u); this.assertEditable(wo); await this.uow.run(async (tx) => { await this.insertItem(id, wo.currentVersion, dto, activeItems(wo).length, tx); await this.recomputeTotals(id, tx); }); return this.load(id); }
  async updateItem(u: AuthUser, id: string, itemId: string, dto: UpdateItemDto) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    const item = activeItems(wo).find((i) => i.id === itemId); if (!item) throw new AppError('NOT_FOUND');
    const priceChange = dto.unit_price !== undefined || dto.quantity !== undefined || dto.discount !== undefined || dto.description_ar !== undefined;
    if (priceChange) this.assertEditable(wo);
    const merged = { quantity: String(dto.quantity ?? item.quantity), unit_price: dto.unit_price ?? item.unitPrice, discount: dto.discount ?? item.discount, vat_rate: Number(item.vatRate) };
    await this.uow.run(async (tx) => { await this.repo.updateItem(itemId, { descriptionAr: dto.description_ar, descriptionEn: dto.description_en, quantity: merged.quantity, unitPrice: Money.of(merged.unit_price).toString(), discount: Money.of(merged.discount).toString(), lineTotal: lineOf(merged).net.toString(), warrantyDays: dto.warranty_days, isCompleted: dto.is_completed, completedAt: dto.is_completed === undefined ? undefined : dto.is_completed ? new Date() : null }, tx); if (priceChange) await this.recomputeTotals(id, tx); });
    if (dto.is_completed !== undefined) this.rt?.publish(`work-order:${id}`, 'item', { work_order_id: id, item_id: itemId, is_completed: dto.is_completed });
    return this.load(id);
  }
  async removeItem(u: AuthUser, id: string, itemId: string) { const wo = await this.load(id); this.mustWrite(wo, u); this.assertEditable(wo); if (!activeItems(wo).some((i) => i.id === itemId)) throw new AppError('NOT_FOUND'); await this.uow.run(async (tx) => { await this.repo.removeItem(itemId, wo.currentVersion, tx); await this.recomputeTotals(id, tx); }); return this.load(id); }

  // ---------- versions / approval ----------
  private async buildSnapshot(wo: WorkOrder, version: number, reasonAr: string | null): Promise<Snapshot> {
    const org = await this.orgs.findById(wo.orgId); const veh = await this.vehicles.findById(wo.vehicleId); const cust = wo.customerUserId ? await this.users.findById(wo.customerUserId) : null;
    const items = activeItems(wo).sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      work_order_id: wo.id, number: wo.number, version, org: { id: wo.orgId, name_ar: org?.tradeNameAr ?? org?.legalNameAr ?? '', vat_number: org?.vatNumber ?? null },
      customer: { user_id: wo.customerUserId, org_id: wo.customerOrgId, name_ar: cust?.fullNameAr ?? null },
      vehicle: { id: wo.vehicleId, vin: veh?.vin ?? null, plate: veh?.plateNumber ?? null, make_ar: veh?.makeNameAr ?? null, model_ar: veh?.modelNameAr ?? null, year: veh?.modelYear ?? null },
      items: items.map((i) => ({ id: i.id, type: i.type, description_ar: i.descriptionAr, description_en: i.descriptionEn, part_condition: i.partCondition, part_number: i.partNumber, quantity: i.quantity, unit_price: i.unitPrice, discount: i.discount, vat_rate: i.vatRate, line_total: i.lineTotal, warranty_days: i.warrantyDays })),
      totals: { subtotal: wo.subtotal, discount: wo.discount, vat: wo.vatAmount, total: wo.total },
      payment_terms: wo.paymentTerms, deposit_required: wo.depositRequired, due_date: wo.dueDate?.toISOString().slice(0, 10) ?? null, promised_ready_at: wo.promisedReadyAt?.toISOString() ?? null,
      contract_terms_version: wo.contractTermsVersion, reason_ar: reasonAr, created_at: new Date().toISOString(),
    };
  }
  /** Workshop freezes the current items into a signed-able version and asks the customer to approve. */
  async requestApproval(u: AuthUser, id: string, reasonAr?: string) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    if (activeItems(wo).length === 0) throw new AppError('VALIDATION', { messageAr: 'أضف بنداً واحداً على الأقل.', messageEn: 'Add at least one item.' });
    const from = wo.status;
    if (!['draft', 'received', 'inspecting', 'awaiting_approval', ...CHANGE_ORDER_FROM].includes(from)) throw new AppError('CONFLICT', { messageAr: `لا يمكن طلب الاعتماد في الحالة "${from}".`, messageEn: `Cannot request approval from ${from}.` });
    // Version to freeze: reuse currentVersion when it has no snapshot yet (first request, or a change
    // order already bumped it); otherwise the content changed → next version.
    const cur = await this.repo.getVersion(id, wo.currentVersion);
    let version = cur ? wo.currentVersion + 1 : wo.currentVersion;
    let snap = await this.buildSnapshot(wo, version, reasonAr ?? null); let sha = snapshotHash(snap);
    if (cur && from === 'awaiting_approval') {
      const same = snapshotHash({ ...cur.snapshot, created_at: snap.created_at, reason_ar: snap.reason_ar, version: cur.version }) === snapshotHash({ ...snap, version: cur.version });
      if (same) { version = cur.version; snap = cur.snapshot; sha = cur.sha256; }
    }
    await this.uow.run(async (tx) => {
      if (!(cur && version === cur.version)) { await this.repo.addVersion({ woId: id, version, reasonAr, snapshot: snap, sha256: sha, createdBy: u.id }, tx); if (version !== wo.currentVersion) await this.repo.update(id, { currentVersion: version }, tx); }
      if (from === 'draft') { await this.transitions.apply(tx, wo, 'received', { userId: u.id }); const received = await this.repo.findById(id, tx); if (received) await this.transitions.apply(tx, received, 'awaiting_approval', { userId: u.id }, reasonAr, { version }); }
      else if (from !== 'awaiting_approval') await this.transitions.apply(tx, wo, 'awaiting_approval', { userId: u.id }, reasonAr, { version });
      await this.outbox.publish(tx, { eventType: 'WorkOrderApprovalRequested', aggregateType: 'work_order', aggregateId: id, payload: { number: wo.number, version, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, total: wo.total, approvalUrl: this.approvalLinks?.url(id, version) ?? null } });
    });
    const fresh = await this.load(id); const v = await this.repo.getVersion(id, fresh.currentVersion);
    return { work_order: fresh, version: v?.version, snapshot_sha256: v?.sha256, approval_url_hint: `/v1/work-orders/${id}/approve` };
  }
  /** Change order after approval: apply item ops under a new version and request re-approval. */
  async changeOrder(u: AuthUser, id: string, dto: ChangeOrderDto) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    if (!CHANGE_ORDER_FROM.includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'تعديل الأمر ممكن فقط أثناء التنفيذ.', messageEn: 'Change orders are only possible during execution.' });
    const newVersion = wo.currentVersion + 1;
    await this.uow.run(async (tx) => {
      for (const rid of dto.remove_item_ids) { if (!activeItems(wo).some((i) => i.id === rid)) throw new AppError('NOT_FOUND'); await this.repo.removeItem(rid, newVersion, tx); }
      for (const up of dto.update) { const item = activeItems(wo).find((i) => i.id === up.id); if (!item) throw new AppError('NOT_FOUND'); const merged = { quantity: String(up.quantity ?? item.quantity), unit_price: up.unit_price ?? item.unitPrice, discount: up.discount ?? item.discount, vat_rate: Number(item.vatRate) }; await this.repo.updateItem(up.id, { descriptionAr: up.description_ar, quantity: merged.quantity, unitPrice: Money.of(merged.unit_price).toString(), discount: Money.of(merged.discount).toString(), lineTotal: lineOf(merged).net.toString(), warrantyDays: up.warranty_days }, tx); }
      for (const [idx, i] of dto.add.entries()) await this.insertItem(id, newVersion, i, activeItems(wo).length + idx, tx);
      await this.repo.update(id, { currentVersion: newVersion }, tx);
      await this.recomputeTotals(id, tx);
    });
    return this.requestApproval(u, id, dto.reason_ar);
  }
  /** Customer starts approval: Nafath (sign) or OTP fallback. Returns what the client needs to complete. */
  async approveInit(u: AuthUser, id: string, dto: ApproveInitDto) {
    const wo = await this.load(id); this.mustCustomer(wo, u);
    if (wo.status !== 'awaiting_approval') throw new AppError('CONFLICT', { messageAr: 'أمر العمل ليس بانتظار الاعتماد.', messageEn: 'Work order is not awaiting approval.' });
    // Checked here too, not only at signing: sending an approver an SMS for a repair their own policy
    // forbids wastes their time and teaches them to ignore the app (Step 26).
    if (wo.customerOrgId && this.fleet) await this.fleet.assertMaySign(wo.customerOrgId, wo);
    const version = dto.version ?? wo.currentVersion; const v = await this.repo.getVersion(id, version); if (!v || version !== wo.currentVersion) throw new AppError('CONFLICT', { messageAr: 'هناك نسخة أحدث تحتاج اعتمادك.', messageEn: 'A newer version needs your approval.', details: { current_version: wo.currentVersion } });
    if (dto.method === 'nafath') {
      const user = await this.users.findById(u.id); if (!user?.nafathVerifiedAt) throw new AppError('FORBIDDEN', { messageAr: 'الاعتماد عبر نفاذ يتطلب تسجيل الدخول بنفاذ.', messageEn: 'Nafath approval requires a Nafath-verified login.' });
      const r = await this.nafath.initiateSign({ userId: u.id, documentHash: v.sha256, purpose: 'approve_work_order' });
      return { method: 'nafath', version, snapshot_sha256: v.sha256, transaction_id: r.transactionId, random: r.random, expires_at: r.expiresAt.toISOString() };
    }
    if (!u.phone) throw new AppError('VALIDATION', { messageAr: 'لا يوجد رقم جوال على حسابك.', messageEn: 'No phone on your account.' });
    // The public approval page reaches this path, so the per-phone quota must be enforced here too —
    // otherwise a leaked link is a free SMS pump aimed at the customer (and at our bill).
    const recent = await this.otps.countRecent(u.phone, new Date(Date.now() - 10 * 60_000));
    if (recent >= this.config.get('OTP_MAX_REQUESTS_PER_10MIN')) throw new AppError('OTP_TOO_MANY');
    const code = this.hasher.randomDigits(6);
    await this.otps.create({ phone: u.phone, purpose: 'sign_work_order', codeHash: this.hasher.sha256(`${u.phone}:${code}`), expiresAt: new Date(Date.now() + 300_000) });
    // The code must never travel in the HTTP response outside local development: the public approval page
    // (/v1/approve/:token/otp) reaches this path, and returning the code there would defeat the second factor
    // for anyone who merely holds the SMS link.
    const exposeDebug = !this.config.isProd && this.config.get('INTEGRATION_SMS') === 'mock';
    return { method: 'otp', version, snapshot_sha256: v.sha256, expires_in: 300, ...(exposeDebug ? { debug_code: code } : {}) };
  }
  async approveComplete(u: AuthUser, id: string, dto: ApproveCompleteDto, meta: { ip?: string | null; deviceId?: string | null }) {
    const wo = await this.load(id); this.mustCustomer(wo, u);
    if (wo.status !== 'awaiting_approval') throw new AppError('CONFLICT', { messageAr: 'أمر العمل ليس بانتظار الاعتماد.', messageEn: 'Not awaiting approval.' });
    const version = dto.version ?? wo.currentVersion; const v = await this.repo.getVersion(id, version); if (!v || version !== wo.currentVersion) throw new AppError('CONFLICT', { messageAr: 'هناك نسخة أحدث تحتاج اعتمادك.', messageEn: 'A newer version needs your approval.' });
    // A fleet's own spending rules are checked before the signature is taken, never after: signing is the
    // legal act, and the fleet must not be bound by a repair its policy forbids (Step 26).
    if (wo.customerOrgId && this.fleet) await this.fleet.assertMaySign(wo.customerOrgId, wo);
    let providerTxRef: string | undefined; let payload: unknown; let method: 'nafath' | 'otp' = dto.method;
    if (dto.method === 'nafath') {
      if (!dto.transaction_id) throw new AppError('VALIDATION', { details: [{ path: 'transaction_id', message: 'required' }] });
      const st = await this.nafath.status(dto.transaction_id);
      if (st.status === 'pending') throw new AppError('NAFATH_PENDING'); if (st.status !== 'approved') throw new AppError('NAFATH_REJECTED');
      providerTxRef = dto.transaction_id; payload = { sub: st.claims?.sub };
    } else {
      if (!dto.code || !u.phone) throw new AppError('VALIDATION', { details: [{ path: 'code', message: 'required' }] });
      const ch = await this.otps.findLatestActive(u.phone, 'sign_work_order', new Date()); if (!ch) throw new AppError('OTP_EXPIRED');
      if (ch.codeHash !== this.hasher.sha256(`${u.phone}:${dto.code}`)) { await this.otps.incrementAttempts(ch.id); throw new AppError('OTP_INVALID'); }
      await this.otps.consume(ch.id); method = 'otp';
    }
    const target: WorkOrderStatus = activeItems(wo).some((i) => i.type === 'part') ? 'awaiting_parts' : 'in_progress';
    await this.uow.run(async (tx) => {
      await this.repo.addSignature({ woId: id, versionId: v.id, signerUserId: u.id, signerRole: wo.customerOrgId ? 'fleet_approver' : 'customer', purpose: 'approve_scope', method, providerTxRef, providerPayload: payload, signedHash: v.sha256, ipAddress: meta.ip ?? null, deviceId: meta.deviceId ?? null }, tx);
      await this.repo.update(id, { approvedAt: new Date() }, tx);
      await this.transitions.apply(tx, wo, target, { userId: u.id }, undefined, { approved_version: version, method, deferred: wo.paymentTerms === 'deferred' });
      await this.outbox.publish(tx, { eventType: 'WorkOrderApproved', aggregateType: 'work_order', aggregateId: id, payload: { number: wo.number, version, sha256: v.sha256, method, orgId: wo.orgId, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, total: wo.total, paymentTerms: wo.paymentTerms, dueDate: wo.dueDate?.toISOString() ?? null } });
      await this.passport.record({ vehicleId: wo.vehicleId, type: 'work_order', orgId: wo.orgId, refTable: 'work_orders', refId: id, summaryAr: `اعتماد أمر إصلاح ${wo.number} — ${activeItems(wo).length} بند`, summaryEn: `Work order ${wo.number} approved`, data: { version, total: wo.total }, isPublic: true }, tx);
    });
    return { approved: true, version, snapshot_sha256: v.sha256, method, work_order: await this.load(id) };
  }

  // ---------- transitions / cancel ----------
  async transition(u: AuthUser, id: string, dto: TransitionDto) {
    const wo = await this.load(id); const to = dto.to as WorkOrderStatus;
    const customerAllowed = to === 'closed' && wo.status === 'delivered' && isCustomer(wo, u); // customer confirms receipt
    if (!customerAllowed) { this.mustWrite(wo, u); if (!WORKSHOP_TRANSITIONS.includes(to)) throw new AppError('FORBIDDEN', { messageAr: 'هذا الانتقال له مسار خاص (اعتماد/إلغاء/نزاع).', messageEn: 'Use the dedicated endpoint for approval/cancel/dispute.' }); }
    if (to === 'awaiting_approval') throw new AppError('CONFLICT', { messageAr: 'استخدم طلب الاعتماد.', messageEn: 'Use request-approval.' });
    if ((to === 'in_progress' || to === 'awaiting_parts') && !wo.approvedAt) throw new AppError('CONFLICT', { messageAr: 'لا يبدأ التنفيذ قبل اعتماد العميل.', messageEn: 'Execution cannot start before customer approval.' });
    if (to === 'delivered' && !(await this.repo.listInspections(id)).some((i) => i.type === 'check_out')) throw new AppError('CONFLICT', { messageAr: 'أضف فحص التسليم أولاً.', messageEn: 'Add the check-out inspection first.' });
    await this.uow.run(async (tx) => {
      await this.transitions.apply(tx, wo, to, { userId: u.id }, dto.note_ar);
      if (to === 'delivered') await this.passport.record({ vehicleId: wo.vehicleId, type: 'work_order', orgId: wo.orgId, refTable: 'work_orders', refId: id, summaryAr: `تسليم المركبة — أمر ${wo.number}`, summaryEn: `Vehicle delivered — ${wo.number}` }, tx);
    });
    return this.load(id);
  }
  async cancel(u: AuthUser, id: string, dto: CancelDto) {
    const wo = await this.load(id);
    const byCustomer = isCustomer(wo, u) && !wo.approvedAt; // customer may decline before approval
    if (!byCustomer) this.mustWrite(wo, u);
    await this.uow.run((tx) => this.transitions.apply(tx, wo, 'cancelled', { userId: u.id }, dto.reason_ar));
    return this.load(id);
  }

  // ---------- inspections / media ----------
  async addInspection(u: AuthUser, id: string, dto: InspectionDto) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    const type = dto.type as InspectionType;
    if (type === 'check_out' && !AFTER_APPROVAL.includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'فحص التسليم يكون بعد التنفيذ.', messageEn: 'Check-out inspection comes after execution.' });
    const r = await this.uow.run(async (tx) => {
      const ins = await this.repo.addInspection({ woId: id, vehicleId: wo.vehicleId, orgId: wo.orgId, type, odometerKm: dto.odometer_km, fuelLevelPct: dto.fuel_level_pct, checklist: dto.checklist, damages: dto.damages, inspectorUserId: u.id, mediaIds: dto.media_ids }, tx);
      await this.passport.record({ vehicleId: wo.vehicleId, type: 'inspection', odometerKm: dto.odometer_km ?? null, orgId: wo.orgId, refTable: 'inspections', refId: ins.id, summaryAr: type === 'check_in' ? `فحص استلام — ${dto.media_ids.length} صورة، ${dto.damages.length} ملاحظة` : type === 'check_out' ? 'فحص تسليم' : 'فحص', summaryEn: `${type} inspection`, isPublic: type === 'check_in' || type === 'check_out' }, tx);
      if (type === 'check_in' && wo.status === 'draft') await this.transitions.apply(tx, wo, 'received', { userId: u.id });
      if (type === 'check_in' && (wo.status === 'received' || wo.status === 'draft')) { const fresh = await this.repo.findById(id, tx); if (fresh && fresh.status === 'received') await this.transitions.apply(tx, fresh, 'inspecting', { userId: u.id }); }
      return ins;
    });
    this.rt?.publish(`work-order:${id}`, 'inspection', { work_order_id: id, inspection_id: r.id, type });
    return { id: r.id, work_order: await this.load(id) };
  }
  async attachMedia(u: AuthUser, id: string, dto: AttachMediaDto) {
    const wo = await this.load(id); this.mustWrite(wo, u);
    if (dto.item_id && !wo.items.some((i) => i.id === dto.item_id)) throw new AppError('NOT_FOUND');
    await this.repo.linkMedia(dto.item_id ? 'work_order_item' : 'work_order', dto.item_id ?? id, dto.media_ids, dto.label);
    this.rt?.publish(`work-order:${id}`, 'media', { work_order_id: id, item_id: dto.item_id ?? null, count: dto.media_ids.length, label: dto.label });
    return { attached: dto.media_ids.length };
  }

  // ---------- documents ----------
  async renderVersion(u: AuthUser, id: string, version: number) {
    const wo = await this.load(id); this.mustRead(wo, u);
    const v = await this.repo.getVersion(id, version); if (!v) throw new AppError('NOT_FOUND');
    const signed = await this.repo.hasSignature(v.id, 'approve_scope');
    return this.pdf.renderWorkOrderVersion(v.snapshot, { signed, signedAt: signed ? wo.approvedAt : null, signatureRef: v.sha256 });
  }
  async getVersion(u: AuthUser, id: string, version: number) { const wo = await this.load(id); this.mustRead(wo, u); const v = await this.repo.getVersion(id, version); if (!v) throw new AppError('NOT_FOUND'); return { ...v, signed: await this.repo.hasSignature(v.id, 'approve_scope') }; }
}
export { Decimal };
