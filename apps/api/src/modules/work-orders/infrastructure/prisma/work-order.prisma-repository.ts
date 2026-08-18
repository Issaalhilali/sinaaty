import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { WorkOrderStatus } from '@sinaaty/shared-types';
import { asTx, PrismaService } from '../../../../prisma';
import type { TxHandle } from '../../../../common/ports/unit-of-work.port';
import type { Snapshot } from '../../domain/snapshot';
import type { WorkOrder, WorkOrderItem } from '../../domain/work-order';
import type { WorkOrderRepository } from '../../domain/repositories';

const d = (v: Prisma.Decimal | null | undefined) => (v == null ? '0.00' : v.toFixed(2));
const q = (v: Prisma.Decimal) => v.toString();
const woInclude = { workOrderItems: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } satisfies Prisma.WorkOrderInclude;
type Row = Prisma.WorkOrderGetPayload<{ include: typeof woInclude }>;
const toItem = (i: Row['workOrderItems'][number]): WorkOrderItem => ({ id: i.id, versionAdded: i.versionAdded, versionRemoved: i.versionRemoved, type: i.type, descriptionAr: i.descriptionAr, descriptionEn: i.descriptionEn, partCondition: i.partCondition, partNumber: i.partNumber, quantity: q(i.quantity), unitPrice: d(i.unitPrice), discount: d(i.discount), vatRate: i.vatRate.toFixed(2), lineTotal: d(i.lineTotal), warrantyDays: i.warrantyDays, isCompleted: i.isCompleted, sortOrder: i.sortOrder });
const toWo = (r: Row): WorkOrder => ({ id: r.id, number: r.number, orgId: r.orgId, locationId: r.locationId, vehicleId: r.vehicleId, customerUserId: r.customerUserId, customerOrgId: r.customerOrgId, source: r.source, status: r.status, paymentTerms: r.paymentTerms, currentVersion: r.currentVersion, titleAr: r.titleAr, complaintAr: r.complaintAr, diagnosisAr: r.diagnosisAr, subtotal: d(r.subtotal), discount: d(r.discount), vatAmount: d(r.vatAmount), total: d(r.total), depositRequired: d(r.depositRequired), dueDate: r.dueDate, promisedReadyAt: r.promisedReadyAt, receivedAt: r.receivedAt, approvedAt: r.approvedAt, readyAt: r.readyAt, deliveredAt: r.deliveredAt, closedAt: r.closedAt, cancelledAt: r.cancelledAt, cancelReason: r.cancelReason, assignedTechnicianId: r.assignedTechnicianId, contractTermsVersion: r.contractTermsVersion, createdBy: r.createdBy, createdAt: r.createdAt, updatedAt: r.updatedAt, items: r.workOrderItems.map(toItem) });

@Injectable()
export class WorkOrderPrismaRepository implements WorkOrderRepository {
  constructor(private readonly prisma: PrismaService) {}
  private db(tx?: TxHandle) { return tx ? asTx(tx) : this.prisma; }

