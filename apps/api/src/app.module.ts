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

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    PrismaModule,
    CommonModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ ttl: config.get('THROTTLE_TTL_SECONDS') * 1000, limit: config.get('THROTTLE_LIMIT') }],
      }),
    }),
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useFactory: (logger: Logger) => new AllExceptionsFilter(logger), inject: [Logger] },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
