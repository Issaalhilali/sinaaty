import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public, zod } from '../../../identity/interface/http';
import { AssistUseCases } from '../../application/assist.use-cases';

const AnalyzeDto = z.object({ text: z.string().min(2).max(1200) });
type AnalyzeDto = z.infer<typeof AnalyzeDto>;

@ApiTags('assist') @Controller('assist')
export class AssistController {
  constructor(private readonly uc: AssistUseCases) {}

  /** عامّة عمداً: الضيف يصف عطله قبل أن يسجّل — الفهم قبل الطلب، والتسجيل عند الإرسال. */
  @Public() @Post('analyze') @HttpCode(200)
  @ApiOperation({ summary: 'يقرأ وصف العطل بالعامية ويقرر الوجهة: إصلاح / قطعة / سطحة' })
  analyze(@Body(zod(AnalyzeDto)) dto: AnalyzeDto) { return this.uc.analyze(dto.text); }
}
