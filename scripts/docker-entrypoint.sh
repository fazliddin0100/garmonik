#!/bin/sh
set -e

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
