import { forwardRef, Inject, Module, Optional, type OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../config';
import { LeaderLock } from '../../common/locks';
import { IdentityModule } from '../identity/identity.module';
import { PilotModule } from '../pilot/pilot.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../work-orders/application/ports/realtime.port';
import { ServiceRequestsUseCases } from './application/service-requests.use-cases';
import { SERVICE_REQUEST_REPOSITORY, type ServiceRequestRepository } from './domain/repositories';
import { isRequester } from './domain/service-request';
import { ServiceRequestsPrismaRepository } from './infrastructure/prisma/service-requests.prisma-repository';
import { ServiceRequestsController } from './interface/http/service-requests.controller';

/** Expire quiet requests so workshop inboxes never rot; register the realtime channel access rule. */
@Injectable()
export class ServiceRequestsJobs implements OnModuleInit {
  private readonly log = new Logger('ServiceRequestsJobs');
  constructor(
    private readonly uc: ServiceRequestsUseCases, private readonly config: AppConfig, private readonly lock: LeaderLock,
    @Inject(SERVICE_REQUEST_REPOSITORY) private readonly repo: ServiceRequestRepository,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
  ) {}
  onModuleInit() {
    // service-request:{id} joinable by: the requester, a member of a recipient org, platform staff.
    this.rt?.registerChannel?.('service-request', async (id, user) => {
      const r = await this.repo.findById(id);
      if (!r) return false;
      if (isRequester(r, user.id) || user.platformRole !== 'none') return true;
      return this.repo.isRecipient(id, user.orgs.map((o) => o.orgId));
    });
  }
  @Interval(10 * 60_000) async expire() { if (!this.config.get('JOBS_ENABLED')) return; const r = await this.lock.runExclusive('service-requests.expire', () => this.uc.expireDue()); if (r?.expired) this.log.log(`expired ${r.expired} quiet service requests`); }
  @Interval(10 * 60_000) async nudge() { if (!this.config.get('JOBS_ENABLED')) return; const r = await this.lock.runExclusive('service-requests.nudge', () => this.uc.nudgeQuiet()); if (r?.nudged) this.log.log(`nudged ${r.nudged} quiet requests to widen`); }
}

@Module({
  imports: [IdentityModule, VehiclesModule, PilotModule, forwardRef(() => WorkOrdersModule)],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsUseCases, ServiceRequestsJobs, { provide: SERVICE_REQUEST_REPOSITORY, useClass: ServiceRequestsPrismaRepository }],
  exports: [SERVICE_REQUEST_REPOSITORY],
})
export class ServiceRequestsModule {}
