'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Shell } from '@/components/shell';
import { ErrorBox, Eyebrow, Kpi, Loading, Pill } from '@/components/ui';
import { api, fmtMoney } from '@/lib/api';

/**
 * غرفة عمليات اليوم — الشاشة التي تُفتح أول الدوام وتبقى مفتوحة.
 *
 * ليست مؤشرات عرض: كل صفٍّ هنا شيءٌ ينتظر إنساناً *الآن* — عميلٌ نشر عطله ولا أحد يرد،
 * مزادُ قطعةٍ يموت صفراً، مشترٍ صامتٌ حجز بضاعة بائع، مالٌ مجمّد أو فات موعد تحرره.
 * حين تفرغ الغرفة يكون السوق يدير نفسه — وهذا هو المقصود.
 */
type Ops = {
  repair_no_offers: { count: number; rows: Array<{ id: string; number: string; titleAr: string; createdAt: string }> };
  parts_ending_no_bids: { count: number; rows: Array<{ id: string; number: string; partNameAr: string; endsAt: string }> };
  part_orders_unpaid: { count: number; rows: Array<{ id: string; number: string; total: string; buyerNameAr: string | null; createdAt: string }> };
  wo_awaiting_approval: { count: number; rows: Array<{ id: string; number: string; titleAr: string | null; orgNameAr: string | null; since: string }> };
  escrow_frozen: { count: number; total: string };
  escrow_past_release: { count: number; total: string };
  notes_overdue: { count: number; outstanding: string };
  integrations: { dead_letters: number; stalled: number };
  outbox_pending: number;
  ledger_imbalance: string;
};

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `منذ ${m} د` : m < 60 * 24 ? `منذ ${Math.round(m / 60)} س` : `منذ ${Math.round(m / 1440)} يوم`;
};
const until = (iso: string) => { const m = Math.round((new Date(iso).getTime() - Date.now()) / 60_000); return m <= 0 ? 'انتهى' : m < 60 ? `يبقى ${m} د` : `يبقى ${Math.round(m / 60)} س`; };

function Queue({ title, hint, count, empty, children }: { title: string; hint: string; count: number; empty: string; children?: React.ReactNode }) {
  return <div className="card p-4">
    <div className="flex items-baseline justify-between mb-2">
      <div><span className="font-bold text-[14.5px]">{title}</span><span className="text-muted text-[12px] mr-2">{hint}</span></div>
      <Pill label={String(count)} tone={count > 0 ? 'pill-warn' : 'pill-seal'} />
    </div>
    {count === 0 ? <div className="text-muted text-[12.5px] py-2">{empty}</div> : <div className="divide-y divide-line/60">{children}</div>}
  </div>;
}
const Row = ({ main, side, sub }: { main: string; side: string; sub?: string | null }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5 text-[13px]">
    <span className="truncate">{main}{sub && <span className="text-muted"> · {sub}</span>}</span>
    <span className="text-muted num whitespace-nowrap">{side}</span>
  </div>
);

export default function OpsPage() {
  const q = useQuery({ queryKey: ['ops'], queryFn: () => api<Ops>('/admin/ops'), refetchInterval: 20_000 });
  const d = q.data;
  const imbalanced = d && d.ledger_imbalance !== '0.00';
  return <Shell title="غرفة العمليات" sub="ما ينتظر تدخّلاً الآن · تتحدث كل 20 ثانية">
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {d && <>
      {/* الميزان فوق كل شيء: انحرافه ليس طابوراً بل إنذار حريق */}
      {imbalanced && <div className="card p-4 mb-4 border-2 border-warn text-warn font-bold">⚠ ميزان الدفتر منحرف: {d.ledger_imbalance} — أوقف كل إجراءٍ مالي وراجع فوراً</div>}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Link href="/payments"><Kpi value={d.escrow_frozen.count} label="مبالغ مجمّدة (نزاعات)" sub={fmtMoney(d.escrow_frozen.total)} tone={d.escrow_frozen.count > 0 ? 'warn' : undefined} /></Link>
        <Link href="/payments"><Kpi value={d.escrow_past_release.count} label="فات موعد تحرره ولم يتحرر" sub={fmtMoney(d.escrow_past_release.total)} tone={d.escrow_past_release.count > 0 ? 'warn' : undefined} /></Link>
        <Link href="/notes"><Kpi value={d.notes_overdue.count} label="سند متأخر السداد" sub={fmtMoney(d.notes_overdue.outstanding)} tone={d.notes_overdue.count > 0 ? 'warn' : undefined} /></Link>
        <Link href="/integrations"><Kpi value={d.integrations.dead_letters + d.integrations.stalled} label="تكاملات تحتاج نظرة" sub={`${d.integrations.dead_letters} DLQ · ${d.integrations.stalled} متعثر · ${d.outbox_pending} بالانتظار`} tone={d.integrations.dead_letters > 0 ? 'warn' : undefined} /></Link>
      </div>
      <Eyebrow>طوابير السوق</Eyebrow>
      <div className="grid grid-cols-2 gap-4">
        <Queue title="عملاء بلا عروض" hint="طلب إصلاح منشور ولا ورشة ردّت" count={d.repair_no_offers.count} empty="كل طلبٍ منشور وصله عرض — السوق يرد">
          {d.repair_no_offers.rows.map((r) => <Row key={r.id} main={r.titleAr} sub={r.number} side={ago(r.createdAt)} />)}
        </Queue>
        <Queue title="مزادات تنتهي صفراً" hint="طلب قطعة يوشك أن يموت بلا عرض" count={d.parts_ending_no_bids.count} empty="لا مزاد يحتضر — الموردون يزايدون">
          {d.parts_ending_no_bids.rows.map((r) => <Row key={r.id} main={r.partNameAr} sub={r.number} side={until(r.endsAt)} />)}
        </Queue>
        <Queue title="مشترون صامتون" hint="أمر قطع معلّق على الدفع — بضاعة البائع محجوزة" count={d.part_orders_unpaid.count} empty="لا أمر عالق على الدفع">
          {d.part_orders_unpaid.rows.map((r) => <Row key={r.id} main={r.buyerNameAr ?? r.number} sub={r.number} side={`${fmtMoney(r.total)} · ${ago(r.createdAt)}`} />)}
        </Queue>
        <Queue title="اعتمادات نائمة" hint="أمر عمل ينتظر توقيع العميل طويلاً — الورشة واقفة" count={d.wo_awaiting_approval.count} empty="لا اعتماد نائم">
          {d.wo_awaiting_approval.rows.map((r) => <Row key={r.id} main={r.titleAr ?? r.number} sub={r.orgNameAr} side={ago(r.since)} />)}
        </Queue>
      </div>
    </>}
  </Shell>;
}
