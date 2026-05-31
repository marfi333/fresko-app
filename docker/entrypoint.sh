#!/bin/sh
set -e

mkdir -p "$(dirname "${DATABASE_PATH:-/app/data/fresko.db}")"

echo "[entrypoint] running drizzle-kit migrate…"
cd /app/migrate
node_modules/.bin/drizzle-kit migrate
cd /app
echo "[entrypoint] migrations complete"

echo "[entrypoint] starting Next.js server…"
exec "$@"
