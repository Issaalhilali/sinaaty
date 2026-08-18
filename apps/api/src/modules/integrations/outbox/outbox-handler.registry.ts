import { Injectable } from '@nestjs/common';
export interface OutboxEnvelope { id: bigint; eventType: string; aggregateType: string; aggregateId: string; payload: Record<string, unknown>; createdAt: Date }
export type OutboxHandler = (ev: OutboxEnvelope) => Promise<void>;
/** Modules register handlers at boot: registry.on('InvoicePaid', 'promissory-notes.close', fn). */
@Injectable()
export class OutboxHandlerRegistry {
  private readonly handlers = new Map<string, Array<{ name: string; fn: OutboxHandler }>>();
  on(eventType: string, name: string, fn: OutboxHandler): void { const list = this.handlers.get(eventType) ?? []; if (list.some((h) => h.name === name)) return; list.push({ name, fn }); this.handlers.set(eventType, list); }
  for(eventType: string) { return this.handlers.get(eventType) ?? []; }
  eventTypes() { return [...this.handlers.keys()]; }
}
