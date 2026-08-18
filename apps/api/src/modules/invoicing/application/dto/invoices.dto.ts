import { z } from 'zod';
export const IssueFromWorkOrderDto = z.object({ work_order_id: z.string().uuid(), notes_ar: z.string().max(1000).optional(), due_date: z.string().date().optional() });
export type IssueFromWorkOrderDto = z.infer<typeof IssueFromWorkOrderDto>;
export const VoidDto = z.object({ reason_ar: z.string().min(3).max(1000) });
export type VoidDto = z.infer<typeof VoidDto>;
export const CreditNoteDto = z.object({ reason_ar: z.string().min(3).max(1000), lines: z.array(z.object({ invoice_line_id: z.string().uuid(), quantity: z.union([z.string(), z.number()]).transform(String).optional(), amount: z.union([z.string(), z.number()]).transform(String).optional() })).min(1).optional() });
export type CreditNoteDto = z.infer<typeof CreditNoteDto>;
