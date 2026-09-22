import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API, Api, errMsg, fmtDate, fmtMoney } from '../core/api';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill } from '../ui/basics';

type Row = {
  work_order_id: string; number: string; status: string; org_name_ar: string | null; plate: string | null;
  ready_at: string | null; days_ready: number; notices_sent: number;
  storage: { chargeable_days: number; per_day: string; amount: string };
  claim: { repair: string; storage: string; total: string };
  can_declare: boolean; reason_ar: string;
};

/** كم اقتربت هذه السيارة من الإعلان — في نظرة. */
function stage(r: Row): { label: string; tone: string } {
  if (r.status === 'abandoned') return { label: 'مُعلنة مهجورة', tone: 'pill-bad' };
  if (r.can_declare) return { label: 'مستوفية — بانتظار قرار الورشة', tone: 'pill-warn' };
  if (r.notices_sent >= 3) return { label: 'اكتملت الإنذارات', tone: 'pill-brass' };
  return { label: `${r.notices_sent}/3 إنذارات`, tone: 'pill-plain' };
}

@Component({
  selector: 'app-abandoned-page',
  imports: [Shell, Kpi, Pill, Eyebrow, Empty, Loading, ErrorBox],
  template: `
    <app-shell title="سيارات لم تُستلم" sub="جاهزة ولم يستلمها أصحابها. بعد المهلة والإنذارات تُسجَّل نظاماً «مركبة مهجورة».">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <app-kpi [value]="waiting().length" label="سيارة بانتظار الاستلام" />
        <app-kpi [value]="declared().length" label="مُعلنة مهجورة" [tone]="declared().length ? 'warn' : undefined" [sub]="declared().length ? 'تحتاج متابعة تنفيذ' : undefined" />
        <app-kpi [value]="readyToDeclare()" label="مستوفية شروط الإعلان" />
        <app-kpi [value]="money(exposure())" label="إجمالي المطالبات المحتملة" />
      </div>
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @else if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @else if (!rows().length) { <app-empty text="لا توجد سيارات متأخرة عن الاستلام — وهذا هو الوضع الطبيعي." /> }
      @else {
        <app-eyebrow>الطابور</app-eyebrow>
        <p class="text-xs text-muted mb-2">الإعلان قرار الورشة، لا الإدارة. من هنا يمكن دفع الإنذار المستحق فقط.</p>
        <div class="card overflow-hidden"><table class="w-full text-sm">
          <thead><tr class="text-muted text-xs"><th class="p-3 text-start">الأمر</th><th class="p-3 text-start">الورشة</th><th class="p-3 text-start">جاهزة منذ</th><th class="p-3 text-start">الحالة</th><th class="p-3 text-start">رسوم الحفظ</th><th class="p-3 text-start">المطالبة</th><th class="p-3"></th></tr></thead>
          <tbody>
            @for (r of rows(); track r.work_order_id) {
              <tr class="border-t border-line">
                <td class="p-3"><div class="font-semibold num">{{ r.number }}</div><div class="text-xs text-muted">{{ r.plate ?? '—' }}</div></td>
                <td class="p-3">{{ r.org_name_ar ?? '—' }}</td>
                <td class="p-3"><div class="num">{{ r.days_ready }} يوماً</div><div class="text-xs text-muted">{{ date(r.ready_at) }}</div></td>
                <td class="p-3"><app-pill [label]="stage(r).label" [tone]="stage(r).tone" /></td>
                <td class="p-3"><div class="num">{{ money(r.storage.amount) }}</div><div class="text-xs text-muted num">{{ r.storage.chargeable_days }} يوم × {{ r.storage.per_day }}</div></td>
                <td class="p-3 num font-semibold">{{ money(r.claim.total) }}</td>
                <td class="p-3 text-end">
                  @if (r.status !== 'abandoned' && r.notices_sent < 3) { <button class="btn-ghost text-xs" [disabled]="busy()" (click)="notice(r.work_order_id)">إرسال الإنذار المستحق</button> }
                  @if (r.status !== 'abandoned' && r.notices_sent >= 3) { <span class="text-xs text-muted">{{ r.reason_ar }}</span> }
                </td>
              </tr>
            }
          </tbody></table></div>
        @if (err(); as m) { <p class="text-sm text-bad mt-3">{{ m }}</p> }
      }
    </app-shell>
  `,
})
export class AbandonedPage {
  private api = inject(Api);
  q = httpResource<Row[]>(() => `${API}/admin/abandoned`);
  rows = computed(() => this.q.value() ?? []);
  declared = computed(() => this.rows().filter((r) => r.status === 'abandoned'));
  waiting = computed(() => this.rows().filter((r) => r.status !== 'abandoned'));
  readyToDeclare = computed(() => this.waiting().filter((r) => r.can_declare).length);
  exposure = computed(() => this.rows().reduce((a, r) => a + Number(r.claim.total), 0));
  busy = signal(false); err = signal<string | null>(null);
  money = fmtMoney; date = fmtDate; stage = stage;
  async notice(id: string) {
    this.busy.set(true); this.err.set(null);
    try { await this.api.post(`/work-orders/${id}/abandoned/notice`, {}); this.q.reload(); }
    catch (e) { this.err.set(errMsg(e)); }
    finally { this.busy.set(false); }
  }
}
