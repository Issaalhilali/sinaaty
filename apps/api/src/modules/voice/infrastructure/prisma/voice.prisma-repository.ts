import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { ExtractedItem } from '../../domain/extraction';
import type { VoiceNote, VoiceRepository } from '../../domain/repositories';

type Row = Prisma.VoiceNoteGetPayload<Record<string, never>>;
const toNote = (r: Row): VoiceNote => ({
  id: r.id, workOrderId: r.workOrderId, mediaId: r.mediaId, recordedBy: r.recordedBy,
  transcriptAr: r.transcriptAr, extractedItems: (r.extractedItems as unknown as ExtractedItem[] | null) ?? null,
  status: r.status as VoiceNote['status'], createdAt: r.createdAt,
});

@Injectable()
export class VoicePrismaRepository implements VoiceRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  async create(n: { workOrderId: string; mediaId: string; recordedBy: string }, tx?: TxHandle) {
    return toNote(await this.db(tx).voiceNote.create({ data: { workOrderId: n.workOrderId, mediaId: n.mediaId, recordedBy: n.recordedBy, status: 'pending' } }));
  }
  async findById(id: string) { const r = await this.prisma.voiceNote.findUnique({ where: { id } }); return r ? toNote(r) : null; }
  async listByWorkOrder(workOrderId: string) { return (await this.prisma.voiceNote.findMany({ where: { workOrderId }, orderBy: { createdAt: 'desc' } })).map(toNote); }
  async update(id: string, p: Parameters<VoiceRepository['update']>[1], tx?: TxHandle) {
    await this.db(tx).voiceNote.update({
      where: { id },
      data: {
        ...(p.transcriptAr != null ? { transcriptAr: p.transcriptAr } : {}),
        ...(p.extractedItems ? { extractedItems: p.extractedItems as unknown as Prisma.InputJsonValue } : {}),
        ...(p.status ? { status: p.status } : {}),
      },
    });
  }
  async media(mediaId: string) {
    const m = await this.prisma.mediaAsset.findUnique({ where: { id: mediaId } });
    return m ? { bucket: m.bucket, objectKey: m.objectKey, mimeType: m.mimeType } : null;
  }
}
