import { Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { API, fmtDate } from '../core/api';
import { ORG_STATUS, ORG_TYPE, label, tone } from '../core/labels';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, FilterPills, Loading, Pill } from '../ui/basics';

type Org = { id: string; type: string; status: string; legalNameAr: string; tradeNameAr: string | null; crNumber: string | null; vatNumber: string | null; createdAt: string };

@Component({
  selector: 'app-organizations-page',
  imports: [Shell, FilterPills, Pill, Empty, Loading, ErrorBox, RouterLink, TableModule],
  template: `
    <app-shell title="المنشآت و KYB" sub="طابور التحقق أولاً — اعتماد/رفض بسبب مكتوب يُسجَّل في سجل التدقيق">
      <app-filter-pills [options]="filters" [value]="status()" (valueChange)="status.set($event)" />
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as rows) {
        @if (rows.length === 0) { <app-empty text="لا توجد منشآت في هذا الطابور" /> }
        @else {
          <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
            <ng-template #header><tr><th>المنشأة</th><th>النوع</th><th>السجل التجاري</th><th>الرقم الضريبي</th><th>الحالة</th><th>أُنشئت</th><th></th></tr></ng-template>
            <ng-template #body let-o>
              <tr><td class="font-semibold">{{ o.tradeNameAr ?? o.legalNameAr }}</td><td>{{ orgType(o.type) }}</td><td class="num">{{ o.crNumber ?? '—' }}</td><td class="num">{{ o.vatNumber ?? '—' }}</td>
                <td><app-pill [label]="orgStatus(o.status)" [tone]="tone(o.status)" /></td><td class="num text-muted">{{ date(o.createdAt) }}</td>
                <td><a class="text-seal font-bold" [routerLink]="['/organizations', o.id]">فتح</a></td></tr>
            </ng-template>
          </p-table></div>
        }
      }
    </app-shell>
  `,
})
export class OrganizationsPage {
  filters = [['pending_kyb', 'بانتظار التحقق'], ['active', 'نشطة'], ['suspended', 'موقوفة'], ['', 'الكل']] as const;
  status = signal('pending_kyb');
  q = httpResource<Org[]>(() => `${API}/admin/organizations?limit=200${this.status() ? `&status=${this.status()}` : ''}`);
  tone = tone; date = fmtDate;
  orgType = (t: string) => label(ORG_TYPE, t);
  orgStatus = (s: string) => label(ORG_STATUS, s);
}
