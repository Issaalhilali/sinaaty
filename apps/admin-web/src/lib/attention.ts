/** «يحتاج تدخّلك الآن» — ما الذي يوجب إنساناً، مرتّباً، من نفس أرقام النظرة العامة.
 *
 * اللوحة كانت جدار أرقام صحيحة لا يقود أيٌّ منها إلى فعل: تقرأ «٣ في DLQ» ثم تبحث بنفسك عن الصفحة
 * التي تُعيد المحاولة. والمشغّل يسأل ما يسأله صاحب الورشة وصاحب السيارة: **ماذا ينتظرني؟**
 *
 * الترتيب قاعدة عمل لا ذوق، وهي نفس قاعدة صندوق الورشة:
 *   ١. المال والقانون: ميزان الدفتر، نزاع بمال مجمَّد، سند متأخر يسير إلى التنفيذ.
 *   ٢. تكامل متوقف: كل حدث عالق هنا معناه سند لم يصدر أو فاتورة لم تُبلَّغ — عطبٌ صامت يكبر.
 *   ٣. أناس ينتظرون قراراً: طلب اعتماد منشأة، موافقة صرف.
 * وما لا يوجب تدخّلاً لا يدخل القائمة إطلاقاً — بما فيه رقم صفري.
 */
export type AttentionTone = 'bad' | 'warn';
export type AttentionItem = { key: string; label: string; count: number | null; href: string; tone: AttentionTone };

export type AttentionInput = {
  ledgerImbalance: string;
  outboxDeadLetter: number;
  integrationDeadLetters: number;
  openDisputes: number;
  overdueNotes: number;
  pendingKyb: number;
  pendingApprovals: number;
};

export function attentionItems(i: AttentionInput): AttentionItem[] {
  const imbalanced = i.ledgerImbalance !== '0.00' && Number(i.ledgerImbalance) !== 0;
  const dlq = i.outboxDeadLetter + i.integrationDeadLetters;
  const items: AttentionItem[] = [];
  // الميزان أولاً بلا عدد: فارقٌ واحد في الهللة يعني أن رقماً مالياً على شاشة ما كاذب.
  if (imbalanced) items.push({ key: 'ledger', label: `فارق في ميزان الدفتر (${i.ledgerImbalance})`, count: null, href: '/payments', tone: 'bad' });
  if (i.openDisputes > 0) items.push({ key: 'disputes', label: 'نزاع مفتوح — المبلغ مجمَّد حتى القرار', count: i.openDisputes, href: '/disputes', tone: 'bad' });
  if (dlq > 0) items.push({ key: 'dlq', label: 'حدث متوقف في التكامل — أعد المحاولة', count: dlq, href: '/integrations', tone: 'bad' });
  if (i.overdueNotes > 0) items.push({ key: 'notes', label: 'سند متأخر — الإنذار ثم التنفيذ', count: i.overdueNotes, href: '/notes', tone: 'warn' });
  if (i.pendingApprovals > 0) items.push({ key: 'approvals', label: 'طلب صرف بانتظار موافقة ثانية', count: i.pendingApprovals, href: '/payments', tone: 'warn' });
  if (i.pendingKyb > 0) items.push({ key: 'kyb', label: 'منشأة تنتظر التحقق للعمل', count: i.pendingKyb, href: '/organizations', tone: 'warn' });
  return items;
}

/** أشدّ ما في القائمة — يلوّن الشريط، ويقرّر إن كان الأمر يحتمل الانتظار. */
export function attentionSeverity(items: AttentionItem[]): AttentionTone | null {
  if (items.some((x) => x.tone === 'bad')) return 'bad';
  return items.length ? 'warn' : null;
}
