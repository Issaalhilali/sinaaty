import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../config';
import { decrypt, encrypt, lookupHash, parseKey } from './aes-gcm';

/** Injectable wrapper bound to PII_ENC_KEY. Use in infrastructure/ mappers only. */
@Injectable()
export class PiiCryptoService {
  private readonly key: Buffer;
  constructor(config: AppConfig) {
    this.key = parseKey(config.get('PII_ENC_KEY'));
  }
  encrypt(plaintext: string, aad?: string): Buffer {
    return encrypt(plaintext, this.key, aad);
  }
  decrypt(payload: Buffer | Uint8Array, aad?: string): string {
    return decrypt(Buffer.from(payload), this.key, aad);
  }
  hash(value: string): string {
    return lookupHash(value, this.key);
  }
  /** IBAN last 4 for display without decrypting later. */
  static last4(value: string): string {
    return value.replace(/\s+/g, '').slice(-4);
  }
}
