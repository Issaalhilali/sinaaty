import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { ServiceRequestRepository } from '../../domain/repositories';
import type { OfferView, ServiceOffer, ServiceRequest } from '../../domain/service-request';

const WORKSHOP_TYPES = ['workshop', 'service_center', 'body_shop'];
const d2 = (v: Prisma.Decimal | null) => (v == null ? null : v.toFixed(2));

// geography columns are never SELECT * — projected as lat/lng (same rule as logistics).
interface ReqRow { id: string; number: string; customer_user_id: string; vehicle_id: string | null; title_ar: string; description_ar: string | null; lat: number; lng: number; address_hint: string | null; radius_km: number; preferred_time: string; status: string; accepted_offer_id: string | null; work_order_id: string | null; expires_at: Date; created_at: Date }
const toReq = (r: ReqRow): ServiceRequest => ({ id: r.id, number: r.number, customerUserId: r.customer_user_id, vehicleId: r.vehicle_id, titleAr: r.title_ar, descriptionAr: r.description_ar, lat: Number(r.lat), lng: Number(r.lng), addressHint: r.address_hint, radiusKm: r.radius_km, preferredTime: r.preferred_time as ServiceRequest['preferredTime'], status: r.status as ServiceRequest['status'], acceptedOfferId: r.accepted_offer_id, workOrderId: r.work_order_id, expiresAt: r.expires_at, createdAt: r.created_at });
const REQ_COLS = Prisma.sql`id, number, customer_user_id, vehicle_id, title_ar, description_ar, ST_Y(geo::geometry) AS lat, ST_X(geo::geometry) AS lng, address_hint, radius_km, preferred_time, status, accepted_offer_id, work_order_id, expires_at, created_at`;

type OfferRow = Prisma.ServiceOfferGetPayload<Record<string, never>>;
const toOffer = (o: OfferRow): ServiceOffer => ({ id: o.id, requestId: o.requestId, orgId: o.orgId, offerType: o.offerType as ServiceOffer['offerType'], diagnosisAr: o.diagnosisAr, priceMin: d2(o.priceMin), priceMax: d2(o.priceMax), availability: o.availability as ServiceOffer['availability'], availableAt: o.availableAt, etaNoteAr: o.etaNoteAr, status: o.status as ServiceOffer['status'], createdBy: o.createdBy, createdAt: o.createdAt, updatedAt: o.updatedAt });

