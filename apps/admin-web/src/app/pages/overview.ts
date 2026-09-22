import { Component, computed } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API, fmtMoney } from '../core/api';
import { attentionItems } from '../core/attention';
import { INTEG } from '../core/labels';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { AttentionBar } from '../ui/attention-bar';
import { ErrorBox, Eyebrow, Kpi, Loading, Pill } from '../ui/basics';

type Overview = { orgs: { total: number; active: number; pending_kyb: number }; work_orders: { month: number; awaiting_approval: number; in_progress: number; approved_within_1h_pct: number | null }; money: { escrow_held: string; released_30d: string; platform_fees_30d: string; ledger_imbalance: string }; notes: { open: number; overdue: number; outstanding: string }; parts: { open_requests: number; orders_30d: number }; integrations: Array<{ provider: string; last24h: number; succeeded: number; failed: number; dead_letter: number }>; outbox: { pending: number; dead_letter: number } };

@Component({
  selector: 'app-overview-page',
  imports: [Shell, AttentionBar, Kpi, Pill, Eyebrow, Loading, ErrorBox, RouterLink],
  template: `
    <app-shell title="نظرة عامة" sub="آخر تحديث كل 30 ثانية · الرياض">
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as d) {
        <app-attention-bar [items]="attention()" />
        <div class="grid grid-cols-5 gap-3">
          <app-kpi [value]="d.work_orders.month" label="أمر عمل هذا الشهر" [sub]="d.work_orders.awaiting_approval + ' بانتظار اعتماد · ' + d.work_orders.in_progress + ' قيد التنفيذ'" />
          <app-kpi [value]="d.work_orders.approved_within_1h_pct == null ? '—' : d.work_orders.approved_within_1h_pct + '%'" label="اعتماد خلال ساعة (30 يوم)" />
          <a routerLink="/payments"><app-kpi [value]="money(d.money.escrow_held)" label="في الضمان (محفوظ)" [sub]="'محرَّر 30 يوم: ' + money(d.money.released_30d)" /></a>
          <a routerLink="/notes"><app-kpi [value]="d.notes.open" label="سند لأمر ساري" [sub]="d.notes.overdue + ' متأخر · القائم ' + money(d.notes.outstanding)" /></a>
          <a routerLink="/organizations"><app-kpi [value]="d.orgs.pending_kyb" label="KYB بانتظار المراجعة" [sub]="d.orgs.active + ' منشأة نشطة من ' + d.orgs.total" /></a>
        </div>
        <div class="grid grid-cols-[2fr_1fr] gap-4 mt-4">
          <div class="card overflow-hidden"><table class="tbl"><thead><tr><th>التكامل</th><th>آخر 24 س</th><th>نجاح</th><th>فشل</th><th>DLQ</th><th></th></tr></thead><tbody>
            @for (i of d.integrations; track i.provider) {
              <tr><td class="font-semibold">{{ i.provider }}</td><td class="num">{{ i.last24h }}</td><td class="num">{{ i.succeeded }}</td><td class="num">{{ i.failed }}</td><td class="num">{{ i.dead_letter }}</td>
                <td><app-pill [label]="i.dead_letter > 0 ? integ['dead_letter'] : i.failed > 0 ? 'راقب' : 'سليم'" [tone]="i.dead_letter > 0 ? 'pill-bad' : i.failed > 0 ? 'pill-warn' : 'pill-seal'" /></td></tr>
            } @empty { <tr><td colspan="6" class="text-muted text-center">لا توجد طلبات تكامل بعد</td></tr> }
          </tbody></table></div>
          <div class="space-y-4">
            <a routerLink="/payments" class="seal-card"><div class="text-sm opacity-80">صحة دفتر الأستاذ</div><div class="num text-3xl font-bold mt-1">{{ d.money.ledger_imbalance }}</div><div class="text-xs opacity-80 mt-1">{{ d.money.ledger_imbalance === '0.00' ? 'متوازن — كل قيد مالي مزدوج ومغلق' : 'فارق في الميزان — افحص فوراً' }}</div><div class="mt-3 text-xs opacity-90">عمولة المنصة 30 يوم: <span class="num font-bold">{{ money(d.money.platform_fees_30d) }}</span></div></a>
            <a routerLink="/integrations" class="card p-4 block"><app-eyebrow>الصندوق الصادر (Outbox)</app-eyebrow><div class="flex gap-6"><div><div class="num text-2xl font-bold">{{ d.outbox.pending }}</div><div class="text-xs text-muted">معلّق</div></div><div><div class="num text-2xl font-bold" [class.text-bad]="d.outbox.dead_letter > 0">{{ d.outbox.dead_letter }}</div><div class="text-xs text-muted">متوقف (DLQ)</div></div></div></a>
            <div class="card p-4"><app-eyebrow>سوق القطع</app-eyebrow><div class="flex gap-6"><div><div class="num text-2xl font-bold">{{ d.parts.open_requests }}</div><div class="text-xs text-muted">مزادات مفتوحة</div></div><div><div class="num text-2xl font-bold">{{ d.parts.orders_30d }}</div><div class="text-xs text-muted">طلبات قطع 30 يوم</div></div></div></div>
          </div>
        </div>
      }
    </app-shell>
  `,
})
export class OverviewPage {
  integ = INTEG;
  money = fmtMoney;
  q = httpResource<Overview>(() => `${API}/admin/overview`);
  // نزاع بمال مجمَّد وطلب صرف بانتظار موافقة ثانية لا يظهران في /overview — وهما أوجب ما يوجب إنساناً.
  // «مفتوح» وحدها لا تكفي: المبلغ يبقى مجمَّداً في «قيد الدراسة» و«بانتظار الأطراف» و«مُصعَّد».
  // نداءان زهيدان، وفشل أيٍّ منهما يُسقط بنده من الشريط ولا يعطّل الصفحة.
  disputes = httpResource<unknown[]>(() => `${API}/admin/disputes?status=open,under_review,awaiting_parties,escalated`);
  approvals = httpResource<unknown[]>(() => `${API}/admin/approvals?status=requested`);
  attention = computed(() => {
    const d = this.q.value(); if (!d) return [];
    const ds = this.disputes.value(); const ap = this.approvals.value();
    return attentionItems({
      ledgerImbalance: d.money.ledger_imbalance,
      outboxDeadLetter: d.outbox.dead_letter,
      integrationDeadLetters: d.integrations.reduce((a, i) => a + i.dead_letter, 0),
      openDisputes: Array.isArray(ds) ? ds.length : 0,
      overdueNotes: d.notes.overdue,
      pendingKyb: d.orgs.pending_kyb,
      pendingApprovals: Array.isArray(ap) ? ap.length : 0,
    });
  });
  constructor() { poll(this.q, 30_000); poll(this.disputes, 30_000); poll(this.approvals, 30_000); }
}
