import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TransportType } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { DriverProfile, GeoPoint, TrackingPoint, TransportJob } from '../../domain/transport';
import type { TransportRepository } from '../../domain/repositories';
const d = (v: Prisma.Decimal | null | undefined) => (v == null ? null : v.toFixed(2)); const D = (v: string) => new Prisma.Decimal(v);
/** Geography columns are Unsupported in Prisma → every read projects lat/lng, every write goes through raw SQL. */
type JobRow = Omit<Prisma.TransportJobGetPayload<Record<string, never>>, 'pickupGeo' | 'dropoffGeo'> & { pickup_lat: number; pickup_lng: number; dropoff_lat: number; dropoff_lng: number };
const toJob = (r: JobRow): TransportJob => ({ id: r.id, number: r.number, type: r.type, status: r.status, requesterUserId: r.requesterUserId, requesterOrgId: r.requesterOrgId, providerOrgId: r.providerOrgId, driverUserId: r.driverUserId, vehicleId: r.vehicleId, workOrderId: r.workOrderId, partOrderId: r.partOrderId, pickup: { lat: r.pickup_lat, lng: r.pickup_lng }, pickupAddress: r.pickupAddress, dropoff: { lat: r.dropoff_lat, lng: r.dropoff_lng }, dropoffAddress: r.dropoffAddress, distanceKm: d(r.distanceKm), quotedPrice: d(r.quotedPrice), finalPrice: d(r.finalPrice), platformMargin: d(r.platformMargin) ?? '0.00', scheduledAt: r.scheduledAt, assignedAt: r.assignedAt, pickedUpAt: r.pickedUpAt, deliveredAt: r.deliveredAt, proofMediaId: r.proofMediaId, proofOtpVerified: r.proofOtpVerified, notesAr: r.notesAr, createdAt: r.createdAt });
// Geography columns cannot be deserialized by Prisma, so every raw query lists columns explicitly and
// projects the points as lat/lng floats instead of selecting `*`.
const COLS = Prisma.raw('id, number, type::text AS type, status::text AS status, requester_user_id, requester_org_id, provider_org_id, driver_user_id, vehicle_id, work_order_id, part_order_id, pickup_address, dropoff_address, distance_km, quoted_price, final_price, platform_margin, scheduled_at, assigned_at, picked_up_at, delivered_at, proof_media_id, proof_otp_verified, notes_ar, created_at, updated_at');
const POINTS = Prisma.raw('ST_Y(pickup_geo::geometry) AS pickup_lat, ST_X(pickup_geo::geometry) AS pickup_lng, ST_Y(dropoff_geo::geometry) AS dropoff_lat, ST_X(dropoff_geo::geometry) AS dropoff_lng');
const SELECT = Prisma.sql`SELECT ${COLS}, ${POINTS} FROM transport_jobs j`;
type RawJob = Record<string, unknown>;
const camel = (r: RawJob): JobRow => ({ id: r['id'], number: r['number'], type: r['type'], status: r['status'], requesterUserId: r['requester_user_id'], requesterOrgId: r['requester_org_id'], providerOrgId: r['provider_org_id'], driverUserId: r['driver_user_id'], vehicleId: r['vehicle_id'], workOrderId: r['work_order_id'], partOrderId: r['part_order_id'], pickupAddress: r['pickup_address'], dropoffAddress: r['dropoff_address'], distanceKm: r['distance_km'], quotedPrice: r['quoted_price'], finalPrice: r['final_price'], platformMargin: r['platform_margin'], scheduledAt: r['scheduled_at'], assignedAt: r['assigned_at'], pickedUpAt: r['picked_up_at'], deliveredAt: r['delivered_at'], proofMediaId: r['proof_media_id'], proofOtpVerified: r['proof_otp_verified'], notesAr: r['notes_ar'], createdAt: r['created_at'], updatedAt: r['updated_at'], pickup_lat: Number(r['pickup_lat']), pickup_lng: Number(r['pickup_lng']), dropoff_lat: Number(r['dropoff_lat']), dropoff_lng: Number(r['dropoff_lng']) } as unknown as JobRow);

