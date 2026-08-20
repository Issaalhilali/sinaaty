'use client';
import type { ReactNode } from 'react';

/**
 * Back-office navigation.
 *
 * Grouped, not a flat list: an operator opens this to do one of four jobs — watch the platform, run
 * daily operations, handle money, or configure the platform. A flat list that grows with every feature
 * stops being scannable at about eight items, and this one is already past that.
 *
 * Names are what an operator would say out loud, not what the code calls things: «سيارات لم تُستلم»
 * rather than «المركبات المهجورة» (the legal term, which belongs inside the screen), and «المناطق
 * والميزات» rather than «الطيار» (an internal phase name that means nothing to the person reading it).
 */
export interface NavItem { href: string; label: string; hint: string; icon: ReactNode }
export interface NavGroup { title: string; items: NavItem[] }

const s = (d: string, extra?: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
    <path d={d} />{extra}
  </svg>
);

export const NAV: NavGroup[] = [
  {
    title: 'المتابعة',
    items: [
      { href: '/', label: 'نظرة عامة', hint: 'مؤشرات المنصة اليوم', icon: s('M3 13h4l3 7 4-16 3 9h4') },
    ],
  },
  {
    title: 'العمليات اليومية',
    items: [
      { href: '/organizations', label: 'المنشآت', hint: 'الورش والموردون + التحقق قبل التفعيل', icon: s('M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5') },
      { href: '/abandoned', label: 'سيارات لم تُستلم', hint: 'جاهزة ولم يستلمها أصحابها — إنذارات ورسوم حفظ', icon: s('M5 17h14M6 17v-5l2-5h8l2 5v5M8 17v2M16 17v2M7 12h10') },
      { href: '/disputes', label: 'النزاعات', hint: 'خلاف بين عميل ومزوّد — المال مُجمَّد حتى القرار', icon: s('M12 3v18M5 8l7-5 7 5M4 12h16M6 12l-2 5h4zM18 12l-2 5h4z') },
    ],
  },
  {
    title: 'المالية',
    items: [
      { href: '/payments', label: 'الدفعات والمبالغ المحفوظة', hint: 'مبلغ العميل محفوظ حتى يستلم', icon: s('M3 7h18v10H3zM3 11h18M7 15h3') },
      { href: '/notes', label: 'السندات والمخالصات', hint: 'سند لأمر إلكتروني عبر نافذ، ومخالصة عند السداد', icon: s('M7 3h10l3 3v15H7zM10 9h7M10 13h7M10 17h4') },
    ],
  },
  {
    title: 'إعداد المنصة',
    items: [
      { href: '/pilot', label: 'المناطق والميزات', hint: 'أين نعمل، وأي خدمة مفتوحة لمن، ونسب التحويل', icon: s('M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z', <circle cx="12" cy="10" r="2.5" />) },
      { href: '/integrations', label: 'الربط مع الجهات', hint: 'نفاذ · نافذ · ZATCA · بوابة الدفع', icon: s('M9 7V5a3 3 0 0 1 6 0v2M7 7h10l1 12H6zM12 12v4') },
      { href: '/settings', label: 'الإعدادات', hint: 'النِسب والمهل والحدود', icon: s('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.5L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h5l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.5-2-1.5c.07-.33.1-.66.1-1z') },
      { href: '/users', label: 'فريق المنصة', hint: 'من يملك أي صلاحية', icon: s('M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19 19v-1a4 4 0 0 0-3-3.9M15 3.1a4 4 0 0 1 0 7.8') },
      { href: '/audit', label: 'سجل التدقيق', hint: 'من فعل ماذا ولماذا — غير قابل للتعديل', icon: s('M4 5h16v14H4zM8 9h8M8 13h8M8 17h5') },
    ],
  },
];

export const findItem = (path: string): NavItem | undefined =>
  NAV.flatMap((g) => g.items).find((i) => i.href === path || (i.href !== '/' && path.startsWith(i.href)));
