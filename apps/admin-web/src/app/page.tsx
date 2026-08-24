'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AttentionBar } from '@/components/attention-bar';
import { Shell } from '@/components/shell';
import { ErrorBox, Eyebrow, Kpi, Loading, Pill } from '@/components/ui';
import { api, fmtMoney } from '@/lib/api';
import { attentionItems } from '@/lib/attention';
import { INTEG, tone } from '@/lib/labels';
type Overview = { orgs: { total: number; active: number; pending_kyb: number }; work_orders: { month: number; awaiting_approval: number; in_progress: number; approved_within_1h_pct: number | null }; money: { escrow_held: string; released_30d: string; platform_fees_30d: string; ledger_imbalance: string }; notes: { open: number; overdue: number; outstanding: string }; parts: { open_requests: number; orders_30d: number }; integrations: Array<{ provider: string; last24h: number; succeeded: number; failed: number; dead_letter: number }>; outbox: { pending: number; dead_letter: number } };
export default function OverviewPage() {
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/admin/overview'), refetchInterval: 30_000 });
  // نزاع بمال مجمَّد وطلب صرف بانتظار موافقة ثانية لا يظهران في /overview — وهما أوجب ما يوجب إنساناً.
  // «مفتوح» وحدها لا تكفي: المبلغ يبقى مجمَّداً في «قيد الدراسة» و«بانتظار الأطراف» و«مُصعَّد» —
  // نفس القائمة التي تستعملها صفحة النزاعات لزرّ «المفتوحة».
  // نداءان زهيدان، وفشل أيٍّ منهما يُسقط بنده من الشريط ولا يعطّل الصفحة.
  const disputes = useQuery({ queryKey: ['overview-disputes'], queryFn: () => api<unknown[]>('/admin/disputes?status=open,under_review,awaiting_parties,escalated'), refetchInterval: 30_000, retry: false });
  const approvals = useQuery({ queryKey: ['overview-approvals'], queryFn: () => api<unknown[]>('/admin/approvals?status=requested'), refetchInterval: 30_000, retry: false });
  const attention = q.data ? attentionItems({
    ledgerImbalance: q.data.money.ledger_imbalance,
    outboxDeadLetter: q.data.outbox.dead_letter,
    integrationDeadLetters: q.data.integrations.reduce((a, i) => a + i.dead_letter, 0),
    openDisputes: Array.isArray(disputes.data) ? disputes.data.length : 0,
    overdueNotes: q.data.notes.overdue,
    pendingKyb: q.data.orgs.pending_kyb,
    pendingApprovals: Array.isArray(approvals.data) ? approvals.data.length : 0,
  }) : [];
  return <Shell title="نظرة عامة" sub="آخر تحديث كل 30 ثانية · الرياض">
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && <>
      <AttentionBar items={attention} />
      <div className="grid grid-cols-5 gap-3">
        <Kpi value={q.data.work_orders.month} label="أمر عمل هذا الشهر" sub={`${q.data.work_orders.awaiting_approval} بانتظار اعتماد · ${q.data.work_orders.in_progress} قيد التنفيذ`} />
        <Kpi value={q.data.work_orders.approved_within_1h_pct == null ? '—' : `${q.data.work_orders.approved_within_1h_pct}%`} label="اعتماد خلال ساعة (30 يوم)" />
        <Link href="/payments"><Kpi value={fmtMoney(q.data.money.escrow_held)} label="في الضمان (محفوظ)" sub={`محرَّر 30 يوم: ${fmtMoney(q.data.money.released_30d)}`} /></Link>
        <Link href="/notes"><Kpi value={q.data.notes.open} label="سند لأمر ساري" sub={`${q.data.notes.overdue} متأخر · القائم ${fmtMoney(q.data.notes.outstanding)}`} /></Link>
        <Link href="/organizations"><Kpi value={q.data.orgs.pending_kyb} label="KYB بانتظار المراجعة" sub={`${q.data.orgs.active} منشأة نشطة من ${q.data.orgs.total}`} /></Link>
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4 mt-4">
        <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>التكامل</th><th>آخر 24 س</th><th>نجاح</th><th>فشل</th><th>DLQ</th><th></th></tr></thead><tbody>
          {q.data.integrations.map((i) => <tr key={i.provider}><td className="font-semibold">{i.provider}</td><td className="num">{i.last24h}</td><td className="num">{i.succeeded}</td><td className="num">{i.failed}</td><td className="num">{i.dead_letter}</td><td><Pill label={i.dead_letter > 0 ? INTEG.dead_letter : i.failed > 0 ? 'راقب' : 'سليم'} tone={i.dead_letter > 0 ? 'pill-bad' : i.failed > 0 ? 'pill-warn' : 'pill-seal'} /></td></tr>)}
          {q.data.integrations.length === 0 && <tr><td colSpan={6} className="text-muted text-center">لا توجد طلبات تكامل بعد</td></tr>}
        </tbody></table></div>
        <div className="space-y-4">
          <Link href="/payments" className="seal-card block"><div className="text-sm opacity-80">صحة دفتر الأستاذ</div><div className="num text-3xl font-bold mt-1">{q.data.money.ledger_imbalance === '0.00' ? '0.00' : q.data.money.ledger_imbalance}</div><div className="text-xs opacity-80 mt-1">{q.data.money.ledger_imbalance === '0.00' ? 'متوازن — كل قيد مالي مزدوج ومغلق' : 'فارق في الميزان — افحص فوراً'}</div><div className="mt-3 text-xs opacity-90">عمولة المنصة 30 يوم: <span className="num font-bold">{fmtMoney(q.data.money.platform_fees_30d)}</span></div></Link>
          <Link href="/integrations" className="card p-4 block"><Eyebrow>الصندوق الصادر (Outbox)</Eyebrow><div className="flex gap-6"><div><div className="num text-2xl font-bold">{q.data.outbox.pending}</div><div className="text-xs text-muted">معلّق</div></div><div><div className={`num text-2xl font-bold ${q.data.outbox.dead_letter ? 'text-bad' : ''}`}>{q.data.outbox.dead_letter}</div><div className="text-xs text-muted">متوقف (DLQ)</div></div></div></Link>
          <div className="card p-4"><Eyebrow>سوق القطع</Eyebrow><div className="flex gap-6"><div><div className="num text-2xl font-bold">{q.data.parts.open_requests}</div><div className="text-xs text-muted">مزادات مفتوحة</div></div><div><div className="num text-2xl font-bold">{q.data.parts.orders_30d}</div><div className="text-xs text-muted">طلبات قطع 30 يوم</div></div></div></div>
        </div>
      </div>
    </>}
  </Shell>;
}
