import { Component, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API, API_ORIGIN, fmtDate, fmtMoney, fmtMonth } from '../core/api';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill } from '../ui/basics';

type Org = { id: string; legalNameAr: string; tradeNameAr: string | null; status: string; phoneE164?: string | null; createdAt: string };
type Overview = {
  vehicles: number; openWorkOrders: number; awaitingApproval: number; monthSpend: string; openNotes: number;
  policy: { id: string; name_ar: string; auto_approve_below: string; monthly_budget: string | null } | null;
  budget_remaining: string | null; budget_used_pct: string | null;
};
type Pending = {
  id: string; number: string; total: string; workshopNameAr: string | null; plate: string | null; assetCode: string | null; requestedAt: string;
  policy: { outcome: string; approvals_required: number; blocked: boolean; reason_ar: string };
  approvals: Array<{ by: string | null; decision: string; note_ar: string | null; at: string }>;
  ready_to_sign: boolean;
};
type Statement = { id: string; periodStart: string; periodEnd: string; total: string; invoiceIds: string[]; status: string };

const OUTCOME_AR: Record<string, string> = {
  auto: 'اعتماد تلقائي (تحت الحد)', one_approver: 'يحتاج معتمداً واحداً', two_approvers: 'يحتاج معتمدَين',
  workshop_not_allowed: 'الورشة خارج القائمة المعتمدة', over_budget: 'يتجاوز ميزانية الشهر',
};

/** أسطولٌ مفتوح: أرقامه، ما ينتظر قراره، وكشوفه الشهرية. */
@Component({
  selector: 'app-fleet-detail',
  imports: [Kpi, Pill, Eyebrow, Empty, Loading, ErrorBox],
  template: `
    @if (overview.isLoading() && !overview.value()) { <app-loading /> }
    @else if (overview.error(); as e) { <app-error-box [error]="e" (retry)="overview.reload()" /> }
    @else {
      @let o = overview.value();
      <div class="mt-4 space-y-5">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <app-kpi [value]="o?.vehicles ?? 0" label="مركبة مسجّلة" />
          <app-kpi [value]="o?.openWorkOrders ?? 0" label="إصلاحات مفتوحة" />
          <app-kpi [value]="o?.awaitingApproval ?? 0" label="بانتظار قرار الأسطول" [tone]="o?.awaitingApproval ? 'warn' : undefined" />
          <app-kpi [value]="money(o?.monthSpend)" label="التزام هذا الشهر" [sub]="o?.budget_used_pct ? o!.budget_used_pct + '% من الميزانية' : undefined" [tone]="+(o?.budget_used_pct ?? 0) > 85 ? 'warn' : undefined" />
          <app-kpi [value]="o?.openNotes ?? 0" label="سندات قائمة" />
        </div>
        @if (o?.policy; as p) {
          <p class="text-xs text-muted">سياسة الصرف: «{{ p.name_ar }}» — اعتماد تلقائي تحت {{ money(p.auto_approve_below) }}@if (p.monthly_budget) { · ميزانية شهرية {{ money(p.monthly_budget) }} (المتبقي {{ money(o?.budget_remaining) }}) }</p>
        } @else { <p class="text-xs text-warn">لا توجد سياسة صرف — كل إصلاح يحتاج معتمداً واحداً.</p> }
        <section>
          <app-eyebrow>بانتظار قرار الأسطول</app-eyebrow>
          @if (pending.isLoading() && !pending.value()) { <app-loading /> }
          @else if (!pending.value()?.length) { <app-empty text="لا يوجد ما ينتظر قراراً — كل الإصلاحات إما معتمدة أو تحت الحد التلقائي." /> }
          @else {
            <div class="card overflow-hidden"><table class="w-full text-sm">
              <thead><tr class="text-muted text-xs"><th class="p-3 text-start">الأمر</th><th class="p-3 text-start">الورشة</th><th class="p-3 text-start">المبلغ</th><th class="p-3 text-start">ماذا تقول السياسة</th><th class="p-3 text-start">القرارات</th></tr></thead>
              <tbody>
                @for (p of pending.value(); track p.id) {
                  <tr class="border-t border-line">
                    <td class="p-3"><div class="font-semibold num">{{ p.number }}</div><div class="text-xs text-muted">{{ p.assetCode ?? p.plate ?? '—' }} · {{ date(p.requestedAt) }}</div></td>
                    <td class="p-3">{{ p.workshopNameAr ?? '—' }}</td>
                    <td class="p-3 num font-semibold">{{ money(p.total) }}</td>
                    <td class="p-3"><app-pill [label]="outcome[p.policy.outcome] ?? p.policy.outcome" [tone]="p.policy.blocked ? 'pill-bad' : p.ready_to_sign ? 'pill-seal' : 'pill-brass'" />@if (p.policy.blocked) {<div class="text-xs text-bad mt-1">{{ p.policy.reason_ar }}</div>}</td>
                    <td class="p-3 text-xs">
                      @if (p.approvals.length === 0) { <span class="text-muted">لا قرارات بعد ({{ p.policy.approvals_required }} مطلوب)</span> }
                      @for (a of p.approvals; track $index) { <div>{{ a.decision === 'approved' ? '✓' : '✗' }} {{ a.by ?? '—' }}@if (a.note_ar) {<span class="text-muted"> — {{ a.note_ar }}</span>}</div> }
                      @if (p.ready_to_sign) { <div class="text-seal font-bold mt-1">جاهز للتوقيع</div> }
                    </td>
                  </tr>
                }
              </tbody></table></div>
          }
        </section>
        <section>
          <app-eyebrow>الكشوف الشهرية</app-eyebrow>
          @if (statements.isLoading() && !statements.value()) { <app-loading /> }
          @else if (!statements.value()?.length) { <app-empty text="لم يُنشأ كشف بعد — يولّده الأسطول من بوابته لكل شهر." /> }
          @else {
            <div class="card divide-y divide-line">
              @for (st of statements.value(); track st.id) {
                <div class="p-3 flex items-center gap-3 text-sm">
                  <div class="flex-1"><span class="font-semibold num">{{ month(st.periodStart) }}</span><span class="text-muted text-xs ms-2">{{ st.invoiceIds.length }} فاتورة</span></div>
                  <span class="num font-semibold">{{ money(st.total) }}</span>
                  <a class="btn-ghost text-xs" [href]="origin + '/v1/fleet/statements/' + st.id + '/export.csv'" target="_blank" rel="noreferrer">CSV للمحاسب</a>
                </div>
              }
            </div>
          }
        </section>
      </div>
    }
  `,
})
export class FleetDetail {
  orgId = input.required<string>();
  overview = httpResource<Overview>(() => `${API}/fleet/${this.orgId()}/overview`);
  pending = httpResource<Pending[]>(() => `${API}/fleet/${this.orgId()}/approvals`);
  statements = httpResource<Statement[]>(() => `${API}/fleet/${this.orgId()}/statements`);
  outcome = OUTCOME_AR; money = fmtMoney; date = fmtDate; month = fmtMonth; origin = API_ORIGIN;
}

