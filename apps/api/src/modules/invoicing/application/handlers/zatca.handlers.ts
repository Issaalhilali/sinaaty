import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry } from '../../../integrations/outbox/outbox-handler.registry';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../domain/repositories';
import { ZatcaService } from '../zatca.service';

/**
 * Every issued invoice is signed and submitted automatically: standard invoices are **cleared**, simplified ones
 * **reported**. Running through the outbox means a ZATCA outage retries with backoff and ends in the DLQ (visible
 * in the admin integrations monitor) instead of silently leaving an invoice unreported.
 */
@Injectable()
export class ZatcaHandlers implements OnModuleInit {
  private readonly log = new Logger('ZatcaHandlers');
  constructor(private readonly registry: OutboxHandlerRegistry, private readonly zatca: ZatcaService, @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository) {}
  onModuleInit() {
    this.registry.on('InvoiceIssued', 'zatca.submit', async (ev) => {
      const invoice = await this.invoices.findById(ev.aggregateId);
      if (!invoice || invoice.status === 'void') return;
      const r = await this.zatca.signAndSubmit(invoice, null);
      this.log.log(r ? `invoice ${invoice.number} → ${r.status}` : `invoice ${invoice.number}: org not onboarded (Phase 1 QR stays)`);
    });
  }
}
