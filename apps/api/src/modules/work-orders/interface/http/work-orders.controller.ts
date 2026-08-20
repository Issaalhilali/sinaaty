import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseIntPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { WorkOrderStatus } from '@sinaaty/shared-types';
import { ApproveCompleteDto, ApproveInitDto, AttachMediaDto, CancelDto, ChangeOrderDto, CreateWorkOrderDto, InspectionDto, ItemDto, TransitionDto, UpdateItemDto, UpdateWorkOrderDto } from '../../application/dto/work-orders.dto';
import { AbandonedUseCases } from '../../application/abandoned.use-cases';
import { WorkOrdersUseCases } from '../../application/use-cases/work-orders.use-cases';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, zod } from '../../../identity/interface/http';
import { z } from 'zod';

const ReqApprovalDto = z.object({ reason_ar: z.string().max(1000).optional() });
type ReqApprovalDto = z.infer<typeof ReqApprovalDto>;

@ApiTags('work-orders') @ApiBearerAuth() @Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly uc: WorkOrdersUseCases, private readonly abandoned: AbandonedUseCases) {}

  @Post() @HttpCode(201) @ApiOperation({ summary: 'Workshop creates a work order (customer by phone, vehicle by id/VIN/plate, optional items)' })
  create(@CurrentUser() u: AuthUser, @Body(zod(CreateWorkOrderDto)) dto: CreateWorkOrderDto) { return this.uc.create(u, dto); }

  @Get() @ApiOperation({ summary: 'List: ?org_id= for the workshop, otherwise my (customer/fleet) orders; ?status=a,b' })
  list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.uc.list(u, { org_id: orgId, status: status ? (status.split(',') as WorkOrderStatus[]) : undefined, limit: limit ? Number(limit) : undefined });
  }
  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  // ---- abandoned vehicle (Step 29): notices → declaration. Nothing here happens automatically.
  @Get(':id/abandoned') @ApiOperation({ summary: 'Days waiting, notices sent, storage accrued, and whether a declaration is allowed yet' })
  abandonedStatus(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.abandoned.status(u, id); }
  @Post(':id/abandoned/notice') @HttpCode(200) @ApiOperation({ summary: 'Send the next due notice (idempotent per step; the last one is formal)' })
  abandonedNotice(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.abandoned.sendNotice(u, id); }
  @Post(':id/abandoned/declare') @HttpCode(200) @ApiOperation({ summary: 'Declare the car abandoned — refused until the period passed and every notice was sent' })
  abandonedDeclare(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body() body: { reason_ar?: string }) { return this.abandoned.declare(u, id, body?.reason_ar); }

  @Get(':id/timeline') @ApiOperation({ summary: 'History + versions + inspections + media (the live-tracking feed)' }) timeline(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.timeline(u, id); }
  @Patch(':id') update(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(UpdateWorkOrderDto)) dto: UpdateWorkOrderDto) { return this.uc.update(u, id, dto); }

  @Post(':id/items') @HttpCode(201) addItem(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ItemDto)) dto: ItemDto) { return this.uc.addItem(u, id, dto); }
  @Patch(':id/items/:itemId') updateItem(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('itemId') itemId: string, @Body(zod(UpdateItemDto)) dto: UpdateItemDto) { return this.uc.updateItem(u, id, itemId, dto); }
  @Delete(':id/items/:itemId') removeItem(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('itemId') itemId: string) { return this.uc.removeItem(u, id, itemId); }

  @Post(':id/request-approval') @HttpCode(200) @ApiOperation({ summary: 'Freeze a version (snapshot + sha256) and ask the customer to approve' })
  requestApproval(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ReqApprovalDto)) dto: ReqApprovalDto) { return this.uc.requestApproval(u, id, dto.reason_ar); }
  @Post(':id/change-orders') @HttpCode(200) @ApiOperation({ summary: 'After approval: change scope → new version → re-approval' })
  changeOrder(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ChangeOrderDto)) dto: ChangeOrderDto) { return this.uc.changeOrder(u, id, dto); }
  @Post(':id/approve') @HttpCode(200) @ApiOperation({ summary: 'Customer starts approval (nafath → transaction_id + random | otp → code sent)' })
  approveInit(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ApproveInitDto)) dto: ApproveInitDto) { return this.uc.approveInit(u, id, dto); }
  @Post(':id/approve/complete') @HttpCode(200) @ApiOperation({ summary: 'Customer completes approval → signature stored, execution starts' })
  approveComplete(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(ApproveCompleteDto)) dto: ApproveCompleteDto) { return this.uc.approveComplete(u, id, dto, { ip: req.ip ?? null, deviceId: u.deviceId ?? null }); }

  @Post(':id/transition') @HttpCode(200) @ApiOperation({ summary: 'Workshop moves status (received/inspecting/awaiting_parts/in_progress/quality_check/ready/delivered/closed); customer may close after delivery' })
  transition(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(TransitionDto)) dto: TransitionDto) { return this.uc.transition(u, id, dto); }
  @Post(':id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(CancelDto)) dto: CancelDto) { return this.uc.cancel(u, id, dto); }

  @Post(':id/inspections') @HttpCode(201) @ApiOperation({ summary: 'Check-in / progress / quality / check-out inspection with photos and damages' })
  inspection(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(InspectionDto)) dto: InspectionDto) { return this.uc.addInspection(u, id, dto); }
  @Post(':id/media') @HttpCode(200) media(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AttachMediaDto)) dto: AttachMediaDto) { return this.uc.attachMedia(u, id, dto); }

  @Get(':id/versions/:version') version(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('version', ParseIntPipe) version: number) { return this.uc.getVersion(u, id, version); }
  @Get(':id/versions/:version/document') @Header('Cache-Control', 'private, max-age=60') @ApiOperation({ summary: 'Printable Arabic RTL document of a version (PDF in live; HTML in mock)' })
  async document(@CurrentUser() u: AuthUser, @Param('id') id: string, @Param('version', ParseIntPipe) version: number, @Res() res: Response) {
    const doc = await this.uc.renderVersion(u, id, version);
    res.setHeader('content-type', `${doc.mimeType}; charset=utf-8`); res.send(doc.bytes);
  }
}
