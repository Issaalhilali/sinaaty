import { pickRecipients, type MatchCandidate } from '../domain/service-request';

const c = (orgId: string, distanceKm: number, lastNotifiedAt: Date | null): MatchCandidate => ({ orgId, distanceKm, lastNotifiedAt });
const day = (n: number) => new Date(2026, 7, n);

describe('عدالة توزيع الطلبات', () => {
  it('تحت الحدّ: يصل الجميع، ولا استبعاد', () => {
    const all = [c('a', 1, null), c('b', 2, day(1))];
    const r = pickRecipients(all, { cap: 40, guaranteedNearest: 25 });
    expect(r.chosen).toHaveLength(2); expect(r.excluded).toBe(0);
  });

  it('الأقرب مضمون دائماً — لا تُزاح ورشةٌ قريبة باسم العدالة', () => {
    const all = [...Array(60)].map((_, i) => c(`o${i}`, i + 1, day(20)));
    const r = pickRecipients(all, { cap: 40, guaranteedNearest: 25 });
    for (let i = 0; i < 25; i++) expect(r.chosen[i]!.orgId).toBe(`o${i}`);   // الخمس والعشرون الأولى بالمسافة
  });

  it('من لم يصله طلبٌ قط يسبق من وصله أمس', () => {
    const all = [
      ...[...Array(25)].map((_, i) => c(`near${i}`, i + 1, day(25))),
      c('starved', 30, null),          // بعيدة لكنها لم تُبلَّغ قط
      c('fed', 27, day(25)),           // أقرب منها لكنها أخذت طلباً أمس
    ];
    const r = pickRecipients(all, { cap: 26, guaranteedNearest: 25 });
    expect(r.chosen.map((x) => x.orgId)).toContain('starved');
    expect(r.chosen.map((x) => x.orgId)).not.toContain('fed');
    expect(r.excluded).toBe(1);
  });

  it('عند تساوي الانتظار يفصل الأقرب', () => {
    const all = [c('n', 1, day(1)), c('far', 20, day(5)), c('mid', 10, day(5))];
    const r = pickRecipients(all, { cap: 2, guaranteedNearest: 1 });
    expect(r.chosen.map((x) => x.orgId)).toEqual(['n', 'mid']);
  });

  it('يُعلن المستبعَدين — لا حدّ صامت', () => {
    const all = [...Array(100)].map((_, i) => c(`o${i}`, i + 1, day(1)));
    expect(pickRecipients(all, { cap: 40, guaranteedNearest: 25 }).excluded).toBe(60);
  });
});
