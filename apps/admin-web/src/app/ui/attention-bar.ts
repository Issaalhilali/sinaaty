import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AttentionItem, attentionSeverity } from '../core/attention';

/** شريط «يحتاج تدخّلك الآن» فوق النظرة العامة — كل بند يفتح الصفحة التي تُعالجه.
 *
 * لا يظهر في اليوم الهادئ، ولا يعرض رقماً لا يوجب فعلاً. الأرقام الباقية تحته تبقى للقراءة —
 * أما الإلحاح فيُقال مرة واحدة، هنا. */
@Component({
  selector: 'app-attention-bar',
  imports: [RouterLink],
  template: `
    @if (severity(); as s) {
      <div class="card p-4 mb-4 border-s-4" [class.border-s-bad]="s === 'bad'" [class.border-s-warn]="s === 'warn'">
        <div class="eyebrow mb-2"><span>يحتاج تدخّلك الآن</span></div>
        <div class="flex flex-wrap gap-2">
          @for (i of items(); track i.key) {
            <a [routerLink]="i.href" class="pill !px-4 !py-2 hover:opacity-80" [class.pill-bad]="i.tone === 'bad'" [class.pill-warn]="i.tone === 'warn'">
              @if (i.count !== null) { <span class="num font-bold me-2">{{ i.count }}</span> }{{ i.label }}
            </a>
          }
        </div>
      </div>
    }
  `,
})
export class AttentionBar {
  items = input.required<AttentionItem[]>();
  severity = computed(() => attentionSeverity(this.items()));
}
