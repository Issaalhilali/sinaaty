import type { InspectionType, PaymentTerms, PartCondition, SignatureMethod, WoItemType, WorkOrderSource, WorkOrderStatus } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';
import type { Snapshot } from './snapshot';
import type { WorkOrder, WorkOrderItem } from './work-order';

export interface WorkOrderRepository {
  nextNumber(tx?: TxHandle): Promise<string>;
  create(input: { number: string; orgId: string; locationId?: string; vehicleId: string; customerUserId?: string; customerOrgId?: string; paymentTerms: PaymentTerms; titleAr?: string; complaintAr?: string; depositRequired?: string; dueDate?: Date; promisedReadyAt?: Date; createdBy: string }, tx?: TxHandle): Promise<WorkOrder>;
  findById(id: string, tx?: TxHandle): Promise<WorkOrder | null>;
  list(q: { orgId?: string; customerUserId?: string; customerOrgId?: string; status?: WorkOrderStatus[]; limit: number }): Promise<WorkOrder[]>;
  update(id: string, patch: Partial<{ source: WorkOrderSource; accidentReportRef: string; titleAr: string; complaintAr: string; diagnosisAr: string; paymentTerms: PaymentTerms; depositRequired: string; dueDate: Date | null; promisedReadyAt: Date | null; assignedTechnicianId: string | null; status: WorkOrderStatus; currentVersion: number; approvedAt: Date; receivedAt: Date; readyAt: Date; deliveredAt: Date; closedAt: Date; cancelledAt: Date; cancelReason: string; abandonedNoticeAt: Date }>, tx?: TxHandle): Promise<void>;
  setTotals(id: string, t: { subtotal: string; discount: string; vatAmount: string; total: string }, tx?: TxHandle): Promise<void>;
  // items
  addItem(woId: string, version: number, i: { type: WoItemType; descriptionAr: string; descriptionEn?: string; partCondition?: PartCondition; partNumber?: string; quantity: string; unitPrice: string; discount: string; vatRate: string; lineTotal: string; warrantyDays?: number; sortOrder?: number }, tx?: TxHandle): Promise<WorkOrderItem>;
  updateItem(itemId: string, patch: Partial<{ descriptionAr: string; descriptionEn: string; quantity: string; unitPrice: string; discount: string; lineTotal: string; warrantyDays: number; isCompleted: boolean; completedAt: Date | null }>, tx?: TxHandle): Promise<void>;
  removeItem(itemId: string, versionRemoved: number, tx?: TxHandle): Promise<void>;
  // versions & signatures
  addVersion(v: { woId: string; version: number; reasonAr?: string; snapshot: Snapshot; sha256: string; createdBy: string }, tx?: TxHandle): Promise<{ id: string }>;
  getVersion(woId: string, version: number): Promise<{ id: string; version: number; snapshot: Snapshot; sha256: string; pdfMediaId: string | null; createdAt: Date } | null>;
  listVersions(woId: string): Promise<Array<{ id: string; version: number; sha256: string; reasonAr: string | null; createdAt: Date; signed: boolean }>>;
  addSignature(s: { woId: string; versionId: string; signerUserId: string; signerRole: string; purpose: string; method: SignatureMethod; providerTxRef?: string; providerPayload?: unknown; signedHash: string; ipAddress?: string | null; deviceId?: string | null }, tx?: TxHandle): Promise<{ id: string }>;
  hasSignature(versionId: string, purpose: string): Promise<boolean>;
  // history / inspections / media
  addHistory(h: { woId: string; from: WorkOrderStatus | null; to: WorkOrderStatus; actorUserId: string | null; noteAr?: string }, tx?: TxHandle): Promise<void>;
  listHistory(woId: string): Promise<Array<{ from: WorkOrderStatus | null; to: WorkOrderStatus; actorUserId: string | null; noteAr: string | null; createdAt: Date }>>;
  addInspection(i: { woId: string; vehicleId: string; orgId: string; type: InspectionType; odometerKm?: number; fuelLevelPct?: number; checklist: unknown; damages: unknown; inspectorUserId: string; mediaIds: string[] }, tx?: TxHandle): Promise<{ id: string }>;
  listInspections(woId: string): Promise<Array<{ id: string; type: InspectionType; odometerKm: number | null; fuelLevelPct: number | null; checklist: unknown; damages: unknown; performedAt: Date; mediaIds: string[] }>>;
  linkMedia(entityType: 'work_order' | 'work_order_item' | 'inspection', entityId: string, mediaIds: string[], label?: string, tx?: TxHandle): Promise<void>;
  listMedia(woId: string): Promise<Array<{ mediaId: string; entityType: string; entityId: string; label: string | null; mimeType: string; bucket: string; objectKey: string }>>;
}
export const WORK_ORDER_REPOSITORY = Symbol('WORK_ORDER_REPOSITORY');
