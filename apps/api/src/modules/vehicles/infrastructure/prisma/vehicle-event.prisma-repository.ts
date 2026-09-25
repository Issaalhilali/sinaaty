import { Injectable } from '@nestjs/common';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { VehicleEvent } from '../../domain/vehicle';
import type { VehicleEventRepository } from '../../domain/repositories';

@Injectable()
export class VehicleEventPrismaRepository implements VehicleEventRepository {
  constructor(private readonly prisma: PrismaService) {}
  async add(ev: Parameters<VehicleEventRepository['add']>[0], tx?: TxHandle) {
    const db = tx ? asTx(tx) : this.prisma;
    const r = await db.vehicleEvent.create({ data: { vehicleId: ev.vehicleId, type: ev.type, occurredAt: ev.occurredAt, odometerKm: ev.odometerKm ?? null, orgId: ev.orgId ?? null, refTable: ev.refTable ?? null, refId: ev.refId ?? null, summaryAr: ev.summaryAr, summaryEn: ev.summaryEn ?? null, data: (ev.data ?? {}), isPublic: ev.isPublic ?? true }, select: { id: true } });
    return r;
  }
  async list(vehicleId: string, opts?: { publicOnly?: boolean; limit?: number }): Promise<VehicleEvent[]> {
    const rows = await this.prisma.vehicleEvent.findMany({ where: { vehicleId, ...(opts?.publicOnly ? { isPublic: true } : {}) }, orderBy: { occurredAt: 'desc' }, take: opts?.limit ?? 200, include: { org: { select: { tradeNameAr: true, legalNameAr: true } } } });
    return rows.map((r) => ({ id: r.id, vehicleId: r.vehicleId, type: r.type, occurredAt: r.occurredAt, odometerKm: r.odometerKm, orgId: r.orgId, orgNameAr: r.org?.tradeNameAr ?? r.org?.legalNameAr ?? null, refTable: r.refTable, refId: r.refId, summaryAr: r.summaryAr, summaryEn: r.summaryEn, data: r.data, isPublic: r.isPublic }));
  }
}