@Component({
  selector: 'app-fleets-page',
  imports: [Shell, Pill, Empty, Loading, ErrorBox, FleetDetail],
  template: `
    <app-shell title="الأساطيل" sub="شركات تملك مركبات كثيرة — سياسات صرفها، ما ينتظر قرارها، وكشوفها الشهرية">
      @if (orgs.isLoading() && !orgs.value()) { <app-loading /> }
      @else if (orgs.error(); as e) { <app-error-box [error]="e" (retry)="orgs.reload()" /> }
      @else if (!orgs.value()?.length) { <app-empty text="لا توجد شركات أساطيل مسجّلة بعد. تُنشأ من التطبيق أو عبر التهيئة الميدانية." /> }
      @else {
        <div class="space-y-3">
          @for (org of orgs.value(); track org.id) {
            <div class="card p-4">
              <button class="w-full flex items-center gap-3 text-start" (click)="openId.set(openId() === org.id ? null : org.id)">
                <div class="flex-1"><div class="font-bold">{{ org.tradeNameAr ?? org.legalNameAr }}</div><div class="text-xs text-muted">{{ org.legalNameAr }}</div></div>
                <app-pill [label]="org.status === 'active' ? 'نشطة' : org.status" [tone]="org.status === 'active' ? 'pill-seal' : 'pill-plain'" />
                <span class="text-muted text-xs">{{ openId() === org.id ? 'إخفاء' : 'عرض التفاصيل' }}</span>
              </button>
              @if (openId() === org.id) { <app-fleet-detail [orgId]="org.id" /> }
            </div>
          }
        </div>
      }
    </app-shell>
  `,
})
export class FleetsPage {
  openId = signal<string | null>(null);
  orgs = httpResource<Org[]>(() => `${API}/admin/organizations?type=fleet_company&status=active&limit=100`);
}
