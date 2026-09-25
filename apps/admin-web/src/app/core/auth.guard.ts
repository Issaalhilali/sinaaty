import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { session } from './session';

/** بلا رمز → شاشة الدخول. صلاحية الدور تُفحص في الهيكل عبر /me (الخادم هو الحكم، لا الرمز وحده). */
export const authGuard: CanActivateFn = () => (session.token ? true : inject(Router).parseUrl('/login'));
