export interface PresignedUpload { uploadUrl: string; method: 'PUT'; headers: Record<string, string>; expiresAt: Date }
export interface ObjectStoragePort {
  presignUpload(input: { bucket: string; objectKey: string; mimeType: string; sizeBytes: number }): Promise<PresignedUpload>;
  presignDownload(input: { bucket: string; objectKey: string; ttlSeconds?: number }): Promise<string>;
}
export const OBJECT_STORAGE_PORT = Symbol('OBJECT_STORAGE_PORT');
