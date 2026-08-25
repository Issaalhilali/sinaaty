import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { AppConfig } from '../../../config';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { PilotService } from '../../pilot/application/pilot.service';
import { VEHICLE_REPOSITORY, type VehicleRepository } from '../../vehicles/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../../work-orders/application/ports/realtime.port';
import { isRequestOpen, isRequester, offerBadges, sortOffers, whereText, type ServiceRequest } from '../domain/service-request';
import { SERVICE_REQUEST_REPOSITORY, type ServiceRequestRepository } from '../domain/repositories';
import type { AcceptOfferDto, CancelDto, CreateServiceRequestDto, SubmitOfferDto, WidenDto } from './dto/service-requests.dto';

const WRITE_ROLES = ['owner', 'manager', 'service_advisor', 'technician'];
const MATCH_LIMIT = 40;

/**
 * سوق طلبات الإصلاح (owner directive 2026-08-22): the customer posts the problem WITH their own search
 * radius; every active workshop inside it receives the request; workshops answer with a diagnosis, an
 * estimate (or an explicit «معاينة مجانية») and availability; the customer compares — price, rating,
 * distance as ready text, honest badges — and acceptance becomes a DRAFT work order. The final price
 * stays on the existing legal chain: inspection → items → request-approval → the customer's signature.
 */
@Injectable()
export class ServiceRequestsUseCases {
  constructor(
    @Inject(SERVICE_REQUEST_REPOSITORY) private readonly repo: ServiceRequestRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig,
    @Optional() private readonly pilot?: PilotService,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
  ) {}

  private async load(id: string) { const r = await this.repo.findById(id); if (!r) throw new AppError('NOT_FOUND'); return r; }
  private orgRole(u: AuthUser, orgId: string) { const m = membership(u, orgId); if (!m || !WRITE_ROLES.includes(m.role)) throw new AppError('FORBIDDEN'); }

  async create(u: AuthUser, dto: CreateServiceRequestDto) {
    if (this.pilot) await this.pilot.assertEnabled('service_marketplace', { orgId: u.id, orgType: null, zone: null });
    const v = await this.vehicles.findById(dto.vehicle_id);
    if (!v || (v.ownerUserId !== u.id && !(v.ownerOrgId && membership(u, v.ownerOrgId)))) throw new AppError('FORBIDDEN', { messageAr: 'هذه المركبة ليست ضمن سياراتك.', messageEn: 'This vehicle is not yours.' });
    const expiresAt = new Date(Date.now() + (dto.expires_minutes ?? this.config.get('SERVICE_REQUEST_MINUTES')) * 60_000);
    const req = await this.uow.run(async (tx) => {
      const number = await this.repo.nextNumber(tx);
      const r = await this.repo.create({ number, customerUserId: u.id, vehicleId: dto.vehicle_id, titleAr: dto.title_ar, descriptionAr: dto.description_ar ?? null, lat: dto.lat, lng: dto.lng, addressHint: dto.address_hint ?? null, radiusKm: dto.radius_km, preferredTime: dto.preferred_time, expiresAt }, tx);
      await this.repo.linkMedia(r.id, dto.media_ids, tx);
      await this.audit.write(tx, { action: 'service_request.create', entityType: 'service_request', entityId: r.id, actorUserId: u.id, after: { number, title: dto.title_ar, radius_km: dto.radius_km, preferred: dto.preferred_time } });
      return r;
    });
    const recipients = await this.notifyMatches(req, null);
    return { ...req, recipients_notified: recipients };
  }

