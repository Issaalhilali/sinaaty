import { z } from 'zod';

const money = z.string().regex(/^\d+(\.\d{1,2})?$/, 'amount must be a decimal string');

export const PolicyDto = z.object({
  name_ar: z.string().trim().min(2).max(120),
  /** Repairs below this amount need no internal approval at all. */
  auto_approve_below: money.optional(),
  /** Above this amount two different approvers must agree. */
  requires_two_approvers_above: money.nullish(),
  /** Workshops the fleet accepts. Empty/absent = any workshop. */
  allowed_org_ids: z.array(z.string().uuid()).nullish(),
  monthly_budget: money.nullish(),
});
export type PolicyDto = z.infer<typeof PolicyDto>;

export const UpdatePolicyDto = PolicyDto.partial().extend({ is_active: z.boolean().optional() });
export type UpdatePolicyDto = z.infer<typeof UpdatePolicyDto>;

export const DecideDto = z.object({
  decision: z.enum(['approved', 'rejected']),
  note_ar: z.string().trim().max(500).optional(),
});
export type DecideDto = z.infer<typeof DecideDto>;

export const ImportVehiclesDto = z.object({
  vehicles: z.array(z.object({
    vin: z.string().trim().optional(),
    plate: z.string().trim().optional(),
    asset_code: z.string().trim().max(40).optional(),
    year: z.number().int().min(1950).max(2100).optional(),
    color_ar: z.string().trim().max(40).optional(),
    odometer_km: z.number().int().min(0).max(2_000_000).optional(),
  })).min(1).max(500),
});
export type ImportVehiclesDto = z.infer<typeof ImportVehiclesDto>;

export const StatementDto = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM') });
export type StatementDto = z.infer<typeof StatementDto>;