@Injectable()
export class ServiceRequestsPrismaRepository implements ServiceRequestRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  async nextNumber(tx?: TxHandle) { const r = await this.db(tx).$queryRaw<Array<{ n: string }>>`SELECT next_number('SR') AS n`; return r[0]!.n; }

  async create(x: Parameters<ServiceRequestRepository['create']>[0], tx?: TxHandle) {
    const rows = await this.db(tx).$queryRaw<ReqRow[]>`
      INSERT INTO service_requests (number, customer_user_id, vehicle_id, title_ar, description_ar, geo, address_hint, radius_km, preferred_time, expires_at)
      VALUES (${x.number}, ${x.customerUserId}::uuid, ${x.vehicleId}::uuid, ${x.titleAr}, ${x.descriptionAr},
              ST_SetSRID(ST_MakePoint(${x.lng}, ${x.lat}), 4326)::geography, ${x.addressHint}, ${x.radiusKm}, ${x.preferredTime}, ${x.expiresAt})
      RETURNING ${REQ_COLS}`;
    return toReq(rows[0]!);
  }
  async findById(id: string, tx?: TxHandle) { const rows = await this.db(tx).$queryRaw<ReqRow[]>`SELECT ${REQ_COLS} FROM service_requests WHERE id = ${id}::uuid`; return rows[0] ? toReq(rows[0]) : null; }
  async listMine(customerUserId: string, limit: number) { const rows = await this.prisma.$queryRaw<ReqRow[]>`SELECT ${REQ_COLS} FROM service_requests WHERE customer_user_id = ${customerUserId}::uuid ORDER BY created_at DESC LIMIT ${limit}`; return rows.map(toReq); }

  async listNearbyForOrg(orgId: string, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<ReqRow & { distance_km: number | null; my_offer_id: string | null }>>`
      SELECT r.id, r.number, r.customer_user_id, r.vehicle_id, r.title_ar, r.description_ar,
             ST_Y(r.geo::geometry) AS lat, ST_X(r.geo::geometry) AS lng, r.address_hint, r.radius_km,
             r.preferred_time, r.status, r.accepted_offer_id, r.work_order_id, r.expires_at, r.created_at,
             rec.distance_km::float AS distance_km, o.id AS my_offer_id
      FROM service_requests r
      JOIN service_request_recipients rec ON rec.request_id = r.id AND rec.org_id = ${orgId}::uuid
      LEFT JOIN service_offers o ON o.request_id = r.id AND o.org_id = ${orgId}::uuid
      WHERE r.status = 'open' AND r.expires_at > now()
      ORDER BY r.created_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({ ...toReq(r), distanceKm: r.distance_km == null ? null : Math.round(r.distance_km * 10) / 10, myOfferId: r.my_offer_id }));
  }

  async update(id: string, p: Parameters<ServiceRequestRepository['update']>[1], tx?: TxHandle) {
    await this.db(tx).serviceRequest.update({ where: { id }, data: { status: p.status, acceptedOfferId: p.acceptedOfferId, workOrderId: p.workOrderId, radiusKm: p.radiusKm, expiresAt: p.expiresAt } });
  }
  async expireDue(now: Date) { const r = await this.prisma.serviceRequest.updateMany({ where: { status: 'open', expiresAt: { lt: now } }, data: { status: 'expired' } }); return r.count; }

  async matchWorkshops(requestId: string, radiusKm: number, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<{ org_id: string; distance_km: number | null }>>`
      SELECT o.id AS org_id, MIN(ST_Distance(l.geo, r.geo) / 1000.0)::float AS distance_km
      FROM service_requests r
      CROSS JOIN organizations o
      JOIN organization_locations l ON l.org_id = o.id
      WHERE r.id = ${requestId}::uuid AND o.status = 'active' AND o.type::text = ANY(${WORKSHOP_TYPES}::text[])
        AND l.geo IS NOT NULL AND ST_DWithin(l.geo, r.geo, ${radiusKm * 1000})
      GROUP BY o.id ORDER BY distance_km ASC LIMIT ${limit}`;
    return rows.map((r) => ({ orgId: r.org_id, distanceKm: r.distance_km == null ? null : Math.round(r.distance_km * 100) / 100 }));
  }
  async addRecipients(requestId: string, rows: Array<{ orgId: string; distanceKm: number | null }>, tx?: TxHandle) {
    if (!rows.length) return 0;
    const r = await this.db(tx).serviceRequestRecipient.createMany({ data: rows.map((x) => ({ requestId, orgId: x.orgId, distanceKm: x.distanceKm == null ? null : new Prisma.Decimal(x.distanceKm) })), skipDuplicates: true });
    return r.count;
  }
  async findRecipient(requestId: string, orgId: string) { const r = await this.prisma.serviceRequestRecipient.findUnique({ where: { requestId_orgId: { requestId, orgId } } }); return r ? { orgId: r.orgId, distanceKm: r.distanceKm == null ? null : r.distanceKm.toFixed(1) } : null; }
  async isRecipient(requestId: string, orgIds: string[]) { if (!orgIds.length) return false; return (await this.prisma.serviceRequestRecipient.count({ where: { requestId, orgId: { in: orgIds } } })) > 0; }

  async upsertOffer(o: Parameters<ServiceRequestRepository['upsertOffer']>[0], tx?: TxHandle) {
    const data = { offerType: o.offerType, diagnosisAr: o.diagnosisAr, priceMin: o.priceMin == null ? null : new Prisma.Decimal(o.priceMin), priceMax: o.priceMax == null ? null : new Prisma.Decimal(o.priceMax), availability: o.availability, availableAt: o.availableAt, etaNoteAr: o.etaNoteAr, status: 'submitted', createdBy: o.createdBy };
    const r = await this.db(tx).serviceOffer.upsert({ where: { requestId_orgId: { requestId: o.requestId, orgId: o.orgId } }, update: data, create: { requestId: o.requestId, orgId: o.orgId, ...data } });
    return toOffer(r);
  }
  async findOffer(id: string, tx?: TxHandle) { const r = await this.db(tx).serviceOffer.findUnique({ where: { id } }); return r ? toOffer(r) : null; }

  async listOfferViews(requestId: string): Promise<OfferView[]> {
    const rows = await this.prisma.$queryRaw<Array<OfferRowSql>>`
      SELECT o.id, o.request_id, o.org_id, o.offer_type, o.diagnosis_ar, o.price_min::text, o.price_max::text,
             o.availability, o.available_at, o.eta_note_ar, o.status, o.created_by, o.created_at, o.updated_at,
             org.trade_name_ar, org.legal_name_ar, org.rating_avg::text AS rating_avg, org.rating_count,
             l.city, l.district, (ST_Distance(l.geo, r.geo) / 1000.0)::float AS distance_km,
             EXISTS (SELECT 1 FROM work_orders w WHERE w.org_id = o.org_id AND w.customer_user_id = r.customer_user_id AND w.id IS DISTINCT FROM r.work_order_id) AS previously_used
      FROM service_offers o
      JOIN service_requests r ON r.id = o.request_id
      JOIN organizations org ON org.id = o.org_id
      LEFT JOIN organization_locations l ON l.org_id = o.org_id AND l.is_primary = true
      WHERE o.request_id = ${requestId}::uuid
      ORDER BY o.created_at ASC`;
    return rows.map((x) => ({
      id: x.id, requestId: x.request_id, orgId: x.org_id, offerType: x.offer_type as OfferView['offerType'], diagnosisAr: x.diagnosis_ar,
      priceMin: x.price_min, priceMax: x.price_max, availability: x.availability as OfferView['availability'], availableAt: x.available_at, etaNoteAr: x.eta_note_ar,
      status: x.status as OfferView['status'], createdBy: x.created_by, createdAt: x.created_at, updatedAt: x.updated_at,
      orgNameAr: x.trade_name_ar ?? x.legal_name_ar, ratingAvg: Number(x.rating_avg ?? 0).toFixed(2), ratingCount: x.rating_count,
      city: x.city, district: x.district, distanceKm: x.distance_km == null ? null : Math.round(x.distance_km * 10) / 10,
      previouslyUsed: x.previously_used,
    }));
  }
  async setOfferStatus(id: string, status: ServiceOffer['status'], tx?: TxHandle) { await this.db(tx).serviceOffer.update({ where: { id }, data: { status } }); }
  async markOthersLost(requestId: string, acceptedOfferId: string, tx?: TxHandle) { const r = await this.db(tx).serviceOffer.updateMany({ where: { requestId, id: { not: acceptedOfferId }, status: 'submitted' }, data: { status: 'lost' } }); return r.count; }

  async linkMedia(requestId: string, mediaIds: string[], tx?: TxHandle) {
    if (!mediaIds.length) return 0;
    const r = await this.db(tx).mediaLink.createMany({ data: mediaIds.map((mediaId) => ({ mediaId, entityType: 'service_request', entityId: requestId, label: 'problem' })), skipDuplicates: true });
    return r.count;
  }
  async listMediaIds(requestId: string) { const rows = await this.prisma.mediaLink.findMany({ where: { entityType: 'service_request', entityId: requestId }, select: { mediaId: true } }); return rows.map((r) => r.mediaId); }
}

interface OfferRowSql { id: string; request_id: string; org_id: string; offer_type: string; diagnosis_ar: string | null; price_min: string | null; price_max: string | null; availability: string; available_at: Date | null; eta_note_ar: string | null; status: string; created_by: string | null; created_at: Date; updated_at: Date; trade_name_ar: string | null; legal_name_ar: string; rating_avg: string | null; rating_count: number; city: string | null; district: string | null; distance_km: number | null; previously_used: boolean }
