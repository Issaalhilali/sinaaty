import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { OrgType } from '@sinaaty/shared-types';
import { AvailabilityDto, AddBankAccountDto, AddKybDocDto, AddLocationDto, AddMemberDto, CreateOrgDto, SearchOrgsDto, SetSpecialtiesDto, SubscribeDto, UpdateOrgDto } from '../../application/dto/organizations.dto';
import { OrganizationsUseCases } from '../../application/use-cases/organizations.use-cases';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, Roles, zod } from '../../../identity/interface/http';

const MANAGE = { org: ['owner', 'manager'] as const, orgParam: 'id' } as const;
const FINANCE = { org: ['owner', 'accountant'] as const, orgParam: 'id' } as const;
const OWNER = { org: ['owner'] as const, orgParam: 'id' } as const;
const reqId = (req: Request) => (req as Request & { id?: string }).id ?? null;

@ApiTags('organizations') @Controller('organizations')
export class OrganizationsController {
  constructor(private readonly uc: OrganizationsUseCases) {}

  @Public() @Get() @ApiOperation({ summary: 'Public discovery: active orgs by type/city/near(lat,lng)/text' })
  search(@Query(zod(SearchOrgsDto)) q: SearchOrgsDto) { return this.uc.search(q); }

  @Public() @Get('plans') @ApiOperation({ summary: 'Subscription plans (optionally filtered by org type)' })
  plans(@Query('type') type?: string) { return this.uc.listPlans(type as OrgType | undefined); }

  // قبل ':id' عمداً — وإلا التُقطت «mine» كمعرّف.
  @Get('mine') @ApiBearerAuth() @ApiOperation({ summary: 'منشآت العضو باسمها ونوعها وحالتها — النشِطة أولاً (يختار التطبيق منها بدل «أول عضوية»)' })
  mine(@CurrentUser() u: AuthUser) { return this.uc.listMine(u); }

  @Post() @HttpCode(201) @ApiBearerAuth() @ApiOperation({ summary: 'Create an organization (caller becomes owner; status=draft)' })
  create(@CurrentUser() u: AuthUser, @Req() req: Request, @Body(zod(CreateOrgDto)) dto: CreateOrgDto) { return this.uc.create({ userId: u.id, requestId: reqId(req) }, dto); }

  @Get(':id') @ApiBearerAuth() @Roles({ org: ['owner', 'manager', 'accountant', 'technician', 'fleet_admin', 'fleet_approver', 'fleet_viewer', 'driver'], orgParam: 'id' })
  @ApiOperation({ summary: 'Full org profile for members (public profile: GET /organizations/:id/public)' })
  get(@Param('id') id: string) { return this.uc.get(id); }

  @Public() @Get(':id/public') publicProfile(@Param('id') id: string) { return this.uc.getPublic(id); }

  @Patch(':id/availability') @ApiBearerAuth() @Roles(MANAGE)
  @ApiOperation({ summary: '«مشغولون الآن»: إيقاف/استئناف استقبال طلبات السوق — لا يمس الجاري ولا الاكتشاف' })
  availability(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AvailabilityDto)) dto: AvailabilityDto) { return this.uc.setAvailability(u, id, dto.accepting_requests); }

  @Patch(':id') @ApiBearerAuth() @Roles(MANAGE) update(@Param('id') id: string, @Body(zod(UpdateOrgDto)) dto: UpdateOrgDto) { return this.uc.update(id, dto); }

  @Post(':id/locations') @HttpCode(201) @ApiBearerAuth() @Roles(MANAGE) addLocation(@Param('id') id: string, @Body(zod(AddLocationDto)) dto: AddLocationDto) { return this.uc.addLocation(id, dto); }
  @Get(':id/locations') @ApiBearerAuth() @Roles(MANAGE) listLocations(@Param('id') id: string) { return this.uc.listLocations(id); }
  @Put(':id/specialties') @ApiBearerAuth() @Roles(MANAGE) setSpecialties(@Param('id') id: string, @Body(zod(SetSpecialtiesDto)) dto: SetSpecialtiesDto) { return this.uc.setSpecialties(id, dto); }

  @Get(':id/members') @ApiBearerAuth() @Roles(MANAGE) listMembers(@Param('id') id: string) { return this.uc.listMembers(id); }
  @Post(':id/members') @HttpCode(201) @ApiBearerAuth() @Roles(OWNER) @ApiOperation({ summary: 'Invite/attach a member by phone (user is created if needed)' })
  addMember(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string, @Body(zod(AddMemberDto)) dto: AddMemberDto) { return this.uc.addMember({ userId: u.id, requestId: reqId(req) }, id, dto); }
  @Delete(':id/members/:userId') @ApiBearerAuth() @Roles(OWNER) removeMember(@Param('id') id: string, @Param('userId') userId: string) { return this.uc.removeMember(id, userId); }

  @Post(':id/kyb-documents') @HttpCode(201) @ApiBearerAuth() @Roles(OWNER) @ApiOperation({ summary: 'Attach an uploaded document (media_id from POST /media/presign) as a KYB document' })
  addKyb(@Param('id') id: string, @Body(zod(AddKybDocDto)) dto: AddKybDocDto) { return this.uc.addKybDoc(id, dto); }
  @Get(':id/kyb-documents') @ApiBearerAuth() @Roles(OWNER) listKyb(@Param('id') id: string) { return this.uc.listKybDocs(id); }
  @Post(':id/kyb/submit') @HttpCode(200) @ApiBearerAuth() @Roles(OWNER) @ApiOperation({ summary: 'Submit for review (draft → pending_kyb); needs CR + owner id docs and a location' })
  submitKyb(@CurrentUser() u: AuthUser, @Req() req: Request, @Param('id') id: string) { return this.uc.submitKyb({ userId: u.id, requestId: reqId(req) }, id); }

  @Post(':id/bank-accounts') @HttpCode(201) @ApiBearerAuth() @Roles(FINANCE) @ApiOperation({ summary: 'Add payout bank account (IBAN encrypted at rest; only last4 is ever returned)' })
  addBank(@Param('id') id: string, @Body(zod(AddBankAccountDto)) dto: AddBankAccountDto) { return this.uc.addBankAccount(id, dto); }
  @Get(':id/bank-accounts') @ApiBearerAuth() @Roles(FINANCE) listBank(@Param('id') id: string) { return this.uc.listBankAccounts(id); }

  @Post(':id/subscription') @HttpCode(200) @ApiBearerAuth() @Roles(OWNER) @ApiOperation({ summary: 'Choose a plan (billing arrives with Payments; sets the org commission rate)' })
  subscribe(@Param('id') id: string, @Body(zod(SubscribeDto)) dto: SubscribeDto) { return this.uc.subscribe(id, dto); }
}
