# syntax=docker/dockerfile:1.7
# Sinaaty admin back-office — Angular static build served by a dependency-free Node server (tools/serve.mjs).
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin-web/package.json apps/admin-web/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts
COPY apps/admin-web apps/admin-web
# Baked at build time: the browser needs both, so each environment gets its own image tag.
# PRIMEUI_LICENSE is a secret — pass it with --build-arg from the CI secret store, never commit it (see src/env.d.ts).
ARG API_BASE_URL=http://localhost:3000
ARG PRIMEUI_LICENSE=
RUN pnpm --filter admin-web exec ng build --define "API_BASE_URL='${API_BASE_URL}'" --define "PRIMEUI_LICENSE='${PRIMEUI_LICENSE}'"

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3001 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /repo/apps/admin-web/dist ./dist
COPY --from=build /repo/apps/admin-web/tools/serve.mjs ./tools/serve.mjs
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/login || exit 1
CMD ["node", "tools/serve.mjs"]
