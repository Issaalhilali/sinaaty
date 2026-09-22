import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import { errMsg } from '../core/api';

/** كل فعلٍ حسّاس: سببٌ يُكتب مرةً واحدة ويذهب إلى سجل التدقيق. الحوار PrimeNG، والأزرار بهويتنا. */
@Component({
  selector: 'app-reason-dialog',
  imports: [DialogModule, TextareaModule, FormsModule],
  template: `
    <p-dialog [visible]="true" [modal]="true" [closable]="false" [draggable]="false" [resizable]="false" [style]="{ width: '28rem', maxWidth: '95vw' }" (onHide)="closed.emit()">
      <ng-template #header><h3 class="text-lg font-bold">{{ title() }}</h3></ng-template>
      @if (hint()) { <p class="text-sm text-muted mt-1">{{ hint() }}</p> }
      <label class="block text-xs font-bold text-muted mt-4 mb-1">السبب (يُسجَّل في سجل التدقيق)</label>
      <textarea pTextarea class="input h-24 py-2" [(ngModel)]="reason" placeholder="اكتب سبباً واضحاً…"></textarea>
      @if (err()) { <p class="text-sm text-bad mt-2">{{ err() }}</p> }
      <div class="mt-4 flex gap-2 justify-end">
        <button class="btn-ghost" type="button" (click)="closed.emit()">إلغاء</button>
        <button [class]="danger() ? 'btn-danger' : 'btn'" type="button" [disabled]="reason.trim().length < 3 || busy()" (click)="ok()">{{ busy() ? '…' : confirmLabel() }}</button>
      </div>
    </p-dialog>
  `,
})
export class ReasonDialog {
  title = input.required<string>();
  hint = input<string | undefined>();
  confirmLabel = input('تأكيد');
  danger = input(false);
  /** يُنفَّذ بالسبب؛ نجاحه يغلق الحوار، وفشله يُعرض فيه بلا إغلاق. */
  confirm = input.required<(reason: string) => Promise<void>>();
  closed = output<void>();
  reason = '';
  busy = signal(false);
  err = signal<string | null>(null);
  async ok() {
    this.busy.set(true); this.err.set(null);
    try { await this.confirm()(this.reason.trim()); this.closed.emit(); }
    catch (e) { this.err.set(errMsg(e)); }
    finally { this.busy.set(false); }
  }
}
