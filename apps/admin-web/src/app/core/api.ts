import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/** عنوان الخادم يُحقن عند البناء (define) — وبيئة المختبِر بلا تعريف فتسقط إلى المحلي. */
export const API_ORIGIN = (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) || 'http://localhost:3000';
export const API = `${API_ORIGIN}/v1`;

/** غلاف الخطأ ثنائي اللغة كما يرسله الخادم — `message` هو العربي فتعرضه الشاشة كما هو. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, public messageAr: string, public messageEn: string, public details?: unknown) {
    super(messageAr);
    this.name = 'ApiError';
  }
}

/** استدعاءات الكتابة (POST/PUT). القراءات تمرّ عبر httpResource في الصفحات نفسها. */
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  get<T>(path: string) { return firstValueFrom(this.http.get<T>(`${API}${path}`)); }
  post<T = unknown>(path: string, body: unknown = {}) { return firstValueFrom(this.http.post<T>(`${API}${path}`, body)); }
  put<T = unknown>(path: string, body: unknown) { return firstValueFrom(this.http.put<T>(`${API}${path}`, body)); }
}

export const fmtMoney = (s: string | number | null | undefined) => `${Number(s ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
// عربي بأشهر عربية وأرقام غربية — كما يعرض التطبيق تماماً (§5.1: الأرقام غربية دائماً).
// 'ca-gregory' صريحة لأن 'ar-SA' وحدها تنزلق إلى الهجري، والتواريخ هنا قانونية ومالية لا تحتمل التباساً.
const AR_DATE = 'ar-u-nu-latn-ca-gregory';
export const fmtDate = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleString(AR_DATE, { timeZone: 'Asia/Riyadh', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
export const fmtDay = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleDateString(AR_DATE, { timeZone: 'Asia/Riyadh', day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtMonth = (d: string | Date) => new Date(d).toLocaleDateString('ar', { month: 'long', year: 'numeric' });
export const short = (id: string | null | undefined) => id?.slice(0, 8) ?? '—';
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'تعذّر التحميل');
