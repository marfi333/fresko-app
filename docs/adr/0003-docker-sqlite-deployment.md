# 0003 — Docker + SQLite deployment (replaces Cloudflare Workers + D1)

- **Status:** accepted
- **Date:** 2026-05-31

## Context

The project originally targeted Cloudflare Workers (`@opennextjs/cloudflare`) with D1 as the database. This forced runtime constraints (Workers runtime, V8 isolates) and tied deployment to one vendor. We want a deployment that runs on any Docker-capable host without code changes.

## Decision

Deploy Fresko as a **single-container Docker image** running standard Node.js (`node:22-alpine`). Persistence is **embedded SQLite** via `better-sqlite3`, with the database file on a Docker volume.

- Database driver: `drizzle-orm/better-sqlite3`
- Auth adapter: `drizzleAdapter(db, { provider: "sqlite", usePlural: false })`
- Next.js config: `output: "standalone"` for a slim runtime image
- Migrations: applied on container start by `drizzle-kit migrate` (Drizzle's official CLI), reading `drizzle.config.ts`
- DB connection: cached singleton, WAL journal mode + foreign keys on
- Database path: `DATABASE_PATH` env var (defaults to `./data/fresko.db` locally, `/app/data/fresko.db` in container)

## Consequences

**Wins**
- Self-hostable on any VM, NAS, or Kubernetes — no Cloudflare lock-in
- Drizzle schema/migration files were already vanilla SQLite, so no rewrite needed
- Lower local-dev friction (no wrangler, no D1 emulator)

**Trade-offs**
- Single-host SQLite — no horizontal scale-out. Acceptable for the household-scale model.
- `better-sqlite3` is a native module: needs `python3 / make / g++` in the builder stage, and `pnpm.onlyBuiltDependencies` whitelist locally.
- The runner ships the builder's `node_modules` at `/app/migrate/node_modules` so `drizzle-kit migrate` can run on container start (drizzle-kit isn't traced into the standalone bundle, and its CLI tooling needs esbuild + friends). The standalone server keeps its own minimal `node_modules` at `/app`.
- Both Docker stages use `node:24-alpine` to keep a single libc (musl) — building on Debian + running on Alpine would require rebuilding the native binding in the runner.
