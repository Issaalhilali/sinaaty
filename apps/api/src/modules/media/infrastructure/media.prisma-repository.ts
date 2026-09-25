import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import type { MediaAssetRow, MediaLinkRow, MediaRepository } from '../domain/media';

@Injectable()
export class MediaPrismaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(i: Parameters<MediaRepository['create']>[0]) {
    await this.prisma.mediaAsset.create({ data: { id: i.id, kind: i.kind, bucket: i.bucket, objectKey: i.objectKey, mimeType: i.mimeType, sizeBytes: BigInt(i.sizeBytes), sha256: i.sha256, uploadedBy: i.uploadedBy, capturedAt: i.capturedAt } });
  }

  async findById(id: string): Promise<MediaAssetRow | null> {
    const r = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return r ? { id: r.id, kind: r.kind, bucket: r.bucket, objectKey: r.objectKey, mimeType: r.mimeType, uploadedBy: r.uploadedBy } : null;
  }

  async linksOf(mediaId: string): Promise<MediaLinkRow[]> {
    const rows = await this.prisma.mediaLink.findMany({ where: { mediaId } });
    return rows.map((r) => ({ entityType: r.entityType, entityId: r.entityId }));
  }

  async workOrderIdOf(link: MediaLinkRow): Promise<string | null> {
    switch (link.entityType) {
      case 'work_order':
        return link.entityId;
      case 'inspection': {
        const rows = await this.prisma.$queryRaw<Array<{ work_order_id: string | null }>>`SELECT work_order_id FROM inspections WHERE id = ${link.entityId}::uuid`;
        return rows[0]?.work_order_id ?? null;
      }
      case 'work_order_item': {
        const rows = await this.prisma.$queryRaw<Array<{ work_order_id: string }>>`SELECT work_order_id FROM work_order_items WHERE id = ${link.entityId}::uuid`;
        return rows[0]?.work_order_id ?? null;
      }
      default:
        return null;
    }
  }
}
