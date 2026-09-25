import { Component, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { API, Api, errMsg, fmtDay, fmtMoney } from '../core/api';
import { Shell } from '../layout/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type Rule = { enabled?: boolean; orgs?: string[]; org_types?: string[]; zones?: string[]; pct?: number };
type Flag = { key: string; rule: Rule; known: boolean };
type Zone = { code: string; nameAr: string; city: string; radiusKm: number };
type Funnel = {
  work_orders: { created: number; approved: number; invoiced: number; paid: number; approval_rate: string; invoice_rate: string; payment_rate: string };
  parts: { requested: number; bid: number; ordered: number };
  service?: { requested: number; offered: number; accepted: number; quiet: number; offer_rate: string; accept_rate: string; avg_first_offer_minutes: number | null };
};
type ZoneRow = { zone: string | null; name_ar: string; orgs: number; workOrders: number; paidInvoices: number; gmv: string };
type Activation = { organizations: number; active: number; activation_rate: string; rows: Array<{ orgId: string; nameAr: string; zone: string | null; workOrders: number; lastActiveAt: string | null }> };

const FLAG_AR: Record<string, string> = {
  parts_marketplace: 'سوق القطع', trade_accounts: 'الحسابات الآجلة', group_buys: 'الشراء الجماعي', tow: 'السطحات',
  accident_reports: 'تقارير الحوادث', warranty_wallet: 'محفظة الضمانات', disputes: 'النزاعات',
  voice_to_invoice: 'الصوت إلى فاتورة', ai_inspection: 'الفحص بالذكاء الاصطناعي',
};
const ORG_TYPE_AR: Record<string, string> = {
  workshop: 'ورشة', factory: 'مصنع', service_center: 'مركز صيانة', body_shop: 'سمكرة ودهان',
  parts_dealer: 'محل قطع', parts_distributor: 'موزّع قطع', parts_brand_agent: 'وكيل علامة',
  scrapyard: 'تشليح', fleet_company: 'أسطول', logistics: 'نقل وسطحات', inspection_center: 'مركز فحص',
};
const flagName = (k: string) => FLAG_AR[k] ?? k;

/** أين هذا المفتاح مفتوحٌ الآن، في سطرٍ يقرؤه المشغّل بنظرة. */
function scopeOf(rule: Rule): { label: string; tone: string } {
  if (rule.enabled) return { label: 'مفعّل للجميع', tone: 'pill-seal' };
  if (rule.zones?.length) return { label: `مناطق: ${rule.zones.join('، ')}`, tone: 'pill-brass' };
  if (rule.org_types?.length) return { label: `أنواع: ${rule.org_types.join('، ')}`, tone: 'pill-brass' };
  if (rule.orgs?.length) return { label: `${rule.orgs.length} منشأة محددة`, tone: 'pill-brass' };
  if (rule.pct) return { label: `${rule.pct}% من المنشآت`, tone: 'pill-brass' };
  return { label: 'مغلق', tone: 'pill-plain' };
}

type ScopeMode = 'all' | 'zones' | 'org_types' | 'pct' | 'off';

/** الطرح التدريجي هو نمط التجربة الأولى الحقيقي؛ الزر السريع يقلب الكل أو لا شيء. */
@Component({
  selector: 'app-scope-dialog',
  imports: [FormsModule, DialogModule, CheckboxModule, InputNumberModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [closable]="false" [draggable]="false" [style]="{ width: '28rem', maxWidth: '95vw' }">
      <ng-template #header><h3 class="text-lg font-bold">نطاق «{{ name }}»</h3></ng-template>
      <p class="text-sm text-muted mt-1">لمن تُفتح هذه الخدمة؟ النطاق يُطبَّق في الـ API نفسه، لا في الواجهة فقط.</p>
      <div class="mt-4 flex flex-wrap gap-2">@for (m of modes; track m.v) { <button type="button" [class]="mode() === m.v ? 'btn text-xs' : 'btn-ghost text-xs'" (click)="mode.set(m.v)">{{ m.label }}</button> }</div>
      @if (mode() === 'zones') { <div class="mt-3 space-y-1">@for (z of zones(); track z.code) { <label class="flex items-center gap-2 text-sm"><p-checkbox [binary]="true" [ngModel]="zoneSel().includes(z.code)" (ngModelChange)="toggle(zoneSel, z.code)" /><span>{{ z.nameAr }}</span><span class="text-xs text-muted num">{{ z.code }}</span></label> }</div> }
      @if (mode() === 'org_types') { <div class="mt-3 grid grid-cols-2 gap-1">@for (t of orgTypes; track t[0]) { <label class="flex items-center gap-2 text-sm"><p-checkbox [binary]="true" [ngModel]="typeSel().includes(t[0])" (ngModelChange)="toggle(typeSel, t[0])" /><span>{{ t[1] }}</span></label> }</div> }
      @if (mode() === 'pct') { <div class="mt-3 flex items-center gap-2 text-sm"><p-inputnumber [ngModel]="pct()" (ngModelChange)="pct.set($event ?? 0)" [min]="1" [max]="100" inputStyleClass="w-24 num" /><span class="text-muted">٪ من المنشآت — التوزيع ثابت لكل منشأة، لا يتقلب بين الجلسات.</span></div> }
      <label class="block text-xs font-bold text-muted mt-4 mb-1">السبب (يُسجَّل في سجل التدقيق)</label>
      <textarea class="input h-24 py-2" [(ngModel)]="reason" placeholder="اكتب سبباً واضحاً…"></textarea>
      @if (err(); as m) { <p class="text-sm text-bad mt-2">{{ m }}</p> }
      <div class="mt-4 flex gap-2 justify-end">
        <button type="button" class="btn-ghost" (click)="closed.emit()">إلغاء</button>
        <button type="button" class="btn" [disabled]="reason.trim().length < 3 || incomplete() || busy()" (click)="save()">{{ busy() ? '…' : 'حفظ النطاق' }}</button>
      </div>
    </p-dialog>
  `,
})
export class ScopeDialog {
  flag = input.required<Flag>();
  zones = input.required<Zone[]>();
  confirm = input.required<(rule: Rule, reason: string) => Promise<void>>();
  closed = output<void>();
  modes: Array<{ v: ScopeMode; label: string }> = [{ v: 'all', label: 'للجميع' }, { v: 'zones', label: 'مناطق محددة' }, { v: 'org_types', label: 'أنواع منشآت' }, { v: 'pct', label: 'نسبة تدريجية' }, { v: 'off', label: 'مغلق' }];
  orgTypes = Object.entries(ORG_TYPE_AR);
  mode = signal<ScopeMode>('off'); zoneSel = signal<string[]>([]); typeSel = signal<string[]>([]); pct = signal(10);
  reason = ''; busy = signal(false); err = signal<string | null>(null);
  get name() { return flagName(this.flag().key); }
  constructor() {
    // الحالة الابتدائية من القاعدة الحالية — بعد أن يصل الإدخال (ngOnInit يفي بالغرض أيضاً).
    queueMicrotask(() => { const r = this.flag().rule; this.mode.set(r.enabled ? 'all' : r.zones?.length ? 'zones' : r.org_types?.length ? 'org_types' : r.pct ? 'pct' : 'off'); this.zoneSel.set(r.zones ?? []); this.typeSel.set(r.org_types ?? []); this.pct.set(r.pct ?? 10); });
  }
  toggle(list: ReturnType<typeof signal<string[]>>, v: string) { list.update((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v])); }
  rule = computed<Rule>(() => { const m = this.mode(); return m === 'all' ? { enabled: true } : m === 'off' ? { enabled: false } : m === 'zones' ? { zones: this.zoneSel() } : m === 'org_types' ? { org_types: this.typeSel() } : { pct: this.pct() }; });
  incomplete = computed(() => { const m = this.mode(); return (m === 'zones' && !this.zoneSel().length) || (m === 'org_types' && !this.typeSel().length) || (m === 'pct' && (this.pct() < 1 || this.pct() > 100)); });
  async save() { this.busy.set(true); this.err.set(null); try { await this.confirm()(this.rule(), this.reason.trim()); this.closed.emit(); } catch (e) { this.err.set(errMsg(e)); } finally { this.busy.set(false); } }
}

@Component({
  selector: 'app-pilot-page',
  imports: [Shell, Kpi, Pill, Eyebrow, Empty, Loading, ErrorBox, ReasonDialog, ScopeDialog],
  template: `
    <app-shell title="المناطق والميزات" sub="أين نعمل · أي خدمة مفتوحة لمن · ما الذي يتحوّل إلى دفع — آخر ٣٠ يوماً">
      @if (funnel.isLoading() && !funnel.value()) { <app-loading /> }
      @else if (funnel.error(); as e) { <app-error-box [error]="e" (retry)="funnel.reload()" /> }
      @else {
        @let f = funnel.value()?.work_orders; @let sv = funnel.value()?.service; @let parts = funnel.value()?.parts;
        <app-eyebrow>القمع: من وصول السيارة إلى الدفع</app-eyebrow>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          <app-kpi [value]="f?.created ?? 0" label="أوامر عمل أُنشئت" />
          <app-kpi [value]="f?.approved ?? 0" label="اعتمدها العملاء" [sub]="(f?.approval_rate ?? '0.0') + '% من المُنشأة'" />
          <app-kpi [value]="f?.invoiced ?? 0" label="صدرت لها فواتير" [sub]="(f?.invoice_rate ?? '0.0') + '% من المعتمدة'" />
          <app-kpi [value]="f?.paid ?? 0" label="فواتير مدفوعة" [sub]="(f?.payment_rate ?? '0.0') + '% من الصادرة'" [tone]="+(f?.payment_rate ?? 0) < 60 ? 'warn' : undefined" />
        </div>
        <div class="grid grid-cols-3 gap-3 mb-6"><app-kpi [value]="parts?.requested ?? 0" label="طلبات قطع" /><app-kpi [value]="parts?.bid ?? 0" label="عروض موردين" /><app-kpi [value]="parts?.ordered ?? 0" label="طلبات شراء" /></div>
        <app-eyebrow>سوق الإصلاح: من مشكلة العميل إلى أمر عمل</app-eyebrow>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <app-kpi [value]="sv?.requested ?? 0" label="طلبات إصلاح" />
          <app-kpi [value]="sv?.offered ?? 0" label="وصلها عرض" [sub]="(sv?.offer_rate ?? '0.0') + '% من الطلبات'" [tone]="+(sv?.offer_rate ?? 100) < 70 ? 'warn' : undefined" />
          <app-kpi [value]="sv?.accepted ?? 0" label="تحوّلت إلى أمر عمل" [sub]="(sv?.accept_rate ?? '0.0') + '% من الطلبات'" />
          <app-kpi [value]="sv?.avg_first_offer_minutes != null ? '~' + sv!.avg_first_offer_minutes + ' د' : '—'" label="متوسط أول ردّ" [sub]="sv?.avg_first_offer_minutes == null ? 'لا عروض بعد' : undefined" />
          <app-kpi [value]="sv?.quiet ?? 0" label="طلبات هادئة" [sub]="(sv?.quiet ?? 0) > 0 ? 'نُبّه أصحابها للتوسيع' : undefined" [tone]="(sv?.quiet ?? 0) > 0 ? 'warn' : undefined" />
        </div>
      }
      <div class="grid lg:grid-cols-2 gap-6">
        <section>
          <app-eyebrow>المناطق الصناعية<button right class="underline" (click)="backfill()" [disabled]="backfilling()">{{ backfilling() ? '…' : 'وسم المواقع غير المصنّفة' }}</button></app-eyebrow>
          @if (backfilled(); as b) { <p class="text-xs text-seal mb-2">فُحص {{ b.checked }} موقعاً ووُسم {{ b.tagged }}.</p> }
          @if (zones.isLoading() && !zones.value()) { <app-loading /> }
          @else {
            <div class="card overflow-hidden"><table class="w-full text-sm">
              <thead><tr class="text-muted text-xs"><th class="p-3 text-start">المنطقة</th><th class="p-3 text-start">المدينة</th><th class="p-3 text-start">منشآت</th><th class="p-3 text-start">أوامر</th><th class="p-3 text-start">مدفوع</th></tr></thead>
              <tbody>
                @for (z of zones.value() ?? []; track z.code) { @let row = rowFor(z.code);
                  <tr class="border-t border-line"><td class="p-3"><div class="font-semibold">{{ z.nameAr }}</div><div class="text-xs text-muted num">{{ z.code }} · {{ z.radiusKm }} كم</div></td><td class="p-3">{{ z.city }}</td><td class="p-3 num">{{ row?.orgs ?? 0 }}</td><td class="p-3 num">{{ row?.workOrders ?? 0 }}</td><td class="p-3 num">{{ money(row?.gmv ?? 0) }}</td></tr>
                }
                @for (r of outside(); track $index) { <tr class="border-t border-line text-muted"><td class="p-3">خارج المناطق</td><td class="p-3">—</td><td class="p-3 num">{{ r.orgs }}</td><td class="p-3 num">{{ r.workOrders }}</td><td class="p-3 num">{{ money(r.gmv) }}</td></tr> }
              </tbody></table></div>
          }
        </section>
        <section>
          <app-eyebrow>مفاتيح الميزات</app-eyebrow>
          <p class="text-xs text-muted mb-2">المفتاح المغلق يعني أن الـ API يرفض الخدمة أيضاً، لا أن الزر مخفي فقط.</p>
          @if (flags.isLoading() && !flags.value()) { <app-loading /> }
          @else {
            <div class="card divide-y divide-line">
              @for (flag of flags.value() ?? []; track flag.key) { @let scope = scopeOf(flag.rule);
                <div class="p-3 flex items-center gap-3">
                  <div class="flex-1"><div class="font-semibold">{{ name(flag.key) }}</div><div class="text-xs text-muted num">{{ flag.key }}</div></div>
                  <app-pill [label]="scope.label" [tone]="scope.tone" />
                  <button class="btn-ghost text-xs" (click)="editing.set(flag)">تخصيص</button>
                  <button class="btn-ghost text-xs" (click)="toggling.set(flag)">{{ flag.rule.enabled ? 'إغلاق' : 'تفعيل للجميع' }}</button>
                </div>
              }
            </div>
          }
        </section>
      </div>
      <section class="mt-6">
        <app-eyebrow>المنشآت المهيّأة — من استخدم المنتج فعلاً@if (activation.value(); as a) {<span right>{{ a.activation_rate }}% تفعيل</span>}</app-eyebrow>
        @if (activation.isLoading() && !activation.value()) { <app-loading /> }
        @else if (!activation.value()?.rows?.length) { <app-empty text="لا توجد منشآت نشطة بعد." /> }
        @else {
          <div class="card overflow-hidden"><table class="w-full text-sm">
            <thead><tr class="text-muted text-xs"><th class="p-3 text-start">المنشأة</th><th class="p-3 text-start">المنطقة</th><th class="p-3 text-start">أوامر العمل</th><th class="p-3 text-start">آخر نشاط</th></tr></thead>
            <tbody>
              @for (r of activation.value()!.rows.slice(0, 12); track r.orgId) {
                <tr class="border-t border-line"><td class="p-3 font-semibold">{{ r.nameAr }}</td><td class="p-3 text-muted num">{{ r.zone ?? '—' }}</td><td class="p-3 num">{{ r.workOrders }}</td><td class="p-3">@if (r.workOrders === 0) {<app-pill label="لم تُستخدم بعد" tone="pill-warn" />} @else {<span class="text-muted text-xs">{{ r.lastActiveAt ? day(r.lastActiveAt) : '—' }}</span>}</td></tr>
              }
            </tbody></table></div>
        }
      </section>
      @if (editing(); as flag) { <app-scope-dialog [flag]="flag" [zones]="zones.value() ?? []" [confirm]="setScope(flag.key)" (closed)="editing.set(null)" /> }
      @if (toggling(); as flag) {
        <app-reason-dialog [title]="(flag.rule.enabled ? 'إغلاق' : 'تفعيل') + ' «' + name(flag.key) + '»'" [hint]="flag.rule.enabled ? 'سيتوقف عرض الخدمة، وسيرفضها الـ API لكل المنشآت.' : 'ستُفتح الخدمة لكل المنشآت فوراً.'" [confirmLabel]="flag.rule.enabled ? 'إغلاق' : 'تفعيل'" [danger]="!!flag.rule.enabled" [confirm]="toggle(flag)" (closed)="toggling.set(null)" />
      }
    </app-shell>
  `,
})
export class PilotPage {
  private api = inject(Api);
  flags = httpResource<Flag[]>(() => `${API}/admin/pilot/flags`);
  zones = httpResource<Zone[]>(() => `${API}/admin/pilot/zones`);
  funnel = httpResource<Funnel>(() => `${API}/admin/pilot/funnel`);
  byZone = httpResource<ZoneRow[]>(() => `${API}/admin/pilot/by-zone`);
  activation = httpResource<Activation>(() => `${API}/admin/pilot/activation`);
  editing = signal<Flag | null>(null); toggling = signal<Flag | null>(null);
  backfilling = signal(false); backfilled = signal<{ checked: number; tagged: number } | null>(null);
  money = fmtMoney; day = fmtDay; scopeOf = scopeOf; name = flagName;
  rowFor = (code: string) => this.byZone.value()?.find((r) => r.zone === code);
  outside = computed(() => (this.byZone.value() ?? []).filter((r) => !r.zone));
  private reloadAll() { this.flags.reload(); this.zones.reload(); this.funnel.reload(); this.byZone.reload(); this.activation.reload(); }
  setScope = (key: string) => async (rule: Rule, reason: string) => { await this.api.put(`/admin/pilot/flags/${key}`, { ...rule, reason_ar: reason }); this.reloadAll(); };
  toggle = (flag: Flag) => async (reason: string) => { await this.api.put(`/admin/pilot/flags/${flag.key}`, { ...flag.rule, enabled: !flag.rule.enabled, reason_ar: reason }); this.reloadAll(); };
  async backfill() { this.backfilling.set(true); try { this.backfilled.set(await this.api.post<{ checked: number; tagged: number }>('/admin/pilot/zones/backfill')); this.reloadAll(); } finally { this.backfilling.set(false); } }
}
