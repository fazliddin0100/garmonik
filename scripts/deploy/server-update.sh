#!/usr/bin/env bash
# GitHubdan yangi kod olib Docker stack ni qayta build qilish.
#
#   bash scripts/deploy/server-update.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

compose() {
  if docker compose version >/dev/null 2>&1; then
    if [[ "${EUID:-$(id -u)}" -eq 0 ]] || groups | grep -q docker; then
      docker compose "$@"
    else
      sudo docker compose "$@"
    fi
  else
    echo "[XATO] Docker Compose topilmadi." >&2
    exit 1
  fi
}

if [[ -d .git ]] && command -v git >/dev/null 2>&1; then
  log "git pull..."
  git pull --ff-only
fi

log "Docker qayta build..."
compose up -d --build

log "Holat:"
compose ps

APP_PORT="$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2- || echo 3000)"
log "Tekshirish: curl -I http://127.0.0.1:${APP_PORT}/auth/login"
