import { Inject, Injectable, Optional } from '@nestjs/common';
import type { WorkOrderStatus } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import { canTransition } from '../domain/state-machine';
import type { WorkOrder } from '../domain/work-order';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../domain/repositories';
import { REALTIME_PUBLISHER, type RealtimePublisher } from './ports/realtime.port';

/** The single choke point for status changes: state machine + history + audit + outbox + realtime, one tx. */
@Injectable()
export class WoTransitionService {
  constructor(@Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher) {}

  async apply(tx: TxHandle, wo: WorkOrder, to: WorkOrderStatus, actor: { userId: string | null; type?: 'user' | 'system' | 'admin' }, noteAr?: string, extra: Record<string, unknown> = {}): Promise<void> {
    if (!canTransition(wo.status, to)) throw new AppError('CONFLICT', { messageAr: `لا يمكن الانتقال من "${wo.status}" إلى "${to}".`, messageEn: `Illegal work order transition ${wo.status} → ${to}.`, details: { from: wo.status, to } });
    const now = new Date();
    const stamps: Record<string, Date> = { received: now, ready: now, delivered: now, closed: now, cancelled: now };
    const patch: Parameters<WorkOrderRepository['update']>[1] = { status: to };
    if (to === 'received') patch.receivedAt = now; if (to === 'ready') patch.readyAt = now; if (to === 'delivered') patch.deliveredAt = now; if (to === 'closed') patch.closedAt = now; if (to === 'cancelled') { patch.cancelledAt = now; patch.cancelReason = noteAr; }
    void stamps;
    await this.repo.update(wo.id, patch, tx);
    await this.repo.addHistory({ woId: wo.id, from: wo.status, to, actorUserId: actor.userId, noteAr }, tx);
    await this.audit.write(tx, { action: `work_order.${to}`, entityType: 'work_order', entityId: wo.id, orgId: wo.orgId, actorUserId: actor.userId, actorType: actor.type ?? 'user', before: { status: wo.status }, after: { status: to, note: noteAr ?? null, ...extra } });
    await this.outbox.publish(tx, { eventType: 'WorkOrderStatusChanged', aggregateType: 'work_order', aggregateId: wo.id, payload: { number: wo.number, orgId: wo.orgId, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, from: wo.status, to, note: noteAr ?? null, ...extra } });
    this.rt?.publish(`work-order:${wo.id}`, 'status', { work_order_id: wo.id, from: wo.status, to, at: now.toISOString(), note_ar: noteAr ?? null });
  }
}