  /** Match workshops inside the request's radius and notify only the ones not already reached. */
  private async notifyMatches(req: ServiceRequest, afterKm: number | null): Promise<number> {
    const matches = await this.repo.matchWorkshops(req.id, req.radiusKm, MATCH_LIMIT);
    const wanted = afterKm == null ? matches : matches.filter((m) => m.distanceKm == null || m.distanceKm > afterKm);
    const added = await this.uow.run(async (tx) => {
      const n = await this.repo.addRecipients(req.id, wanted, tx);
      if (n > 0) await this.outbox.publish(tx, { eventType: 'ServiceRequestOpened', aggregateType: 'service_request', aggregateId: req.id, payload: { number: req.number, titleAr: req.titleAr, preferredTime: req.preferredTime, orgIds: wanted.map((m) => m.orgId), customerUserId: req.customerUserId } });
      return n;
    });
    // ثم يُدقّ الباب: كل ورشة مطابقة تسمع الطلب على قناتها لحظتَه، لا حين تفتح التطبيق وتسحب
    // القائمة. الحمولة كاملة كي تُرسم البطاقة بلا نداء ثانٍ — الورشة تقرأ وتقبل، وهذا كل العمل.
    if (added > 0) {
      for (const m of wanted) {
        this.rt?.publish(`org:${m.orgId}`, 'service-request', {
          request_id: req.id, number: req.number, title_ar: req.titleAr,
          preferred_time: req.preferredTime, distance_km: m.distanceKm, created_at: req.createdAt,
        });
      }
    }
    return added;
  }

  listMine(u: AuthUser, limit = 30) { return this.repo.listMine(u.id, limit); }
  /** The workshop inbox. `org_id` is optional: with a single membership we derive it — a workshop
   *  should not have to know its own id to see its own requests (live-walk fix 2026-08-23). */
  async listNearby(u: AuthUser, orgId: string | undefined, limit = 30) {
    if (orgId) { this.orgRole(u, orgId); return this.repo.listNearbyForOrgs([orgId], limit); }
    // No org given: show the inbox of EVERY workshop this user works for — a manager of two branches
    // wants both, and nobody should need to know an id to see their own requests.
    const ids = this.writableOrgs(u);
    if (!ids.length) throw new AppError('FORBIDDEN', { messageAr: 'هذه القائمة للورش — لا منشأة مرتبطة بحسابك.', messageEn: 'This inbox is for workshops; your account has no organization.' });
    return this.repo.listNearbyForOrgs(ids, limit);
  }
  private writableOrgs(u: AuthUser): string[] { return u.orgs.filter((o) => WRITE_ROLES.includes(o.role)).map((o) => o.orgId); }

  async get(u: AuthUser, id: string) {
    const r = await this.load(id);
    const mine = isRequester(r, u.id);
    const memberOrgIds = u.orgs.map((o) => o.orgId);
    if (!mine && !isPlatformStaff(u) && !(await this.repo.isRecipient(id, memberOrgIds))) throw new AppError('FORBIDDEN');
    const views = await this.repo.listOfferViews(id);
    // The workshop sees the request and ITS OWN offer only — never the competitors' prices.
    const visible = mine || isPlatformStaff(u) ? views : views.filter((o) => memberOrgIds.includes(o.orgId));
    const sorted = sortOffers(visible.filter((o) => o.status !== 'withdrawn'));
    const badges = offerBadges(sorted);
    // The workshop prices a CAR, not a paragraph: make/model/year, mileage, and how often it has been
    // served — with no owner identity attached. Symmetry with the badges the customer sees about them.
    const vehicle = await this.repo.vehicleBriefOf(id);
    return {
      ...r, media_ids: await this.repo.listMediaIds(id),
      vehicle: vehicle ? { ...vehicle, label_ar: [vehicle.makeAr, vehicle.modelAr, vehicle.year].filter(Boolean).join(' ') || null, odometer_text: vehicle.odometerKm == null ? null : `${vehicle.odometerKm.toLocaleString('en-US')} كم`, history_text: vehicle.repairsCount === 0 ? 'أول زيارة عبر المنصة' : `${vehicle.repairsCount} إصلاحاً سابقاً` } : null,
      offers: sorted.map((o) => ({ ...o, where_text: whereText(o), badges: badges.get(o.id) ?? [] })),
      offers_count: mine ? sorted.filter((o) => o.status === 'submitted').length : undefined,
    };
  }

