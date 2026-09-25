import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AccidentReportStatus } from '@sinaaty/shared-types';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { AccidentsUseCases } from '../../application/accidents.use-cases';
import { LinkDto, LookupDto, SubmitRepairDto } from '../../application/dto/accidents.dto';

@ApiTags('accident-reports') @ApiBearerAuth() @Controller('accident-reports')
export class AccidentsController {
  constructor(private readonly uc: AccidentsUseCases) {}

  @Post('lookup') @HttpCode(200) @ApiOperation({ summary: 'Preview an accident report by its reference (منجز/تقدير) — nothing is stored' })
  lookup(@CurrentUser() u: AuthUser, @Body(zod(LookupDto)) dto: LookupDto) { return this.uc.lookup(u, dto); }

  @Post() @HttpCode(201) @ApiOperation({ summary: 'Link the report to a work order: draft items, insurer amounts, Car Passport event' })
  link(@CurrentUser() u: AuthUser, @Body(zod(LinkDto)) dto: LinkDto) { return this.uc.link(u, dto); }

  @Get() list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('vehicle_id') vehicleId?: string, @Query('status') status?: string, @Query('limit') limit?: string) {
    return this.uc.list(u, { org_id: orgId, vehicle_id: vehicleId, status: status?.split(',') as AccidentReportStatus[] | undefined, limit: limit ? Number(limit) : undefined });
  }

  @Get(':id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }

  @Post(':id/refresh') @HttpCode(200) @ApiOperation({ summary: 'Re-read the file from the provider (the assessment lands days later)' })
  refresh(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.refresh(u, id); }

  @Post(':id/submit-repair') @HttpCode(200) @ApiOperation({ summary: 'FR-WO-10 — register the completed repair against the accident file' })
  submitRepair(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(SubmitRepairDto)) dto: SubmitRepairDto) { return this.uc.submitRepair(u, id, dto); }
}

@ApiTags('work-orders') @ApiBearerAuth() @Controller('work-orders')
export class WorkOrderAccidentController {
  constructor(private readonly uc: AccidentsUseCases) {}
  @Get(':id/accident-report') @ApiOperation({ summary: 'The accident file behind this repair, if any' })
  byWorkOrder(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.getByWorkOrder(u, id); }
}
