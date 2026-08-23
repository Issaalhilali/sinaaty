import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { AnalyticsEventInput, FunnelRow, PilotRepository, ZoneRow } from '../../domain/repositories';

@Injectable()
export class PilotPrismaRepository implements PilotRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  async record(e: AnalyticsEventInput, tx?: TxHandle): Promise<void> {
    // ON CONFLICT DO NOTHING: the outbox may replay an event; the funnel must not count it twice.
    await this.db(tx).analyticsEvent.createMany({
      data: [{
        event: e.event, orgId: e.orgId ?? null, actorUserId: e.actorUserId ?? null,
        entityType: e.entityType ?? null, entityId: e.entityId ?? null, industrialZone: e.industrialZone ?? null,
        occurredAt: e.occurredAt ?? new Date(), props: (e.props ?? {}) as Prisma.InputJsonValue,
      }],
      skipDuplicates: true,
    });
  }

  async serviceCohort(q: { from: Date; to: Date; zone?: string }) {
    // الفوج يُعرَّف من الأحداث (ليبقى مرشَّح المنطقة عاملاً)، ومراحله تُحلّ من الجداول المصدر —
    // فلا تعتمد مرحلة على تاريخ التتبع، وتبقى كل مرحلة جزءاً من سابقتها بالبناء لا بالحظ.
    const rows = await this.prisma.$queryRaw<Array<{ opened: number; offered: number; accepted: number; quiet: number }>>`
      WITH cohort AS (
        SELECT DISTINCT entity_id AS id FROM analytics_events
        WHERE event = 'service_request.opened' AND occurred_at >= ${q.from} AND occurred_at < ${q.to}
          AND (${q.zone ?? null}::text IS NULL OR industrial_zone = ${q.zone ?? null})
      )
      SELECT (SELECT count(*)::int FROM cohort) AS opened,
             (SELECT count(*)::int FROM cohort c WHERE EXISTS (SELECT 1 FROM service_offers o WHERE o.request_id = c.id)) AS offered,
             (SELECT count(*)::int FROM cohort c JOIN service_requests r ON r.id = c.id WHERE r.accepted_offer_id IS NOT NULL) AS accepted,
             (SELECT count(*)::int FROM cohort c JOIN analytics_events e ON e.entity_id = c.id AND e.event = 'service_request.quiet') AS quiet`;
    const r = rows[0]!;
    return { opened: Number(r.opened), offered: Number(r.offered), accepted: Number(r.accepted), quiet: Number(r.quiet) };
  }
  async firstOfferMinutes(q: { from: Date; to: Date; zone?: string }) {
    const rows = await this.prisma.$queryRaw<Array<{ m: number | null }>>`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (o.first_offer - r.created_at)) / 60.0)::float AS m
      FROM service_requests r
      JOIN LATERAL (SELECT MIN(so.created_at) AS first_offer FROM service_offers so WHERE so.request_id = r.id) o ON true
      WHERE r.created_at >= ${q.from} AND r.created_at < ${q.to} AND o.first_offer IS NOT NULL`;
    const m = rows[0]?.m;
    return m == null ? null : Math.max(1, Math.round(m));
  }
  async funnel(q: { from: Date; to: Date; zone?: string; orgId?: string }): Promise<FunnelRow[]> {
    const rows = await this.prisma.$queryRaw<Array<{ event: string; count: bigint; orgs: bigint }>>`
      SELECT event, count(*) AS count, count(DISTINCT org_id) AS orgs
      FROM analytics_events
      WHERE occurred_at >= ${q.from} AND occurred_at < ${q.to}
        AND (${q.zone ?? null}::text IS NULL OR industrial_zone = ${q.zone ?? null})
        AND (${q.orgId ?? null}::uuid IS NULL OR org_id = ${q.orgId ?? null}::uuid)
      GROUP BY event ORDER BY event`;
    return rows.map((r) => ({ event: r.event, count: Number(r.count), orgs: Number(r.orgs) }));
  }

  async byZone(q: { from: Date; to: Date }): Promise<ZoneRow[]> {
    const rows = await this.prisma.$queryRaw<Array<{ zone: string | null; orgs: bigint; work_orders: bigint; paid: bigint; gmv: Prisma.Decimal | null }>>`
      SELECT industrial_zone AS zone,
             count(DISTINCT org_id) AS orgs,
             count(*) FILTER (WHERE event = 'work_order.created') AS work_orders,
             count(*) FILTER (WHERE event = 'invoice.paid') AS paid,
             COALESCE(sum((props->>'total')::numeric) FILTER (WHERE event = 'invoice.paid'), 0) AS gmv
      FROM analytics_events
      WHERE occurred_at >= ${q.from} AND occurred_at < ${q.to}
      GROUP BY industrial_zone ORDER BY paid DESC NULLS LAST`;
    return rows.map((r) => ({ zone: r.zone, orgs: Number(r.orgs), workOrders: Number(r.work_orders), paidInvoices: Number(r.paid), gmv: (r.gmv ?? new Prisma.Decimal(0)).toFixed(2) }));
  }

  async activation(q: { from: Date; to: Date; zone?: string }) {
    const rows = await this.prisma.$queryRaw<Array<{ org_id: string; name_ar: string; zone: string | null; work_orders: bigint; last_active_at: Date | null }>>`
      SELECT o.id AS org_id, COALESCE(o.trade_name_ar, o.legal_name_ar) AS name_ar, l.industrial_zone AS zone,
             count(a.*) FILTER (WHERE a.event = 'work_order.created') AS work_orders,
             max(a.occurred_at) AS last_active_at
      FROM organizations o
      LEFT JOIN organization_locations l ON l.org_id = o.id AND l.is_primary
      LEFT JOIN analytics_events a ON a.org_id = o.id AND a.occurred_at >= ${q.from} AND a.occurred_at < ${q.to}
      WHERE o.status = 'active' AND (${q.zone ?? null}::text IS NULL OR l.industrial_zone = ${q.zone ?? null})
      GROUP BY o.id, name_ar, l.industrial_zone
      ORDER BY work_orders DESC, name_ar`;
    return rows.map((r) => ({ orgId: r.org_id, nameAr: r.name_ar, zone: r.zone, workOrders: Number(r.work_orders), lastActiveAt: r.last_active_at }));
  }

  async settings(prefix: string) {
    const rows = await this.prisma.platformSetting.findMany({ where: { key: { startsWith: prefix } }, orderBy: { key: 'asc' } });
    return rows.map((r) => ({ key: r.key, value: r.value }));
  }
  async setSetting(key: string, value: unknown, updatedBy: string) {
    await this.prisma.platformSetting.upsert({ where: { key }, update: { value: value as Prisma.InputJsonValue, updatedBy, updatedAt: new Date() }, create: { key, value: value as Prisma.InputJsonValue, updatedBy } });
  }

  async zoneOfOrg(orgId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ industrial_zone: string | null }>>`
      SELECT industrial_zone FROM organization_locations WHERE org_id = ${orgId}::uuid ORDER BY is_primary DESC LIMIT 1`;
    return rows[0]?.industrial_zone ?? null;
  }
  async orgTypeOf(orgId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ type: string }>>`SELECT type::text AS type FROM organizations WHERE id = ${orgId}::uuid`;
    return rows[0]?.type ?? null;
  }
  async setLocationZone(locationId: string, zone: string | null) {
    await this.prisma.$executeRaw`UPDATE organization_locations SET industrial_zone = ${zone} WHERE id = ${locationId}::uuid`;
  }
  /** geography columns cannot be deserialized by Prisma — project them (CLAUDE.md, logistics lesson). */
  async locationsMissingZone(limit: number, knownCodes: string[]) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; org_id: string; lat: number; lng: number }>>`
      SELECT id, org_id, ST_Y(geo::geometry) AS lat, ST_X(geo::geometry) AS lng
      FROM organization_locations
      WHERE industrial_zone IS NULL OR NOT (industrial_zone = ANY(${knownCodes}::text[]))
      LIMIT ${limit}`;
    return rows.map((r) => ({ id: r.id, orgId: r.org_id, lat: Number(r.lat), lng: Number(r.lng) }));
  }
}
