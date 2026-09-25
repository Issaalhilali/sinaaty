/**
 * UBL 2.1 invoice for ZATCA Phase 2 (E-invoicing, KSA).
 * Covers the three document types: 388 tax invoice, 381 credit note, 383 debit note; subtype `0100000`
 * (standard/B2B → clearance) or `0200000` (simplified/B2C → reporting).
 *
 * Element order follows the UBL sequence ZATCA validates; the QR, ICV and PIH are carried as
 * AdditionalDocumentReference entries, and the signature is injected into UBLExtensions by `sign.ts`.
 */
export interface UblParty {
  registrationName: string; vatNumber?: string | null;
  /** Other seller/buyer id (CRN, MOM, MLS, 700, SAG, NAT) — required for a buyer without a VAT number. */
  otherId?: { scheme: 'CRN' | 'MOM' | 'MLS' | '700' | 'SAG' | 'NAT'; value: string } | null;
  street?: string | null; buildingNumber?: string | null; plotIdentification?: string | null; citySubdivision?: string | null;
  city?: string | null; postalZone?: string | null; countrySubentity?: string | null; countryCode?: string;
}
export interface UblLine {
  id: string; name: string; quantity: string; unitCode?: string; unitPrice: string;
  /** Line amount net of discount, excluding VAT. */
  lineExtension: string; discount?: string; taxPercent: string; taxAmount: string;
  /** lineExtension + taxAmount (ZATCA: TaxTotal/TaxAmount on the line, RoundingAmount = inclusive). */
  roundingAmount: string;
  taxCategory?: 'S' | 'Z' | 'E' | 'O';
}
export interface UblInvoice {
  id: string; uuid: string; issueDate: string; issueTime: string;
  typeCode: '388' | '381' | '383'; subtype: '0100000' | '0200000'; currency: 'SAR';
  seller: UblParty; buyer?: UblParty | null; lines: UblLine[];
  taxExclusive: string; taxInclusive: string; taxAmount: string; allowanceTotal: string; payableAmount: string; prepaidAmount?: string;
  qrBase64?: string;
  /** Invoice Counter Value — strictly increasing per device. */
  icv: number;
  /** Previous Invoice Hash — the base64 SHA-256 of the previous invoice on this device (or ZATCA's genesis value). */
  pih: string;
  note?: string | null; billingReferenceId?: string | null; instructionNote?: string | null;
  paymentMeansCode?: string; deliveryDate?: string | null; taxCategory?: 'S' | 'Z' | 'E' | 'O'; taxExemptionReason?: string | null;
}
/** ZATCA's defined value for the first invoice of a device. */
export const GENESIS_PIH = 'NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==';

const NS = [
  'xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"',
  'xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"',
  'xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"',
  'xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"',
].join(' ');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const el = (tag: string, value: string | number | null | undefined, attrs = '') => (value === null || value === undefined || value === '' ? '' : `<${tag}${attrs}>${esc(String(value))}</${tag}>`);
const money = (v: string, cur: string) => ` currencyID="${cur}"`;

