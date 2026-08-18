import { Injectable } from '@nestjs/common';
import type { SettlementRendererPort } from '../../application/ports/settlement-renderer.port';
import type { PromissoryNote, Settlement } from '../../domain/note';
const esc = (s: string | number | null | undefined) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const money = (s: string) => `${Number(s).toLocaleString('en-US', { minimumFractionDigits: 2 })} ر.س`;
const dt = (d: Date | null | undefined) => (d ? d.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' }) : '—');
const STYLE = `@page{size:A4;margin:18mm}body{font-family:'IBM Plex Sans Arabic','SF Arabic','Segoe UI',sans-serif;color:#12201C;font-size:12.5px;line-height:1.7}h1{font-size:20px;margin:0 0 4px}.hdr{border-bottom:2px solid #0E6B54;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between}.box{border:1px solid #D3DCD7;border-radius:8px;padding:12px;margin-bottom:10px}.muted{color:#66756F}.seal{display:inline-block;border:2px solid #0E6B54;color:#0E6B54;border-radius:6px;padding:2px 10px;font-weight:700}.num{font-variant-numeric:tabular-nums}code{font-size:10px;word-break:break-all}table{width:100%;border-collapse:collapse}td,th{padding:5px 6px;border-bottom:1px solid #E4EAE6;text-align:right}`;
const STATUS_AR: Record<string, string> = { draft: 'مسودة', pending_consent: 'بانتظار موافقة المدين', issued: 'ساري', partially_settled: 'مسدَّد جزئياً', closed: 'مغلق (مسدَّد)', cancelled: 'ملغى', rejected: 'مرفوض', in_enforcement: 'قيد التنفيذ', enforced: 'مُنفَّذ' };
@Injectable()
export class HtmlSettlementRenderer implements SettlementRendererPort {
  render(s: Settlement, n: PromissoryNote | null, p: { creditorNameAr: string; debtorNameAr: string | null }) {
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مخالصة ${esc(s.number)}</title><style>${STYLE}</style></head><body>
<div class="hdr"><div><h1>مخالصة رقمية ${esc(s.number)}</h1><div class="muted">${esc(dt(s.issuedAt))}</div></div><span class="seal">إبراء ذمة</span></div>
<div class="box">يُقرّ <b>${esc(p.creditorNameAr)}</b> (الدائن) بأنه استلم من <b>${esc(p.debtorNameAr ?? '—')}</b> (المدين) مبلغاً وقدره <b class="num">${money(s.amountSettled)}</b>، سداداً كاملاً للسند لأمر رقم <b>${esc(n?.number ?? '—')}</b>${n?.nafezReference ? ` (مرجع نافذ ${esc(n.nafezReference)})` : ''}، وبذلك تبرأ ذمة المدين من هذا الدين، ولا يحق للدائن المطالبة به مستقبلاً.</div>
<div class="box"><span class="muted">إغلاق السند في نافذ:</span> ${esc(dt(n?.closedAt))} · <span class="muted">تاريخ الاستحقاق الأصلي:</span> ${esc(n?.dueDate?.toISOString().slice(0, 10))}</div>
<div class="muted">بصمة المستند (SHA-256): <code>${esc(s.contentSha256)}</code><br>صدرت آلياً عبر منصة صناعتي فور تأكيد السداد — وثيقة قابلة للتحقق برقمها وبصمتها.</div>
</body></html>`;
    return Promise.resolve({ bytes: Buffer.from(html, 'utf8'), mimeType: 'text/html' as const });
  }
  renderNote(n: PromissoryNote, p: { creditorNameAr: string; debtorNameAr: string | null }, events: Array<{ toStatus: string; createdAt: Date; noteAr: string | null }>) {
    const rows = events.map((e) => `<tr><td>${esc(dt(e.createdAt))}</td><td>${esc(STATUS_AR[e.toStatus] ?? e.toStatus)}</td><td>${esc(e.noteAr)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سند لأمر ${esc(n.number)}</title><style>${STYLE}</style></head><body>
<div class="hdr"><div><h1>سند لأمر إلكتروني ${esc(n.number)}</h1><div class="muted">مرجع نافذ: ${esc(n.nafezReference ?? '—')} · ${esc(n.placeOfIssue)}</div></div><span class="seal">${esc(STATUS_AR[n.status] ?? n.status)}</span></div>
<div class="box">أتعهد أنا <b>${esc(p.debtorNameAr ?? '—')}</b> بأن أدفع لأمر <b>${esc(p.creditorNameAr)}</b> مبلغاً وقدره <b class="num">${money(n.amount)}</b> في تاريخ <b>${esc(n.dueDate.toISOString().slice(0, 10))}</b>. سند تنفيذي وفق نظام التنفيذ — صادر عبر منصة نافذ.<br><span class="muted">المتبقي: <b class="num">${money(n.outstandingAmount)}</b> · يُغلق تلقائياً فور سداد الفاتورة عبر صناعتي.</span></div>
<table><thead><tr><th>التاريخ</th><th>الحالة</th><th>ملاحظة</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
    return Promise.resolve({ bytes: Buffer.from(html, 'utf8'), mimeType: 'text/html' as const });
  }
}
