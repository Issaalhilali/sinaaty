import { Module } from '@nestjs/common';
import { IntegrationsModule } from '../integrations/integrations.module';
import { IdentityModule } from '../identity/identity.module';
import { AnalyticsOutboxHandlers } from './application/handlers/analytics.handlers';
import { PilotService } from './application/pilot.service';
import { PILOT_REPOSITORY } from './domain/repositories';
import { PilotPrismaRepository } from './infrastructure/prisma/pilot.prisma-repository';
import { AdminPilotController, ConfigController, PilotController } from './interface/http/pilot.controller';

/**
 * Step 25 — pilot configuration: industrial zones, feature flags, and the funnel behind them.
 * Kept in its own module so the pilot can be reconfigured without touching a domain module.
 */
@Module({
  imports: [IdentityModule, IntegrationsModule],
  controllers: [ConfigController, AdminPilotController, PilotController],
  providers: [{ provide: PILOT_REPOSITORY, useClass: PilotPrismaRepository }, PilotService, AnalyticsOutboxHandlers],
  exports: [PilotService],
})
export class PilotModule {}
