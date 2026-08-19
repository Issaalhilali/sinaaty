'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Loading, Pill, ReasonDialog } from '@/components/ui';
import { api, fmtDate } from '@/lib/api';
import { ROLE, tone } from '@/lib/labels';
type U = { id: string; phone: string | null; fullNameAr: string | null; status: string; platformRole: string; nafathVerifiedAt: string | null; createdAt: string };
export default function UsersPage() {
  const qc = useQueryClient(); const [q, setQ] = useState(''); const [role, setRole] = useState<{ user: U; role: string } | null>(null);
  const list = useQuery({ queryKey: ['users', q], queryFn: () => api<U[]>(`/admin/users?q=${encodeURIComponent(q)}`) });
  const set = useMutation({ mutationFn: ({ id, r, reason }: { id: string; r: string; reason: string }) => api(`/admin/users/${id}/platform-role`, { method: 'PUT', body: JSON.stringify({ platform_role: r, reason_ar: reason }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }) });
  return <Shell title="المستخدمون وأدوار المنصة" sub="أدوار فريق المنصة: دعم · عمليات · مالية · امتثال · مشرف عام — تغيير الدور لمشرف عام فقط وبسبب">
    <input className="input max-w-sm mb-4 num" dir="ltr" placeholder="بحث بالجوال أو الاسم" value={q} onChange={(e) => setQ(e.target.value)} />
    {list.isLoading && <Loading />}{list.error && <ErrorBox error={list.error} retry={() => list.refetch()} />}
    {list.data && (list.data.length === 0 ? <Empty text="لا نتائج" /> : <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>الاسم</th><th>الجوال</th><th>نفاذ</th><th>الحالة</th><th>دور المنصة</th><th>أُنشئ</th><th></th></tr></thead><tbody>{list.data.map((u) => <tr key={u.id}><td className="font-semibold">{u.fullNameAr ?? '—'}</td><td className="num">{u.phone}</td><td>{u.nafathVerifiedAt ? <Pill label="موثّق" tone="pill-seal" /> : <Pill label="—" />}</td><td><Pill label={u.status} tone={tone(u.status)} /></td><td><Pill label={ROLE[u.platformRole] ?? u.platformRole} tone={u.platformRole === 'none' ? 'pill-plain' : 'pill-brass'} /></td><td className="num text-muted">{fmtDate(u.createdAt)}</td><td><select className="input !h-8 !w-auto text-xs" value="" onChange={(e) => e.target.value && setRole({ user: u, role: e.target.value })}><option value="">تغيير الدور…</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td></tr>)}</tbody></table></div>)}
    {role && <ReasonDialog title={`تعيين ${ROLE[role.role]} — ${role.user.fullNameAr ?? role.user.phone}`} confirmLabel="تعيين" onConfirm={async (reason) => { await set.mutateAsync({ id: role.user.id, r: role.role, reason }); }} onClose={() => setRole(null)} />}
  </Shell>;
}
