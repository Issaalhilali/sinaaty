import { Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { Api, errMsg } from '../core/api';
import { session } from '../core/session';

/** الدخول بدور منصة + رمز تحقق لمرة واحدة. الرقم يُطبَّع بقاعدة الخادم نفسها (identity/domain/otp.ts). */
@Component({
  selector: 'app-login',
  imports: [FormsModule, InputTextModule],
  template: `
    <div class="min-h-screen grid place-items-center p-6"><div class="card w-full max-w-sm p-7">
      <div class="flex items-center gap-2.5 font-bold text-xl mb-6"><span class="grid h-9 w-9 place-items-center rounded-[11px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span class="h-3.5 w-3.5 rounded-full border-[2.5px] border-white"></span></span>صناعية · الإدارة</div>
      @if (denied()) { <p class="text-sm text-bad mb-3">الحساب ليس من فريق المنصة.</p> }
      @if (step() === 'phone') {
        <label class="text-xs font-bold text-muted">رقم الجوال (فريق المنصة)</label>
        <input pInputText class="input mt-1 num" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx" [ngModel]="phone()" (ngModelChange)="phone.set($event); err.set(null)" (keydown.enter)="send()" />
        @if (phone().trim() !== '') {
          @if (normalized(); as n) { <p class="text-xs text-muted mt-1">سيُرسل إلى <span class="num font-bold">{{ n }}</span></p> }
          @else { <p class="text-xs text-bad mt-1">رقم غير صالح — 05 ثم 8 أرقام</p> }
        }
        <button class="btn w-full mt-4" [disabled]="busy() || !normalized()" (click)="send()">أرسل رمز التحقق</button>
      } @else {
        <label class="text-xs font-bold text-muted">رمز التحقق (العامل الثاني)</label>
        <input pInputText class="input mt-1 num text-center tracking-[.4em]" dir="ltr" inputmode="numeric" maxlength="6" [ngModel]="code()" (ngModelChange)="code.set($event)" (keydown.enter)="verify()" autofocus />
        @if (debug()) { <p class="text-xs text-muted mt-1">بيئة التطوير — الرمز: <span class="num font-bold">{{ debug() }}</span></p> }
        <button class="btn w-full mt-4" [disabled]="busy() || code().length !== 6" (click)="verify()">دخول</button>
        <button class="btn-ghost w-full mt-2" (click)="step.set('phone')">رجوع</button>
      }
      @if (err()) { <p class="text-sm text-bad mt-3">{{ err() }}</p> }
      <p class="text-[11.5px] text-muted mt-5">الدخول بدور منصة (دعم/عمليات/مالية/امتثال/مشرف) + رمز تحقق لمرة واحدة. كل إجراء حساس يتطلب سبباً ويُسجَّل.</p>
    </div></div>
  `,
})
export class LoginPage {
  /** من `?denied=1` — يُربط تلقائياً بـ withComponentInputBinding. */
  denied = input<string | undefined>();
  private api = inject(Api);
  private router = inject(Router);
  phone = signal(''); code = signal(''); step = signal<'phone' | 'code'>('phone');
  busy = signal(false); err = signal<string | null>(null); debug = signal<string | null>(null);

  /** اختياري +966 / 00966 / 0 ثم 5XXXXXXXX؛ وإلا فليس جوالاً سعودياً. */
  normalized(): string | null {
    const digits = this.phone().replace(/[^\d+]/g, '');
    const m = /^(?:\+?966|00966|0)?(5\d{8})$/.exec(digits);
    return m ? `+966${m[1]}` : null;
  }
  async send() {
    const n = this.normalized();
    if (!n) { this.err.set('أدخل رقم جوال سعودي صحيح: 05 ثم 8 أرقام (مثال 0512345678).'); return; }
    this.busy.set(true); this.err.set(null);
    try { const r = await this.api.post<{ debug_code?: string }>('/auth/otp/request', { phone: n }); this.debug.set(r.debug_code ?? null); this.step.set('code'); }
    catch (e) { this.err.set(errMsg(e)); }
    finally { this.busy.set(false); }
  }
  async verify() {
    const n = this.normalized(); if (!n) return;
    this.busy.set(true); this.err.set(null);
    try {
      const r = await this.api.post<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', { phone: n, code: this.code(), device: { platform: 'web', app_flavor: 'admin' } });
      session.set(r.accessToken, r.refreshToken);
      const me = await this.api.get<{ platform_role: string }>('/me');
      if (me.platform_role === 'none') { session.clear(); this.err.set(`الرقم ${n} مسجّل لكنه ليس من فريق المنصة. اطلب من مشرف المنصة منحك دوراً (المستخدمون ← تغيير الدور).`); return; }
      await this.router.navigateByUrl('/');
    } catch (e) { this.err.set(errMsg(e)); }
    finally { this.busy.set(false); }
  }
}
