import { Inject, Injectable, Optional } from '@nestjs/common';
import type { TransportStatus, TransportType } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { Money } from '../../../common/domain/money';
import { computeLine } from '../../../common/domain/vat';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { HASHER_PORT, type HasherPort } from '../../identity/application/ports/hasher.port';
import { OTP_REPOSITORY, type OtpRepository } from '../../identity/domain/repositories';
import { USER_REPOSITORY, type UserRepository } from '../../identity/domain/repositories';
import { VehicleEventsWriter } from '../../vehicles/application/vehicle-events.writer';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../../work-orders/application/ports/realtime.port';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../invoicing/domain/repositories';
import { ACTIVE_TRANSPORT, canComplete, canTransitionTransport, DEFAULT_TOW_RATES, quotePrice, type GeoPoint, type TowRates, type TransportJob } from '../domain/transport';
import { TRANSPORT_REPOSITORY, type TransportRepository } from '../domain/repositories';
import { MAPS_PORT, type MapsPort } from './ports/maps.port';
import type { AcceptDto, CancelDto, CreateJobDto, DriverProfileDto, OnlineDto, ProofDto, QuoteDto, TrackDto, TransitionDto } from './dto/transport.dto';

/**
 * Tow / delivery jobs: quote by real route distance → request → a nearby driver accepts → tracked to the
 * drop-off → delivered only with proof (photo + the receiver's OTP). Every step writes audit + outbox and
 * publishes to the realtime channel `transport:{id}` so the requester watches the truck move.
 */
@Injectable()
export class TransportUseCases {
  constructor(
    @Inject(TRANSPORT_REPOSITORY) private readonly repo: TransportRepository, @Inject(MAPS_PORT) private readonly maps: MapsPort,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(OTP_REPOSITORY) private readonly otps: OtpRepository, @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter,
    private readonly config: AppConfig, private readonly passport: VehicleEventsWriter,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
  ) {}
  /** Rates live in platform_settings so ops can tune pricing without a deploy (CLAUDE.md §5.7). */
  private rates(): TowRates { return { ...DEFAULT_TOW_RATES, marginBps: this.config.get('TRANSPORT_MARGIN_BPS') }; }
  private isRequester(j: TransportJob, u: AuthUser) { return j.requesterUserId === u.id || (!!j.requesterOrgId && !!membership(u, j.requesterOrgId)); }
  private isDriver(j: TransportJob, u: AuthUser) { return j.driverUserId === u.id; }
  private mustRead(j: TransportJob, u: AuthUser) { if (!this.isRequester(j, u) && !this.isDriver(j, u) && !isPlatformStaff(u) && !(j.providerOrgId && membership(u, j.providerOrgId))) throw new AppError('FORBIDDEN'); }

