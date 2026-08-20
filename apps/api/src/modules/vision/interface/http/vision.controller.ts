import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { VisionUseCases } from '../../application/vision.use-cases';

const ConfirmDto = z.object({ accept_zones: z.array(z.string().trim().min(2).max(40)).max(30) });
type ConfirmDto = z.infer<typeof ConfirmDto>;

@ApiTags('inspections') @ApiBearerAuth() @Controller()
export class VisionController {
  constructor(private readonly uc: VisionUseCases) {}

  @Post('inspections/:id/analyze') @HttpCode(200)
  @ApiOperation({ summary: 'Read the inspection photos → suggested damages (marked as the model’s, never overwriting the inspector)' })
  analyze(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.analyze(u, id); }

  @Post('inspections/:id/confirm-damages') @HttpCode(200)
  @ApiOperation({ summary: 'Inspector accepts some suggestions and drops the rest' })
  confirm(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ConfirmDto)) dto: ConfirmDto) { return this.uc.confirm(u, id, dto); }

  @Get('work-orders/:id/inspection-diff')
  @ApiOperation({ summary: 'Check-in vs check-out: what appeared, what got worse, what was repaired — with photos' })
  diff(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.diff(u, id); }
}
