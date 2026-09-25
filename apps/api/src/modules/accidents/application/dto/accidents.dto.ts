import { z } from 'zod';

const ref = z.string().trim().min(4).max(80);

export const LookupDto = z.object({
  ref,
  vin: z.string().trim().length(17).optional(),
  plate: z.string().trim().max(20).optional(),
});
export type LookupDto = z.infer<typeof LookupDto>;

export const LinkDto = z.object({
  ref,
  /** Optional: link to a work order right away (the usual path — the advisor is on the order screen). */
  work_order_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  org_id: z.string().uuid(),
});
export type LinkDto = z.infer<typeof LinkDto>;

export const SubmitRepairDto = z.object({
  /** Optional note kept in the audit trail — the provider payload itself is built from the work order. */
  note_ar: z.string().trim().max(500).optional(),
});
export type SubmitRepairDto = z.infer<typeof SubmitRepairDto>;
