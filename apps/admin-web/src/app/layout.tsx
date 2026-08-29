import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/shell';
export const metadata: Metadata = { title: 'صناعية — الإدارة', description: 'لوحة إدارة منصة صناعية' };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="ar" dir="rtl"><body className="font-sans antialiased"><Providers>{children}</Providers></body></html>; }
