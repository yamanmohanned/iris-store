#!/bin/sh
# Container start: apply pending database migrations, then run the server (or the given command).
set -eu

if [ "${SKIP_MIGRATIONS:-0}" != "1" ]; then
  node /app/migrate.mjs
fi

exec "$@"