@Injectable()
export class TransportPrismaRepository implements TransportRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }
  async receiverPhoneOf(jobId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ phone: string | null }>>`
      SELECT COALESCE(bu.phone_e164, ou.phone_e164, ru.phone_e164) AS phone
      FROM transport_jobs j
      LEFT JOIN part_orders po ON po.id = j.part_order_id
      LEFT JOIN users bu ON bu.id = po.buyer_user_id
      LEFT JOIN LATERAL (
        SELECT u.phone_e164 FROM organization_members m JOIN users u ON u.id = m.user_id
        WHERE m.org_id = po.buyer_org_id AND m.is_active AND m.role = 'owner' LIMIT 1
      ) ou ON true
      LEFT JOIN users ru ON ru.id = j.requester_user_id
      WHERE j.id = ${jobId}::uuid`;
    return rows[0]?.phone ?? null;
  }
  async nextNumber(tx?: TxHandle) { const r = await this.db(tx).$queryRaw<Array<{ n: string }>>`SELECT next_number('TJ') AS n`; return r[0]!.n; }
  async create(j: Parameters<TransportRepository['create']>[0], tx?: TxHandle) {
    const db = this.db(tx);
    const rows = await db.$queryRaw<RawJob[]>`
      INSERT INTO transport_jobs (number, type, requester_user_id, requester_org_id, vehicle_id, work_order_id, part_order_id, pickup_geo, pickup_address, dropoff_geo, dropoff_address, distance_km, quoted_price, platform_margin, scheduled_at, notes_ar)
      VALUES (${j.number}, ${j.type}::transport_type, ${j.requesterUserId}::uuid, ${j.requesterOrgId}::uuid, ${j.vehicleId}::uuid, ${j.workOrderId}::uuid, ${j.partOrderId}::uuid,
              ST_SetSRID(ST_MakePoint(${j.pickup.lng}, ${j.pickup.lat}), 4326)::geography, ${j.pickupAddress},
              ST_SetSRID(ST_MakePoint(${j.dropoff.lng}, ${j.dropoff.lat}), 4326)::geography, ${j.dropoffAddress},
              ${D(j.distanceKm)}, ${D(j.quotedPrice)}, ${D(j.platformMargin)}, ${j.scheduledAt}, ${j.notesAr})
      RETURNING ${COLS}, ${POINTS}`;
    return toJob(camel(rows[0]!));
  }
  async findById(id: string, tx?: TxHandle) { const rows = await this.db(tx).$queryRaw<RawJob[]>`${SELECT} WHERE j.id = ${id}::uuid`; return rows[0] ? toJob(camel(rows[0])) : null; }
  async list(q: Parameters<TransportRepository['list']>[0]) {
    const statuses: string[] = q.status ?? [];
    const rows = await this.prisma.$queryRaw<RawJob[]>`${SELECT}
      WHERE (${q.requesterUserId ?? null}::uuid IS NULL OR j.requester_user_id = ${q.requesterUserId ?? null}::uuid)
        AND (${q.requesterOrgId ?? null}::uuid IS NULL OR j.requester_org_id = ${q.requesterOrgId ?? null}::uuid)
        AND (${q.providerOrgId ?? null}::uuid IS NULL OR j.provider_org_id = ${q.providerOrgId ?? null}::uuid)
        AND (${q.driverUserId ?? null}::uuid IS NULL OR j.driver_user_id = ${q.driverUserId ?? null}::uuid)
        AND (${statuses.length === 0} OR j.status::text = ANY(${statuses}::text[]))
      ORDER BY j.created_at DESC LIMIT ${q.limit}`;
    return rows.map((r) => toJob(camel(r)));
  }
  async listOffers(near: GeoPoint, radiusKm: number, type: TransportType | undefined, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<RawJob & { pickup_distance_km: number | null }>>`
      ${SELECT} WHERE j.status = 'requested' AND j.driver_user_id IS NULL
        AND (${type ?? null}::text IS NULL OR j.type::text = ${type ?? null})
        AND ST_DWithin(j.pickup_geo, ST_SetSRID(ST_MakePoint(${near.lng}, ${near.lat}), 4326)::geography, ${radiusKm * 1000})
      ORDER BY ST_Distance(j.pickup_geo, ST_SetSRID(ST_MakePoint(${near.lng}, ${near.lat}), 4326)::geography) ASC LIMIT ${limit}`;
    return rows.map((r) => ({ ...toJob(camel(r)), pickupDistanceKm: null }));
  }
  async update(id: string, p: Parameters<TransportRepository['update']>[1], tx?: TxHandle) {
    await this.db(tx).transportJob.update({ where: { id }, data: { status: p.status, providerOrgId: p.providerOrgId === undefined ? undefined : p.providerOrgId, driverUserId: p.driverUserId === undefined ? undefined : p.driverUserId, finalPrice: p.finalPrice ? D(p.finalPrice) : undefined, assignedAt: p.assignedAt, pickedUpAt: p.pickedUpAt, deliveredAt: p.deliveredAt, proofMediaId: p.proofMediaId, proofOtpVerified: p.proofOtpVerified, notesAr: p.notesAr } });
  }
  async addTracking(jobId: string, p: { geo: GeoPoint; speedKmh?: number | null; heading?: number | null; recordedAt?: Date }) {
    await this.prisma.$executeRaw`INSERT INTO transport_tracking (job_id, geo, speed_kmh, heading, recorded_at)
      VALUES (${jobId}::uuid, ST_SetSRID(ST_MakePoint(${p.geo.lng}, ${p.geo.lat}), 4326)::geography, ${p.speedKmh ?? null}, ${p.heading ?? null}, ${p.recordedAt ?? new Date()})`;
  }
  async listTracking(jobId: string, limit: number): Promise<TrackingPoint[]> {
    const rows = await this.prisma.$queryRaw<Array<{ lat: number; lng: number; speed_kmh: Prisma.Decimal | null; heading: number | null; recorded_at: Date }>>`
      SELECT ST_Y(geo::geometry) AS lat, ST_X(geo::geometry) AS lng, speed_kmh, heading, recorded_at FROM transport_tracking WHERE job_id = ${jobId}::uuid ORDER BY recorded_at DESC LIMIT ${limit}`;
    return rows.map((r) => ({ geo: { lat: Number(r.lat), lng: Number(r.lng) }, speedKmh: r.speed_kmh == null ? null : r.speed_kmh.toFixed(1), heading: r.heading, recordedAt: r.recorded_at }));
  }
  async lastTrackingAt(jobId: string) { const r = await this.prisma.$queryRaw<Array<{ t: Date | null }>>`SELECT MAX(recorded_at) AS t FROM transport_tracking WHERE job_id = ${jobId}::uuid`; return r[0]?.t ?? null; }
  async upsertDriver(x: Parameters<TransportRepository['upsertDriver']>[0], tx?: TxHandle) {
    const db = this.db(tx);
    await db.driverProfile.upsert({ where: { userId: x.userId }, update: { orgId: x.orgId ?? undefined, truckPlate: x.truckPlate ?? undefined, truckType: x.truckType ?? undefined }, create: { userId: x.userId, orgId: x.orgId ?? undefined, truckPlate: x.truckPlate ?? undefined, truckType: x.truckType ?? undefined } });
    return (await this.findDriver(x.userId))!;
  }
  async findDriver(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ user_id: string; org_id: string | null; truck_plate: string | null; truck_type: TransportType | null; is_online: boolean; lat: number | null; lng: number | null; last_geo_at: Date | null; rating_avg: Prisma.Decimal; full_name_ar: string | null; phone_e164: string | null }>>`
      SELECT p.user_id, p.org_id, p.truck_plate, p.truck_type, p.is_online, ST_Y(p.last_geo::geometry) AS lat, ST_X(p.last_geo::geometry) AS lng, p.last_geo_at, p.rating_avg, u.full_name_ar, u.phone_e164
      FROM driver_profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ${userId}::uuid`;
    const r = rows[0]; if (!r) return null;
    return { userId: r.user_id, orgId: r.org_id, truckPlate: r.truck_plate, truckType: r.truck_type, isOnline: r.is_online, lastGeo: r.lat == null ? null : { lat: Number(r.lat), lng: Number(r.lng) }, lastGeoAt: r.last_geo_at, ratingAvg: r.rating_avg.toFixed(2), fullNameAr: r.full_name_ar, phone: r.phone_e164 } satisfies DriverProfile;
  }
  async setDriverOnline(userId: string, online: boolean, geo?: GeoPoint | null) {
    if (geo) await this.prisma.$executeRaw`UPDATE driver_profiles SET is_online = ${online}, last_geo = ST_SetSRID(ST_MakePoint(${geo.lng}, ${geo.lat}), 4326)::geography, last_geo_at = now() WHERE user_id = ${userId}::uuid`;
    else await this.prisma.$executeRaw`UPDATE driver_profiles SET is_online = ${online} WHERE user_id = ${userId}::uuid`;
  }
  async driversNear(point: GeoPoint, radiusKm: number, type: TransportType | undefined, limit: number) {
    const rows = await this.prisma.$queryRaw<Array<{ user_id: string; org_id: string | null; truck_plate: string | null; truck_type: TransportType | null; is_online: boolean; lat: number | null; lng: number | null; last_geo_at: Date | null; rating_avg: Prisma.Decimal; full_name_ar: string | null; phone_e164: string | null; distance_km: number | null }>>`
      SELECT p.user_id, p.org_id, p.truck_plate, p.truck_type, p.is_online, ST_Y(p.last_geo::geometry) AS lat, ST_X(p.last_geo::geometry) AS lng, p.last_geo_at, p.rating_avg, u.full_name_ar, u.phone_e164,
             (ST_Distance(p.last_geo, ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography) / 1000.0)::float AS distance_km
      FROM driver_profiles p JOIN users u ON u.id = p.user_id
      WHERE p.is_online AND p.last_geo IS NOT NULL AND (${type ?? null}::text IS NULL OR p.truck_type::text = ${type ?? null})
        AND ST_DWithin(p.last_geo, ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography, ${radiusKm * 1000})
      ORDER BY distance_km ASC LIMIT ${limit}`;
    return rows.map((r) => ({ userId: r.user_id, orgId: r.org_id, truckPlate: r.truck_plate, truckType: r.truck_type, isOnline: r.is_online, lastGeo: r.lat == null ? null : { lat: Number(r.lat), lng: Number(r.lng) }, lastGeoAt: r.last_geo_at, ratingAvg: r.rating_avg.toFixed(2), fullNameAr: r.full_name_ar, phone: r.phone_e164, distanceKm: r.distance_km == null ? null : Math.round(r.distance_km * 100) / 100 }));
  }
}
