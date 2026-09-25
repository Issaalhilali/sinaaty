import type { PartCondition, PaymentTerms, WoItemType, WorkOrderSource, WorkOrderStatus } from '@sinaaty/shared-types';
export interface WorkOrderItem { id: string; versionAdded: number; versionRemoved: number | null; type: WoItemType; descriptionAr: string; descriptionEn: string | null; partCondition: PartCondition | null; partNumber: string | null; quantity: string; unitPrice: string; discount: string; vatRate: string; lineTotal: string; warrantyDays: number; isCompleted: boolean; sortOrder: number }
export interface WorkOrder {
  id: string; number: string; orgId: string; locationId: string | null; vehicleId: string; customerUserId: string | null; customerOrgId: string | null;
  /** «تويوتا كامري 2019» و«أ ب ج 1234» — the workshop reads its yard by car, not by order number. */
  vehicleLabelAr: string | null; vehiclePlateAr: string | null;
  /** «ورشة النور للسمكرة والميكانيكا» — من يوقّع على مبلغ يجب أن يرى مع من يتعامل، في كل شاشة لا في شاشة التوقيع وحدها. */
  orgNameAr: string | null;
  source: WorkOrderSource; status: WorkOrderStatus; paymentTerms: PaymentTerms; currentVersion: number; titleAr: string | null; complaintAr: string | null; diagnosisAr: string | null;
  subtotal: string; discount: string; vatAmount: string; total: string; depositRequired: string; dueDate: Date | null; promisedReadyAt: Date | null;
  receivedAt: Date | null; approvedAt: Date | null; readyAt: Date | null; deliveredAt: Date | null; closedAt: Date | null; cancelledAt: Date | null; cancelReason: string | null;
  storageFeePerDay: string;
  abandonedNoticeAt: Date | null;
  assignedTechnicianId: string | null; contractTermsVersion: string; createdBy: string | null; createdAt: Date; updatedAt: Date;
  items: WorkOrderItem[];
}
export const activeItems = (wo: WorkOrder) => wo.items.filter((i) => i.versionRemoved === null);
export interface WoAccessUser { id: string; orgs: Array<{ orgId: string; role: string }>; platformRole: string }
export const isCustomer = (wo: Pick<WorkOrder, 'customerUserId' | 'customerOrgId'>, u: WoAccessUser) => (wo.customerUserId != null && wo.customerUserId === u.id) || (wo.customerOrgId != null && u.orgs.some((o) => o.orgId === wo.customerOrgId));
export const isWorkshopMember = (wo: Pick<WorkOrder, 'orgId'>, u: WoAccessUser, roles?: string[]) => u.orgs.some((o) => o.orgId === wo.orgId && (!roles || roles.includes(o.role)));
export const isStaff = (u: WoAccessUser) => u.platformRole !== 'none';
export const WORKSHOP_WRITE_ROLES = ['owner', 'manager', 'technician'];
