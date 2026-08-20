import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff } from '../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { isCustomer, isWorkshopMember } from '../../work-orders/domain/work-order';
import { MEDIA_REPOSITORY, type MediaRepository } from '../domain/media';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from './storage.port';

const URL_TTL_SECONDS = 300;

/**
 * A short-lived download URL for one file — after proving the caller may see it.
 *
 * The file itself carries no permissions; **the link does**: an inspection photo belongs to whoever may
 * read that work order (the workshop's staff and the customer it is about), never to whoever guesses the
 * id (docs/security/review-2026-08.md flagged exactly this before the endpoint existed). The uploader and
 * platform staff always may. Dispute evidence is read from the back-office, which is staff — party access
 * from the apps lands with the dispute screens (docs/backlog.md).
 */
@Injectable()
export class DownloadMediaUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort,
  ) {}

  async execute(u: AuthUser, mediaId: string) {
    const asset = await this.media.findById(mediaId);
    if (!asset) throw new AppError('NOT_FOUND');
    if (!(await this.maySee(u, mediaId, asset.uploadedBy))) throw new AppError('FORBIDDEN');
    const url = await this.storage.presignDownload({ bucket: asset.bucket, objectKey: asset.objectKey, ttlSeconds: URL_TTL_SECONDS });
    return { url, mime_type: asset.mimeType, expires_in: URL_TTL_SECONDS };
  }

  private async maySee(u: AuthUser, mediaId: string, uploadedBy: string | null): Promise<boolean> {
    if (isPlatformStaff(u) || (uploadedBy != null && uploadedBy === u.id)) return true;
    const viewer = { id: u.id, orgs: u.orgs, platformRole: u.platformRole };
    for (const link of await this.media.linksOf(mediaId)) {
      const woId = await this.media.workOrderIdOf(link);
      if (!woId) continue;
      const wo = await this.workOrders.findById(woId);
      if (wo && (isWorkshopMember(wo, viewer) || isCustomer(wo, viewer))) return true;
    }
    return false;
  }
}
