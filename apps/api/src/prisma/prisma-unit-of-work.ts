import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { TxHandle, UnitOfWork } from '../common/ports/unit-of-work.port';
import { PrismaService } from './prisma.service';

/** Unwrap an opaque TxHandle into the Prisma transaction client (infrastructure only). */
export const asTx = (tx: TxHandle | Prisma.TransactionClient): Prisma.TransactionClient => tx as unknown as Prisma.TransactionClient;

@Injectable()
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}
  run<T>(fn: (tx: TxHandle) => Promise<T>): Promise<T> {
    return this.prisma.$transaction((tx) => fn(tx as unknown as TxHandle));
  }
}
