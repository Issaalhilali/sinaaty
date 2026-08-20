import type { ExtractedItem } from '../../domain/extraction';

/**
 * Turns a transcript into proposed work-order lines. A model may be better at Arabic than our rules, but
 * it is never trusted with money: whatever comes back is re-checked against the words that were actually
 * said, and a human approves every line before it reaches the work order.
 */
export interface ItemExtractionPort {
  readonly provider: string;
  extract(input: { transcriptAr: string; vehicleAr?: string | null }): Promise<ExtractedItem[]>;
}
export const ITEM_EXTRACTION_PORT = Symbol('ITEM_EXTRACTION_PORT');
