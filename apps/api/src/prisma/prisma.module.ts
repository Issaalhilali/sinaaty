import { Global, Module } from '@nestjs/common';
import { UNIT_OF_WORK } from '../common/ports/unit-of-work.port';
import { PrismaService } from './prisma.service';
import { PrismaUnitOfWork } from './prisma-unit-of-work';

@Global()
@Module({ providers: [PrismaService, { provide: UNIT_OF_WORK, useClass: PrismaUnitOfWork }], exports: [PrismaService, UNIT_OF_WORK] })
export class PrismaModule {}
