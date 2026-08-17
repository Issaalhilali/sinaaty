# ADR 0005 — Transactional outbox + BullMQ for integrations and cross-module events

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/02-ARCHITECTURE.md (sequence diagrams, integrations), CLAUDE.md §5.2–5.3, [ADR 0001](./0001-modular-monolith.md)

## Context

Domain transitions must have side effects in other systems that may be slow or down: issue a promissory note in
Nafez when a deferred work order is approved, close the note when the invoice is paid, report invoices to ZATCA,
capture/release with the PSP/escrow provider, send SMS/FCM/WhatsApp, refresh dashboards. Losing one of these events
means an unenforceable debt or an unpaid workshop. Calling providers synchronously inside the request would couple
user latency to Nafez/ZATCA uptime and could commit DB state that the provider never saw (or vice-versa).

Options considered: synchronous calls in the request · in-memory Nest `EventEmitter` · Kafka/RabbitMQ ·
**Postgres transactional outbox + BullMQ (Redis 7)**.

## Decision

- Every state transition writes, **in the same DB transaction**: the entity change, a `*_status_history` row, an
  `audit_log` row (hash-chained), and one or more `outbox_events` rows (`aggregate_type`, `aggregate_id`,
  `event_type`, `payload jsonb`, `idempotency_key`, `published_at NULL`).
- An **outbox relay** (scheduler process, `FOR UPDATE SKIP LOCKED` batches) publishes unpublished events to BullMQ
  queues (`integrations.nafez`, `integrations.zatca`, `payments`, `notifications`, `search-index`, `dashboards`) and
  marks them published. At-least-once delivery; consumers are idempotent.
- BullMQ processors run in the `worker` process with exponential backoff, a **dead-letter queue** per queue, and
  are visible/retryable from the admin "integrations monitor" (`integration_requests`, `webhook_events`, DLQ retry).
- Outbound provider calls persist an `integration_requests` row (provider, idempotency key, redacted request/response,
  status) **before** calling; inbound webhooks persist `webhook_events` with a unique provider event id and are
  processed exactly once.
- Domain modules depend on **ports**; adapters (`<provider>.adapter.ts` / `.mock.adapter.ts`) are chosen by
  `INTEGRATION_<PROVIDER>=mock|live`. CI runs with all mocks.
- Redis is not the system of record: if Redis is lost, the relay simply re-publishes unpublished outbox rows.

## Consequences

**Positive** — no lost events, no dual-write inconsistency, user requests stay fast, every provider call is auditable
and replayable; ops can retry from the back-office.

**Negative / mitigations** — eventual consistency for note issuance/closure → UI shows `pending` states and the
"pending notes" screen; SLO for note close-on-payment is ≤ 60 s in mock; duplicate deliveries → idempotency keys on
every consumer and provider call.
