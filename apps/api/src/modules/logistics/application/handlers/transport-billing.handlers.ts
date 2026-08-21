import { Inject, Injectable, Logger, Optional, type OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from '../../../integrations/outbox/outbox-handler.registry';
import { InvoicesUseCases } from '../../../invoicing/application/use-cases/invoices.use-cases';
import { REALTIME_PUBLISHER, type RealtimePublisher } from '../../../work-orders/application/ports/realtime.port';
import { TRANSPORT_REPOSITORY, type TransportRepository } from '../../domain/repositories';

/**
 * Delivery proven (OTP + photo) → the tow invoice issues itself (P1 scope doc §2). The invoice rides
 * the existing payment line untouched: intent → webhook → escrow → margin split at release. A provider
 * without a VAT number fails loudly here and the outbox retries/dead-letters it — a tax invoice with
 * no seller VAT number is not an invoice.
 */
@Injectable()
export class TransportBillingHandlers implements OnModuleInit {
  private readonly log = new Logger('TransportBilling');
  constructor(
    private readonly registry: OutboxHandlerRegistry,
    private readonly invoices: InvoicesUseCases,
    @Inject(TRANSPORT_REPOSITORY) private readonly jobs: TransportRepository,
    @Optional() @Inject(REALTIME_PUBLISHER) private readonly rt?: RealtimePublisher,
  ) {}
  onModuleInit() {
    this.registry.on('TransportDelivered', 'logistics.issue-invoice', async (ev) => {
      const j = await this.jobs.findById(ev.aggregateId);
      if (!j || j.status !== 'delivered' || !j.providerOrgId) return;
      const inv = await this.invoices.issueForTransportJob({
        transportJobId: j.id,
        jobNumber: j.number,
        providerOrgId: j.providerOrgId,
        requesterUserId: j.requesterUserId,
        requesterOrgId: j.requesterOrgId,
        amount: j.finalPrice ?? j.quotedPrice ?? '0',
        descriptionAr: `نقل مركبة — ${j.pickupAddress ?? 'موقع الاستلام'} ← ${j.dropoffAddress ?? 'الوجهة'}`,
      });
      this.rt?.publish(`transport:${j.id}`, 'invoice', { job_id: j.id, invoice_id: inv.id, number: inv.number, total: inv.total });
      this.log.log(`transport ${j.number} invoiced as ${inv.number} (${inv.total})`);
    });
  }
}
