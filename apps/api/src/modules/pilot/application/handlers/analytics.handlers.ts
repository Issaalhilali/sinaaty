import { Injectable, OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry, type OutboxEnvelope } from '../../../integrations/outbox/outbox-handler.registry';
import { PilotService } from '../pilot.service';

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
const money = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : undefined);

/**
 * Domain events → funnel rows. Nothing about a person is copied: org, entity id, and amounts only
 * (CLAUDE.md §5.4). The outbox already guarantees at-least-once delivery, and the unique index on
 * (event, entity) makes a replay a no-op.
 */
@Injectable()
export class AnalyticsOutboxHandlers implements OnModuleInit {
  constructor(private readonly registry: OutboxHandlerRegistry, private readonly pilot: PilotService) {}

  onModuleInit() {
    const on = (event: string, name: string, map: (ev: OutboxEnvelope) => { event: string; orgId?: string | null; entityType: string; entityId: string; props?: Record<string, unknown> } | null) =>
      this.registry.on(event, `analytics.${name}`, async (ev) => {
        const row = map(ev);
        if (row) await this.pilot.record({ ...row, occurredAt: ev.createdAt });
      });

    on('WorkOrderCreated', 'wo-created', (ev) => ({ event: 'work_order.created', orgId: str(ev.payload['orgId']), entityType: 'work_order', entityId: ev.aggregateId, props: { payment_terms: str(ev.payload['paymentTerms']), source: str(ev.payload['source']) } }));
    on('WorkOrderApproved', 'wo-approved', (ev) => ({ event: 'work_order.approved', orgId: str(ev.payload['orgId']), entityType: 'work_order', entityId: ev.aggregateId, props: { version: ev.payload['version'], method: str(ev.payload['method']), total: money(ev.payload['total']) } }));
    on('WorkOrderStatusChanged', 'wo-delivered', (ev) => (str(ev.payload['to']) === 'delivered' ? { event: 'work_order.delivered', orgId: str(ev.payload['orgId']), entityType: 'work_order', entityId: ev.aggregateId } : null));
    on('InvoiceIssued', 'invoice-issued', (ev) => ({ event: 'invoice.issued', orgId: str(ev.payload['orgId']), entityType: 'invoice', entityId: ev.aggregateId, props: { total: money(ev.payload['total']) } }));
    on('InvoicePaid', 'invoice-paid', (ev) => ({ event: 'invoice.paid', orgId: str(ev.payload['orgId']), entityType: 'invoice', entityId: ev.aggregateId, props: { total: money(ev.payload['amount'] ?? ev.payload['total']) } }));
    on('PromissoryNoteIssued', 'note-issued', (ev) => ({ event: 'note.issued', orgId: str(ev.payload['creditorOrgId']), entityType: 'promissory_note', entityId: ev.aggregateId, props: { amount: money(ev.payload['amount']) } }));
    on('SettlementIssued', 'note-closed', (ev) => ({ event: 'note.closed', orgId: str(ev.payload['creditorOrgId']), entityType: 'settlement', entityId: ev.aggregateId }));
    on('PartRequestCreated', 'part-requested', (ev) => ({ event: 'part_request.created', orgId: str(ev.payload['requesterOrgId']), entityType: 'part_request', entityId: ev.aggregateId }));
    on('PartBidSubmitted', 'part-bid', (ev) => ({ event: 'part_bid.submitted', orgId: str(ev.payload['supplierOrgId']), entityType: 'part_bid', entityId: str(ev.payload['bidId']) ?? ev.aggregateId }));
    on('PartOrderCreated', 'part-order', (ev) => ({ event: 'part_order.created', orgId: str(ev.payload['supplierOrgId']), entityType: 'part_order', entityId: ev.aggregateId, props: { total: money(ev.payload['total']), source: str(ev.payload['source']) } }));
    // سوق طلبات الإصلاح — باب العميل الأول إلى الصناعية: يُقاس كما تُقاس بقية الأبواب (مراجعة 2026-08-23).
    on('ServiceRequestOpened', 'service-requested', (ev) => ({ event: 'service_request.opened', entityType: 'service_request', entityId: ev.aggregateId, props: { recipients: (ev.payload['orgIds'] as unknown[] | undefined)?.length ?? 0, preferred_time: str(ev.payload['preferredTime']) } }));
    on('ServiceOfferSubmitted', 'service-offered', (ev) => ({ event: 'service_offer.submitted', orgId: str(ev.payload['orgId']), entityType: 'service_offer', entityId: str(ev.payload['offerId']) ?? ev.aggregateId, props: { offer_type: str(ev.payload['offerType']), price_min: money(ev.payload['priceMin']) } }));
    on('ServiceRequestAccepted', 'service-accepted', (ev) => ({ event: 'service_request.accepted', orgId: str(ev.payload['orgId']), entityType: 'service_request', entityId: ev.aggregateId, props: { work_order: str(ev.payload['workOrderNumber']) } }));
    on('ServiceRequestQuiet', 'service-quiet', (ev) => ({ event: 'service_request.quiet', entityType: 'service_request', entityId: ev.aggregateId, props: { offers: ev.payload['offers'] ?? 0, radius_km: ev.payload['radiusKm'] ?? null } }));
    on('TransportRequested', 'tow-requested', (ev) => ({ event: 'transport.requested', orgId: str(ev.payload['requesterOrgId']), entityType: 'transport_job', entityId: ev.aggregateId, props: { price: money(ev.payload['price']) } }));
    on('DisputeOpened', 'dispute-opened', (ev) => ({ event: 'dispute.opened', orgId: str(ev.payload['respondentOrgId']) ?? str(ev.payload['claimantOrgId']), entityType: 'dispute', entityId: ev.aggregateId }));
    on('AccidentReportLinked', 'accident-linked', (ev) => ({ event: 'accident_report.linked', orgId: str(ev.payload['orgId']), entityType: 'accident_report', entityId: ev.aggregateId }));
  }
}
