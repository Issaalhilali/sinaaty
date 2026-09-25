import { Inject, Injectable, Optional } from '@nestjs/common';
import { AuditLogWriter } from '../../../common/audit';
import { AppError } from '../../../common/errors';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { PilotService } from '../../pilot/application/pilot.service';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { isCustomer, WORKSHOP_WRITE_ROLES } from '../../work-orders/domain/work-order';
import { diffDamages, diffSummaryAr, mergeDamages, zoneAr, type Damage } from '../domain/damages';
import { INSPECTION_REPOSITORY, type InspectionRepository } from '../domain/repositories';
import { VISION_PORT, type VisionPort } from './ports/vision.port';

const asDamages = (raw: unknown): Damage[] =>
  Array.isArray(raw)
    ? raw.filter((d): d is Record<string, unknown> => !!d && typeof d === 'object').map((d) => ({
        // Stored JSON is untrusted shape: narrow each field instead of coercing it.
        zone: typeof d['zone'] === 'string' ? d['zone'] : 'other',
        severity: (typeof d['severity'] === 'string' && ['minor', 'moderate', 'severe'].includes(d['severity']) ? d['severity'] : 'minor') as Damage['severity'],
        noteAr: typeof d['note_ar'] === 'string' ? d['note_ar'] : typeof d['noteAr'] === 'string' ? d['noteAr'] : null,
        mediaIds: Array.isArray(d['media_ids']) ? (d['media_ids'] as string[]) : Array.isArray(d['mediaIds']) ? (d['mediaIds'] as string[]) : [],
        // Anything already stored without a source came from a person — the model only ever adds marked rows.
        source: d['source'] === 'ai' ? 'ai' : 'inspector',
        aiConfidence: typeof d['ai_confidence'] === 'number' ? d['ai_confidence'] : typeof d['aiConfidence'] === 'number' ? (d['aiConfidence']) : null,
      }))
    : [];

const toJson = (list: Damage[]) => list.map((d) => ({ zone: d.zone, severity: d.severity, note_ar: d.noteAr ?? null, media_ids: d.mediaIds ?? [], source: d.source, ai_confidence: d.aiConfidence ?? null }));
const view = (d: Damage) => ({ zone: d.zone, zone_ar: zoneAr(d.zone), severity: d.severity, note_ar: d.noteAr ?? null, media_ids: d.mediaIds ?? [], source: d.source, ai_confidence: d.aiConfidence ?? null });

/**
 * AI inspection (Step 28): the eight photos an inspector already takes are read by a model, and the
 * check-in is compared with the check-out.
 *
 * The comparison is the product. «هل تضررت سيارتي عند الورشة؟» is the question that turns a delivery into
 * an argument; here both sides open the same list, with the photos, before the car leaves.
 *
 * The model never decides anything: its findings are merged as marked suggestions, an inspector's entry
 * always wins on a zone they judged, and a dispute is never resolved on a model's word alone.
 */
@Injectable()
export class VisionUseCases {
  constructor(
    @Inject(INSPECTION_REPOSITORY) private readonly repo: InspectionRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(VISION_PORT) private readonly vision: VisionPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
    @Optional() private readonly pilot?: PilotService,
  ) {}

  private async mustWrite(u: AuthUser, workOrderId: string) {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo) throw new AppError('NOT_FOUND');
    const m = membership(u, wo.orgId);
    if ((!m || !WORKSHOP_WRITE_ROLES.includes(m.role)) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    return wo;
  }

  /** The diff is for the customer too — it is the evidence they are handed at delivery. */
  private async mustRead(u: AuthUser, workOrderId: string) {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo) throw new AppError('NOT_FOUND');
    const staff = !!membership(u, wo.orgId);
    if (!staff && !isCustomer(wo, { id: u.id, orgs: u.orgs, platformRole: u.platformRole }) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    return wo;
  }

