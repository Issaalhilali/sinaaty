import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, switchMap, throwError, catchError } from 'rxjs';
import { API, ApiError } from './api';
import { session } from './session';

/** علامة داخلية: هذا الطلب أُعيد مرةً بعد تجديد الرمز — لا يُعاد ثانية (لا تُرسل كترويسة فلا تُربك CORS). */
const RETRIED = new HttpContextToken<boolean>(() => false);

/**
 * تجديدٌ أحادي المسار: عشرة طلبات تسقط بـ 401 في اللحظة نفسها تنتظر تجديداً واحداً لا عشرة.
 * تنفيذ «Single-Flight Refresh Guard» من قواعد الجودة (§8) — بوعدٍ واحد يتقاسمه الجميع.
 */
let inflight: Promise<boolean> | null = null;
function refreshOnce(): Promise<boolean> {
  if (inflight) return inflight;
  inflight = (async () => {
    const rt = session.refresh;
    if (!rt) return false;
    try {
      const r = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) });
      if (!r.ok) { session.clear(); return false; }
      const d = (await r.json()) as { accessToken: string; refreshToken: string };
      session.set(d.accessToken, d.refreshToken);
      return true;
    } catch { return false; }
  })().finally(() => { inflight = null; });
  return inflight;
}

function toApiError(e: HttpErrorResponse): ApiError {
  const body = (e.error && typeof e.error === 'object' ? e.error : {}) as { code?: string; message_ar?: string; message_en?: string; details?: unknown };
  if (e.status === 0) return new ApiError(0, 'NETWORK', 'تعذّر الوصول إلى الخادم. تحقّق من اتصالك ثم أعد المحاولة.', 'Network error');
  return new ApiError(e.status, body.code ?? `HTTP_${e.status}`, body.message_ar ?? 'حدث خطأ غير متوقع.', body.message_en ?? 'Unexpected error', body.details);
}

const withAuth = (req: HttpRequest<unknown>) => {
  let headers = req.headers.set('accept-language', 'ar');
  const t = session.token;
  if (t && !req.url.includes('/auth/')) headers = headers.set('authorization', `Bearer ${t}`);
  return req.clone({ headers });
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const isAuth = req.url.includes('/auth/');
  return next(withAuth(req)).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && !isAuth && !req.context.get(RETRIED)) {
        return from(refreshOnce()).pipe(
          switchMap((ok) => {
            if (ok) return next(withAuth(req.clone({ context: req.context.set(RETRIED, true) }))).pipe(catchError((e2: HttpErrorResponse) => throwError(() => toApiError(e2))));
            session.clear();
            void router.navigate(['/login']);
            return throwError(() => toApiError(e));
          }),
        );
      }
      return throwError(() => toApiError(e));
    }),
  );
};