function partyXml(tag: 'cac:AccountingSupplierParty' | 'cac:AccountingCustomerParty', p: UblParty): string {
  const idBlock = p.otherId ? `<cac:PartyIdentification><cbc:ID schemeID="${p.otherId.scheme}">${esc(p.otherId.value)}</cbc:ID></cac:PartyIdentification>` : '';
  const address = `<cac:PostalAddress>${el('cbc:StreetName', p.street)}${el('cbc:BuildingNumber', p.buildingNumber)}${el('cbc:PlotIdentification', p.plotIdentification)}${el('cbc:CitySubdivisionName', p.citySubdivision)}${el('cbc:CityName', p.city)}${el('cbc:PostalZone', p.postalZone)}${el('cbc:CountrySubentity', p.countrySubentity)}<cac:Country><cbc:IdentificationCode>${p.countryCode ?? 'SA'}</cbc:IdentificationCode></cac:Country></cac:PostalAddress>`;
  const taxScheme = p.vatNumber ? `<cac:PartyTaxScheme><cbc:CompanyID>${esc(p.vatNumber)}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>` : '';
  return `<${tag}><cac:Party>${idBlock}${address}${taxScheme}<cac:PartyLegalEntity><cbc:RegistrationName>${esc(p.registrationName)}</cbc:RegistrationName></cac:PartyLegalEntity></cac:Party></${tag}>`;
}
function lineXml(l: UblLine, cur: string, docType: string): string {
  const qtyTag = docType === '388' ? 'cbc:InvoicedQuantity' : 'cbc:CreditedQuantity';
  const cat = l.taxCategory ?? 'S';
  const allowance = l.discount && Number(l.discount) > 0 ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason><cbc:Amount${money(cur, cur)}>${l.discount}</cbc:Amount></cac:AllowanceCharge>` : '';
  return `<cac:InvoiceLine><cbc:ID>${esc(l.id)}</cbc:ID><${qtyTag} unitCode="${l.unitCode ?? 'PCE'}">${l.quantity}</${qtyTag}><cbc:LineExtensionAmount${money(cur, cur)}>${l.lineExtension}</cbc:LineExtensionAmount><cac:TaxTotal><cbc:TaxAmount${money(cur, cur)}>${l.taxAmount}</cbc:TaxAmount><cbc:RoundingAmount${money(cur, cur)}>${l.roundingAmount}</cbc:RoundingAmount></cac:TaxTotal><cac:Item><cbc:Name>${esc(l.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>${cat}</cbc:ID><cbc:Percent>${l.taxPercent}</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item><cac:Price><cbc:PriceAmount${money(cur, cur)}>${l.unitPrice}</cbc:PriceAmount>${allowance}</cac:Price></cac:InvoiceLine>`;
}

/** The document without a signature — this is what gets hashed (after the ZATCA transforms). */
export function buildInvoiceXml(inv: UblInvoice): string {
  const cur = inv.currency; const cat = inv.taxCategory ?? 'S';
  const docRefs = [
    `<cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${inv.icv}</cbc:UUID></cac:AdditionalDocumentReference>`,
    `<cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${inv.pih}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>`,
    // The QR reference is always present (ZATCA requires it) but is **outside** the hash, so the value can be
    // injected after signing — `qrBase64` may legitimately be empty at build time.
    `<cac:AdditionalDocumentReference><cbc:ID>QR</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${inv.qrBase64 ?? ''}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>`,
  ].join('');
  const billingRef = inv.billingReferenceId ? `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>${esc(inv.billingReferenceId)}</cbc:ID></cac:InvoiceDocumentReference></cac:BillingReference>` : '';
  const taxSubtotal = `<cac:TaxSubtotal><cbc:TaxableAmount${money(cur, cur)}>${inv.taxExclusive}</cbc:TaxableAmount><cbc:TaxAmount${money(cur, cur)}>${inv.taxAmount}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>${cat}</cbc:ID><cbc:Percent>${inv.lines[0]?.taxPercent ?? '15.00'}</cbc:Percent>${inv.taxExemptionReason ? `<cbc:TaxExemptionReason>${esc(inv.taxExemptionReason)}</cbc:TaxExemptionReason>` : ''}<cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice ${NS}>
<ext:UBLExtensions></ext:UBLExtensions>
<cbc:ProfileID>reporting:1.0</cbc:ProfileID>
<cbc:ID>${esc(inv.id)}</cbc:ID>
<cbc:UUID>${inv.uuid}</cbc:UUID>
<cbc:IssueDate>${inv.issueDate}</cbc:IssueDate>
<cbc:IssueTime>${inv.issueTime}</cbc:IssueTime>
<cbc:InvoiceTypeCode name="${inv.subtype}">${inv.typeCode}</cbc:InvoiceTypeCode>
${el('cbc:Note', inv.note, ' languageID="ar"')}
<cbc:DocumentCurrencyCode>${cur}</cbc:DocumentCurrencyCode>
<cbc:TaxCurrencyCode>${cur}</cbc:TaxCurrencyCode>
${billingRef}${docRefs}
${partyXml('cac:AccountingSupplierParty', inv.seller)}
${inv.buyer ? partyXml('cac:AccountingCustomerParty', inv.buyer) : ''}
${inv.deliveryDate ? `<cac:Delivery><cbc:ActualDeliveryDate>${inv.deliveryDate}</cbc:ActualDeliveryDate></cac:Delivery>` : ''}
<cac:PaymentMeans><cbc:PaymentMeansCode>${inv.paymentMeansCode ?? '10'}</cbc:PaymentMeansCode>${inv.instructionNote ? `<cbc:InstructionNote>${esc(inv.instructionNote)}</cbc:InstructionNote>` : ''}</cac:PaymentMeans>
${Number(inv.allowanceTotal) > 0 ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>discount</cbc:AllowanceChargeReason><cbc:Amount${money(cur, cur)}>${inv.allowanceTotal}</cbc:Amount></cac:AllowanceCharge>` : ''}
<cac:TaxTotal><cbc:TaxAmount${money(cur, cur)}>${inv.taxAmount}</cbc:TaxAmount>${taxSubtotal}</cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount${money(cur, cur)}>${inv.taxExclusive}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount${money(cur, cur)}>${inv.taxExclusive}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount${money(cur, cur)}>${inv.taxInclusive}</cbc:TaxInclusiveAmount><cbc:AllowanceTotalAmount${money(cur, cur)}>${inv.allowanceTotal}</cbc:AllowanceTotalAmount><cbc:PrepaidAmount${money(cur, cur)}>${inv.prepaidAmount ?? '0.00'}</cbc:PrepaidAmount><cbc:PayableAmount${money(cur, cur)}>${inv.payableAmount}</cbc:PayableAmount></cac:LegalMonetaryTotal>
${inv.lines.map((l) => lineXml(l, cur, inv.typeCode)).join('')}
</Invoice>`;
}
