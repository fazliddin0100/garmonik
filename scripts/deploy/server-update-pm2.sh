#!/usr/bin/env bash
# Kod yangilash — PM2
#
#   bash scripts/deploy/server-update-pm2.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

if [[ -d .git ]] && command -v git >/dev/null 2>&1; then
  log "git pull..."
  git pull --ff-only
fi

log "npm ci..."
npm ci

log "Migratsiya..."
npm run deploy:setup-db

log "Build..."
npm run build

log "PM2 restart..."
pm2 restart garmonik || pm2 start ecosystem.config.cjs
pm2 save

log "Tayyor."
pm2 status
