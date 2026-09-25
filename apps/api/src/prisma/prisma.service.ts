import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'nestjs-pino';

/**
 * Single PrismaClient for the process. Connection is lazy and failures are non-fatal at boot
 * so the API can start (and report readiness) even when the DB is not up yet.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly logger: Logger) {
    // المعاملة التفاعلية بمهلة Prisma الافتراضية (٥ ثوانٍ) تنفجر على قاعدةٍ بعيدة (Supabase سيول ~٢٠٠ms
    // لكل رحلة، وإنشاء أمر العمل عشرات الاستعلامات في معاملة واحدة → «Transaction already closed» و500 عامة).
    // المهلة تُقرأ من البيئة كي تبقى قصيرة في الاختبار وطويلة عند البعد؛ الافتراضي ٣٠ ثانية.
    super({ log: process.env['NODE_ENV'] === 'test' ? [] : ['warn', 'error'], transactionOptions: { timeout: Number(process.env['PRISMA_TX_TIMEOUT_MS'] ?? 30_000), maxWait: Number(process.env['PRISMA_TX_MAX_WAIT_MS'] ?? 10_000) } });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (err) {
      this.logger.warn({ err }, 'database not reachable at boot — readiness will report db=down');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Cheap liveness probe with a hard timeout; never throws. */
  async ping(timeoutMs = 1500): Promise<boolean> {
    try {
      await Promise.race([
        this.$queryRawUnsafe('SELECT 1'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('db ping timeout')), timeoutMs)),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}
