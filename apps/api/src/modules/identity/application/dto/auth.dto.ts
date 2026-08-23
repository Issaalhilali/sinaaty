import { z } from 'zod';

export const NationalIdSchema = z.string().regex(/^[12]\d{9}$/, 'national id must be 10 digits starting with 1 or 2');
export const PhoneSchema = z.string().min(9).max(16);

export const NafathInitiateDto = z.object({ national_id: NationalIdSchema });
export type NafathInitiateDto = z.infer<typeof NafathInitiateDto>;

export const OtpRequestDto = z.object({ phone: PhoneSchema, purpose: z.enum(['login']).default('login') });
export type OtpRequestDto = z.infer<typeof OtpRequestDto>;

export const OtpVerifyDto = z.object({
  phone: PhoneSchema,
  code: z.string().regex(/^\d{6}$/),
  device: z.object({ platform: z.enum(['ios', 'android', 'web']), device_name: z.string().max(120).optional(), push_token: z.string().max(4096).optional(), app_flavor: z.enum(['customer', 'partner', 'fleet', 'admin']).optional(), app_version: z.string().max(20).optional() }).optional(),
});
export type OtpVerifyDto = z.infer<typeof OtpVerifyDto>;

export const RefreshDto = z.object({ refresh_token: z.string().min(20) });
export type RefreshDto = z.infer<typeof RefreshDto>;

export const UpdateMeDto = z.object({ full_name_ar: z.string().trim().min(2).max(120) });
export type UpdateMeDto = z.infer<typeof UpdateMeDto>;

export const RegisterDeviceDto = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  device_name: z.string().max(120).optional(),
  push_token: z.string().max(4096).optional(),
  app_flavor: z.enum(['customer', 'partner', 'fleet', 'admin']).optional(),
  app_version: z.string().max(20).optional(),
});
export type RegisterDeviceDto = z.infer<typeof RegisterDeviceDto>;

export const NafathCallbackDto = z.object({
  transaction_id: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'expired']),
});
export type NafathCallbackDto = z.infer<typeof NafathCallbackDto>;
