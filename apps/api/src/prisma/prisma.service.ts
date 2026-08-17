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
    super({ log: process.env['NODE_ENV'] === 'test' ? [] : ['warn', 'error'] });
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
