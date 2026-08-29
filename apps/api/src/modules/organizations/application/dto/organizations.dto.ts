import { z } from 'zod';
import { OrgTypeValues, KybDocTypeValues, OrgMemberRoleValues } from '@sinaaty/shared-types';

export const CreateOrgDto = z.object({
  type: z.enum(OrgTypeValues as [string, ...string[]]),
  legal_name_ar: z.string().min(2).max(200), legal_name_en: z.string().max(200).optional(), trade_name_ar: z.string().max(200).optional(),
  cr_number: z.string().regex(/^\d{10}$/).optional(), vat_number: z.string().regex(/^3\d{13}3$/).optional(),
  phone: z.string().max(20).optional(), email: z.string().email().optional(), description_ar: z.string().max(2000).optional(),
});
export type CreateOrgDto = z.infer<typeof CreateOrgDto>;
export const UpdateOrgDto = CreateOrgDto.omit({ type: true, cr_number: true }).partial();
export type UpdateOrgDto = z.infer<typeof UpdateOrgDto>;

export const AvailabilityDto = z.object({ accepting_requests: z.boolean() });
export type AvailabilityDto = z.infer<typeof AvailabilityDto>;

export const AddLocationDto = z.object({ name_ar: z.string().max(120).optional(), is_primary: z.boolean().optional(), city: z.string().min(2).max(80), district: z.string().max(120).optional(), industrial_zone: z.string().max(120).optional(), address_line: z.string().max(500).optional(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), service_radius_km: z.number().int().min(1).max(500).optional() });
export type AddLocationDto = z.infer<typeof AddLocationDto>;
export const SetSpecialtiesDto = z.object({ items: z.array(z.object({ make_id: z.number().int().optional(), category_id: z.number().int().optional() })).max(200) });
export type SetSpecialtiesDto = z.infer<typeof SetSpecialtiesDto>;
export const AddMemberDto = z.object({ phone: z.string().min(9).max(16), role: z.enum(OrgMemberRoleValues as [string, ...string[]]), full_name_ar: z.string().max(150).optional() });
export type AddMemberDto = z.infer<typeof AddMemberDto>;
export const AddKybDocDto = z.object({ type: z.enum(KybDocTypeValues as [string, ...string[]]), media_id: z.string().uuid(), expires_at: z.string().date().optional() });
export type AddKybDocDto = z.infer<typeof AddKybDocDto>;
export const AddBankAccountDto = z.object({ bank_name: z.string().min(2).max(100), iban: z.string().min(24).max(34), holder_name: z.string().min(2).max(150) });
export type AddBankAccountDto = z.infer<typeof AddBankAccountDto>;
export const SubscribeDto = z.object({ plan_code: z.string().min(2).max(40), cycle: z.enum(['monthly', 'yearly']).default('monthly') });
export type SubscribeDto = z.infer<typeof SubscribeDto>;
export const AdminDecisionDto = z.object({ reason: z.string().min(3).max(1000) });
export type AdminDecisionDto = z.infer<typeof AdminDecisionDto>;
export const SearchOrgsDto = z.object({ type: z.enum(OrgTypeValues as [string, ...string[]]).optional(), city: z.string().max(80).optional(), lat: z.coerce.number().optional(), lng: z.coerce.number().optional(), radius_km: z.coerce.number().min(1).max(500).default(25), q: z.string().max(80).optional(), /** صنع سيارة الباحث — يُقدّم المتخصّصين به في الترتيب. */ make_id: z.coerce.number().int().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
export type SearchOrgsDto = z.infer<typeof SearchOrgsDto>;
