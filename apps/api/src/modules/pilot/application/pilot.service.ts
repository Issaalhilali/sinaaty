import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OrgType } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { DEFAULT_ZONES, zoneFor, type IndustrialZone } from '../domain/zones';
import { isFlagOn, KNOWN_FLAGS, type FlagRule, type FlagSubject } from '../domain/feature-flags';
import { PILOT_REPOSITORY, type AnalyticsEventInput, type PilotRepository } from '../domain/repositories';

const ZONES_KEY = 'pilot.industrial_zones';
const FLAG_PREFIX = 'feature.';
const CACHE_MS = 30_000;

/**
 * Pilot configuration: which industrial zones we are running in, which features are on for whom, and the
 * PII-free event stream behind the funnel. Everything is data in `platform_settings` — ops change the pilot
 * without a deploy (CLAUDE.md §5.7).
 */
@Injectable()
export class PilotService {
  private readonly log = new Logger(PilotService.name);
  private cache: { at: number; zones: IndustrialZone[]; flags: Record<string, FlagRule> } = { at: 0, zones: [], flags: {} };

  constructor(
    @Inject(PILOT_REPOSITORY) private readonly repo: PilotRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
  ) {}

  /** Settings are read on almost every request, so they are cached briefly and refreshed after a write. */
  private async load(force = false) {
    if (!force && Date.now() - this.cache.at < CACHE_MS) return this.cache;
    const rows = await this.repo.settings('');
    const zonesRow = rows.find((r) => r.key === ZONES_KEY)?.value;
    const zones = Array.isArray(zonesRow) && zonesRow.length ? (zonesRow as IndustrialZone[]) : DEFAULT_ZONES;
    const flags: Record<string, FlagRule> = {};
    for (const r of rows) if (r.key.startsWith(FLAG_PREFIX)) flags[r.key.slice(FLAG_PREFIX.length)] = (r.value ?? {});
    this.cache = { at: Date.now(), zones, flags };
    return this.cache;
  }
  invalidate() { this.cache.at = 0; }

  async zones(): Promise<IndustrialZone[]> { return (await this.load()).zones; }

  /** Where a point sits — used when a workshop registers a location, and by the backfill tool. */
  async zoneOf(point: { lat: number; lng: number }): Promise<IndustrialZone | null> {
    return zoneFor(point, await this.zones());
  }

  async flagsFor(subject: FlagSubject): Promise<Record<string, boolean>> {
    const { flags } = await this.load();
    const out: Record<string, boolean> = {};
    for (const key of KNOWN_FLAGS) out[key] = isFlagOn(flags[key], subject);
    // Flags ops added that the client build does not know about are still reported — a newer app can use them.
    for (const [key, rule] of Object.entries(flags)) if (!(key in out)) out[key] = isFlagOn(rule, subject);
    return out;
  }

