#!/usr/bin/env bash
# Ubuntu VPS — bir buyruq bilan o'rnatish (Docker + PostgreSQL ichida + ilova).
exec bash "$(dirname "$0")/scripts/deploy/server-install.sh" "$@"
