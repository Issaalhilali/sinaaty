import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { API, fmtDate, fmtMoney } from '../core/api';
import { DISPUTE_CATEGORY, DISPUTE_STATUS, label, tone } from '../core/labels';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, FilterPills, Loading, Pill } from '../ui/basics';

type D = { id: string; number: string; status: string; category: string; descriptionAr: string; claimedAmount: string | null; workOrderId: string | null; partOrderId: string | null; assignedTo: string | null; createdAt: string };
const OPEN = 'open,under_review,awaiting_parties,escalated';

@Component({
  selector: 'app-disputes-page',
  imports: [Shell, FilterPills, Pill, Empty, Loading, ErrorBox, RouterLink, TableModule],
  template: `
    <app-shell title="غرفة النزاعات" sub="فتح النزاع يجمّد المبلغ فوراً — لا يتحرك المال إلا بقرار مكتوب">
      <app-filter-pills [options]="filters" [value]="status()" (valueChange)="status.set($event)" />
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as rows) {
        @if (rows.length === 0) { <app-empty text="لا نزاعات في هذا الطابور" /> }
        @else {
          <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
            <ng-template #header><tr><th>النزاع</th><th>الحالة</th><th>الفئة</th><th>المطالبة</th><th>الوصف</th><th>فُتح</th><th></th></tr></ng-template>
            <ng-template #body let-d>
              <tr><td class="num font-semibold">{{ d.number }}</td><td><app-pill [label]="st(d.status)" [tone]="tone(d.status)" /></td><td>{{ cat(d.category) }}</td><td class="num">{{ d.claimedAmount ? money(d.claimedAmount) : '—' }}</td>
                <td class="max-w-[360px] truncate text-muted" [title]="d.descriptionAr">{{ d.descriptionAr }}</td><td class="num text-muted">{{ date(d.createdAt) }}</td>
                <td><a class="text-seal font-bold" [routerLink]="['/disputes', d.id]">فتح الغرفة</a></td></tr>
            </ng-template>
          </p-table></div>
        }
      }
    </app-shell>
  `,
})
export class DisputesPage {
  filters = [[OPEN, 'المفتوحة'], ['resolved', 'محسومة'], ['closed', 'مغلقة'], ['', 'الكل']] as const;
  status = signal<string>(OPEN);
  q = httpResource<D[]>(() => `${API}/admin/disputes${this.status() ? `?status=${this.status()}` : ''}`);
  tone = tone; money = fmtMoney; date = fmtDate;
  st = (s: string) => label(DISPUTE_STATUS, s);
  cat = (c: string) => label(DISPUTE_CATEGORY, c);
  constructor() { poll(this.q, 30_000); }
}
