import { canTransitionInvoice, invoiceTypeFor, isVoidable } from '../domain/invoice';
describe('invoicing domain', () => {
  it('B2B → standard, B2C → simplified', () => {
    expect(invoiceTypeFor({ org_id: 'o' })).toBe('standard_tax');
    expect(invoiceTypeFor({ vat_number: '300000000000003' })).toBe('standard_tax');
    expect(invoiceTypeFor({})).toBe('simplified_tax');
  });
  it('void rules and transitions', () => {
    expect(isVoidable({ status: 'issued', paidTotal: '0.00' })).toBe(true);
    expect(isVoidable({ status: 'issued', paidTotal: '10.00' })).toBe(false);
    expect(isVoidable({ status: 'paid', paidTotal: '100.00' })).toBe(false);
    expect(canTransitionInvoice('issued', 'paid')).toBe(true);
    expect(canTransitionInvoice('void', 'paid')).toBe(false);
  });
});
