#!/usr/bin/env bash
# Garmonik — Ubuntu VPS bir martalik o'rnatish.
# PostgreSQL, Node.js va barcha dependency faqat Docker ichida — hostda alohida o'rnatish shart emas.
#
#   git clone <repo-url> garmonik && cd garmonik
#   bash scripts/deploy/server-install.sh
#
# Ixtiyoriy muhit o'zgaruvchilari:
#   APP_DOMAIN=https://gormonik-plus-klinik.uz
#   WITH_NGINX=0          — nginx o'rnatmaslik (default: 1)
#   SKIP_DOCKER_INSTALL=1 — Docker allaqachon o'rnatilgan bo'lsa

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

APP_DOMAIN="${APP_DOMAIN:-https://gormonik-plus-klinik.uz}"
APP_DOMAIN="${APP_DOMAIN%/}"
KASSA_LEGACY_HOST="${KASSA_LEGACY_HOST:-gormonik-plus-clinik-kassa.uz}"
APP_PORT="${APP_PORT:-3000}"

log() { printf '\n[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
warn() { printf '[WARN] %s\n' "$*" >&2; }
die() { printf '[XATO] %s\n' "$*" >&2; exit 1; }

need_root_for() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    die "$1 uchun sudo kerak: sudo bash scripts/deploy/server-install.sh"
  fi
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker allaqachon o'rnatilgan: $(docker --version)"
    return
  fi

  if [[ "${SKIP_DOCKER_INSTALL:-0}" == "1" ]]; then
    die "Docker topilmadi. O'rnating yoki SKIP_DOCKER_INSTALL=0 qiling."
  fi

  need_root_for "Docker o'rnatish"
  log "Docker o'rnatilmoqda (get.docker.com)..."
  apt-get update -qq
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
  if [[ -n "${SUDO_USER:-}" ]] && id "$SUDO_USER" >/dev/null 2>&1; then
    usermod -aG docker "$SUDO_USER"
    log "Foydalanuvchi docker guruhiga qo'shildi: ${SUDO_USER} (qayta login qiling)"
  fi
  log "Docker o'rnatildi."
}

ensure_compose() {
  if docker compose version >/dev/null 2>&1; then
    log "Docker Compose: $(docker compose version --short 2>/dev/null || docker compose version)"
    return
  fi
  need_root_for "Docker Compose"
  log "Docker Compose plugin o'rnatilmoqda..."
  apt-get update -qq
  apt-get install -y docker-compose-plugin
}

ensure_git() {
  if command -v git >/dev/null 2>&1; then
    return
  fi
  need_root_for "Git o'rnatish"
  apt-get update -qq
  apt-get install -y git
}

random_secret() {
  local len="${1:-32}"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c "$len"
  else
    tr -dc 'a-zA-Z0-9' </dev/urandom | head -c "$len"
  fi
}

write_env_if_missing() {
  if [[ -f .env ]]; then
    log ".env mavjud — saqlab qolindi (parollar o'zgartirilmaydi)."
    return
  fi

  [[ -f .env.docker.example ]] || die ".env.docker.example topilmadi."

  local pg_pass jwt
  pg_pass="$(random_secret 24)"
  jwt="$(random_secret 48)"

  cp .env.docker.example .env

  sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_pass}|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt}|" .env
  sed -i "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=${APP_DOMAIN}|" .env
  sed -i "s|^APP_PORT=.*|APP_PORT=${APP_PORT}|" .env

  if grep -q '^KASSA_LEGACY_HOST=' .env; then
    sed -i "s|^# KASSA_LEGACY_HOST=.*|KASSA_LEGACY_HOST=${KASSA_LEGACY_HOST}|" .env
    sed -i "s|^KASSA_LEGACY_HOST=.*|KASSA_LEGACY_HOST=${KASSA_LEGACY_HOST}|" .env
  else
    printf '\nKASSA_LEGACY_HOST=%s\n' "$KASSA_LEGACY_HOST" >> .env
  fi

  if ! grep -q '^NODE_ENV=' .env; then
    printf 'NODE_ENV=production\n' >> .env
  fi

  log ".env yaratildi (tasodifiy POSTGRES_PASSWORD va JWT_SECRET)."
  log "Admin login: admin / admin123 (SEED_ADMIN_* .env da)"
}

run_compose() {
  log "Docker image build va konteynerlar ishga tushirilmoqda..."
  log "Birinchi marta 5–15 daqiqa davom etishi mumkin."

  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    docker compose up -d --build
  elif groups | grep -q docker; then
    docker compose up -d --build
  else
    warn "Foydalanuvchi docker guruhida emas — sudo ishlatiladi."
    sudo docker compose up -d --build
  fi
}

wait_for_app() {
  local url="http://127.0.0.1:${APP_PORT}/api/public/clinic-info"
  log "Ilova tayyor bo'lguncha kutilmoqda: ${url}"

  local i
  for i in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Ilova ishga tushdi."
      return 0
    fi
    sleep 5
  done

  warn "Ilova hali javob bermadi. Log: docker compose logs -f app"
  return 1
}

setup_nginx() {
  WITH_NGINX="${WITH_NGINX:-1}"
  [[ "$WITH_NGINX" == "1" ]] || return 0

  need_root_for "Nginx"
  log "Nginx o'rnatilmoqda..."

  apt-get update -qq
  apt-get install -y nginx

  local conf_src="${ROOT_DIR}/deploy/nginx/gormonik-plus-klinik.uz.conf.example"
  [[ -f "$conf_src" ]] || die "Nginx namuna topilmadi: $conf_src"

  cp "$conf_src" /etc/nginx/sites-available/garmonik
  ln -sf /etc/nginx/sites-available/garmonik /etc/nginx/sites-enabled/garmonik
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  log "Nginx sozlandi → http://127.0.0.1:${APP_PORT}"
  log "HTTPS: sudo apt install -y certbot python3-certbot-nginx"
  log "       sudo certbot --nginx -d gormonik-plus-klinik.uz -d www.gormonik-plus-klinik.uz"
}

print_summary() {
  cat <<EOF

============================================================
  Garmonik o'rnatish tugadi
============================================================

  PostgreSQL : Docker ichida (alohida o'rnatish shart emas)
  Ilova      : http://127.0.0.1:${APP_PORT}
  Domen      : ${APP_DOMAIN}/auth/login

  Admin      : admin / admin123

  Foydali buyruqlar:
    docker compose ps
    docker compose logs -f app
    bash scripts/deploy/server-update.sh

  Keyingi yangilash (GitHubdan):
    git pull && bash scripts/deploy/server-update.sh

============================================================
EOF
}

main() {
  log "Garmonik server o'rnatish — ${ROOT_DIR}"

  if [[ "$(uname -s)" != "Linux" ]]; then
    warn "Skript Ubuntu/Debian Linux uchun. Boshqa OS da Docker qo'lda sozlang."
  fi

  ensure_git
  install_docker
  ensure_compose
  write_env_if_missing
  run_compose
  wait_for_app || true
  setup_nginx
  print_summary
}

main "$@"
