import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config';
import type { ObjectStoragePort, PresignedUpload } from '../application/storage.port';

/** Dev/test storage: presigned URLs point at our own no-op PUT endpoint; downloads are fake URLs. */
@Injectable()
export class StorageMockAdapter implements ObjectStoragePort {
  constructor(private readonly config: AppConfig) {}
  presignUpload(i: { bucket: string; objectKey: string; mimeType: string; sizeBytes: number }): Promise<PresignedUpload> {
    return Promise.resolve({ uploadUrl: `${this.config.get('API_BASE_URL')}/v1/media/mock-upload/${i.bucket}/${encodeURIComponent(i.objectKey)}`, method: 'PUT', headers: { 'content-type': i.mimeType }, expiresAt: new Date(Date.now() + 15 * 60_000) });
  }
  presignDownload(i: { bucket: string; objectKey: string }): Promise<string> {
    return Promise.resolve(`${this.config.get('API_BASE_URL')}/v1/media/mock-download/${i.bucket}/${encodeURIComponent(i.objectKey)}`);
  }
}
