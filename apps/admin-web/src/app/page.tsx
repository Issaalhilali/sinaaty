'use client';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { ErrorBox, Eyebrow, Kpi, Loading, Pill } from '@/components/ui';
import { api, fmtMoney } from '@/lib/api';
import { INTEG, tone } from '@/lib/labels';
type Overview = { orgs: { total: number; active: number; pending_kyb: number }; work_orders: { month: number; awaiting_approval: number; in_progress: number; approved_within_1h_pct: number | null }; money: { escrow_held: string; released_30d: string; platform_fees_30d: string; ledger_imbalance: string }; notes: { open: number; overdue: number; outstanding: string }; parts: { open_requests: number; orders_30d: number }; integrations: Array<{ provider: string; last24h: number; succeeded: number; failed: number; dead_letter: number }>; outbox: { pending: number; dead_letter: number } };
export default function OverviewPage() {
  const q = useQuery({ queryKey: ['overview'], queryFn: () => api<Overview>('/admin/overview'), refetchInterval: 30_000 });
  return <Shell title="نظرة عامة" sub="آخر تحديث كل 30 ثانية · الرياض">
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && <>
      <div className="grid grid-cols-5 gap-3">
        <Kpi value={q.data.work_orders.month} label="أمر عمل هذا الشهر" sub={`${q.data.work_orders.awaiting_approval} بانتظار اعتماد · ${q.data.work_orders.in_progress} قيد التنفيذ`} />
        <Kpi value={q.data.work_orders.approved_within_1h_pct == null ? '—' : `${q.data.work_orders.approved_within_1h_pct}%`} label="اعتماد خلال ساعة (30 يوم)" />
        <Kpi value={fmtMoney(q.data.money.escrow_held)} label="في الضمان (محفوظ)" sub={`محرَّر 30 يوم: ${fmtMoney(q.data.money.released_30d)}`} />
        <Kpi value={q.data.notes.open} label="سند لأمر ساري" sub={`${q.data.notes.overdue} متأخر · القائم ${fmtMoney(q.data.notes.outstanding)}`} tone={q.data.notes.overdue > 0 ? 'warn' : undefined} />
        <Kpi value={q.data.orgs.pending_kyb} label="KYB بانتظار المراجعة" sub={`${q.data.orgs.active} منشأة نشطة من ${q.data.orgs.total}`} tone={q.data.orgs.pending_kyb > 0 ? 'warn' : undefined} />
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4 mt-4">
        <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>التكامل</th><th>آخر 24 س</th><th>نجاح</th><th>فشل</th><th>DLQ</th><th></th></tr></thead><tbody>
          {q.data.integrations.map((i) => <tr key={i.provider}><td className="font-semibold">{i.provider}</td><td className="num">{i.last24h}</td><td className="num">{i.succeeded}</td><td className="num">{i.failed}</td><td className="num">{i.dead_letter}</td><td><Pill label={i.dead_letter > 0 ? INTEG.dead_letter : i.failed > 0 ? 'راقب' : 'سليم'} tone={i.dead_letter > 0 ? 'pill-bad' : i.failed > 0 ? 'pill-warn' : 'pill-seal'} /></td></tr>)}
          {q.data.integrations.length === 0 && <tr><td colSpan={6} className="text-muted text-center">لا توجد طلبات تكامل بعد</td></tr>}
        </tbody></table></div>
        <div className="space-y-4">
          <div className="seal-card"><div className="text-sm opacity-80">صحة دفتر الأستاذ</div><div className="num text-3xl font-bold mt-1">{q.data.money.ledger_imbalance === '0.00' ? '0.00' : q.data.money.ledger_imbalance}</div><div className="text-xs opacity-80 mt-1">{q.data.money.ledger_imbalance === '0.00' ? 'متوازن — كل قيد مالي مزدوج ومغلق' : 'فارق في الميزان — افحص فوراً'}</div><div className="mt-3 text-xs opacity-90">عمولة المنصة 30 يوم: <span className="num font-bold">{fmtMoney(q.data.money.platform_fees_30d)}</span></div></div>
          <div className="card p-4"><Eyebrow>الصندوق الصادر (Outbox)</Eyebrow><div className="flex gap-6"><div><div className="num text-2xl font-bold">{q.data.outbox.pending}</div><div className="text-xs text-muted">معلّق</div></div><div><div className={`num text-2xl font-bold ${q.data.outbox.dead_letter ? 'text-bad' : ''}`}>{q.data.outbox.dead_letter}</div><div className="text-xs text-muted">متوقف (DLQ)</div></div></div></div>
          <div className="card p-4"><Eyebrow>سوق القطع</Eyebrow><div className="flex gap-6"><div><div className="num text-2xl font-bold">{q.data.parts.open_requests}</div><div className="text-xs text-muted">مزادات مفتوحة</div></div><div><div className="num text-2xl font-bold">{q.data.parts.orders_30d}</div><div className="text-xs text-muted">طلبات قطع 30 يوم</div></div></div></div>
        </div>
      </div>
    </>}
  </Shell>;
}
