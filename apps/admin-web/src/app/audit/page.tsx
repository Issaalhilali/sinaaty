'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { API, api, fmtDate, session } from '@/lib/api';
type Row = { id: string; occurredAt: string; actorUserId: string | null; actorType: string; orgId: string | null; action: string; entityType: string; entityId: string | null; before: unknown; after: unknown; hash: string; prevHash: string | null };
export default function AuditPage() {
  const [action, setAction] = useState(''); const [entity, setEntity] = useState(''); const [open, setOpen] = useState<string | null>(null);
  const q = useQuery({ queryKey: ['audit', action, entity], queryFn: () => api<Row[]>(`/admin/audit?limit=200${action ? `&action=${encodeURIComponent(action)}` : ''}${entity ? `&entity_type=${encodeURIComponent(entity)}` : ''}`) });
  const exportCsv = async () => { const r = await fetch(`${API}/admin/audit.csv?${action ? `action=${encodeURIComponent(action)}&` : ''}${entity ? `entity_type=${encodeURIComponent(entity)}` : ''}`, { headers: { authorization: `Bearer ${session.token}` } }); const blob = await r.blob(); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit.csv'; a.click(); URL.revokeObjectURL(url); };
  return <Shell title="سجل التدقيق" sub="سلسلة تجزئة غير قابلة للتعديل — كل إجراء حساس يظهر هنا باسم منفّذه وسببه">
    <div className="flex gap-2 mb-4"><input className="input max-w-xs num" dir="ltr" placeholder="action (e.g. escrow.release)" value={action} onChange={(e) => setAction(e.target.value)} /><input className="input max-w-xs num" dir="ltr" placeholder="entity_type" value={entity} onChange={(e) => setEntity(e.target.value)} /><button className="btn-ghost ms-auto" onClick={exportCsv}>تصدير CSV</button></div>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && (q.data.length === 0 ? <Empty text="لا سجلات" /> : <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>الوقت</th><th>الإجراء</th><th>الكيان</th><th>المنفّذ</th><th>التجزئة</th><th></th></tr></thead><tbody>{q.data.map((r) => <><tr key={r.id}><td className="num text-muted whitespace-nowrap">{fmtDate(r.occurredAt)}</td><td className="font-semibold num">{r.action}</td><td className="num text-xs text-muted">{r.entityType} · {r.entityId?.slice(0, 8) ?? '—'}</td><td className="num text-xs">{r.actorType} · {r.actorUserId?.slice(0, 8) ?? 'system'}</td><td className="num text-[10px] text-muted">{r.hash.slice(0, 12)}…</td><td><button className="text-seal text-xs font-bold" onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'إخفاء' : 'تفاصيل'}</button></td></tr>{open === r.id && <tr key={`${r.id}-d`}><td colSpan={6} className="bg-[#F7F9F7]"><pre className="text-[11px] whitespace-pre-wrap num" dir="ltr">{JSON.stringify({ before: r.before, after: r.after, prev_hash: r.prevHash, hash: r.hash }, null, 2)}</pre></td></tr>}</>)}</tbody></table></div>)}
  </Shell>;
}
