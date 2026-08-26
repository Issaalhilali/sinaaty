import { Injectable } from '@nestjs/common';
import type { PdfRendererPort, RenderedDocument } from '../../application/ports/pdf-renderer.port';
import type { Snapshot } from '../../domain/snapshot';

const esc = (s: string | number | null | undefined) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const money = (s: string) => `${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
const TYPE_AR: Record<string, string> = { labor: 'أجور', part: 'قطعة', paint: 'دهان', towing: 'سطحة', storage: 'إيواء', diagnostic: 'فحص', other: 'أخرى' };
const TERMS_AR: Record<string, string> = { prepaid: 'دفع مقدّم', on_delivery: 'عند الاستلام', deferred: 'آجل — يُصدر سند لأمر إلكتروني', installments: 'أقساط', fleet_monthly: 'كشف شهري (أسطول)' };

/**
 * Arabic RTL document renderer. This adapter emits print-ready HTML (A4, @page rules) so it can be
 * turned into PDF/A by the Puppeteer adapter (live) — see docs/backlog.md. Mock returns text/html.
 */
@Injectable()
export class HtmlWorkOrderRenderer implements PdfRendererPort {
  renderWorkOrderVersion(s: Snapshot, o: { signed: boolean; signedAt?: Date | null; signatureRef?: string | null }): Promise<RenderedDocument> {
    const rows = s.items.map((i, n) => `<tr><td>${n + 1}</td><td>${esc(TYPE_AR[i.type] ?? i.type)}</td><td>${esc(i.description_ar)}${i.part_number ? `<br><small>${esc(i.part_number)}</small>` : ''}</td><td>${esc(i.quantity)}</td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>أمر إصلاح ${esc(s.number)}</title>
<style>@page{size:A4;margin:18mm}body{font-family:'IBM Plex Sans Arabic','SF Arabic','Segoe UI',sans-serif;color:#12201C;font-size:12px}h1{font-size:20px;margin:0}.muted{color:#66756F}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0E6B54;padding-bottom:10px;margin-bottom:14px}.box{border:1px solid #D3DCD7;border-radius:8px;padding:10px;margin-bottom:10px}table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#DCEFE6;color:#0A4F3E;text-align:right;padding:6px;font-weight:600}td{padding:6px;border-bottom:1px solid #E4EAE6;vertical-align:top}.tot td{border:0;padding:3px 6px}.tot .g{font-weight:700;font-size:14px}.seal{display:inline-block;border:2px solid #0E6B54;color:#0E6B54;border-radius:6px;padding:2px 10px;font-weight:700;transform:rotate(-4deg)}.foot{margin-top:16px;font-size:10.5px;color:#66756F}.num{font-variant-numeric:tabular-nums}code{font-size:10px;word-break:break-all}</style></head><body>
<div class="hdr"><div><h1>أمر إصلاح ${esc(s.number)}</h1><div class="muted">النسخة ${s.version} · ${esc(new Date(s.created_at).toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))}</div></div><div>${o.signed ? '<span class="seal">معتمد بتوقيع العميل</span>' : '<span class="seal" style="border-color:#C27A12;color:#C27A12">بانتظار الاعتماد</span>'}</div></div>
<div class="box"><b>${esc(s.org.name_ar)}</b>${s.org.vat_number ? ` · الرقم الضريبي ${esc(s.org.vat_number)}` : ''}<br><span class="muted">العميل:</span> ${esc(s.customer.name_ar ?? '—')} · <span class="muted">المركبة:</span> ${esc([s.vehicle.make_ar, s.vehicle.model_ar, s.vehicle.year].filter(Boolean).join(' '))} ${s.vehicle.plate ? `· لوحة ${esc(s.vehicle.plate)}` : ''} ${s.vehicle.vin ? `· VIN ${esc(s.vehicle.vin)}` : ''}</div>
${s.reason_ar ? `<div class="box"><span class="muted">سبب التعديل:</span> ${esc(s.reason_ar)}</div>` : ''}
<table class="num"><thead><tr><th>#</th><th>النوع</th><th>البند</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي (قبل الضريبة)</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot num" style="width:45%;margin-inline-start:auto"><tr><td>المجموع</td><td>${money(s.totals.subtotal)}</td></tr>${Number(s.totals.discount) > 0 ? `<tr><td>الخصم</td><td>-${money(s.totals.discount)}</td></tr>` : ''}<tr><td>ضريبة القيمة المضافة 15%</td><td>${money(s.totals.vat)}</td></tr><tr class="g"><td>الإجمالي</td><td>${money(s.totals.total)}</td></tr></table>
<div class="box"><span class="muted">شروط الدفع:</span> ${esc(TERMS_AR[s.payment_terms] ?? s.payment_terms)}${Number(s.deposit_required) > 0 ? ` · دفعة مقدّمة ${money(s.deposit_required)}` : ''}${s.due_date ? ` · الاستحقاق ${esc(s.due_date)}` : ''}<br><span class="muted">توقيعك يثبّت السعر — لا يمكن للورشة زيادته بدون موافقتك. أي تعديل يصدر كنسخة جديدة تحتاج اعتمادك.</span></div>
<div class="foot">بصمة المستند (SHA-256): <code>${esc(o.signatureRef ?? '')}</code>${o.signed && o.signedAt ? `<br>وُقّع في ${esc(o.signedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }))} · شروط العقد ${esc(s.contract_terms_version)}` : ''}<br> صناعية — منصة موثّقة لسوق إصلاح السيارات</div>
</body></html>`;
    return Promise.resolve({ bytes: Buffer.from(html, 'utf8'), mimeType: 'text/html' });
  }
}
