/**
 * A damage on a car body, as recorded at check-in or check-out.
 *
 * `source` is what makes this feature honest: a model's opinion never silently becomes a person's record.
 * The inspector's entries are the truth; the model's entries are suggestions carrying their confidence.
 */
export interface Damage {
  zone: string;
  severity: 'minor' | 'moderate' | 'severe';
  noteAr?: string | null;
  mediaIds?: string[];
  source: 'inspector' | 'ai';
  aiConfidence?: number | null;
}

/** The eight angles a check-in photographs, plus the parts an inspector names. */
export const ZONES = [
  'front_bumper', 'hood', 'front_left_door', 'rear_left_door', 'rear_bumper',
  'trunk', 'rear_right_door', 'front_right_door', 'roof', 'windshield',
  'front_left_fender', 'front_right_fender', 'rear_left_fender', 'rear_right_fender',
] as const;

export const ZONE_AR: Record<string, string> = {
  front_bumper: 'الصدام الأمامي', hood: 'غطاء المحرك', front_left_door: 'الباب الأمامي الأيسر',
  rear_left_door: 'الباب الخلفي الأيسر', rear_bumper: 'الصدام الخلفي', trunk: 'غطاء الصندوق',
  rear_right_door: 'الباب الخلفي الأيمن', front_right_door: 'الباب الأمامي الأيمن', roof: 'السقف',
  windshield: 'الزجاج الأمامي', front_left_fender: 'الرفرف الأمامي الأيسر', front_right_fender: 'الرفرف الأمامي الأيمن',
  rear_left_fender: 'الرفرف الخلفي الأيسر', rear_right_fender: 'الرفرف الخلفي الأيمن',
};
export const zoneAr = (zone: string) => ZONE_AR[zone] ?? zone;

const RANK: Record<Damage['severity'], number> = { minor: 1, moderate: 2, severe: 3 };
export const isWorse = (a: Damage['severity'], b: Damage['severity']) => RANK[a] > RANK[b];

/**
 * Merges what the model saw into what the inspector recorded.
 *
 * The inspector always wins on a zone they already judged — including when the model is more alarmed.
 * A model finding on an untouched zone is added as a *suggestion*, so the inspector can accept or ignore
 * it; nothing is ever quietly upgraded on someone's behalf.
 */
export function mergeDamages(human: Damage[], ai: Damage[], minConfidence = 0.6): Damage[] {
  const out: Damage[] = human.map((d) => ({ ...d, source: 'inspector' }));
  const claimed = new Set(human.map((d) => d.zone));
  for (const d of ai) {
    if (claimed.has(d.zone)) continue;
    if ((d.aiConfidence ?? 0) < minConfidence) continue;
    out.push({ ...d, source: 'ai' as const });
  }
  return out;
}

export interface DamageDiff {
  /** Damage present at delivery that was not there at intake — the question a customer actually asks. */
  appeared: Damage[];
  /** Damage that got worse while the car was in the workshop. */
  worsened: Array<{ zone: string; from: Damage['severity']; to: Damage['severity'] }>;
  /** Damage recorded at intake and gone at delivery — usually what the repair fixed. */
  repaired: Damage[];
  unchanged: Damage[];
}

/**
 * Check-in against check-out. This is the whole point of photographing eight angles twice: if something
 * appeared while the car was in the workshop, both sides see it in the same list, with the photos, instead
 * of arguing at the gate.
 *
 * Deliberately conservative about blame: `appeared` includes AI-only findings, but each keeps its `source`
 * so a dispute is never decided by a model alone.
 */
export function diffDamages(checkIn: Damage[], checkOut: Damage[]): DamageDiff {
  const byZone = (list: Damage[]) => new Map(list.map((d) => [d.zone, d]));
  const before = byZone(checkIn);
  const after = byZone(checkOut);

  const appeared: Damage[] = [];
  const worsened: DamageDiff['worsened'] = [];
  const unchanged: Damage[] = [];
  for (const [zone, d] of after) {
    const was = before.get(zone);
    if (!was) { appeared.push(d); continue; }
    if (isWorse(d.severity, was.severity)) worsened.push({ zone, from: was.severity, to: d.severity });
    else unchanged.push(d);
  }
  const repaired = [...before.values()].filter((d) => !after.has(d.zone));
  return { appeared, worsened, repaired, unchanged };
}

/** One Arabic sentence a customer can read without knowing what an inspection is. */
export function diffSummaryAr(diff: DamageDiff): string {
  if (!diff.appeared.length && !diff.worsened.length) {
    return diff.repaired.length ? `لا توجد أضرار جديدة، وتم إصلاح ${diff.repaired.length} موضع.` : 'لا توجد أضرار جديدة مقارنة بالاستلام.';
  }
  const parts: string[] = [];
  if (diff.appeared.length) parts.push(`${diff.appeared.length} ضرر جديد (${diff.appeared.map((d) => zoneAr(d.zone)).join('، ')})`);
  if (diff.worsened.length) parts.push(`${diff.worsened.length} موضع ازداد سوءاً (${diff.worsened.map((w) => zoneAr(w.zone)).join('، ')})`);
  return `${parts.join(' و')} — راجع الصور قبل التسليم.`;
}
