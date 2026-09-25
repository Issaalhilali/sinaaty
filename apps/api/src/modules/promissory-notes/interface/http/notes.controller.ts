import { Controller, Get, Header, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { PnStatus } from '@sinaaty/shared-types';
import { NotesUseCases } from '../../application/use-cases/notes.use-cases';
import { OutboxProcessor } from '../../../integrations/outbox/outbox.processor';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Roles } from '../../../identity/interface/http';

@ApiTags('promissory-notes') @ApiBearerAuth() @Controller()
export class NotesController {
  constructor(private readonly uc: NotesUseCases) {}
  @Get('promissory-notes') @ApiOperation({ summary: 'List: ?org_id=&as=creditor (default, ما لي) أو as=debtor (ما عليّ)، وبلا org_id سنداتي كفرد؛ ?status=a,b&overdue=true' })
  list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('as') as?: 'creditor' | 'debtor', @Query('status') status?: string, @Query('overdue') overdue?: string, @Query('limit') limit?: string) { return this.uc.list(u, { org_id: orgId, as, status: status ? (status.split(',') as PnStatus[]) : undefined, overdue: overdue === 'true', limit: limit ? Number(limit) : undefined }); }
  @Get('promissory-notes/:id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Get('promissory-notes/:id/document') @Header('Cache-Control', 'private, max-age=60') async doc(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) { const d = await this.uc.document(u, id); res.setHeader('content-type', `${d.mimeType}; charset=utf-8`); res.send(d.bytes); }
  @Post('promissory-notes/:id/enforce') @HttpCode(201) @ApiOperation({ summary: 'Creditor: request enforcement (Najiz) — allowed after due date + formal notice; builds the evidence bundle' })
  enforce(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.requestEnforcement(u, id); }
  @Get('promissory-notes/:id/enforcement-bundle.zip') async bundle(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) { const b = await this.uc.enforcementBundle(u, id); res.setHeader('content-type', 'application/zip'); res.setHeader('content-disposition', `attachment; filename="enforcement-${id}.zip"`); res.send(b.zip); }
  @Get('promissory-notes/:id/enforcement-bundle') async manifest(@CurrentUser() u: AuthUser, @Param('id') id: string) { return (await this.uc.enforcementBundle(u, id)).manifest; }
  @Get('settlements/:id/document') @Header('Cache-Control', 'private, max-age=60') async settlement(@CurrentUser() u: AuthUser, @Param('id') id: string, @Res() res: Response) { const d = await this.uc.settlementDocument(u, id); res.setHeader('content-type', `${d.mimeType}; charset=utf-8`); res.send(d.bytes); }
}
@ApiTags('admin/promissory-notes') @ApiBearerAuth() @Controller('admin') @Roles({ platform: ['ops', 'finance', 'compliance', 'super_admin'] })
export class AdminNotesController {
  constructor(private readonly uc: NotesUseCases, private readonly outbox: OutboxProcessor) {}
  @Get('promissory-notes') list(@CurrentUser() u: AuthUser, @Query('status') status?: string, @Query('overdue') overdue?: string) { return this.uc.adminList(u, { status: status ? (status.split(',') as PnStatus[]) : undefined, overdue: overdue === 'true' }); }
  @Post('promissory-notes/run-dunning') @HttpCode(200) @ApiOperation({ summary: 'Run the dunning job now (reminders / formal notices for overdue notes)' }) dunning() { return this.uc.runDunning(); }
  @Post('outbox/drain') @HttpCode(200) @ApiOperation({ summary: 'Process pending outbox events now (dev/ops)' }) drain(@Query('limit') limit?: string) { return this.outbox.drain(limit ? Number(limit) : 100); }
  @Post('outbox/retry') @HttpCode(200) retry(@Query('key') key: string) { return this.outbox.retry(key); }
}
