import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { PnStatus } from '@sinaaty/shared-types';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { AuditLogWriter } from '../../../common/audit';
import { OutboxWriter } from '../../../common/outbox';
import { Money } from '../../../common/domain/money';
import { UNIT_OF_WORK, type TxHandle, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import { USER_REPOSITORY, type UserRepository } from '../../identity/domain/repositories';
import { HASHER_PORT, type HasherPort } from '../../identity/application/ports/hasher.port';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { VehicleEventsWriter } from '../../vehicles/application/vehicle-events.writer';
import { canTransitionNote, OPEN_STATUSES, type PromissoryNote } from '../domain/note';
import { NOTE_REPOSITORY, type NoteRepository } from '../domain/repositories';
import { NAFEZ_PORT, type NafezPort } from './ports/nafez.port';

/** Core note lifecycle used by outbox handlers and use cases. Every change: event + audit + outbox in one tx. */
@Injectable()
export class NotesService {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: NoteRepository, @Inject(NAFEZ_PORT) private readonly nafez: NafezPort,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository, @Inject(HASHER_PORT) private readonly hasher: HasherPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly passport: VehicleEventsWriter, private readonly config: AppConfig,
  ) {}

  private async transition(tx: TxHandle, note: PromissoryNote, to: PnStatus, extra: { amountDelta?: string | null; paymentId?: string | null; providerRef?: string | null; providerPayload?: unknown; actorUserId?: string | null; noteAr?: string; patch?: Parameters<NoteRepository['update']>[1] }) {
    if (!canTransitionNote(note.status, to)) throw new AppError('CONFLICT', { messageAr: `لا يمكن نقل السند من ${note.status} إلى ${to}.`, messageEn: `Illegal note transition ${note.status} → ${to}.` });
    await this.notes.update(note.id, { status: to, ...(extra.patch ?? {}) }, tx);
    await this.notes.addEvent({ noteId: note.id, from: note.status, to, amountDelta: extra.amountDelta ?? null, paymentId: extra.paymentId ?? null, providerRef: extra.providerRef ?? note.nafezReference, providerPayload: extra.providerPayload, actorUserId: extra.actorUserId ?? null, noteAr: extra.noteAr }, tx);
    await this.audit.write(tx, { action: `promissory_note.${to}`, entityType: 'promissory_note', entityId: note.id, orgId: note.creditorOrgId, actorUserId: extra.actorUserId ?? null, actorType: extra.actorUserId ? 'user' : 'system', before: { status: note.status, outstanding: note.outstandingAmount }, after: { status: to, ...(extra.patch ?? {}), delta: extra.amountDelta ?? null } });
    await this.outbox.publish(tx, { eventType: `PromissoryNote${to === 'issued' ? 'Issued' : to === 'closed' ? 'Closed' : to === 'partially_settled' ? 'PartiallySettled' : to === 'in_enforcement' ? 'InEnforcement' : 'Changed'}`, aggregateType: 'promissory_note', aggregateId: note.id, payload: { number: note.number, creditorOrgId: note.creditorOrgId, debtorUserId: note.debtorUserId, debtorOrgId: note.debtorOrgId, workOrderId: note.workOrderId, invoiceId: note.invoiceId, from: note.status, to, amount: note.amount, outstanding: extra.patch?.outstandingAmount ?? note.outstandingAmount, nafezReference: extra.providerRef ?? note.nafezReference } });
  }

  /** Idempotent: one open note per work order. Called by the WorkOrderApproved handler when payment_terms=deferred. */
  async issueForWorkOrder(workOrderId: string, opts: { version?: number; actorUserId?: string | null } = {}): Promise<PromissoryNote> {
    const existing = await this.notes.findOpenByWorkOrder(workOrderId); if (existing) return existing;
    const wo = await this.workOrders.findById(workOrderId); if (!wo) throw new AppError('NOT_FOUND', { messageEn: 'work order not found' });
    if (wo.paymentTerms !== 'deferred') throw new AppError('CONFLICT', { messageEn: 'work order is not deferred' });
    if (!wo.approvedAt) throw new AppError('CONFLICT', { messageEn: 'work order not approved' });
    const org = await this.orgs.findById(wo.orgId); if (!org) throw new AppError('NOT_FOUND');
    const debtor = wo.customerUserId ? await this.users.findById(wo.customerUserId) : null;
    const version = await this.workOrders.getVersion(wo.id, opts.version ?? wo.currentVersion);
    const dueDate = wo.dueDate ?? new Date(Date.now() + this.config.get('NOTE_DEFAULT_TERMS_DAYS') * 86_400_000);
    // 1) create draft row (so retries find it) 2) call Nafez with idempotency key 3) mark issued
    const draft = await this.uow.run(async (tx) => {
      const number = await this.notes.nextNumber('PN', tx);
      const n = await this.notes.create({ number, creditorOrgId: wo.orgId, debtorUserId: wo.customerUserId, debtorOrgId: wo.customerOrgId, workOrderId: wo.id, amount: wo.total, dueDate, placeOfIssue: 'الرياض', consentSignatureId: null, createdBy: opts.actorUserId ?? null }, tx);
      await this.notes.addEvent({ noteId: n.id, from: null, to: 'draft', noteAr: `إنشاء مسودة السند من أمر العمل ${wo.number} (النسخة ${version?.version ?? wo.currentVersion})` }, tx);
      return n;
    });
    const res = await this.nafez.createNote({ internalNumber: draft.number, creditor: { orgId: org.id, legalNameAr: org.legalNameAr, crNumber: org.crNumber, vatNumber: org.vatNumber }, debtor: { userId: wo.customerUserId, orgId: wo.customerOrgId, nationalIdHash: null, nameAr: debtor?.fullNameAr ?? null }, amount: wo.total, currency: 'SAR', dueDate: dueDate.toISOString().slice(0, 10), placeOfIssue: 'الرياض', reference: { workOrderNumber: wo.number, invoiceNumber: null, consentSignatureId: null } }, `nafez.create_note:${draft.id}`);
    await this.uow.run(async (tx) => {
      const fresh = (await this.notes.findById(draft.id, tx))!;
      if (res.status === 'rejected') { await this.transition(tx, fresh, 'rejected', { providerRef: res.noteRef, providerPayload: res.raw }); return; }
      await this.transition(tx, fresh, res.status === 'issued' ? 'issued' : 'pending_consent', { providerRef: res.noteRef, providerPayload: res.raw, actorUserId: opts.actorUserId ?? null, patch: { nafezReference: res.noteRef, issueDate: res.issuedAt ?? new Date(), issuedAt: res.issuedAt ?? new Date(), nafezPayload: res.raw } });
      await this.passport.record({ vehicleId: wo.vehicleId, type: 'work_order', orgId: wo.orgId, refTable: 'promissory_notes', refId: draft.id, summaryAr: `إصدار سند لأمر ${draft.number} بقيمة ${Money.of(wo.total).format('ar')} — استحقاق ${dueDate.toISOString().slice(0, 10)}`, summaryEn: `Promissory note ${draft.number} issued`, isPublic: false }, tx);
    });
    return (await this.notes.findById(draft.id))!;
  }

  /** Parts hub: note for a deferred part order on a Nafez-secured trade account (creditor = supplier, debtor = workshop org). Idempotent. */
  async issueForPartOrder(o: { partOrderId: string; orderNumber: string; invoiceId: string | null; creditorOrgId: string; debtorOrgId: string; amount: string; dueDate: Date; actorUserId?: string | null }): Promise<PromissoryNote> {
    const existing = await this.notes.findOpenByPartOrder(o.partOrderId); if (existing) return existing;
    const org = await this.orgs.findById(o.creditorOrgId); const debtorOrg = await this.orgs.findById(o.debtorOrgId); if (!org || !debtorOrg) throw new AppError('NOT_FOUND');
    const draft = await this.uow.run(async (tx) => { const number = await this.notes.nextNumber('PN', tx); const n = await this.notes.create({ number, creditorOrgId: o.creditorOrgId, debtorOrgId: o.debtorOrgId, partOrderId: o.partOrderId, invoiceId: o.invoiceId, amount: o.amount, dueDate: o.dueDate, placeOfIssue: 'الرياض', createdBy: o.actorUserId ?? null }, tx); await this.notes.addEvent({ noteId: n.id, from: null, to: 'draft', noteAr: `إنشاء مسودة السند من طلب القطع ${o.orderNumber} (حساب آجل مضمون)` }, tx); return n; });
    const res = await this.nafez.createNote({ internalNumber: draft.number, creditor: { orgId: org.id, legalNameAr: org.legalNameAr, crNumber: org.crNumber, vatNumber: org.vatNumber }, debtor: { userId: null, orgId: debtorOrg.id, nationalIdHash: null, nameAr: debtorOrg.legalNameAr }, amount: o.amount, currency: 'SAR', dueDate: o.dueDate.toISOString().slice(0, 10), placeOfIssue: 'الرياض', reference: { workOrderNumber: null, invoiceNumber: null, consentSignatureId: null } }, `nafez.create:${draft.id}`);
    await this.uow.run(async (tx) => { const fresh = (await this.notes.findById(draft.id, tx))!; if (res.status === 'rejected') { await this.transition(tx, fresh, 'rejected', { providerRef: res.noteRef, providerPayload: res.raw }); return; } await this.transition(tx, fresh, res.status === 'issued' ? 'issued' : 'pending_consent', { providerRef: res.noteRef, providerPayload: res.raw, actorUserId: o.actorUserId ?? null, patch: { nafezReference: res.noteRef, issueDate: res.issuedAt ?? new Date(), issuedAt: res.issuedAt ?? new Date(), nafezPayload: res.raw } }); });
    return (await this.notes.findById(draft.id))!;
  }

  /** InvoicePaid handler: close the open note for the WO/invoice, issue the settlement — all in one unit. Idempotent. */
  async closeOnPayment(p: { workOrderId: string | null; partOrderId?: string | null; invoiceId: string | null; paymentId: string | null; amount: string; paidTotal: string; total: string; full: boolean }): Promise<{ note: PromissoryNote | null; settlementId?: string; alreadyClosed?: boolean }> {
    if (!p.workOrderId && !p.partOrderId) return { note: null };
    const note = p.workOrderId ? await this.notes.findOpenByWorkOrder(p.workOrderId) : await this.notes.findOpenByPartOrder(p.partOrderId!);
    if (!note) { if (!p.workOrderId) return { note: null }; const any = await this.notes.findByWorkOrder(p.workOrderId); const closed = any.find((n) => n.status === 'closed'); return closed ? { note: closed, alreadyClosed: true } : { note: null }; }
    const outstanding = Money.of(note.outstandingAmount).minus(Money.of(p.amount)); const closes = p.full || outstanding.isZero() || outstanding.isNegative();
    if (!closes) {
      await this.nafez.updateOutstanding(note.nafezReference!, outstanding.toString(), `nafez.update:${note.id}:${p.paymentId ?? p.paidTotal}`);
      await this.uow.run((tx) => this.transition(tx, note, 'partially_settled', { amountDelta: `-${Money.of(p.amount).toString()}`, paymentId: p.paymentId, patch: { outstandingAmount: outstanding.toString(), invoiceId: p.invoiceId ?? undefined }, noteAr: `سداد جزئي ${Money.of(p.amount).format('ar')} — المتبقي ${outstanding.format('ar')}` }));
      return { note: (await this.notes.findById(note.id))! };
    }
    const closed = await this.nafez.closeNote(note.nafezReference!, { reason: 'paid', paidAmount: note.amount }, `nafez.close:${note.id}`);
    const settlementId = await this.uow.run(async (tx) => {
      await this.transition(tx, note, 'closed', { amountDelta: `-${Money.of(note.outstandingAmount).toString()}`, paymentId: p.paymentId, providerRef: note.nafezReference, providerPayload: closed, patch: { outstandingAmount: '0.00', closedAt: closed.closedAt, invoiceId: p.invoiceId ?? undefined }, noteAr: 'سداد كامل — إغلاق السند تلقائياً' });
      const number = await this.notes.nextNumber('MK', tx);
      const content = { number, note: note.number, nafez_ref: note.nafezReference, creditor_org_id: note.creditorOrgId, debtor_user_id: note.debtorUserId, debtor_org_id: note.debtorOrgId, amount: note.amount, invoice_id: p.invoiceId, payment_id: p.paymentId, closed_at: closed.closedAt.toISOString() };
      const s = await this.notes.createSettlement({ number, noteId: note.id, invoiceId: p.invoiceId, workOrderId: note.workOrderId, creditorOrgId: note.creditorOrgId, debtorUserId: note.debtorUserId, debtorOrgId: note.debtorOrgId, amountSettled: note.amount, contentSha256: createHash('sha256').update(JSON.stringify(content)).digest('hex') }, tx);
      await this.audit.write(tx, { action: 'settlement.issue', entityType: 'settlement', entityId: s.id, orgId: note.creditorOrgId, actorType: 'system', after: content });
      await this.outbox.publish(tx, { eventType: 'SettlementIssued', aggregateType: 'settlement', aggregateId: s.id, payload: { number, noteId: note.id, noteNumber: note.number, creditorOrgId: note.creditorOrgId, debtorUserId: note.debtorUserId, debtorOrgId: note.debtorOrgId, amount: note.amount, workOrderId: note.workOrderId, partOrderId: note.partOrderId } });
      const wo = note.workOrderId ? await this.workOrders.findById(note.workOrderId, tx) : null;
      if (wo) await this.passport.record({ vehicleId: wo.vehicleId, type: 'work_order', orgId: note.creditorOrgId, refTable: 'settlements', refId: s.id, summaryAr: `سداد كامل وإغلاق السند ${note.number} — مخالصة ${number}`, summaryEn: `Note ${note.number} closed — settlement ${number}`, isPublic: false }, tx);
      return s.id;
    });
    return { note: (await this.notes.findById(note.id))!, settlementId };
  }

  async cancelForWorkOrder(workOrderId: string, reason: string, actorUserId: string | null) {
    const note = await this.notes.findOpenByWorkOrder(workOrderId); if (!note) return null;
    if (note.status !== 'issued') return note; // partially settled notes are not cancelled automatically
    const r = await this.nafez.closeNote(note.nafezReference!, { reason: 'cancelled', paidAmount: '0.00' }, `nafez.cancel:${note.id}`);
    await this.uow.run((tx) => this.transition(tx, note, 'cancelled', { providerPayload: r, actorUserId, patch: { cancelledAt: r.closedAt, cancelReason: reason }, noteAr: reason }));
    return this.notes.findById(note.id);
  }
  isOpen(n: PromissoryNote) { return OPEN_STATUSES.includes(n.status); }
}
