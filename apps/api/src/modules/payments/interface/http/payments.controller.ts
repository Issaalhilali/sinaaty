import { Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AppConfig } from '../../../../config';
import { AppError } from '../../../../common/errors';
import { CashConfirmDto, CashInitDto, CreatePaymentDto, DecisionDto, RefundDto, ReasonDto } from '../../application/dto/payments.dto';
import { ApprovalsUseCases } from '../../application/use-cases/approvals.use-cases';
import { PaymentsUseCases } from '../../application/use-cases/payments.use-cases';
import { EscrowUseCases } from '../../application/use-cases/escrow.use-cases';
import { WalletUseCases } from '../../application/use-cases/wallet.use-cases';
import { PSP_DEV_HOOK_PORT, type PspDevHookPort } from '../../application/ports/psp-dev-hook.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { CurrentUser, Public, Roles, zod } from '../../../identity/interface/http';

@ApiTags('payments') @Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsUseCases, private readonly escrow: EscrowUseCases, private readonly wallet: WalletUseCases, private readonly config: AppConfig, @Inject(PSP_DEV_HOOK_PORT) private readonly devHook: PspDevHookPort) {}

  @Post('payments') @HttpCode(201) @ApiBearerAuth() @ApiOperation({ summary: 'Customer: start an online payment for an invoice (returns PSP intent / redirect)' })
  create(@CurrentUser() u: AuthUser, @Body(zod(CreatePaymentDto)) dto: CreatePaymentDto) { return this.payments.createIntent(u, dto); }
  @Get('payments/:id') @ApiBearerAuth() get(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.payments.get(u, id); }
  @Get('invoices/:invoiceId/payments') @ApiBearerAuth() listForInvoice(@CurrentUser() u: AuthUser, @Param('invoiceId') invoiceId: string) { return this.payments.listForInvoice(u, invoiceId); }

  @Public() @Post('webhooks/psp') @HttpCode(200) @ApiOperation({ summary: 'PSP webhook (signature verified; idempotent by provider event id)' })
  webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers() headers: Record<string, string | undefined>) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    return this.payments.handleWebhook(raw, headers);
  }
  @Post('payments/:id/mock-pay') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: '[mock PSP] simulate the customer paying: builds a signed webhook and processes it' })
  async mockPay(@CurrentUser() u: AuthUser, @Param('id') id: string, @Query('outcome') outcome?: 'succeeded' | 'failed') {
    if (this.config.get('INTEGRATION_PSP') !== 'mock') throw new AppError('SERVICE_UNAVAILABLE');
    const p = await this.payments.get(u, id); if (!p.pspIntentId) throw new AppError('CONFLICT', { messageEn: 'payment has no intent' });
    const wh = this.devHook.makeWebhook(p.pspIntentId, outcome === 'failed' ? 'payment.failed' : 'payment.succeeded');
    return this.payments.handleWebhook(wh.body, wh.headers);
  }

  @Post('payments/cash/init') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Workshop: record a cash payment — sends OTP to the customer to confirm' })
  cashInit(@CurrentUser() u: AuthUser, @Body(zod(CashInitDto)) dto: CashInitDto) { return this.payments.cashInit(u, dto); }
  @Post('payments/cash/confirm') @HttpCode(200) @ApiBearerAuth() cashConfirm(@CurrentUser() u: AuthUser, @Body(zod(CashConfirmDto)) dto: CashConfirmDto) { return this.payments.cashConfirm(u, dto); }

  @Post('work-orders/:id/confirm-receipt') @HttpCode(200) @ApiBearerAuth() @ApiOperation({ summary: 'Customer confirms receipt → held funds released to the workshop now' })
  confirmReceipt(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.escrow.customerConfirm(u, id); }
  @Get('escrow/:id') @ApiBearerAuth() escrowGet(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.escrow.get(u, id); }

  @Get('organizations/:orgId/wallet') @ApiBearerAuth() @ApiOperation({ summary: 'Org wallet: held / available / payouts / recent ledger entries' })
  walletGet(@CurrentUser() u: AuthUser, @Param('orgId') orgId: string) { return this.wallet.wallet(u, orgId); }
}

@ApiTags('admin/payments') @ApiBearerAuth() @Controller('admin') @Roles({ platform: ['finance', 'ops', 'super_admin'] })
export class AdminPaymentsController {
  constructor(private readonly escrow: EscrowUseCases, private readonly wallet: WalletUseCases, private readonly approvals: ApprovalsUseCases) {}
  @Post('escrow/:id/release') @HttpCode(200) release(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ReasonDto)) dto: ReasonDto) { return this.escrow.adminRelease(u, id, dto); }
  @Post('escrow/:id/freeze') @HttpCode(200) freeze(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(ReasonDto)) dto: ReasonDto) { return this.escrow.adminFreeze(u, id, dto); }
  // Maker/checker (docs/design/maker-checker-refunds.md): the refund endpoint RECORDS a request (202);
  // money moves only when a DIFFERENT staff member approves it.
  @Post('escrow/:id/refund') @HttpCode(202) refund(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(RefundDto)) dto: RefundDto) { return this.approvals.requestRefund(u, id, dto); }
  @Get('approvals') listApprovals(@CurrentUser() u: AuthUser, @Query('status') status?: string, @Query('limit') limit?: string) { return this.approvals.list(u, { status: status as never, limit: limit ? Number(limit) : undefined }); }
  @Post('approvals/:id/approve') @HttpCode(200) approveApproval(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(DecisionDto)) dto: DecisionDto) { return this.approvals.approve(u, id, dto); }
  @Post('approvals/:id/reject') @HttpCode(200) rejectApproval(@CurrentUser() u: AuthUser, @Param('id') id: string, @Body(zod(DecisionDto)) dto: DecisionDto) { return this.approvals.reject(u, id, dto); }
  @Post('escrow/release-due') @HttpCode(200) @ApiOperation({ summary: 'Run the auto-release job now' }) releaseDue() { return this.escrow.releaseDue(); }
  @Post('payouts/run') @HttpCode(200) @ApiOperation({ summary: 'Bundle released funds into payouts (per org)' }) runPayouts(@CurrentUser() u: AuthUser, @Query('org_id') orgId?: string) { return this.wallet.adminRunPayouts(u, orgId); }
  @Post('payouts/:id/execute') @HttpCode(200) execute(@CurrentUser() u: AuthUser, @Param('id') id: string) { return this.wallet.adminExecute(u, id); }
  @Get('ledger/health') ledgerHealth(@CurrentUser() u: AuthUser) { return this.wallet.ledgerHealth(u); }
}
