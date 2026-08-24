'use client';
import Link from 'next/link';
import type { AttentionItem } from '@/lib/attention';
import { attentionSeverity } from '@/lib/attention';

/** شريط «يحتاج تدخّلك الآن» فوق النظرة العامة — كل بند يفتح الصفحة التي تُعالجه.
 *
 * لا يظهر في اليوم الهادئ، ولا يعرض رقماً لا يوجب فعلاً. الأرقام الباقية تحته تبقى للقراءة —
 * أما الإلحاح فيُقال مرة واحدة، هنا. */
export function AttentionBar({ items }: { items: AttentionItem[] }) {
  const severity = attentionSeverity(items);
  if (!severity) return null;
  return (
    <div className={`card p-4 mb-4 border-s-4 ${severity === 'bad' ? 'border-s-bad' : 'border-s-warn'}`}>
      <div className="eyebrow mb-2"><span>يحتاج تدخّلك الآن</span></div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Link key={i.key} href={i.href} className={`pill ${i.tone === 'bad' ? 'pill-bad' : 'pill-warn'} !px-4 !py-2 hover:opacity-80`}>
            {i.count !== null && <span className="num font-bold me-2">{i.count}</span>}
            {i.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