  async nextNumber(tx?: TxHandle) { const r = await this.db(tx).$queryRaw<Array<{ n: string }>>`SELECT next_number('WO') AS n`; return r[0]!.n; }
  async create(i: Parameters<WorkOrderRepository['create']>[0], tx?: TxHandle) {
    const r = await this.db(tx).workOrder.create({ data: { number: i.number, orgId: i.orgId, locationId: i.locationId, vehicleId: i.vehicleId, customerUserId: i.customerUserId, customerOrgId: i.customerOrgId, paymentTerms: i.paymentTerms, titleAr: i.titleAr, complaintAr: i.complaintAr, depositRequired: i.depositRequired ? new Prisma.Decimal(i.depositRequired) : undefined, dueDate: i.dueDate, promisedReadyAt: i.promisedReadyAt, createdBy: i.createdBy }, include: woInclude });
    return toWo(r);
  }
  async findById(id: string, tx?: TxHandle) { const r = await this.db(tx).workOrder.findUnique({ where: { id }, include: woInclude }); return r ? toWo(r) : null; }
  async list(qy: { orgId?: string; customerUserId?: string; customerOrgId?: string; status?: WorkOrderStatus[]; limit: number }) {
    const rows = await this.prisma.workOrder.findMany({ where: { orgId: qy.orgId, customerUserId: qy.customerUserId, customerOrgId: qy.customerOrgId, status: qy.status ? { in: qy.status } : undefined }, orderBy: { createdAt: 'desc' }, take: qy.limit, include: woInclude });
    return rows.map(toWo);
  }
  async update(id: string, p: Parameters<WorkOrderRepository['update']>[1], tx?: TxHandle) {
    await this.db(tx).workOrder.update({ where: { id }, data: { titleAr: p.titleAr, complaintAr: p.complaintAr, diagnosisAr: p.diagnosisAr, paymentTerms: p.paymentTerms, depositRequired: p.depositRequired ? new Prisma.Decimal(p.depositRequired) : undefined, dueDate: p.dueDate, promisedReadyAt: p.promisedReadyAt, assignedTechnicianId: p.assignedTechnicianId, status: p.status, currentVersion: p.currentVersion, approvedAt: p.approvedAt, receivedAt: p.receivedAt, readyAt: p.readyAt, deliveredAt: p.deliveredAt, closedAt: p.closedAt, cancelledAt: p.cancelledAt, cancelReason: p.cancelReason, abandonedNoticeAt: p.abandonedNoticeAt } });
  }
  async setTotals(id: string, t: { subtotal: string; discount: string; vatAmount: string; total: string }, tx?: TxHandle) { await this.db(tx).workOrder.update({ where: { id }, data: { subtotal: new Prisma.Decimal(t.subtotal), discount: new Prisma.Decimal(t.discount), vatAmount: new Prisma.Decimal(t.vatAmount), total: new Prisma.Decimal(t.total) } }); }

  async addItem(woId: string, version: number, i: Parameters<WorkOrderRepository['addItem']>[2], tx?: TxHandle) {
    const r = await this.db(tx).workOrderItem.create({ data: { workOrderId: woId, versionAdded: version, type: i.type, descriptionAr: i.descriptionAr, descriptionEn: i.descriptionEn, partCondition: i.partCondition, partNumber: i.partNumber, quantity: new Prisma.Decimal(i.quantity), unitPrice: new Prisma.Decimal(i.unitPrice), discount: new Prisma.Decimal(i.discount), vatRate: new Prisma.Decimal(i.vatRate), lineTotal: new Prisma.Decimal(i.lineTotal), warrantyDays: i.warrantyDays ?? 0, sortOrder: i.sortOrder ?? 0 } });
    return toItem(r);
  }
  async updateItem(itemId: string, p: Parameters<WorkOrderRepository['updateItem']>[1], tx?: TxHandle) {
    await this.db(tx).workOrderItem.update({ where: { id: itemId }, data: { descriptionAr: p.descriptionAr, descriptionEn: p.descriptionEn, quantity: p.quantity ? new Prisma.Decimal(p.quantity) : undefined, unitPrice: p.unitPrice ? new Prisma.Decimal(p.unitPrice) : undefined, discount: p.discount ? new Prisma.Decimal(p.discount) : undefined, lineTotal: p.lineTotal ? new Prisma.Decimal(p.lineTotal) : undefined, warrantyDays: p.warrantyDays, isCompleted: p.isCompleted, completedAt: p.completedAt } });
  }
  async removeItem(itemId: string, versionRemoved: number, tx?: TxHandle) { await this.db(tx).workOrderItem.update({ where: { id: itemId }, data: { versionRemoved } }); }

  async addVersion(v: Parameters<WorkOrderRepository['addVersion']>[0], tx?: TxHandle) { const r = await this.db(tx).workOrderVersion.create({ data: { workOrderId: v.woId, version: v.version, reasonAr: v.reasonAr, snapshot: v.snapshot as unknown as Prisma.InputJsonValue, snapshotSha256: v.sha256, createdBy: v.createdBy }, select: { id: true } }); return r; }
  async getVersion(woId: string, version: number) { const r = await this.prisma.workOrderVersion.findUnique({ where: { workOrderId_version: { workOrderId: woId, version } } }); return r ? { id: r.id, version: r.version, snapshot: r.snapshot as unknown as Snapshot, sha256: r.snapshotSha256, pdfMediaId: r.pdfMediaId, createdAt: r.createdAt } : null; }
  async listVersions(woId: string) {
    const rows = await this.prisma.workOrderVersion.findMany({ where: { workOrderId: woId }, orderBy: { version: 'asc' }, select: { id: true, version: true, snapshotSha256: true, reasonAr: true, createdAt: true, _count: { select: { workOrderSignatures: true } } } });
    return rows.map((r) => ({ id: r.id, version: r.version, sha256: r.snapshotSha256, reasonAr: r.reasonAr, createdAt: r.createdAt, signed: r._count.workOrderSignatures > 0 }));
  }
  async addSignature(s: Parameters<WorkOrderRepository['addSignature']>[0], tx?: TxHandle) { const r = await this.db(tx).workOrderSignature.create({ data: { workOrderId: s.woId, versionId: s.versionId, signerUserId: s.signerUserId, signerRole: s.signerRole, purpose: s.purpose, method: s.method, providerTxRef: s.providerTxRef, providerPayload: (s.providerPayload ?? undefined), signedHash: s.signedHash, ipAddress: s.ipAddress ?? undefined, deviceId: s.deviceId ?? undefined }, select: { id: true } }); return r; }
  async hasSignature(versionId: string, purpose: string) { return (await this.prisma.workOrderSignature.count({ where: { versionId, purpose } })) > 0; }

