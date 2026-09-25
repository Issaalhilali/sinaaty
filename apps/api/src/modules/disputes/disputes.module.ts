import { Module, forwardRef } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { PartsModule } from '../parts/parts.module';
import { PaymentsModule } from '../payments/payments.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { DisputesUseCases } from './application/disputes.use-cases';
import { DISPUTE_REPOSITORY } from './domain/repositories';
import { DisputePrismaRepository } from './infrastructure/prisma/dispute.prisma-repository';
import { AdminDisputesController, DisputesController } from './interface/http/disputes.controller';
/** Step 16: dispute → escrow frozen → evidence/messages → ops decision → ledger split/refund → reviews. */
@Module({
  imports: [IdentityModule, forwardRef(() => PaymentsModule), forwardRef(() => WorkOrdersModule), forwardRef(() => PartsModule)],
  controllers: [DisputesController, AdminDisputesController],
  providers: [{ provide: DISPUTE_REPOSITORY, useClass: DisputePrismaRepository }, DisputesUseCases],
  exports: [DISPUTE_REPOSITORY],
})
export class DisputesModule {}
