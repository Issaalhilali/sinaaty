import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AuditLogWriter } from '../../../common/audit';
import { AppError } from '../../../common/errors';
import { UNIT_OF_WORK, type UnitOfWork } from '../../../common/ports/unit-of-work.port';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff, membership } from '../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { WORKSHOP_WRITE_ROLES } from '../../work-orders/domain/work-order';
import { WorkOrdersUseCases } from '../../work-orders/application/use-cases/work-orders.use-cases';
import { ItemDto } from '../../work-orders/application/dto/work-orders.dto';
import { isApplicable, type ExtractedItem } from '../domain/extraction';
import { VOICE_REPOSITORY, type VoiceRepository } from '../domain/repositories';
import { ITEM_EXTRACTION_PORT, type ItemExtractionPort } from './ports/item-extraction.port';
import { SPEECH_PORT, type SpeechToTextPort } from './ports/speech.port';

export const CreateVoiceNoteDto = z.object({
  media_id: z.string().uuid(),
  /** What the advisor typed instead of speaking, or a hint for the transcriber (dev/demo). */
  hint_ar: z.string().trim().max(2000).optional(),
});
export type CreateVoiceNoteDto = z.infer<typeof CreateVoiceNoteDto>;

export const ApplyVoiceNoteDto = z.object({
  items: z.array(z.object({
    type: z.enum(['labor', 'part', 'paint', 'towing', 'storage', 'diagnostic', 'other']),
    description_ar: z.string().trim().min(2).max(300),
    quantity: z.coerce.number().positive().max(1000),
    unit_price: z.string().regex(/^\d+(\.\d{1,2})?$/),
    warranty_days: z.number().int().min(0).max(3650).optional(),
  })).min(1).max(30),
});
export type ApplyVoiceNoteDto = z.infer<typeof ApplyVoiceNoteDto>;

/**
 * Voice to invoice (Step 27): the advisor talks, the platform proposes lines, **a person reviews them**,
 * and only then do they become work-order items the customer will sign.
 *
 * The review step is not a formality — it is the feature. Nothing extracted is ever applied by itself:
 * `apply` takes the lines the reviewer actually confirmed, with the prices they confirmed, and adds them
 * through the work-orders use case so versioning, VAT and re-approval all behave exactly as when a person
 * types them (CLAUDE.md §5.2).
 */
@Injectable()
export class VoiceUseCases {
  constructor(
    @Inject(VOICE_REPOSITORY) private readonly repo: VoiceRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(SPEECH_PORT) private readonly speech: SpeechToTextPort,
    @Inject(ITEM_EXTRACTION_PORT) private readonly extractor: ItemExtractionPort,
    private readonly woUseCases: WorkOrdersUseCases,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWork,
    private readonly audit: AuditLogWriter,
  ) {}

  private async mustWrite(u: AuthUser, workOrderId: string) {
    const wo = await this.workOrders.findById(workOrderId);
    if (!wo) throw new AppError('NOT_FOUND');
    const m = membership(u, wo.orgId);
    if ((!m || !WORKSHOP_WRITE_ROLES.includes(m.role)) && !isPlatformStaff(u)) throw new AppError('FORBIDDEN');
    return wo;
  }

  private view(n: { id: string; workOrderId: string | null; status: string; transcriptAr: string | null; extractedItems: ExtractedItem[] | null; createdAt: Date }) {
    const items = n.extractedItems ?? [];
    return {
      id: n.id, work_order_id: n.workOrderId, status: n.status, transcript_ar: n.transcriptAr,
      items: items.map((i) => ({
        type: i.type, description_ar: i.descriptionAr, quantity: i.quantity, unit_price: i.unitPrice,
        confidence: i.confidence, heard_ar: i.heardAr, needs_price: i.unitPrice == null,
      })),
      // What the reviewer must fix before anything can be applied.
      ready: items.length > 0 && items.every(isApplicable),
      missing_prices: items.filter((i) => i.unitPrice == null).length,
      created_at: n.createdAt,
    };
  }

