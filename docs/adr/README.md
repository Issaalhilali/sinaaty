# ADRs — Architecture Decision Records

Format: `NNNN-short-title.md` with sections **Status / Date / Context / Decision / Consequences**.
Add one for every non-trivial architectural decision (CLAUDE.md §9.6). Never edit an accepted ADR's decision —
supersede it with a new ADR and link both ways.

| #    | Title                                                                            | Status   |
| ---- | -------------------------------------------------------------------------------- | -------- |
| 0001 | [Backend as a NestJS modular monolith](./0001-modular-monolith.md)                | Accepted |
| 0002 | [One Flutter codebase, three flavors](./0002-flutter-multi-flavor.md)             | Accepted |
| 0003 | [Prisma + raw SQL for ledger/invariants](./0003-prisma-plus-raw-sql-ledger.md)    | Accepted |
| 0004 | [Internal double-entry ledger](./0004-internal-double-entry-ledger.md)            | Accepted |
| 0005 | [Transactional outbox + BullMQ](./0005-outbox-and-bullmq-for-integrations.md)     | Accepted |
| 0006 | [Next.js only for admin back-office](./0006-nextjs-admin-only.md)                 | Accepted |
| 0007 | [Clean Architecture in API and mobile](./0007-clean-architecture.md)              | Accepted |
