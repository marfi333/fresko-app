# Stage 1: install + build (full deps, incl. dev)
FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++ libc6-compat

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@10.8.1 --activate
RUN pnpm install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN pnpm build


# Stage 2: minimal deps for `drizzle-kit migrate` only — installed with npm
# so the resulting node_modules is a simple flat tree (no pnpm symlink store)
# that copies cleanly into the runner.
FROM node:24-alpine AS migrate-deps
WORKDIR /migrate

RUN apk add --no-cache python3 make g++ libc6-compat
RUN npm install --omit=dev --no-audit --no-fund --no-package-lock \
  drizzle-kit@0.31.10 drizzle-orm@0.45.2 better-sqlite3@12.10.0


# Stage 3: runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_PATH=/app/data/fresko.db

RUN apk add --no-cache libc6-compat \
  && mkdir -p /app/data \
  && chown -R node:node /app/data

# Next.js standalone server (self-contained, ~38MB)
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Migration toolchain (drizzle-kit + minimal transitive deps)
COPY --from=migrate-deps --chown=node:node /migrate/node_modules /app/migrate/node_modules
COPY --from=builder --chown=node:node /app/drizzle /app/migrate/drizzle
COPY --from=builder --chown=node:node /app/drizzle.config.ts /app/migrate/drizzle.config.ts
COPY --from=builder --chown=node:node /app/src/db/schema /app/migrate/src/db/schema

COPY --chown=node:node docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER node

VOLUME ["/app/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
