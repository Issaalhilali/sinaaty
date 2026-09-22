import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { API, Api, fmtDate } from '../core/api';
import { ROLE, label, tone } from '../core/labels';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Loading, Pill } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type U = { id: string; phone: string | null; fullNameAr: string | null; status: string; platformRole: string; nafathVerifiedAt: string | null; createdAt: string };

@Component({
  selector: 'app-users-page',
  imports: [Shell, Pill, Empty, Loading, ErrorBox, ReasonDialog, FormsModule, SelectModule, TableModule],
  template: `
    <app-shell title="المستخدمون وأدوار المنصة" sub="أدوار فريق المنصة: دعم · عمليات · مالية · امتثال · مشرف عام — تغيير الدور لمشرف عام فقط وبسبب">
      <input class="input max-w-sm mb-4 num" dir="ltr" placeholder="بحث بالجوال أو الاسم" [ngModel]="q()" (ngModelChange)="q.set($event)" />
      @if (list.isLoading() && !list.value()) { <app-loading /> }
      @if (list.error(); as e) { <app-error-box [error]="e" (retry)="list.reload()" /> }
      @if (list.value(); as rows) {
        @if (rows.length === 0) { <app-empty text="لا نتائج" /> }
        @else {
          <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
            <ng-template #header><tr><th>الاسم</th><th>الجوال</th><th>نفاذ</th><th>الحالة</th><th>دور المنصة</th><th>أُنشئ</th><th></th></tr></ng-template>
            <ng-template #body let-u>
              <tr><td class="font-semibold">{{ u.fullNameAr ?? '—' }}</td><td class="num">{{ u.phone }}</td><td>@if (u.nafathVerifiedAt) {<app-pill label="موثّق" tone="pill-seal" />} @else {<app-pill label="—" />}</td><td><app-pill [label]="u.status" [tone]="tone(u.status)" /></td><td><app-pill [label]="roleOf(u.platformRole)" [tone]="u.platformRole === 'none' ? 'pill-plain' : 'pill-brass'" /></td><td class="num text-muted">{{ date(u.createdAt) }}</td>
                <td><p-select [options]="roleOptions" optionLabel="label" optionValue="value" placeholder="تغيير الدور…" [ngModel]="null" (onChange)="pick(u, $event.value)" styleClass="!h-8 text-xs" appendTo="body" /></td></tr>
            </ng-template>
          </p-table></div>
        }
      }
      @if (role(); as r) { <app-reason-dialog [title]="'تعيين ' + roleOf(r.role) + ' — ' + (r.user.fullNameAr ?? r.user.phone)" confirmLabel="تعيين" [confirm]="setRole(r.user.id, r.role)" (closed)="role.set(null)" /> }
    </app-shell>
  `,
})
export class UsersPage {
  private api = inject(Api);
  q = signal('');
  list = httpResource<U[]>(() => `${API}/admin/users?q=${encodeURIComponent(this.q())}`);
  role = signal<{ user: U; role: string } | null>(null);
  roleOptions = Object.entries(ROLE).map(([value, label]) => ({ value, label }));
  date = fmtDate; tone = tone;
  roleOf = (r: string) => label(ROLE, r);
  pick(user: U, r: string | null) { if (r) this.role.set({ user, role: r }); }
  setRole = (id: string, r: string) => async (reason: string) => { await this.api.put(`/admin/users/${id}/platform-role`, { platform_role: r, reason_ar: reason }); this.list.reload(); };
}
