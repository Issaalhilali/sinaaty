import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AuditLogWriter } from '../../../common/audit';
import { AppError } from '../../../common/errors';
import { LeaderLock } from '../../../common/locks';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import { AppConfig } from '../../../config';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { abandonedClaim, canDeclareAbandoned, nextDueNotice, noticeSchedule, storageFee, type StorageFee } from '../domain/abandoned';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../domain/repositories';
import { WORKSHOP_WRITE_ROLES, type WorkOrder } from '../domain/work-order';
import { WoTransitionService } from './wo-transition.service';

/** The API speaks snake_case; the domain speaks camelCase. Mapped here rather than leaking either way. */
const feeView = (f: StorageFee) => ({ chargeable_days: f.chargeableDays, per_day: f.perDay, amount: f.amount, free_days: f.freeDays });

/**
 * The abandoned-vehicle path (FR: المركبة المهجورة).
 *
 * A car has been ready for weeks and the customer has stopped answering. The workshop cannot keep storing
 * it for free and cannot simply declare it abandoned — so the platform turns the process into a paper
 * trail: notices on a schedule (the last one formal, by SMS), storage that starts only after a grace
 * period, and a declaration that is **refused** until every notice was actually sent.
 *
 * The notices are kept on the work order's `metadata` rather than in their own table: three rows per
 * abandoned car, read only in this flow. If ops ever needs to report across them, it becomes a table
 * (docs/backlog.md).
 */
@Injectable()
export class AbandonedUseCases {
  private readonly log = new Logger(AbandonedUseCases.name);

  constructor(
    @Inject(WORK_ORDER_REPOSITORY) private readonly repo: WorkOrderRepository,
    private readonly transitions: WoTransitionService,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    private readonly outbox: OutboxWriter,
    private readonly config: AppConfig,
    private readonly lock: LeaderLock,
  ) {}

