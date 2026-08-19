import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from '../../../integrations/outbox/outbox-handler.registry';
import { NotesService } from '../notes.service';

/** Wires domain events → note lifecycle. Registered at boot; executed by OutboxProcessor with retries. */
@Injectable()
export class NoteOutboxHandlers implements OnModuleInit {
  private readonly log = new Logger(NoteOutboxHandlers.name);
  constructor(private readonly registry: OutboxHandlerRegistry, private readonly notes: NotesService) {}
  onModuleInit() {
    this.registry.on('WorkOrderApproved', 'promissory-notes.issue', async (ev) => {
      const p = ev.payload as { paymentTerms?: string; version?: number };
      if (p.paymentTerms !== 'deferred') return;
      const n = await this.notes.issueForWorkOrder(ev.aggregateId, { version: p.version });
      this.log.log(`note ${n.number} ${n.status} for work order ${ev.aggregateId}`);
    });
    const onPaid = (full: boolean) => async (ev: { aggregateId: string; payload: Record<string, unknown> }) => {
      const p = ev.payload as { workOrderId?: string | null; partOrderId?: string | null; paymentId?: string | null; amount?: string; paidTotal?: string; total?: string };
      const r = await this.notes.closeOnPayment({ workOrderId: p.workOrderId ?? null, partOrderId: p.partOrderId ?? null, invoiceId: ev.aggregateId, paymentId: p.paymentId ?? null, amount: p.amount ?? '0', paidTotal: p.paidTotal ?? '0', total: p.total ?? '0', full });
      if (r.note) this.log.log(`note ${r.note.number} → ${r.note.status}${r.settlementId ? ` (settlement ${r.settlementId})` : ''}`);
    };
    this.registry.on('InvoicePaid', 'promissory-notes.close-on-payment', onPaid(true));
    this.registry.on('InvoicePartiallyPaid', 'promissory-notes.partial-settlement', onPaid(false));
    this.registry.on('WorkOrderStatusChanged', 'promissory-notes.cancel-on-wo-cancel', async (ev) => {
      const p = ev.payload as { to?: string; note?: string | null };
      if (p.to === 'cancelled') await this.notes.cancelForWorkOrder(ev.aggregateId, p.note ?? 'إلغاء أمر العمل', null);
    });
  }
}
