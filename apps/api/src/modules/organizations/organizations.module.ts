import { Module } from '@nestjs/common';
import { IdentityModule } from '../identity/identity.module';
import { ORGANIZATION_REPOSITORY, SUBSCRIPTION_REPOSITORY } from './domain/repositories';
import { OrgTransitionService } from './application/org-transition.service';
import { OrganizationsUseCases } from './application/use-cases/organizations.use-cases';
import { OrganizationPrismaRepository } from './infrastructure/prisma/organization.prisma-repository';
import { SubscriptionPrismaRepository } from './infrastructure/prisma/subscription.prisma-repository';
import { OrganizationsController } from './interface/http/organizations.controller';
import { AdminOrganizationsController } from './interface/http/admin-organizations.controller';

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController, AdminOrganizationsController],
  providers: [OrganizationsUseCases, OrgTransitionService, { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationPrismaRepository }, { provide: SUBSCRIPTION_REPOSITORY, useClass: SubscriptionPrismaRepository }],
  exports: [ORGANIZATION_REPOSITORY, OrgTransitionService],
})
export class OrganizationsModule {}
