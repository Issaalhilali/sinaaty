/** الجلسة في sessionStorage بالمفاتيح نفسها التي استعملتها النسخة السابقة — جلسة مشغّلٍ مفتوحة لا تنقطع بالتحويل. */
const TOKEN = 'sinaaty.admin.token';
const REFRESH = 'sinaaty.admin.refresh';
const store = () => (typeof window === 'undefined' ? null : window.sessionStorage);

export const session = {
  get token(): string | null { return store()?.getItem(TOKEN) ?? null; },
  get refresh(): string | null { return store()?.getItem(REFRESH) ?? null; },
  set(access: string, refresh: string) { store()?.setItem(TOKEN, access); store()?.setItem(REFRESH, refresh); },
  clear() { store()?.removeItem(TOKEN); store()?.removeItem(REFRESH); },
};
