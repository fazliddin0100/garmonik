#!/usr/bin/env bash
# Domen https://gormonik-plus-klinik.uz uchun to'liq sozlash:
#   .env → NEXT_PUBLIC_APP_URL
#   Docker qayta build
#   Nginx proxy → 127.0.0.1:3000
#
#   sudo bash scripts/deploy/setup-domain.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DOMAIN="${APP_DOMAIN:-https://gormonik-plus-klinik.uz}"
DOMAIN="${DOMAIN%/}"
DOMAIN_HOST="${DOMAIN#https://}"
DOMAIN_HOST="${DOMAIN_HOST#http://}"
APP_PORT="${APP_PORT:-3000}"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }

compose() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]] || groups 2>/dev/null | grep -q docker; then
    docker compose "$@"
  else
    sudo docker compose "$@"
  fi
}

ensure_env() {
  if [[ ! -f .env ]]; then
    cp .env.docker.example .env
    log ".env yaratildi (.env.docker.example dan)"
  fi

  if grep -q '^NEXT_PUBLIC_APP_URL=' .env; then
    sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${DOMAIN}|" .env
  else
    printf 'NEXT_PUBLIC_APP_URL=%s\n' "$DOMAIN" >> .env
  fi

  if grep -q '^KASSA_LEGACY_HOST=' .env; then
    sed -i 's|^KASSA_LEGACY_HOST=.*|KASSA_LEGACY_HOST=gormonik-plus-clinik-kassa.uz|' .env
  else
    printf 'KASSA_LEGACY_HOST=gormonik-plus-clinik-kassa.uz\n' >> .env
  fi

  if ! grep -q '^NODE_ENV=' .env; then
    printf 'NODE_ENV=production\n' >> .env
  fi

  log ".env: NEXT_PUBLIC_APP_URL=${DOMAIN}"
}

setup_nginx() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    log "Nginx uchun sudo: sudo bash scripts/deploy/setup-domain.sh"
    return 0
  fi

  apt-get update -qq
  apt-get install -y nginx

  cat > "/etc/nginx/sites-available/gormonik" <<EOF
# ${DOMAIN_HOST} — Garmonik (Docker 127.0.0.1:${APP_PORT})

server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_HOST} www.${DOMAIN_HOST};

    client_max_body_size 32m;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

  ln -sf /etc/nginx/sites-available/gormonik /etc/nginx/sites-enabled/gormonik
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
  log "Nginx: ${DOMAIN_HOST} → 127.0.0.1:${APP_PORT}"
}

rebuild_app() {
  log "Docker qayta build (domen build vaqtida ham ishlatiladi)..."
  compose up -d --build

  local url="http://127.0.0.1:${APP_PORT}/auth/login"
  log "Kutilmoqda: ${url}"
  local i
  for i in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Ilova ishga tushdi."
      return 0
    fi
    sleep 5
  done
  warn "Ilova hali javob bermadi. Oxirgi loglar:"
  compose logs app --tail 40 || true
  return 1
}

print_summary() {
  cat <<EOF

============================================================
  Domen sozlandi: ${DOMAIN}
============================================================

  Brauzer : ${DOMAIN}/auth/login
  Admin   : admin / admin123

  HTTPS (bir marta):
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d ${DOMAIN_HOST} -d www.${DOMAIN_HOST}

  Tekshirish:
    curl -I http://127.0.0.1:${APP_PORT}/auth/login
    curl -I http://${DOMAIN_HOST}/auth/login

============================================================
EOF
}

main() {
  log "Domen sozlash: ${DOMAIN}"
  ensure_env
  rebuild_app || true
  setup_nginx
  print_summary
}

main "$@"
