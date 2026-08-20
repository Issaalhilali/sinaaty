import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config';
import type { ObjectStoragePort, PresignedUpload } from '../application/storage.port';
import { presignUrl, type SigV4Config } from './sigv4';

const UPLOAD_TTL_SECONDS = 15 * 60;

/**
 * Live object storage over any S3-compatible endpoint — MinIO in docker-compose, KSA object storage in
 * production. Presigning is pure local crypto (sigv4.ts, proven against AWS's documented vectors), so
 * this adapter makes no network call of its own: the client talks to storage directly, exactly like the
 * mock's flow, and no bytes ever pass through the API.
 */
@Injectable()
export class StorageS3Adapter implements ObjectStoragePort {
  private readonly cfg: SigV4Config;
  constructor(config: AppConfig) {
    const endpoint = config.get('S3_ENDPOINT'); const accessKey = config.get('S3_KEY'); const secretKey = config.get('S3_SECRET');
    if (!endpoint || !accessKey || !secretKey) {
      throw new Error('INTEGRATION_STORAGE=live needs S3_ENDPOINT, S3_KEY and S3_SECRET — refusing to boot half-configured');
    }
    this.cfg = { endpoint, accessKey, secretKey, region: config.get('S3_REGION'), pathStyle: config.get('S3_PATH_STYLE') };
  }

  presignUpload(i: { bucket: string; objectKey: string; mimeType: string; sizeBytes: number }): Promise<PresignedUpload> {
    const url = presignUrl(this.cfg, { method: 'PUT', bucket: i.bucket, key: i.objectKey, expiresSeconds: UPLOAD_TTL_SECONDS });
    return Promise.resolve({ uploadUrl: url, method: 'PUT', headers: { 'content-type': i.mimeType }, expiresAt: new Date(Date.now() + UPLOAD_TTL_SECONDS * 1000) });
  }

  presignDownload(i: { bucket: string; objectKey: string; ttlSeconds?: number }): Promise<string> {
    return Promise.resolve(presignUrl(this.cfg, { method: 'GET', bucket: i.bucket, key: i.objectKey, expiresSeconds: i.ttlSeconds ?? 300 }));
  }
}
