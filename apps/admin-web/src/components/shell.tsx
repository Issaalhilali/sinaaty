'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { api, session } from '@/lib/api';
import { ROLE } from '@/lib/labels';
const NAV = [['/', 'نظرة عامة'], ['/organizations', 'المنشآت و KYB'], ['/integrations', 'التكاملات'], ['/payments', 'الدفعات والضمان'], ['/notes', 'السندات'], ['/disputes', 'النزاعات'], ['/abandoned', 'المركبات المهجورة'], ['/pilot', 'الطيار'], ['/settings', 'الإعدادات'], ['/users', 'المستخدمون'], ['/audit', 'سجل التدقيق']] as const;
const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000 } } });
export function Providers({ children }: { children: ReactNode }) { return <QueryClientProvider client={qc}>{children}</QueryClientProvider>; }
/** Sidebar shell; guards on a staff platform role (GET /me). */
export function Shell({ children, title, sub }: { children: ReactNode; title: string; sub?: string }) {
  const path = usePathname(); const router = useRouter(); const [ready, setReady] = useState(false);
  useEffect(() => { if (!session.token) router.replace('/login'); else setReady(true); }, [router]);
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<{ id: string; full_name_ar: string | null; phone: string; platform_role: string }>('/me'), enabled: ready });
  useEffect(() => { if (me.data && me.data.platform_role === 'none') { session.clear(); router.replace('/login?denied=1'); } }, [me.data, router]);
  if (!ready) return null;
  return <div className="min-h-screen grid grid-cols-[240px_1fr]">
    <aside className="bg-ink text-[#C2CDC7] p-5 sticky top-0 h-screen flex flex-col"><div className="flex items-center gap-2.5 text-white font-bold text-lg mb-7"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span className="h-3 w-3 rounded-full border-2 border-white" /></span>صناعتي · الإدارة</div>
      <nav className="space-y-0.5 flex-1">{NAV.map(([href, label]) => <Link key={href} href={href} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm ${path === href || (href !== '/' && path.startsWith(href)) ? 'bg-[#123A2F] text-seal-glow font-bold' : 'text-[#aab8b1] hover:bg-white/5'}`}><span className="h-4 w-4 rounded-[5px] border-2 border-current" />{label}</Link>)}</nav>
      <div className="text-xs text-[#8C9C95] border-t border-white/10 pt-4"><div className="text-white font-semibold">{me.data?.full_name_ar ?? me.data?.phone ?? '…'}</div><div>{ROLE[me.data?.platform_role ?? ''] ?? ''}</div><button className="mt-2 underline" onClick={() => { session.clear(); router.replace('/login'); }}>تسجيل الخروج</button></div></aside>
    <main className="p-7 max-w-[1400px] w-full"><header className="mb-5"><h1 className="text-2xl font-bold">{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</header>{children}</main>
  </div>;
}
