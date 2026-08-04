#!/bin/sh
set -e

wait_for_db() {
  if [ -z "$DATABASE_URL" ]; then
    return 0
  fi

  echo "PostgreSQL tayyor bo'lguncha kutilmoqda..."
  attempt=0
  max_attempts=60

  while [ "$attempt" -lt "$max_attempts" ]; do
    if node -e "
      const { Client } = require('pg');
      const ssl =
        process.env.DATABASE_SSL === 'false' ? false : undefined;
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl,
      });
      client
        .connect()
        .then(() => client.end())
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    "; then
      echo "PostgreSQL tayyor."
      return 0
    fi

    attempt=$((attempt + 1))
    sleep 2
  done

  echo "PostgreSQL ga ulanib bo'lmadi (120 soniya timeout)."
  exit 1
}

wait_for_db

if [ -n "$DATABASE_URL" ]; then
  echo "Preflight..."
  node scripts/deploy/preflight-production.mjs

  echo "Klinika SQL migratsiyalari..."
  node ./node_modules/tsx/dist/cli.mjs scripts/apply-supabase-migrations.ts

  echo "Kassa schema..."
  node ./node_modules/prisma/build/index.js db push \
    --schema=prisma/kassa/schema.prisma \
    --skip-generate

  echo "Kassa import (server garmonik_kassa yoki SQL dump)..."
  node scripts/deploy/kassa-import-only.mjs

  echo "Bootstrap (admin yo'q bo'lsa avtomatik seed)..."
  node ./node_modules/tsx/dist/cli.mjs scripts/deploy/bootstrap-if-empty.ts
fi

exec node server.js
