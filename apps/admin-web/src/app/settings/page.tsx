'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Shell } from '@/components/shell';
import { ErrorBox, Loading, ReasonDialog } from '@/components/ui';
import { api, fmtDate } from '@/lib/api';
type Setting = { key: string; value: unknown; updatedBy: string | null; updatedAt: string };
export default function SettingsPage() {
  const qc = useQueryClient(); const q = useQuery({ queryKey: ['settings'], queryFn: () => api<Setting[]>('/admin/settings') }); const [edit, setEdit] = useState<{ key: string; value: string } | null>(null); const [err, setErr] = useState<string | null>(null); const [newKey, setNewKey] = useState('');
  const save = useMutation({ mutationFn: ({ key, value, reason }: { key: string; value: unknown; reason: string }) => api(`/admin/settings/${key}`, { method: 'PUT', body: JSON.stringify({ value, reason_ar: reason }) }), onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }) });
  return <Shell title="إعدادات المنصة" sub="الرسوم والحدود تُقرأ من هنا — لا شيء ثابت في الكود. التعديل لمشرف المنصة فقط وبسبب مكتوب">
    {q.isLoading && <Loading />}{q.error && <ErrorBox error={q.error} retry={() => q.refetch()} />}
    {q.data && <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>المفتاح</th><th>القيمة (JSON)</th><th>آخر تعديل</th><th></th></tr></thead><tbody>
      {q.data.map((s) => <tr key={s.key}><td className="num font-semibold">{s.key}</td><td className="num text-xs max-w-[520px] truncate" dir="ltr">{JSON.stringify(s.value)}</td><td className="num text-muted">{fmtDate(s.updatedAt)}</td><td><button className="btn-ghost !h-8" onClick={() => { setEdit({ key: s.key, value: JSON.stringify(s.value, null, 0) }); setErr(null); }}>تعديل</button></td></tr>)}
      <tr><td colSpan={4} className="bg-[#F7F9F7]"><div className="flex gap-2 items-center"><input className="input !h-9 max-w-xs num" dir="ltr" placeholder="new.setting_key" value={newKey} onChange={(e) => setNewKey(e.target.value)} /><button className="btn-ghost !h-9" disabled={!/^[a-z0-9_.]{3,80}$/.test(newKey)} onClick={() => { setEdit({ key: newKey, value: '""' }); setNewKey(''); }}>إضافة مفتاح</button></div></td></tr>
    </tbody></table></div>}
    {edit && <div className="fixed inset-0 z-40 grid place-items-center bg-black/30 p-4" onClick={() => setEdit(null)}><div className="card w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}><h3 className="text-lg font-bold num">{edit.key}</h3><textarea className="input h-28 py-2 num mt-3" dir="ltr" value={edit.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} />{err && <p className="text-sm text-bad mt-2">{err}</p>}<div className="mt-3 flex justify-end gap-2"><button className="btn-ghost" onClick={() => setEdit(null)}>إلغاء</button><ConfirmWithReason onConfirm={async (reason) => { let v: unknown; try { v = JSON.parse(edit.value); } catch { setErr('JSON غير صالح'); throw new Error('JSON غير صالح'); } await save.mutateAsync({ key: edit.key, value: v, reason }); setEdit(null); }} /></div></div></div>}
  </Shell>;
}
function ConfirmWithReason({ onConfirm }: { onConfirm: (reason: string) => Promise<void> }) { const [open, setOpen] = useState(false); return <><button className="btn" onClick={() => setOpen(true)}>حفظ</button>{open && <ReasonDialog title="حفظ الإعداد" confirmLabel="حفظ" onConfirm={onConfirm} onClose={() => setOpen(false)} />}</>; }
