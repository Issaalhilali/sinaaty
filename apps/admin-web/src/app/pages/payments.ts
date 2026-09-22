import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { TableModule } from 'primeng/table';
import { API, Api, errMsg, fmtDate, fmtMoney, short } from '../core/api';
import { ESCROW, PAYOUT, label, tone } from '../core/labels';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Eyebrow, FilterPills, Loading, Pill } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type Hold = { id: string; status: string; amount: string; platformFee: string; releasedAmount: string; refundedAmount: string; beneficiaryOrgId: string; beneficiaryNameAr: string | null; workOrderId: string | null; partOrderId: string | null; autoReleaseAt: string | null; heldAt: string | null; releasedAt: string | null };
type Payout = { id: string; orgId: string; orgNameAr: string | null; amount: string; status: string; scheduledFor: string; processedAt: string | null; failureReason: string | null };
type Payment = { id: string; method: string; status: string; amount: string; payeeOrgId: string; invoiceId: string | null; createdAt: string };
type Approval = { id: string; action: string; entityId: string; payload: { amount?: string; reason_ar?: string }; status: string; requestedBy: string; requestedAt: string; expiresAt: string };
type HoldAction = 'release' | 'freeze' | 'refund';
const HOLD_TITLE: Record<HoldAction, string> = { release: 'تحرير المبلغ للمستفيد', freeze: 'تجميد المبلغ (نزاع)', refund: 'استرداد للعميل' };
const HOLD_CONFIRM: Record<HoldAction, string> = { release: 'تحرير', freeze: 'تجميد', refund: 'استرداد' };

