import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { API, Api, fmtDate, short } from '../core/api';
import { INTEG, NOTE, label, tone } from '../core/labels';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Eyebrow, Loading, Pill } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type Integ = { requests: Array<{ id: string; provider: string; operation: string; idempotencyKey: string; status: string; attempts: number; nextAttemptAt: string | null; httpStatus: number | null; errorMessage: string | null; latencyMs: number | null; updatedAt: string }>; webhooks: Array<{ id: string; provider: string; eventType: string; externalEventId: string; status: string; receivedAt: string; errorMessage: string | null }>; dead_letters: Array<{ id: string; eventType: string; aggregateType: string; aggregateId: string; attempts: number; lastError: string | null; createdAt: string }> };
type Note = { id: string; number: string; status: string; amount: string; creditorOrgId: string; dueDate: string; nafezReference: string | null; createdAt: string };

@Component({
  selector: 'app-integrations-page',
  imports: [Shell, Pill, Eyebrow, Empty, Loading, ErrorBox, ReasonDialog, TableModule],
  template: `
    <app-shell title="التكاملات" sub="نفاذ · نافذ · PSP · ZATCA — كل طلب له مفتاح تكرار؛ المتوقف يُعاد يدوياً بسبب">
      <div class="flex gap-2 mb-4">
        @for (t of tabs; track t[0]) { <button class="pill !px-4 !py-2" [class.pill-active]="tab() === t[0]" [class.pill-plain]="tab() !== t[0]" (click)="tab.set(t[0])">{{ t[1] }} {{ t[0] === 'dlq' ? (q.value()?.dead_letters?.length ?? '') : t[0] === 'notes' ? (notes.value()?.length ?? '') : '' }}</button> }
      </div>
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as d) {
        @switch (tab()) {
          @case ('dlq') {
            @if (d.dead_letters.length === 0) { <app-empty text="لا توجد أحداث متوقفة — كل المعالجات تعمل" /> }
            @else { <div class="card overflow-hidden"><p-table [value]="d.dead_letters" dataKey="id">
              <ng-template #header><tr><th>الحدث</th><th>الكيان</th><th>محاولات</th><th>آخر خطأ</th><th>منذ</th><th></th></tr></ng-template>
              <ng-template #body let-x><tr><td class="font-semibold">{{ x.eventType }}</td><td class="num text-xs text-muted">{{ x.aggregateType }} · {{ short(x.aggregateId) }}</td><td class="num">{{ x.attempts }}</td><td class="text-xs text-bad max-w-[380px] truncate" [title]="x.lastError ?? ''">{{ x.lastError }}</td><td class="num text-muted">{{ date(x.createdAt) }}</td><td><button class="btn-ghost !h-8" (click)="retryKey.set(x.id)">إعادة المحاولة</button></td></tr></ng-template>
            </p-table></div> }
          }
          @case ('requests') {
            <div class="card overflow-hidden"><p-table [value]="d.requests" dataKey="id">
              <ng-template #header><tr><th>المزوّد</th><th>العملية</th><th>الحالة</th><th>محاولات</th><th>HTTP</th><th>زمن</th><th>آخر تحديث</th><th></th></tr></ng-template>
              <ng-template #body let-r><tr><td class="font-semibold">{{ r.provider }}</td><td class="text-xs">{{ r.operation }}</td><td><app-pill [label]="integ(r.status)" [tone]="tone(r.status)" /></td><td class="num">{{ r.attempts }}</td><td class="num">{{ r.httpStatus ?? '—' }}</td><td class="num">{{ r.latencyMs != null ? r.latencyMs + 'ms' : '—' }}</td><td class="num text-muted">{{ date(r.updatedAt) }}</td><td>@if ((r.status === 'failed' || r.status === 'dead_letter') && r.idempotencyKey.startsWith('outbox:')) {<button class="btn-ghost !h-8" (click)="retryKey.set(r.idempotencyKey)">إعادة</button>}</td></tr></ng-template>
            </p-table></div>
          }
          @case ('webhooks') {
            <div class="card overflow-hidden"><p-table [value]="d.webhooks" dataKey="id">
              <ng-template #header><tr><th>المزوّد</th><th>الحدث</th><th>المعرّف الخارجي</th><th>الحالة</th><th>استُلم</th><th>خطأ</th></tr></ng-template>
              <ng-template #body let-w><tr><td class="font-semibold">{{ w.provider }}</td><td class="text-xs">{{ w.eventType }}</td><td class="num text-xs">{{ w.externalEventId }}</td><td><app-pill [label]="w.status === 'processed' ? 'معالَج' : w.status === 'failed' ? 'فشل' : 'مستلم'" [tone]="tone(w.status)" /></td><td class="num text-muted">{{ date(w.receivedAt) }}</td><td class="text-xs text-bad">{{ w.errorMessage }}</td></tr></ng-template>
            </p-table></div>
          }
          @case ('notes') {
            <div class="space-y-3"><app-eyebrow>سندات لم تُصدر بعد في نافذ (مسودة / بانتظار الموافقة)</app-eyebrow>
              @if (notes.value()?.length === 0) { <app-empty text="لا سندات معلّقة — كل السندات صادرة" /> }
              @else { <div class="card overflow-hidden"><p-table [value]="notes.value() ?? []" dataKey="id">
                <ng-template #header><tr><th>السند</th><th>الحالة</th><th>المبلغ</th><th>مرجع نافذ</th><th>أُنشئ</th></tr></ng-template>
                <ng-template #body let-n><tr><td class="num font-semibold">{{ n.number }}</td><td><app-pill [label]="note(n.status)" [tone]="tone(n.status)" /></td><td class="num">{{ n.amount }}</td><td class="num text-xs">{{ n.nafezReference ?? '—' }}</td><td class="num text-muted">{{ date(n.createdAt) }}</td></tr></ng-template>
              </p-table></div> }
            </div>
          }
        }
      }
      @if (retryKey(); as k) { <app-reason-dialog title="إعادة محاولة التكامل" [hint]="k" confirmLabel="إعادة المحاولة الآن" [confirm]="retry(k)" (closed)="retryKey.set(null)" /> }
    </app-shell>
  `,
})
export class IntegrationsPage {
  private api = inject(Api);
  tabs = [['dlq', 'متوقف (DLQ)'], ['requests', 'طلبات التكامل'], ['webhooks', 'Webhooks'], ['notes', 'سندات معلّقة']] as const;
  tab = signal<string>('dlq');
  retryKey = signal<string | null>(null);
  q = httpResource<Integ>(() => `${API}/admin/integrations`);
  notes = httpResource<Note[]>(() => `${API}/admin/promissory-notes?status=draft,pending_consent&limit=100`);
  date = fmtDate; short = short; tone = tone;
  integ = (s: string) => label(INTEG, s); note = (s: string) => label(NOTE, s);
  constructor() { poll(this.q, 20_000); }
  retry = (key: string) => async (reason: string) => { await this.api.post(`/admin/integrations/retry?key=${encodeURIComponent(key)}`, { reason_ar: reason }); this.q.reload(); };
}
