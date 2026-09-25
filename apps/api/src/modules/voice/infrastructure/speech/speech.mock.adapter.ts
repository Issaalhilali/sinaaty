import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { SpeechToTextPort, Transcript } from '../../application/ports/speech.port';

/**
 * Deterministic stand-in for a speech provider: the same object key always yields the same transcript, so
 * demos and tests are reproducible without audio. A caller may also pass `hintAr` — the app sends what the
 * advisor typed as a hint — and the mock echoes it, which is what makes the e2e flow meaningful.
 */
const SAMPLES = [
  'تغيير زيت وفلتر بمئتين وستين، وبعدين فحص فرامل بمئة',
  'سمكرة ودهان رفرف أمامي أيمن بستمئة، وتركيب دسكات أمامية بأربعمئة وخمسين',
  'غسيل وتلميع بمئة وخمسين، كشف كهرباء بثمانين',
];

@Injectable()
export class SpeechMockAdapter implements SpeechToTextPort {
  readonly provider = 'mock';
  transcribe(input: { bucket: string; objectKey: string; mimeType: string; hintAr?: string }): Promise<Transcript> {
    if (input.hintAr?.trim()) return Promise.resolve({ textAr: input.hintAr.trim(), confidence: 0.99, durationSeconds: null, provider: this.provider });
    const b = createHash('sha256').update(input.objectKey).digest();
    return Promise.resolve({ textAr: SAMPLES[b[0]! % SAMPLES.length]!, confidence: 0.9, durationSeconds: 8 + (b[1]! % 20), provider: this.provider });
  }
}
