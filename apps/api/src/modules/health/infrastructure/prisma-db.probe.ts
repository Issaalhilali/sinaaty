import { Injectable } from '@nestjs/common';
import type { DependencyProbe } from '../application/health-check.port';
import type { DependencyStatus } from '../domain/health-report';
import { PrismaService } from '../../../prisma';

@Injectable()
export class PrismaDbProbe implements DependencyProbe {
  readonly name = 'postgres';
  constructor(private readonly prisma: PrismaService) {}
  async probe(): Promise<DependencyStatus> {
    return (await this.prisma.ping()) ? 'up' : 'down';
  }
}
