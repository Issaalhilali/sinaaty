import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { API, Api, fmtDate } from '../core/api';
import { Shell } from '../layout/shell';
import { ErrorBox, Loading } from '../ui/basics';
import { ReasonDialog } from '../ui/reason-dialog';

type Setting = { key: string; value: unknown; updatedBy: string | null; updatedAt: string };

/** الرسوم والحدود تُقرأ من هنا — لا شيء ثابت في الشيفرة. التعديل لمشرف المنصة وبسببٍ مكتوب. */
@Component({
  selector: 'app-settings-page',
  imports: [Shell, Loading, ErrorBox, ReasonDialog, FormsModule, DialogModule],
  template: `
    <app-shell title="إعدادات المنصة" sub="الرسوم والحدود تُقرأ من هنا — لا شيء ثابت في الكود. التعديل لمشرف المنصة فقط وبسبب مكتوب">
      @if (q.isLoading() && !q.value()) { <app-loading /> }
      @if (q.error(); as e) { <app-error-box [error]="e" (retry)="q.reload()" /> }
      @if (q.value(); as rows) {
        <div class="card overflow-hidden"><table class="tbl"><thead><tr><th>المفتاح</th><th>القيمة (JSON)</th><th>آخر تعديل</th><th></th></tr></thead><tbody>
          @for (s of rows; track s.key) { <tr><td class="num font-semibold">{{ s.key }}</td><td class="num text-xs max-w-[520px] truncate" dir="ltr">{{ json(s.value) }}</td><td class="num text-muted">{{ date(s.updatedAt) }}</td><td><button class="btn-ghost !h-8" (click)="startEdit(s.key, json(s.value))">تعديل</button></td></tr> }
          <tr><td colspan="4" class="bg-[#F7F9F7]"><div class="flex gap-2 items-center"><input class="input !h-9 max-w-xs num" dir="ltr" placeholder="new.setting_key" [(ngModel)]="newKey" /><button class="btn-ghost !h-9" [disabled]="!keyOk(newKey)" (click)="startEdit(newKey, '&quot;&quot;'); newKey = ''">إضافة مفتاح</button></div></td></tr>
        </tbody></table></div>
      }
      @if (edit(); as e) {
        <p-dialog [visible]="true" [modal]="true" [closable]="false" [draggable]="false" [style]="{ width: '32rem', maxWidth: '95vw' }">
          <ng-template #header><h3 class="text-lg font-bold num">{{ e.key }}</h3></ng-template>
          <textarea class="input h-28 py-2 num mt-3" dir="ltr" [(ngModel)]="value"></textarea>
          @if (err(); as m) { <p class="text-sm text-bad mt-2">{{ m }}</p> }
          <div class="mt-3 flex justify-end gap-2"><button class="btn-ghost" (click)="edit.set(null)">إلغاء</button><button class="btn" (click)="askReason.set(true)">حفظ</button></div>
        </p-dialog>
        @if (askReason()) { <app-reason-dialog title="حفظ الإعداد" confirmLabel="حفظ" [confirm]="save(e.key)" (closed)="askReason.set(false)" /> }
      }
    </app-shell>
  `,
})
export class SettingsPage {
  private api = inject(Api);
  q = httpResource<Setting[]>(() => `${API}/admin/settings`);
  edit = signal<{ key: string } | null>(null);
  askReason = signal(false);
  err = signal<string | null>(null);
  value = ''; newKey = '';
  date = fmtDate;
  json = (v: unknown) => JSON.stringify(v);
  keyOk = (k: string) => /^[a-z0-9_.]{3,80}$/.test(k);
  startEdit(key: string, value: string) { this.value = value; this.err.set(null); this.edit.set({ key }); }
  save = (key: string) => async (reason: string) => {
    let v: unknown;
    try { v = JSON.parse(this.value); } catch { this.err.set('JSON غير صالح'); throw new Error('JSON غير صالح'); }
    await this.api.put(`/admin/settings/${key}`, { value: v, reason_ar: reason });
    this.edit.set(null); this.q.reload();
  };
}
