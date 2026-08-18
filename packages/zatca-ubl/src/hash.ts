import { createHash } from 'node:crypto';
/** Phase-1 friendly invoice hash: sha256 (hex) of the canonical invoice payload; Phase 2 replaces with XML C14N hash. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const o = value as Record<string, unknown>; return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}
export const invoiceHash = (payload: unknown): string => createHash('sha256').update(canonical(payload)).digest('hex');
export const invoiceHashBase64 = (payload: unknown): string => createHash('sha256').update(canonical(payload)).digest('base64');