  /** Reads the inspection's photos and proposes damages. Gated: this is an advanced surface (Step 25 flags). */
  async analyze(u: AuthUser, inspectionId: string) {
    const insp = await this.repo.findById(inspectionId);
    if (!insp?.workOrderId) throw new AppError('NOT_FOUND');
    const wo = await this.mustWrite(u, insp.workOrderId);
    if (this.pilot) await this.pilot.assertEnabled('ai_inspection', await this.pilot.subjectFor(wo.orgId));

    const photos = await this.repo.photosOf(inspectionId);
    if (!photos.length) throw new AppError('CONFLICT', { messageAr: 'لا توجد صور في هذا الفحص.', messageEn: 'This inspection has no photos.' });

    const result = await this.vision.analyze({ photos, vehicleAr: wo.titleAr });
    const human = asDamages(insp.damages).filter((d) => d.source === 'inspector');
    const merged = mergeDamages(human, result.damages);

    await this.uow.run(async (tx) => {
      await this.repo.setDamages(inspectionId, toJson(merged), { summaryAr: result.summaryAr, provider: result.provider, analyzedAt: new Date().toISOString(), unusable_media_ids: result.unusableMediaIds }, tx);
      await this.audit.write(tx, { action: 'inspection.ai_analyzed', entityType: 'inspection', entityId: inspectionId, orgId: wo.orgId, actorUserId: u.id, after: { provider: result.provider, suggested: result.damages.length, kept: merged.length - human.length, unusable_photos: result.unusableMediaIds.length } });
    });

    return {
      inspection_id: inspectionId,
      summary_ar: result.summaryAr,
      provider: result.provider,
      unusable_photos: result.unusableMediaIds.length,
      damages: merged.map(view),
      // What the inspector must still confirm — a suggestion is not a record until they say so.
      suggested: merged.filter((d) => d.source === 'ai').length,
    };
  }

  /** The inspector accepts or rejects the model's suggestions; accepted ones become their own record. */
  async confirm(u: AuthUser, inspectionId: string, dto: { accept_zones: string[] }) {
    const insp = await this.repo.findById(inspectionId);
    if (!insp?.workOrderId) throw new AppError('NOT_FOUND');
    const wo = await this.mustWrite(u, insp.workOrderId);
    const current = asDamages(insp.damages);
    const kept = current.filter((d) => d.source === 'inspector' || dto.accept_zones.includes(d.zone))
      .map((d) => ({ ...d, source: 'inspector' as const, aiConfidence: d.source === 'ai' ? d.aiConfidence : null }));

    await this.uow.run(async (tx) => {
      await this.repo.setDamages(inspectionId, toJson(kept), null, tx);
      await this.audit.write(tx, { action: 'inspection.ai_confirmed', entityType: 'inspection', entityId: inspectionId, orgId: wo.orgId, actorUserId: u.id, before: { total: current.length }, after: { accepted: dto.accept_zones, total: kept.length } });
    });
    return { damages: kept.map(view) };
  }

  /**
   * Check-in against check-out for one work order. Returns what appeared, what got worse, what was
   * repaired — with the photos of each, so the conversation at the gate is about pictures, not memory.
   */
  async diff(u: AuthUser, workOrderId: string) {
    await this.mustRead(u, workOrderId);
    const inspections = await this.repo.listByWorkOrder(workOrderId);
    const checkIn = inspections.find((i) => i.type === 'check_in');
    const checkOut = inspections.find((i) => i.type === 'check_out');
    if (!checkIn) throw new AppError('CONFLICT', { messageAr: 'لا يوجد فحص استلام لهذا الأمر.', messageEn: 'This work order has no check-in inspection.' });

    const before = asDamages(checkIn.damages);
    const after = checkOut ? asDamages(checkOut.damages) : [];
    const d = diffDamages(before, after);

    return {
      work_order_id: workOrderId,
      check_in: { id: checkIn.id, performed_at: checkIn.performedAt, damages: before.map(view), photos: checkIn.mediaIds },
      check_out: checkOut ? { id: checkOut.id, performed_at: checkOut.performedAt, damages: after.map(view), photos: checkOut.mediaIds } : null,
      // Without a check-out there is nothing to compare yet — say so rather than implying "all clear".
      comparable: !!checkOut,
      appeared: d.appeared.map(view),
      worsened: d.worsened.map((w) => ({ ...w, zone_ar: zoneAr(w.zone) })),
      repaired: d.repaired.map(view),
      unchanged: d.unchanged.map(view),
      summary_ar: checkOut ? diffSummaryAr(d) : 'بانتظار فحص التسليم للمقارنة.',
    };
  }
}
