'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill } from '@/components/ui';
import { api, fmtDate, fmtMoney } from '@/lib/api';

type Org = { id: string; legalNameAr: string; tradeNameAr: string | null; status: string; phoneE164?: string | null; createdAt: string };
type Overview = {
  vehicles: number; openWorkOrders: number; awaitingApproval: number; monthSpend: string; openNotes: number;
  policy: { id: string; name_ar: string; auto_approve_below: string; monthly_budget: string | null } | null;
  budget_remaining: string | null; budget_used_pct: string | null;
};
type Pending = {
  id: string; number: string; total: string; workshopNameAr: string | null; plate: string | null; assetCode: string | null; requestedAt: string;
  policy: { outcome: string; approvals_required: number; blocked: boolean; reason_ar: string };
  approvals: Array<{ by: string | null; decision: string; note_ar: string | null; at: string }>;
  ready_to_sign: boolean;
};
type Statement = { id: string; periodStart: string; periodEnd: string; total: string; invoiceIds: string[]; status: string };

const OUTCOME_AR: Record<string, string> = {
  auto: 'اعتماد تلقائي (تحت الحد)', one_approver: 'يحتاج معتمداً واحداً', two_approvers: 'يحتاج معتمدَين',
  workshop_not_allowed: 'الورشة خارج القائمة المعتمدة', over_budget: 'يتجاوز ميزانية الشهر',
};

