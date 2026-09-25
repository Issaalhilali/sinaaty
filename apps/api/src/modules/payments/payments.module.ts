import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfig } from '../../config';
import { IdentityModule } from '../identity/identity.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { InvoicingModule } from '../invoicing/invoicing.module';
import { LogisticsModule } from '../logistics/logistics.module';
import { APPROVAL_REPOSITORY, ESCROW_REPOSITORY, LEDGER_REPOSITORY, PAYMENT_REPOSITORY, PAYOUT_REPOSITORY, WEBHOOK_INBOX } from './domain/repositories';
import { PSP_PORT } from './application/ports/psp.port';
import { PSP_DEV_HOOK_PORT } from './application/ports/psp-dev-hook.port';
import { ApprovalsUseCases } from './application/use-cases/approvals.use-cases';
import { EscrowService } from './application/escrow.service';
import { PaymentsUseCases } from './application/use-cases/payments.use-cases';
import { EscrowUseCases } from './application/use-cases/escrow.use-cases';
import { WalletUseCases } from './application/use-cases/wallet.use-cases';
import { PaymentJobs } from './application/jobs.service';
import { ApprovalPrismaRepository, EscrowPrismaRepository, LedgerPrismaRepository, PaymentPrismaRepository, PayoutPrismaRepository, WebhookInboxPrisma } from './infrastructure/prisma/payments.prisma-repositories';
import { PspMockAdapter } from './infrastructure/psp/psp.mock.adapter';
import { AdminPaymentsController, PaymentsController } from './interface/http/payments.controller';

@Module({
  imports: [ScheduleModule.forRoot(), IdentityModule, OrganizationsModule, WorkOrdersModule, InvoicingModule, LogisticsModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [
    EscrowService, PaymentsUseCases, EscrowUseCases, WalletUseCases, ApprovalsUseCases, PaymentJobs, PspMockAdapter,
    { provide: PAYMENT_REPOSITORY, useClass: PaymentPrismaRepository }, { provide: APPROVAL_REPOSITORY, useClass: ApprovalPrismaRepository }, { provide: ESCROW_REPOSITORY, useClass: EscrowPrismaRepository }, { provide: LEDGER_REPOSITORY, useClass: LedgerPrismaRepository }, { provide: PAYOUT_REPOSITORY, useClass: PayoutPrismaRepository }, { provide: WEBHOOK_INBOX, useClass: WebhookInboxPrisma },
    { provide: PSP_PORT, inject: [AppConfig, PspMockAdapter], useFactory: (c: AppConfig, mock: PspMockAdapter) => { if (c.get('INTEGRATION_PSP') !== 'mock') throw new Error('PSP live adapter not implemented — set INTEGRATION_PSP=mock'); return mock; } },
    { provide: PSP_DEV_HOOK_PORT, inject: [AppConfig, PspMockAdapter], useFactory: (c: AppConfig, mock: PspMockAdapter) => (c.get('INTEGRATION_PSP') === 'mock' ? mock : { makeWebhook: () => { throw new Error('dev hook unavailable in live'); } }) },
  ],
  exports: [EscrowService, EscrowUseCases, LEDGER_REPOSITORY, ESCROW_REPOSITORY, PAYMENT_REPOSITORY],
})
export class PaymentsModule {}
