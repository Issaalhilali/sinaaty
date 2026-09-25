import type { OrgType } from '@sinaaty/shared-types';

/**
 * A feature flag as stored in `platform_settings` under `feature.<key>`:
 *
 *   { "enabled": true }                                  → on for everyone
 *   { "enabled": false, "orgs": ["<uuid>"] }             → off, except these organizations (pilot cohort)
 *   { "enabled": false, "org_types": ["parts_distributor"] }
 *   { "enabled": false, "zones": ["RUH-IND-2"] }         → on for workshops in a pilot zone
 *
 * Off by default: a flag that does not exist is off, so shipping code behind a new flag is inert until ops
 * turn it on (charter §5.0 #3 — advanced features stay hidden until the role or the plan needs them).
 */
export interface FlagRule {
  enabled?: boolean;
  orgs?: string[];
  org_types?: string[];
  zones?: string[];
  /** Percentage rollout, 0–100, bucketed by org id so an org's answer never flickers. */
  pct?: number;
}

export interface FlagSubject {
  orgId?: string | null;
  orgType?: OrgType | null;
  zone?: string | null;
}

/** Stable 0–99 bucket from an id — same id, same bucket, no storage. */
export function bucketOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h) % 100;
}

export function isFlagOn(rule: FlagRule | undefined, subject: FlagSubject = {}): boolean {
  if (!rule) return false;
  if (rule.enabled === true) return true;
  if (subject.orgId && rule.orgs?.includes(subject.orgId)) return true;
  if (subject.orgType && rule.org_types?.includes(String(subject.orgType))) return true;
  if (subject.zone && rule.zones?.includes(subject.zone)) return true;
  if (rule.pct != null && rule.pct > 0 && subject.orgId && bucketOf(subject.orgId) < rule.pct) return true;
  return false;
}

/**
 * Flags the apps ask about. Declared here so `/v1/config` always answers the same shape — a client never
 * has to guess whether a missing key means "off" or "unknown build".
 */
export const KNOWN_FLAGS = [
  'parts_marketplace',   // reverse auction + Buy Now
  'service_marketplace', // العميل يعرض مشكلته والورش القريبة ترد (owner directive 2026-08-22)
  'trade_accounts',      // Nafez-secured deferred trade accounts
  'group_buys',          // zone group buying
  'tow',                 // logistics / سطحة
  'accident_reports',    // منجز/تقدير linkage
  'warranty_wallet',
  'disputes',
  'voice_to_invoice',    // Step 27, not built — off everywhere
  'ai_inspection',       // Step 28, not built — off everywhere
] as const;
export type KnownFlag = (typeof KNOWN_FLAGS)[number];
