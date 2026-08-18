import { z } from 'zod';
export const AddVehicleDto = z.object({
  vin: z.string().length(17).optional(),
  plate: z.string().min(4).max(14).optional(),
  make_id: z.number().int().optional(), model_id: z.number().int().optional(), model_year: z.number().int().min(1980).max(2100).optional(),
  color_ar: z.string().max(40).optional(), odometer_km: z.number().int().min(0).max(5_000_000).optional(),
  fuel_type: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'other']).optional(),
  owner_org_id: z.string().uuid().optional(), fleet_asset_code: z.string().max(40).optional(),
}).refine((d) => d.vin || d.plate, { message: 'vin or plate is required', path: ['vin'] });
export type AddVehicleDto = z.infer<typeof AddVehicleDto>;
export const OdometerDto = z.object({ odometer_km: z.number().int().min(0).max(5_000_000) });
export type OdometerDto = z.infer<typeof OdometerDto>;
