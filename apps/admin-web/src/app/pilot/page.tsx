'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Shell } from '@/components/shell';
import { Empty, ErrorBox, Eyebrow, Kpi, Loading, Pill, ReasonDialog } from '@/components/ui';
import { api, fmtMoney } from '@/lib/api';

type Flag = { key: string; rule: { enabled?: boolean; orgs?: string[]; org_types?: string[]; zones?: string[]; pct?: number }; known: boolean };
type Zone = { code: string; nameAr: string; city: string; radiusKm: number };
type Funnel = {
  work_orders: { created: number; approved: number; invoiced: number; paid: number; approval_rate: string; invoice_rate: string; payment_rate: string };
  parts: { requested: number; bid: number; ordered: number };
};
type ZoneRow = { zone: string | null; name_ar: string; orgs: number; workOrders: number; paidInvoices: number; gmv: string };
type Activation = { organizations: number; active: number; activation_rate: string; rows: Array<{ orgId: string; nameAr: string; zone: string | null; workOrders: number; lastActiveAt: string | null }> };

const FLAG_AR: Record<string, string> = {
  parts_marketplace: 'سوق القطع', trade_accounts: 'الحسابات الآجلة', group_buys: 'الشراء الجماعي', tow: 'السطحات',
  accident_reports: 'تقارير الحوادث', warranty_wallet: 'محفظة الضمانات', disputes: 'النزاعات',
  voice_to_invoice: 'الصوت إلى فاتورة', ai_inspection: 'الفحص بالذكاء الاصطناعي',
};

/** Where a flag is open right now, in one line an operator can read at a glance. */
function scopeOf(rule: Flag['rule']): { label: string; tone: string } {
  if (rule.enabled) return { label: 'مفعّل للجميع', tone: 'pill-seal' };
  if (rule.zones?.length) return { label: `مناطق: ${rule.zones.join('، ')}`, tone: 'pill-brass' };
  if (rule.org_types?.length) return { label: `أنواع: ${rule.org_types.join('، ')}`, tone: 'pill-brass' };
  if (rule.orgs?.length) return { label: `${rule.orgs.length} منشأة محددة`, tone: 'pill-brass' };
  if (rule.pct) return { label: `${rule.pct}% من المنشآت`, tone: 'pill-brass' };
  return { label: 'مغلق', tone: 'pill-plain' };
}

