import { Injectable } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { PiiCryptoService } from '../../../common/crypto';
import type { HasherPort } from '../application/ports/hasher.port';

@Injectable()
export class HasherAdapter implements HasherPort {
  constructor(private readonly pii: PiiCryptoService) {}
  sha256(v: string) { return createHash('sha256').update(v).digest('hex'); }
  randomDigits(n: number) { let s = ''; for (let i = 0; i < n; i++) s += randomInt(0, 10); return s; }
  nationalIdHash(id: string) { return this.pii.hash(id); }
  encryptNationalId(id: string) { return this.pii.encrypt(id, 'national_id'); }
}
