import { Injectable, Logger, Optional } from '@nestjs/common';
import { triage, type TriageResult } from '../domain/triage';

/**
 * المساعد: يقرأ وصف العطل ويقرّر الوجهة.
 *
 * القرار محليٌّ دائماً (`domain/triage`) فيعمل بلا إنترنت وبزمنٍ صفري. ونموذج اللغة — حين
 * يتوفّر ويُطلب — يُستشار **لتحسين العنوان واسم القطعة فقط**، ولا يُسمح له بقلب الوجهة:
 * فرزٌ خاطئ من نموذجٍ متردّد يرسل صاحب السيارة إلى الباب الغلط، والقاعدة عندنا أن الذكاء
 * يشحذ ولا يقود.
 */
@Injectable()
export class AssistUseCases {
  private readonly log = new Logger(AssistUseCases.name);
  constructor(@Optional() private readonly refine?: { improve(t: string): Promise<{ titleAr?: string; partNameAr?: string } | null> }) {}

  async analyze(text: string): Promise<TriageResult> {
    const base = triage(text);
    if (!this.refine) return base;
    try {
      const better = await this.refine.improve(text);
      if (!better) return base;
      return {
        ...base,
        titleAr: better.titleAr?.trim() || base.titleAr,
        partNameAr: base.kind === 'part' ? (better.partNameAr?.trim() || base.partNameAr) : base.partNameAr,
      };
    } catch (e) {
      // سقوطُ النموذج لا يُسقط الميزة: يبقى الفرز المحلي هو الجواب.
      this.log.warn(`refine failed, using local triage: ${(e as Error).message}`);
      return base;
    }
  }
}
