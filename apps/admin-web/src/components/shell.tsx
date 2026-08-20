'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { api, session } from '@/lib/api';
import { ROLE } from '@/lib/labels';
import { NAV } from './nav';
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
    <aside className="bg-ink text-[#C2CDC7] p-5 sticky top-0 h-screen flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2.5 text-white font-bold text-lg mb-6"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-seal shadow-[0_8px_18px_-6px_rgba(14,107,84,.6)]"><span className="h-3 w-3 rounded-full border-2 border-white" /></span>صناعتي · الإدارة</div>
      <nav className="flex-1 space-y-5">
        {NAV.map((group) => (
          <div key={group.title}>
            <div className="px-3 pb-1.5 text-[10.5px] font-bold tracking-wide text-[#6E837B] uppercase">{group.title}</div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
                return (
                  <Link key={item.href} href={item.href} title={item.hint}
                    className={`flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm ${active ? 'bg-[#123A2F] text-seal-glow font-bold' : 'text-[#aab8b1] hover:bg-white/5'}`}>
                    <span className="mt-[2px]">{item.icon}</span>
                    <span className="min-w-0">
                      <span className="block leading-5">{item.label}</span>
                      {active && <span className="block text-[11px] font-normal text-[#8FA79D] leading-4 mt-0.5">{item.hint}</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="text-xs text-[#8C9C95] border-t border-white/10 pt-4 mt-4"><div className="text-white font-semibold">{me.data?.full_name_ar ?? me.data?.phone ?? '…'}</div><div>{ROLE[me.data?.platform_role ?? ''] ?? ''}</div><button className="mt-2 underline" onClick={() => { session.clear(); router.replace('/login'); }}>تسجيل الخروج</button></div></aside>
    <main className="p-7 max-w-[1400px] w-full"><header className="mb-5"><h1 className="text-2xl font-bold">{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</header>{children}</main>
  </div>;
}