export default function PilotPage() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<Flag | null>(null);

  const flags = useQuery({ queryKey: ['pilot', 'flags'], queryFn: () => api<Flag[]>('/admin/pilot/flags') });
  const zones = useQuery({ queryKey: ['pilot', 'zones'], queryFn: () => api<Zone[]>('/admin/pilot/zones') });
  const funnel = useQuery({ queryKey: ['pilot', 'funnel'], queryFn: () => api<Funnel>('/admin/pilot/funnel') });
  const byZone = useQuery({ queryKey: ['pilot', 'by-zone'], queryFn: () => api<ZoneRow[]>('/admin/pilot/by-zone') });
  const activation = useQuery({ queryKey: ['pilot', 'activation'], queryFn: () => api<Activation>('/admin/pilot/activation') });

  const setFlag = useMutation({
    mutationFn: ({ key, rule, reason }: { key: string; rule: Flag['rule']; reason: string }) =>
      api(`/admin/pilot/flags/${key}`, { method: 'PUT', body: JSON.stringify({ ...rule, reason_ar: reason }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilot'] }),
  });
  const backfill = useMutation({
    mutationFn: () => api<{ checked: number; tagged: number }>('/admin/pilot/zones/backfill', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pilot'] }),
  });

  const f = funnel.data?.work_orders;

  return (
    <Shell title="الطيار" sub="المناطق الصناعية · مفاتيح الميزات · قمع التحويل — آخر ٣٠ يوماً">
      {funnel.isLoading ? <Loading /> : funnel.error ? <ErrorBox error={funnel.error} retry={() => funnel.refetch()} /> : (
        <>
          <Eyebrow>القمع: من وصول السيارة إلى الدفع</Eyebrow>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
            <Kpi value={f?.created ?? 0} label="أوامر عمل أُنشئت" />
            <Kpi value={f?.approved ?? 0} label="اعتمدها العملاء" sub={`${f?.approval_rate ?? '0.0'}% من المُنشأة`} />
            <Kpi value={f?.invoiced ?? 0} label="صدرت لها فواتير" sub={`${f?.invoice_rate ?? '0.0'}% من المعتمدة`} />
            <Kpi value={f?.paid ?? 0} label="فواتير مدفوعة" sub={`${f?.payment_rate ?? '0.0'}% من الصادرة`} tone={Number(f?.payment_rate ?? 0) < 60 ? 'warn' : undefined} />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Kpi value={funnel.data?.parts.requested ?? 0} label="طلبات قطع" />
            <Kpi value={funnel.data?.parts.bid ?? 0} label="عروض موردين" />
            <Kpi value={funnel.data?.parts.ordered ?? 0} label="طلبات شراء" />
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <Eyebrow right={<button className="underline" onClick={() => backfill.mutate()} disabled={backfill.isPending}>{backfill.isPending ? '…' : 'وسم المواقع غير المصنّفة'}</button>}>
            المناطق الصناعية
          </Eyebrow>
          {backfill.data && <p className="text-xs text-seal mb-2">فُحص {backfill.data.checked} موقعاً ووُسم {backfill.data.tagged}.</p>}
          {zones.isLoading ? <Loading /> : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-muted text-xs"><th className="p-3 text-start">المنطقة</th><th className="p-3 text-start">المدينة</th><th className="p-3 text-start">منشآت</th><th className="p-3 text-start">أوامر</th><th className="p-3 text-start">مدفوع</th></tr></thead>
                <tbody>
                  {(zones.data ?? []).map((z) => {
                    const row = byZone.data?.find((r) => r.zone === z.code);
                    return <tr key={z.code} className="border-t border-line">
                      <td className="p-3"><div className="font-semibold">{z.nameAr}</div><div className="text-xs text-muted num">{z.code} · {z.radiusKm} كم</div></td>
                      <td className="p-3">{z.city}</td>
                      <td className="p-3 num">{row?.orgs ?? 0}</td>
                      <td className="p-3 num">{row?.workOrders ?? 0}</td>
                      <td className="p-3 num">{fmtMoney(row?.gmv ?? 0)}</td>
                    </tr>;
                  })}
                  {byZone.data?.filter((r) => !r.zone).map((r) => (
                    <tr key="outside" className="border-t border-line text-muted"><td className="p-3">خارج المناطق</td><td className="p-3">—</td><td className="p-3 num">{r.orgs}</td><td className="p-3 num">{r.workOrders}</td><td className="p-3 num">{fmtMoney(r.gmv)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <Eyebrow>مفاتيح الميزات</Eyebrow>
          <p className="text-xs text-muted mb-2">المفتاح المغلق يعني أن الـ API يرفض الخدمة أيضاً، لا أن الزر مخفي فقط.</p>
          {flags.isLoading ? <Loading /> : (
            <div className="card divide-y divide-line">
              {(flags.data ?? []).map((flag) => {
                const scope = scopeOf(flag.rule);
                return <div key={flag.key} className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-semibold">{FLAG_AR[flag.key] ?? flag.key}</div>
                    <div className="text-xs text-muted num">{flag.key}</div>
                  </div>
                  <Pill label={scope.label} tone={scope.tone} />
                  <button className="btn-ghost text-xs" onClick={() => setToggling(flag)}>{flag.rule.enabled ? 'إغلاق' : 'تفعيل للجميع'}</button>
                </div>;
              })}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <Eyebrow right={activation.data ? `${activation.data.activation_rate}% تفعيل` : undefined}>
          المنشآت المهيّأة — من استخدم المنتج فعلاً
        </Eyebrow>
        {activation.isLoading ? <Loading /> : !activation.data?.rows.length ? <Empty text="لا توجد منشآت نشطة بعد." /> : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-muted text-xs"><th className="p-3 text-start">المنشأة</th><th className="p-3 text-start">المنطقة</th><th className="p-3 text-start">أوامر العمل</th><th className="p-3 text-start">آخر نشاط</th></tr></thead>
              <tbody>
                {activation.data.rows.slice(0, 12).map((r) => (
                  <tr key={r.orgId} className="border-t border-line">
                    <td className="p-3 font-semibold">{r.nameAr}</td>
                    <td className="p-3 text-muted num">{r.zone ?? '—'}</td>
                    <td className="p-3 num">{r.workOrders}</td>
                    <td className="p-3">{r.workOrders === 0 ? <Pill label="لم تُستخدم بعد" tone="pill-warn" /> : <span className="text-muted text-xs">{r.lastActiveAt ? new Date(r.lastActiveAt).toLocaleDateString('en-GB') : '—'}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {toggling && (
        <ReasonDialog
          title={`${toggling.rule.enabled ? 'إغلاق' : 'تفعيل'} «${FLAG_AR[toggling.key] ?? toggling.key}»`}
          hint={toggling.rule.enabled ? 'سيتوقف عرض الخدمة، وسيرفضها الـ API لكل المنشآت.' : 'ستُفتح الخدمة لكل المنشآت فوراً.'}
          confirmLabel={toggling.rule.enabled ? 'إغلاق' : 'تفعيل'}
          danger={toggling.rule.enabled}
          onClose={() => setToggling(null)}
          onConfirm={async (reason) => { await setFlag.mutateAsync({ key: toggling.key, rule: { ...toggling.rule, enabled: !toggling.rule.enabled }, reason }); }}
        />
      )}
    </Shell>
  );
}
