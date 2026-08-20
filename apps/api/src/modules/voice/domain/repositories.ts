import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { ExtractedItem } from './extraction';

export interface VoiceNote {
  id: string;
  workOrderId: string | null;
  mediaId: string;
  recordedBy: string;
  transcriptAr: string | null;
  extractedItems: ExtractedItem[] | null;
  status: 'pending' | 'transcribed' | 'applied' | 'discarded';
  createdAt: Date;
}

export interface VoiceRepository {
  create(n: { workOrderId: string; mediaId: string; recordedBy: string }, tx?: TxHandle): Promise<VoiceNote>;
  findById(id: string): Promise<VoiceNote | null>;
  listByWorkOrder(workOrderId: string): Promise<VoiceNote[]>;
  update(id: string, p: Partial<{ transcriptAr: string; extractedItems: ExtractedItem[]; status: VoiceNote['status'] }>, tx?: TxHandle): Promise<void>;
  /** Where the audio actually sits — the speech provider needs the bucket and key, not the media id. */
  media(mediaId: string): Promise<{ bucket: string; objectKey: string; mimeType: string } | null>;
}
export const VOICE_REPOSITORY = Symbol('VOICE_REPOSITORY');
