import { Inject, Injectable } from '@nestjs/common';
import type { AccidentReportStatus } from '@sinaaty/shared-types';
import { AuditLogWriter } from '../../../common/audit';
import { AppError } from '../../../common/errors';
import { OutboxWriter } from '../../../common/outbox';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { INVOICE_REPOSITORY, type InvoiceRepository } from '../../invoicing/domain/repositories';
import { ORGANIZATION_REPOSITORY, type OrganizationRepository } from '../../organizations/domain/repositories';
import { VehicleEventsWriter } from '../../vehicles/application/vehicle-events.writer';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { activeItems, type WorkOrder } from '../../work-orders/domain/work-order';
import { customerShare, isActionable, suggestItems, type AccidentReport } from '../domain/accident-report';
import { ACCIDENT_REPORT_REPOSITORY, type AccidentReportRepository } from '../domain/repositories';
import { ACCIDENT_REPORTS_PORT, type AccidentReportsPort, type ProviderAccidentReport } from './ports/accident-reports.port';
import type { LinkDto, LookupDto, SubmitRepairDto } from './dto/accidents.dto';

const WRITE_ROLES = ['owner', 'manager', 'service_advisor', 'technician'];

/**
 * Accident files (منجز/تقدير) attached to a repair.
 *
 * What this buys the workshop: the assessor's damage list becomes draft work-order items instead of being
 * retyped, the customer sees up-front what the insurer covers and what they actually pay (deductible +
 * fault share), and the finished repair is registered back against the accident file (FR-WO-10).
 *
 * The provider contract is unconfirmed (PRD risk R3) — everything here goes through AccidentReportsPort.
 */
@Injectable()
export class AccidentsUseCases {
  constructor(
    @Inject(ACCIDENT_REPORT_REPOSITORY) private readonly repo: AccidentReportRepository,
    @Inject(ACCIDENT_REPORTS_PORT) private readonly provider: AccidentReportsPort,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(INVOICE_REPOSITORY) private readonly invoices: InvoiceRepository,
    @Inject(ORGANIZATION_REPOSITORY) private readonly orgs: OrganizationRepository,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    private readonly outbox: OutboxWriter,
    private readonly passport: VehicleEventsWriter,
  ) {}

