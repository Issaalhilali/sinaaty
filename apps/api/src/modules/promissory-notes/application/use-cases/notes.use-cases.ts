import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PnStatus } from '@sinaaty/shared-types';
import { AbandonedUseCases } from '../../../work-orders/application/abandoned.use-cases';
import { AppError } from '../../../../common/errors';
import { AppConfig } from '../../../../config';
import { AuditLogWriter } from '../../../../common/audit';
import { OutboxWriter } from '../../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../../identity/domain/auth-user';
import { isPlatformStaff } from '../../../identity/domain/auth-user';
import { USER_REPOSITORY, type UserRepository } from '../../../identity/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../../organizations/domain/repositories';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../../work-orders/domain/repositories';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../../invoicing/domain/repositories';
import { dunningStepsDue, isOverdue, OPEN_STATUSES, type PromissoryNote } from '../../domain/note';
import { NOTE_REPOSITORY, type NoteRepository } from '../../domain/repositories';
import { SETTLEMENT_RENDERER_PORT, type SettlementRendererPort } from '../ports/settlement-renderer.port';
import { buildBundle } from '../enforcement-bundle';

const FINANCE = ['owner', 'manager', 'accountant'];

@Injectable()
export class NotesUseCases {
  constructor(
    @Inject(NOTE_REPOSITORY) private readonly notes: NoteRepository, @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository, @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository, @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository, @Inject(SETTLEMENT_RENDERER_PORT) private readonly renderer: SettlementRendererPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork, private readonly audit: AuditLogWriter, private readonly outbox: OutboxWriter, private readonly config: AppConfig,
    // Optional: notes exist without the abandoned-vehicle path (a note on a part order has no car in a yard).
    @Optional() private readonly abandonedUseCases?: AbandonedUseCases,
  ) {}
  private canRead(n: PromissoryNote, u: AuthUser) { return isPlatformStaff(u) || u.orgs.some((o) => o.orgId === n.creditorOrgId) || n.debtorUserId === u.id || (n.debtorOrgId != null && u.orgs.some((o) => o.orgId === n.debtorOrgId)); }
  private async load(id: string) { const n = await this.notes.findById(id); if (!n) throw new AppError('NOT_FOUND'); return n; }
  private async parties(n: PromissoryNote) { const org = await this.orgs.findById(n.creditorOrgId); const debtor = n.debtorUserId ? await this.users.findById(n.debtorUserId) : null; const dOrg = n.debtorOrgId ? await this.orgs.findById(n.debtorOrgId) : null; return { creditorNameAr: org?.tradeNameAr ?? org?.legalNameAr ?? '', debtorNameAr: dOrg?.legalNameAr ?? debtor?.fullNameAr ?? null }; }

