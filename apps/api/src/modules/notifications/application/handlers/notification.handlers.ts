import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxHandlerRegistry, type OutboxEnvelope } from '../../../integrations/outbox/outbox-handler.registry';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { SERVICE_REQUEST_REPOSITORY, type ServiceRequestRepository } from '../../../service-requests/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../../organizations/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../../work-orders/domain/repositories';
import { ACCIDENT_REPORT_REPOSITORY, type AccidentReportRepository } from '../../../accidents/domain/repositories';
import { customerShare } from '../../../accidents/domain/accident-report';
import { NotificationService } from '../notification.service';

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const money = (v: unknown) => Number(v ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
/**
 * Event → recipients → template. One handler per event; each is idempotent (dedupe on user+template+key).
 * Recipients: customer (customerUserId / fleet org owners) and workshop staff (owner, manager).
 */
@Injectable()
export class NotificationOutboxHandlers implements OnModuleInit {
  private readonly log = new Logger(NotificationOutboxHandlers.name);
  constructor(private readonly registry: OutboxHandlerRegistry, private readonly notify: NotificationService, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(ACCIDENT_REPORT_REPOSITORY) private readonly accidents: AccidentReportRepository, @Inject(USER_REPOSITORY) private readonly users: UserRepository, @Inject(SERVICE_REQUEST_REPOSITORY) private readonly serviceRequests: ServiceRequestRepository) {}
  private async orgStaff(orgId: string, roles = ['owner', 'manager']) { return (await this.orgs.listMembers(orgId)).filter((m) => m.isActive && roles.includes(m.role)).map((m) => m.userId); }
  private async orgName(orgId: string) { const o = await this.orgs.findById(orgId); return o?.tradeNameAr ?? o?.legalNameAr ?? 'الورشة'; }
  private async customers(p: { customerUserId?: string | null; customerOrgId?: string | null }) { const ids: string[] = []; if (p.customerUserId) ids.push(p.customerUserId); if (p.customerOrgId) ids.push(...(await this.orgStaff(p.customerOrgId, ['owner', 'fleet_admin', 'fleet_approver']))); return ids; }
  private async woCtx(woId: string) { const wo = await this.workOrders.findById(woId); if (!wo) return null; return { wo, org: await this.orgName(wo.orgId), vehicle: '' }; }

  onModuleInit() {
    const on = (event: string, name: string, fn: (ev: OutboxEnvelope) => Promise<void>) => this.registry.on(event, `notifications.${name}`, async (ev) => { try { await fn(ev); } catch (e) { this.log.warn(`${event} → ${name}: ${(e as Error).message}`); throw e; } });
    const DECISION: Record<string, string> = { release_to_provider: 'تحرير المبلغ للمزوّد', refund_customer: 'استرداد كامل للعميل', split: 'تسوية بتقسيم المبلغ', replace_part: 'استبدال القطعة', no_action: 'بلا إجراء مالي' };
    const disputeParties = async (p: Record<string, unknown>) => { const ids: string[] = []; if (typeof p['openedByUserId'] === 'string') ids.push(p['openedByUserId']); if (typeof p['respondentUserId'] === 'string') ids.push(p['respondentUserId']); for (const k of ['claimantOrgId', 'respondentOrgId']) if (typeof p[k] === 'string') ids.push(...(await this.orgStaff(p[k]))); return [...new Set(ids)]; };
    const disputeRef = (p: Record<string, unknown>) => (typeof p['workOrderId'] === 'string' ? 'أمر إصلاح' : 'طلب قطع');
    on('DisputeOpened', 'dispute-opened', async (ev) => { const p = ev.payload; await this.notify.notifyMany(await disputeParties(p), { template: 'dispute.opened', data: { id: ev.aggregateId, number: str(p['number']), ref: disputeRef(p) }, dedupeKey: `dispute.opened:${ev.aggregateId}` }); });
    on('DisputeMessagePosted', 'dispute-message', async (ev) => { const p = ev.payload; const author = p['authorUserId']; const ids = (await disputeParties(p)).filter((x) => x !== p['authorUserId']);
      void author; await this.notify.notifyMany(ids, { template: 'dispute.message', data: { id: ev.aggregateId, number: str(p['number']) } }); });
    // سوق طلبات الإصلاح: الطلب يطرق أبواب الورش القريبة، وكل عرض يطرق باب العميل.
    on('ServiceRequestOpened', 'service-request-nearby', async (ev) => {
      const p = ev.payload as { titleAr?: string; orgIds?: string[]; number?: string };
      for (const orgId of p.orgIds ?? []) {
        const rec = await this.serviceRequests.findRecipient(ev.aggregateId, orgId);
        const distance = rec?.distanceKm == null ? 'مسافة قريبة' : `${Number(rec.distanceKm).toFixed(1)} كم`;
        await this.notify.notifyMany(await this.orgStaff(orgId, ['owner', 'manager', 'service_advisor']), { template: 'service.request.nearby', data: { id: ev.aggregateId, title: str(p.titleAr), distance }, dedupeKey: `service.request.nearby:${ev.aggregateId}:${orgId}` });
      }
    });
    on('ServiceOfferSubmitted', 'service-offer-customer', async (ev) => {
      const p = ev.payload as { customerUserId?: string; orgId?: string; titleAr?: string; priceMin?: string | null; offerId?: string };
      if (typeof p.customerUserId !== 'string' || typeof p.orgId !== 'string') return;
      const priceNote = p.priceMin ? ` بسعر يبدأ من ${money(p.priceMin)} ر.س` : '';
      await this.notify.notifyMany([p.customerUserId], { template: 'service.offer.received', data: { id: ev.aggregateId, org: await this.orgName(p.orgId), title: str(p.titleAr) || 'طلبك', price_note: priceNote }, dedupeKey: `service.offer:${p.offerId}` });
    });
    on('ServiceRequestQuiet', 'service-request-quiet', async (ev) => {
      const p = ev.payload as { customerUserId?: string; titleAr?: string; offers?: number };
      if (typeof p.customerUserId !== 'string') return;
      await this.notify.notifyMany([p.customerUserId], { template: 'service.request.quiet', data: { id: ev.aggregateId, title: str(p.titleAr), offers: String(p.offers ?? 0) }, dedupeKey: `service.quiet:${ev.aggregateId}` });
    });
    on('ServiceRequestAccepted', 'service-offer-won', async (ev) => {
      const p = ev.payload as { orgId?: string; number?: string; workOrderId?: string; workOrderNumber?: string };
      if (typeof p.orgId !== 'string') return;
      await this.notify.notifyMany(await this.orgStaff(p.orgId, ['owner', 'manager', 'service_advisor']), { template: 'service.offer.accepted', data: { number: str(p.number), wo: str(p.workOrderNumber), wo_id: str(p.workOrderId) }, dedupeKey: `service.accepted:${ev.aggregateId}` });
    });
    on('ApprovalRequested', 'approval-requested-staff', async (ev) => {
      const p = ev.payload as { amount?: string; requestedBy?: string };
      const staff = (await this.users.listIdsByPlatformRole(['finance', 'super_admin'])).filter((id) => id !== p.requestedBy);
      await this.notify.notifyMany(staff, { template: 'approval.requested', data: { amount: money(p.amount) }, dedupeKey: `approval.requested:${ev.aggregateId}` });
    });
    // Arbitration on the maker/checker design: dispute decisions stay single-step, but any decision
    // that MOVES money is broadcast to the finance desk the moment it lands — collective visibility.
    on('DisputeResolved', 'dispute-money-finance', async (ev) => {
      const p = ev.payload as { number?: string; toCustomer?: string; toProvider?: string };
      if (Number(p.toCustomer ?? 0) <= 0 && Number(p.toProvider ?? 0) <= 0) return;
      const staff = await this.users.listIdsByPlatformRole(['finance', 'super_admin']);
      await this.notify.notifyMany(staff, { template: 'dispute.money.decided', data: { id: ev.aggregateId, number: p.number, to_customer: money(p.toCustomer), to_provider: money(p.toProvider) }, dedupeKey: `dispute.money.decided:${ev.aggregateId}` });
    });
    on('DisputeResolved', 'dispute-resolved', async (ev) => { const p = ev.payload; await this.notify.notifyMany(await disputeParties(p), { template: 'dispute.resolved', data: { id: ev.aggregateId, number: str(p['number']), decision: DECISION[str(p['resolution'])] ?? str(p['resolution']), to_customer: money(p['toCustomer']), to_provider: money(p['toProvider']) }, dedupeKey: `dispute.resolved:${ev.aggregateId}` }); });
    const TRANSPORT_STATUS: Record<string, string> = { en_route_pickup: 'السائق في طريقه إليك', picked_up: 'حُمِّلت سيارتك على السطحة', en_route_dropoff: 'في الطريق إلى الوجهة', cancelled: 'أُلغيت المهمة', failed: 'تعذّر إتمام النقل' };
    const transportParties = async (p: Record<string, unknown>) => { const ids: string[] = []; if (typeof p['requesterUserId'] === 'string') ids.push(p['requesterUserId']); if (typeof p['requesterOrgId'] === 'string') ids.push(...(await this.orgStaff(p['requesterOrgId']))); return [...new Set(ids)]; };
    on('TransportAssigned', 'transport-assigned', async (ev) => { const p = ev.payload; await this.notify.notifyMany(await transportParties(p), { template: 'transport.assigned', data: { id: ev.aggregateId, number: str(p['number']), driver: str(p['driverNameAr']) || 'السائق', plate: str(p['truckPlate']) || '—' }, dedupeKey: `transport.assigned:${ev.aggregateId}` }); });
    on('TransportStatusChanged', 'transport-status', async (ev) => { const p = ev.payload; const label = TRANSPORT_STATUS[str(p['to'])]; if (!label) return; await this.notify.notifyMany(await transportParties(p), { template: 'transport.status', data: { id: ev.aggregateId, number: str(p['number']), status: label }, dedupeKey: `transport.status:${ev.aggregateId}:${str(p['to'])}` }); });
    on('TransportProofRequested', 'transport-proof', async (ev) => { const p = ev.payload; if (typeof p['requesterUserId'] !== 'string') return; await this.notify.notifyMany([p['requesterUserId']], { template: 'transport.proof', data: { id: ev.aggregateId, number: str(p['number']), code: str(p['code']) } }); });
    on('TransportDelivered', 'transport-delivered', async (ev) => { const p = ev.payload; await this.notify.notifyMany(await transportParties(p), { template: 'transport.delivered', data: { id: ev.aggregateId, number: str(p['number']), price: money(p['price']) }, dedupeKey: `transport.delivered:${ev.aggregateId}` }); });

    // Abandoned vehicle (Step 29): the notices are the paper trail, so the formal one also goes by SMS.
    on('AbandonedNoticeSent', 'abandoned-notice', async (ev) => {
      const p = ev.payload; const c = await this.woCtx(ev.aggregateId); if (!c) return;
      const storage = Number(p['storage'] ?? 0) > 0 ? ` (منها رسوم حفظ ${money(p['storage'])} ر.س)` : '';
      const days = Math.max(0, Math.floor((Date.now() - (c.wo.readyAt?.getTime() ?? Date.now())) / 86_400_000));
      await this.notify.notifyMany(await this.customers(c.wo), { template: 'wo.abandoned.notice', data: { id: c.wo.id, number: c.wo.number, days, total: money(p['total']), storage }, dedupeKey: `wo.abandoned.notice:${c.wo.id}:${String(p['step'])}` });
    });
    on('VehicleDeclaredAbandoned', 'abandoned-declared', async (ev) => {
      const p = ev.payload; const c = await this.woCtx(ev.aggregateId); if (!c) return;
      const claim = (p['claim'] ?? {}) as { total?: string; repair?: string; storage?: string };
      await this.notify.notifyMany(await this.customers(c.wo), { template: 'wo.abandoned.declared', data: { id: c.wo.id, number: c.wo.number, total: money(claim.total), repair: money(claim.repair), storage: money(claim.storage) }, dedupeKey: `wo.abandoned.declared:${c.wo.id}` });
    });

    // Accident files (Step 21): the customer's real question is "what do I pay?" — the answer leads the copy.
    const ACCIDENT_STATUS: Record<string, string> = { under_assessment: 'قيد التقييم من المُقيِّم.', assessed: 'تم التقييم.', approved: 'اعتمده التأمين.', rejected: 'رُفضت المطالبة — الإصلاح على حساب العميل.', closed: 'أُغلق الملف.', reported: 'مُسجَّل.' };
    on('AccidentReportLinked', 'accident-linked', async (ev) => {
      const p = ev.payload as { ref?: string; workOrderId?: string | null; status?: string };
      if (!p.workOrderId) return;
      const c = await this.woCtx(p.workOrderId); if (!c) return;
      const rep = await this.accidents.findById(ev.aggregateId); if (!rep) return;
      const share = customerShare(c.wo.total, rep.deductibleAmount, rep.faultPercent);
      await this.notify.notifyMany(await this.customers(c.wo), { template: 'accident.linked', data: { id: c.wo.id, number: c.wo.number, ref: str(p.ref), insurer: rep.insurerNameAr ?? 'شركة التأمين', approved: money(rep.approvedAmount ?? '0'), customer: money(share.estimated_customer_total) }, dedupeKey: `accident.linked:${ev.aggregateId}` });
    });
    on('AccidentReportUpdated', 'accident-updated', async (ev) => {
      const p = ev.payload as { ref?: string; to?: string; approvedAmount?: string | null; workOrderId?: string | null };
      if (!p.workOrderId) return;
      const c = await this.woCtx(p.workOrderId); if (!c) return;
      await this.notify.notifyMany(await this.customers(c.wo), { template: 'accident.updated', data: { id: c.wo.id, ref: str(p.ref), status: ACCIDENT_STATUS[str(p.to)] ?? '', approved_note: p.approvedAmount ? ` المعتمد ${money(p.approvedAmount)} ر.س.` : '' }, dedupeKey: `accident.updated:${ev.aggregateId}:${str(p.to)}` });
    });
    on('WorkOrderCreated', 'wo-created', async (ev) => { const c = await this.woCtx(ev.aggregateId); if (!c) return; await this.notify.notifyMany(await this.customers(c.wo), { template: 'wo.created', data: { id: c.wo.id, number: c.wo.number, org: c.org, vehicle: 'سيارتك' }, dedupeKey: `wo.created:${c.wo.id}` }); });
    on('WorkOrderApprovalRequested', 'wo-approval', async (ev) => { const c = await this.woCtx(ev.aggregateId); if (!c) return; const v = Number(ev.payload['version'] ?? c.wo.currentVersion); const tpl = v > 1 ? 'wo.change_order' : 'wo.awaiting_approval'; await this.notify.notifyMany(await this.customers(c.wo), { template: tpl, data: { id: c.wo.id, number: c.wo.number, org: c.org, total: money(ev.payload['total'] ?? c.wo.total), version: v, link: typeof ev.payload['approvalUrl'] === 'string' ? ` ${ev.payload['approvalUrl']}` : '' }, dedupeKey: `${tpl}:${c.wo.id}:v${v}` }); });
    on('WorkOrderApproved', 'wo-approved', async (ev) => { const c = await this.woCtx(ev.aggregateId); if (!c) return; const v = ev.payload['version']; await this.notify.notifyMany(await this.orgStaff(c.wo.orgId, ['owner', 'manager', 'technician']), { template: 'wo.approved', data: { id: c.wo.id, number: c.wo.number, version: v, deferred: ev.payload['paymentTerms'] === 'deferred' ? ' الدفع آجل — سيصدر سند لأمر تلقائياً.' : '' }, dedupeKey: `wo.approved:${c.wo.id}:v${String(v)}` }); });
    on('WorkOrderStatusChanged', 'wo-status', async (ev) => { const to = String(ev.payload['to']); const tpl = `wo.status.${to}`; if (!['awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed', 'cancelled', 'disputed', 'abandoned'].includes(to)) return; const c = await this.woCtx(ev.aggregateId); if (!c) return; const recipients = to === 'closed' ? [...(await this.customers(c.wo)), ...(await this.orgStaff(c.wo.orgId))] : await this.customers(c.wo); await this.notify.notifyMany(recipients, { template: tpl, data: { id: c.wo.id, number: c.wo.number, org: c.org, reason: typeof ev.payload['note'] === 'string' && ev.payload['note'] ? ` — ${ev.payload['note']}` : '' }, dedupeKey: `${tpl}:${c.wo.id}:${ev.id}` }); });
    on('InvoiceIssued', 'invoice-issued', async (ev) => {
      const p = ev.payload as { number?: string; orgId?: string; customerUserId?: string | null; customerOrgId?: string | null; total?: string; transportJobId?: string | null };
      // A tow invoice says «سطحتك», not the generic invoice copy, and deep-links to the job.
      if (p.transportJobId) { await this.notify.notifyMany(await this.customers(p), { template: 'transport.invoice.issued', data: { job_id: p.transportJobId, number: p.number, total: money(p.total) }, dedupeKey: `invoice.issued:${ev.aggregateId}` }); return; }
      await this.notify.notifyMany(await this.customers(p), { template: 'invoice.issued', data: { id: ev.aggregateId, number: p.number, org: p.orgId ? await this.orgName(p.orgId) : '', total: money(p.total) }, dedupeKey: `invoice.issued:${ev.aggregateId}` });
    });
    on('InvoicePaid', 'invoice-paid', async (ev) => { const p = ev.payload as { number?: string; orgId?: string; customerUserId?: string | null; customerOrgId?: string | null; amount?: string; paymentId?: string | null }; if (p.orgId) await this.notify.notifyMany(await this.orgStaff(p.orgId, ['owner', 'manager', 'accountant']), { template: 'invoice.paid', data: { id: ev.aggregateId, number: p.number, amount: money(p.amount) }, dedupeKey: `invoice.paid:${ev.aggregateId}:${p.paymentId ?? ''}` }); await this.notify.notifyMany(await this.customers(p), { template: 'invoice.paid.customer', data: { id: ev.aggregateId, number: p.number, amount: money(p.amount) }, dedupeKey: `invoice.paid.customer:${ev.aggregateId}:${p.paymentId ?? ''}` }); });
    on('EscrowReleased', 'escrow-released', async (ev) => { const p = ev.payload as { orgId?: string; net?: string; workOrderId?: string | null }; if (!p.orgId) return; const wo = p.workOrderId ? await this.workOrders.findById(p.workOrderId) : null; await this.notify.notifyMany(await this.orgStaff(p.orgId, ['owner', 'accountant']), { template: 'escrow.released', data: { id: ev.aggregateId, net: money(p.net), wo: wo?.number ?? '' }, dedupeKey: `escrow.released:${ev.aggregateId}` }); });
    on('PromissoryNoteIssued', 'note-issued', async (ev) => { const p = ev.payload as { number?: string; creditorOrgId?: string; debtorUserId?: string | null; debtorOrgId?: string | null; amount?: string }; const due = typeof ev.payload['dueDate'] === 'string' ? ev.payload['dueDate'].slice(0, 10) : ''; const org = p.creditorOrgId ? await this.orgName(p.creditorOrgId) : ''; await this.notify.notifyMany(await this.customers({ customerUserId: p.debtorUserId, customerOrgId: p.debtorOrgId }), { template: 'note.issued', data: { id: ev.aggregateId, number: p.number, amount: money(p.amount), org, due }, dedupeKey: `note.issued:${ev.aggregateId}` }); if (p.creditorOrgId) await this.notify.notifyMany(await this.orgStaff(p.creditorOrgId, ['owner', 'accountant']), { template: 'note.issued.creditor', data: { id: ev.aggregateId, number: p.number, amount: money(p.amount), due }, dedupeKey: `note.issued.creditor:${ev.aggregateId}` }); });
    on('PromissoryNotePartiallySettled', 'note-partial', async (ev) => { const p = ev.payload as { number?: string; debtorUserId?: string | null; debtorOrgId?: string | null; outstanding?: string }; await this.notify.notifyMany(await this.customers({ customerUserId: p.debtorUserId, customerOrgId: p.debtorOrgId }), { template: 'note.partially_settled', data: { id: ev.aggregateId, number: p.number, outstanding: money(p.outstanding) }, dedupeKey: `note.partial:${ev.aggregateId}:${ev.id}` }); });
    on('SettlementIssued', 'settlement', async (ev) => { const p = ev.payload as { number?: string; noteId?: string; noteNumber?: string; debtorUserId?: string | null; debtorOrgId?: string | null }; await this.notify.notifyMany(await this.customers({ customerUserId: p.debtorUserId, customerOrgId: p.debtorOrgId }), { template: 'note.closed', data: { id: p.noteId, number: p.noteNumber, settlement: p.number }, dedupeKey: `note.closed:${p.noteId ?? ev.aggregateId}` }); });
    on('NoteDunningDue', 'dunning', async (ev) => { const p = ev.payload as { number?: string; step?: number; isFormal?: boolean; debtorUserId?: string | null; debtorOrgId?: string | null; outstanding?: string; dueDate?: string }; await this.notify.notifyMany(await this.customers({ customerUserId: p.debtorUserId, customerOrgId: p.debtorOrgId }), { template: p.isFormal ? 'note.dunning.formal' : 'note.dunning.reminder', data: { id: ev.aggregateId, number: p.number, outstanding: money(p.outstanding), due: (p.dueDate ?? '').slice(0, 10) }, dedupeKey: `dunning:${ev.aggregateId}:${p.step}` }); });
    on('EnforcementRequested', 'enforcement', async (ev) => { const p = ev.payload as { number?: string; noteId?: string; debtorUserId?: string | null; claimed?: string }; if (p.debtorUserId) await this.notify.notify({ userId: p.debtorUserId, template: 'enforcement.requested', data: { id: p.noteId, number: p.number, claimed: money(p.claimed) }, dedupeKey: `enforcement:${ev.aggregateId}` }); });
    on('OrganizationStatusChanged', 'org-status', async (ev) => { const p = ev.payload as { to?: string; reason?: string | null }; const tpl = `org.${p.to}`; if (!['active', 'draft', 'suspended'].includes(String(p.to))) return; await this.notify.notifyMany(await this.orgStaff(ev.aggregateId, ['owner']), { template: tpl, data: { org: await this.orgName(ev.aggregateId), reason: p.reason ?? '' }, dedupeKey: `${tpl}:${ev.aggregateId}:${ev.id}` }); });
  }
}