  private mustWrite(u: AuthUser, orgId: string) {
    const m = membership(u, orgId);
    if (!m || !WRITE_ROLES.includes(m.role)) { if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
  }
  private mustRead(u: AuthUser, r: AccidentReport, wo: WorkOrder | null) {
    if (isPlatformStaff(u)) return;
    if (r.orgId && membership(u, r.orgId)) return;
    // The customer of the linked work order may read their own accident file.
    if (wo && (wo.customerUserId === u.id || (wo.customerOrgId && membership(u, wo.customerOrgId)))) return;
    throw new AppError('FORBIDDEN');
  }
  private notFound(): never {
    throw new AppError('NOT_FOUND', { messageAr: 'لا يوجد تقرير حادث بهذا الرقم.', messageEn: 'No accident report with this reference.' });
  }

  private view(r: AccidentReport, extra?: Record<string, unknown>) {
    return {
      id: r.id, provider: r.provider, ref: r.externalRef, status: r.status, accident_at: r.accidentAt, location_ar: r.locationAr,
      vehicle_id: r.vehicleId, work_order_id: r.workOrderId, org_id: r.orgId,
      insurer_name_ar: r.insurerNameAr, policy_no: r.policyNo, claim_no: r.claimNo,
      fault_percent: r.faultPercent, deductible_amount: r.deductibleAmount, approved_amount: r.approvedAmount,
      damages: r.damages, suggested_items: suggestItems(r.damages), actionable: isActionable(r.status),
      repair_submission_ref: r.repairSubmissionRef, repair_submitted_at: r.repairSubmittedAt,
      created_at: r.createdAt, ...extra,
    };
  }

  /** Read-only preview before the advisor commits to linking — nothing is persisted. */
  async lookup(u: AuthUser, dto: LookupDto) {
    const p = await this.provider.fetchByRef(dto.ref, { vin: dto.vin ?? null, plate: dto.plate ?? null });
    if (!p) this.notFound();
    return {
      provider: this.provider.provider, ref: p.externalRef, status: p.status, accident_at: p.accidentAt, location_ar: p.locationAr,
      insurer_name_ar: p.insurerNameAr, policy_no: p.policyNo, claim_no: p.claimNo,
      fault_percent: p.faultPercent, deductible_amount: p.deductibleAmount, approved_amount: p.approvedAmount,
      damages: p.damages, suggested_items: suggestItems(p.damages), actionable: isActionable(p.status),
    };
  }

  /**
   * Attach the accident file to the repair: stores the report, marks the work order as an insurance claim
   * and records the accident in the Car Passport so the next buyer of that car can see it.
   */
  async link(u: AuthUser, dto: LinkDto) {
    this.mustWrite(u, dto.org_id);
    let wo: WorkOrder | null = null;
    if (dto.work_order_id) {
      wo = await this.workOrders.findById(dto.work_order_id);
      if (!wo) throw new AppError('NOT_FOUND');
      if (wo.orgId !== dto.org_id) throw new AppError('FORBIDDEN');
      if (wo.status === 'cancelled' || wo.status === 'closed') throw new AppError('CONFLICT', { messageAr: 'لا يمكن ربط تقرير حادث بأمر مغلق أو ملغى.', messageEn: 'Cannot link an accident report to a closed or cancelled work order.' });
    }
    const vehicleId = dto.vehicle_id ?? wo?.vehicleId ?? null;
    const p = await this.provider.fetchByRef(dto.ref, { vin: null, plate: null });
    if (!p) this.notFound();

    const existing = await this.repo.findByRef(this.provider.provider, p.externalRef);
    // Guard against the same accident file being pulled into two different repairs by mistake.
    if (existing?.workOrderId && dto.work_order_id && existing.workOrderId !== dto.work_order_id) {
      throw new AppError('CONFLICT', { messageAr: 'هذا التقرير مرتبط بأمر عمل آخر.', messageEn: 'This report is already linked to another work order.' });
    }

    const report = await this.uow.run(async (tx) => {
      const r = await this.repo.upsert(this.fromProvider(p, { vehicleId, workOrderId: dto.work_order_id ?? null, orgId: dto.org_id, createdBy: u.id }), tx);
      if (wo) {
        await this.workOrders.update(wo.id, { source: 'accident_claim', accidentReportRef: p.externalRef }, tx);
        await this.passport.record({
          vehicleId: wo.vehicleId, type: 'accident_report', orgId: dto.org_id, refTable: 'accident_reports', refId: r.id,
          occurredAt: r.accidentAt ?? new Date(),
          summaryAr: `تقرير حادث ${p.externalRef}${p.locationAr ? ` — ${p.locationAr}` : ''}`,
          summaryEn: `Accident report ${p.externalRef}`,
          data: { damages: p.damages.map((x) => x.partCode), insurer_name_ar: p.insurerNameAr },
        }, tx);
      }
      await this.audit.write(tx, { action: 'accident_report.link', entityType: 'accident_report', entityId: r.id, orgId: dto.org_id, actorUserId: u.id, after: { ref: p.externalRef, status: p.status, work_order_id: dto.work_order_id ?? null, damages: p.damages.length } });
      await this.outbox.publish(tx, { eventType: 'AccidentReportLinked', aggregateType: 'accident_report', aggregateId: r.id, payload: { ref: p.externalRef, status: p.status, workOrderId: dto.work_order_id ?? null, orgId: dto.org_id, vehicleId } });
      return r;
    });
    return this.view(report, wo ? { customer_estimate: customerShare(wo.total, report.deductibleAmount, report.faultPercent) } : {});
  }

  async get(u: AuthUser, id: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new AppError('NOT_FOUND');
    const wo = r.workOrderId ? await this.workOrders.findById(r.workOrderId) : null;
    this.mustRead(u, r, wo);
    return this.view(r, wo ? { work_order_number: wo.number, work_order_status: wo.status, customer_estimate: customerShare(wo.total, r.deductibleAmount, r.faultPercent) } : {});
  }

  async getByWorkOrder(u: AuthUser, workOrderId: string) {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo) throw new AppError('NOT_FOUND');
    const r = await this.repo.findByWorkOrder(workOrderId);
    if (!r) throw new AppError('NOT_FOUND');
    this.mustRead(u, r, wo);
    return this.view(r, { work_order_number: wo.number, customer_estimate: customerShare(wo.total, r.deductibleAmount, r.faultPercent) });
  }

