import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma';
import type { MediaRepository } from '../domain/media';

@Injectable()
export class MediaPrismaRepository implements MediaRepository {
  constructor(private readonly prisma: PrismaService) {}
  async create(i: Parameters<MediaRepository['create']>[0]) {
    await this.prisma.mediaAsset.create({ data: { id: i.id, kind: i.kind, bucket: i.bucket, objectKey: i.objectKey, mimeType: i.mimeType, sizeBytes: BigInt(i.sizeBytes), sha256: i.sha256, uploadedBy: i.uploadedBy, capturedAt: i.capturedAt } });
  }
}
