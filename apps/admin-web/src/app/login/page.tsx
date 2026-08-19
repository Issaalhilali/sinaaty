'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, session } from '@/lib/api';
function LoginForm() {
  const router = useRouter(); const denied = useSearchParams().get('denied'); const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [step, setStep] = useState<'phone' | 'code'>('phone'); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null); const [debug, setDebug] = useState<string | null>(null);
  const e164 = (p: string) => { const d = p.replace(/\D/g, ''); return d.startsWith('966') ? `+${d}` : d.startsWith('05') ? `+966${d.slice(1)}` : d.startsWith('5') ? `+966${d}` : `+${d}`; };
  const send = async () => { setBusy(true); setErr(null); try { const r = await api<{ debug_code?: string }>('/auth/otp/request', { method: 'POST', body: JSON.stringify({ phone: e164(phone) }) }); setDebug(r.debug_code ?? null); setStep('code'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  const verify = async () => { setBusy(true); setErr(null); try { const r = await api<{ accessToken: string; refreshToken: string }>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone: e164(phone), code, device: { platform: 'web', app_flavor: 'admin' } }) }); session.set(r.accessToken, r.refreshToken); const me = await api<{ platform_role: string }>('/me'); if (me.platform_role === 'none') { session.clear(); setErr('هذا الحساب ليس من فريق المنصة.'); return; } router.replace('/'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } };
  return <div className="min-h-screen grid place-items-center p-6"><div className="card w-full max-w-sm p-7">
    <div className="flex items-center gap-2.5 font-bold text-xl mb-6"><span className="grid h-9 w-9 place-items-center rounded-[11px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span className="h-3.5 w-3.5 rounded-full border-[2.5px] border-white" /></span>صناعتي · الإدارة</div>
    {denied && <p className="text-sm text-bad mb-3">الحساب ليس من فريق المنصة.</p>}
    {step === 'phone' ? <><label className="text-xs font-bold text-muted">رقم الجوال (فريق المنصة)</label><input className="input mt-1 num" dir="ltr" placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} /><button className="btn w-full mt-4" disabled={busy || phone.replace(/\D/g, '').length < 9} onClick={send}>أرسل رمز التحقق</button></>
      : <><label className="text-xs font-bold text-muted">رمز التحقق (العامل الثاني)</label><input className="input mt-1 num text-center tracking-[.4em]" dir="ltr" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verify()} autoFocus />{debug && <p className="text-xs text-muted mt-1">بيئة التطوير — الرمز: <span className="num font-bold">{debug}</span></p>}<button className="btn w-full mt-4" disabled={busy || code.length !== 6} onClick={verify}>دخول</button><button className="btn-ghost w-full mt-2" onClick={() => setStep('phone')}>رجوع</button></>}
    {err && <p className="text-sm text-bad mt-3">{err}</p>}
    <p className="text-[11.5px] text-muted mt-5">الدخول بدور منصة (دعم/عمليات/مالية/امتثال/مشرف) + رمز تحقق لمرة واحدة. كل إجراء حساس يتطلب سبباً ويُسجَّل.</p>
  </div></div>;
}
export default function LoginPage() { return <Suspense><LoginForm /></Suspense>; }
