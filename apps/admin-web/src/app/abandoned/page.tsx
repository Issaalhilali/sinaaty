'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill } from '@/components/ui';
import { api, fmtDate, fmtMoney } from '@/lib/api';

type Row = {
  work_order_id: string; number: string; status: string; org_name_ar: string | null; plate: string | null;
  ready_at: string | null; days_ready: number; notices_sent: number;
  storage: { chargeable_days: number; per_day: string; amount: string };
  claim: { repair: string; storage: string; total: string };
  can_declare: boolean; reason_ar: string;
};

/** How close this car is to a declaration, at a glance. */
function stage(r: Row): { label: string; tone: string } {
  if (r.status === 'abandoned') return { label: 'مُعلنة مهجورة', tone: 'pill-bad' };
  if (r.can_declare) return { label: 'مستوفية — بانتظار قرار الورشة', tone: 'pill-warn' };
  if (r.notices_sent >= 3) return { label: 'اكتملت الإنذارات', tone: 'pill-brass' };
  return { label: `${r.notices_sent}/3 إنذارات`, tone: 'pill-plain' };
}

export default function AbandonedPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['abandoned'], queryFn: () => api<Row[]>('/admin/abandoned') });
  const notice = useMutation({
    mutationFn: (id: string) => api(`/work-orders/${id}/abandoned/notice`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['abandoned'] }),
  });

  const rows = q.data ?? [];
  const declared = rows.filter((r) => r.status === 'abandoned');
  const waiting = rows.filter((r) => r.status !== 'abandoned');
  const exposure = rows.reduce((a, r) => a + Number(r.claim.total), 0);

  return (
    <Shell title="سيارات لم تُستلم" sub="جاهزة ولم يستلمها أصحابها. بعد المهلة والإنذارات تُسجَّل نظاماً «مركبة مهجورة».">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi value={waiting.length} label="سيارة بانتظار الاستلام" />
        <Kpi value={declared.length} label="مُعلنة مهجورة" tone={declared.length ? 'warn' : undefined} sub={declared.length ? 'تحتاج متابعة تنفيذ' : undefined} />
        <Kpi value={waiting.filter((r) => r.can_declare).length} label="مستوفية شروط الإعلان" />
        <Kpi value={fmtMoney(exposure)} label="إجمالي المطالبات المحتملة" />
      </div>

      {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !rows.length ? (
        <Empty text="لا توجد سيارات متأخرة عن الاستلام — وهذا هو الوضع الطبيعي." />
      ) : (
        <>
          <Eyebrow>الطابور</Eyebrow>
          <p className="text-xs text-muted mb-2">الإعلان قرار الورشة، لا الإدارة. من هنا يمكن دفع الإنذار المستحق فقط.</p>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs">
                <th className="p-3 text-start">الأمر</th><th className="p-3 text-start">الورشة</th><th className="p-3 text-start">جاهزة منذ</th>
                <th className="p-3 text-start">الحالة</th><th className="p-3 text-start">رسوم الحفظ</th><th className="p-3 text-start">المطالبة</th><th className="p-3" />
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const s = stage(r);
                  return <tr key={r.work_order_id} className="border-t border-line">
                    <td className="p-3"><div className="font-semibold num">{r.number}</div><div className="text-xs text-muted">{r.plate ?? '—'}</div></td>
                    <td className="p-3">{r.org_name_ar ?? '—'}</td>
                    <td className="p-3"><div className="num">{r.days_ready} يوماً</div><div className="text-xs text-muted">{fmtDate(r.ready_at)}</div></td>
                    <td className="p-3"><Pill label={s.label} tone={s.tone} /></td>
                    <td className="p-3"><div className="num">{fmtMoney(r.storage.amount)}</div><div className="text-xs text-muted num">{r.storage.chargeable_days} يوم × {r.storage.per_day}</div></td>
                    <td className="p-3 num font-semibold">{fmtMoney(r.claim.total)}</td>
                    <td className="p-3 text-end">
                      {r.status !== 'abandoned' && r.notices_sent < 3 && (
                        <button className="btn-ghost text-xs" disabled={notice.isPending} onClick={() => notice.mutate(r.work_order_id)}>إرسال الإنذار المستحق</button>
                      )}
                      {r.status !== 'abandoned' && r.notices_sent >= 3 && <span className="text-xs text-muted">{r.reason_ar}</span>}
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {notice.error && <p className="text-sm text-bad mt-3">{(notice.error as Error).message}</p>}
        </>
      )}
    </Shell>
  );
}
