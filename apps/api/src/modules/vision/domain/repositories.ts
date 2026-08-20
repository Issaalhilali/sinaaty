import type { InspectionType } from '@sinaaty/shared-types';
import type { TxHandle } from '../../../common/ports/unit-of-work.port';

export interface InspectionRow {
  id: string;
  workOrderId: string | null;
  vehicleId: string;
  orgId: string | null;
  type: InspectionType;
  damages: unknown;
  performedAt: Date;
  mediaIds: string[];
}

export interface InspectionRepository {
  findById(id: string): Promise<InspectionRow | null>;
  listByWorkOrder(workOrderId: string): Promise<InspectionRow[]>;
  /** Where the photos actually sit — the vision provider needs bucket/key, not media ids. */
  photosOf(inspectionId: string): Promise<Array<{ mediaId: string; bucket: string; objectKey: string; mimeType: string }>>;
  setDamages(id: string, damages: unknown, aiSummary: unknown, tx?: TxHandle): Promise<void>;
}
export const INSPECTION_REPOSITORY = Symbol('INSPECTION_REPOSITORY');