  private mustWrite(wo: WorkOrder, u: AuthUser) {
    const m = membership(u, wo.orgId);
    if ((!m || !WORKSHOP_WRITE_ROLES.includes(m.role)) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
  }

  private feeFor(wo: WorkOrder, now: Date) {
    return storageFee(wo.readyAt ?? now, now, wo.storageFeePerDay ?? '0', this.config.get('ABANDONED_STORAGE_FREE_DAYS'));
  }

  /** Where this car stands: how long it has waited, what was sent, what it owes, and what is allowed next. */
  async status(u: AuthUser, id: string) {
    const wo = await this.repo.findById(id);
    if (!wo) throw new AppError('NOT_FOUND');
    this.mustWrite(wo, u);
    const now = new Date();
    const notices = await this.repo.abandonedNotices(id);
    const sent = notices.map((n) => n.step);
    const noticeDays = this.config.get('ABANDONED_NOTICE_DAYS');
    const fee = this.feeFor(wo, now);
    const eligibility = canDeclareAbandoned({ readyAt: wo.readyAt, now, sentSteps: sent, noticeDays, status: wo.status });
    const due = wo.readyAt ? nextDueNotice(wo.readyAt, now, sent, noticeDays) : null;
    return {
      work_order_id: id, number: wo.number, status: wo.status, ready_at: wo.readyAt,
      days_ready: eligibility.daysReady,
      schedule: noticeSchedule(noticeDays).map((x) => ({ step: x.step, after_days: x.afterDays, formal: x.formal })),
      notices_sent: notices,
      next_notice: due ? { step: due.step, after_days: due.afterDays, formal: due.formal } : null,
      storage: feeView(fee),
      claim: abandonedClaim(wo.total, fee),
      can_declare: eligibility.eligible,
      reason_ar: eligibility.reasonAr,
    };
  }

  /**
   * Sends the next notice that is due. Idempotent per step: a retry, or a second click, never sends the
   * same notice twice — and a notice that was never due is refused rather than sent early.
   */
  async sendNotice(u: AuthUser, id: string, actorId: string | null = null) {
    const wo = await this.repo.findById(id);
    if (!wo) throw new AppError('NOT_FOUND');
    if (actorId === null) this.mustWrite(wo, u);
    if (wo.status !== 'ready') throw new AppError('CONFLICT', { messageAr: 'الإنذارات تبدأ بعد جهوز السيارة للتسليم.', messageEn: 'Notices start once the car is ready.' });
    if (!wo.readyAt) throw new AppError('CONFLICT', { messageAr: 'لا يوجد تاريخ جهوز مسجّل.', messageEn: 'No ready date recorded.' });

    const now = new Date();
    const notices = await this.repo.abandonedNotices(id);
    const due = nextDueNotice(wo.readyAt, now, notices.map((n) => n.step), this.config.get('ABANDONED_NOTICE_DAYS'));
    if (!due) throw new AppError('CONFLICT', { messageAr: 'لا يوجد إنذار مستحق الآن.', messageEn: 'No notice is due right now.' });

    const fee = this.feeFor(wo, now);
    await this.repo.addAbandonedNotice(id, { step: due.step, at: now.toISOString(), formal: due.formal, by: actorId ?? u.id });
    await this.uow.run(async (tx) => {
      // The first notice is also stamped on the work order itself: it is the date the clock legally starts.
      if (due.step === 1) await this.repo.update(id, { abandonedNoticeAt: now }, tx);
      await this.audit.write(tx, { action: 'wo.abandoned.notice', entityType: 'work_order', entityId: id, orgId: wo.orgId, actorUserId: actorId ?? u.id, after: { number: wo.number, step: due.step, formal: due.formal, days_ready: Math.max(0, Math.floor((now.getTime() - wo.readyAt!.getTime()) / 86_400_000)), storage: fee.amount } });
      await this.outbox.publish(tx, { eventType: 'AbandonedNoticeSent', aggregateType: 'work_order', aggregateId: id, payload: { number: wo.number, orgId: wo.orgId, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, step: due.step, isFormal: due.formal, storage: fee.amount, total: wo.total } });
    });
    return { step: due.step, formal: due.formal, sent_at: now, storage: feeView(fee) };
  }

  /**
   * Declares the car abandoned. Refused unless the full period passed and every notice was sent — the
   * declaration is what a court reads, so the guard lives here and not in the UI.
   */
  async declare(u: AuthUser, id: string, reasonAr?: string) {
    const wo = await this.repo.findById(id);
    if (!wo) throw new AppError('NOT_FOUND');
    this.mustWrite(wo, u);
    const now = new Date();
    const notices = await this.repo.abandonedNotices(id);
    const eligibility = canDeclareAbandoned({ readyAt: wo.readyAt, now, sentSteps: notices.map((n) => n.step), noticeDays: this.config.get('ABANDONED_NOTICE_DAYS'), status: wo.status });
    if (!eligibility.eligible) throw new AppError('CONFLICT', { messageAr: eligibility.reasonAr, messageEn: 'The abandoned declaration is not allowed yet.' });

    const fee = this.feeFor(wo, now);
    const claim = abandonedClaim(wo.total, fee);
    await this.uow.run(async (tx) => {
      // The storage figure is frozen at declaration: the amount claimed later must be the amount declared.
      await this.repo.setAbandonedClaim(id, { ...claim, declared_at: now.toISOString(), chargeable_days: fee.chargeableDays, per_day: fee.perDay }, tx);
      await this.transitions.apply(tx, wo, 'abandoned', { userId: u.id }, reasonAr, { claim, notices: notices.length });
      await this.audit.write(tx, { action: 'wo.abandoned.declare', entityType: 'work_order', entityId: id, orgId: wo.orgId, actorUserId: u.id, after: { number: wo.number, days_ready: eligibility.daysReady, notices: notices.length, claim, reason_ar: reasonAr ?? null } });
      await this.outbox.publish(tx, { eventType: 'VehicleDeclaredAbandoned', aggregateType: 'work_order', aggregateId: id, payload: { number: wo.number, orgId: wo.orgId, customerUserId: wo.customerUserId, customerOrgId: wo.customerOrgId, claim, daysReady: eligibility.daysReady } });
    });
    return { declared: true, claim, days_ready: eligibility.daysReady, notices: notices.length };
  }

  /** The claim a Najiz enforcement carries for this car — read by the promissory-notes module. */
  async claimFor(workOrderId: string): Promise<{ isAbandoned: boolean; storage: string; total: string } | null> {
    const wo = await this.repo.findById(workOrderId);
    if (!wo) return null;
    const frozen = await this.repo.abandonedClaimOf(workOrderId);
    if (wo.status !== 'abandoned') return { isAbandoned: false, storage: '0.00', total: wo.total };
    // The frozen figure wins: a claim must not grow while a case is being filed.
    return { isAbandoned: true, storage: frozen?.storage ?? '0.00', total: frozen?.total ?? wo.total };
  }

  /**
   * Sends every notice that fell due, once per hour, on one instance only. Nothing is ever declared
   * automatically: a machine may remind, but only a person declares a car abandoned.
   */
  @Interval(3_600_000)
  async runNotices() {
    if (!this.config.get('JOBS_ENABLED')) return;
    await this.lock.runExclusive('abandoned.notices', async () => {
      const noticeDays = this.config.get('ABANDONED_NOTICE_DAYS');
      const candidates = await this.repo.readyAwaitingCollection(200);
      let sent = 0;
      for (const id of candidates) {
        try {
          await this.sendNotice({ id: 'system', orgs: [], platformRole: 'ops' } as unknown as AuthUser, id, null);
          sent++;
        } catch { /* not due, or the car moved on — the next tick will look again */ }
      }
      if (sent) this.log.log(`abandoned notices sent: ${sent}`);
      void noticeDays;
      return sent;
    });
  }
}
