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
  service?: { requested: number; offered: number; accepted: number; quiet: number; offer_rate: string; accept_rate: string; avg_first_offer_minutes: number | null };
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

const ORG_TYPE_AR: Record<string, string> = {
  workshop: 'ورشة', factory: 'مصنع', service_center: 'مركز صيانة', body_shop: 'سمكرة ودهان',
  parts_dealer: 'محل قطع', parts_distributor: 'موزّع قطع', parts_brand_agent: 'وكيل علامة',
  scrapyard: 'تشليح', fleet_company: 'أسطول', logistics: 'نقل وسطحات', inspection_center: 'مركز فحص',
};

type ScopeMode = 'all' | 'zones' | 'org_types' | 'pct' | 'off';

/** Gradual rollout is the pilot's actual operating mode; the quick button only flips all-or-nothing. */
function ScopeDialog({ flag, zones, onConfirm, onClose }: { flag: Flag; zones: Zone[]; onConfirm: (rule: Flag['rule'], reason: string) => Promise<void>; onClose: () => void }) {
  const r = flag.rule;
  const [mode, setMode] = useState<ScopeMode>(r.enabled ? 'all' : r.zones?.length ? 'zones' : r.org_types?.length ? 'org_types' : r.pct ? 'pct' : 'off');
  const [zoneSel, setZoneSel] = useState<string[]>(r.zones ?? []);
  const [typeSel, setTypeSel] = useState<string[]>(r.org_types ?? []);
  const [pct, setPct] = useState<number>(r.pct ?? 10);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const rule: Flag['rule'] =
    mode === 'all' ? { enabled: true } : mode === 'off' ? { enabled: false }
    : mode === 'zones' ? { zones: zoneSel } : mode === 'org_types' ? { org_types: typeSel } : { pct };
  const incomplete = (mode === 'zones' && !zoneSel.length) || (mode === 'org_types' && !typeSel.length) || (mode === 'pct' && (pct < 1 || pct > 100));
  const modes: Array<{ v: ScopeMode; label: string }> = [
    { v: 'all', label: 'للجميع' }, { v: 'zones', label: 'مناطق محددة' }, { v: 'org_types', label: 'أنواع منشآت' }, { v: 'pct', label: 'نسبة تدريجية' }, { v: 'off', label: 'مغلق' },
  ];
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={onClose}><div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
    <h3 className="text-lg font-bold">نطاق «{FLAG_AR[flag.key] ?? flag.key}»</h3>
    <p className="text-sm text-muted mt-1">لمن تُفتح هذه الخدمة؟ النطاق يُطبَّق في الـ API نفسه، لا في الواجهة فقط.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      {modes.map((m) => (
        <button key={m.v} className={mode === m.v ? 'btn text-xs' : 'btn-ghost text-xs'} onClick={() => setMode(m.v)}>{m.label}</button>
      ))}
    </div>
    {mode === 'zones' && <div className="mt-3 space-y-1">
      {zones.map((z) => (
        <label key={z.code} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={zoneSel.includes(z.code)} onChange={() => toggle(zoneSel, setZoneSel, z.code)} />
          <span>{z.nameAr}</span><span className="text-xs text-muted num">{z.code}</span>
        </label>
      ))}
    </div>}
    {mode === 'org_types' && <div className="mt-3 grid grid-cols-2 gap-1">
      {Object.entries(ORG_TYPE_AR).map(([v, label]) => (
        <label key={v} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={typeSel.includes(v)} onChange={() => toggle(typeSel, setTypeSel, v)} />
          <span>{label}</span>
        </label>
      ))}
    </div>}
    {mode === 'pct' && <div className="mt-3 flex items-center gap-2 text-sm">
      <input type="number" min={1} max={100} className="input w-24 num" value={pct} onChange={(e) => setPct(Number(e.target.value))} />
      <span className="text-muted">٪ من المنشآت — التوزيع ثابت لكل منشأة، لا يتقلب بين الجلسات.</span>
    </div>}
    <label className="block text-xs font-bold text-muted mt-4 mb-1">السبب (يُسجَّل في سجل التدقيق)</label>
    <textarea className="input h-24 py-2" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبباً واضحاً…" />
    {err && <p className="text-sm text-bad mt-2">{err}</p>}
    <div className="mt-4 flex gap-2 justify-end">
      <button className="btn-ghost" onClick={onClose}>إلغاء</button>
      <button className="btn" disabled={reason.trim().length < 3 || incomplete || busy}
        onClick={async () => { setBusy(true); setErr(null); try { await onConfirm(rule, reason.trim()); onClose(); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } }}>
        {busy ? '…' : 'حفظ النطاق'}
      </button>
    </div>
  </div></div>;
}

export default function PilotPage() {
  const qc = useQueryClient();
  const [toggling, setToggling] = useState<Flag | null>(null);
  const [editing, setEditing] = useState<Flag | null>(null);

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

  const f = funnel.data?.work_orders; const sv = funnel.data?.service;

  return (
    <Shell title="المناطق والميزات" sub="أين نعمل · أي خدمة مفتوحة لمن · ما الذي يتحوّل إلى دفع — آخر ٣٠ يوماً">
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

          {/* The other market: a request that never draws an offer is the pilot's loudest signal —
              it means no active workshop inside that customer's radius (marketplace runbook §2). */}
          <Eyebrow>سوق الإصلاح: من مشكلة العميل إلى أمر عمل</Eyebrow>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Kpi value={sv?.requested ?? 0} label="طلبات إصلاح" />
            <Kpi value={sv?.offered ?? 0} label="وصلها عرض" sub={`${sv?.offer_rate ?? '0.0'}% من الطلبات`} tone={Number(sv?.offer_rate ?? 100) < 70 ? 'warn' : undefined} />
            <Kpi value={sv?.accepted ?? 0} label="تحوّلت إلى أمر عمل" sub={`${sv?.accept_rate ?? '0.0'}% من الطلبات`} />
            <Kpi value={sv?.avg_first_offer_minutes != null ? `~${sv.avg_first_offer_minutes} د` : '—'} label="متوسط أول ردّ"
              sub={sv?.avg_first_offer_minutes == null ? 'لا عروض بعد' : undefined} />
            <Kpi value={sv?.quiet ?? 0} label="طلبات هادئة" sub={(sv?.quiet ?? 0) > 0 ? 'نُبّه أصحابها للتوسيع' : undefined} tone={(sv?.quiet ?? 0) > 0 ? 'warn' : undefined} />
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
                  <button className="btn-ghost text-xs" onClick={() => setEditing(flag)}>تخصيص</button>
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

      {editing && (
        <ScopeDialog
          flag={editing}
          zones={zones.data ?? []}
          onClose={() => setEditing(null)}
          onConfirm={async (rule, reason) => { await setFlag.mutateAsync({ key: editing.key, rule, reason }); }}
        />
      )}

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
