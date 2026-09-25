import { ERROR_CODES, type ErrorCode } from './error-codes';

/**
 * Domain/application-level error. Framework-agnostic (no Nest import) so it can be thrown
 * from domain/ and application/ layers; the HTTP filter maps it to the bilingual envelope.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly messageAr: string;
  readonly messageEn: string;
  readonly details?: unknown;

  constructor(code: ErrorCode, options: { details?: unknown; messageAr?: string; messageEn?: string; cause?: unknown } = {}) {
    const def = ERROR_CODES[code];
    super(options.messageEn ?? def.en, { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = def.status;
    this.messageAr = options.messageAr ?? def.ar;
    this.messageEn = options.messageEn ?? def.en;
    this.details = options.details;
  }
}
