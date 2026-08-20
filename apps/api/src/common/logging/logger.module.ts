import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { AppConfig } from '../../config';

/** Redacted, structured pino logs. PII never reaches logs (CLAUDE.md §5.4). */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-nafath-secret"]',
  'req.headers["x-psp-signature"]',
  'req.body.password',
  'req.body.otp',
  'req.body.code',
  'req.body.phone',
  'req.body.national_id',
  'req.body.iban',
  'res.headers["set-cookie"]',
];

/**
 * Secret-bearing path segments. A share/approval token in `req.url` turns any log line into a working
 * link to someone's work order or Car Passport, so the token is masked before pino ever sees the url
 * (CLAUDE.md §5.4: no PII or secrets in logs *or* URLs).
 */
const TOKEN_URL = /\/(approve|passport|verify|warranty-check|mock-upload)\/[^/?#]+/g;
export const maskUrl = (url: string) => url.replace(TOKEN_URL, (_m, seg: string) => `/${seg}/[token]`);

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
          serializers: {
            req(req: IncomingMessage & { url?: string; raw?: { url?: string } }) {
              const url = maskUrl(req.url ?? '');
              return { id: (req as { id?: string }).id, method: (req as { method?: string }).method, url, headers: (req as { headers?: unknown }).headers };
            },
          },
          genReqId: (req: IncomingMessage) => (req as IncomingMessage & { id?: string }).id ?? '',
          customProps: () => ({ service: 'api' }),
          autoLogging: { ignore: (req: IncomingMessage) => req.url === '/health' || req.url === '/health/live' },
          transport:
            config.get('NODE_ENV') === 'development'
              ? { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:HH:MM:ss' } }
              : undefined,
        },
      }),
    }),
  ],
})
export class LoggerModule {}
