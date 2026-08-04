#!/usr/bin/env bash
# Ubuntu VPS — bir buyruq bilan o'rnatish (PM2 + Nginx)
exec bash "$(dirname "$0")/scripts/deploy/server-install-pm2.sh" "$@"
