import type { WorkOrderStatus } from '@sinaaty/shared-types';

/** Architecture §5.1 — the ONLY legal transitions. `approve` is the sole path out of awaiting_approval. */
export const WO_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ['received', 'cancelled'],
  received: ['inspecting', 'awaiting_approval', 'cancelled'],
  inspecting: ['awaiting_approval', 'cancelled'],
  awaiting_approval: ['awaiting_parts', 'in_progress', 'cancelled'],
  awaiting_parts: ['in_progress', 'awaiting_approval', 'disputed', 'cancelled'],
  in_progress: ['awaiting_parts', 'quality_check', 'ready', 'awaiting_approval', 'disputed', 'cancelled'],
  quality_check: ['in_progress', 'ready', 'disputed'],
  ready: ['delivered', 'abandoned', 'disputed'],
  delivered: ['closed', 'disputed'],
  disputed: ['in_progress', 'ready', 'delivered', 'closed', 'cancelled'],
  closed: [], cancelled: [], abandoned: [],
};
export const canTransition = (from: WorkOrderStatus, to: WorkOrderStatus) => WO_TRANSITIONS[from].includes(to);
/** Statuses where the workshop may still edit items directly (before customer approval). */
export const EDITABLE_STATUSES: WorkOrderStatus[] = ['draft', 'received', 'inspecting'];
/** Statuses from which a change order (new version → re-approval) is allowed. */
export const CHANGE_ORDER_FROM: WorkOrderStatus[] = ['awaiting_parts', 'in_progress', 'quality_check'];
/** Transitions the WORKSHOP may request via the generic transition endpoint (approval/cancel handled elsewhere). */
export const WORKSHOP_TRANSITIONS: WorkOrderStatus[] = ['received', 'inspecting', 'awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed', 'abandoned'];
export const TERMINAL: WorkOrderStatus[] = ['closed', 'cancelled', 'abandoned'];
export const AFTER_APPROVAL: WorkOrderStatus[] = ['awaiting_parts', 'in_progress', 'quality_check', 'ready', 'delivered', 'closed', 'disputed', 'abandoned'];
