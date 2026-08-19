'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Loading, Pill } from '@/components/ui';
import { api, fmtDate } from '@/lib/api';
import { ORG_STATUS, ORG_TYPE, tone } from '@/lib/labels';
type Org = { id: string; type: string; status: string; legalNameAr: string; tradeNameAr: string | null; crNumber: string | null; vatNumber: string | null; createdAt: string };
export default function OrganizationsPage() {
  const [status, setStatus] = useState('pending_kyb');
  const q = useQuery({ queryKey: ['orgs', status], queryFn: () => api<Org[]>(`/admin/organizations?limit=200${status ? `&status=${status}` : ''}`) });
  return <Shell title="المنشآت و KYB" sub="طابور التحقق أولاً — اعتماد/رفض بسبب مكتوب يُسجَّل في سجل التدقيق">
    <div className="flex gap-2 mb-4">{([['pending_kyb', 'بانتظار التحقق'], ['active', 'نشطة'], ['suspended', 'موقوفة'], ['', 'الكل']] as const).map(([v, l]) => <button key={v || 'all'} className={`pill ${status === v ? 'bg-ink text-white' : 'pill-plain'} !px-4 !py-2`} onClick={() => setStatus(v)}>{l}</button>)}</div>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && (q.data.length === 0 ? <Empty text="لا توجد منشآت في هذا الطابور" /> : <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>المنشأة</th><th>النوع</th><th>السجل التجاري</th><th>الرقم الضريبي</th><th>الحالة</th><th>أُنشئت</th><th></th></tr></thead><tbody>
      {q.data.map((o) => <tr key={o.id}><td className="font-semibold">{o.tradeNameAr ?? o.legalNameAr}</td><td>{ORG_TYPE[o.type] ?? o.type}</td><td className="num">{o.crNumber ?? '—'}</td><td className="num">{o.vatNumber ?? '—'}</td><td><Pill label={ORG_STATUS[o.status] ?? o.status} tone={tone(o.status)} /></td><td className="num text-muted">{fmtDate(o.createdAt)}</td><td><Link className="text-seal font-bold" href={`/organizations/${o.id}`}>فتح</Link></td></tr>)}
    </tbody></table></div>)}
  </Shell>;
}
