import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API, fmtMoney } from '../core/api';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { ErrorBox, Eyebrow, Kpi, Loading, Pill } from '../ui/basics';

/**
 * غرفة عمليات اليوم — الشاشة التي تُفتح أول الدوام وتبقى مفتوحة.
 *
 * ليست مؤشرات عرض: كل صفٍّ هنا شيءٌ ينتظر إنساناً *الآن* — عميلٌ نشر عطله ولا أحد يرد،
 * مزادُ قطعةٍ يموت صفراً، مشترٍ صامتٌ حجز بضاعة بائع، مالٌ مجمّد أو فات موعد تحرره.
 * حين تفرغ الغرفة يكون السوق يدير نفسه — وهذا هو المقصود.
 */
type Ops = {
  repair_no_offers: { count: number; rows: Array<{ id: string; number: string; titleAr: string; createdAt: string }> };
  parts_ending_no_bids: { count: number; rows: Array<{ id: string; number: string; partNameAr: string; endsAt: string }> };
  part_orders_unpaid: { count: number; rows: Array<{ id: string; number: string; total: string; buyerNameAr: string | null; createdAt: string }> };
  wo_awaiting_approval: { count: number; rows: Array<{ id: string; number: string; titleAr: string | null; orgNameAr: string | null; since: string }> };
  escrow_frozen: { count: number; total: string };
  escrow_past_release: { count: number; total: string };
  notes_overdue: { count: number; outstanding: string };
  integrations: { dead_letters: number; stalled: number };
  outbox_pending: number;
  ledger_imbalance: string;
};

export const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `منذ ${m} د` : m < 60 * 24 ? `منذ ${Math.round(m / 60)} س` : `منذ ${Math.round(m / 1440)} يوم`;
};
export const until = (iso: string) => { const m = Math.round((new Date(iso).getTime() - Date.now()) / 60_000); return m <= 0 ? 'انتهى' : m < 60 ? `يبقى ${m} د` : `يبقى ${Math.round(m / 60)} س`; };

@Component({
  selector: 'app-queue',
  imports: [Pill],
  template: `
    <div class="card p-4">
      <div class="flex items-baseline justify-between mb-2">
        <div><span class="font-bold text-[14.5px]">{{ title() }}</span><span class="text-muted text-[12px] mr-2">{{ hint() }}</span></div>
        <app-pill [label]="'' + count()" [tone]="count() > 0 ? 'pill-warn' : 'pill-seal'" />
      </div>
      @if (count() === 0) { <div class="text-muted text-[12.5px] py-2">{{ empty() }}</div> } @else { <div class="divide-y divide-line/60"><ng-content /></div> }
    </div>
  `,
})
export class Queue { title = input.required<string>(); hint = input.required<string>(); count = input.required<number>(); empty = input.required<string>(); }

@Component({
  selector: 'app-queue-row',
  template: `<div class="flex items-baseline justify-between gap-3 py-1.5 text-[13px]"><span class="truncate">{{ main() }}@if (sub()) {<span class="text-muted"> · {{ sub() }}</span>}</span><span class="text-muted num whitespace-nowrap">{{ side() }}</span></div>`,
})
export class QueueRow { main = input.required<string>(); side = input.required<string>(); sub = input<string | null | undefined>(); }

@Component({
  selector: 'app-ops-page',
  imports: [Shell, Kpi, Eyebrow, Loading, ErrorBox, Queue, QueueRow, RouterLink],
  template: `
    <app-shell title="غرفة العمليات" sub="ما ينتظر تدخّلاً الآن · تتحدث كل 20 ثانية">
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as d) {
        @if (d.ledger_imbalance !== '0.00') { <div class="card p-4 mb-4 border-2 border-warn text-warn font-bold">⚠ ميزان الدفتر منحرف: {{ d.ledger_imbalance }} — أوقف كل إجراءٍ مالي وراجع فوراً</div> }
        <div class="grid grid-cols-4 gap-3 mb-4">
          <a routerLink="/payments"><app-kpi [value]="d.escrow_frozen.count" label="مبالغ مجمّدة (نزاعات)" [sub]="money(d.escrow_frozen.total)" [tone]="d.escrow_frozen.count > 0 ? 'warn' : undefined" /></a>
          <a routerLink="/payments"><app-kpi [value]="d.escrow_past_release.count" label="فات موعد تحرره ولم يتحرر" [sub]="money(d.escrow_past_release.total)" [tone]="d.escrow_past_release.count > 0 ? 'warn' : undefined" /></a>
          <a routerLink="/notes"><app-kpi [value]="d.notes_overdue.count" label="سند متأخر السداد" [sub]="money(d.notes_overdue.outstanding)" [tone]="d.notes_overdue.count > 0 ? 'warn' : undefined" /></a>
          <a routerLink="/integrations"><app-kpi [value]="d.integrations.dead_letters + d.integrations.stalled" label="تكاملات تحتاج نظرة" [sub]="d.integrations.dead_letters + ' DLQ · ' + d.integrations.stalled + ' متعثر · ' + d.outbox_pending + ' بالانتظار'" [tone]="d.integrations.dead_letters > 0 ? 'warn' : undefined" /></a>
        </div>
        <app-eyebrow>طوابير السوق</app-eyebrow>
        <div class="grid grid-cols-2 gap-4">
          <app-queue title="عملاء بلا عروض" hint="طلب إصلاح منشور ولا ورشة ردّت" [count]="d.repair_no_offers.count" empty="كل طلبٍ منشور وصله عرض — السوق يرد">
            @for (r of d.repair_no_offers.rows; track r.id) { <app-queue-row [main]="r.titleAr" [sub]="r.number" [side]="ago(r.createdAt)" /> }
          </app-queue>
          <app-queue title="مزادات تنتهي صفراً" hint="طلب قطعة يوشك أن يموت بلا عرض" [count]="d.parts_ending_no_bids.count" empty="لا مزاد يحتضر — الموردون يزايدون">
            @for (r of d.parts_ending_no_bids.rows; track r.id) { <app-queue-row [main]="r.partNameAr" [sub]="r.number" [side]="until(r.endsAt)" /> }
          </app-queue>
          <app-queue title="مشترون صامتون" hint="أمر قطع معلّق على الدفع — بضاعة البائع محجوزة" [count]="d.part_orders_unpaid.count" empty="لا أمر عالق على الدفع">
            @for (r of d.part_orders_unpaid.rows; track r.id) { <app-queue-row [main]="r.buyerNameAr ?? r.number" [sub]="r.number" [side]="money(r.total) + ' · ' + ago(r.createdAt)" /> }
          </app-queue>
          <app-queue title="اعتمادات نائمة" hint="أمر عمل ينتظر توقيع العميل طويلاً — الورشة واقفة" [count]="d.wo_awaiting_approval.count" empty="لا اعتماد نائم">
            @for (r of d.wo_awaiting_approval.rows; track r.id) { <app-queue-row [main]="r.titleAr ?? r.number" [sub]="r.orgNameAr" [side]="ago(r.since)" /> }
          </app-queue>
        </div>
      }
    </app-shell>
  `,
})
export class OpsPage {
  money = fmtMoney; ago = ago; until = until;
  q = httpResource<Ops>(() => `${API}/admin/ops`);
  constructor() { poll(this.q, 20_000); }
}
