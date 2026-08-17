import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { AppConfig } from '../../config';

/** Redacted, structured pino logs. PII never reaches logs (CLAUDE.md §5.4). */
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.otp',
  'req.body.national_id',
  'req.body.iban',
  'res.headers["set-cookie"]',
];

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL'),
          redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
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