  async list(u: AuthUser, q: { org_id?: string; status?: PnStatus[]; overdue?: boolean; limit?: number }) {
    if (q.org_id) { if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === q.org_id)) throw new AppError('FORBIDDEN'); return this.notes.list({ creditorOrgId: q.org_id, status: q.status, overdueOnly: q.overdue, limit: q.limit ?? 50 }); }
    return this.notes.list({ debtorUserId: u.id, status: q.status, limit: q.limit ?? 50 });
  }
  async adminList(u: AuthUser, q: { status?: PnStatus[]; overdue?: boolean; limit?: number }) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.notes.list({ status: q.status, overdueOnly: q.overdue, limit: q.limit ?? 100 }); }
  async get(u: AuthUser, id: string) { const n = await this.load(id); if (!this.canRead(n, u)) throw new AppError('FORBIDDEN'); return { ...n, overdue: isOverdue(n, new Date()), events: await this.notes.listEvents(id), dunning: await this.notes.listDunning(id), settlement: await this.notes.findSettlementByNote(id), enforcement: await this.notes.findEnforcementByNote(id) }; }
  async document(u: AuthUser, id: string) { const n = await this.load(id); if (!this.canRead(n, u)) throw new AppError('FORBIDDEN'); const events = await this.notes.listEvents(id); return this.renderer.renderNote(n, await this.parties(n), events); }
  async settlementDocument(u: AuthUser, settlementId: string) { const s = await this.notes.findSettlement(settlementId); if (!s) throw new AppError('NOT_FOUND'); const n = s.noteId ? await this.notes.findById(s.noteId) : null; if (n ? !this.canRead(n, u) : !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); return this.renderer.render(s, n, n ? await this.parties(n) : { creditorNameAr: '', debtorNameAr: null }); }

  /** Dunning job: for overdue open notes, insert due steps (idempotent per note+step) and emit notification events. */
  async runDunning(limit = 200) {
    const now = new Date(); const schedule = this.config.get('DUNNING_SCHEDULE_DAYS'); const formalStep = this.config.get('DUNNING_FORMAL_STEP');
    const overdue = await this.notes.list({ status: OPEN_STATUSES, overdueOnly: true, limit }); let sent = 0;
    for (const n of overdue) {
      for (const step of dunningStepsDue(n.dueDate, schedule, now)) {
        const isFormal = step >= formalStep;
        const r = await this.uow.run(async (tx) => { const ins = await this.notes.addDunning({ noteId: n.id, invoiceId: n.invoiceId, step, channel: isFormal ? 'sms' : 'push', isFormal }, tx); if (ins.inserted) await this.outbox.publish(tx, { eventType: 'NoteDunningDue', aggregateType: 'promissory_note', aggregateId: n.id, payload: { number: n.number, step, isFormal, debtorUserId: n.debtorUserId, debtorOrgId: n.debtorOrgId, creditorOrgId: n.creditorOrgId, outstanding: n.outstandingAmount, dueDate: n.dueDate.toISOString() } }); return ins.inserted; });
        if (r) sent++;
      }
    }
    return { scanned: overdue.length, notices_sent: sent };
  }

  /** Creditor requests enforcement (Najiz) after due date + formal notice: builds the evidence bundle manifest. */
  async requestEnforcement(u: AuthUser, id: string) {
    const n = await this.load(id);
    if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === n.creditorOrgId && FINANCE.includes(o.role))) throw new AppError('FORBIDDEN');
    const existing = await this.notes.findEnforcementByNote(id); if (existing) return { ...existing, manifest: (await this.bundleFor(n)).manifest };
    if (!OPEN_STATUSES.includes(n.status) || n.status === 'in_enforcement') throw new AppError('PN_NOT_OPEN');
    const dunning = await this.notes.listDunning(id);
    if (!isOverdue(n, new Date()) || !dunning.some((d) => d.isFormal)) throw new AppError('PN_NOT_OVERDUE');
    const bundle = await this.bundleFor(n);
    const abandoned = n.workOrderId && this.abandonedUseCases ? await this.abandonedUseCases.claimFor(n.workOrderId) : null;
    return this.uow.run(async (tx) => {
      const c = await this.notes.createEnforcement({
        noteId: n.id, requestedBy: u.id,
        // An abandoned car is a different case in Najiz: the claim carries the storage fees that were
        // frozen at the declaration, and the file is marked as such (Step 29).
        claimedAmount: abandoned?.isAbandoned ? abandoned.total : n.outstandingAmount,
        isAbandonedVehicle: abandoned?.isAbandoned ?? false,
        storageFeesClaimed: abandoned?.storage ?? '0',
        timeline: [{ at: new Date().toISOString(), event: 'requested', by: u.id, abandoned_vehicle: abandoned?.isAbandoned ?? false }],
      }, tx);
      await this.notes.update(n.id, { status: 'in_enforcement' }, tx);
      await this.notes.addEvent({ noteId: n.id, from: n.status, to: 'in_enforcement', actorUserId: u.id, noteAr: 'طلب التنفيذ عبر ناجز — تم تجهيز حزمة المستندات' }, tx);
      await this.audit.write(tx, { action: 'enforcement.request', entityType: 'enforcement_case', entityId: c.id, orgId: n.creditorOrgId, actorUserId: u.id, after: { note: n.number, claimed: abandoned?.isAbandoned ? abandoned.total : n.outstandingAmount, abandoned_vehicle: abandoned?.isAbandoned ?? false, storage_fees: abandoned?.storage ?? '0', files: bundle.manifest.files.length } });
      await this.outbox.publish(tx, { eventType: 'EnforcementRequested', aggregateType: 'enforcement_case', aggregateId: c.id, payload: { noteId: n.id, number: n.number, creditorOrgId: n.creditorOrgId, debtorUserId: n.debtorUserId, claimed: n.outstandingAmount } });
      return { ...c, manifest: bundle.manifest };
    });
  }
  async enforcementBundle(u: AuthUser, id: string) { const n = await this.load(id); if (!isPlatformStaff(u) && !u.orgs.some((o) => o.orgId === n.creditorOrgId && FINANCE.includes(o.role))) throw new AppError('FORBIDDEN'); return this.bundleFor(n); }
  private async bundleFor(n: PromissoryNote) {
    const wo = n.workOrderId ? await this.workOrders.findById(n.workOrderId) : null;
    const version = wo ? await this.workOrders.getVersion(wo.id, wo.currentVersion) : null;
    const versions = wo ? await this.workOrders.listVersions(wo.id) : [];
    const inspections = wo ? await this.workOrders.listInspections(wo.id) : [];
    const media = wo ? await this.workOrders.listMedia(wo.id) : [];
    const invoice = n.invoiceId ? await this.invoices.findById(n.invoiceId) : (wo ? await this.invoices.findActiveByWorkOrder(wo.id) : null);
    const events = await this.notes.listEvents(n.id); const dunning = await this.notes.listDunning(n.id); const parties = await this.parties(n);
    return buildBundle({ note: n, parties, events, dunning, workOrder: wo, signedVersion: version, versions, inspections, media, invoice });
  }
}
