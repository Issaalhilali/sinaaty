import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import type { AuthUser } from '../../identity/domain/auth-user';
import { isPlatformStaff } from '../../identity/domain/auth-user';
import { WORK_ORDER_REPOSITORY, type WorkOrderRepository } from '../../work-orders/domain/repositories';
import { isCustomer, isWorkshopMember } from '../../work-orders/domain/work-order';
import { DISPUTE_REPOSITORY, type DisputeRepository } from '../../disputes/domain/repositories';
import { SERVICE_REQUEST_REPOSITORY, type ServiceRequestRepository } from '../../service-requests/domain/repositories';
import { isRequester } from '../../service-requests/domain/service-request';
import { isDisputeParty } from '../../disputes/domain/dispute';
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
 * platform staff always may. Dispute evidence belongs to the dispute's parties — either side, from the
 * apps — exactly like the back-office (P1 scope doc §3).
 */
@Injectable()
export class DownloadMediaUseCase {
  constructor(
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
    @Inject(WORK_ORDER_REPOSITORY) private readonly workOrders: WorkOrderRepository,
    @Inject(DISPUTE_REPOSITORY) private readonly disputes: DisputeRepository,
    @Inject(SERVICE_REQUEST_REPOSITORY) private readonly serviceRequests: ServiceRequestRepository,
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
      if (link.entityType === 'service_request') {
        // Problem photos belong to the requester and to every workshop the request reached — a
        // workshop cannot quote a dent it is not allowed to see.
        const sr = await this.serviceRequests.findById(link.entityId);
        if (sr && (isRequester(sr, u.id) || (await this.serviceRequests.isRecipient(sr.id, viewer.orgs.map((o) => o.orgId))))) return true;
        continue;
      }
      if (link.entityType === 'dispute') {
        const d = await this.disputes.findById(link.entityId);
        if (d && isDisputeParty(d, viewer)) return true;
        continue;
      }
      const woId = await this.media.workOrderIdOf(link);
      if (!woId) continue;
      const wo = await this.workOrders.findById(woId);
      if (wo && (isWorkshopMember(wo, viewer) || isCustomer(wo, viewer))) return true;
    }
    return false;
  }
}
