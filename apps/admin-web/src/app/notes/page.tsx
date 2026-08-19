'use client';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Loading, Pill } from '@/components/ui';
import { api, fmtDate, fmtMoney } from '@/lib/api';
import { NOTE, tone } from '@/lib/labels';
type Note = { id: string; number: string; status: string; amount: string; outstandingAmount: string; dueDate: string; nafezReference: string | null; creditorOrgId: string; debtorUserId: string | null; debtorOrgId: string | null; workOrderId: string | null; partOrderId: string | null; createdAt: string };
export default function NotesPage() {
  const [f, setF] = useState<'open' | 'overdue' | 'all'>('open');
  const q = useQuery({ queryKey: ['admin-notes', f], queryFn: () => api<Note[]>(`/admin/promissory-notes?limit=200${f === 'open' ? '&status=issued,partially_settled,in_enforcement' : f === 'overdue' ? '&overdue=true' : ''}`) });
  const total = (q.data ?? []).reduce((a, n) => a + Number(n.outstandingAmount), 0);
  return <Shell title="السندات والمخالصات" sub="سند لأمر إلكتروني (نافذ) لكل دفع آجل — يُغلق تلقائياً بالمخالصة عند السداد">
    <div className="flex gap-2 mb-4 items-center">{([['open', 'سارية'], ['overdue', 'متأخرة'], ['all', 'الكل']] as const).map(([v, l]) => <button key={v} className={`pill ${f === v ? 'bg-ink text-white' : 'pill-plain'} !px-4 !py-2`} onClick={() => setF(v)}>{l}</button>)}<span className="ms-auto text-sm text-muted">القائم: <span className="num font-bold text-ink">{fmtMoney(total)}</span></span></div>
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && (q.data.length === 0 ? <Empty text="لا سندات" /> : <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>السند</th><th>الحالة</th><th>المبلغ</th><th>القائم</th><th>الاستحقاق</th><th>مرجع نافذ</th><th>المرجع</th></tr></thead><tbody>{q.data.map((n) => { const overdue = ['issued', 'partially_settled'].includes(n.status) && new Date(n.dueDate) < new Date(); return <tr key={n.id}><td className="num font-semibold">{n.number}</td><td><Pill label={overdue ? 'متأخر' : (NOTE[n.status] ?? n.status)} tone={overdue ? 'pill-bad' : tone(n.status)} /></td><td className="num">{fmtMoney(n.amount)}</td><td className="num font-semibold">{fmtMoney(n.outstandingAmount)}</td><td className="num text-muted">{fmtDate(n.dueDate)}</td><td className="num text-xs">{n.nafezReference ?? '—'}</td><td className="num text-xs text-muted">{n.workOrderId ? `WO ${n.workOrderId.slice(0, 8)}` : n.partOrderId ? `PO ${n.partOrderId.slice(0, 8)}` : '—'}</td></tr>; })}</tbody></table></div>)}
  </Shell>;
}