/** One fleet, opened: its numbers, what waits on a decision, and its monthly statements. */
function FleetDetail({ org }: { org: Org }) {
  const overview = useQuery({ queryKey: ['fleet', org.id, 'overview'], queryFn: () => api<Overview>(`/fleet/${org.id}/overview`) });
  const pending = useQuery({ queryKey: ['fleet', org.id, 'approvals'], queryFn: () => api<Pending[]>(`/fleet/${org.id}/approvals`) });
  const statements = useQuery({ queryKey: ['fleet', org.id, 'statements'], queryFn: () => api<Statement[]>(`/fleet/${org.id}/statements`) });
  const o = overview.data;

  if (overview.isLoading) return <Loading />;
  if (overview.error) return <ErrorBox error={overview.error} retry={() => overview.refetch()} />;

  return (
    <div className="mt-4 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi value={o?.vehicles ?? 0} label="مركبة مسجّلة" />
        <Kpi value={o?.openWorkOrders ?? 0} label="إصلاحات مفتوحة" />
        <Kpi value={o?.awaitingApproval ?? 0} label="بانتظار قرار الأسطول" tone={o?.awaitingApproval ? 'warn' : undefined} />
        <Kpi value={fmtMoney(o?.monthSpend)} label="التزام هذا الشهر" sub={o?.budget_used_pct ? `${o.budget_used_pct}% من الميزانية` : undefined} tone={Number(o?.budget_used_pct ?? 0) > 85 ? 'warn' : undefined} />
        <Kpi value={o?.openNotes ?? 0} label="سندات قائمة" />
      </div>

      {o?.policy ? (
        <p className="text-xs text-muted">
          سياسة الصرف: «{o.policy.name_ar}» — اعتماد تلقائي تحت {fmtMoney(o.policy.auto_approve_below)}
          {o.policy.monthly_budget && <> · ميزانية شهرية {fmtMoney(o.policy.monthly_budget)} (المتبقي {fmtMoney(o.budget_remaining)})</>}
        </p>
      ) : (
        <p className="text-xs text-warn">لا توجد سياسة صرف — كل إصلاح يحتاج معتمداً واحداً.</p>
      )}

      <section>
        <Eyebrow>بانتظار قرار الأسطول</Eyebrow>
        {pending.isLoading ? <Loading /> : !pending.data?.length ? <Empty text="لا يوجد ما ينتظر قراراً — كل الإصلاحات إما معتمدة أو تحت الحد التلقائي." /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs"><th className="p-3 text-start">الأمر</th><th className="p-3 text-start">الورشة</th><th className="p-3 text-start">المبلغ</th><th className="p-3 text-start">ماذا تقول السياسة</th><th className="p-3 text-start">القرارات</th></tr></thead>
              <tbody>
                {pending.data.map((p) => (
                  <tr key={p.id} className="border-t border-line">
                    <td className="p-3"><div className="font-semibold num">{p.number}</div><div className="text-xs text-muted">{p.assetCode ?? p.plate ?? '—'} · {fmtDate(p.requestedAt)}</div></td>
                    <td className="p-3">{p.workshopNameAr ?? '—'}</td>
                    <td className="p-3 num font-semibold">{fmtMoney(p.total)}</td>
                    <td className="p-3"><Pill label={OUTCOME_AR[p.policy.outcome] ?? p.policy.outcome} tone={p.policy.blocked ? 'pill-bad' : p.ready_to_sign ? 'pill-seal' : 'pill-brass'} />{p.policy.blocked && <div className="text-xs text-bad mt-1">{p.policy.reason_ar}</div>}</td>
                    <td className="p-3 text-xs">
                      {p.approvals.length === 0 ? <span className="text-muted">لا قرارات بعد ({p.policy.approvals_required} مطلوب)</span>
                        : p.approvals.map((a, i) => <div key={i}>{a.decision === 'approved' ? '✓' : '✗'} {a.by ?? '—'}{a.note_ar && <span className="text-muted"> — {a.note_ar}</span>}</div>)}
                      {p.ready_to_sign && <div className="text-seal font-bold mt-1">جاهز للتوقيع</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <Eyebrow>الكشوف الشهرية</Eyebrow>
        {statements.isLoading ? <Loading /> : !statements.data?.length ? <Empty text="لم يُنشأ كشف بعد — يولّده الأسطول من بوابته لكل شهر." /> : (
          <div className="card divide-y divide-line">
            {statements.data.map((st) => (
              <div key={st.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1"><span className="font-semibold num">{new Date(st.periodStart).toLocaleDateString('ar', { month: 'long', year: 'numeric' })}</span><span className="text-muted text-xs ms-2">{st.invoiceIds.length} فاتورة</span></div>
                <span className="num font-semibold">{fmtMoney(st.total)}</span>
                <a className="btn-ghost text-xs" href={`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000'}/v1/fleet/statements/${st.id}/export.csv`} target="_blank" rel="noreferrer">CSV للمحاسب</a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function FleetsPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const orgs = useQuery({ queryKey: ['fleets'], queryFn: () => api<Org[]>('/admin/organizations?type=fleet_company&status=active&limit=100') });

  return (
    <Shell title="الأساطيل" sub="شركات تملك مركبات كثيرة — سياسات صرفها، ما ينتظر قرارها، وكشوفها الشهرية">
      {orgs.isLoading ? <Loading /> : orgs.error ? <ErrorBox error={orgs.error} retry={() => orgs.refetch()} /> : !orgs.data?.length ? (
        <Empty text="لا توجد شركات أساطيل مسجّلة بعد. تُنشأ من التطبيق أو عبر التهيئة الميدانية." />
      ) : (
        <div className="space-y-3">
          {orgs.data.map((org) => (
            <div key={org.id} className="card p-4">
              <button className="w-full flex items-center gap-3 text-start" onClick={() => setOpenId(openId === org.id ? null : org.id)}>
                <div className="flex-1">
                  <div className="font-bold">{org.tradeNameAr ?? org.legalNameAr}</div>
                  <div className="text-xs text-muted">{org.legalNameAr}</div>
                </div>
                <Pill label={org.status === 'active' ? 'نشطة' : org.status} tone={org.status === 'active' ? 'pill-seal' : 'pill-plain'} />
                <span className="text-muted text-xs">{openId === org.id ? 'إخفاء' : 'عرض التفاصيل'}</span>
              </button>
              {openId === org.id && <FleetDetail org={org} />}
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
