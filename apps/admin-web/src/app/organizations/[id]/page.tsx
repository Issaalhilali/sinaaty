'use client';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { ErrorBox, Eyebrow, Loading, Pill, ReasonDialog } from '@/components/ui';
import { api, fmtDate } from '@/lib/api';
import { ORG_STATUS, ORG_TYPE, tone } from '@/lib/labels';
type Org = { id: string; type: string; status: string; legalNameAr: string; legalNameEn: string | null; tradeNameAr: string | null; crNumber: string | null; vatNumber: string | null; phone: string | null; email: string | null; commissionRateBps: number; createdAt: string; kyb_documents?: Array<{ id: string; type: string; status: string; createdAt: string }>; members?: Array<{ userId: string; role: string; fullNameAr?: string | null }> };
export default function OrgProfile() {
  const { id } = useParams<{ id: string }>(); const qc = useQueryClient(); const [dlg, setDlg] = useState<null | 'approve' | 'reject' | 'suspend' | 'reactivate'>(null);
  const q = useQuery({ queryKey: ['org', id], queryFn: () => api<Org>(`/admin/organizations/${id}`) });
  const act = useMutation({ mutationFn: ({ action, reason }: { action: string; reason: string }) => api(`/admin/organizations/${id}/${action}`, { method: 'POST', body: JSON.stringify({ reason_ar: reason }) }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['org', id] }); qc.invalidateQueries({ queryKey: ['orgs'] }); } });
  const o = q.data;
  return <Shell title={o ? (o.tradeNameAr ?? o.legalNameAr) : 'منشأة'} sub={o ? `${ORG_TYPE[o.type] ?? o.type} · ${o.crNumber ?? ''}` : undefined}>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {o && <div className="grid grid-cols-[1fr_320px] gap-4">
      <div className="space-y-4">
        <div className="card p-5"><div className="flex items-start justify-between"><div><div className="text-lg font-bold">{o.legalNameAr}</div><div className="text-sm text-muted">{o.legalNameEn}</div></div><Pill label={ORG_STATUS[o.status] ?? o.status} tone={tone(o.status)} /></div>
          <dl className="grid grid-cols-3 gap-3 mt-4 text-sm"><div><dt className="text-xs text-muted">السجل التجاري</dt><dd className="num font-semibold">{o.crNumber ?? '—'}</dd></div><div><dt className="text-xs text-muted">الرقم الضريبي</dt><dd className="num font-semibold">{o.vatNumber ?? '—'}</dd></div><div><dt className="text-xs text-muted">العمولة</dt><dd className="num font-semibold">{(o.commissionRateBps / 100).toFixed(2)}%</dd></div><div><dt className="text-xs text-muted">الجوال</dt><dd className="num">{o.phone ?? '—'}</dd></div><div><dt className="text-xs text-muted">البريد</dt><dd>{o.email ?? '—'}</dd></div><div><dt className="text-xs text-muted">أُنشئت</dt><dd className="num">{fmtDate(o.createdAt)}</dd></div></dl></div>
        <div className="card p-5"><Eyebrow>مستندات KYB</Eyebrow>{(o.kyb_documents ?? []).length === 0 ? <p className="text-sm text-muted">لا مستندات مرفوعة</p> : <table className="tbl"><thead><tr><th>النوع</th><th>الحالة</th><th>رُفع</th></tr></thead><tbody>{o.kyb_documents!.map((d) => <tr key={d.id}><td>{d.type}</td><td><Pill label={d.status} tone={tone(d.status)} /></td><td className="num text-muted">{fmtDate(d.createdAt)}</td></tr>)}</tbody></table>}</div>
        <div className="card p-5"><Eyebrow>الأعضاء</Eyebrow>{(o.members ?? []).length === 0 ? <p className="text-sm text-muted">—</p> : <ul className="text-sm space-y-1">{o.members!.map((m) => <li key={m.userId} className="flex justify-between"><span>{m.fullNameAr ?? m.userId}</span><span className="text-muted">{m.role}</span></li>)}</ul>}</div>
      </div>
      <div className="space-y-3">
        <div className="seal-card"><div className="text-sm opacity-80">الإجراء</div><div className="text-lg font-bold mt-1">كل قرار يحتاج سبباً ويُسجَّل باسمك</div>
          <div className="mt-4 space-y-2">
            {o.status === 'pending_kyb' && <><button className="btn w-full !bg-white !text-seal-deep" onClick={() => setDlg('approve')}>اعتماد المنشأة</button><button className="btn-ghost w-full !bg-transparent !text-white !border-white/40" onClick={() => setDlg('reject')}>رفض</button></>}
            {o.status === 'active' && <button className="btn-ghost w-full !bg-transparent !text-white !border-white/40" onClick={() => setDlg('suspend')}>إيقاف</button>}
            {o.status === 'suspended' && <button className="btn w-full !bg-white !text-seal-deep" onClick={() => setDlg('reactivate')}>إعادة التفعيل</button>}
          </div></div>
        {act.error && <p className="text-sm text-bad">{(act.error as Error).message}</p>}
      </div>
    </div>}
    {dlg && <ReasonDialog title={{ approve: 'اعتماد المنشأة', reject: 'رفض المنشأة', suspend: 'إيقاف المنشأة', reactivate: 'إعادة تفعيل المنشأة' }[dlg]} danger={dlg === 'reject' || dlg === 'suspend'} confirmLabel={{ approve: 'اعتماد', reject: 'رفض', suspend: 'إيقاف', reactivate: 'تفعيل' }[dlg]} onConfirm={async (reason) => { await act.mutateAsync({ action: dlg, reason }); }} onClose={() => setDlg(null)} />}
  </Shell>;
}
