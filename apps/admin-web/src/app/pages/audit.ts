import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API, fmtDate, short } from '../core/api';
import { session } from '../core/session';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Loading } from '../ui/basics';

type Row = { id: string; occurredAt: string; actorUserId: string | null; actorType: string; orgId: string | null; action: string; entityType: string; entityId: string | null; before: unknown; after: unknown; hash: string; prevHash: string | null };

/** سلسلة تجزئة لا تُعدَّل — كل إجراء حساس هنا باسم منفّذه وسببه، ويُصدَّر CSV لمراجعٍ خارجي. */
@Component({
  selector: 'app-audit-page',
  imports: [Shell, Empty, Loading, ErrorBox, FormsModule],
  template: `
    <app-shell title="سجل التدقيق" sub="سلسلة تجزئة غير قابلة للتعديل — كل إجراء حساس يظهر هنا باسم منفّذه وسببه">
      <div class="flex gap-2 mb-4"><input class="input max-w-xs num" dir="ltr" placeholder="action (e.g. escrow.release)" [ngModel]="action()" (ngModelChange)="action.set($event)" /><input class="input max-w-xs num" dir="ltr" placeholder="entity_type" [ngModel]="entity()" (ngModelChange)="entity.set($event)" /><button class="btn-ghost ms-auto" (click)="exportCsv()">تصدير CSV</button></div>
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as rows) {
        @if (rows.length === 0) { <app-empty text="لا سجلات" /> }
        @else {
          <div class="card overflow-hidden">@if (rows.length === 0) {<p class="text-muted text-sm text-center py-6">لا سجلات تطابق المرشّح.</p>} @else {<table class="tbl"><thead><tr><th>الوقت</th><th>الإجراء</th><th>الكيان</th><th>المنفّذ</th><th>التجزئة</th><th></th></tr></thead><tbody>
            @for (r of rows; track r.id) {
              <tr><td class="num text-muted whitespace-nowrap">{{ date(r.occurredAt) }}</td><td class="font-semibold num">{{ r.action }}</td><td class="num text-xs text-muted">{{ r.entityType }} · {{ short(r.entityId) }}</td><td class="num text-xs">{{ r.actorType }} · {{ r.actorUserId ? short(r.actorUserId) : 'system' }}</td><td class="num text-[10px] text-muted">{{ r.hash.slice(0, 12) }}…</td><td><button class="text-seal text-xs font-bold" (click)="open.set(open() === r.id ? null : r.id)">{{ open() === r.id ? 'إخفاء' : 'تفاصيل' }}</button></td></tr>
              @if (open() === r.id) { <tr><td colspan="6" class="bg-[#F7F9F7]"><pre class="text-[11px] whitespace-pre-wrap num" dir="ltr">{{ detail(r) }}</pre></td></tr> }
            }
          </tbody></table>}</div>
        }
      }
    </app-shell>
  `,
})
export class AuditPage {
  action = signal(''); entity = signal(''); open = signal<string | null>(null);
  private query = () => `${this.action() ? `&action=${encodeURIComponent(this.action())}` : ''}${this.entity() ? `&entity_type=${encodeURIComponent(this.entity())}` : ''}`;
  q = httpResource<Row[]>(() => `${API}/admin/audit?limit=200${this.query()}`);
  date = fmtDate; short = short;
  detail = (r: Row) => JSON.stringify({ before: r.before, after: r.after, prev_hash: r.prevHash, hash: r.hash }, null, 2);
  /** التصدير بـ fetch لا HttpClient: الردّ ملفٌ لا JSON، والرمز يُرفق يدوياً. */
  async exportCsv() {
    const r = await fetch(`${API}/admin/audit.csv?${this.query().replace(/^&/, '')}`, { headers: { authorization: `Bearer ${session.token}` } });
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement('a'); a.href = url; a.download = 'audit.csv'; a.click(); URL.revokeObjectURL(url);
  }
}
