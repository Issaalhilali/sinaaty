import { Global, Module } from '@nestjs/common';
import { PiiCryptoService } from './crypto/pii-crypto.service';
import { AuditLogWriter } from './audit/audit-log.writer';
import { LeaderLock } from './locks';
import { OutboxWriter } from './outbox/outbox.writer';

/** Shared kernel providers available to every module (Step 3). */
@Global()
@Module({ providers: [PiiCryptoService, AuditLogWriter, OutboxWriter, LeaderLock], exports: [PiiCryptoService, AuditLogWriter, OutboxWriter, LeaderLock] })
export class CommonModule {}
