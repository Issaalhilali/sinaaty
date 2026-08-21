'use client';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { ErrorBox, Eyebrow, Loading, MediaThumb, Pill, ReasonDialog } from '@/components/ui';
import { api, fmtDate, fmtMoney } from '@/lib/api';
import { DISPUTE_CATEGORY, DISPUTE_STATUS, ESCROW, RESOLUTION, tone } from '@/lib/labels';
type Msg = { id: string; authorUserId: string; authorNameAr: string | null; isInternal: boolean; bodyAr: string; createdAt: string };
type D = { id: string; number: string; status: string; category: string; descriptionAr: string; claimedAmount: string | null; resolution: string | null; resolutionAmountToCustomer: string | null; resolutionNoteAr: string | null; workOrderId: string | null; partOrderId: string | null; assignedTo: string | null; createdAt: string; messages: Msg[]; media: Array<{ mediaId: string; label: string | null }>; escrow: { id: string; status: string; amount: string; released: string; refunded: string } | null };
const RESOLUTIONS = ['release_to_provider', 'refund_customer', 'split', 'replace_part', 'no_action'] as const;
export default function DisputeRoom() {
  const { id } = useParams<{ id: string }>(); const qc = useQueryClient();
  const [body, setBody] = useState(''); const [internal, setInternal] = useState(true); const [resolution, setResolution] = useState<string>('split'); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [confirm, setConfirm] = useState(false); const [statusDlg, setStatusDlg] = useState<string | null>(null); const [err, setErr] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['dispute', id], queryFn: () => api<D>(`/admin/disputes/${id}`), refetchInterval: 20_000 });
  const post = useMutation({ mutationFn: () => api(`/admin/disputes/${id}/messages`, { method: 'POST', body: JSON.stringify({ body_ar: body, is_internal: internal }) }), onSuccess: () => { setBody(''); qc.invalidateQueries({ queryKey: ['dispute', id] }); } });
  const setStatus = useMutation({ mutationFn: ({ s, reason }: { s: string; reason: string }) => api(`/admin/disputes/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: s, reason_ar: reason }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute', id] }) });
  const resolve = useMutation({ mutationFn: () => api(`/admin/disputes/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution, amount_to_customer: resolution === 'split' ? amount : undefined, note_ar: note }) }), onSuccess: () => { setConfirm(false); qc.invalidateQueries({ queryKey: ['dispute', id] }); }, onError: (e) => setErr((e as Error).message) });
  const d = q.data; const open = d && ['open', 'under_review', 'awaiting_parties', 'escalated'].includes(d.status);
  const held = Number(d?.escrow?.amount ?? 0); const toCustomer = resolution === 'refund_customer' ? held : resolution === 'split' ? Number(amount || 0) : 0;
  return <Shell title={d ? `نزاع ${d.number}` : 'نزاع'} sub={d ? `${DISPUTE_CATEGORY[d.category] ?? d.category} · فُتح ${fmtDate(d.createdAt)}` : undefined}>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {d && <div className="grid grid-cols-[1fr_340px] gap-4">
      <div className="space-y-4">
        <div className="card p-5"><div className="flex items-start justify-between gap-3"><div><div className="text-xs text-muted">شكوى مقدّم الطلب</div><p className="mt-1">{d.descriptionAr}</p></div><Pill label={DISPUTE_STATUS[d.status] ?? d.status} tone={tone(d.status)} /></div>
          <div className="flex gap-4 mt-3 text-sm text-muted"><span>المطالبة: <b className="num text-ink">{d.claimedAmount ? fmtMoney(d.claimedAmount) : '—'}</b></span><span>الأدلة: <b className="num text-ink">{d.media.length}</b></span>{d.workOrderId && <span className="num">WO {d.workOrderId.slice(0, 8)}</span>}{d.partOrderId && <span className="num">PO {d.partOrderId.slice(0, 8)}</span>}</div>
          {d.media.length > 0 && <div className="flex flex-wrap gap-2 mt-3">{d.media.map((m) => <MediaThumb key={m.mediaId} id={m.mediaId} label={m.label} />)}</div>}</div>
        <div className="card p-5"><Eyebrow right={`${d.messages.length} رسالة`}>المحادثة</Eyebrow>
          <div className="space-y-2 max-h-[380px] overflow-auto">{d.messages.map((m) => <div key={m.id} className={`rounded-xl p-3 text-sm ${m.isInternal ? 'bg-brass-soft border border-brass/30' : 'bg-ground'}`}><div className="flex justify-between text-xs text-muted mb-1"><span className="font-bold text-ink">{m.authorNameAr ?? 'مستخدم'}{m.isInternal ? ' · ملاحظة داخلية' : ''}</span><span className="num">{fmtDate(m.createdAt)}</span></div>{m.bodyAr}</div>)}{d.messages.length === 0 && <p className="text-sm text-muted">لا رسائل بعد</p>}</div>
          <div className="mt-3"><textarea className="input h-20 py-2" placeholder="اكتب رداً…" value={body} onChange={(e) => setBody(e.target.value)} />
            <div className="flex items-center gap-3 mt-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />ملاحظة داخلية (لا يراها الأطراف)</label><button className="btn ms-auto !h-10" disabled={body.trim().length < 1 || post.isPending} onClick={() => post.mutate()}>إرسال</button></div></div></div>
      </div>
      <div className="space-y-3">
        <div className="seal-card"><div className="text-sm opacity-80">المبلغ محل النزاع</div><div className="num text-3xl font-bold mt-1">{d.escrow ? fmtMoney(d.escrow.amount) : '—'}</div>
          {d.escrow && <div className="text-xs opacity-85 mt-1">الحالة: {ESCROW[d.escrow.status] ?? d.escrow.status} · مسترد {fmtMoney(d.escrow.refunded)} · محرَّر {fmtMoney(d.escrow.released)}</div>}
          {d.escrow?.status === 'frozen' && d.resolution && ['replace_part', 'no_action'].includes(d.resolution) && <div className="mt-2"><Pill label="بانتظار قرار لاحق — المبلغ ما زال مجمّداً" tone="pill-warn" /></div>}
          {!d.escrow && <div className="text-xs opacity-85 mt-1">لا يوجد مبلغ محفوظ — القرار بلا حركة مالية</div>}</div>
        {d.status === 'resolved' || d.status === 'closed' ? <div className="card p-4"><Eyebrow>القرار</Eyebrow><div className="font-bold">{RESOLUTION[d.resolution ?? ''] ?? d.resolution}</div>{d.resolutionAmountToCustomer && <div className="num text-sm mt-1">للعميل: {fmtMoney(d.resolutionAmountToCustomer)}</div>}<p className="text-sm text-muted mt-2">{d.resolutionNoteAr}</p>
          {d.status === 'resolved' && <button className="btn-ghost w-full mt-3" onClick={() => setStatusDlg('closed')}>إغلاق النزاع</button>}</div>
        : open && <div className="card p-4"><Eyebrow>إصدار قرار</Eyebrow>
          <select className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>{RESOLUTIONS.map((r) => <option key={r} value={r}>{RESOLUTION[r]}</option>)}</select>
          {resolution === 'split' && <input className="input mt-2 num" dir="ltr" inputMode="decimal" placeholder={`مبلغ العميل (0 – ${held.toFixed(2)})`} value={amount} onChange={(e) => setAmount(e.target.value)} />}
          <textarea className="input h-20 py-2 mt-2" placeholder="مبرّر القرار (يظهر للطرفين ويُسجَّل)" value={note} onChange={(e) => setNote(e.target.value)} />
          {d.escrow && <p className="text-xs text-muted mt-2">للعميل <b className="num text-ink">{fmtMoney(toCustomer)}</b> · للمزوّد <b className="num text-ink">{fmtMoney(Math.max(held - toCustomer, 0))}</b></p>}
          {err && <p className="text-sm text-bad mt-2">{err}</p>}
          <button className="btn w-full mt-3" disabled={note.trim().length < 5 || (resolution === 'split' && !amount) || resolve.isPending} onClick={() => setConfirm(true)}>إصدار القرار وتحريك المبلغ</button>
          <div className="flex gap-2 mt-2">{d.status !== 'awaiting_parties' && <button className="btn-ghost flex-1" onClick={() => setStatusDlg('awaiting_parties')}>بانتظار الأطراف</button>}<button className="btn-ghost flex-1" onClick={() => setStatusDlg('escalated')}>تصعيد</button></div>
        </div>}
      </div>
    </div>}
    {confirm && <ReasonDialog title="تأكيد قرار النزاع" hint={`${RESOLUTION[resolution]} — للعميل ${fmtMoney(toCustomer)} وللمزوّد ${fmtMoney(Math.max(held - toCustomer, 0))}. الحركة تُسجَّل في دفتر الأستاذ فوراً.`} confirmLabel="إصدار القرار" danger onConfirm={async (reason) => { setNote(note + ' — ' + reason); await resolve.mutateAsync(); }} onClose={() => setConfirm(false)} />}
    {statusDlg && <ReasonDialog title={`تغيير حالة النزاع إلى: ${DISPUTE_STATUS[statusDlg]}`} confirmLabel="تأكيد" onConfirm={async (reason) => { await setStatus.mutateAsync({ s: statusDlg, reason }); }} onClose={() => setStatusDlg(null)} />}
  </Shell>;
}
