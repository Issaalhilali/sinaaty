import { z } from 'zod';
import { WoItemTypeValues, PartConditionValues, PaymentTermsValues, WorkOrderStatusValues, InspectionTypeValues } from '@sinaaty/shared-types';
const money = z.union([z.string().regex(/^\d+(\.\d{1,2})?$/), z.number().nonnegative()]).transform((v) => String(v));
export const ItemDto = z.object({
  type: z.enum(WoItemTypeValues as [string, ...string[]]), description_ar: z.string().min(2).max(500), description_en: z.string().max(500).optional(),
  part_condition: z.enum(PartConditionValues as [string, ...string[]]).optional(), part_number: z.string().max(60).optional(),
  quantity: z.union([z.string(), z.number()]).transform(String).default('1'), unit_price: money, discount: money.default('0'), vat_rate: z.number().min(0).max(100).default(15), warranty_days: z.number().int().min(0).max(3650).default(0), sort_order: z.number().int().optional(),
});
export type ItemDto = z.infer<typeof ItemDto>;
export const CreateWorkOrderDto = z.object({
  org_id: z.string().uuid(),
  vehicle_id: z.string().uuid().optional(), vin: z.string().length(17).optional(), plate: z.string().min(4).max(14).optional(),
  customer_phone: z.string().min(9).max(16).optional(), customer_org_id: z.string().uuid().optional(),
  title_ar: z.string().max(200).optional(), complaint_ar: z.string().max(2000).optional(),
  payment_terms: z.enum(PaymentTermsValues as [string, ...string[]]).default('on_delivery'), deposit_required: money.optional(), due_date: z.string().date().optional(), promised_ready_at: z.string().datetime().optional(),
  items: z.array(ItemDto).max(100).default([]),
}).refine((d) => d.vehicle_id || d.vin || d.plate, { message: 'vehicle_id, vin or plate is required', path: ['vehicle_id'] })
  .refine((d) => d.customer_phone || d.customer_org_id, { message: 'customer_phone or customer_org_id is required', path: ['customer_phone'] });
export type CreateWorkOrderDto = z.infer<typeof CreateWorkOrderDto>;
export const UpdateWorkOrderDto = z.object({ title_ar: z.string().max(200).optional(), complaint_ar: z.string().max(2000).optional(), diagnosis_ar: z.string().max(4000).optional(), payment_terms: z.enum(PaymentTermsValues as [string, ...string[]]).optional(), deposit_required: money.optional(), due_date: z.string().date().nullable().optional(), promised_ready_at: z.string().datetime().nullable().optional(), assigned_technician_id: z.string().uuid().nullable().optional() });
export type UpdateWorkOrderDto = z.infer<typeof UpdateWorkOrderDto>;
export const UpdateItemDto = ItemDto.partial().extend({ is_completed: z.boolean().optional() });
export type UpdateItemDto = z.infer<typeof UpdateItemDto>;
export const TransitionDto = z.object({ to: z.enum(WorkOrderStatusValues as [string, ...string[]]), note_ar: z.string().max(1000).optional() });
export type TransitionDto = z.infer<typeof TransitionDto>;
export const CancelDto = z.object({ reason_ar: z.string().min(3).max(1000) });
export type CancelDto = z.infer<typeof CancelDto>;
export const ChangeOrderDto = z.object({ reason_ar: z.string().min(3).max(1000), add: z.array(ItemDto).default([]), remove_item_ids: z.array(z.string().uuid()).default([]), update: z.array(UpdateItemDto.extend({ id: z.string().uuid() })).default([]) });
export type ChangeOrderDto = z.infer<typeof ChangeOrderDto>;
export const ApproveInitDto = z.object({ version: z.number().int().positive().optional(), method: z.enum(['nafath', 'otp']).default('nafath') });
export type ApproveInitDto = z.infer<typeof ApproveInitDto>;
export const ApproveCompleteDto = z.object({ version: z.number().int().positive().optional(), method: z.enum(['nafath', 'otp']).default('nafath'), transaction_id: z.string().optional(), code: z.string().regex(/^\d{6}$/).optional() });
export type ApproveCompleteDto = z.infer<typeof ApproveCompleteDto>;
export const InspectionDto = z.object({ type: z.enum(InspectionTypeValues as [string, ...string[]]), odometer_km: z.number().int().min(0).optional(), fuel_level_pct: z.number().int().min(0).max(100).optional(), checklist: z.record(z.unknown()).default({}), damages: z.array(z.object({ zone: z.string().max(40), severity: z.enum(['minor', 'moderate', 'severe']), note_ar: z.string().max(500).optional(), media_ids: z.array(z.string().uuid()).default([]) })).default([]), media_ids: z.array(z.string().uuid()).max(40).default([]) });
export type InspectionDto = z.infer<typeof InspectionDto>;
export const AttachMediaDto = z.object({ media_ids: z.array(z.string().uuid()).min(1).max(40), label: z.enum(['before', 'after', 'progress', 'damage', 'receipt', 'other']).default('progress'), item_id: z.string().uuid().optional() });
export type AttachMediaDto = z.infer<typeof AttachMediaDto>;
