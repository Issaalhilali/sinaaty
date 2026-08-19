# CI/CD & observability (Step 17)

## Pipeline — `.github/workflows/ci.yml`
| Job | What it proves | Notes |
|---|---|---|
| `packages` | ledger / zatca-ubl / shared-types lint + unit + build | pure domain libs, no DB |
| `api` | `db:verify` (schema.sql → migration → seed → **no drift**), lint, typecheck, 38 unit, 101 e2e, OpenAPI export, `shared-types gen:check` | real `postgis/postgis:17-3.4` service; **Ed25519 JWT keys generated per run** (never committed) |
| `admin-web` | typecheck, `next build`, Playwright smoke against a real API + seeded DB | starts API and admin-web, waits on both health endpoints |
| `mobile` | `flutter analyze`, `dart run import_lint` (Clean Architecture rule), `flutter test` incl. RTL goldens | |
| `images` | builds and pushes `api` + `admin-web` images to GHCR | only on `main`, only after every other job is green |

`codeql.yml` runs static security analysis on PRs and weekly.

## Container images
`apps/api/Dockerfile` and `apps/admin-web/Dockerfile` — multi-stage, pnpm-workspace aware, non-root (`USER node`),
`HEALTHCHECK` on `/v1/health` and `/login`. **Migrations never run on app start**: the Helm chart runs
`prisma migrate deploy` as a `pre-install/pre-upgrade` Job so a rolling restart cannot half-migrate the database.

> These images have not been built on the dev machine — Docker Hub is unreachable from it (base images cannot be
> pulled). They build in CI, where the registry is reachable; the first green `images` run is the real proof.

## Deployment — `infra/helm/sinaaty`
`values.yaml` is staging-shaped: 2 API replicas, 2 admin replicas, OTEL on, **all provider integrations still `mock`**
(each flips to `live` only when its contract is signed and its adapter is implemented). Secrets come from the cluster
(`secretName`), never from the chart. Liveness/readiness hit `/v1/health`, which deliberately does not depend on the
database — a DB blip must not restart every pod.

## Observability
- `apps/api/src/telemetry.ts` starts the OpenTelemetry SDK **before** the app is imported (`main.ts` loads
  `bootstrap.ts` dynamically). ESM imports hoist, so starting the SDK after them leaves http/express/pg unpatched —
  that mistake produces bootstrap-only spans and was caught during Step 17.
- Instrumented: HTTP, Express, NestJS controllers, **Prisma** (`previewFeatures = ["tracing"]` + `@prisma/instrumentation`).
  Health/metrics probes are excluded from traces.
- Off unless `OTEL_ENABLED=true`. Locally: `OTEL_ENABLED=true OTEL_EXPORTER=console pnpm --filter api start`.
- `infra/observability/otel-collector.yaml` scrubs PII-bearing attributes (authorization header, query parameters,
  phone, national id) **before** anything leaves the cluster.
- `infra/observability/grafana-platform-dashboard.json` — request rate, p95 latency, 5xx ratio, Prisma p95,
  outbox backlog, integration failures/DLQ, and **ledger imbalance (must stay 0)**.

## Running the e2e suite locally
Stop the dev API first — its schedulers (outbox drain, escrow auto-release, dunning, parts expiry) share the same
database and will race the tests:
```bash
./dev.sh stop && ./apps/api/tools/dev-db.sh start   # database only
pnpm --filter api test:e2e                          # warns if a dev API is still listening
```
