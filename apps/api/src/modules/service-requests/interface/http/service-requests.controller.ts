import { Body, Controller, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { ServiceRequestsUseCases } from '../../application/service-requests.use-cases';
import { AcceptOfferDto, CancelDto, CreateServiceRequestDto, SubmitOfferDto, WidenDto } from '../../application/dto/service-requests.dto';

@ApiTags('service-requests') @ApiBearerAuth() @Controller('service-requests')
export class ServiceRequestsController {
  constructor(private readonly uc: ServiceRequestsUseCases) {}

  @Post() @ApiOperation({ summary: 'العميل يعرض مشكلته: وصف + موقع + نطاق يحدده هو — الورش القريبة تتلقاه' })
  create(@CurrentUser() u: AuthUser, @Body(zod(CreateServiceRequestDto)) dto: CreateServiceRequestDto) { return this.uc.create(u, dto); }

  @Get() @ApiOperation({ summary: 'mine=true طلباتي (عميل) · org_id=… الطلبات القريبة الواصلة للورشة' })
  list(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string, @Query('limit') limit?: string) {
    const n = limit ? Number(limit) : undefined;
    return orgId ? this.uc.listNearby(u, orgId, n) : this.uc.listMine(u, n);
  }

  @Get(':id') @ApiOperation({ summary: 'الطلب وعروضه — للعميل كاملة مرتبة بشاراتها، وللورشة عرضها هي فقط' })
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.uc.get(u, id); }

  @Put(':id/offer') @ApiOperation({ summary: 'ردّ الورشة: تحليل + سعر (أو معاينة مجانية) + جاهزية — عرض حي واحد يُحدَّث' })
  offer(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(SubmitOfferDto)) dto: SubmitOfferDto) { return this.uc.submitOffer(u, id, dto); }

  @Post(':id/accept') @HttpCode(200) @ApiOperation({ summary: 'قبول عرض → أمر عمل مسودة لدى الورشة الفائزة (السعر النهائي على المسار القانوني)' })
  accept(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(AcceptOfferDto)) dto: AcceptOfferDto) { return this.uc.accept(u, id, dto); }

  @Post(':id/widen') @HttpCode(200) @ApiOperation({ summary: 'وسّع النطاق بنقرة — يُشعر الورش الداخلة حديثاً فقط' })
  widen(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(WidenDto)) dto: WidenDto) { return this.uc.widen(u, id, dto); }

  @Post(':id/cancel') @HttpCode(200)
  cancel(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(CancelDto)) dto: CancelDto) { return this.uc.cancel(u, id, dto); }
}
