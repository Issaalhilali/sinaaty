export interface HasherPort {
  sha256(value: string): string;
  randomDigits(length: number): string;
  /** PII lookup hash + encryption for national ids (delegates to PiiCryptoService). */
  nationalIdHash(nationalId: string): string;
  encryptNationalId(nationalId: string): Buffer;
}
export const HASHER_PORT = Symbol('HASHER_PORT');
