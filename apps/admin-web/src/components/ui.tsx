'use client';
import { type ReactNode, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Thumbnail over `GET /media/:id/download` — the short-lived URL grants access, never the raw id. */
export function MediaThumb({ id, label, size = 72 }: { id: string; label?: string | null; size?: number }) {
  const q = useQuery({ queryKey: ['media-url', id], queryFn: () => api<{ url: string; mime_type: string }>(`/media/${id}/download`), staleTime: 240_000 });
  if (q.isLoading) return <div className="rounded-lg bg-line animate-pulse" style={{ width: size, height: size }} />;
  if (!q.data) return <div className="rounded-lg border border-line grid place-items-center text-[11px] text-muted" style={{ width: size, height: size }}>تعذّر</div>;
  const isImage = q.data.mime_type?.startsWith('image/');
  const isAudio = q.data.mime_type?.startsWith('audio/');
  if (isAudio) return <figure className="rounded-lg border border-line p-2 shrink-0 bg-white" style={{ width: 250 }}>
    <figcaption className="text-[11px] text-muted mb-1 truncate">{label ?? 'تسجيل صوتي'}</figcaption>
    <audio controls preload="none" src={q.data.url} className="w-full" style={{ height: 32 }} />
  </figure>;
  return <a href={q.data.url} target="_blank" rel="noreferrer" title={label ?? undefined} className="block shrink-0">
    {isImage
      ? <img src={q.data.url} alt={label ?? 'مرفق'} className="rounded-lg object-cover border border-line" style={{ width: size, height: size }} />
      : <div className="rounded-lg border border-line grid place-items-center text-[11px] text-muted" style={{ width: size, height: size }}>ملف</div>}
  </a>;
}
export function Pill({ label, tone = 'pill-plain' }: { label: string; tone?: string }) { return <span className={`pill ${tone}`}><i className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>; }
export function Kpi({ value, label, sub, tone }: { value: ReactNode; label: string; sub?: string; tone?: 'good' | 'warn' }) { return <div className="card p-4"><div className="num text-2xl font-bold">{value}</div><div className="text-xs text-muted mt-0.5">{label}</div>{sub && <div className={`text-[11.5px] font-bold mt-1 ${tone === 'warn' ? 'text-warn' : 'text-seal'}`}>{sub}</div>}</div>; }
export function Eyebrow({ children, right }: { children: ReactNode; right?: ReactNode }) { return <div className="eyebrow"><span>{children}</span>{right && <span className="ms-auto text-seal font-semibold">{right}</span>}</div>; }
/** Every sensitive action: reason required, typed once, goes to audit_log. */
export function ReasonDialog({ title, hint, confirmLabel = 'تأكيد', danger, onConfirm, onClose }: { title: string; hint?: string; confirmLabel?: string; danger?: boolean; onConfirm: (reason: string) => Promise<void>; onClose: () => void }) {
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}><div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
    <h3 className="text-lg font-bold">{title}</h3>{hint && <p className="text-sm text-muted mt-1">{hint}</p>}
    <label className="block text-xs font-bold text-muted mt-4 mb-1">السبب (يُسجَّل في سجل التدقيق)</label>
    <textarea className="input h-24 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبباً واضحاً…" />
    {err && <p className="text-sm text-bad mt-2">{err}</p>}
    <div className="mt-4 flex gap-2 justify-end"><button className="btn-ghost" onClick={onClose}>إلغاء</button><button className={danger ? 'btn-danger' : 'btn'} disabled={reason.trim().length < 3 || busy} onClick={async () => { setBusy(true); setErr(null); try { await onConfirm(reason.trim()); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }}>{busy ? '…' : confirmLabel}</button></div>
  </div></div>;
}
export function Empty({ text }: { text: string }) { return <div className="card p-8 text-center text-muted text-sm">{text}</div>; }
export function Loading() { return <div className="p-8 text-center text-muted text-sm">جارٍ التحميل…</div>; }
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) { return <div className="card p-6 text-center"><p className="text-sm text-bad">{(error as Error)?.message ?? 'تعذّر التحميل'}</p>{retry && <button className="btn-ghost mt-3" onClick={retry}>أعد المحاولة</button>}</div>; }
