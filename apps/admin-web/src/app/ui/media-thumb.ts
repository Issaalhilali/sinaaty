import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API } from '../core/api';

/** مصغّرة فوق `GET /media/:id/download` — الرابط القصير العمر هو ما يمنح الوصول، لا المعرّف الخام أبداً. */
@Component({
  selector: 'app-media-thumb',
  template: `
    @if (q.isLoading()) { <div class="rounded-lg bg-line animate-pulse" [style.width.px]="size()" [style.height.px]="size()"></div> }
    @else if (!q.value()) { <div class="rounded-lg border border-line grid place-items-center text-[11px] text-muted" [style.width.px]="size()" [style.height.px]="size()">تعذّر</div> }
    @else if (isAudio) {
      <figure class="rounded-lg border border-line p-2 shrink-0 bg-white" style="width:250px">
        <figcaption class="text-[11px] text-muted mb-1 truncate">{{ label() ?? 'تسجيل صوتي' }}</figcaption>
        <audio controls preload="none" [src]="q.value()!.url" class="w-full" style="height:32px"></audio>
      </figure>
    } @else {
      <a [href]="q.value()!.url" target="_blank" rel="noreferrer" [title]="label() ?? ''" class="block shrink-0">
        @if (isImage) { <img [src]="q.value()!.url" [alt]="label() ?? 'مرفق'" class="rounded-lg object-cover border border-line" [style.width.px]="size()" [style.height.px]="size()" /> }
        @else { <div class="rounded-lg border border-line grid place-items-center text-[11px] text-muted" [style.width.px]="size()" [style.height.px]="size()">ملف</div> }
      </a>
    }
  `,
})
export class MediaThumb {
  id = input.required<string>();
  label = input<string | null | undefined>();
  size = input(72);
  q = httpResource<{ url: string; mime_type: string }>(() => `${API}/media/${this.id()}/download`);
  get isImage() { return !!this.q.value()?.mime_type?.startsWith('image/'); }
  get isAudio() { return !!this.q.value()?.mime_type?.startsWith('audio/'); }
}
