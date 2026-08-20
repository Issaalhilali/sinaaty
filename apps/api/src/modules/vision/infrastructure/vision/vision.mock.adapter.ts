import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ZONES, zoneAr, type Damage } from '../../domain/damages';
import type { VisionPort, VisionResult } from '../../application/ports/vision.port';

/**
 * Deterministic stand-in for a vision provider: the same photo id always yields the same finding, so a
 * check-in and a check-out of the *same* photos diff to nothing, and a new photo can introduce a new
 * finding — which is exactly the behaviour the diff feature needs to be demonstrable without real images.
 */
@Injectable()
export class VisionMockAdapter implements VisionPort {
  readonly provider = 'mock';

  analyze(input: { photos: Array<{ mediaId: string }>; vehicleAr?: string | null }): Promise<VisionResult> {
    const damages: Damage[] = [];
    const unusable: string[] = [];
    for (const p of input.photos) {
      const b = createHash('sha256').update(p.mediaId).digest();
      if (b[0]! % 7 === 0) { unusable.push(p.mediaId); continue; }     // ~1 in 7 photos is unusable
      if (b[1]! % 3 !== 0) continue;                                    // most photos show nothing
      const zone = ZONES[b[2]! % ZONES.length]!;
      if (damages.some((d) => d.zone === zone)) continue;
      damages.push({
        zone,
        severity: (['minor', 'moderate', 'severe'] as const)[b[3]! % 3]!,
        noteAr: `أثر ظاهر على ${zoneAr(zone)}`,
        mediaIds: [p.mediaId],
        source: 'ai',
        aiConfidence: 0.6 + (b[4]! % 40) / 100,
      });
    }
    const summaryAr = damages.length ? `رصد النظام ${damages.length} موضعاً محتملاً: ${damages.map((d) => zoneAr(d.zone)).join('، ')}.` : 'لم يرصد النظام أضراراً واضحة في الصور.';
    return Promise.resolve({ damages, summaryAr, provider: this.provider, unusableMediaIds: unusable });
  }
}
