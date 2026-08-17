import { Module } from '@nestjs/common';
import { HealthController } from './interface/http/health.controller';
import { GetHealthUseCase } from './application/get-health.use-case';
import { DEPENDENCY_PROBES } from './application/health-check.port';
import { PrismaDbProbe } from './infrastructure/prisma-db.probe';

/** Composition root: binds the DependencyProbe port to concrete probes. */
@Module({
  controllers: [HealthController],
  providers: [
    GetHealthUseCase,
    PrismaDbProbe,
    { provide: DEPENDENCY_PROBES, useFactory: (db: PrismaDbProbe) => [db], inject: [PrismaDbProbe] },
  ],
})
export class HealthModule {}