  async quote(dto: QuoteDto) {
    const r = await this.maps.route(dto.pickup, dto.dropoff);
    const q = quotePrice(r.distanceKm, dto.type as TransportType, this.rates());
    // The same arithmetic as the invoice line (quantity 1 × price, 15% VAT), so the number the
    // customer sees before requesting is the number the invoice bills — to the halala. A consumer
    // quote is shown VAT-inclusive (P1 scope arbitration).
    const l = computeLine({ quantity: '1', unitPrice: Money.of(q.price), vatRatePct: 15 });
    return { type: dto.type, distance_km: r.distanceKm.toFixed(2), eta_minutes: r.durationMinutes, price: q.price, vat: l.vat.toString(), total: l.net.plus(l.vat).toString(), platform_margin: q.margin, currency: 'SAR', source: r.source };
  }
  async create(u: AuthUser, dto: CreateJobDto) {
    if (dto.org_id && !membership(u, dto.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    let vehicleId = dto.vehicle_id ?? null;
    if (dto.work_order_id) { const wo = await this.workOrders.findById(dto.work_order_id); if (!wo) throw new AppError('NOT_FOUND'); vehicleId = vehicleId ?? wo.vehicleId; }
    const route = await this.maps.route(dto.pickup, dto.dropoff);
    const q = quotePrice(route.distanceKm, dto.type as TransportType, this.rates());
    const job = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber(tx);
      const j = await this.repo.create({ number, type: dto.type as TransportType, requesterUserId: dto.org_id ? null : u.id, requesterOrgId: dto.org_id ?? null, vehicleId, workOrderId: dto.work_order_id ?? null, partOrderId: dto.part_order_id ?? null, pickup: dto.pickup, pickupAddress: dto.pickup_address ?? null, dropoff: dto.dropoff, dropoffAddress: dto.dropoff_address ?? null, distanceKm: route.distanceKm.toFixed(2), quotedPrice: q.price, platformMargin: q.margin, scheduledAt: dto.scheduled_at ? new Date(dto.scheduled_at) : null, notesAr: dto.notes_ar ?? null }, tx);
      await this.audit.write(tx, { action: 'transport.request', entityType: 'transport_job', entityId: j.id, orgId: dto.org_id ?? null, actorUserId: u.id, after: { number, type: dto.type, distance_km: j.distanceKm, price: j.quotedPrice } });
      await this.outbox.publish(tx, { eventType: 'TransportRequested', aggregateType: 'transport_job', aggregateId: j.id, payload: { number, type: dto.type, requesterUserId: j.requesterUserId, requesterOrgId: j.requesterOrgId, pickup: dto.pickup, price: j.quotedPrice, workOrderId: j.workOrderId } });
      return j;
    });
    // Who could take it right now — surfaced to the requester, and the drivers see it in their offers list.
    const nearby = await this.repo.driversNear(dto.pickup, 30, dto.type as TransportType, 10);
    return { ...job, eta_minutes: route.durationMinutes, drivers_nearby: nearby.length };
  }
  async get(u: AuthUser, id: string) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND'); this.mustRead(j, u);
    const driver = j.driverUserId ? await this.repo.findDriver(j.driverUserId) : null;
    // The tow invoice (auto-issued on proven delivery) rides along so the app can offer «ادفع» without a second call.
    const inv = j.status === 'delivered' ? await this.invoices.findByTransportJob(id) : null;
    return { ...j, driver: driver ? { name_ar: driver.fullNameAr, phone: driver.phone, truck_plate: driver.truckPlate, rating: driver.ratingAvg, last_geo: driver.lastGeo } : null, invoice: inv ? { id: inv.id, number: inv.number, total: inv.total, status: inv.status, paid_total: inv.paidTotal } : null, tracking: await this.repo.listTracking(id, 50) };
  }
  async list(u: AuthUser, q: { org_id?: string; as?: 'requester' | 'driver' | 'provider'; status?: TransportStatus[]; limit?: number }) {
    if (q.org_id && !membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (q.as === 'driver') return this.repo.list({ driverUserId: u.id, status: q.status, limit: q.limit ?? 50 });
    if (q.as === 'provider') { if (!q.org_id) throw new AppError('VALIDATION'); return this.repo.list({ providerOrgId: q.org_id, status: q.status, limit: q.limit ?? 50 }); }
    return this.repo.list({ requesterUserId: q.org_id ? undefined : u.id, requesterOrgId: q.org_id, status: q.status, limit: q.limit ?? 50 });
  }
  /** Driver-facing board: open jobs near where the driver currently is. */
  async offers(u: AuthUser, q: { radius_km?: number; type?: TransportType }) {
    const d = await this.repo.findDriver(u.id); if (!d) throw new AppError('FORBIDDEN', { messageAr: 'أكمل ملف السائق أولاً.', messageEn: 'Complete the driver profile first.' });
    if (!d.lastGeo) throw new AppError('CONFLICT', { messageAr: 'فعّل الموقع لعرض المهام القريبة.', messageEn: 'Enable location to see nearby jobs.' });
    return this.repo.listOffers(d.lastGeo, q.radius_km ?? 30, q.type ?? d.truckType ?? undefined, 50);
  }
  /** First driver to accept wins — the update is conditional on the job still being unassigned. */
  async accept(u: AuthUser, id: string, dto: AcceptDto) {
    const driver = await this.repo.findDriver(u.id); if (!driver) throw new AppError('FORBIDDEN', { messageAr: 'أكمل ملف السائق أولاً.', messageEn: 'Complete the driver profile first.' });
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (j.status !== 'requested' || j.driverUserId) throw new AppError('CONFLICT', { messageAr: 'أُسندت المهمة لسائق آخر.', messageEn: 'Job already assigned.' });
    await this.uow.run(async (tx) => {
      const fresh = await this.repo.findById(id, tx); if (!fresh || fresh.driverUserId || fresh.status !== 'requested') throw new AppError('CONFLICT', { messageAr: 'أُسندت المهمة لسائق آخر.', messageEn: 'Job already assigned.' });
      await this.repo.update(id, { status: 'assigned', driverUserId: u.id, providerOrgId: dto.org_id ?? driver.orgId ?? null, assignedAt: new Date() }, tx);
      await this.audit.write(tx, { action: 'transport.assign', entityType: 'transport_job', entityId: id, orgId: dto.org_id ?? driver.orgId ?? null, actorUserId: u.id, after: { driver: u.id } });
      await this.outbox.publish(tx, { eventType: 'TransportAssigned', aggregateType: 'transport_job', aggregateId: id, payload: { number: j.number, driverUserId: u.id, requesterUserId: j.requesterUserId, requesterOrgId: j.requesterOrgId, driverNameAr: driver.fullNameAr, truckPlate: driver.truckPlate } });
    });
    this.rt?.publish(`transport:${id}`, 'assigned', { job_id: id, driver_name: driver.fullNameAr, truck_plate: driver.truckPlate });
    return this.repo.findById(id);
  }
  /** Driver moves the job forward; the state machine is the only path. */
  async transition(u: AuthUser, id: string, dto: TransitionDto) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (!this.isDriver(j, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!canTransitionTransport(j.status, dto.to)) throw new AppError('CONFLICT', { messageAr: `لا يمكن الانتقال من ${j.status} إلى ${dto.to}.`, messageEn: `Illegal transport transition ${j.status} → ${dto.to}.` });
    const now = new Date();
    await this.uow.run(async (tx) => {
      await this.repo.update(id, { status: dto.to, ...(dto.to === 'picked_up' ? { pickedUpAt: now } : {}), ...(dto.note_ar ? { notesAr: dto.note_ar } : {}) }, tx);
      await this.audit.write(tx, { action: `transport.${dto.to}`, entityType: 'transport_job', entityId: id, orgId: j.providerOrgId, actorUserId: u.id, before: { status: j.status }, after: { status: dto.to, note: dto.note_ar ?? null } });
      await this.outbox.publish(tx, { eventType: 'TransportStatusChanged', aggregateType: 'transport_job', aggregateId: id, payload: { number: j.number, from: j.status, to: dto.to, requesterUserId: j.requesterUserId, requesterOrgId: j.requesterOrgId, driverUserId: j.driverUserId } });
    });
    this.rt?.publish(`transport:${id}`, 'status', { job_id: id, status: dto.to });
    return this.repo.findById(id);
  }
  /** High-volume ingestion: one point per driver per job at most every TRANSPORT_TRACK_MIN_SECONDS. */
  async track(u: AuthUser, id: string, dto: TrackDto) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (!this.isDriver(j, u)) throw new AppError('FORBIDDEN');
    if (!ACTIVE_TRANSPORT.includes(j.status)) throw new AppError('CONFLICT', { messageAr: 'المهمة منتهية.', messageEn: 'Job is not active.' });
    const minGap = this.config.get('TRANSPORT_TRACK_MIN_SECONDS') * 1000;
    const last = await this.repo.lastTrackingAt(id);
    if (last && Date.now() - last.getTime() < minGap) throw new AppError('RATE_LIMITED', { messageAr: 'معدّل إرسال المواقع مرتفع.', messageEn: 'Tracking rate exceeded.', details: { min_seconds: this.config.get('TRANSPORT_TRACK_MIN_SECONDS') } });
    const geo: GeoPoint = { lat: dto.lat, lng: dto.lng };
    await this.repo.addTracking(id, { geo, speedKmh: dto.speed_kmh ?? null, heading: dto.heading ?? null, recordedAt: dto.recorded_at ? new Date(dto.recorded_at) : undefined });
    await this.repo.setDriverOnline(u.id, true, geo);
    this.rt?.publish(`transport:${id}`, 'location', { job_id: id, ...geo, speed_kmh: dto.speed_kmh ?? null, at: new Date().toISOString() });
    return { ok: true };
  }
  /** Receiver's one-time code, sent when the driver is at the drop-off. */
  async requestProofOtp(u: AuthUser, id: string) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (!this.isDriver(j, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!['picked_up', 'en_route_dropoff'].includes(j.status)) throw new AppError('CONFLICT', { messageAr: 'اطلب الرمز عند الوصول لنقطة التسليم.', messageEn: 'Request the code at the drop-off.' });
    const receiver = j.requesterUserId ? await this.users.findById(j.requesterUserId) : null;
    const phone = receiver?.phone; if (!phone) throw new AppError('VALIDATION', { messageAr: 'لا يوجد رقم مستلم لإرسال الرمز.', messageEn: 'No receiver phone to send the code to.' });
    const recent = await this.otps.countRecent(phone, new Date(Date.now() - 10 * 60_000));
    if (recent >= this.config.get('OTP_MAX_REQUESTS_PER_10MIN')) throw new AppError('OTP_TOO_MANY');
    const code = this.hasher.randomDigits(6);
    await this.otps.create({ phone, purpose: 'accept_delivery', codeHash: this.hasher.sha256(`${phone}:${code}`), expiresAt: new Date(Date.now() + 900_000) });
    await this.uow.run((tx) => this.outbox.publish(tx, { eventType: 'TransportProofRequested', aggregateType: 'transport_job', aggregateId: id, payload: { number: j.number, requesterUserId: j.requesterUserId, code } }));
    return { sent_to: phone.replace(/^(\+9665\d)\d{5}(\d{2})$/, '$1*****$2'), expires_in: 900, debug_code: this.config.isProd ? undefined : code };
  }
  /** Proof of delivery: photo + the receiver's code. Only then does the job complete and the margin post. */
  async complete(u: AuthUser, id: string, dto: ProofDto) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (!this.isDriver(j, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!canTransitionTransport(j.status, 'delivered')) throw new AppError('CONFLICT', { messageAr: `لا يمكن إنهاء المهمة من ${j.status}.`, messageEn: `Cannot deliver from ${j.status}.` });
    const receiver = j.requesterUserId ? await this.users.findById(j.requesterUserId) : null;
    const phone = receiver?.phone; if (!phone) throw new AppError('VALIDATION');
    const ch = await this.otps.findLatestActive(phone, 'accept_delivery', new Date()); if (!ch) throw new AppError('OTP_EXPIRED');
    if (ch.codeHash !== this.hasher.sha256(`${phone}:${dto.code}`)) { await this.otps.incrementAttempts(ch.id); throw new AppError('OTP_INVALID'); }
    const now = new Date();
    await this.uow.run(async (tx) => {
      await this.otps.consume(ch.id);
      await this.repo.update(id, { status: 'delivered', deliveredAt: now, proofMediaId: dto.media_id, proofOtpVerified: true, finalPrice: j.quotedPrice ?? '0' }, tx);
      const fresh = (await this.repo.findById(id, tx))!;
      if (!canComplete(fresh)) throw new AppError('INTERNAL', { messageAr: 'إثبات التسليم غير مكتمل.', messageEn: 'Proof of delivery incomplete.' });
      if (j.vehicleId) await this.passport.record({ vehicleId: j.vehicleId, type: 'work_order', orgId: j.providerOrgId, refTable: 'transport_jobs', refId: id, summaryAr: `نقل بالسطحة ${j.number} — ${Money.of(j.distanceKm ?? '0').toString()} كم`, summaryEn: `Towed (${j.number})`, isPublic: true }, tx);
      await this.audit.write(tx, { action: 'transport.delivered', entityType: 'transport_job', entityId: id, orgId: j.providerOrgId, actorUserId: u.id, after: { proof_media: dto.media_id, otp_verified: true, final_price: j.quotedPrice, margin: j.platformMargin } });
      await this.outbox.publish(tx, { eventType: 'TransportDelivered', aggregateType: 'transport_job', aggregateId: id, payload: { number: j.number, requesterUserId: j.requesterUserId, requesterOrgId: j.requesterOrgId, driverUserId: j.driverUserId, providerOrgId: j.providerOrgId, price: j.quotedPrice, margin: j.platformMargin } });
    });
    this.rt?.publish(`transport:${id}`, 'delivered', { job_id: id });
    return this.repo.findById(id);
  }
  async cancel(u: AuthUser, id: string, dto: CancelDto) {
    const j = await this.repo.findById(id); if (!j) throw new AppError('NOT_FOUND');
    if (!this.isRequester(j, u) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!canTransitionTransport(j.status, 'cancelled')) throw new AppError('CONFLICT', { messageAr: 'لا يمكن الإلغاء بعد بدء النقل.', messageEn: `Cannot cancel from ${j.status}.` });
    await this.uow.run(async (tx) => { await this.repo.update(id, { status: 'cancelled', notesAr: dto.reason_ar }, tx); await this.audit.write(tx, { action: 'transport.cancel', entityType: 'transport_job', entityId: id, orgId: j.requesterOrgId, actorUserId: u.id, after: { reason: dto.reason_ar } }); await this.outbox.publish(tx, { eventType: 'TransportStatusChanged', aggregateType: 'transport_job', aggregateId: id, payload: { number: j.number, from: j.status, to: 'cancelled', requesterUserId: j.requesterUserId, requesterOrgId: j.requesterOrgId, driverUserId: j.driverUserId } }); });
    return this.repo.findById(id);
  }
  // ---- driver profile
  async upsertDriver(u: AuthUser, dto: DriverProfileDto) { if (dto.org_id && !membership(u, dto.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.repo.upsertDriver({ userId: u.id, orgId: dto.org_id ?? null, truckPlate: dto.truck_plate ?? null, truckType: (dto.truck_type as TransportType | undefined) ?? null }); }
  async me(u: AuthUser) { const d = await this.repo.findDriver(u.id); if (!d) throw new AppError('NOT_FOUND'); return d; }
  async setOnline(u: AuthUser, dto: OnlineDto) { if (!(await this.repo.findDriver(u.id))) throw new AppError('NOT_FOUND'); await this.repo.setDriverOnline(u.id, dto.online, dto.lat != null && dto.lng != null ? { lat: dto.lat, lng: dto.lng } : null); return this.repo.findDriver(u.id); }
  driversNear(u: AuthUser, q: { lat: number; lng: number; radius_km?: number; type?: TransportType }) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.repo.driversNear({ lat: q.lat, lng: q.lng }, q.radius_km ?? 30, q.type, 50); }
}
