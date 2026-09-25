import { describe, expect, it } from 'vitest';
import { buildInvoiceXml, decodeQr, encodeQr, invoiceHash } from '..';

describe('ZATCA Phase 1 QR TLV', () => {
  // Published ZATCA sample (Bobs Records, 310122393500003, 2022-04-25T15:30:00Z, 1000.00, 150.00)
  const SAMPLE = 'AQxCb2JzIFJlY29yZHMCDzMxMDEyMjM5MzUwMDAwMwMUMjAyMi0wNC0yNVQxNTozMDowMFoEBzEwMDAuMDAFBjE1MC4wMA==';
  it('encodes the ZATCA sample vector byte-for-byte', () => {
    expect(encodeQr({ sellerName: 'Bobs Records', vatNumber: '310122393500003', timestamp: '2022-04-25T15:30:00Z', total: '1000.00', vat: '150.00' })).toBe(SAMPLE);
  });
  it('decodes the sample back to its fields', () => {
    expect(decodeQr(SAMPLE).fields).toEqual({ sellerName: 'Bobs Records', vatNumber: '310122393500003', timestamp: '2022-04-25T15:30:00Z', total: '1000.00', vat: '150.00' });
  });
  it('round-trips Arabic seller names using UTF-8 byte lengths', () => {
    const q = { sellerName: 'ورشة النور للسمكرة والميكانيكا', vatNumber: '300000000000003', timestamp: '2026-08-18T12:00:00Z', total: '1368.50', vat: '178.50' };
    const enc = encodeQr(q); const d = decodeQr(enc);
    expect(d.fields).toEqual(q);
    expect(Buffer.from(enc, 'base64')[1]).toBe(Buffer.byteLength(q.sellerName, 'utf8'));
  });
  it('validates inputs', () => {
    expect(() => encodeQr({ sellerName: 'x', vatNumber: '123', timestamp: '2026-01-01T00:00:00Z', total: '1.00', vat: '0.15' })).toThrow(/vatNumber/);
    expect(() => encodeQr({ sellerName: 'x', vatNumber: '300000000000003', timestamp: 'nope', total: '1.00', vat: '0.15' })).toThrow(/timestamp/);
    expect(() => encodeQr({ sellerName: 'x', vatNumber: '300000000000003', timestamp: '2026-01-01T00:00:00Z', total: '1', vat: '0.15' })).toThrow(/2 decimals/);
    expect(() => decodeQr('AQ==')).toThrow();
  });
});
describe('hash + UBL placeholder', () => {
  it('invoice hash is canonical', () => { expect(invoiceHash({ b: 1, a: [2] })).toBe(invoiceHash({ a: [2], b: 1 })); });
  it('builds well-formed UBL with QR, parties and lines', () => {
    const xml = buildInvoiceXml({ id: 'INV-1', uuid: '00000000-0000-7000-8000-000000000001', issueDate: '2026-08-18', issueTime: '12:00:00', typeCode: '388', subtype: '0200000', currency: 'SAR', seller: { registrationName: 'ورشة & أبناؤه', vatNumber: '300000000000003', city: 'الرياض' }, buyer: null, lines: [{ id: '1', name: 'دسكات', quantity: '1', unitPrice: '420.00', lineExtension: '420.00', taxPercent: '15.00', taxAmount: '63.00', roundingAmount: '483.00' }], taxExclusive: '420.00', taxInclusive: '483.00', taxAmount: '63.00', allowanceTotal: '0.00', payableAmount: '483.00', qrBase64: 'AQ==' });
    expect(xml).toContain('<cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>'); expect(xml).toContain('ورشة &amp; أبناؤه'); expect(xml).toContain('<cbc:PayableAmount currencyID="SAR">483.00</cbc:PayableAmount>');
    expect((xml.match(/<cac:InvoiceLine>/g) ?? []).length).toBe(1);
  });
});
