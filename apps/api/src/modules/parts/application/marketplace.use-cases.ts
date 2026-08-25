import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PartCondition } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { VEHICLE_REPOSITORY, type VehicleRepository } from '../../vehicles/domain/repositories';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../../work-orders/application/ports/realtime.port';
import type { PartBid, PartRequest } from '../domain/parts';
import { canRequest } from '../domain/parts';
import { PARTS_REPOSITORY, type PartsRepository } from '../domain/repositories';
import type { BidDto, CreateRequestDto } from './dto/parts.dto';
import { OrdersUseCases } from './orders.use-cases';

/** Reverse auction: request → matched suppliers notified → bids (one live bid per supplier, upsert) → accept → part order. */
@Injectable()
export class MarketplaceUseCases {
  constructor(@Inject(PARTS_REPOSITORY) private readonly repo: PartsRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig, private readonly orders: OrdersUseCases, @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher) {}
  private isRequester(r: PartRequest, u: AuthUser) { return isPlatformStaff(u) || r.requesterUserId === u.id || (!!r.requesterOrgId && !!membership(u, r.requesterOrgId)); }
  private async canRead(r: PartRequest, u: AuthUser) { if (this.isRequester(r, u)) return true; const rec = await this.repo.listRecipients(r.id); return rec.some((x) => membership(u, x.orgId)); }

