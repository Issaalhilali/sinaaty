import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerException } from '@nestjs/throttler';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { Logger } from 'nestjs-pino';
import { AppError, ERROR_CODES, type ErrorCode } from '../errors';
import type { ErrorEnvelope } from './error-envelope';

/**
 * Maps every exception to the bilingual envelope {code, message_ar, message_en, details, request_id}.
 * Never leaks stack traces or internal messages for 5xx.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string }>();
    const { status, body } = this.toEnvelope(exception);
    body.request_id = req.id;

    if (status >= 500) {
      this.logger.error({ err: exception, request_id: req.id, path: req.url }, 'unhandled exception');
    } else {
      this.logger.debug({ code: body.code, status, request_id: req.id, path: req.url }, 'request failed');
    }
    res.status(status).json(body);
  }

  private toEnvelope(exception: unknown): { status: number; body: ErrorEnvelope } {
    if (exception instanceof AppError) {
      return {
        status: exception.status,
        body: { code: exception.code, message_ar: exception.messageAr, message_en: exception.messageEn, details: exception.details },
      };
    }
    if (exception instanceof ZodError) {
      const def = ERROR_CODES.VALIDATION;
      return {
        status: def.status,
        body: {
          code: 'VALIDATION',
          message_ar: def.ar,
          message_en: def.en,
          details: exception.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 unique violation → CONFLICT; P2025 record not found → NOT_FOUND; P2003 FK → VALIDATION
      const map: Record<string, ErrorCode> = { P2002: 'CONFLICT', P2025: 'NOT_FOUND', P2003: 'VALIDATION' };
      const code = map[exception.code];
      if (code) {
        const env = this.fromCode(code);
        const target = (exception.meta as { target?: unknown; field_name?: unknown } | undefined)?.target ?? (exception.meta as { field_name?: unknown } | undefined)?.field_name;
        return { status: env.status, body: { ...env.body, details: target ? { fields: target } : undefined } };
      }
    }
    if (exception instanceof ThrottlerException) {
      return this.fromCode('RATE_LIMITED');
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = this.codeForStatus(status);
      const resp = exception.getResponse();
      const details = typeof resp === 'object' ? (resp as Record<string, unknown>)['message'] : resp;
      const env = this.fromCode(code);
      return { status, body: { ...env.body, details: status < 500 ? details : undefined } };
    }
    return this.fromCode('INTERNAL');
  }

  private fromCode(code: ErrorCode): { status: number; body: ErrorEnvelope } {
    const def = ERROR_CODES[code];
    return { status: def.status, body: { code, message_ar: def.ar, message_en: def.en } };
  }

  private codeForStatus(status: number): ErrorCode {
    const map: Record<number, ErrorCode> = {
      400: 'VALIDATION',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      429: 'RATE_LIMITED',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? (status >= 500 ? 'INTERNAL' : 'VALIDATION');
  }
}