  /** Resolved client configuration: what this user's apps may show right now. */
  async configFor(u: AuthUser, orgId?: string) {
    const org = orgId ?? u.orgs[0]?.orgId ?? null;
    if (orgId && !membership(u, orgId) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const [zone, orgType] = org ? await Promise.all([this.repo.zoneOfOrg(org), this.repo.orgTypeOf(org)]) : [null, null];
    return {
      org_id: org,
      industrial_zone: zone,
      features: await this.flagsFor({ orgId: org, orgType: orgType as OrgType | null, zone }),
      zones: (await this.zones()).map((z) => ({ code: z.code, name_ar: z.nameAr, city: z.city })),
    };
  }

  /** The subject of a flag decision: the org itself, its type, and the zone it works in. */
  async subjectFor(orgId: string, zone?: string | null): Promise<FlagSubject> {
    const [orgZone, orgType] = await Promise.all([zone ? Promise.resolve(zone) : this.repo.zoneOfOrg(orgId), this.repo.orgTypeOf(orgId)]);
    return { orgId, orgType: orgType as OrgType | null, zone: orgZone };
  }

  /** Server-side gate. Cosmetic hiding in the app is not a feature flag — the API refuses too. */
  async assertEnabled(flag: string, subject: FlagSubject) {
    const { flags } = await this.load();
    if (!isFlagOn(flags[flag], subject)) {
      throw new AppError('FORBIDDEN', { messageAr: 'هذه الخدمة غير مفعّلة لمنشأتك بعد.', messageEn: 'This feature is not enabled for your organization yet.' });
    }
  }

  // ---- admin ---------------------------------------------------------------
  async listFlags(u: AuthUser) {
    if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const { flags } = await this.load(true);
    return KNOWN_FLAGS.map((key) => ({ key, rule: flags[key] ?? { enabled: false }, known: true }))
      .concat(Object.keys(flags).filter((k) => !KNOWN_FLAGS.includes(k as never)).map((key) => ({ key: key as never, rule: flags[key]!, known: false })));
  }

  async setFlag(u: AuthUser, key: string, rule: FlagRule, reasonAr: string) {
    if (!isPlatformStaff(u) || !['ops', 'super_admin'].includes(u.platformRole)) throw new AppError('FORBIDDEN');
    if (!reasonAr?.trim()) throw new AppError('VALIDATION', { messageAr: 'اكتب سبب التغيير.', messageEn: 'A written reason is required.' });
    const before = (await this.load(true)).flags[key];
    await this.repo.setSetting(`${FLAG_PREFIX}${key}`, rule, u.id);
    await this.uow.run((tx) => this.audit.write(tx, { action: 'pilot.flag.set', entityType: 'platform_setting', entityId: null, actorUserId: u.id, before: before ?? null, after: { key, rule, reason_ar: reasonAr } }));
    this.invalidate();
    return { key, rule };
  }

  async setZones(u: AuthUser, zones: IndustrialZone[], reasonAr: string) {
    if (!isPlatformStaff(u) || !['ops', 'super_admin'].includes(u.platformRole)) throw new AppError('FORBIDDEN');
    if (!reasonAr?.trim()) throw new AppError('VALIDATION', { messageAr: 'اكتب سبب التغيير.', messageEn: 'A written reason is required.' });
    await this.repo.setSetting(ZONES_KEY, zones, u.id);
    await this.uow.run((tx) => this.audit.write(tx, { action: 'pilot.zones.set', entityType: 'platform_setting', entityId: null, actorUserId: u.id, after: { count: zones.length, reason_ar: reasonAr } }));
    this.invalidate();
    return { zones };
  }

  /** Tags every location that has no zone yet — run after adding a zone, or after importing workshops. */
  async backfillZones(u: AuthUser, limit = 500) {
    if (!isPlatformStaff(u) || !['ops', 'super_admin'].includes(u.platformRole)) throw new AppError('FORBIDDEN');
    const zones = await this.zones();
    // Also repairs rows written before zones were codes: «الرياض — الصناعية الثانية» is not a cohort.
    const pending = await this.repo.locationsMissingZone(limit, zones.map((z) => z.code));
    let tagged = 0;
    for (const loc of pending) {
      const z = zoneFor(loc, zones);
      if (!z) continue;
      await this.repo.setLocationZone(loc.id, z.code);
      tagged++;
    }
    return { checked: pending.length, tagged };
  }

  async funnel(u: AuthUser, q: { from?: string; to?: string; zone?: string; org_id?: string }) {
    if (q.org_id) { if (!membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
    else if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const { from, to } = this.window(q);
    const [rows, firstOffer] = await Promise.all([this.repo.funnel({ from, to, zone: q.zone, orgId: q.org_id }), this.repo.firstOfferMinutes({ from, to, zone: q.zone })]);
    const by = (e: string) => rows.find((r) => r.event === e)?.count ?? 0;
    const created = by('work_order.created');
    const approved = by('work_order.approved');
    const invoiced = by('invoice.issued');
    const paid = by('invoice.paid');
    return {
      from, to, zone: q.zone ?? null, events: rows,
      // The one funnel the pilot is judged on: a car arrives → the customer signs → an invoice → money.
      work_orders: {
        created, approved, invoiced, paid,
        approval_rate: pct(approved, created), invoice_rate: pct(invoiced, approved), payment_rate: pct(paid, invoiced),
      },
      parts: { requested: by('part_request.created'), bid: by('part_bid.submitted'), ordered: by('part_order.created') },
      // سوق الإصلاح: كم طلباً فُتح، كم ردّت عليه السوق، كم تحوّل إلى أمر عمل — وكم دقيقة حتى أول ردّ.
      service: (() => {
        const requested = by('service_request.opened'); const offered = by('service_offer.submitted'); const accepted = by('service_request.accepted');
        return { requested, offered, accepted, quiet: by('service_request.quiet'), offer_rate: pct(offered, requested), accept_rate: pct(accepted, requested), avg_first_offer_minutes: firstOffer };
      })(),
    };
  }

  async byZone(u: AuthUser, q: { from?: string; to?: string }) {
    if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const { from, to } = this.window(q);
    const zones = await this.zones();
    const rows = await this.repo.byZone({ from, to });
    return rows.map((r) => ({ ...r, name_ar: zones.find((z) => z.code === r.zone)?.nameAr ?? r.zone ?? 'خارج المناطق' }));
  }

  async activation(u: AuthUser, q: { from?: string; to?: string; zone?: string }) {
    if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const { from, to } = this.window(q);
    const rows = await this.repo.activation({ from, to, zone: q.zone });
    const active = rows.filter((r) => r.workOrders > 0).length;
    return { from, to, organizations: rows.length, active, activation_rate: pct(active, rows.length), rows };
  }

  private window(q: { from?: string; to?: string }) {
    const to = q.to ? new Date(q.to) : new Date();
    const from = q.from ? new Date(q.from) : new Date(to.getTime() - 30 * 86_400_000);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new AppError('VALIDATION');
    return { from, to };
  }

  /**
   * Records one funnel event. Never throws into the caller: analytics must not be able to fail a work
   * order. Called from the outbox handler, so a failure here is retried with the event anyway.
   */
  async record(e: AnalyticsEventInput): Promise<void> {
    try {
      const zone = e.industrialZone ?? (e.orgId ? await this.repo.zoneOfOrg(e.orgId) : null);
      await this.repo.record({ ...e, industrialZone: zone });
    } catch (err) {
      this.log.warn(`analytics ${e.event} dropped: ${(err as Error).message}`);
    }
  }
}

const pct = (a: number, b: number) => (b === 0 ? '0.0' : ((a / b) * 100).toFixed(1));
