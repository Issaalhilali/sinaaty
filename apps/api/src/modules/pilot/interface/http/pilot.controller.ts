import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Roles, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { PilotService } from '../../application/pilot.service';

const FlagDto = z.object({
  enabled: z.boolean().optional(),
  orgs: z.array(z.string().uuid()).optional(),
  org_types: z.array(z.string()).optional(),
  zones: z.array(z.string()).optional(),
  pct: z.number().int().min(0).max(100).optional(),
  reason_ar: z.string().trim().min(3),
});
type FlagDto = z.infer<typeof FlagDto>;

const ZonesDto = z.object({
  zones: z.array(z.object({ code: z.string().trim().min(2).max(30), nameAr: z.string().trim().min(2), city: z.string().trim().min(2), lat: z.number(), lng: z.number(), radiusKm: z.number().positive().max(60) })).min(1),
  reason_ar: z.string().trim().min(3),
});
type ZonesDto = z.infer<typeof ZonesDto>;

@ApiTags('config') @ApiBearerAuth() @Controller()
export class ConfigController {
  constructor(private readonly pilot: PilotService) {}
  @Get('config') @ApiOperation({ summary: 'What this account may see: enabled features + its industrial zone' })
  config(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string) { return this.pilot.configFor(u, orgId); }
}

@ApiTags('admin/pilot') @ApiBearerAuth() @Controller('admin/pilot')
@Roles({ platform: ['support', 'ops', 'finance', 'compliance', 'super_admin'] })
export class AdminPilotController {
  constructor(private readonly pilot: PilotService) {}

  @Get('flags') flags(@CurrentUser() u: AuthUser) { return this.pilot.listFlags(u); }
  @Put('flags/:key') @ApiOperation({ summary: 'Turn a feature on/off (globally, per org, per org type, per zone, or by percentage)' })
  setFlag(@CurrentUser() u: AuthUser, @Param('key') key: string, @Body(zod(FlagDto)) dto: FlagDto) {
    const { reason_ar: reason, ...rule } = dto;
    return this.pilot.setFlag(u, key, rule, reason);
  }

  @Get('zones') zones() { return this.pilot.zones(); }
  @Put('zones') setZones(@CurrentUser() u: AuthUser, @Body(zod(ZonesDto)) dto: ZonesDto) { return this.pilot.setZones(u, dto.zones, dto.reason_ar); }
  @Post('zones/backfill') @HttpCode(200) @ApiOperation({ summary: 'Tag every untagged location with the zone it falls inside' })
  backfill(@CurrentUser() u: AuthUser) { return this.pilot.backfillZones(u); }

  @Get('funnel') @ApiOperation({ summary: 'Pilot funnel: created → approved → invoiced → paid (+ parts)' })
  funnel(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string, @Query('zone') zone?: string, @Query('org_id') orgId?: string) {
    return this.pilot.funnel(u, { from, to, zone, org_id: orgId });
  }
  @Get('by-zone') byZone(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string) { return this.pilot.byZone(u, { from, to }); }
  @Get('activation') @ApiOperation({ summary: 'Which onboarded organizations actually used the product' })
  activation(@CurrentUser() u: AuthUser, @Query('from') from?: string, @Query('to') to?: string, @Query('zone') zone?: string) {
    return this.pilot.activation(u, { from, to, zone });
  }
}

@ApiTags('pilot') @ApiBearerAuth() @Controller('pilot')
export class PilotController {
  constructor(private readonly pilot: PilotService) {}
  @Get('funnel') @ApiOperation({ summary: 'My organization’s own funnel (same numbers ops sees, scoped to me)' })
  myFunnel(@CurrentUser() u: AuthUser, @Query('org_id') orgId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.pilot.funnel(u, { org_id: orgId, from, to });
  }
}
