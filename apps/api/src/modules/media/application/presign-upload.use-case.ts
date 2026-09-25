import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '../../../common/errors';
import { AppConfig } from '../../../config';
import { newId } from '../../../common/domain/ids';
import { ALLOWED_MIME, bucketFor, MAX_UPLOAD_BYTES, MEDIA_REPOSITORY, type MediaRepository } from '../domain/media';
import { OBJECT_STORAGE_PORT, type ObjectStoragePort } from './storage.port';
import type { PresignDto } from './media.dto';

@Injectable()
export class PresignUploadUseCase {
  constructor(@Inject(OBJECT_STORAGE_PORT) private readonly storage: ObjectStoragePort, @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository, private readonly config: AppConfig) {}
  async execute(userId: string, dto: PresignDto) {
    if (!ALLOWED_MIME[dto.kind].test(dto.mime_type)) throw new AppError('VALIDATION', { details: [{ path: 'mime_type', message: `not allowed for ${dto.kind}` }] });
    if (dto.size_bytes > MAX_UPLOAD_BYTES[dto.kind]) throw new AppError('VALIDATION', { details: [{ path: 'size_bytes', message: 'file too large' }] });
    const id = newId();
    const bucket = bucketFor(dto.purpose) === 'docs' ? this.config.get('S3_BUCKET_DOCS') : this.config.get('S3_BUCKET_MEDIA');
    const ext = dto.mime_type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
    const objectKey = `${dto.purpose}/${new Date().toISOString().slice(0, 10)}/${id}.${ext}`;
    await this.media.create({ id, kind: dto.kind, bucket, objectKey, mimeType: dto.mime_type, sizeBytes: dto.size_bytes, sha256: dto.sha256, uploadedBy: userId, capturedAt: dto.captured_at ? new Date(dto.captured_at) : undefined });
    const up = await this.storage.presignUpload({ bucket, objectKey, mimeType: dto.mime_type, sizeBytes: dto.size_bytes });
    return { media_id: id, bucket, object_key: objectKey, upload: { url: up.uploadUrl, method: up.method, headers: up.headers, expires_at: up.expiresAt.toISOString() } };
  }
}
