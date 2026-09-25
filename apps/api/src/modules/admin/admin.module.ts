import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { AdminUseCases } from './application/admin.use-cases';
import { ADMIN_QUERY_REPOSITORY } from './domain/repositories';
import { AdminQueryPrismaRepository } from './infrastructure/prisma/admin-query.prisma-repository';
import { AdminController } from './interface/http/admin.controller';
/** Back-office reporting + settings/roles/DLQ retry (Step 15). Domain writes stay in their modules' admin endpoints. */
@Module({ imports: [IdentityModule, IntegrationsModule], controllers: [AdminController], providers: [{ provide: ADMIN_QUERY_REPOSITORY, useClass: AdminQueryPrismaRepository }, AdminUseCases] })
export class AdminModule {}
