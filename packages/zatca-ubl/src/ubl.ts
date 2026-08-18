/**
 * Minimal UBL 2.1 invoice XML (Phase 1 archival placeholder). Step 20 completes the ZATCA profile
 * (UBLExtensions/XAdES signature, QR in AdditionalDocumentReference, PIH, ICV, clearance/reporting).
 */
export interface UblParty { registrationName: string; vatNumber?: string | null; street?: string | null; city?: string | null; postalZone?: string | null; countryCode?: string }
export interface UblLine { id: string; name: string; quantity: string; unitPrice: string; lineExtension: string; taxPercent: string; taxAmount: string; roundingAmount: string }
export interface UblInvoice {
  id: string; uuid: string; issueDate: string; issueTime: string; typeCode: '388' | '381' | '383'; subtype: '0100000' | '0200000'; currency: 'SAR';
  seller: UblParty; buyer?: UblParty | null; lines: UblLine[]; taxExclusive: string; taxInclusive: string; taxAmount: string; allowanceTotal: string; payableAmount: string; qrBase64: string; note?: string | null;
  billingReferenceId?: string | null; instructionNote?: string | null;
}
const x = (s: string | null | undefined) => (s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
const party = (p: UblParty, tag: 'cac:AccountingSupplierParty' | 'cac:AccountingCustomerParty') => `<${tag}><cac:Party>${p.vatNumber ? `<cac:PartyTaxScheme><cbc:CompanyID>${x(p.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : ''}<cac:PostalAddress><cbc:StreetName>${x(p.street)}</cbc:StreetName><cbc:CityName>${x(p.city)}</cbc:CityName><cbc:PostalZone>${x(p.postalZone)}</cbc:PostalZone><cac:Country><cbc:IdentificationCode>${x(p.countryCode ?? 'SA')}</cbc:IdentificationCode></cac:Country></cac:PostalAddress><cac:PartyLegalEntity><cbc:RegistrationName>${x(p.registrationName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></${tag}>`;

export function buildInvoiceXml(i: UblInvoice): string {
  const lines = i.lines.map((l) => `<cac:InvoiceLine><cbc:ID>${x(l.id)}</cbc:ID><cbc:InvoicedQuantity unitCode="PCE">${x(l.quantity)}</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="SAR">${x(l.lineExtension)}</cbc:LineExtensionAmount><cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${x(l.taxAmount)}</cbc:TaxAmount><cbc:RoundingAmount currencyID="SAR">${x(l.roundingAmount)}</cbc:RoundingAmount></cac:TaxTotal><cac:Item><cbc:Name>${x(l.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>${x(l.taxPercent)}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount currencyID="SAR">${x(l.unitPrice)}</cbc:PriceAmount></cac:Price></cac:InvoiceLine>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:ProfileID>reporting:1.0</cbc:ProfileID><cbc:ID>${x(i.id)}</cbc:ID><cbc:UUID>${x(i.uuid)}</cbc:UUID><cbc:IssueDate>${x(i.issueDate)}</cbc:IssueDate><cbc:IssueTime>${x(i.issueTime)}</cbc:IssueTime><cbc:InvoiceTypeCode name="${i.subtype}">${i.typeCode}</cbc:InvoiceTypeCode>${i.note ? `<cbc:Note languageID="ar">${x(i.note)}</cbc:Note>` : ''}<cbc:DocumentCurrencyCode>${i.currency}</cbc:DocumentCurrencyCode><cbc:TaxCurrencyCode>${i.currency}</cbc:TaxCurrencyCode>
${i.billingReferenceId ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${x(i.billingReferenceId)}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>` : ''}
<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${x(i.qrBase64)}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
${party(i.seller, 'cac:AccountingSupplierParty')}${i.buyer ? party(i.buyer, 'cac:AccountingCustomerParty') : ''}
${i.instructionNote ? `<cac:PaymentMeans><cbc:PaymentMeansCode>10</cbc:PaymentMeansCode><cbc:InstructionNote>${x(i.instructionNote)}</cbc:InstructionNote></cac:PaymentMeans>` : ''}
<cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${x(i.taxAmount)}</cbc:TaxAmount><cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${x(i.taxExclusive)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${x(i.taxAmount)}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>15.00</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="SAR">${x(i.taxExclusive)}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="SAR">${x(i.taxExclusive)}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="SAR">${x(i.taxInclusive)}</cbc:TaxInclusiveAmount><cbc:AllowanceTotalAmount currencyID="SAR">${x(i.allowanceTotal)}</cbc:AllowanceTotalAmount><cbc:PayableAmount currencyID="SAR">${x(i.payableAmount)}</cbc:PayableAmount></cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}
