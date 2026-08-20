import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { ApplyVoiceNoteDto, CreateVoiceNoteDto, VoiceUseCases } from '../../application/voice.use-cases';

const DiscardDto = z.object({ reason_ar: z.string().trim().max(300).optional() });
type DiscardDto = z.infer<typeof DiscardDto>;

@ApiTags('voice') @ApiBearerAuth() @Controller()
export class VoiceController {
  constructor(private readonly uc: VoiceUseCases) {}

  @Post('work-orders/:id/voice-notes') @HttpCode(201)
  @ApiOperation({ summary: 'Upload a dictation (media_id from /media/presign) → transcript + proposed lines for review' })
  create(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(CreateVoiceNoteDto)) dto: CreateVoiceNoteDto) { return this.uc.create(u, id, dto); }

  @Get('work-orders/:id/voice-notes') list(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.list(u, id); }
  @Get('voice-notes/:id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }

  @Post('voice-notes/:id/apply') @HttpCode(200)
  @ApiOperation({ summary: 'Add the reviewed lines to the work order (the reviewer’s prices, not the model’s)' })
  apply(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ApplyVoiceNoteDto)) dto: ApplyVoiceNoteDto) { return this.uc.apply(u, id, dto); }

  @Post('voice-notes/:id/discard') @HttpCode(200)
  discard(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(DiscardDto)) dto: DiscardDto) { return this.uc.discard(u, id, dto.reason_ar); }
}
