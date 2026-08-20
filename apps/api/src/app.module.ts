import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Logger } from 'nestjs-pino';
import { AppConfig, ConfigModule } from './config';
import { LoggerModule } from './common/logging/logger.module';
import { PrismaModule } from './prisma';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter, RequestIdMiddleware } from './common/http';
import { HealthModule } from './modules/health/health.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MediaModule } from './modules/media/media.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { PromissoryNotesModule } from './modules/promissory-notes/promissory-notes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PartsModule } from './modules/parts/parts.module';
import { AdminModule } from './modules/admin/admin.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { AccidentsModule } from './modules/accidents/accidents.module';
import { PilotModule } from './modules/pilot/pilot.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { JwtAuthGuard } from './modules/identity/interface/http/guards/jwt-auth.guard';
import { RolesGuard } from './modules/identity/interface/http/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    CommonModule,
    IntegrationsModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ ttl: config.get('THROTTLE_TTL_SECONDS') * 1000, limit: config.get('THROTTLE_LIMIT') }],
        skipIf: () => config.isTest,
      }),
    }),
    HealthModule,
    IdentityModule,
    MediaModule,
    OrganizationsModule,
    VehiclesModule,
    WorkOrdersModule,
    InvoicingModule,
    PaymentsModule,
    PromissoryNotesModule,
    PartsModule,
    AdminModule,
    DisputesModule,
    LogisticsModule,
    AccidentsModule,
    PilotModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useFactory: (logger: Logger) => new AllExceptionsFilter(logger), inject: [Logger] },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
