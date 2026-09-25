import { createHash } from 'node:crypto';
import { canonicalize } from '../../../common/audit/audit-hash';
import type { PaymentTerms, PartCondition, WoItemType } from '@sinaaty/shared-types';

export interface SnapshotItem { id: string; type: WoItemType; description_ar: string; description_en: string | null; part_condition: PartCondition | null; part_number: string | null; quantity: string; unit_price: string; discount: string; vat_rate: string; line_total: string; warranty_days: number }
export interface Snapshot {
  work_order_id: string; number: string; version: number; org: { id: string; name_ar: string; vat_number: string | null };
  customer: { user_id: string | null; org_id: string | null; name_ar: string | null };
  vehicle: { id: string; vin: string | null; plate: string | null; make_ar: string | null; model_ar: string | null; year: number | null };
  items: SnapshotItem[]; totals: { subtotal: string; discount: string; vat: string; total: string };
  payment_terms: PaymentTerms; deposit_required: string; due_date: string | null; promised_ready_at: string | null;
  contract_terms_version: string; reason_ar: string | null; created_at: string;
}
/** What the customer signs: sha256 of the canonical JSON (sorted keys). Any byte change = different hash. */
export const snapshotHash = (s: Snapshot): string => createHash('sha256').update(canonicalize(s)).digest('hex');