  async list(u: AuthUser, q: { org_id?: string; vehicle_id?: string; status?: AccidentReportStatus[]; limit?: number }) {
    if (q.org_id) { if (!membership(u, q.org_id) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN'); }
    else if (!isPlatformStaff(u)) throw new AppError('VALIDATION', { messageAr: 'حدّد المنشأة.', messageEn: 'org_id is required.' });
    const rows = await this.repo.list({ orgId: q.org_id, vehicleId: q.vehicle_id, status: q.status, limit: Math.min(q.limit ?? 50, 100) });
    return rows.map((r) => this.view(r));
  }

  /** Pull the current state from the provider — the assessment usually lands days after the report. */
  async refresh(u: AuthUser, id: string) {
    const r = await this.repo.findById(id);
    if (!r) throw new AppError('NOT_FOUND');
    if (r.orgId) this.mustWrite(u, r.orgId); else if (!isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    const p = await this.provider.fetchByRef(r.externalRef, { vin: r.vinSnapshot, plate: r.plateSnapshot });
    if (!p) this.notFound();
    const changed = p.status !== r.status || p.approvedAmount !== r.approvedAmount;
    if (changed) {
      await this.uow.run(async (tx) => {
        await this.repo.update(r.id, { status: p.status, approvedAmount: p.approvedAmount, deductibleAmount: p.deductibleAmount, faultPercent: p.faultPercent, damages: p.damages, raw: p }, tx);
        await this.audit.write(tx, { action: 'accident_report.refresh', entityType: 'accident_report', entityId: r.id, orgId: r.orgId, actorUserId: u.id, before: { status: r.status, approved_amount: r.approvedAmount }, after: { status: p.status, approved_amount: p.approvedAmount } });
        await this.outbox.publish(tx, { eventType: 'AccidentReportUpdated', aggregateType: 'accident_report', aggregateId: r.id, payload: { ref: r.externalRef, from: r.status, to: p.status, approvedAmount: p.approvedAmount, workOrderId: r.workOrderId, orgId: r.orgId } });
      });
    }
    const fresh = await this.repo.findById(r.id);
    return this.view(fresh!, { changed });
  }

  /**
   * FR-WO-10 — register the completed repair against the accident file. Allowed once the car is ready or
   * gone: before that there is no repair to report. Idempotent — a second call returns the first result.
   */
  async submitRepair(u: AuthUser, id: string, dto: SubmitRepairDto) {
    const r = await this.repo.findById(id);
    if (!r) throw new AppError('NOT_FOUND');
    if (!r.orgId || !r.workOrderId) throw new AppError('CONFLICT', { messageAr: 'اربط التقرير بأمر عمل أولاً.', messageEn: 'Link the report to a work order first.' });
    this.mustWrite(u, r.orgId);
    if (r.repairSubmissionRef) return this.view(r, { already_submitted: true });
    if (!isActionable(r.status)) throw new AppError('CONFLICT', { messageAr: 'التقرير لم يُقيَّم بعد من المُقيِّم.', messageEn: 'The assessor has not priced this report yet.' });

    const wo = await this.workOrders.findById(r.workOrderId);
    if (!wo) throw new AppError('NOT_FOUND');
    if (!['ready', 'delivered', 'closed'].includes(wo.status)) throw new AppError('CONFLICT', { messageAr: 'أكمل الإصلاح قبل تسجيل التقرير.', messageEn: 'Finish the repair before registering the report.' });

    const [org, invoice, media] = await Promise.all([this.orgs.findById(r.orgId), this.invoices.findActiveByWorkOrder(wo.id), this.workOrders.listMedia(wo.id)]);
    const submission = await this.provider.submitRepairReport({
      externalRef: r.externalRef,
      workOrderNumber: wo.number,
      workshopName: org?.legalNameAr ?? '',
      workshopCrNumber: org?.crNumber ?? null,
      completedAt: (wo.deliveredAt ?? wo.readyAt ?? new Date()).toISOString(),
      invoiceNumber: invoice?.number ?? null,
      invoiceTotal: invoice?.total ?? null,
      itemsSummaryAr: activeItems(wo).map((i) => i.descriptionAr),
      photoCount: media.length,
    });

    await this.uow.run(async (tx) => {
      await this.repo.update(r.id, { repairSubmissionRef: submission.submissionRef, repairSubmittedAt: new Date(submission.acceptedAt) }, tx);
      await this.audit.write(tx, { action: 'accident_report.submit_repair', entityType: 'accident_report', entityId: r.id, orgId: r.orgId, actorUserId: u.id, after: { submission_ref: submission.submissionRef, work_order: wo.number, invoice: invoice?.number ?? null, note_ar: dto.note_ar ?? null } });
      await this.outbox.publish(tx, { eventType: 'AccidentRepairReported', aggregateType: 'accident_report', aggregateId: r.id, payload: { ref: r.externalRef, submissionRef: submission.submissionRef, workOrderId: wo.id, orgId: r.orgId } });
    });
    const fresh = await this.repo.findById(r.id);
    return this.view(fresh!, { submission_ref: submission.submissionRef });
  }

  private fromProvider(p: ProviderAccidentReport, ctx: { vehicleId: string | null; workOrderId: string | null; orgId: string; createdBy: string }) {
    return {
      provider: this.provider.provider, externalRef: p.externalRef, vehicleId: ctx.vehicleId, workOrderId: ctx.workOrderId, orgId: ctx.orgId,
      status: p.status, accidentAt: p.accidentAt ? new Date(p.accidentAt) : null, locationAr: p.locationAr,
      plateSnapshot: p.plate, vinSnapshot: p.vin, faultPercent: p.faultPercent, insurerNameAr: p.insurerNameAr,
      policyNo: p.policyNo, claimNo: p.claimNo, deductibleAmount: p.deductibleAmount, approvedAmount: p.approvedAmount,
      damages: p.damages, raw: p, createdBy: ctx.createdBy,
    };
  }
}
