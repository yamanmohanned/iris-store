# Production image: Next.js standalone server + bundled migrator, running as an unprivileged user.
#   docker build -t iris-store .
# See docs/DEPLOYMENT.md for the full stack (PostgreSQL, Caddy with HTTPS, scheduled jobs, backups).

ARG NODE_IMAGE=node:22-bookworm-slim

# ── pnpm (the version pinned by "packageManager" in package.json) ─────────────
FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack install

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No secrets or database are needed at build time: every page renders on request.
RUN pnpm build && pnpm build:migrate

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 \
    STORAGE_LOCAL_DIR=/app/storage MIGRATIONS_DIR=/app/drizzle
WORKDIR /app
RUN groupadd --system --gid 1001 iris \
 && useradd --system --uid 1001 --gid iris --home-dir /app iris \
 && mkdir -p /app/storage && chown iris:iris /app/storage
COPY --from=build --chown=iris:iris /app/.next/standalone ./
COPY --from=build --chown=iris:iris /app/.next/static ./.next/static
COPY --from=build --chown=iris:iris /app/public ./public
COPY --from=build --chown=iris:iris /app/drizzle ./drizzle
COPY --from=build --chown=iris:iris /app/dist/migrate.mjs ./migrate.mjs
COPY --chmod=755 scripts/docker/entrypoint.sh /usr/local/bin/iris-entrypoint
USER iris
EXPOSE 3000
VOLUME ["/app/storage"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["iris-entrypoint"]
CMD ["node", "server.js"]
