import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DisputeStatus } from '@sinaaty/shared-types';
import { CurrentUser, Public, Roles, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { DisputesUseCases } from '../../application/disputes.use-cases';
import { AssignDto, MessageDto, OpenDisputeDto, ResolveDto, ReviewDto, StatusDto } from '../../application/dto/disputes.dto';

@ApiTags('disputes') @ApiBearerAuth() @Controller()
export class DisputesController {
  constructor(private readonly uc: DisputesUseCases) {}
  @Post('disputes') @HttpCode(201) @ApiOperation({ summary: 'Open a dispute on a work order / part order → freezes the escrow hold' })
  open(@CurrentUser() u: AuthUser, @Body(zod(OpenDisputeDto)) dto: OpenDisputeDto) { return this.uc.open(u, dto); }
  @Get('disputes') list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('status') status?: string, @Query('mine') mine?: string) { return this.uc.list(u, { org_id: orgId, status: status?.split(',') as DisputeStatus[] | undefined, mine: mine === 'true' }); }
  @Get('disputes/:id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Post('disputes/:id/messages') @HttpCode(201) message(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(MessageDto)) dto: MessageDto) { return this.uc.message(u, id, dto); }
  @Get('reviews/mine') @ApiOperation({ summary: 'تقييمي على أمرٍ بعينه — تعرض الشاشة النجومَ أو الشكر' })
  myReview(@CurrentUser() u: AuthUser, @Query('work_order_id') wo?: string, @Query('part_order_id') po?: string) { return this.uc.myReview(u, { work_order_id: wo, part_order_id: po }); }

  @Post('reviews') @HttpCode(201) @ApiOperation({ summary: 'Rate the provider after delivery (one per order); refreshes the org rating' })
  review(@CurrentUser() u: AuthUser, @Body(zod(ReviewDto)) dto: ReviewDto) { return this.uc.review(u, dto); }
  @Public() @Get('organizations/:orgId/reviews') @ApiOperation({ summary: 'Public reviews of an organization (discovery)' }) reviews(@Param('orgId') orgId: string) { return this.uc.reviews({ org_id: orgId }); }
}
@ApiTags('admin/disputes') @ApiBearerAuth() @Controller('admin/disputes') @Roles({ platform: ['support', 'ops', 'compliance', 'super_admin'] })
export class AdminDisputesController {
  constructor(private readonly uc: DisputesUseCases) {}
  @Get() list(@CurrentUser() u: AuthUser, @Query('status') status?: string) { return this.uc.list(u, { status: status?.split(',') as DisputeStatus[] | undefined, limit: 200 }); }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Put(':id/assign') assign(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AssignDto)) dto: AssignDto) { return this.uc.assign(u, id, dto); }
  @Put(':id/status') setStatus(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(StatusDto)) dto: StatusDto) { return this.uc.setStatus(u, id, dto); }
  @Post(':id/resolve') @HttpCode(200) @ApiOperation({ summary: 'Ops decision → ledger moves (release / refund / split) in one transaction' })
  resolve(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ResolveDto)) dto: ResolveDto) { return this.uc.resolve(u, id, dto); }
  @Post(':id/messages') @HttpCode(201) message(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(MessageDto)) dto: MessageDto) { return this.uc.message(u, id, dto); }
}
