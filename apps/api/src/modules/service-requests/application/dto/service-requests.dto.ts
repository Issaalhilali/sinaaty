import { z } from 'zod';

export const CreateServiceRequestDto = z.object({
  // إلزامي عمداً (تحكيم 2026-08-23): كل إصلاح يُقيَّد على سيارة، والقبول ينشئ أمر عمل يتطلبها —
  // فالرفض هنا أرحم من انهيار بعد انتظار العروض. والرسالة عربية مفهومة لا «مدخل غير صالح».
  vehicle_id: z.string({ required_error: 'اختر سيارتك أولاً' }).uuid('اختر سيارتك أولاً'),
  title_ar: z.string().min(5).max(200),
  description_ar: z.string().max(2000).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address_hint: z.string().max(300).optional(),
  radius_km: z.number().int().min(2).max(150).default(15),      // العميل يحدد نطاقه (توجيه المالك)
  preferred_time: z.enum(['now', 'today', 'this_week']).default('today'),
  media_ids: z.array(z.string().uuid()).max(8).default([]),
  expires_minutes: z.number().int().min(30).max(7 * 24 * 60).optional(),
});
export type CreateServiceRequestDto = z.infer<typeof CreateServiceRequestDto>;

export const SubmitOfferDto = z.object({
  // اختياري: يُشتق من عضوية المنادي حين تكون وحيدة (إصلاح الوصلة 2026-08-23)
  org_id: z.string().uuid().optional(),
  offer_type: z.enum(['estimate', 'free_inspection']).default('estimate'),
  diagnosis_ar: z.string().max(2000).optional(),
  price_min: z.union([z.string(), z.number()]).transform(String).optional(),
  price_max: z.union([z.string(), z.number()]).transform(String).optional(),
  availability: z.enum(['now', 'today', 'scheduled']).default('today'),
  available_at: z.string().datetime().optional(),
  eta_note_ar: z.string().max(200).optional(),
}).refine((o) => o.offer_type === 'free_inspection' || o.price_min != null || o.diagnosis_ar != null, { message: 'estimate offers need a price or a diagnosis' })
  .refine((o) => o.offer_type !== 'free_inspection' || (o.price_min == null && o.price_max == null), { message: 'a free inspection carries no price' });
export type SubmitOfferDto = z.infer<typeof SubmitOfferDto>;

export const AcceptOfferDto = z.object({ offer_id: z.string().uuid() });
export type AcceptOfferDto = z.infer<typeof AcceptOfferDto>;

export const WidenDto = z.object({ radius_km: z.number().int().min(2).max(150) });
export type WidenDto = z.infer<typeof WidenDto>;

export const CancelDto = z.object({ reason_ar: z.string().max(500).optional() });
export type CancelDto = z.infer<typeof CancelDto>;
