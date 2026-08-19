'use client';
/** Tiny API client: base URL from NEXT_PUBLIC_API_BASE_URL, bearer from sessionStorage, bilingual error envelope → Error(message_ar). */
export const API = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000') + '/v1';
export class ApiError extends Error { constructor(public status: number, public code: string, public messageAr: string, public messageEn: string, public details?: unknown) { super(messageAr); } }
const TOKEN = 'sinaaty.admin.token'; const REFRESH = 'sinaaty.admin.refresh';
export const session = {
  get token() { return typeof window === 'undefined' ? null : window.sessionStorage.getItem(TOKEN); },
  set(access: string, refresh: string) { window.sessionStorage.setItem(TOKEN, access); window.sessionStorage.setItem(REFRESH, refresh); },
  clear() { window.sessionStorage.removeItem(TOKEN); window.sessionStorage.removeItem(REFRESH); },
};
async function refresh(): Promise<boolean> { const rt = window.sessionStorage.getItem(REFRESH); if (!rt) return false; const r = await fetch(`${API}/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: rt }) }); if (!r.ok) { session.clear(); return false; } const d = (await r.json()) as { accessToken: string; refreshToken: string }; session.set(d.accessToken, d.refreshToken); return true; }
export async function api<T>(path: string, init: RequestInit & { raw?: boolean } = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = { 'accept-language': 'ar', ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}), ...((init.headers as Record<string, string>) ?? {}) };
  const t = session.token; if (t) headers.authorization = `Bearer ${t}`;
  const r = await fetch(`${API}${path}`, { ...init, headers });
  if (r.status === 401 && !retried && !path.startsWith('/auth/')) { if (await refresh()) return api<T>(path, init, true); if (typeof window !== 'undefined') window.location.href = '/login'; }
  if (!r.ok) { let body: { code?: string; message_ar?: string; message_en?: string; details?: unknown } = {}; try { body = await r.json(); } catch { /* non-json */ } throw new ApiError(r.status, body.code ?? `HTTP_${r.status}`, body.message_ar ?? 'حدث خطأ غير متوقع.', body.message_en ?? 'Unexpected error', body.details); }
  if (init.raw) return (await r.text()) as unknown as T;
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}
export const fmtMoney = (s: string | number | null | undefined) => `${Number(s ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
export const fmtDate = (d: string | Date | null | undefined) => (d ? new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Riyadh', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
