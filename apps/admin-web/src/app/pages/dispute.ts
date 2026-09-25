import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectModule } from 'primeng/select';
import { API, Api, errMsg, fmtDate, fmtMoney, short } from '../core/api';
import { DISPUTE_CATEGORY, DISPUTE_STATUS, ESCROW, RESOLUTION, label, tone } from '../core/labels';
import { poll } from '../core/poll';
import { Shell } from '../layout/shell';
import { ErrorBox, Eyebrow, Loading, Pill } from '../ui/basics';
import { MediaThumb } from '../ui/media-thumb';
import { ReasonDialog } from '../ui/reason-dialog';

type Msg = { id: string; authorUserId: string; authorNameAr: string | null; isInternal: boolean; bodyAr: string; createdAt: string };
type D = { id: string; number: string; status: string; category: string; descriptionAr: string; claimedAmount: string | null; resolution: string | null; resolutionAmountToCustomer: string | null; resolutionNoteAr: string | null; workOrderId: string | null; partOrderId: string | null; assignedTo: string | null; createdAt: string; messages: Msg[]; media: Array<{ mediaId: string; label: string | null }>; escrow: { id: string; status: string; amount: string; released: string; refunded: string } | null };
type Timeline = { status: string; versions: Array<{ id: string; version: number; sha256: string; reasonAr: string | null; createdAt: string; signed: boolean; signedMethod: string | null }>; inspections: Array<{ id: string; type: string; performedAt: string; mediaIds: string[] }>; media: Array<{ mediaId: string; entityType: string; label: string | null; mimeType: string }> };
type DamageView = { zone: string; zone_ar?: string; severity: string; source?: string };
type Diff = { comparable: boolean; summary_ar: string; appeared: DamageView[]; worsened: Array<{ zone: string; zone_ar?: string; from: string; to: string }>; repaired: DamageView[]; unchanged: DamageView[] };
const RESOLUTIONS = ['release_to_provider', 'refund_customer', 'split', 'replace_part', 'no_action'] as const;

