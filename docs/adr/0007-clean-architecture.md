# ADR 0007 — Clean Architecture in both the API and the Flutter app

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** CLAUDE.md §5.5, [ADR 0001](./0001-modular-monolith.md), [ADR 0002](./0002-flutter-multi-flavor.md), [ADR 0005](./0005-outbox-and-bullmq-for-integrations.md)

## Context

The domain carries legal and financial invariants (state machines, immutable approval snapshots, balanced ledger,
note-close-on-payment) that must be testable without a database, a Nest container, Flutter widgets or a provider SDK.
Provider contracts (Nafath, Nafez, ZATCA, PSP, escrow, SMS) are uncertain and will change; UI frameworks and ORMs will
be upgraded. We want the rules in the middle to be stable and the edges replaceable.

## Decision

Apply the **dependency rule** — source dependencies point inward only:
`interface/presentation → application → domain`; `infrastructure` implements ports and is bound only at the
composition root.

### Backend (`apps/api/src/modules/<name>/`)

```
domain/          entities, value objects (Money, Vin, PlateNumber), enums, domain events, state-machine
                 transition tables, domain errors, repository PORTS (interfaces). Pure TS — no Nest/Prisma/SDK imports.
application/     one use case class per command/query (e.g. approve-work-order.use-case.ts), Zod DTOs,
                 application ports (NafathPort, ClockPort, IdGeneratorPort, OutboxPort, UnitOfWork).
infrastructure/  Prisma repositories implementing ports, provider adapters (+ .mock.adapter.ts), mappers
                 (row ⇄ entity), BullMQ processors, outbox/event subscribers.
interface/       http/ (controllers, guards, request/response mappers), ws/ (gateways), cli/.
<name>.module.ts composition root — binds ports → adapters from env (INTEGRATION_*=mock|live).
__tests__/       domain + use-case tests with in-memory repos (no DB); infra tests with Testcontainers.
```

Rules: controllers = parse → use case → map response, no business logic. Use cases own the transaction boundary
via a `UnitOfWork` port. Cross-module calls only through the other module's application service/port — never its
repository or tables. `packages/ledger` and `packages/zatca-ubl` are pure domain/application libraries with zero
framework imports.

### Mobile (`apps/mobile/lib/features/<feature>/`)

```
domain/        entities (freezed), value objects, repository interfaces, use cases (plain Dart)
data/          DTOs (json_serializable), remote (generated OpenAPI client) & local (drift) sources,
               repository implementations, mappers DTO ⇄ entity
presentation/  Riverpod controllers/notifiers (call use cases), screens, widgets (no logic)
lib/core/      api client, auth, theme, l10n, routing, error mapping, per-flavor DI overrides
```

Rules: widgets never call Dio/drift; state lives in Riverpod notifiers; use cases return `Result<T, Failure>` (no
throwing across layers); the generated OpenAPI client is used only inside `data/`.

### Enforcement

- API: ESLint `import/no-restricted-paths` zones per module (`domain` may import nothing outside `domain`;
  `application` may not import `infrastructure`/`interface`; modules may not import each other's `infrastructure`).
- Mobile: `import_lint` (or `dart_code_metrics` banned-imports) rules mirroring the same zones; `very_good_analysis`.
- CI fails on violation. Reviewers reject PRs that put logic in controllers/widgets.

## Consequences

**Positive** — the legal/financial core is unit-testable in milliseconds and provider-agnostic; swapping a PSP or
upgrading Nest/Flutter touches only edges; ports + mocks let CI pass with `INTEGRATION_*=mock`.

**Negative / mitigations** — more files and mapping boilerplate → generators/templates for a new module and feature
(added in Steps 1 and 12); a temptation to "shortcut" for CRUD-only modules → allowed *only* if the module has no
domain rules, and documented in the module README.
