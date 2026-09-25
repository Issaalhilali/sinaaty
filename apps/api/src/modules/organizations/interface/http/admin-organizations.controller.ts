import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { OrgStatus, OrgType } from '@sinaaty/shared-types';
import { AdminDecisionDto } from '../../application/dto/organizations.dto';
import { OrganizationsUseCases } from '../../application/use-cases/organizations.use-cases';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Roles, zod } from '../../../identity/interface/http';

const OPS = { platform: ['ops', 'compliance', 'super_admin'] as const };
const reqId = (req: Request) => (req as Request & { id?: string }).id ?? null;

/** Back-office (docs/06-DASHBOARDS.md §A): KYB queue and org lifecycle. Every action needs a reason → audit_log. */
@ApiTags('admin/organizations') @ApiBearerAuth() @Controller('admin/organizations') @Roles(OPS)
export class AdminOrganizationsController {
  constructor(private readonly uc: OrganizationsUseCases) {}
  @Get() @ApiOperation({ summary: 'List orgs (KYB queue: ?status=pending_kyb)' })
  list(@Query('status') status?: string, @Query('type') type?: string, @Query('limit') limit?: string) { return this.uc.listForAdmin({ status: status as OrgStatus | undefined, type: type as OrgType | undefined, limit: limit ? Number(limit) : 50 }); }
  @Get(':id') get(@Param('id') id: string) { return this.uc.get(id); }
  @Post(':id/approve') @HttpCode(200) approve(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(AdminDecisionDto)) dto: AdminDecisionDto) { return this.uc.approve({ userId: u.id, requestId: reqId(req) }, id, dto.reason); }
  @Post(':id/reject') @HttpCode(200) reject(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(AdminDecisionDto)) dto: AdminDecisionDto) { return this.uc.reject({ userId: u.id, requestId: reqId(req) }, id, dto.reason); }
  @Post(':id/suspend') @HttpCode(200) suspend(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(AdminDecisionDto)) dto: AdminDecisionDto) { return this.uc.suspend({ userId: u.id, requestId: reqId(req) }, id, dto.reason); }
  @Post(':id/reactivate') @HttpCode(200) reactivate(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(AdminDecisionDto)) dto: AdminDecisionDto) { return this.uc.reactivate({ userId: u.id, requestId: reqId(req) }, id, dto.reason); }
}
