import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { AccidentReportStatus } from '@sinaaty/shared-types';
import type { Damage } from '../../domain/accident-report';
import type { AccidentReportsPort, ProviderAccidentReport, RepairSubmission } from '../../application/ports/accident-reports.port';

const PARTS: Array<{ code: string; labelAr: string }> = [
  { code: 'FRONT_BUMPER', labelAr: 'الصدام الأمامي' },
  { code: 'HOOD', labelAr: 'غطاء المحرك' },
  { code: 'FRONT_LEFT_DOOR', labelAr: 'الباب الأمامي الأيسر' },
  { code: 'REAR_RIGHT_FENDER', labelAr: 'الرفرف الخلفي الأيمن' },
  { code: 'HEADLIGHT_LEFT', labelAr: 'الكشاف الأيسر' },
  { code: 'WINDSHIELD', labelAr: 'الزجاج الأمامي' },
  { code: 'REAR_BUMPER', labelAr: 'الصدام الخلفي' },
];
const SEVERITIES: Array<Damage['severity']> = ['minor', 'moderate', 'severe'];
const ACTIONS: Array<Damage['action']> = ['repair', 'replace', 'paint'];
const INSURERS = ['شركة التعاونية للتأمين', 'شركة بوبا العربية', 'شركة ملاذ للتأمين', 'شركة الراجحي للتكافل'];

/**
 * Deterministic mock of منجز/تقدير: the same reference always yields the same report, so tests and demos
 * are reproducible without a provider. Forced outcomes are encoded in the reference itself:
 *
 *   ACC-…-PEND…  → under_assessment (assessor has not priced it yet — repair report is refused)
 *   ACC-…-REJ…   → rejected (claim declined; the customer pays the whole repair)
 *   anything not starting with ACC → not found (a mistyped reference is an ordinary case)
 */
@Injectable()
export class MonjezMockAdapter implements AccidentReportsPort {
  readonly provider = 'monjez';

  private seed(ref: string): number[] {
    return [...createHash('sha256').update(ref).digest()];
  }
  /** The digest is 32 bytes; wrapping keeps every lookup total without index assertions. */
  private byteAt(b: number[], i: number): number { return b[i % b.length] ?? 0; }
  private pick<T>(list: readonly T[], i: number): T { return list[i % list.length] as T; }

  fetchByRef(externalRef: string, hint?: { vin?: string | null; plate?: string | null }): Promise<ProviderAccidentReport | null> {
    const ref = externalRef.trim().toUpperCase();
    if (!ref.startsWith('ACC')) return Promise.resolve(null);
    const b = this.seed(ref);
    const status: AccidentReportStatus = ref.includes('PEND') ? 'under_assessment' : ref.includes('REJ') ? 'rejected' : this.byteAt(b, 0) % 4 === 0 ? 'approved' : 'assessed';

    const count = 1 + (this.byteAt(b, 1) % 3);
    const damages: Damage[] = Array.from({ length: count }, (_, i) => {
      const p = this.pick(PARTS, this.byteAt(b, 2 + i) + i);
      return { partCode: p.code, labelAr: p.labelAr, severity: this.pick(SEVERITIES, this.byteAt(b, 6 + i)), action: this.pick(ACTIONS, this.byteAt(b, 9 + i)) };
    }).filter((d, i, all) => all.findIndex((x) => x.partCode === d.partCode) === i);

    // Priced only once the assessor has finished — a pending file has no numbers to work from.
    const priced = status !== 'under_assessment' && status !== 'rejected';
    const approved = priced ? (1500 + this.byteAt(b, 12) * 12 + damages.length * 850).toFixed(2) : null;
    const daysAgo = 1 + (this.byteAt(b, 13) % 20);

    return Promise.resolve({
      externalRef: ref,
      status,
      accidentAt: new Date(Date.UTC(2026, 7, 1) + (30 - daysAgo) * 86_400_000).toISOString(),
      locationAr: this.pick(['طريق الملك فهد — الرياض', 'طريق الدائري الشرقي — الرياض', 'شارع الأمير سلطان — جدة'], this.byteAt(b, 14)),
      plate: hint?.plate ?? null,
      vin: hint?.vin ?? null,
      faultPercent: (this.byteAt(b, 15) % 5 === 0 ? 50 : 0).toFixed(2),
      insurerNameAr: this.pick(INSURERS, this.byteAt(b, 16)),
      policyNo: `POL-${(this.byteAt(b, 17) * 1000 + this.byteAt(b, 18)).toString().padStart(7, '0')}`,
      claimNo: `CLM-${(this.byteAt(b, 19) * 1000 + this.byteAt(b, 20)).toString().padStart(7, '0')}`,
      deductibleAmount: priced ? (this.byteAt(b, 21) % 3 === 0 ? '500.00' : '0.00') : null,
      approvedAmount: approved,
      damages,
    });
  }

  submitRepairReport(s: RepairSubmission): Promise<{ submissionRef: string; acceptedAt: string }> {
    // The provider is assumed idempotent per (accident ref, work order): the same pair returns the same
    // submission reference rather than opening a second file.
    const digest = createHash('sha256').update(`${s.externalRef}|${s.workOrderNumber}`).digest('hex').slice(0, 10).toUpperCase();
    return Promise.resolve({ submissionRef: `RPT-${digest}`, acceptedAt: new Date().toISOString() });
  }
}
