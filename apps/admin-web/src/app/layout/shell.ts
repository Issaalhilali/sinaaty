import { Component, effect, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { API } from '../core/api';
import { ROLE } from '../core/labels';
import { session } from '../core/session';
import { NAV } from './nav';

type Me = { id: string; full_name_ar: string | null; phone: string; platform_role: string };

/** هيكل الشريط الجانبي؛ يحرس دور المنصة عبر GET /me — دورٌ «none» يعني ليس من الفريق فيُطرد بلطف. */
@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen grid grid-cols-[240px_1fr]">
      <aside class="bg-ink text-[#C2CDC7] p-5 sticky top-0 h-screen flex flex-col overflow-y-auto">
        <div class="flex items-center gap-2.5 text-white font-bold text-lg mb-6"><span class="grid h-8 w-8 place-items-center rounded-[10px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span class="h-3 w-3 rounded-full border-2 border-white"></span></span>صناعية · الإدارة</div>
        <nav class="flex-1 space-y-5">
          @for (group of nav; track group.title) {
            <div>
              <div class="px-3 pb-1.5 text-[10.5px] font-bold tracking-wide text-[#6E837B] uppercase">{{ group.title }}</div>
              <div class="space-y-0.5">
                @for (item of group.items; track item.href) {
                  <a [routerLink]="item.href" routerLinkActive="bg-[#123A2F] text-seal-glow font-bold" #rla="routerLinkActive" [routerLinkActiveOptions]="{ exact: item.href === '/' }" [title]="item.hint"
                     class="flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm text-[#aab8b1] hover:bg-white/5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-[18px] w-[18px] shrink-0 mt-[2px]"><path [attr.d]="item.icon.d"/>@if (item.icon.circle; as c) {<circle [attr.cx]="c.cx" [attr.cy]="c.cy" [attr.r]="c.r"/>}</svg>
                    <span class="min-w-0"><span class="block leading-5">{{ item.label }}</span>@if (rla.isActive) {<span class="block text-[11px] font-normal text-[#8FA79D] leading-4 mt-0.5">{{ item.hint }}</span>}</span>
                  </a>
                }
              </div>
            </div>
          }
        </nav>
        <div class="text-xs text-[#8C9C95] border-t border-white/10 pt-4 mt-4">
          <div class="text-white font-semibold">{{ me.value()?.full_name_ar ?? me.value()?.phone ?? '…' }}</div>
          <div>{{ role[me.value()?.platform_role ?? ''] ?? '' }}</div>
          <button class="mt-2 underline" (click)="logout()">تسجيل الخروج</button>
        </div>
      </aside>
      <main class="p-7 max-w-[1400px] w-full">
        <header class="mb-5"><h1 class="text-2xl font-bold">{{ title() }}</h1>@if (sub()) {<p class="text-sm text-muted">{{ sub() }}</p>}</header>
        <ng-content />
      </main>
    </div>
  `,
})
export class Shell {
  title = input.required<string>();
  sub = input<string | undefined>();
  nav = NAV;
  role = ROLE;
  private router = inject(Router);
  me = httpResource<Me>(() => `${API}/me`);
  constructor() {
    effect(() => {
      const m = this.me.value();
      if (m && m.platform_role === 'none') { session.clear(); void this.router.navigate(['/login'], { queryParams: { denied: 1 } }); }
    });
  }
  logout() { session.clear(); void this.router.navigate(['/login']); }
}
