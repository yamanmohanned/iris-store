#!/bin/sh
# Scheduled jobs: deliver due emails every minute, clean up once a day.
# Runs in the `cron` service of docker-compose.prod.yml; talks to the store on the internal network.
set -u
BASE="${APP_INTERNAL_URL:-http://app:3000}"

run() {
  if ! curl -fsS -m 120 -o /dev/null -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" "$BASE/api/cron/$1"; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) job '$1' failed" >&2
  fi
}

last_cleanup=0
while true; do
  run outbox
  now=$(date +%s)
  if [ $((now - last_cleanup)) -ge 86400 ]; then
    run cleanup
    last_cleanup=$now
  fi
  sleep 60
done
