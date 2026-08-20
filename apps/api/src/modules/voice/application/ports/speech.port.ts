/**
 * Speech to text for Saudi Arabic. The provider is not chosen yet (docs/integrations/speech.md); the
 * domain only ever sees a transcript and a confidence.
 */
export interface Transcript {
  textAr: string;
  confidence: number;
  durationSeconds: number | null;
  provider: string;
}
export interface SpeechToTextPort {
  readonly provider: string;
  transcribe(input: { bucket: string; objectKey: string; mimeType: string; hintAr?: string }): Promise<Transcript>;
}
export const SPEECH_PORT = Symbol('SPEECH_PORT');
