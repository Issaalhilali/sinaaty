import { describe, expect, it } from 'vitest';
import { attentionItems, attentionSeverity, type AttentionInput } from './attention';

const quiet: AttentionInput = {
  ledgerImbalance: '0.00', outboxDeadLetter: 0, integrationDeadLetters: 0,
  openDisputes: 0, overdueNotes: 0, pendingKyb: 0, pendingApprovals: 0,
};

describe('يحتاج تدخّلك الآن', () => {
  it('يوم هادئ ⟵ لا شريط إطلاقاً (شريطٌ فارغ يعلّم تجاهل مكانه)', () => {
    expect(attentionItems(quiet)).toEqual([]);
    expect(attentionSeverity([])).toBeNull();
  });

  it('الميزان أولاً — قبل كل شيء وبلا عدد', () => {
    const items = attentionItems({ ...quiet, ledgerImbalance: '-12.50', pendingKyb: 9, openDisputes: 2 });
    expect(items[0].key).toBe('ledger');
    expect(items[0].count).toBeNull();
    expect(items[0].label).toContain('-12.50');
  });

  it('الترتيب قاعدة عمل: المال والقانون ثم التكامل ثم من ينتظر قراراً', () => {
    const items = attentionItems({ ...quiet, pendingKyb: 4, overdueNotes: 3, outboxDeadLetter: 1, openDisputes: 2 });
    expect(items.map((x) => x.key)).toEqual(['disputes', 'dlq', 'notes', 'kyb']);
  });

  it('DLQ يجمع الصندوق الصادر وطلبات التكامل — العطب واحد والصفحة واحدة', () => {
    const items = attentionItems({ ...quiet, outboxDeadLetter: 2, integrationDeadLetters: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: 'dlq', count: 5, href: '/integrations' });
  });

  it('«0.00» توازنٌ لا فارق — ولا يُنبَّه عليه', () => {
    expect(attentionItems({ ...quiet, ledgerImbalance: '0.00' })).toEqual([]);
    expect(attentionItems({ ...quiet, ledgerImbalance: '0' })).toEqual([]);
  });

  it('شدّة الشريط: أي بند مالي/قانوني يصبغه بالأحمر، وإلا فتنبيه', () => {
    expect(attentionSeverity(attentionItems({ ...quiet, pendingKyb: 1 }))).toBe('warn');
    expect(attentionSeverity(attentionItems({ ...quiet, pendingKyb: 1, openDisputes: 1 }))).toBe('bad');
  });
});
