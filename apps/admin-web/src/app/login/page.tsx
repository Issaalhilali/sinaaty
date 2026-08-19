'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, session } from '@/lib/api';
function LoginForm() {
  const router = useRouter(); const denied = useSearchParams().get('denied'); const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [step, setStep] = useState<'phone' | 'code'>('phone'); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [debug, setDebug] = useState<string | null>(null);
  /** Same rule as the API (identity/domain/otp.ts): optional +966 / 00966 / 0, then 5XXXXXXXX. Returns null when it is not a Saudi mobile. */
  const e164 = (p: string): string | null => { const digits = p.replace(/[^\d+]/g, ''); const m = /^(?:\+?966|00966|0)?(5\d{8})$/.exec(digits); return m ? `+966${m[1]}` : null; };
  const normalized = e164(phone);
  const send = async () => { if (!normalized) { setErr('أدخل رقم جوال سعودي صحيح: 05 ثم 8 أرقام (مثال 0512345678).'); return; } setBusy(true); setErr(null); try { const r = await api<{ debug_code?: string }>('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone: normalized }) }); setDebug(r.debug_code ?? null); setStep('code'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const verify = async () => { if (!normalized) return; setBusy(true); setErr(null); try { const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone: normalized, code, device: { platform: 'web', app_flavor: 'admin' } }) }); session.set(r.accessToken, r.refreshToken); const me = await api<{ platform_role: string }>('/me'); if (me.platform_role === 'none') { session.clear(); setErr(`الرقم ${normalized} مسجّل لكنه ليس من فريق المنصة. اطلب من مشرف المنصة منحك دوراً (المستخدمون ← تغيير الدور).`); return; } router.replace('/'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return <div className="min-h-screen grid place-items-center p-6"><div className="card w-full max-w-sm p-7">
    <div className="flex items-center gap-2.5 font-bold text-xl mb-6"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-white" /></span>صناعتي · الإدارة</div>
    {denied && <p className="text-sm text-bad mb-3">الحساب ليس من فريق المنصة.</p>}
    {step === 'phone' ? <><label className="text-xs font-bold text-muted">رقم الجوال (فريق المنصة)</label><input className="input mt-1 num" dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" value={phone} onChange={(e) => { setPhone(e.target.value); setErr(null); }} onKeyDown={(e) => e.key === 'Enter' && send()} />
      {phone.trim() !== '' && (normalized ? <p className="text-xs text-muted mt-1">سيُرسل إلى <span className="num font-bold">{normalized}</span></p> : <p className="text-xs text-bad mt-1">رقم غير صالح — 05 ثم 8 أرقام</p>)}
      <button className="btn w-full mt-4" disabled={busy || !normalized} onClick={send}>أرسل رمز التحقق</button></>
      : <><label className="text-xs font-bold text-muted">رمز التحقق (العامل الثاني)</label><input className="input mt-1 num text-center tracking-[.4em]" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} autoFocus />{debug && <p className="text-xs text-muted mt-1">بيئة التطوير — الرمز: <span className="num font-bold">{debug}</span></p>}<button className="btn w-full mt-4" disabled={busy || code.length !== 6} onClick={verify}>دخول</button><button className="btn-ghost w-full mt-2" onClick={() => setStep('phone')}>رجوع</button></>}
    {err && <p className="text-sm text-bad mt-3">{err}</p>}
    <p className="text-[11.5px] text-muted mt-5">الدخول بدور منصة (دعم/عمليات/مالية/امتثال/مشرف) + رمز تحقق لمرة واحدة. كل إجراء حساس يتطلب سبباً ويُسجَّل.</p>
  </div></div>;
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
