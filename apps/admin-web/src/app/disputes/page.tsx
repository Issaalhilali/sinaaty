'use client';
import { Shell } from '@/components/shell';
import { Empty } from '@/components/ui';
/** Disputes room lands with the disputes module (Step 16): open dispute → escrow frozen → evidence → decision → ledger split/refund. */
export default function DisputesPage() { return <Shell title="غرفة النزاعات" sub="تُفعَّل مع وحدة النزاعات (الخطوة 16) — تجميد الضمان موجود الآن من صفحة الدفعات"><Empty text="لا نزاعات بعد. عند فتح نزاع يُجمَّد المبلغ تلقائياً ويظهر هنا مع الأدلة والرسائل وقرار الفريق." /></Shell>; }