/** الدفعات والضمان: تحرير/تجميد بسبب، والاسترداد يطلب مدقّقاً ثانياً — قاعدة الشخصين قيدٌ في القاعدة لا في الواجهة. */
@Component({
  selector: 'app-payments-page',
  imports: [Shell, FilterPills, Pill, Eyebrow, Empty, Loading, ErrorBox, ReasonDialog, TableModule],
  template: `
    <app-shell title="الدفعات والضمان" sub="تحرير/تجميد/استرداد بسبب — الاسترداد يتطلب موافقة ثانية (صانع/مدقّق)">
      @if (approvals.value(); as ap) { @if (ap.length > 0) {
        <div class="card border-warn mb-4 overflow-hidden">
          <div class="p-3 flex items-center gap-2"><app-pill [label]="'' + ap.length" tone="pill-warn" /><b>بانتظار الاعتماد — استردادات تحتاج مدقّقاً ثانياً</b><span class="text-xs text-muted">الطالب لا يعتمد طلبه؛ يجوز له سحبه</span></div>
          <table class="tbl"><thead><tr><th>المبلغ</th><th>الحجز</th><th>سبب الطالب</th><th>طُلب</th><th>ينتهي</th><th>قرار</th></tr></thead><tbody>
            @for (a of ap; track a.id) {
              <tr><td class="num font-semibold">{{ a.payload.amount ? money(a.payload.amount) : 'كامل المتبقي' }}</td><td class="num text-xs text-muted">{{ short(a.entityId) }}</td><td class="text-sm max-w-[280px] truncate" [title]="a.payload.reason_ar ?? ''">{{ a.payload.reason_ar ?? '—' }}</td><td class="num text-xs text-muted">{{ date(a.requestedAt) }}</td><td class="num text-xs text-muted">{{ date(a.expiresAt) }}</td>
                <td class="space-x-1 space-x-reverse"><button class="btn-ghost !h-8" (click)="decideDlg.set({ kind: 'approve', a })">اعتماد</button><button class="btn-ghost !h-8 !text-bad" (click)="decideDlg.set({ kind: 'reject', a })">رفض</button></td></tr>
            }
          </tbody></table>
        </div>
      } }
      <div class="grid grid-cols-[1fr_300px] gap-4 mb-4">
        <app-filter-pills [options]="tabs" [value]="tab()" (valueChange)="tab.set($event)" />
        <div class="card p-3 flex items-center justify-between" [class.border-bad]="health.value() && !health.value()!.balanced"><div><div class="text-xs text-muted">فارق ميزان دفتر الأستاذ</div><div class="num text-xl font-bold" [class.text-seal]="health.value()?.balanced" [class.text-bad]="health.value() && !health.value()!.balanced">{{ health.value()?.imbalance ?? '…' }}</div></div><app-pill [label]="health.value()?.balanced ? 'متوازن' : 'افحص'" [tone]="health.value()?.balanced ? 'pill-seal' : 'pill-bad'" /></div>
      </div>
      @switch (tab()) {
        @case ('escrow') {
          @if (holds.isLoading() && !holds.value()) { <app-loading /> } @if (holds.error(); as e) { <app-error-box [error]="e" (retry)="holds.reload()" /> }
          @if (holds.value(); as rows) { @if (rows.length === 0) { <app-empty text="لا توجد مبالغ في الضمان" /> } @else {
            <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
              <ng-template #header><tr><th>المستفيد</th><th>المبلغ</th><th>العمولة</th><th>الحالة</th><th>تحرير تلقائي</th><th>المرجع</th><th>إجراء</th></tr></ng-template>
              <ng-template #body let-h><tr><td class="font-semibold">{{ h.beneficiaryNameAr ?? short(h.beneficiaryOrgId) }}</td><td class="num font-semibold">{{ money(h.amount) }}</td><td class="num text-muted">{{ money(h.platformFee) }}</td><td><app-pill [label]="esc(h.status)" [tone]="tone(h.status)" /></td><td class="num text-muted">{{ date(h.autoReleaseAt) }}</td><td class="num text-xs text-muted">{{ h.workOrderId ? 'WO ' + short(h.workOrderId) : h.partOrderId ? 'PO ' + short(h.partOrderId) : '—' }}</td>
                <td class="space-x-1 space-x-reverse">@if (h.status === 'held' || h.status === 'frozen') { <button class="btn-ghost !h-8" (click)="dlg.set({ kind: 'release', hold: h })">تحرير</button>@if (h.status === 'held') {<button class="btn-ghost !h-8" (click)="dlg.set({ kind: 'freeze', hold: h })">تجميد</button>}<button class="btn-ghost !h-8 !text-bad" (click)="dlg.set({ kind: 'refund', hold: h })">استرداد</button> }</td></tr></ng-template>
            </p-table></div> } }
        }
        @case ('payouts') {
          <div class="flex justify-end mb-3"><button class="btn-ghost" (click)="runPayouts()" [disabled]="busy()">تجميع التحويلات المستحقة</button></div>
          @if (payouts.isLoading() && !payouts.value()) { <app-loading /> }
          @if (payouts.value(); as rows) { @if (rows.length === 0) { <app-empty text="لا تحويلات بعد" /> } @else {
            <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
              <ng-template #header><tr><th>المنشأة</th><th>المبلغ</th><th>الحالة</th><th>مجدول</th><th>نُفِّذ</th><th></th></tr></ng-template>
              <ng-template #body let-p><tr><td class="font-semibold">{{ p.orgNameAr ?? short(p.orgId) }}</td><td class="num font-semibold">{{ money(p.amount) }}</td><td><app-pill [label]="pay(p.status)" [tone]="tone(p.status)" /></td><td class="num text-muted">{{ date(p.scheduledFor) }}</td><td class="num text-muted">{{ date(p.processedAt) }}</td><td>@if (p.status === 'scheduled') {<button class="btn-ghost !h-8" (click)="execPayout(p.id)">تنفيذ</button>}@if (p.failureReason) {<span class="text-xs text-bad">{{ p.failureReason }}</span>}</td></tr></ng-template>
            </p-table></div> } }
        }
        @case ('payments') {
          @if (payments.isLoading() && !payments.value()) { <app-loading /> }
          @if (payments.value(); as rows) { @if (rows.length === 0) { <app-empty text="لا دفعات بعد" /> } @else {
            <div class="card overflow-hidden"><p-table [value]="rows" dataKey="id">
              <ng-template #header><tr><th>الطريقة</th><th>المبلغ</th><th>الحالة</th><th>الفاتورة</th><th>التاريخ</th></tr></ng-template>
              <ng-template #body let-p><tr><td>{{ p.method }}</td><td class="num font-semibold">{{ money(p.amount) }}</td><td><app-pill [label]="p.status" [tone]="tone(p.status === 'captured' ? 'paid' : p.status)" /></td><td class="num text-xs text-muted">{{ p.invoiceId ? short(p.invoiceId) : '—' }}</td><td class="num text-muted">{{ date(p.createdAt) }}</td></tr></ng-template>
            </p-table></div> } }
        }
      }
      @if (decideDlg(); as d) {
        <app-reason-dialog [title]="d.kind === 'approve' ? 'اعتماد الاسترداد — أنت المدقّق الثاني' : 'رفض طلب الاسترداد'"
          [hint]="d.kind === 'approve' ? (d.a.payload.amount ? money(d.a.payload.amount) : 'كامل المتبقي') + ' — بموافقتك يخرج المال فعلياً. لا يمكنك اعتماد طلبٍ فتحتَه أنت.' : 'يُغلق الطلب بلا أي حركة مالية؛ يجوز للطالب رفض (سحب) طلبه.'"
          [danger]="d.kind === 'approve'" [confirmLabel]="d.kind === 'approve' ? 'اعتماد وتنفيذ' : 'رفض'" [confirm]="decide(d.kind, d.a.id)" (closed)="decideDlg.set(null)" />
      }
      @if (dlg(); as d) {
        <app-reason-dialog [title]="holdTitle[d.kind]" [hint]="money(d.hold.amount) + ' · ' + (d.hold.beneficiaryNameAr ?? '') + (d.kind === 'refund' ? ' — يتطلب مدقّقاً ثانياً؛ يُسجَّل طلبك باسمك.' : '')" [danger]="d.kind !== 'release'" [confirmLabel]="holdConfirm[d.kind]" [confirm]="act(d.kind, d.hold.id)" (closed)="dlg.set(null)" />
      }
      @if (err(); as m) { <p class="text-sm text-bad mt-3">{{ m }}</p> }
      <div class="mt-6"><app-eyebrow>قاعدة</app-eyebrow><p class="text-xs text-muted">لا يُعدَّل رصيد مباشرة أبداً — كل تحرير/تجميد/استرداد قيد مزدوج في دفتر الأستاذ مع سبب واسم المنفّذ.</p></div>
    </app-shell>
  `,
})
export class PaymentsPage {
  private api = inject(Api);
  tabs = [['escrow', 'الضمان (Escrow)'], ['payouts', 'التحويلات'], ['payments', 'الدفعات']] as const;
  tab = signal<string>('escrow');
  holds = httpResource<Hold[]>(() => `${API}/admin/escrow`);
  payouts = httpResource<Payout[]>(() => `${API}/admin/payouts`);
  payments = httpResource<Payment[]>(() => `${API}/admin/payments`);
  approvals = httpResource<Approval[]>(() => `${API}/admin/approvals?status=requested`);
  health = httpResource<{ balanced: boolean; imbalance: string }>(() => `${API}/admin/ledger/health`);
  dlg = signal<{ kind: HoldAction; hold: Hold } | null>(null);
  decideDlg = signal<{ kind: 'approve' | 'reject'; a: Approval } | null>(null);
  busy = signal(false); err = signal<string | null>(null);
  holdTitle = HOLD_TITLE; holdConfirm = HOLD_CONFIRM;
  money = fmtMoney; date = fmtDate; short = short; tone = tone;
  esc = (s: string) => label(ESCROW, s); pay = (s: string) => label(PAYOUT, s);
  constructor() { poll(this.approvals, 30_000); poll(this.health, 30_000); }
  private refreshMoney() { this.holds.reload(); this.health.reload(); this.approvals.reload(); }
  act = (kind: HoldAction, id: string) => async (reason: string) => { await this.api.post(`/admin/escrow/${id}/${kind}`, { reason_ar: reason }); this.refreshMoney(); };
  decide = (kind: 'approve' | 'reject', id: string) => async (reason: string) => { await this.api.post(`/admin/approvals/${id}/${kind}`, { reason_ar: reason }); this.refreshMoney(); };
  async runPayouts() { this.busy.set(true); this.err.set(null); try { await this.api.post('/admin/payouts/run', {}); this.payouts.reload(); } catch (e) { this.err.set(errMsg(e)); } finally { this.busy.set(false); } }
  async execPayout(id: string) { this.err.set(null); try { await this.api.post(`/admin/payouts/${id}/execute`, {}); this.payouts.reload(); } catch (e) { this.err.set(errMsg(e)); } }
}
