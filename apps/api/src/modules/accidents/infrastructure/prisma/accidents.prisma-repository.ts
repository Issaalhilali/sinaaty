import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AccidentReportStatus } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { AccidentReport, Damage } from '../../domain/accident-report';
import type { AccidentReportRepository, AccidentReportUpsert } from '../../domain/repositories';

const d = (v: Prisma.Decimal | null) => (v == null ? null : v.toFixed(2));
const D = (v: string | null) => (v == null ? null : new Prisma.Decimal(v));
type Row = Prisma.AccidentReportGetPayload<Record<string, never>>;

const toEntity = (r: Row): AccidentReport => ({
  id: r.id, provider: r.provider, externalRef: r.externalRef, vehicleId: r.vehicleId, workOrderId: r.workOrderId, orgId: r.orgId,
  status: r.status, accidentAt: r.accidentAt, locationAr: r.locationAr, plateSnapshot: r.plateSnapshot, vinSnapshot: r.vinSnapshot,
  faultPercent: d(r.faultPercent), insurerNameAr: r.insurerNameAr, policyNo: r.policyNo, claimNo: r.claimNo,
  deductibleAmount: d(r.deductibleAmount), approvedAmount: d(r.approvedAmount), damages: (r.damages ?? []) as unknown as Damage[],
  repairSubmissionRef: r.repairSubmissionRef, repairSubmittedAt: r.repairSubmittedAt, createdAt: r.createdAt, updatedAt: r.updatedAt,
});

@Injectable()
export class AccidentsPrismaRepository implements AccidentReportRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  async upsert(r: AccidentReportUpsert, tx?: TxHandle): Promise<AccidentReport> {
    const common = {
      vehicleId: r.vehicleId, orgId: r.orgId, status: r.status, accidentAt: r.accidentAt, locationAr: r.locationAr,
      plateSnapshot: r.plateSnapshot, vinSnapshot: r.vinSnapshot, faultPercent: D(r.faultPercent), insurerNameAr: r.insurerNameAr,
      policyNo: r.policyNo, claimNo: r.claimNo, deductibleAmount: D(r.deductibleAmount), approvedAmount: D(r.approvedAmount),
      damages: r.damages as unknown as Prisma.InputJsonValue, raw: (r.raw ?? {}) as Prisma.InputJsonValue,
    };
    const row = await this.db(tx).accidentReport.upsert({
      where: { provider_externalRef: { provider: r.provider, externalRef: r.externalRef } },
      // A re-link keeps the original creator and only moves the work-order link when a new one is given.
      update: { ...common, ...(r.workOrderId ? { workOrderId: r.workOrderId } : {}) },
      create: { provider: r.provider, externalRef: r.externalRef, workOrderId: r.workOrderId, createdBy: r.createdBy, ...common },
    });
    return toEntity(row);
  }

  async findById(id: string, tx?: TxHandle) { const r = await this.db(tx).accidentReport.findUnique({ where: { id } }); return r ? toEntity(r) : null; }
  async findByRef(provider: string, externalRef: string, tx?: TxHandle) { const r = await this.db(tx).accidentReport.findUnique({ where: { provider_externalRef: { provider, externalRef } } }); return r ? toEntity(r) : null; }
  async findByWorkOrder(workOrderId: string) { const r = await this.prisma.accidentReport.findFirst({ where: { workOrderId }, orderBy: { createdAt: 'desc' } }); return r ? toEntity(r) : null; }
  async list(q: { orgId?: string; vehicleId?: string; status?: AccidentReportStatus[]; limit: number }) {
    const rows = await this.prisma.accidentReport.findMany({
      where: { ...(q.orgId ? { orgId: q.orgId } : {}), ...(q.vehicleId ? { vehicleId: q.vehicleId } : {}), ...(q.status?.length ? { status: { in: q.status } } : {}) },
      orderBy: { createdAt: 'desc' }, take: q.limit,
    });
    return rows.map(toEntity);
  }
  async update(id: string, patch: Parameters<AccidentReportRepository['update']>[1], tx?: TxHandle) {
    await this.db(tx).accidentReport.update({
      where: { id },
      data: {
        ...(patch.status ? { status: patch.status } : {}),
        ...('approvedAmount' in patch ? { approvedAmount: D(patch.approvedAmount ?? null) } : {}),
        ...('deductibleAmount' in patch ? { deductibleAmount: D(patch.deductibleAmount ?? null) } : {}),
        ...('faultPercent' in patch ? { faultPercent: D(patch.faultPercent ?? null) } : {}),
        ...(patch.damages ? { damages: patch.damages as unknown as Prisma.InputJsonValue } : {}),
        ...('workOrderId' in patch ? { workOrderId: patch.workOrderId ?? null } : {}),
        ...(patch.repairSubmissionRef ? { repairSubmissionRef: patch.repairSubmissionRef } : {}),
        ...(patch.repairSubmittedAt ? { repairSubmittedAt: patch.repairSubmittedAt } : {}),
        ...(patch.raw ? { raw: patch.raw } : {}),
      },
    });
  }
}
