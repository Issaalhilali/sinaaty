import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, zod } from '../../../identity/interface/http';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { AppError } from '../../../../common/errors';
import { InvoicesUseCases } from '../../application/use-cases/invoices.use-cases';
import { ZatcaService } from '../../application/zatca.service';
const OnboardDto = z.object({ unit_name: z.string().min(1).max(60), otp: z.string().regex(/^\d{6}$/), production: z.boolean().optional() });
type OnboardDto = z.infer<typeof OnboardDto>;

@ApiTags('zatca') @ApiBearerAuth() @Controller()
export class ZatcaController {
  constructor(private readonly zatca: ZatcaService, private readonly invoices: InvoicesUseCases) {}
  @Post('organizations/:orgId/zatca/onboard') @HttpCode(201)
  @ApiOperation({ summary: 'Onboard an EGS unit: CSR → compliance CSID → compliance checks → production CSID' })
  onboard(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string, @Body(zod(OnboardDto)) dto: OnboardDto) { return this.zatca.onboard(u, orgId, dto); }
  @Get('organizations/:orgId/zatca/devices') devices(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.zatca.devices(u, orgId); }
  @Get('invoices/:id/zatca') submissions(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.zatca.submissions(u, id); }
  @Post('invoices/:id/zatca/submit') @HttpCode(200)
  @ApiOperation({ summary: 'Sign (XAdES) and clear/report an issued invoice; idempotent, retries a rejection' })
  async submit(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    const inv = await this.invoices.get(u, id);
    const r = await this.zatca.signAndSubmit(inv, u.id);
    if (!r) throw new AppError('CONFLICT', { messageAr: 'لم تُفعَّل الفوترة الإلكترونية (المرحلة الثانية) لهذه المنشأة بعد.', messageEn: 'Organization has no production CSID yet.' });
    return r;
  }
}
