import type { LedgerEntryDraft } from './entry';

/** Application port implemented in apps/api infrastructure (Prisma, inside the caller's transaction). */
export interface LedgerPort {
  post(entry: LedgerEntryDraft): Promise<{ entryId: string }>;
}
