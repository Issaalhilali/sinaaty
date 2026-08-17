# ADR 0006 — Next.js only for the internal admin back-office

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/06-DASHBOARDS.md §A, docs/03-TECH-STACK.md §1, [ADR 0002](./0002-flutter-multi-flavor.md)

## Context

The platform back-office (KYB queue, integrations monitor, payments/escrow/ledger views, disputes room,
`platform_settings` editor, audit log browser) is used by a handful of internal roles on desktop, is table/report
heavy, needs 2FA, and evolves fast. Party-facing dashboards (workshop, distributor, scrapyard, fleet) belong to the
parties and are specified as Flutter screens/flavors.

Options considered: build admin in Flutter Web · React SPA + Vite · **Next.js 15 App Router + shadcn/ui +
TanStack Table/Query** · off-the-shelf admin (Retool/Appsmith).

## Decision

- `apps/admin-web` is a **Next.js 15 (App Router, TypeScript strict)** application, using shadcn/ui, TanStack Table
  and TanStack Query against the same REST API (`apps/api`) with the platform-role JWT (+ TOTP 2FA).
- Scope is **admin only**: workshop/distributor/scrapyard dashboards and the fleet portal are Flutter (`partner` /
  `fleet` flavors). Introducing a second web stack for party UIs requires a new ADR.
- Types come from `packages/shared-types` (OpenAPI-generated), no hand-written DTOs.
- Off-the-shelf low-code admins are rejected: sensitive actions (freeze/release, refunds with maker/checker, KYB
  decisions) require reason capture, `audit_log` writes and RBAC that we must control; PII must stay in KSA.
- Deployed as a Node/standalone container behind the same ingress; server components only call the API, never the DB.

## Consequences

**Positive** — fastest path to dense tables, filters, exports and forms; strong ecosystem; separate release cadence
from the mobile apps; Arabic RTL supported via `dir="rtl"` + Tailwind logical properties.

**Negative / mitigations** — a second frontend stack to maintain → limited to one app, shared types and tokens
(`packages/ui-tokens`) keep it consistent; Playwright smoke test protects the critical screens (login → KYB approve →
retry integration → dispute decision).
