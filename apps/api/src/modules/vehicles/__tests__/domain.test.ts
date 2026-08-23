import { modelYearFromVin, normalizePlate, normalizeVin } from '../domain/vin';
import { isOwner, toPublicPassport, type Vehicle } from '../domain/vehicle';

describe('vehicles domain', () => {
  it('normalizes and validates VINs', () => {
    expect(normalizeVin(' 4t1b11hk5ku000001 ')).toBe('4T1B11HK5KU000001');
    expect(normalizeVin('4T1B11HK5KU00000I')).toBeNull(); // I not allowed
    expect(normalizeVin('short')).toBeNull();
  });
  it('decodes model year from position 10 (30-year cycle)', () => {
    const now = new Date('2026-08-18');
    expect(modelYearFromVin('4T1B11HK5KU000001', now)).toBe(2019); // K
    expect(modelYearFromVin('4T1B11HK5AU000001', now)).toBe(2010); // A
    expect(modelYearFromVin('4T1B11HK51U000001', now)).toBe(2001); // 1 (2031 would be future)
    expect(modelYearFromVin('4T1B11HK5IU000001', now)).toBeNull();
  });
  it('normalizes Saudi plates in Arabic and Latin, incl. Arabic-Indic digits', () => {
    expect(normalizePlate('أ ب ج 4821')).toEqual({ ar: 'أ ب ح 4821', en: 'ABJ 4821' });
    expect(normalizePlate('أبج٤٨٢١')).toEqual({ ar: 'أ ب ح 4821', en: 'ABJ 4821' });
    expect(normalizePlate('ABJ 4821')?.ar).toBe('أ ب ح 4821');
    expect(normalizePlate('12345')).toBeNull();
  });
  it('reads the plate in either order — the plate itself carries both, and so does the driver', () => {
    // شكوى المالك ٢٣ أغسطس: كتب اللوحة بالأرقام أولاً كما تُقرأ، فرُفضت لوحة صحيحة.
    expect(normalizePlate('4821 أ ب ج')).toEqual(normalizePlate('أ ب ج 4821'));
    expect(normalizePlate('٤٨٢١ أبج')).toEqual(normalizePlate('أ ب ج 4821'));
    expect(normalizePlate('4821 ABJ')).toEqual(normalizePlate('ABJ 4821'));
  });
  it('refuses letters that are not Saudi plate letters instead of storing «?»', () => {
    // «ت» و«ث» و«خ» ليست من حروف اللوحات. قبولها كان يكتب لوحة مشوّهة تُطبع على فاتورة ضريبية.
    expect(normalizePlate('ر ن ت 5566')).toBeNull();
    expect(normalizePlate('ث خ ز 12')).toBeNull();
    expect(normalizePlate('ABC 4821')).toBeNull();   // C ليس حرف لوحة
  });
  it('the same plate written differently normalizes to one value', () => {
    const forms = ['ا ب ج 4821', 'أ ب ح 4821', 'أبح٤٨٢١', '4821 ا ب ح', 'ABJ 4821'];
    const all = forms.map((f) => normalizePlate(f));
    expect(new Set(all.map((p) => JSON.stringify(p))).size).toBe(1);
    expect(all[0]).toEqual({ ar: 'أ ب ح 4821', en: 'ABJ 4821' });
  });
  it('ownership + public passport masks PII', () => {
    const v: Vehicle = { id: 'v', vin: '4T1B11HK5KU000001', plateNumber: 'أ ب ج 4821', plateNumberEn: 'ABJ 4821', makeId: 1, modelId: 1, makeNameAr: 'تويوتا', makeNameEn: 'Toyota', modelNameAr: 'Camry', modelNameEn: 'Camry', modelYear: 2019, trim: null, engine: null, fuelType: 'petrol', colorAr: null, odometerKm: 84250, ownerType: 'user', ownerUserId: 'u1', ownerOrgId: null, fleetAssetCode: null, ownershipVerifiedAt: null, passportPublicToken: 't', createdAt: new Date() };
    expect(isOwner(v, { id: 'u1', orgs: [] })).toBe(true);
    expect(isOwner(v, { id: 'u2', orgs: [] })).toBe(false);
    expect(isOwner({ ...v, ownerType: 'organization', ownerOrgId: 'o1' }, { id: 'u2', orgs: [{ orgId: 'o1' }] })).toBe(true);
    const pub = toPublicPassport(v, [{ id: 'e', vehicleId: 'v', type: 'odometer', occurredAt: new Date(), odometerKm: 1, orgId: null, orgNameAr: null, refTable: null, refId: null, summaryAr: 'x', summaryEn: null, data: {}, isPublic: false }]);
    expect(pub.vehicle.vin_masked).toBe('4T1B11HK*****0001');
    expect(JSON.stringify(pub)).not.toContain('4821');
    expect(pub.events).toHaveLength(0);
  });
});
