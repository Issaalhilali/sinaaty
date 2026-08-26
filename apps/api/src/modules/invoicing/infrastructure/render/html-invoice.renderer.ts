import { Injectable } from '@nestjs/common';
import type { InvoiceRendererPort } from '../../application/ports/invoice-renderer.port';
import type { Invoice } from '../../domain/invoice';

const esc = (s: string | number | null | undefined) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const money = (s: string) => `${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
const TYPE_AR: Record<string, string> = { standard_tax: 'فاتورة ضريبية', simplified_tax: 'فاتورة ضريبية مبسطة', credit_note: 'إشعار دائن', debit_note: 'إشعار مدين', proforma: 'فاتورة مبدئية' };

/** Arabic RTL tax invoice (ZATCA Phase 1 fields + QR payload). HTML now; the Puppeteer adapter turns it into PDF/A-3 with the XML embedded. */
@Injectable()
export class HtmlInvoiceRenderer implements InvoiceRendererPort {
  render(inv: Invoice, o: { qrBase64: string; xml: string }): Promise<{ bytes: Buffer; mimeType: 'text/html' }> {
    const rows = inv.lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.descriptionAr)}</td><td>${esc(l.quantity)}</td><td>${money(l.unitPrice)}</td><td>${money(l.lineTotal)}</td><td>${money(l.vatAmount)}</td><td>${money(String(Number(l.lineTotal) + Number(l.vatAmount)))}</td></tr>`).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(TYPE_AR[inv.type] ?? inv.type)} ${esc(inv.number)}</title>
<style>@page{size:A4;margin:16mm}body{font-family:'IBM Plex Sans Arabic','SF Arabic','Segoe UI',sans-serif;color:#12201C;font-size:12px}h1{font-size:18px;margin:0}.hdr{display:flex;justify-content:space-between;border-bottom:2px solid #0E6B54;padding-bottom:10px;margin-bottom:12px}.muted{color:#66756F}.box{border:1px solid #D3DCD7;border-radius:8px;padding:10px;margin-bottom:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}table{width:100%;border-collapse:collapse}th{background:#DCEFE6;color:#0A4F3E;text-align:right;padding:6px;font-weight:600}td{padding:6px;border-bottom:1px solid #E4EAE6}.tot td{border:0;padding:3px 6px}.g{font-weight:700;font-size:14px}.qr{font-family:ui-monospace,monospace;font-size:9px;word-break:break-all;color:#66756F}.num{font-variant-numeric:tabular-nums}.void{color:#B4382F;border:2px solid #B4382F;border-radius:6px;padding:2px 10px;font-weight:700;display:inline-block}</style></head><body>
<div class="hdr"><div><h1>${esc(TYPE_AR[inv.type] ?? inv.type)} ${esc(inv.number)}</h1><div class="muted">تاريخ الإصدار ${esc((inv.issueDate ?? inv.createdAt).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))}${inv.supplyDate ? ` · تاريخ التوريد ${esc(inv.supplyDate.toLocaleDateString('ar-SA', { timeZone: 'Asia/Riyadh' }))}` : ''}</div>${inv.status === 'void' ? `<div class="void">ملغاة${inv.voidReason ? ` — ${esc(inv.voidReason)}` : ''}</div>` : ''}</div><div style="text-align:left"><b> صناعية</b><br><span class="muted">منصة موثّقة</span></div></div>
<div class="grid"><div class="box"><b>البائع</b><br>${esc(inv.sellerSnapshot.name_ar)}<br>الرقم الضريبي: ${esc(inv.sellerSnapshot.vat_number)}${inv.sellerSnapshot.cr_number ? `<br>س.ت: ${esc(inv.sellerSnapshot.cr_number)}` : ''}</div><div class="box"><b>المشتري</b><br>${esc(inv.buyerSnapshot.name_ar)}${inv.buyerSnapshot.vat_number ? `<br>الرقم الضريبي: ${esc(inv.buyerSnapshot.vat_number)}` : ''}${inv.buyerSnapshot.phone ? `<br>${esc(inv.buyerSnapshot.phone)}` : ''}</div></div>
<table class="num"><thead><tr><th>#</th><th>البيان</th><th>الكمية</th><th>سعر الوحدة</th><th>المبلغ (قبل الضريبة)</th><th>الضريبة 15%</th><th>الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot num" style="width:45%;margin-inline-start:auto;margin-top:8px"><tr><td>الإجمالي الخاضع للضريبة</td><td>${money(inv.subtotal)}</td></tr><tr><td>مجموع ضريبة القيمة المضافة</td><td>${money(inv.vatTotal)}</td></tr><tr class="g"><td>الإجمالي شامل الضريبة</td><td>${money(inv.total)}</td></tr>${Number(inv.paidTotal) > 0 ? `<tr><td>المدفوع</td><td>${money(inv.paidTotal)}</td></tr>` : ''}</table>
${inv.notesAr ? `<div class="box"><span class="muted">ملاحظات:</span> ${esc(inv.notesAr)}</div>` : ''}
<div class="box"><b>رمز الاستجابة السريعة (ZATCA)</b><div class="qr">${esc(o.qrBase64)}</div><span class="muted">امسح الرمز بتطبيق الهيئة للتحقق · بصمة الفاتورة: <span class="qr">${esc(inv.zatcaHash)}</span></span></div>
</body></html>`;
    return Promise.resolve({ bytes: Buffer.from(html, 'utf8'), mimeType: 'text/html' });
  }
}
