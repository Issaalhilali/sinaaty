import { diffDamages, diffSummaryAr, isWorse, mergeDamages, zoneAr, type Damage } from '../domain/damages';

const d = (zone: string, severity: Damage['severity'], source: Damage['source'] = 'inspector', aiConfidence?: number): Damage =>
  ({ zone, severity, source, aiConfidence: aiConfidence ?? null });

describe('merging what the model saw into what the inspector recorded', () => {
  it('the inspector wins on a zone they already judged — even when the model is more alarmed', () => {
    const merged = mergeDamages([d('hood', 'minor')], [d('hood', 'severe', 'ai', 0.95)]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ zone: 'hood', severity: 'minor', source: 'inspector' });
  });

  it('a finding on an untouched zone is added as a suggestion, marked as the model’s', () => {
    const merged = mergeDamages([d('hood', 'minor')], [d('rear_bumper', 'moderate', 'ai', 0.8)]);
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({ zone: 'rear_bumper', source: 'ai', aiConfidence: 0.8 });
  });

  it('low-confidence findings are dropped rather than shown as damage', () => {
    expect(mergeDamages([], [d('roof', 'minor', 'ai', 0.4)])).toHaveLength(0);
    expect(mergeDamages([], [d('roof', 'minor', 'ai', 0.61)])).toHaveLength(1);
  });

  it('never relabels a human entry as the model’s', () => {
    const merged = mergeDamages([{ zone: 'trunk', severity: 'moderate', source: 'ai' }], []);
    expect(merged[0]!.source).toBe('inspector');
  });
});

describe('check-in against check-out', () => {
  const checkIn = [d('front_bumper', 'minor'), d('hood', 'moderate')];

  it('answers the question the customer actually asks: what is new?', () => {
    const diff = diffDamages(checkIn, [d('front_bumper', 'minor'), d('hood', 'moderate'), d('rear_left_door', 'severe')]);
    expect(diff.appeared.map((x) => x.zone)).toEqual(['rear_left_door']);
    expect(diff.worsened).toEqual([]);
    expect(diff.unchanged).toHaveLength(2);
  });

  it('catches a zone that got worse in the workshop', () => {
    const diff = diffDamages(checkIn, [d('front_bumper', 'severe'), d('hood', 'moderate')]);
    expect(diff.worsened).toEqual([{ zone: 'front_bumper', from: 'minor', to: 'severe' }]);
    expect(diff.appeared).toEqual([]);
  });

  it('a repaired zone is reported as repaired, not as missing data', () => {
    const diff = diffDamages(checkIn, [d('hood', 'moderate')]);
    expect(diff.repaired.map((x) => x.zone)).toEqual(['front_bumper']);
  });

  it('a zone that improved is not counted as worse', () => {
    const diff = diffDamages([d('hood', 'severe')], [d('hood', 'minor')]);
    expect(diff.worsened).toEqual([]);
    expect(diff.unchanged).toHaveLength(1);
  });

  it('severity ordering is explicit', () => {
    expect(isWorse('severe', 'minor')).toBe(true);
    expect(isWorse('minor', 'moderate')).toBe(false);
    expect(isWorse('moderate', 'moderate')).toBe(false);
  });
});

describe('the sentence the customer reads', () => {
  it('says plainly when nothing new happened', () => {
    expect(diffSummaryAr(diffDamages([d('hood', 'minor')], [d('hood', 'minor')]))).toContain('لا توجد أضرار جديدة');
  });

  it('names the zones in Arabic when something did', () => {
    const s = diffSummaryAr(diffDamages([], [d('rear_bumper', 'moderate')]));
    expect(s).toContain('الصدام الخلفي');
    expect(s).toContain('راجع الصور');
  });

  it('mentions repairs when there is nothing new', () => {
    expect(diffSummaryAr(diffDamages([d('hood', 'severe')], []))).toContain('تم إصلاح 1');
  });

  it('falls back to the code when a zone has no Arabic label', () => {
    expect(zoneAr('unknown_zone')).toBe('unknown_zone');
    expect(zoneAr('hood')).toBe('غطاء المحرك');
  });
});
