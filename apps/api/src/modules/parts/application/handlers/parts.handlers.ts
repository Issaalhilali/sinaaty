import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from '../../../integrations/outbox/outbox-handler.registry';
import { OrdersUseCases } from '../orders.use-cases';

/** Outbox subscribers: prepaid order paid, deferred order → note, note closed → trade account outstanding. */
@Injectable()
export class PartsHandlers implements OnModuleInit {
  private readonly log = new Logger('PartsHandlers');
  constructor(private readonly registry: OutboxHandlerRegistry, private readonly orders: OrdersUseCases) {}
  onModuleInit() {
    this.registry.on('InvoicePaid', 'parts.order-paid', async (ev) => { const id = await this.orders.onInvoicePaid(ev.aggregateId); if (id) this.log.log(`part order ${id} paid`); });
    this.registry.on('PartOrderCreated', 'parts.issue-note', async (ev) => { const p = ev.payload as { paymentTerms?: string }; if (p.paymentTerms !== 'deferred') return; const n = await this.orders.issueNoteForOrder(ev.aggregateId); if (n) this.log.log(`note ${n.number} ${n.status} for part order ${ev.aggregateId}`); });
    this.registry.on('TransportStatusChanged', 'parts.delivery-picked-up', async (ev) => { const p = ev.payload as { partOrderId?: string | null; to?: string }; if (p.partOrderId && p.to === 'picked_up') { const t = await this.orders.onDeliveryStatus(p.partOrderId, 'picked_up'); if (t) this.log.log(`part order ${p.partOrderId} → ${t} (driver picked up)`); } });
    this.registry.on('TransportDelivered', 'parts.delivery-delivered', async (ev) => { const p = ev.payload as { partOrderId?: string | null }; if (p.partOrderId) { const t = await this.orders.onDeliveryStatus(p.partOrderId, 'delivered'); if (t) this.log.log(`part order ${p.partOrderId} → ${t} (proof of delivery)`); } });
    this.registry.on('SettlementIssued', 'parts.note-closed', async (ev) => { const p = ev.payload as { partOrderId?: string | null; amount?: string }; if (p.partOrderId) await this.orders.onNoteClosed(p.partOrderId, p.amount ?? '0'); });
  }
}