  /** Workshop answers — one live offer per org, updated in place (upsert), exactly like part bids. */
  async submitOffer(u: AuthUser, requestId: string, dto: SubmitOfferDto) {
    // The org is resolved from the REQUEST itself: of this user's workshops, the one(s) this request
    // actually reached. One → unambiguous. Several → the caller must say which (rare, honest).
    let orgId = dto.org_id;
    if (!orgId) {
      const reached = await this.repo.recipientsAmong(requestId, this.writableOrgs(u));
      if (reached.length === 1) orgId = reached[0]!;
      else if (!reached.length) throw new AppError('FORBIDDEN', { messageAr: 'الطلب خارج نطاق منشأتك.', messageEn: 'This request is outside your range.' });
      else throw new AppError('VALIDATION', { messageAr: 'حدد المنشأة التي تقدّم العرض باسمها.', messageEn: 'Pass org_id — more than one of your organizations received this request.' });
    }
    this.orgRole(u, orgId);
    const r = await this.load(requestId);
    if (!isRequestOpen(r)) throw new AppError('CONFLICT', { messageAr: 'الطلب لم يعد مفتوحاً.', messageEn: 'The request is no longer open.' });
    if (!(await this.repo.isRecipient(requestId, [orgId]))) throw new AppError('FORBIDDEN', { messageAr: 'الطلب خارج نطاق منشأتك.', messageEn: 'This request is outside your range.' });
    const offer = await this.uow.run(async (tx) => {
      const o = await this.repo.upsertOffer({ requestId, orgId, offerType: dto.offer_type, diagnosisAr: dto.diagnosis_ar ?? null, priceMin: dto.price_min ?? null, priceMax: dto.price_max ?? null, availability: dto.availability, availableAt: dto.available_at ? new Date(dto.available_at) : null, etaNoteAr: dto.eta_note_ar ?? null, createdBy: u.id }, tx);
      await this.audit.write(tx, { action: 'service_offer.submit', entityType: 'service_offer', entityId: o.id, orgId, actorUserId: u.id, after: { request: r.number, type: dto.offer_type, price_min: dto.price_min ?? null, availability: dto.availability } });
      await this.outbox.publish(tx, { eventType: 'ServiceOfferSubmitted', aggregateType: 'service_request', aggregateId: requestId, payload: { number: r.number, titleAr: r.titleAr, customerUserId: r.customerUserId, orgId, offerId: o.id, offerType: dto.offer_type, priceMin: dto.price_min ?? null } });
      return o;
    });
    this.rt?.publish(`service-request:${requestId}`, 'offer', { request_id: requestId, offer_id: offer.id });
    return offer;
  }

  /** Acceptance = a DRAFT work order at the winning workshop, in the same transaction. */
  async accept(u: AuthUser, requestId: string, dto: AcceptOfferDto) {
    const r = await this.load(requestId);
    if (!isRequester(r, u.id)) throw new AppError('FORBIDDEN');
    if (!isRequestOpen(r)) throw new AppError('CONFLICT', { messageAr: 'الطلب لم يعد مفتوحاً.', messageEn: 'The request is no longer open.' });
    const offer = await this.repo.findOffer(dto.offer_id);
    if (!offer || offer.requestId !== requestId || offer.status !== 'submitted') throw new AppError('CONFLICT', { messageAr: 'العرض لم يعد قائماً.', messageEn: 'The offer is no longer live.' });
    if (!r.vehicleId) throw new AppError('VALIDATION', { messageAr: 'الطلب بلا مركبة.', messageEn: 'Request has no vehicle.' });
    const result = await this.uow.run(async (tx) => {
      const number = await this.workOrders.nextNumber(tx);
      const wo = await this.workOrders.create({ number, orgId: offer.orgId, vehicleId: r.vehicleId!, customerUserId: r.customerUserId, paymentTerms: 'on_delivery', titleAr: r.titleAr, complaintAr: r.descriptionAr ?? r.titleAr, createdBy: u.id }, tx);
      await this.repo.setOfferStatus(offer.id, 'accepted', tx);
      const lost = await this.repo.markOthersLost(requestId, offer.id, tx);
      await this.repo.update(requestId, { status: 'accepted', acceptedOfferId: offer.id, workOrderId: wo.id }, tx);
      await this.audit.write(tx, { action: 'service_request.accept', entityType: 'service_request', entityId: requestId, orgId: offer.orgId, actorUserId: u.id, after: { offer: offer.id, work_order: wo.number, lost } });
      await this.outbox.publish(tx, { eventType: 'ServiceRequestAccepted', aggregateType: 'service_request', aggregateId: requestId, payload: { number: r.number, orgId: offer.orgId, customerUserId: r.customerUserId, workOrderId: wo.id, workOrderNumber: wo.number } });
      return { wo, lost };
    });
    this.rt?.publish(`service-request:${requestId}`, 'accepted', { request_id: requestId, offer_id: offer.id, work_order_id: result.wo.id });
    // work_order_id rides top-level too — the mobile contract lands on it directly.
    return { request_id: requestId, accepted_offer_id: offer.id, work_order_id: result.wo.id, work_order: { id: result.wo.id, number: result.wo.number, status: result.wo.status } };
  }