  /**
   * Record → transcribe → propose. Runs inline: an advisor is standing at the car waiting for the lines,
   * and a queue would make them wait without knowing why. Failures leave the note `pending` so it can be
   * retried without losing the audio.
   */
  async create(u: AuthUser, workOrderId: string, dto: CreateVoiceNoteDto) {
    const wo = await this.mustWrite(u, workOrderId);
    const media = await this.repo.media(dto.media_id);
    if (!media) throw new AppError('NOT_FOUND', { messageAr: 'الملف الصوتي غير موجود.', messageEn: 'Audio file not found.' });
    if (!media.mimeType.startsWith('audio/')) throw new AppError('VALIDATION', { messageAr: 'الملف ليس تسجيلاً صوتياً.', messageEn: 'The file is not audio.' });

    const note = await this.uow.run((tx) => this.repo.create({ workOrderId, mediaId: dto.media_id, recordedBy: u.id }, tx));

    const transcript = await this.speech.transcribe({ ...media, hintAr: dto.hint_ar });
    const items = await this.extractor.extract({ transcriptAr: transcript.textAr, vehicleAr: wo.titleAr });

    await this.uow.run(async (tx) => {
      await this.repo.update(note.id, { transcriptAr: transcript.textAr, extractedItems: items, status: 'transcribed' }, tx);
      await this.audit.write(tx, { action: 'voice_note.transcribed', entityType: 'voice_note', entityId: note.id, orgId: wo.orgId, actorUserId: u.id, after: { work_order: wo.number, items: items.length, speech: this.speech.provider, extractor: this.extractor.provider } });
    });

    const fresh = await this.repo.findById(note.id);
    return this.view(fresh!);
  }

  async get(u: AuthUser, id: string) {
    const n = await this.repo.findById(id);
    if (!n?.workOrderId) throw new AppError('NOT_FOUND');
    await this.mustWrite(u, n.workOrderId);
    return this.view(n);
  }

  async list(u: AuthUser, workOrderId: string) {
    await this.mustWrite(u, workOrderId);
    return (await this.repo.listByWorkOrder(workOrderId)).map((n) => this.view(n));
  }

  /**
   * Apply the lines the reviewer confirmed. The payload is what the human saw and edited, not what the
   * model produced — the extraction is a draft, the review is the decision.
   */
  async apply(u: AuthUser, id: string, dto: ApplyVoiceNoteDto) {
    const n = await this.repo.findById(id);
    if (!n?.workOrderId) throw new AppError('NOT_FOUND');
    const wo = await this.mustWrite(u, n.workOrderId);
    if (n.status === 'applied') throw new AppError('CONFLICT', { messageAr: 'طُبِّقت بنود هذه الملاحظة مسبقاً.', messageEn: 'This note was already applied.' });
    if (n.status === 'discarded') throw new AppError('CONFLICT', { messageAr: 'الملاحظة مُهملة.', messageEn: 'This note was discarded.' });

    // Through the work-orders use case: versioning, VAT per line and the re-approval rule are its business.
    for (const item of dto.items) {
      // Parsed through the work-orders DTO so its defaults (discount, VAT rate, warranty) apply exactly
      // as they do when an advisor types the line by hand.
      await this.woUseCases.addItem(u, n.workOrderId, ItemDto.parse({
        type: item.type, description_ar: item.description_ar, quantity: item.quantity,
        unit_price: item.unit_price, warranty_days: item.warranty_days ?? 0,
      }));
    }

    await this.uow.run(async (tx) => {
      await this.repo.update(id, { status: 'applied' }, tx);
      await this.audit.write(tx, { action: 'voice_note.applied', entityType: 'voice_note', entityId: id, orgId: wo.orgId, actorUserId: u.id, after: { work_order: wo.number, applied: dto.items.length, total: dto.items.reduce((a, i) => a + Number(i.unit_price) * i.quantity, 0).toFixed(2) } });
    });

    return { applied: dto.items.length, work_order: await this.woUseCases.get(u, n.workOrderId) };
  }

  async discard(u: AuthUser, id: string, reasonAr?: string) {
    const n = await this.repo.findById(id);
    if (!n?.workOrderId) throw new AppError('NOT_FOUND');
    const wo = await this.mustWrite(u, n.workOrderId);
    if (n.status === 'applied') throw new AppError('CONFLICT', { messageAr: 'لا يمكن إهمال ملاحظة طُبِّقت.', messageEn: 'An applied note cannot be discarded.' });
    await this.uow.run(async (tx) => {
      await this.repo.update(id, { status: 'discarded' }, tx);
      await this.audit.write(tx, { action: 'voice_note.discarded', entityType: 'voice_note', entityId: id, orgId: wo.orgId, actorUserId: u.id, after: { reason_ar: reasonAr ?? null } });
    });
    return { discarded: true };
  }
}
