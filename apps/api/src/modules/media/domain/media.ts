import type { MediaKind } from '@sinaaty/shared-types';
export type MediaPurpose = 'kyb_document' | 'org_logo' | 'inspection' | 'work_order' | 'part_bid' | 'dispute' | 'proof_of_delivery' | 'voice_note' | 'other';
export const MAX_UPLOAD_BYTES: Record<MediaKind, number> = { image: 15 * 1024 * 1024, video: 200 * 1024 * 1024, audio: 30 * 1024 * 1024, pdf: 25 * 1024 * 1024, xml: 2 * 1024 * 1024, other: 25 * 1024 * 1024 };
export const ALLOWED_MIME: Record<MediaKind, RegExp> = { image: /^image\/(jpeg|png|webp|heic|heif)$/, video: /^video\/(mp4|quicktime|webm)$/, audio: /^audio\/(mp4|mpeg|aac|wav|webm|ogg)$/, pdf: /^application\/pdf$/, xml: /^(application|text)\/xml$/, other: /^[\w.-]+\/[\w.+-]+$/ };
export function bucketFor(purpose: MediaPurpose): 'media' | 'docs' { return purpose === 'kyb_document' ? 'docs' : 'media'; }

export interface MediaAssetRow { id: string; kind: MediaKind; bucket: string; objectKey: string; mimeType: string; uploadedBy: string | null }
/** One link row: what this file is attached to. The link is what grants read access, not the file itself. */
export interface MediaLinkRow { entityType: string; entityId: string }

export interface MediaRepository {
  create(input: { id: string; kind: MediaKind; bucket: string; objectKey: string; mimeType: string; sizeBytes: number; sha256: string; uploadedBy: string; capturedAt?: Date }): Promise<void>;
  findById(id: string): Promise<MediaAssetRow | null>;
  linksOf(mediaId: string): Promise<MediaLinkRow[]>;
  /** Resolves a link to the work order it ultimately belongs to (item → its order, inspection → its order). */
  workOrderIdOf(link: MediaLinkRow): Promise<string | null>;
}
export const MEDIA_REPOSITORY = Symbol('MEDIA_REPOSITORY');
