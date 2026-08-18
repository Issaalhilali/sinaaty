import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxHandle } from '../ports/unit-of-work.port';

export interface DomainEvent<T = unknown> {
  eventType: string; // WorkOrderApproved, InvoicePaid, PartRequestCreated ...
  aggregateType: string; // work_order | invoice | part_request ...
  aggregateId: string;
  payload: T;
}

/** Transactional outbox: write the event in the SAME transaction as the state change. */
@Injectable()
export class OutboxWriter {
  async publish(handle: TxHandle | Prisma.TransactionClient, ev: DomainEvent): Promise<{ id: bigint }> {
    const tx = handle as Prisma.TransactionClient;
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>`
      INSERT INTO outbox (event_type, aggregate_type, aggregate_id, payload)
      VALUES (${ev.eventType}, ${ev.aggregateType}, ${ev.aggregateId}::uuid, ${JSON.stringify(ev.payload)}::jsonb)
      RETURNING id`;
    return { id: rows[0]!.id };
  }
}