  /** «وسّع النطاق» — one tap when the market is quiet; notifies only the workshops newly in range. */
  async widen(u: AuthUser, requestId: string, dto: WidenDto) {
    const r = await this.load(requestId);
    if (!isRequester(r, u.id)) throw new AppError('FORBIDDEN');
    if (!isRequestOpen(r)) throw new AppError('CONFLICT');
    if (dto.radius_km <= r.radiusKm) throw new AppError('VALIDATION', { messageAr: 'النطاق الجديد يجب أن يكون أوسع من الحالي.', messageEn: 'The new radius must be wider than the current one.' });
    const before = r.radiusKm;
    await this.uow.run(async (tx) => {
      await this.repo.update(requestId, { radiusKm: dto.radius_km }, tx);
      await this.audit.write(tx, { action: 'service_request.widen', entityType: 'service_request', entityId: requestId, actorUserId: u.id, before: { radius_km: before }, after: { radius_km: dto.radius_km } });
    });
    const added = await this.notifyMatches({ ...r, radiusKm: dto.radius_km }, before);
    this.rt?.publish(`service-request:${requestId}`, 'widened', { request_id: requestId, radius_km: dto.radius_km, newly_notified: added });
    return { request_id: requestId, radius_km: dto.radius_km, newly_notified: added };
  }

  async cancel(u: AuthUser, requestId: string, dto: CancelDto) {
    const r = await this.load(requestId);
    if (!isRequester(r, u.id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    if (!isRequestOpen(r)) throw new AppError('CONFLICT');
    await this.uow.run(async (tx) => {
      await this.repo.update(requestId, { status: 'cancelled' }, tx);
      await this.audit.write(tx, { action: 'service_request.cancel', entityType: 'service_request', entityId: requestId, actorUserId: u.id, after: { reason: dto.reason_ar ?? null } });
    });
    this.rt?.publish(`service-request:${requestId}`, 'cancelled', { request_id: requestId });
    return { request_id: requestId, status: 'cancelled' };
  }

  /** Scheduler: expire quiet requests so workshop inboxes never rot. */
  async expireDue() { const n = await this.repo.expireDue(new Date()); return { expired: n }; }

  /** «السوق هادئ؟» — a request past half its window with fewer than two offers nudges its customer to
   *  widen the radius in one tap. Fired once per request (half-window crossing + notification dedupe). */
  async nudgeQuiet(withinMinutes = 11) {
    const quiet = await this.repo.listQuietSinceHalfWindow(new Date(), withinMinutes);
    for (const q of quiet) {
      await this.uow.run((tx) => this.outbox.publish(tx, { eventType: 'ServiceRequestQuiet', aggregateType: 'service_request', aggregateId: q.id, payload: { number: q.number, titleAr: q.titleAr, customerUserId: q.customerUserId, radiusKm: q.radiusKm, offers: q.offers } }));
    }
    return { nudged: quiet.length };
  }
}
