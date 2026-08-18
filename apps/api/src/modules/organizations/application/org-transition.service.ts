import { Inject, Injectable } from '@nestjs/common';
import type { OrgStatus } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import { canTransition } from '../domain/organization';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../domain/repositories';

/**
 * The single place org status changes: validates the state machine and writes
 * audit_log + outbox in the SAME transaction (CLAUDE.md §5.2).
 */
@Injectable()
export class OrgTransitionService {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter) {}

  async transition(orgId: string, to: OrgStatus, actor: { userId: string; type?: 'user' | 'admin' | 'system'; requestId?: string | null }, reason?: string) {
    const org = await this.orgs.findById(orgId);
    if (!org) throw new AppError('NOT_FOUND');
    if (!canTransition(org.status, to)) throw new AppError('CONFLICT', { messageAr: `لا يمكن الانتقال من ${org.status} إلى ${to}.`, messageEn: `Cannot transition organization from ${org.status} to ${to}.` });
    return this.uow.run(async (tx) => {
      const updated = await this.orgs.setStatus(orgId, to, { verifiedAt: to === 'active' && !org.verifiedAt ? new Date() : undefined }, tx);
      await this.audit.write(tx, { action: `organization.${to}`, entityType: 'organization', entityId: orgId, orgId, actorUserId: actor.userId, actorType: actor.type ?? 'user', before: { status: org.status }, after: { status: to, reason: reason ?? null }, requestId: actor.requestId ?? null });
      await this.outbox.publish(tx, { eventType: 'OrganizationStatusChanged', aggregateType: 'organization', aggregateId: orgId, payload: { from: org.status, to, reason: reason ?? null, actorUserId: actor.userId } });
      return updated;
    });
  }
}
