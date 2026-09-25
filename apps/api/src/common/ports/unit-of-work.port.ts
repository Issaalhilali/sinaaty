/**
 * Transaction boundary port (CLAUDE.md §5.5): use cases run `uow.run(tx => …)` and pass the opaque
 * handle to repositories / AuditLogWriter / OutboxWriter so everything commits together.
 * The Prisma implementation lives in src/prisma/prisma-unit-of-work.ts.
 */
export interface TxHandle { readonly __brand: 'TxHandle' }
export interface UnitOfWork {
  run<T>(fn: (tx: TxHandle) => Promise<T>): Promise<T>;
}
export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
