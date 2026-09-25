import { z } from 'zod';
export const PresignDto = z.object({
  kind: z.enum(['image', 'video', 'audio', 'pdf', 'xml', 'other']),
  mime_type: z.string().min(3).max(100),
  size_bytes: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  purpose: z.enum(['kyb_document', 'org_logo', 'inspection', 'work_order', 'part_bid', 'dispute', 'proof_of_delivery', 'voice_note', 'other']),
  captured_at: z.string().datetime().optional(),
});
export type PresignDto = z.infer<typeof PresignDto>;
