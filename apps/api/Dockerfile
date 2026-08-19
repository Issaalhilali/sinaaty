# syntax=docker/dockerfile:1.7
# Sinaaty API — pnpm workspace aware, multi-stage, non-root, healthchecked.
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/ledger/package.json packages/ledger/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/zatca-ubl/package.json packages/zatca-ubl/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY packages packages
COPY apps/api apps/api
RUN pnpm --filter "./packages/*" build \
 && pnpm --filter api prisma:generate \
 && pnpm --filter api build \
 && pnpm --filter api --prod deploy /app --legacy

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build /app ./
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/v1/health || exit 1
# Migrations run as a separate job/initContainer (see infra/helm), never on app start.
CMD ["node", "dist/main.js"]
