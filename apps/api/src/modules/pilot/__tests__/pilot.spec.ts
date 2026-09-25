import { bucketOf, isFlagOn, KNOWN_FLAGS } from '../domain/feature-flags';
import { DEFAULT_ZONES, distanceKm, zoneFor } from '../domain/zones';

describe('industrial zones', () => {
  const IND2 = DEFAULT_ZONES.find((z) => z.code === 'RUH-IND-2')!;

  it('places a workshop in the zone it sits in', () => {
    expect(zoneFor({ lat: IND2.lat, lng: IND2.lng }, DEFAULT_ZONES)?.code).toBe('RUH-IND-2');
    expect(zoneFor({ lat: 24.6167, lng: 46.8333 }, DEFAULT_ZONES)?.code).toBe('RUH-SULAY');
    expect(zoneFor({ lat: 21.4114, lng: 39.22 }, DEFAULT_ZONES)?.code).toBe('JED-IND-1');
  });

  it('a workshop outside every zone is simply not in the pilot — not an error', () => {
    expect(zoneFor({ lat: 26.4207, lng: 50.0888 }, DEFAULT_ZONES)).toBeNull();   // الدمام
    expect(zoneFor({ lat: 24.7136, lng: 46.6753 }, DEFAULT_ZONES)).toBeNull();   // وسط الرياض، خارج المناطق الصناعية
  });

  it('overlapping zones resolve to the nearest one, not the first declared', () => {
    const zones = [
      { code: 'WIDE', nameAr: 'واسعة', city: 'الرياض', lat: 24.60, lng: 46.80, radiusKm: 30 },
      { code: 'NEAR', nameAr: 'قريبة', city: 'الرياض', lat: 24.62, lng: 46.83, radiusKm: 5 },
    ];
    expect(zoneFor({ lat: 24.621, lng: 46.831 }, zones)?.code).toBe('NEAR');
  });

  it('distance is the real great-circle distance', () => {
    // Riyadh centre → Industrial 2 is ~22 km on the ground.
    const d = distanceKm({ lat: 24.7136, lng: 46.6753 }, { lat: IND2.lat, lng: IND2.lng });
    expect(d).toBeGreaterThan(20);
    expect(d).toBeLessThan(25);
    expect(distanceKm({ lat: 24.7, lng: 46.7 }, { lat: 24.7, lng: 46.7 })).toBe(0);
  });
});

describe('feature flags', () => {
  it('a flag that does not exist is off — new code stays inert until ops enable it', () => {
    expect(isFlagOn(undefined, { orgId: 'o1' })).toBe(false);
    expect(isFlagOn({}, { orgId: 'o1' })).toBe(false);
  });

  it('opens by organization, by org type, and by zone', () => {
    expect(isFlagOn({ orgs: ['o1'] }, { orgId: 'o1' })).toBe(true);
    expect(isFlagOn({ orgs: ['o1'] }, { orgId: 'o2' })).toBe(false);
    expect(isFlagOn({ org_types: ['parts_distributor'] }, { orgId: 'o2', orgType: 'parts_distributor' })).toBe(true);
    expect(isFlagOn({ zones: ['RUH-IND-2'] }, { orgId: 'o3', zone: 'RUH-IND-2' })).toBe(true);
    expect(isFlagOn({ zones: ['RUH-IND-2'] }, { orgId: 'o3', zone: 'RUH-SULAY' })).toBe(false);
  });

  it('enabled beats every narrower rule', () => {
    expect(isFlagOn({ enabled: true, orgs: ['other'] }, { orgId: 'mine' })).toBe(true);
  });

  it('percentage rollout is stable per organization and roughly the right size', () => {
    const rule = { pct: 30 };
    const ids = Array.from({ length: 1000 }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`);
    const on = ids.filter((id) => isFlagOn(rule, { orgId: id }));
    expect(on.length).toBeGreaterThan(200);
    expect(on.length).toBeLessThan(400);
    // Same org, same answer — an org must not see a feature flicker between requests.
    for (const id of on.slice(0, 20)) expect(isFlagOn(rule, { orgId: id })).toBe(true);
    expect(bucketOf('same-id')).toBe(bucketOf('same-id'));
  });

  it('the unfinished surfaces are declared so clients get a definite "off", not silence', () => {
    expect(KNOWN_FLAGS).toContain('voice_to_invoice');
    expect(KNOWN_FLAGS).toContain('ai_inspection');
  });
});
