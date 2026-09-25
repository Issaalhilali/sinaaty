import { Component, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { API, fmtDate, fmtMoney, short } from '../core/api';
import { NOTE, label, tone } from '../core/labels';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Loading, Pill } from '../ui/basics';

type Note = { id: string; number: string; status: string; amount: string; outstandingAmount: string; dueDate: string; nafezReference: string | null; creditorOrgId: string; debtorUserId: string | null; debtorOrgId: string | null; workOrderId: string | null; partOrderId: string | null; createdAt: string };

@Component({
  selector: 'app-notes-page',
  imports: [Shell, Pill, Empty, Loading, ErrorBox, TableModule],
  template: `
    <app-shell title="السندات والمخالصات" sub="سند لأمر إلكتروني (نافذ) لكل دفع آجل — يُغلق تلقائياً بالمخالصة عند السداد">
      <div class="flex gap-2 mb-4 items-center">
        @for (o of filters; track o[0]) { <button class="pill !px-4 !py-2" [class.pill-active]="f() === o[0]" [class.pill-plain]="f() !== o[0]" (click)="f.set(o[0])">{{ o[1] }}</button> }
        <span class="ms-auto text-sm text-muted">القائم: <span class="num font-bold text-ink">{{ money(total()) }}</span></span>
      </div>
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as rows) {
        @if (rows.length === 0) { <app-empty text="لا سندات" /> }
        @else {
          <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
            <ng-template #header><tr><th>السند</th><th>الحالة</th><th>المبلغ</th><th>القائم</th><th>الاستحقاق</th><th>مرجع نافذ</th><th>المرجع</th></tr></ng-template>
            <ng-template #body let-n>
              <tr><td class="num font-semibold">{{ n.number }}</td><td><app-pill [label]="overdue(n) ? 'متأخر' : st(n.status)" [tone]="overdue(n) ? 'pill-bad' : tone(n.status)" /></td><td class="num">{{ money(n.amount) }}</td><td class="num font-semibold">{{ money(n.outstandingAmount) }}</td><td class="num text-muted">{{ date(n.dueDate) }}</td><td class="num text-xs">{{ n.nafezReference ?? '—' }}</td><td class="num text-xs text-muted">{{ n.workOrderId ? 'WO ' + short(n.workOrderId) : n.partOrderId ? 'PO ' + short(n.partOrderId) : '—' }}</td></tr>
            </ng-template>
          </p-table></div>
        }
      }
    </app-shell>
  `,
})
export class NotesPage {
  filters = [['open', 'سارية'], ['overdue', 'متأخرة'], ['all', 'الكل']] as const;
  f = signal<'open' | 'overdue' | 'all'>('open');
  q = httpResource<Note[]>(() => `${API}/admin/promissory-notes?limit=200${this.f() === 'open' ? '&status=issued,partially_settled,in_enforcement' : this.f() === 'overdue' ? '&overdue=true' : ''}`);
  total = computed(() => (this.q.value() ?? []).reduce((a, n) => a + Number(n.outstandingAmount), 0));
  money = fmtMoney; date = fmtDate; short = short; tone = tone;
  st = (s: string) => label(NOTE, s);
  overdue = (n: Note) => ['issued', 'partially_settled'].includes(n.status) && new Date(n.dueDate) < new Date();
}
