import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TransportStatus, TransportType } from '@sinaaty/shared-types';
import { CurrentUser, Roles, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { TransportUseCases } from '../../application/transport.use-cases';
import { AcceptDto, CancelDto, CreateJobDto, DriverProfileDto, OnlineDto, ProofDto, QuoteDto, TrackDto, TransitionDto } from '../../application/dto/transport.dto';

@ApiTags('transport') @ApiBearerAuth() @Controller('transport')
export class TransportController {
  constructor(private readonly uc: TransportUseCases) {}
  @Post('quote') @HttpCode(200) @ApiOperation({ summary: 'Price a tow/delivery by route distance (maps port; mock in dev)' })
  quote(@Body(zod(QuoteDto)) dto: QuoteDto) { return this.uc.quote(dto); }
  @Post('jobs') @HttpCode(201) create(@CurrentUser() u: AuthUser, @Body(zod(CreateJobDto)) dto: CreateJobDto) { return this.uc.create(u, dto); }
  @Get('jobs') list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('as') as?: 'requester' | 'driver' | 'provider', @Query('status') status?: string) { return this.uc.list(u, { org_id: orgId, as, status: status?.split(',') as TransportStatus[] | undefined }); }
  @Get('jobs/:id') get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }
  @Post('jobs/:id/cancel') @HttpCode(200) cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(CancelDto)) dto: CancelDto) { return this.uc.cancel(u, id, dto); }
  // ---- driver
  @Put('driver/profile') @ApiOperation({ summary: 'Create/update my driver profile (truck plate + type)' })
  upsertDriver(@CurrentUser() u: AuthUser, @Body(zod(DriverProfileDto)) dto: DriverProfileDto) { return this.uc.upsertDriver(u, dto); }
  @Get('driver/me') me(@CurrentUser() u: AuthUser) { return this.uc.me(u); }
  @Put('driver/online') online(@CurrentUser() u: AuthUser, @Body(zod(OnlineDto)) dto: OnlineDto) { return this.uc.setOnline(u, dto); }
  @Get('driver/offers') @ApiOperation({ summary: 'Open jobs near me (PostGIS)' })
  offers(@CurrentUser() u: AuthUser, @Query('radius_km') r?: string, @Query('type') type?: string) { return this.uc.offers(u, { radius_km: r ? Number(r) : undefined, type: type as TransportType | undefined }); }
  @Post('jobs/:id/accept') @HttpCode(200) accept(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AcceptDto)) dto: AcceptDto) { return this.uc.accept(u, id, dto); }
  @Post('jobs/:id/transition') @HttpCode(200) transition(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(TransitionDto)) dto: TransitionDto) { return this.uc.transition(u, id, dto); }
  @Post('jobs/:id/track') @HttpCode(200) @ApiOperation({ summary: 'Driver location ping (rate-limited server-side)' })
  track(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(TrackDto)) dto: TrackDto) { return this.uc.track(u, id, dto); }
  @Post('jobs/:id/proof/otp') @HttpCode(200) @ApiOperation({ summary: 'Send the receiver a one-time code at the drop-off' })
  proofOtp(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.requestProofOtp(u, id); }
  @Post('jobs/:id/complete') @HttpCode(200) @ApiOperation({ summary: 'Proof of delivery: photo + receiver code → delivered' })
  complete(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ProofDto)) dto: ProofDto) { return this.uc.complete(u, id, dto); }
}
@ApiTags('admin/transport') @ApiBearerAuth() @Controller('admin/transport') @Roles({ platform: ['ops', 'support', 'super_admin'] })
export class AdminTransportController {
  constructor(private readonly uc: TransportUseCases) {}
  @Get('drivers/near') near(@CurrentUser() u: AuthUser, @Query('lat') lat: string, @Query('lng') lng: string, @Query('radius_km') r?: string, @Query('type') type?: string) { return this.uc.driversNear(u, { lat: Number(lat), lng: Number(lng), radius_km: r ? Number(r) : undefined, type: type as TransportType | undefined }); }
}
