#!/usr/bin/env bash
# Ubuntu VPS — Node.js + PostgreSQL + PM2 + Nginx
#
#   git clone <repo> garmonik && cd garmonik
#   sudo bash install.sh
#
# Ixtiyoriy:
#   APP_DOMAIN=https://gormonik-plus-klinik.uz
#   SKIP_PG_INSTALL=1     — PostgreSQL allaqachon o'rnatilgan

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

APP_DOMAIN="${APP_DOMAIN:-https://gormonik-plus-klinik.uz}"
APP_DOMAIN="${APP_DOMAIN%/}"
DOMAIN_HOST="${APP_DOMAIN#https://}"
DOMAIN_HOST="${DOMAIN_HOST#http://}"
APP_PORT="${APP_PORT:-3000}"
PG_USER="${POSTGRES_USER:-garmonik}"
PG_DB="${POSTGRES_DB:-garmonik}"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }

need_root() {
  [[ "${EUID:-$(id -u)}" -eq 0 ]] || {
    echo "sudo kerak: sudo bash install.sh" >&2
    exit 1
  }
}

random_secret() {
  local len="${1:-32}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$len"
  else
    tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$len"
  fi
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    local major
    major="$(node -p "process.versions.node.split('.')[0]")"
    if [[ "$major" -ge 20 ]]; then
      log "Node.js: $(node -v)"
      return
    fi
    warn "Node.js 20+ kerak (hozir: $(node -v))"
  fi

  log "Node.js 20 o'rnatilmoqda..."
  apt-get update -qq
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  log "Node.js: $(node -v)"
}

install_postgresql() {
  [[ "${SKIP_PG_INSTALL:-0}" == "1" ]] && return 0

  if command -v psql >/dev/null 2>&1; then
    log "PostgreSQL allaqachon o'rnatilgan."
  else
    log "PostgreSQL o'rnatilmoqda..."
    apt-get update -qq
    apt-get install -y postgresql postgresql-contrib
    systemctl enable --now postgresql
  fi

  local pg_pass="${POSTGRES_PASSWORD:-}"
  if [[ -z "$pg_pass" ]] && [[ -f .env ]]; then
    pg_pass="$(grep -E '^POSTGRES_PASSWORD=' .env 2>/dev/null | cut -d= -f2- || true)"
  fi
  if [[ -z "$pg_pass" ]]; then
    pg_pass="$(random_secret 24)"
    export POSTGRES_PASSWORD="$pg_pass"
  fi

  log "PostgreSQL foydalanuvchi/baza: ${PG_USER} / ${PG_DB}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<EOSQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${PG_USER}') THEN
    CREATE ROLE ${PG_USER} LOGIN PASSWORD '${pg_pass}';
  ELSE
    ALTER ROLE ${PG_USER} WITH PASSWORD '${pg_pass}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE ${PG_DB} OWNER ${PG_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PG_DB}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${PG_DB} TO ${PG_USER};
EOSQL

  log "PostgreSQL stub rollar (RLS migratsiyalari)..."
  sudo -u postgres psql -d "${PG_DB}" -v ON_ERROR_STOP=1 \
    -f "${ROOT_DIR}/scripts/deploy/postgres-stub-roles.sql"

  export GENERATED_PG_PASS="$pg_pass"
}

