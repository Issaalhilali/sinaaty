import { normalizeArabic } from '../infrastructure/arabic';
import { SearchMockAdapter } from '../infrastructure/search.mock.adapter';

describe('Arabic normalisation — the ways people actually type', () => {
  it('ta marbuta and final ha are the same word', () => {
    expect(normalizeArabic('ورشة النور')).toBe(normalizeArabic('ورشه النور'));
  });
  it('alef variants collapse', () => {
    expect(normalizeArabic('أوتو إصلاح')).toBe(normalizeArabic('اوتو اصلاح'));
  });
  it('tashkeel and tatweel disappear', () => {
    expect(normalizeArabic('الــنُّور')).toBe('النور');
  });
  it('alef maqsura matches ya', () => {
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'));
  });
});

describe('discovery search (mock contract — the behaviour Meilisearch must also satisfy)', () => {
  const adapter = new SearchMockAdapter();
  beforeAll(async () => {
    await adapter.indexOrgs([
      { id: 'nour', type: 'workshop', nameAr: 'ورشة النور', legalNameAr: 'ورشة النور للسمكرة والميكانيكا', city: 'الرياض', zone: 'RUH-IND-2', ratingAvg: 4.6, ratingCount: 120 },
      { id: 'sari', type: 'workshop', nameAr: 'ورشة السريع', legalNameAr: 'مؤسسة السريع', city: 'جدة', zone: null, ratingAvg: 4.1, ratingCount: 40 },
      { id: 'scrap', type: 'scrapyard', nameAr: 'تشليح الرياض', legalNameAr: 'تشليح الرياض', city: 'الرياض', zone: null, ratingAvg: 3.9, ratingCount: 15 },
    ]);
  });

  it('finds the misspelt name: «ورشه النور» → ورشة النور', async () => {
    const hits = await adapter.searchOrgs({ text: 'ورشه النور', limit: 10 });
    expect(hits[0]?.id).toBe('nour');
  });

  it('a one-letter slip still finds it: «النوز» → النور', async () => {
    const hits = await adapter.searchOrgs({ text: 'النوز', limit: 10 });
    expect(hits.map((h) => h.id)).toContain('nour');
  });

  it('filters by type and city like the discovery endpoint does', async () => {
    expect((await adapter.searchOrgs({ text: 'الرياض', type: 'scrapyard', limit: 10 })).map((h) => h.id)).toEqual(['scrap']);
    expect((await adapter.searchOrgs({ text: 'ورشة', city: 'جدة', limit: 10 })).map((h) => h.id)).toEqual(['sari']);
  });

  it('a removed organization stops being findable — suspension must reach search', async () => {
    await adapter.removeOrg('sari');
    expect((await adapter.searchOrgs({ text: 'السريع', limit: 10 }))).toEqual([]);
  });

  it('nonsense finds nothing rather than everything', async () => {
    expect(await adapter.searchOrgs({ text: 'مطعم البيك', limit: 10 })).toEqual([]);
  });
});
