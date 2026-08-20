/**
 * Abandoned vehicles (المركبة المهجورة).
 *
 * A car sits ready for weeks and the customer stops answering. The workshop cannot sell it, cannot keep
 * it for free, and cannot simply declare it abandoned — so the platform makes the process a paper trail:
 * notices on a schedule, storage fees that start only after a grace period, and a declaration that is
 * refused until every notice has actually been sent.
 *
 * Everything here is pure and deliberately strict: this is the evidence a court sees.
 */

export interface NoticeStep {
  /** 1, 2, 3 … — recorded per work order so a retry never sends the same notice twice. */
  step: number;
  /** Days after the car was ready. */
  afterDays: number;
  /** The last step is the formal notice: it goes by SMS and starts the clock for a declaration. */
  formal: boolean;
}

/**
 * Three notices before anything is declared: a reminder the day it is ready, a second a week later, and a
 * formal notice at `noticeDays` (ABANDONED_NOTICE_DAYS, 15 by default).
 */
export function noticeSchedule(noticeDays: number): NoticeStep[] {
  const formalAt = Math.max(3, noticeDays);
  const mid = Math.max(2, Math.round(formalAt / 2));
  return [
    { step: 1, afterDays: 1, formal: false },
    { step: 2, afterDays: mid, formal: false },
    { step: 3, afterDays: formalAt, formal: true },
  ];
}

export const daysBetween = (from: Date, to: Date) => Math.floor((to.getTime() - from.getTime()) / 86_400_000);

/** The next notice that is due now, or null. Steps already sent are never repeated. */
export function nextDueNotice(readyAt: Date, now: Date, sentSteps: number[], noticeDays: number): NoticeStep | null {
  const elapsed = daysBetween(readyAt, now);
  return noticeSchedule(noticeDays).find((s) => s.afterDays <= elapsed && !sentSteps.includes(s.step)) ?? null;
}

export interface StorageFee {
  chargeableDays: number;
  perDay: string;
  amount: string;
  freeDays: number;
}

/**
 * Storage is free while the customer still has a fair chance to collect the car; only after the grace
 * period does the meter start. Charging from day one reads as a penalty and would not survive a dispute.
 */
export function storageFee(readyAt: Date, now: Date, perDay: string, freeDays: number): StorageFee {
  const rate = Number(perDay);
  const chargeable = Math.max(0, daysBetween(readyAt, now) - freeDays);
  const amount = rate > 0 ? (chargeable * rate).toFixed(2) : '0.00';
  return { chargeableDays: chargeable, perDay: Number(perDay).toFixed(2), amount, freeDays };
}

export interface AbandonEligibility {
  eligible: boolean;
  reasonAr: string;
  daysReady: number;
  noticesSent: number[];
  missingSteps: number[];
}

/**
 * May this car be declared abandoned yet? Refused unless the car has been ready for the full notice
 * period **and** every notice, including the formal one, was actually sent. A missing notice is the first
 * thing the other side will point at.
 */
export function canDeclareAbandoned(input: { readyAt: Date | null; now: Date; sentSteps: number[]; noticeDays: number; status: string }): AbandonEligibility {
  const schedule = noticeSchedule(input.noticeDays);
  const missing = schedule.filter((s) => !input.sentSteps.includes(s.step)).map((s) => s.step);
  const daysReady = input.readyAt ? daysBetween(input.readyAt, input.now) : 0;

  if (input.status !== 'ready') return { eligible: false, reasonAr: 'يُعلن الهجر فقط بعد جهوز السيارة للتسليم.', daysReady, noticesSent: input.sentSteps, missingSteps: missing };
  if (!input.readyAt) return { eligible: false, reasonAr: 'لا يوجد تاريخ جهوز مسجّل.', daysReady, noticesSent: input.sentSteps, missingSteps: missing };
  if (daysReady < input.noticeDays) return { eligible: false, reasonAr: `مضى ${daysReady} يوماً من ${input.noticeDays} المطلوبة.`, daysReady, noticesSent: input.sentSteps, missingSteps: missing };
  if (missing.length) return { eligible: false, reasonAr: `لم تُرسل كل الإنذارات بعد (المتبقي: ${missing.join('، ')}).`, daysReady, noticesSent: input.sentSteps, missingSteps: missing };
  return { eligible: true, reasonAr: 'اكتملت المدة والإنذارات.', daysReady, noticesSent: input.sentSteps, missingSteps: [] };
}

/** What the workshop may claim: the unpaid repair plus the storage that accrued after the grace period. */
export function abandonedClaim(repairOutstanding: string, storage: StorageFee): { repair: string; storage: string; total: string } {
  const repair = Number(repairOutstanding);
  const store = Number(storage.amount);
  return { repair: repair.toFixed(2), storage: store.toFixed(2), total: (repair + store).toFixed(2) };
}