  async addHistory(h: Parameters<WorkOrderRepository['addHistory']>[0], tx?: TxHandle) { await this.db(tx).workOrderStatusHistory.create({ data: { workOrderId: h.woId, fromStatus: h.from ?? undefined, toStatus: h.to, actorUserId: h.actorUserId ?? undefined, noteAr: h.noteAr } }); }
  async listHistory(woId: string) { const rows = await this.prisma.workOrderStatusHistory.findMany({ where: { workOrderId: woId }, orderBy: { createdAt: 'asc' } }); return rows.map((r) => ({ from: r.fromStatus, to: r.toStatus, actorUserId: r.actorUserId, noteAr: r.noteAr, createdAt: r.createdAt })); }
  async addInspection(i: Parameters<WorkOrderRepository['addInspection']>[0], tx?: TxHandle) {
    const db = this.db(tx);
    const r = await db.inspection.create({ data: { workOrderId: i.woId, vehicleId: i.vehicleId, orgId: i.orgId, type: i.type, odometerKm: i.odometerKm, fuelLevelPct: i.fuelLevelPct, checklist: i.checklist as Prisma.InputJsonValue, damages: i.damages as Prisma.InputJsonValue, inspectorUserId: i.inspectorUserId }, select: { id: true } });
    if (i.mediaIds.length) await db.mediaLink.createMany({ data: i.mediaIds.map((m, idx) => ({ mediaId: m, entityType: 'inspection', entityId: r.id, label: i.type === 'check_in' ? 'before' : 'after', sortOrder: idx })), skipDuplicates: true });
    return r;
  }
  async listInspections(woId: string) {
    const rows = await this.prisma.inspection.findMany({ where: { workOrderId: woId }, orderBy: { performedAt: 'asc' } });
    const links = await this.prisma.mediaLink.findMany({ where: { entityType: 'inspection', entityId: { in: rows.map((r) => r.id) } }, orderBy: { sortOrder: 'asc' } });
    return rows.map((r) => ({ id: r.id, type: r.type, odometerKm: r.odometerKm, fuelLevelPct: r.fuelLevelPct, checklist: r.checklist, damages: r.damages, performedAt: r.performedAt, mediaIds: links.filter((l) => l.entityId === r.id).map((l) => l.mediaId) }));
  }
  async linkMedia(entityType: 'work_order' | 'work_order_item' | 'inspection', entityId: string, mediaIds: string[], label?: string, tx?: TxHandle) { await this.db(tx).mediaLink.createMany({ data: mediaIds.map((m, idx) => ({ mediaId: m, entityType, entityId, label, sortOrder: idx })), skipDuplicates: true }); }
  async listMedia(woId: string) {
    const items = await this.prisma.workOrderItem.findMany({ where: { workOrderId: woId }, select: { id: true } });
    const insp = await this.prisma.inspection.findMany({ where: { workOrderId: woId }, select: { id: true } });
    const ids = [woId, ...items.map((i) => i.id), ...insp.map((i) => i.id)];
    const links = await this.prisma.mediaLink.findMany({ where: { entityId: { in: ids } }, include: { media: { select: { mimeType: true, bucket: true, objectKey: true } } }, orderBy: { sortOrder: 'asc' } });
    return links.map((l) => ({ mediaId: l.mediaId, entityType: l.entityType, entityId: l.entityId, label: l.label, mimeType: l.media.mimeType, bucket: l.media.bucket, objectKey: l.media.objectKey }));
  }
}
