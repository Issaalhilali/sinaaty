# ADR 0002 — One Flutter codebase, three flavors (customer / partner / fleet)

- **Status:** Accepted
- **Date:** 2026-08-17
- **Related:** docs/01-PRD.md (personas), docs/05-USER-FLOWS.md, docs/03-TECH-STACK.md §2, [ADR 0006](./0006-nextjs-admin-only.md)

## Context

The platform has several *party* apps: customers (individuals), partners (workshops, scrapyards, parts
distributors/agents, tow drivers) and fleet companies (mostly web). They share the majority of infrastructure
(auth via Nafath/OTP, vehicles, work-order tracking, invoices, payments, notifications, RTL Arabic UI) but differ in
navigation, home screens and store listings. The repository already started as a Flutter project.

Options considered:

1. Separate Flutter projects per party.
2. Native iOS/Android + separate web.
3. **Single Flutter project with build flavors** and separate entrypoints, sharing `lib/core` and `lib/features`.

## Decision

Keep **one Flutter app in `apps/mobile`** with three flavors:

| Flavor     | Entrypoint                | Targets                | Store identity           |
| ---------- | ------------------------- | ---------------------- | ------------------------ |
| `customer` | `lib/main_customer.dart`  | iOS, Android, Web(approval page) | `sa.sinaaty.customer` |
| `partner`  | `lib/main_partner.dart`   | iOS, Android           | `sa.sinaaty.partner`     |
| `fleet`    | `lib/main_fleet.dart`     | Web (primary), tablets | `sa.sinaaty.fleet`       |

- Environment via `--dart-define-from-file=env/<env>.json`; flavor-specific DI through Riverpod provider overrides at
  the composition root (`main_<flavor>.dart`).
- Feature-first layout `lib/features/<feature>/{domain,data,presentation}` (ADR 0007). Features are shared; each flavor
  composes its own `go_router` route tree and home shell.
- Arabic is the default locale, RTL first; English optional. Strings only in ARB files.
- Melos is *not* introduced now (single package); revisit when `packages/` grows Dart packages.

## Consequences

**Positive** — one design system, one API client (OpenAPI → Dart codegen), one offline layer (drift), shared tests;
new party types (e.g. driver) are a route tree, not a new app.

**Negative / mitigations** — larger binary and shared release cadence → tree-shaking by entrypoint, feature flags per
flavor; the risk of "partner logic leaking into customer" is handled by flavor-scoped route trees and lints.

The web approval page (SMS link → review → Nafath approve, no app install) is built as a Flutter Web target of the
`customer` flavor in Step 13; if bundle size proves unacceptable, a separate ADR may move it to Next.js.
