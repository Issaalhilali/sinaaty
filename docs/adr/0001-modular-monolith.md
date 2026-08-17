# ADR 0001 — Backend as a NestJS Modular Monolith

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/02-ARCHITECTURE.md §2–3, docs/03-TECH-STACK.md §1, [ADR 0007](./0007-clean-architecture.md)

## Context

Sinaaty spans many bounded contexts (identity, organizations, vehicles, work orders, invoicing, payments/escrow,
promissory notes, parts marketplace, logistics, disputes, notifications, fleet). The MVP team is small, the domain is
transaction-heavy (legal/financial invariants that must commit atomically: state transition + history + audit + outbox +
ledger), and the regulatory integrations (Nafath, Nafez, ZATCA, PSP) are contractual and volatile.

Options considered:

1. **Microservices from day one** (one service per context, Go/Node mix).
2. **Modular monolith** — one deployable NestJS app with strictly separated modules, background workers and the
   realtime gateway in the same codebase (separately scalable processes).
3. Django / Rails style monolith.

## Decision

Build `apps/api` as a **NestJS 11 modular monolith** on Node 22 / TypeScript strict:

- One PostgreSQL database; each module owns its tables and exposes an **application service/port** — other modules
  never touch its tables or repositories directly (see ADR 0007).
- Three process roles from the same image: `api` (HTTP + WebSocket), `worker` (BullMQ processors), `scheduler`
  (cron: escrow auto-release, bidding expiry, dunning, MV refresh). Role selected by env `PROCESS_ROLE`.
- Cross-module side effects go through the **transactional outbox** (ADR 0005), never through in-process event buses
  that can lose events on crash.
- Any high-concurrency component (matching, tracking ingestion) that later needs a separate runtime requires its own
  ADR before extraction (CLAUDE.md §5.6 "Don't add a Go/other-language service without an ADR").

## Consequences

**Positive**

- Atomic transactions across contexts (WO transition + ledger + audit + outbox) are trivial: one DB, one `tx`.
- One deploy, one observability story, one CI pipeline for MVP; fewer network failure modes.
- Module boundaries + ports make later extraction mechanical (module → service, port → HTTP/gRPC client).

**Negative / mitigations**

- Risk of a "big ball of mud" → enforced by ESLint `import/no-restricted-paths` per module and by ADR 0007 layering.
- Single-runtime scaling → workers/gateway run as separate processes with the Redis Socket.IO adapter.
- Node for financial math → `decimal.js` everywhere; DB `NUMERIC(14,2)`; never `number` for amounts (CLAUDE.md §5.1).
