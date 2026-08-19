'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Loading, Pill } from '@/components/ui';
import { api, fmtDate, fmtMoney } from '@/lib/api';
import { DISPUTE_CATEGORY, DISPUTE_STATUS, tone } from '@/lib/labels';
type D = { id: string; number: string; status: string; category: string; descriptionAr: string; claimedAmount: string | null; workOrderId: string | null; partOrderId: string | null; assignedTo: string | null; createdAt: string };
export default function DisputesPage() {
  const [status, setStatus] = useState('open,under_review,awaiting_parties,escalated');
  const q = useQuery({ queryKey: ['disputes', status], queryFn: () => api<D[]>(`/admin/disputes${status ? `?status=${status}` : ''}`), refetchInterval: 30_000 });
  return <Shell title="غرفة النزاعات" sub="فتح النزاع يجمّد المبلغ فوراً — لا يتحرك المال إلا بقرار مكتوب">
    <div className="flex gap-2 mb-4">{([['open,under_review,awaiting_parties,escalated', 'المفتوحة'], ['resolved', 'محسومة'], ['closed', 'مغلقة'], ['', 'الكل']] as const).map(([v, l]) => <button key={v || 'all'} className={`pill ${status === v ? 'bg-ink text-white' : 'pill-plain'} !px-4 !py-2`} onClick={() => setStatus(v)}>{l}</button>)}</div>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && (q.data.length === 0 ? <Empty text="لا نزاعات في هذا الطابور" /> : <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>النزاع</th><th>الحالة</th><th>الفئة</th><th>المطالبة</th><th>الوصف</th><th>فُتح</th><th></th></tr></thead><tbody>
      {q.data.map((d) => <tr key={d.id}><td className="num font-semibold">{d.number}</td><td><Pill label={DISPUTE_STATUS[d.status] ?? d.status} tone={tone(d.status)} /></td><td>{DISPUTE_CATEGORY[d.category] ?? d.category}</td><td className="num">{d.claimedAmount ? fmtMoney(d.claimedAmount) : '—'}</td><td className="max-w-[360px] truncate text-muted" title={d.descriptionAr}>{d.descriptionAr}</td><td className="num text-muted">{fmtDate(d.createdAt)}</td><td><Link className="text-seal font-bold" href={`/disputes/${d.id}`}>فتح الغرفة</Link></td></tr>)}
    </tbody></table></div>)}
  </Shell>;
}
