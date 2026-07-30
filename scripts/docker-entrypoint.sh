#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Klinika SQL migratsiyalari..."
  node ./node_modules/tsx/dist/cli.mjs scripts/apply-supabase-migrations.ts

  echo "Kassa Prisma schema..."
  node ./node_modules/prisma/build/index.js db push \
    --schema=prisma/kassa/schema.prisma \
    --skip-generate

  if [ "$RUN_DB_SEED" = "true" ]; then
    echo "Klinika seed..."
    node ./node_modules/tsx/dist/cli.mjs scripts/seed-postgres.ts
    echo "Kassa seed..."
    node ./node_modules/tsx/dist/cli.mjs prisma/kassa/seed.ts
  fi
fi

exec node server.js
