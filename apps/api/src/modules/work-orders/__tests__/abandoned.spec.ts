import { abandonedClaim, canDeclareAbandoned, daysBetween, nextDueNotice, noticeSchedule, storageFee } from '../domain/abandoned';

const day = (n: number) => new Date(Date.UTC(2026, 7, 1 + n));
const READY = day(0);

describe('notice schedule', () => {
  it('is three notices, the last one formal', () => {
    const s = noticeSchedule(15);
    expect(s.map((x) => x.afterDays)).toEqual([1, 8, 15]);
    expect(s.filter((x) => x.formal).map((x) => x.step)).toEqual([3]);
  });

  it('never collapses to same-day notices even with a short configured period', () => {
    const s = noticeSchedule(1);
    expect(s.map((x) => x.afterDays)).toEqual([1, 2, 3]);
    expect(s.at(-1)!.formal).toBe(true);
  });

  it('sends each notice once, in order, only when it is due', () => {
    expect(nextDueNotice(READY, day(0), [], 15)).toBeNull();          // the same day: nothing yet
    expect(nextDueNotice(READY, day(1), [], 15)?.step).toBe(1);
    expect(nextDueNotice(READY, day(3), [1], 15)).toBeNull();          // step 2 is not due until day 8
    expect(nextDueNotice(READY, day(9), [1], 15)?.step).toBe(2);
    expect(nextDueNotice(READY, day(20), [1, 2], 15)?.step).toBe(3);
    expect(nextDueNotice(READY, day(20), [1, 2, 3], 15)).toBeNull();   // all sent — a retry sends nothing
  });
});

describe('storage fees', () => {
  it('are free while the customer still has a fair chance to collect', () => {
    const f = storageFee(READY, day(3), '50', 5);
    expect(f.chargeableDays).toBe(0);
    expect(f.amount).toBe('0.00');
  });

  it('start only after the grace period', () => {
    const f = storageFee(READY, day(12), '50', 5);
    expect(f.chargeableDays).toBe(7);
    expect(f.amount).toBe('350.00');
  });

  it('are zero when the workshop set no rate', () => {
    expect(storageFee(READY, day(30), '0', 5).amount).toBe('0.00');
  });

  it('count whole days only', () => {
    expect(daysBetween(READY, new Date(READY.getTime() + 23 * 3_600_000))).toBe(0);
    expect(daysBetween(READY, new Date(READY.getTime() + 25 * 3_600_000))).toBe(1);
  });
});

describe('declaring a car abandoned', () => {
  const base = { readyAt: READY, noticeDays: 15, status: 'ready' as const };

  it('is refused before the period is up', () => {
    const r = canDeclareAbandoned({ ...base, now: day(10), sentSteps: [1, 2] });
    expect(r.eligible).toBe(false);
    expect(r.reasonAr).toContain('10 يوماً من 15');
  });

  it('is refused when a notice was never sent — the first thing the other side points at', () => {
    const r = canDeclareAbandoned({ ...base, now: day(20), sentSteps: [1, 2] });
    expect(r.eligible).toBe(false);
    expect(r.missingSteps).toEqual([3]);
    expect(r.reasonAr).toContain('لم تُرسل كل الإنذارات');
  });

  it('is refused for a car that is not even ready', () => {
    expect(canDeclareAbandoned({ ...base, status: 'in_progress', now: day(40), sentSteps: [1, 2, 3] }).eligible).toBe(false);
    expect(canDeclareAbandoned({ ...base, readyAt: null, now: day(40), sentSteps: [1, 2, 3] }).eligible).toBe(false);
  });

  it('is allowed once the period passed and every notice was sent', () => {
    const r = canDeclareAbandoned({ ...base, now: day(16), sentSteps: [1, 2, 3] });
    expect(r.eligible).toBe(true);
    expect(r.daysReady).toBe(16);
  });
});

describe('what the workshop may claim', () => {
  it('is the unpaid repair plus the storage that accrued', () => {
    const claim = abandonedClaim('1368.50', storageFee(READY, day(20), '50', 5));
    expect(claim.repair).toBe('1368.50');
    expect(claim.storage).toBe('750.00');
    expect(claim.total).toBe('2118.50');
  });

  it('is the repair alone when storage is free or unset', () => {
    expect(abandonedClaim('500.00', storageFee(READY, day(2), '50', 5)).total).toBe('500.00');
  });
});