  async create(u: AuthUser, dto: CreateRequestDto) {
    if (dto.org_id && !membership(u, dto.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    let vin = dto.vin?.toUpperCase() ?? null; const vehicleId = dto.vehicle_id ?? null; let point: { lat: number; lng: number } | null = dto.lat != null && dto.lng != null ? { lat: dto.lat, lng: dto.lng } : null;
    if (vehicleId) { const v = await this.vehicles.findById(vehicleId); if (!v) throw new AppError('NOT_FOUND'); vin = vin ?? v.vin; }
    if (!point && dto.org_id) { const locs = await this.orgs.listLocations(dto.org_id); const l = locs.find((x) => x.isPrimary) ?? locs[0]; if (l) point = { lat: l.lat, lng: l.lng }; }
    const category = dto.category_code ? await this.repo.findCategoryByCode(dto.category_code) : null;
    const minutes = dto.bidding_minutes ?? this.config.get('BIDDING_DEFAULT_MINUTES'); const endsAt = new Date(Date.now() + minutes * 60_000);
    const req = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber('PR', tx);
      const r = await this.repo.createRequest({ number, requesterUserId: dto.org_id ? null : u.id, requesterOrgId: dto.org_id ?? null, workOrderId: dto.work_order_id ?? null, vehicleId, vin, categoryId: category?.id ?? null, partNameAr: dto.part_name_ar, partNumber: dto.part_number ?? null, descriptionAr: dto.description_ar ?? null, acceptedConditions: dto.accepted_conditions as PartCondition[], quantity: dto.quantity, searchRadiusKm: dto.radius_km, biddingEndsAt: endsAt, deliverTo: point }, tx);
      await this.audit.write(tx, { action: 'part_request.create', entityType: 'part_request', entityId: r.id, orgId: dto.org_id ?? null, actorUserId: u.id, after: { number, part: dto.part_name_ar, ends_at: endsAt.toISOString() } });
      return r;
    });
    // Matching runs right after (PostGIS); recipients get the outbox event → notification. Idempotent on re-run.
    const matched = await this.repo.matchSuppliers(req.id, req.searchRadiusKm, 200);
    await this.uow.run(async (tx) => { await this.repo.addRecipients(req.id, matched, tx); await this.outbox.publish(tx, { eventType: 'PartRequestCreated', aggregateType: 'part_request', aggregateId: req.id, payload: { number: req.number, partNameAr: req.partNameAr, recipientOrgIds: matched.map((m) => m.orgId), requesterUserId: req.requesterUserId, requesterOrgId: req.requesterOrgId, endsAt: endsAt.toISOString() } }); });
    // ويسمعه التشليح والوكيل لحظتَه على قناة منشأتهم، لا حين يفتحون التطبيق. القطعة تُباع لمن
    // يردّ أولاً — ودقيقةُ تأخير هنا تعني بيعاً ذهب لغيرك.
    for (const m of matched) {
      this.rt?.publish(`org:${m.orgId}`, 'part-request', {
        request_id: req.id, number: req.number, part_name_ar: req.partNameAr,
        vin: req.vin, quantity: req.quantity, distance_km: m.distanceKm, ends_at: endsAt.toISOString(),
      });
    }
    return { ...req, recipients: matched.length };
  }
  async get(u: AuthUser, id: string) {
    const r = await this.repo.findRequest(id); if (!r) throw new AppError('NOT_FOUND');
    if (!(await this.canRead(r, u))) throw new AppError('FORBIDDEN');
    const bids = await this.repo.listBids(id); const mine = this.isRequester(r, u);
    const visible = mine ? bids : bids.filter((b) => membership(u, b.supplierOrgId));
    // «القطعة موجودة، سعرها النهائي، ووينها» — the supplier's name and place ride every bid the
    // requester compares (owner directive 2026-08-22); distance is measured from the delivery point.
    const where = await this.repo.whereOfOrgs([...new Set(visible.map((b) => b.supplierOrgId))], { requestId: id });
    // «شوف القطعة قبل ما تشتري» — a used part without a photo is a gamble (backlog 27).
    const photos = await this.repo.bidMediaOf(visible.map((b) => b.id));
    const enriched = await Promise.all(visible.map(async (b) => {
      const w = where.get(b.supplierOrgId); const org = await this.orgs.findById(b.supplierOrgId);
      const place = w?.district ?? w?.city ?? null; const dist = w?.distanceKm == null ? null : `${w.distanceKm.toFixed(1)} كم`;
      return { ...b, media_ids: photos.get(b.id) ?? [], supplier_name_ar: org?.tradeNameAr ?? org?.legalNameAr ?? null, supplier_city: w?.city ?? null, supplier_district: w?.district ?? null, distance_km: w?.distanceKm ?? null, where_text: [place, dist].filter(Boolean).join(' — ') || null };
    }));
    return { ...r, bids: enriched, bids_count: bids.length, lowest_bid: bids.find((b) => b.status === 'submitted')?.unitPrice ?? null, recipients: mine ? await this.repo.listRecipients(id) : undefined };
  }
  async list(u: AuthUser, q: { org_id?: string; as?: 'requester' | 'supplier'; status?: string[]; limit?: number }) {
    if (q.org_id && !membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (q.as === 'supplier') { if (!q.org_id) throw new AppError('VALIDATION', { messageEn: 'org_id required for supplier view' }); return this.repo.listRequests({ recipientOrgId: q.org_id, status: q.status as never, limit: q.limit ?? 50 }); }
    return this.repo.listRequests({ requesterUserId: q.org_id ? undefined : u.id, requesterOrgId: q.org_id, status: q.status as never, limit: q.limit ?? 50 });
  }
  /** Supplier bid — one live bid per supplier per request; re-submitting updates it in place. */
  async bid(u: AuthUser, requestId: string, dto: BidDto): Promise<PartBid> {
    if (!membership(u, dto.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const r = await this.repo.findRequest(requestId); if (!r) throw new AppError('NOT_FOUND');
    if (!['open', 'bidding'].includes(r.status) || r.biddingEndsAt.getTime() < Date.now()) throw new AppError('CONFLICT', { messageAr: 'انتهت فترة تقديم العروض.', messageEn: 'Bidding is closed.' });
    if (!r.acceptedConditions.includes(dto.condition as PartCondition)) throw new AppError('VALIDATION', { messageAr: 'حالة القطعة غير مقبولة في هذا الطلب.', messageEn: 'Condition not accepted for this request.' });
    if (dto.inventory_id) { const inv = await this.repo.findInventory(dto.inventory_id); if (!inv || inv.orgId !== dto.org_id) throw new AppError('VALIDATION', { messageEn: 'inventory item not found for org' }); }
    const bid = await this.uow.run(async (tx) => {
      const b0 = await this.repo.upsertBid({ requestId, supplierOrgId: dto.org_id, inventoryId: dto.inventory_id ?? null, condition: dto.condition as PartCondition, unitPrice: dto.unit_price, quantity: dto.quantity, vatRate: '15.00', deliveryFee: dto.delivery_fee, deliveryEtaHours: dto.delivery_eta_hours ?? null, warrantyDays: dto.warranty_days, warrantyTermsAr: dto.warranty_terms_ar ?? null, donorVin: dto.donor_vin ?? null, notesAr: dto.notes_ar ?? null }, tx);
      await this.repo.attachBidMedia(b0.id, dto.media_ids, tx);
      const b = b0;
      if (r.status === 'open') await this.repo.updateRequest(requestId, { status: 'bidding' }, tx);
      await this.repo.addRecipients(requestId, [{ orgId: dto.org_id, distanceKm: null }], tx);
      await this.audit.write(tx, { action: 'part_bid.submit', entityType: 'part_bid', entityId: b.id, orgId: dto.org_id, actorUserId: u.id, after: { request: r.number, unit_price: dto.unit_price, condition: dto.condition } });
      await this.outbox.publish(tx, { eventType: 'PartBidSubmitted', aggregateType: 'part_request', aggregateId: requestId, payload: { number: r.number, requesterUserId: r.requesterUserId, requesterOrgId: r.requesterOrgId, supplierOrgId: dto.org_id, unitPrice: dto.unit_price } });
      return b;
    });
    this.rt?.publish(`part-request:${requestId}`, 'bid', { request_id: requestId, bid_id: bid.id, unit_price: bid.unitPrice, condition: bid.condition, warranty_days: bid.warrantyDays, supplier_org_id: bid.supplierOrgId });
    return bid;
  }
  /** Requester accepts a bid → request awarded, other bids rejected, part order created (reverse_auction). */
  async accept(u: AuthUser, requestId: string, bidId: string, paymentTerms: 'prepaid' | 'deferred') {
    const r = await this.repo.findRequest(requestId); if (!r) throw new AppError('NOT_FOUND'); if (!this.isRequester(r, u)) throw new AppError('FORBIDDEN');
    if (!canRequest(r.status, 'awarded')) throw new AppError('CONFLICT', { messageAr: 'لا يمكن قبول عرض في هذه الحالة.', messageEn: `Cannot award request in status ${r.status}.` });
    const bid = await this.repo.findBid(bidId); if (!bid || bid.requestId !== requestId || bid.status !== 'submitted') throw new AppError('CONFLICT', { messageAr: 'العرض غير متاح.', messageEn: 'Bid is not available.' });
    const order = await this.uow.run(async (tx) => {
      await this.repo.setBidStatus(bid.id, 'accepted', tx); await this.repo.setBidsStatus(requestId, ['submitted'], 'rejected', bid.id, tx);
      await this.repo.updateRequest(requestId, { status: 'awarded', awardedBidId: bid.id }, tx);
      const o = await this.orders.createFromBid(tx, u, r, bid, paymentTerms);
      await this.audit.write(tx, { action: 'part_request.award', entityType: 'part_request', entityId: requestId, orgId: r.requesterOrgId, actorUserId: u.id, after: { bid: bid.id, supplier: bid.supplierOrgId, order: o.number } });
      await this.outbox.publish(tx, { eventType: 'PartBidAccepted', aggregateType: 'part_request', aggregateId: requestId, payload: { number: r.number, supplierOrgId: bid.supplierOrgId, orderId: o.id, orderNumber: o.number, total: o.total, rejectedSupplierOrgIds: [] } });
      return o;
    });
    this.rt?.publish(`part-request:${requestId}`, 'awarded', { request_id: requestId, bid_id: bid.id, order_id: order.id });
    return { request: await this.repo.findRequest(requestId), order };
  }
  async cancel(u: AuthUser, requestId: string) { const r = await this.repo.findRequest(requestId); if (!r) throw new AppError('NOT_FOUND'); if (!this.isRequester(r, u)) throw new AppError('FORBIDDEN'); if (!canRequest(r.status, 'cancelled')) throw new AppError('CONFLICT'); await this.uow.run(async (tx) => { await this.repo.updateRequest(requestId, { status: 'cancelled' }, tx); await this.repo.setBidsStatus(requestId, ['submitted'], 'rejected', undefined, tx); await this.audit.write(tx, { action: 'part_request.cancel', entityType: 'part_request', entityId: requestId, orgId: r.requesterOrgId, actorUserId: u.id }); }); return this.repo.findRequest(requestId); }
  /** Job: requests whose bidding window ended without an award → expired (bids expire too). */
  async expireDue(limit = 200) {
    const due = await this.repo.listRequests({ status: ['open', 'bidding'], endedBefore: new Date(), limit }); let n = 0;
    for (const r of due) { await this.uow.run(async (tx) => { await this.repo.updateRequest(r.id, { status: 'expired' }, tx); await this.repo.setBidsStatus(r.id, ['submitted'], 'expired', undefined, tx); await this.outbox.publish(tx, { eventType: 'PartRequestExpired', aggregateType: 'part_request', aggregateId: r.id, payload: { number: r.number, requesterUserId: r.requesterUserId, requesterOrgId: r.requesterOrgId } }); }); n++; }
    return { expired: n };
  }
}
