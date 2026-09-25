import type { Damage } from '../../domain/damages';

export interface VisionResult {
  damages: Damage[];
  summaryAr: string;
  provider: string;
  /** Photos the provider could not use (too dark, wrong angle) — the inspector is told, not left guessing. */
  unusableMediaIds: string[];
}

/**
 * Vision over inspection photos. The port returns *suggestions*: the inspector's record is authoritative,
 * and `mergeDamages` never lets a model overwrite a person's judgement (CLAUDE.md §5.3).
 */
export interface VisionPort {
  readonly provider: string;
  analyze(input: { photos: Array<{ mediaId: string; bucket: string; objectKey: string; mimeType: string }>; vehicleAr?: string | null; angleHints?: Record<string, string> }): Promise<VisionResult>;
}
export const VISION_PORT = Symbol('VISION_PORT');
