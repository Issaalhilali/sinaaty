import { Body, Controller, Get, Header, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { FleetUseCases } from '../../application/fleet.use-cases';
import { DecideDto, ImportVehiclesDto, PolicyDto, StatementDto, UpdatePolicyDto } from '../../application/dto/fleet.dto';

/** Excel assumes the system code page unless the file starts with a byte-order mark. */
const BOM = '\uFEFF';
/** CSV for the fleet's accountant: Arabic headers, Western digits, BOM so Excel opens it in UTF-8. */
const csv = (headers: string[], rows: Array<Array<string | number | null>>) =>
  `${BOM}${[headers, ...rows].map((r) => r.map((c) => { const v = c == null ? '' : String(c); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; }).join(',')).join('\n')}\n`;

@ApiTags('fleet') @ApiBearerAuth() @Controller('fleet')
export class FleetController {
  constructor(private readonly uc: FleetUseCases) {}

  @Get(':orgId/overview') @ApiOperation({ summary: 'Fleet home: vehicles, open repairs, what needs a decision, budget used' })
  overview(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.uc.overview(u, orgId); }

  // ---- policies
  @Get(':orgId/policies') policies(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.uc.listPolicies(u, orgId); }
  @Post(':orgId/policies') @HttpCode(201) @ApiOperation({ summary: 'Spending rules: auto-approve below, two approvers above, approved workshops, monthly budget' })
  createPolicy(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(PolicyDto)) dto: PolicyDto) { return this.uc.createPolicy(u, orgId, dto); }
  @Put('policies/:id') updatePolicy(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(UpdatePolicyDto)) dto: UpdatePolicyDto) { return this.uc.updatePolicy(u, id, dto); }

  // ---- approvals
  @Get(':orgId/approvals') @ApiOperation({ summary: 'Repairs waiting on the fleet, each with what the policy requires' })
  pending(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.uc.pending(u, orgId); }
  @Post('approvals/:workOrderId') @HttpCode(200) @ApiOperation({ summary: 'Approve or reject spending on one repair (per version)' })
  decide(@CurrentUser() u: AuthUser, @Param('workOrderId') id: string, @Body(zod(DecideDto)) dto: DecideDto) { return this.uc.decideOn(u, id, dto); }

  // ---- vehicles
  @Post(':orgId/vehicles/import') @HttpCode(200) @ApiOperation({ summary: 'Bulk import: every row reports its own outcome, one bad row does not lose the rest' })
  importVehicles(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(ImportVehiclesDto)) dto: ImportVehiclesDto) { return this.uc.importVehicles(u, orgId, dto); }

  // ---- statements & reports
  @Post(':orgId/statements') @HttpCode(200) @ApiOperation({ summary: 'Generate (or refresh) the monthly statement for the fleet' })
  generate(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(StatementDto)) dto: StatementDto) { return this.uc.generateStatement(u, orgId, dto); }
  @Get(':orgId/statements') statements(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.uc.listStatements(u, orgId); }
  @Get('statements/:id') statement(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.getStatement(u, id); }

  @Get('statements/:id/export.csv') @Header('content-type', 'text/csv; charset=utf-8') @Header('content-disposition', 'attachment; filename="statement.csv"')
  @ApiOperation({ summary: 'The statement as CSV for the accountant' })
  async statementCsv(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const s = await this.uc.getStatement(u, id);
    return csv(['رقم الفاتورة', 'التاريخ', 'أمر العمل', 'اللوحة', 'رقم الأصل', 'الحالة', 'الإجمالي'],
      s.lines.map((l) => [l.number, l.issueDate.toISOString().slice(0, 10), l.workOrderNumber, l.plate, l.assetCode, l.status, l.total]));
  }

  @Get(':orgId/reports/vehicles/export.csv') @Header('content-type', 'text/csv; charset=utf-8') @Header('content-disposition', 'attachment; filename="vehicles.csv"') @ApiOperation({ summary: 'Spend per vehicle for a month' })
  async vehiclesCsv(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Query('month') month: string) {
    const rows = await this.uc.vehicleReport(u, orgId, { month });
    return csv(['رقم الأصل', 'اللوحة', 'الماركة', 'الموديل', 'عدد الأوامر', 'الإجمالي', 'آخر صيانة'],
      rows.map((r) => [r.assetCode, r.plate, r.makeAr, r.modelAr, r.workOrders, r.total, r.lastServiceAt?.toISOString().slice(0, 10) ?? '']));
  }

  @Get(':orgId/reports/vehicles') vehicles(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Query('month') month: string) {
    return this.uc.vehicleReport(u, orgId, { month });
  }
}
