import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { CurrentUser, Roles, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { AdminUseCases, RoleDto, SettingDto } from '../../application/admin.use-cases';
const ReasonDto = z.object({ reason_ar: z.string().min(3).max(500) }); type ReasonDto = z.infer<typeof ReasonDto>;
@ApiTags('admin') @ApiBearerAuth() @Controller('admin') @Roles({ platform: ['support', 'ops', 'finance', 'compliance', 'super_admin'] })
export class AdminController {
  constructor(private readonly uc: AdminUseCases) {}
  @Get('overview') @ApiOperation({ summary: 'Back-office KPIs (orgs, work orders, money, notes, parts, integrations health)' }) overview(@CurrentUser() u: AuthUser) { return this.uc.overview(u); }
  @Get('ops') @ApiOperation({ summary: 'غرفة عمليات اليوم: طلبات بلا عروض، مزادات تنتهي صفراً، أوامر عالقة، أموال مجمّدة/فائتة، سندات متأخرة، تكاملات' })
  ops(@CurrentUser() u: AuthUser, @Query('stale_minutes') sm?: string, @Query('ending_minutes') em?: string, @Query('stuck_hours') sh?: string) {
    return this.uc.ops(u, { stale_minutes: sm ? Number(sm) : undefined, ending_minutes: em ? Number(em) : undefined, stuck_hours: sh ? Number(sh) : undefined });
  }
  @Get('audit') audit(@CurrentUser() u: AuthUser, @Query('action') action?: string, @Query('entity_type') et?: string, @Query('entity_id') eid?: string, @Query('org_id') org?: string, @Query('actor_user_id') actor?: string, @Query('from') from?: string, @Query('to') to?: string, @Query('limit') limit?: string, @Query('before_id') before?: string) { return this.uc.audit(u, { action, entity_type: et, entity_id: eid, org_id: org, actor_user_id: actor, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined, limit: Math.min(Number(limit ?? 100), 500), before_id: before ? BigInt(before) : undefined }); }
  @Get('audit.csv') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="audit.csv"') async auditCsv(@CurrentUser() u: AuthUser, @Res() res: Response, @Query('action') action?: string, @Query('entity_type') et?: string, @Query('org_id') org?: string, @Query('from') from?: string, @Query('to') to?: string) { res.send(await this.uc.auditCsv(u, { action, entity_type: et, org_id: org, from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined })); }
  @Get('settings') settings(@CurrentUser() u: AuthUser) { return this.uc.settings(u); }
  @Put('settings/:key') setSetting(@CurrentUser() u: AuthUser, @Param('key') key: string, @Body(zod(SettingDto)) dto: SettingDto) { return this.uc.setSetting(u, key, dto); }
  @Get('integrations') integrations(@CurrentUser() u: AuthUser, @Query('provider') provider?: string, @Query('status') status?: string) { return this.uc.integrations(u, { provider, status }); }
  @Post('integrations/retry') @HttpCode(200) retry(@CurrentUser() u: AuthUser, @Query('key') key: string, @Body(zod(ReasonDto)) dto: ReasonDto) { return this.uc.retry(u, key, dto.reason_ar); }
  @Get('payments') payments(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.uc.payments(u, { status }); }
  @Get('escrow') escrow(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.uc.escrow(u, { status }); }
  @Get('payouts') payouts(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.uc.payouts(u, { status }); }
  @Get('users') users(@CurrentUser() u: AuthUser, @Query('q') q?: string, @Query('platform_role') role?: string) { return this.uc.users(u, { q, platform_role: role }); }
  @Put('users/:id/platform-role') setRole(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(RoleDto)) dto: RoleDto) { return this.uc.setRole(u, id, dto); }
}
