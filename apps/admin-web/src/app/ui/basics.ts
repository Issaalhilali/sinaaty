import { Component, input, output } from '@angular/core';
import { errMsg } from '../core/api';

/** وسام حالة بلون المعنى — الخريطة في labels.tone. */
@Component({ selector: 'app-pill', template: `<span class="pill {{ tone() }}"><i class="h-1.5 w-1.5 rounded-full bg-current"></i>{{ label() }}</span>` })
export class Pill { label = input.required<string>(); tone = input<string>('pill-plain'); }

/** مؤشر رقمي: القيمة عريضة (المبلغ وحده يستحق العريض) وتحته وصفه، وسطرٌ ثالث اختياري بلون التنبيه. */
@Component({
  selector: 'app-kpi',
  template: `<div class="card p-4"><div class="num text-2xl font-bold">{{ value() }}</div><div class="text-xs text-muted mt-0.5">{{ label() }}</div>@if (sub()) {<div class="text-[11.5px] font-bold mt-1" [class.text-warn]="tone() === 'warn'" [class.text-seal]="tone() !== 'warn'">{{ sub() }}</div>}</div>`,
})
export class Kpi { value = input.required<string | number>(); label = input.required<string>(); sub = input<string | undefined>(); tone = input<'good' | 'warn' | undefined>(); }

/** عنوان قسم بخيط أخضر — وفتحةٌ يمنى لرابطٍ أو رقم. */
@Component({ selector: 'app-eyebrow', template: `<div class="eyebrow"><span><ng-content /></span><span class="ms-auto text-seal font-semibold"><ng-content select="[right]" /></span></div>` })
export class Eyebrow {}

@Component({ selector: 'app-empty', template: `<div class="card p-8 text-center text-muted text-sm">{{ text() }}</div>` })
export class Empty { text = input.required<string>(); }

@Component({ selector: 'app-loading', template: `<div class="p-8 text-center text-muted text-sm">جارٍ التحميل…</div>` })
export class Loading {}

/** الخطأ باسمه من غلاف الخادم — و«أعد المحاولة» تعيد تحميل المورد نفسه. */
@Component({
  selector: 'app-error-box',
  template: `<div class="card p-6 text-center"><p class="text-sm text-bad">{{ message }}</p><button class="btn-ghost mt-3" (click)="retry.emit()">أعد المحاولة</button></div>`,
})
export class ErrorBox { error = input.required<unknown>(); retry = output<void>(); get message() { return errMsg(this.error()); } }

/** أزرار التصفية «طابور» — الفعّال داكن، والباقي هادئ. */
@Component({
  selector: 'app-filter-pills',
  template: `<div class="flex gap-2 mb-4">@for (o of options(); track o[0]) {<button class="pill !px-4 !py-2" [class.pill-active]="value() === o[0]" [class.pill-plain]="value() !== o[0]" (click)="valueChange.emit(o[0])">{{ o[1] }}</button>}</div>`,
})
export class FilterPills { options = input.required<ReadonlyArray<readonly [string, string]>>(); value = input.required<string>(); valueChange = output<string>(); }