/** غرفة النزاع: الشكوى والأدلة والمحادثة يساراً، والمال والقرار يميناً — والقرار يحرّك المبلغ فوراً بعد تأكيدٍ بسبب. */
@Component({
  selector: 'app-dispute-page',
  imports: [Shell, Pill, Eyebrow, Loading, ErrorBox, MediaThumb, ReasonDialog, FormsModule, SelectModule, CheckboxModule],
  template: `
    <app-shell [title]="d ? 'نزاع ' + d.number : 'نزاع'" [sub]="d ? cat(d.category) + ' · فُتح ' + date(d.createdAt) : undefined">
      @if (q.isLoading() && !d) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (d; as d) {
        <div class="grid grid-cols-[1fr_340px] gap-4">
          <div class="space-y-4">
            <div class="card p-5"><div class="flex items-start justify-between gap-3"><div><div class="text-xs text-muted">شكوى مقدّم الطلب</div><p class="mt-1">{{ d.descriptionAr }}</p></div><app-pill [label]="st(d.status)" [tone]="tone(d.status)" /></div>
              <div class="flex gap-4 mt-3 text-sm text-muted"><span>المطالبة: <b class="num text-ink">{{ d.claimedAmount ? money(d.claimedAmount) : '—' }}</b></span><span>الأدلة: <b class="num text-ink">{{ d.media.length }}</b></span>@if (d.workOrderId) {<span class="num">WO {{ short(d.workOrderId) }}</span>}@if (d.partOrderId) {<span class="num">PO {{ short(d.partOrderId) }}</span>}</div>
              @if (d.media.length > 0) { <div class="flex flex-wrap gap-2 mt-3">@for (m of d.media; track m.mediaId) { <app-media-thumb [id]="m.mediaId" [label]="m.label" /> }</div> }
            </div>
            @if (d.workOrderId) {
              <!-- خزنة الأدلة: كل ما يحسم الخلاف في لوحةٍ واحدة — صور الاستلام مقابل التسليم والفرق بينهما كما حسبه
                   النظام، والإصدار الموقّع وطريقة توقيعه وبصمته. كل عنصرٍ كان موجوداً؛ الجديد أنه لا يحتاج تنقّلاً. -->
              <div class="card p-5"><app-eyebrow>خزنة الأدلة<span right>WO {{ short(d.workOrderId) }}</span></app-eyebrow>
                @if (timeline.isLoading() && !timeline.value()) { <app-loading /> }
                @if (timeline.value(); as tl) {
                  <div class="grid grid-cols-2 gap-4">
                    @for (kind of ['check_in', 'check_out']; track kind) {
                      @let insp = inspectionOf(tl, kind);
                      <div><div class="text-xs font-bold text-muted mb-1">{{ kind === 'check_in' ? 'صور الاستلام' : 'صور التسليم' }}@if (insp) { <span class="num font-normal"> · {{ date(insp.performedAt) }}</span> }</div>
                        @if (!insp) { <p class="text-sm text-muted">{{ kind === 'check_in' ? 'لا فحص استلام' : 'لم يُفحص التسليم بعد' }}</p> }
                        @else if (!insp.mediaIds.length) { <p class="text-sm text-muted">بلا صور</p> }
                        @else { <div class="flex flex-wrap gap-2">@for (m of insp.mediaIds; track m) { <app-media-thumb [id]="m" [size]="64" /> }</div> }
                      </div>
                    }
                  </div>
                  <div class="mt-4"><div class="text-xs font-bold text-muted mb-1">ما تغيّر بين الاستلام والتسليم</div>
                    @if (diff.error()) { <p class="text-sm text-muted">لا فحص استلام لهذا الأمر — لا مقارنة.</p> }
                    @else if (diff.value(); as df) {
                      <p class="text-sm">{{ df.summary_ar }}</p>
                      @if (df.appeared.length) { <div class="mt-2 text-sm"><b class="text-bad">ظهر عند التسليم:</b> @for (x of df.appeared; track $index) { <app-pill [label]="(x.zone_ar ?? x.zone) + ' · ' + x.severity + (x.source === 'ai' ? ' · ذكاء اصطناعي' : '')" tone="pill-bad" /> } </div> }
                      @if (df.worsened.length) { <div class="mt-2 text-sm"><b class="text-warn">ازداد:</b> @for (x of df.worsened; track $index) { <app-pill [label]="(x.zone_ar ?? x.zone) + ' · ' + x.from + ' → ' + x.to" tone="pill-warn" /> } </div> }
                      @if (df.repaired.length) { <div class="mt-2 text-sm"><b class="text-seal">أُصلح:</b> @for (x of df.repaired; track $index) { <app-pill [label]="x.zone_ar ?? x.zone" tone="pill-seal" /> } </div> }
                    } @else if (diff.isLoading()) { <app-loading /> }
                  </div>
                  <div class="mt-4"><div class="text-xs font-bold text-muted mb-1">التوقيع</div>
                    @if (!tl.versions.length) { <p class="text-sm text-muted">لا إصدار بعد</p> }
                    @else { <table class="tbl"><thead><tr><th>الإصدار</th><th>الحالة</th><th>البصمة</th><th>التاريخ</th></tr></thead><tbody>
                      @for (v of tl.versions; track v.id) { <tr><td class="num">v{{ v.version }}</td><td>@if (v.signed) { <app-pill [label]="v.signedMethod === 'nafath' ? 'موقّع بنفاذ' : 'موقّع برمز التحقق'" tone="pill-seal" /> } @else { <app-pill label="غير موقّع" /> }</td><td class="num text-[10px] text-muted">{{ v.sha256.slice(0, 16) }}…</td><td class="num text-muted">{{ date(v.createdAt) }}</td></tr> }
                    </tbody></table> }
                  </div>
                }
              </div>
            }
            <div class="card p-5"><app-eyebrow>المحادثة<span right>{{ d.messages.length }} رسالة</span></app-eyebrow>
              <div class="space-y-2 max-h-[380px] overflow-auto">
                @for (m of d.messages; track m.id) { <div class="rounded-xl p-3 text-sm" [class.bg-brass-soft]="m.isInternal" [class.border]="m.isInternal" [class.border-brass/30]="m.isInternal" [class.bg-ground]="!m.isInternal"><div class="flex justify-between text-xs text-muted mb-1"><span class="font-bold text-ink">{{ m.authorNameAr ?? 'مستخدم' }}{{ m.isInternal ? ' · ملاحظة داخلية' : '' }}</span><span class="num">{{ date(m.createdAt) }}</span></div>{{ m.bodyAr }}</div> }
                @empty { <p class="text-sm text-muted">لا رسائل بعد</p> }
              </div>
              <div class="mt-3"><textarea class="input h-20 py-2" placeholder="اكتب رداً…" [(ngModel)]="body"></textarea>
                <div class="flex items-center gap-3 mt-2"><label class="flex items-center gap-2 text-sm"><p-checkbox [(ngModel)]="internal" [binary]="true" inputId="internal" /><span>ملاحظة داخلية (لا يراها الأطراف)</span></label><button class="btn ms-auto !h-10" [disabled]="body.trim().length < 1 || posting()" (click)="post()">إرسال</button></div></div>
            </div>
          </div>
          <div class="space-y-3">
            <div class="seal-card"><div class="text-sm opacity-80">المبلغ محل النزاع</div><div class="num text-3xl font-bold mt-1">{{ d.escrow ? money(d.escrow.amount) : '—' }}</div>
              @if (d.escrow; as es) { <div class="text-xs opacity-85 mt-1">الحالة: {{ esc(es.status) }} · مسترد {{ money(es.refunded) }} · محرَّر {{ money(es.released) }}</div> }
              @if (d.escrow?.status === 'frozen' && d.resolution && (d.resolution === 'replace_part' || d.resolution === 'no_action')) { <div class="mt-2"><app-pill label="بانتظار قرار لاحق — المبلغ ما زال مجمّداً" tone="pill-warn" /></div> }
              @if (!d.escrow) { <div class="text-xs opacity-85 mt-1">لا يوجد مبلغ محفوظ — القرار بلا حركة مالية</div> }
            </div>
            @if (d.status === 'resolved' || d.status === 'closed') {
              <div class="card p-4"><app-eyebrow>القرار</app-eyebrow><div class="font-bold">{{ res(d.resolution) }}</div>@if (d.resolutionAmountToCustomer) {<div class="num text-sm mt-1">للعميل: {{ money(d.resolutionAmountToCustomer) }}</div>}<p class="text-sm text-muted mt-2">{{ d.resolutionNoteAr }}</p>
                @if (d.status === 'resolved') { <button class="btn-ghost w-full mt-3" (click)="statusDlg.set('closed')">إغلاق النزاع</button> }</div>
            } @else if (open()) {
              <div class="card p-4"><app-eyebrow>إصدار قرار</app-eyebrow>
                <p-select class="w-full" [options]="resolutionOptions" optionLabel="label" optionValue="value" [(ngModel)]="resolution" styleClass="w-full" />
                @if (resolution === 'split') { <input class="input mt-2 num" dir="ltr" inputmode="decimal" [placeholder]="'مبلغ العميل (0 – ' + held().toFixed(2) + ')'" [(ngModel)]="amount" /> }
                <textarea class="input h-20 py-2 mt-2" placeholder="مبرّر القرار (يظهر للطرفين ويُسجَّل)" [(ngModel)]="note"></textarea>
                @if (d.escrow) { <p class="text-xs text-muted mt-2">للعميل <b class="num text-ink">{{ money(toCustomer()) }}</b> · للمزوّد <b class="num text-ink">{{ money(toProvider()) }}</b></p> }
                @if (err(); as m) { <p class="text-sm text-bad mt-2">{{ m }}</p> }
                <button class="btn w-full mt-3" [disabled]="note.trim().length < 5 || (resolution === 'split' && !amount) || resolving()" (click)="confirm.set(true)">إصدار القرار وتحريك المبلغ</button>
                <div class="flex gap-2 mt-2">@if (d.status !== 'awaiting_parties') {<button class="btn-ghost flex-1" (click)="statusDlg.set('awaiting_parties')">بانتظار الأطراف</button>}<button class="btn-ghost flex-1" (click)="statusDlg.set('escalated')">تصعيد</button></div>
              </div>
            }
          </div>
        </div>
      }
      @if (confirm()) { <app-reason-dialog title="تأكيد قرار النزاع" [hint]="res(resolution) + ' — للعميل ' + money(toCustomer()) + ' وللمزوّد ' + money(toProvider()) + '. الحركة تُسجَّل في دفتر الأستاذ فوراً.'" confirmLabel="إصدار القرار" [danger]="true" [confirm]="resolve" (closed)="confirm.set(false)" /> }
      @if (statusDlg(); as s) { <app-reason-dialog [title]="'تغيير حالة النزاع إلى: ' + st(s)" confirmLabel="تأكيد" [confirm]="setStatus(s)" (closed)="statusDlg.set(null)" /> }
    </app-shell>
  `,
})
export class DisputePage {
  id = input.required<string>();
  private api = inject(Api);
  q = httpResource<D>(() => `${API}/admin/disputes/${this.id()}`);
  get d() { return this.q.value(); }
  /** خزنة الأدلة تُطلب فقط حين يكون النزاع على أمر عملٍ — فريق المنصة يقرأ الأمر بصلاحيته (isStaff). */
  timeline = httpResource<Timeline>(() => { const wo = this.q.value()?.workOrderId; return wo ? `${API}/work-orders/${wo}/timeline` : undefined; });
  diff = httpResource<Diff>(() => { const wo = this.q.value()?.workOrderId; return wo ? `${API}/work-orders/${wo}/inspection-diff` : undefined; });
  inspectionOf = (tl: Timeline, kind: string) => tl.inspections.find((i) => i.type === kind);
  open = computed(() => { const d = this.q.value(); return !!d && ['open', 'under_review', 'awaiting_parties', 'escalated'].includes(d.status); });
  body = ''; internal = true; resolution = 'split'; amount = ''; note = '';
  posting = signal(false); resolving = signal(false); err = signal<string | null>(null);
  confirm = signal(false); statusDlg = signal<string | null>(null);
  resolutionOptions = RESOLUTIONS.map((r) => ({ value: r, label: RESOLUTION[r] }));
  money = fmtMoney; date = fmtDate; short = short; tone = tone;
  st = (s: string) => label(DISPUTE_STATUS, s); cat = (c: string) => label(DISPUTE_CATEGORY, c); esc = (s: string) => label(ESCROW, s); res = (r: string | null) => label(RESOLUTION, r);
  held = () => Number(this.d?.escrow?.amount ?? 0);
  toCustomer = () => (this.resolution === 'refund_customer' ? this.held() : this.resolution === 'split' ? Number(this.amount || 0) : 0);
  toProvider = () => Math.max(this.held() - this.toCustomer(), 0);
  constructor() { poll(this.q, 20_000); }
  async post() {
    this.posting.set(true);
    try { await this.api.post(`/admin/disputes/${this.id()}/messages`, { body_ar: this.body, is_internal: this.internal }); this.body = ''; this.q.reload(); }
    catch (e) { this.err.set(errMsg(e)); }
    finally { this.posting.set(false); }
  }
  setStatus = (s: string) => async (reason: string) => { await this.api.put(`/admin/disputes/${this.id()}/status`, { status: s, reason_ar: reason }); this.q.reload(); };
  resolve = async (reason: string) => {
    this.resolving.set(true); this.err.set(null);
    try {
      await this.api.post(`/admin/disputes/${this.id()}/resolve`, { resolution: this.resolution, amount_to_customer: this.resolution === 'split' ? this.amount : undefined, note_ar: `${this.note} — ${reason}` });
      this.q.reload();
    } finally { this.resolving.set(false); }
  };
}