write_env() {
  if [[ ! -f .env ]]; then
    [[ -f .env.example ]] || { echo ".env.example topilmadi" >&2; exit 1; }
    cp .env.example .env
    log ".env yaratildi"
  fi

  local pg_pass="${GENERATED_PG_PASS:-}"
  if [[ -z "$pg_pass" ]]; then
    pg_pass="$(grep -E '^POSTGRES_PASSWORD=' .env 2>/dev/null | cut -d= -f2- || random_secret 24)"
  fi

  local jwt
  jwt="$(grep -E '^JWT_SECRET=' .env 2>/dev/null | cut -d= -f2- || true)"
  if [[ -z "$jwt" ]] || [[ "$jwt" == *"bu-yerga"* ]] || [[ ${#jwt} -lt 32 ]]; then
    jwt="$(random_secret 48)"
  fi

  local db_url="postgresql://${PG_USER}:${pg_pass}@localhost:5432/${PG_DB}"

  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${db_url}|" .env
  sed -i 's|^DATABASE_SSL=.*|DATABASE_SSL=false|' .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt}|" .env
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_DOMAIN}|" .env
  sed -i 's|^NODE_ENV=.*|NODE_ENV=production|' .env
  sed -i "s|^PORT=.*|PORT=${APP_PORT}|" .env

  if grep -q '^KASSA_LEGACY_HOST=' .env; then
    sed -i 's|^KASSA_LEGACY_HOST=.*|KASSA_LEGACY_HOST=gormonik-plus-clinik-kassa.uz|' .env
  fi

  if ! grep -q '^POSTGRES_PASSWORD=' .env; then
    printf 'POSTGRES_PASSWORD=%s\n' "$pg_pass" >> .env
  else
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_pass}|" .env
  fi

  if grep -q '^KASSA_AUTO_IMPORT=' .env; then
    sed -i 's|^KASSA_AUTO_IMPORT=.*|KASSA_AUTO_IMPORT=true|' .env
  else
    printf 'KASSA_AUTO_IMPORT=true\n' >> .env
  fi

  if grep -q '^KASSA_IMPORT_SQL=' .env; then
    sed -i 's|^KASSA_IMPORT_SQL=.*|KASSA_IMPORT_SQL=./garmonik_kassa.sql|' .env
  else
    printf 'KASSA_IMPORT_SQL=./garmonik_kassa.sql\n' >> .env
  fi

  log ".env yangilandi (DATABASE_URL, JWT, domen, kassa import)"
}

install_app_deps() {
  log "npm paketlar o'rnatilmoqda..."
  npm ci
}

setup_database() {
  log "Baza migratsiya + admin seed..."
  npm run deploy:install
}

build_app() {
  log "Next.js build..."
  npm run build
}

install_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    log "PM2 o'rnatilmoqda..."
    npm install -g pm2
  fi

  local run_user="${SUDO_USER:-root}"

  pm2 delete garmonik 2>/dev/null || true
  pm2 start ecosystem.config.cjs
  pm2 save

  if [[ "$run_user" != "root" ]]; then
    env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$run_user" --hp "$(eval echo ~"$run_user")" || true
  else
    pm2 startup || true
  fi

  log "PM2: garmonik ishga tushdi (foydalanuvchi: ${run_user})"
}

setup_nginx() {
  log "Nginx sozlanmoqda..."
  apt-get update -qq
  apt-get install -y nginx

  cat > /etc/nginx/sites-available/gormonik <<EOF
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
    }
}
EOF

  ln -sf /etc/nginx/sites-available/gormonik /etc/nginx/sites-enabled/gormonik
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

wait_for_app() {
  local url="http://127.0.0.1:${APP_PORT}/auth/login"
  log "Kutilmoqda: ${url}"
  local i
  for i in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Ilova javob berdi."
      return 0
    fi
    sleep 3
  done
  warn "Ilova hali javob bermadi. pm2 logs garmonik"
  pm2 logs garmonik --lines 30 --nostream || true
  return 1
}

print_summary() {
  cat <<EOF

============================================================
  Garmonik — PM2 + Nginx
============================================================

  Brauzer : ${APP_DOMAIN}/auth/login
  Admin   : admin / admin123

  PM2     : pm2 status | pm2 logs garmonik | pm2 restart garmonik
  Nginx   : sudo systemctl status nginx

  HTTPS:
    sudo apt install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d ${DOMAIN_HOST} -d www.${DOMAIN_HOST}

  Yangilash:
    bash scripts/deploy/server-update-pm2.sh

============================================================
EOF
}

main() {
  need_root
  log "PM2 o'rnatish — ${ROOT_DIR}"
  apt-get update -qq
  apt-get install -y git curl ca-certificates build-essential
  install_node
  install_postgresql
  write_env
  install_app_deps
  setup_database
  build_app
  install_pm2
  setup_nginx
  wait_for_app || true
  print_summary
}

main "$@"
