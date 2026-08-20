import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddVehicleDto, OdometerDto } from '../../application/dto/vehicles.dto';
import { VehiclesUseCases } from '../../application/use-cases/vehicles.use-cases';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, zod } from '../../../identity/interface/http';

@ApiTags('vehicles') @Controller()
export class VehiclesController {
  constructor(private readonly uc: VehiclesUseCases) {}

  @Get('vin/:vin/decode') @ApiBearerAuth() @ApiOperation({ summary: 'Decode a VIN (make/model/year) — mock provider in dev' })
  decode(@Param('vin') vin: string) { return this.uc.decodeVin(vin); }

  @Post('vehicles') @HttpCode(201) @ApiBearerAuth() @ApiOperation({ summary: 'Add a vehicle by VIN and/or plate (owner = caller, or a fleet org via owner_org_id)' })
  add(@CurrentUser() u: AuthUser, @Body(zod(AddVehicleDto)) dto: AddVehicleDto) { return this.uc.add(u, dto); }

  @Get('vehicles') @ApiBearerAuth() @ApiOperation({ summary: 'My vehicles (or a fleet org’s with ?org_id=)' })
  list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string) { return this.uc.listMine(u, orgId); }

  @Get('vehicles/:id') @ApiBearerAuth() get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Put('vehicles/:id/odometer') @ApiBearerAuth() odometer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(OdometerDto)) dto: OdometerDto) { return this.uc.setOdometer(u, id, dto); }

  @Get('vehicles/:id/passport') @ApiBearerAuth() @ApiOperation({ summary: 'Car Passport (full timeline for the owner)' })
  passport(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.passportFor(u, id); }
  @Post('vehicles/:id/passport/share') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Create/rotate a public share link (no personal data exposed)' })
  share(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.createShareLink(u, id); }
  @Delete('vehicles/:id/passport/share') @ApiBearerAuth() unshare(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.revokeShareLink(u, id); }

  @Public() @Throttle({ default: { limit: 20, ttl: 60_000 } }) @Get('passport/:token') @ApiOperation({ summary: 'Public Car Passport by share token (masked VIN, no owner/plate)' })
  publicPassport(@Param('token') token: string) { return this.uc.publicPassport(token); }
}
