import { extractItems, isApplicable, normalizeArabicDigits, parseSpokenNumber } from '../domain/extraction';

describe('spoken numbers', () => {
  it('reads Arabic-Indic digits as ordinary numbers', () => {
    expect(normalizeArabicDigits('٢٦٠')).toBe('260');
    expect(parseSpokenNumber('٦٥٠')).toBe(650);
    expect(parseSpokenNumber('1,200')).toBe(1);   // a comma is a separator, not a decimal point
  });

  it('reads the numbers a service advisor actually says', () => {
    expect(parseSpokenNumber('مئتين وستين')).toBe(260);
    expect(parseSpokenNumber('خمسمئة')).toBe(500);
    expect(parseSpokenNumber('ألف وخمسمئة')).toBe(1500);
    expect(parseSpokenNumber('ألفين')).toBe(2000);
    expect(parseSpokenNumber('سبعين')).toBe(70);
  });

  it('returns nothing when no number was said — a price is never guessed', () => {
    expect(parseSpokenNumber('تغيير زيت وفلتر')).toBeNull();
    expect(parseSpokenNumber('')).toBeNull();
  });
});

describe('extracting work-order items from a transcript', () => {
  it('turns one spoken sentence into one priced line', () => {
    const items = extractItems('تغيير زيت وفلتر بمئتين وستين');
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ type: 'labor', quantity: '1', unitPrice: '260.00' });
    expect(items[0]!.descriptionAr).toContain('تغيير زيت');
    expect(items[0]!.heardAr).toContain('مئتين');   // the reviewer sees what was heard
  });

  it('splits a dictated list into separate lines and types them', () => {
    const items = extractItems('تغيير زيت وفلتر بمئتين وستين، وبعدين سمكرة ودهان رفرف أمامي بستمئة، وفحص كهرباء بمئة');
    expect(items).toHaveLength(3);
    expect(items.map((i) => i.type)).toEqual(['labor', 'paint', 'diagnostic']);
    expect(items.map((i) => i.unitPrice)).toEqual(['260.00', '600.00', '100.00']);
  });

  it('a line with no price is kept but marked unusable — the advisor is asked, not the model', () => {
    const [item] = extractItems('تركيب دسكات أمامية');
    expect(item!.unitPrice).toBeNull();
    expect(item!.confidence).toBeLessThan(0.75);
    expect(isApplicable(item!)).toBe(false);
  });

  it('reads an explicit quantity', () => {
    const [item] = extractItems('تركيب فلتر عدد 2 بسعر 90');
    expect(item!.quantity).toBe('2');
    expect(item!.unitPrice).toBe('90.00');
  });

  it('ignores chatter that is not work', () => {
    expect(extractItems('السلام عليكم كيف حالك')).toEqual([]);
    expect(extractItems('')).toEqual([]);
    expect(extractItems('   ')).toEqual([]);
  });

  it('a priced line is applicable; an empty description never is', () => {
    const [item] = extractItems('سمكرة رفرف بخمسمئة');
    expect(isApplicable(item!)).toBe(true);
    expect(isApplicable({ ...item!, descriptionAr: ' ' })).toBe(false);
    expect(isApplicable({ ...item!, unitPrice: '0' })).toBe(false);
  });
});
