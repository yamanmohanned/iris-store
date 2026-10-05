#!/usr/bin/env bash
# Local PostgreSQL for development/tests WITHOUT Docker (uses the system PostgreSQL binaries).
# Usage: pnpm db:local [start|stop|status|reset|psql]
# Creates databases "iris" (dev), "iris_test" (integration tests) and "iris_e2e" (browser tests).
set -euo pipefail

cmd="${1:-start}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
if [ -z "${PGBIN}" ] || [ ! -x "${PGBIN}/pg_ctl" ]; then
  PGBIN="$(dirname "$(command -v pg_ctl || echo /nonexistent/pg_ctl)")"
fi
[ -x "${PGBIN}/pg_ctl" ] || {
  echo "✖ PostgreSQL binaries not found (install PostgreSQL 16+ or use: docker compose up -d db)"
  exit 1
}

DATA_DIR="${PG_DATA_DIR:-$PWD/.data/postgres}"
PORT="${PG_PORT:-54329}"
ROLE="iris"
PASSWORD="${PG_DEV_PASSWORD:-iris_dev_password}"

# PostgreSQL refuses to run as root: delegate to the "postgres" system user when needed.
as_pg() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
psql_admin() { as_pg "${PGBIN}/psql" -h "${DATA_DIR}" -p "${PORT}" -U postgres -v ON_ERROR_STOP=1 -qtA "$@"; }

init_cluster() {
  echo "→ Initialising cluster in ${DATA_DIR}"
  mkdir -p "${DATA_DIR}"
  if [ "$(id -u)" = "0" ]; then chown -R postgres:postgres "$(dirname "${DATA_DIR}")"; fi
  as_pg "${PGBIN}/initdb" -D "${DATA_DIR}" -U postgres --auth-local=trust --auth-host=scram-sha-256 \
    --encoding=UTF8 --locale=C.UTF-8 >/dev/null
}

start() {
  [ -f "${DATA_DIR}/PG_VERSION" ] || init_cluster
  if as_pg "${PGBIN}/pg_ctl" -D "${DATA_DIR}" status >/dev/null 2>&1; then
    echo "✓ PostgreSQL already running on port ${PORT}"
  else
    as_pg "${PGBIN}/pg_ctl" -D "${DATA_DIR}" -l "${DATA_DIR}/server.log" -w \
      -o "-p ${PORT} -k ${DATA_DIR} -c listen_addresses=localhost" start >/dev/null
    echo "✓ PostgreSQL started on port ${PORT}"
  fi
  if [ "$(psql_admin -c "SELECT 1 FROM pg_roles WHERE rolname='${ROLE}'")" != "1" ]; then
    psql_admin -c "CREATE ROLE ${ROLE} LOGIN PASSWORD '${PASSWORD}'"
  fi
  for db in iris iris_test iris_e2e; do
    if [ "$(psql_admin -c "SELECT 1 FROM pg_database WHERE datname='${db}'")" != "1" ]; then
      psql_admin -c "CREATE DATABASE ${db} OWNER ${ROLE}"
      echo "  created database ${db}"
    fi
  done
  echo "  DATABASE_URL=postgres://${ROLE}:${PASSWORD}@localhost:${PORT}/iris"
  echo "  DATABASE_URL_TEST=postgres://${ROLE}:${PASSWORD}@localhost:${PORT}/iris_test"
  echo "  DATABASE_URL_E2E=postgres://${ROLE}:${PASSWORD}@localhost:${PORT}/iris_e2e"
}

case "${cmd}" in
  start) start ;;
  stop) as_pg "${PGBIN}/pg_ctl" -D "${DATA_DIR}" stop -m fast ;;
  status) as_pg "${PGBIN}/pg_ctl" -D "${DATA_DIR}" status ;;
  reset)
    as_pg "${PGBIN}/pg_ctl" -D "${DATA_DIR}" stop -m fast >/dev/null 2>&1 || true
    rm -rf "${DATA_DIR}"
    start
    ;;
  psql) as_pg "${PGBIN}/psql" -h "${DATA_DIR}" -p "${PORT}" -U postgres iris ;;
  *)
    echo "usage: $0 [start|stop|status|reset|psql]"
    exit 1
    ;;
esac
