import { Component, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API, Api, fmtDate } from '../core/api';
import { ORG_STATUS, ORG_TYPE, label, tone } from '../core/labels';
import { Shell } from '../layout/shell';
import { ErrorBox, Eyebrow, Loading, Pill } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type Org = { id: string; type: string; status: string; legalNameAr: string; legalNameEn: string | null; tradeNameAr: string | null; crNumber: string | null; vatNumber: string | null; phone: string | null; email: string | null; commissionRateBps: number; createdAt: string; kyb_documents?: Array<{ id: string; type: string; status: string; createdAt: string }>; members?: Array<{ userId: string; role: string; fullNameAr?: string | null }> };
type Action = 'approve' | 'reject' | 'suspend' | 'reactivate';
const TITLE: Record<Action, string> = { approve: 'اعتماد المنشأة', reject: 'رفض المنشأة', suspend: 'إيقاف المنشأة', reactivate: 'إعادة تفعيل المنشأة' };
const CONFIRM: Record<Action, string> = { approve: 'اعتماد', reject: 'رفض', suspend: 'إيقاف', reactivate: 'تفعيل' };

/** ملف المنشأة: قرار الاعتماد/الرفض/الإيقاف — كل واحدٍ بسببٍ يُسجَّل باسم من اتخذه. */
@Component({
  selector: 'app-organization-page',
  imports: [Shell, Pill, Eyebrow, Loading, ErrorBox, ReasonDialog],
  template: `
    <app-shell [title]="o ? (o.tradeNameAr ?? o.legalNameAr) : 'منشأة'" [sub]="o ? orgType(o.type) + ' · ' + (o.crNumber ?? '') : undefined">
      @if (q.isLoading() && !o) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (o; as o) {
        <div class="grid grid-cols-[1fr_320px] gap-4">
          <div class="space-y-4">
            <div class="card p-5"><div class="flex items-start justify-between"><div><div class="text-lg font-bold">{{ o.legalNameAr }}</div><div class="text-sm text-muted">{{ o.legalNameEn }}</div></div><app-pill [label]="orgStatus(o.status)" [tone]="tone(o.status)" /></div>
              <dl class="grid grid-cols-3 gap-3 mt-4 text-sm"><div><dt class="text-xs text-muted">السجل التجاري</dt><dd class="num font-semibold">{{ o.crNumber ?? '—' }}</dd></div><div><dt class="text-xs text-muted">الرقم الضريبي</dt><dd class="num font-semibold">{{ o.vatNumber ?? '—' }}</dd></div><div><dt class="text-xs text-muted">العمولة</dt><dd class="num font-semibold">{{ (o.commissionRateBps / 100).toFixed(2) }}%</dd></div><div><dt class="text-xs text-muted">الجوال</dt><dd class="num">{{ o.phone ?? '—' }}</dd></div><div><dt class="text-xs text-muted">البريد</dt><dd>{{ o.email ?? '—' }}</dd></div><div><dt class="text-xs text-muted">أُنشئت</dt><dd class="num">{{ date(o.createdAt) }}</dd></div></dl></div>
            <div class="card p-5"><app-eyebrow>مستندات KYB</app-eyebrow>
              @if (!o.kyb_documents?.length) { <p class="text-sm text-muted">لا مستندات مرفوعة</p> }
              @else { <table class="tbl"><thead><tr><th>النوع</th><th>الحالة</th><th>رُفع</th></tr></thead><tbody>@for (d of o.kyb_documents; track d.id) {<tr><td>{{ d.type }}</td><td><app-pill [label]="d.status" [tone]="tone(d.status)" /></td><td class="num text-muted">{{ date(d.createdAt) }}</td></tr>}</tbody></table> }
            </div>
            <div class="card p-5"><app-eyebrow>الأعضاء</app-eyebrow>
              @if (!o.members?.length) { <p class="text-sm text-muted">—</p> }
              @else { <ul class="text-sm space-y-1">@for (m of o.members; track m.userId) {<li class="flex justify-between"><span>{{ m.fullNameAr ?? m.userId }}</span><span class="text-muted">{{ m.role }}</span></li>}</ul> }
            </div>
          </div>
          <div class="space-y-3">
            <div class="seal-card"><div class="text-sm opacity-80">الإجراء</div><div class="text-lg font-bold mt-1">كل قرار يحتاج سبباً ويُسجَّل باسمك</div>
              <div class="mt-4 space-y-2">
                @if (o.status === 'pending_kyb') { <button class="btn w-full !bg-white !text-seal-deep" (click)="dlg.set('approve')">اعتماد المنشأة</button><button class="btn-ghost w-full !bg-transparent !text-white !border-white/40" (click)="dlg.set('reject')">رفض</button> }
                @if (o.status === 'active') { <button class="btn-ghost w-full !bg-transparent !text-white !border-white/40" (click)="dlg.set('suspend')">إيقاف</button> }
                @if (o.status === 'suspended') { <button class="btn w-full !bg-white !text-seal-deep" (click)="dlg.set('reactivate')">إعادة التفعيل</button> }
              </div></div>
          </div>
        </div>
      }
      @if (dlg(); as a) { <app-reason-dialog [title]="titles[a]" [danger]="a === 'reject' || a === 'suspend'" [confirmLabel]="confirms[a]" [confirm]="act(a)" (closed)="dlg.set(null)" /> }
    </app-shell>
  `,
})
export class OrganizationPage {
  id = input.required<string>();
  private api = inject(Api);
  q = httpResource<Org>(() => `${API}/admin/organizations/${this.id()}`);
  get o() { return this.q.value(); }
  dlg = signal<Action | null>(null);
  titles = TITLE; confirms = CONFIRM; tone = tone; date = fmtDate;
  orgType = (t: string) => label(ORG_TYPE, t);
  orgStatus = (s: string) => label(ORG_STATUS, s);
  act = (a: Action) => async (reason: string) => { await this.api.post(`/admin/organizations/${this.id()}/${a}`, { reason_ar: reason }); this.q.reload(); };
}
