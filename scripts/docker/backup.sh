#!/bin/sh
# Daily PostgreSQL dump and weekly archive of uploaded images, kept BACKUP_KEEP_DAYS days.
# Copy ./backups off the server regularly: a backup on the same disk does not survive a lost disk.
set -u
KEEP="${BACKUP_KEEP_DAYS:-14}"
mkdir -p /backups
last_media=0

while true; do
  stamp=$(date -u +%Y%m%d-%H%M%S)
  if pg_dump --format=custom --file="/backups/db-$stamp.dump.tmp"; then
    mv "/backups/db-$stamp.dump.tmp" "/backups/db-$stamp.dump"
    echo "$(date -u +%FT%TZ) database backup: db-$stamp.dump"
  else
    rm -f "/backups/db-$stamp.dump.tmp"
    echo "$(date -u +%FT%TZ) database backup FAILED" >&2
  fi

  now=$(date +%s)
  if [ -d /media ] && [ $((now - last_media)) -ge 604800 ]; then
    if tar -czf "/backups/media-$stamp.tar.gz.tmp" -C /media .; then
      mv "/backups/media-$stamp.tar.gz.tmp" "/backups/media-$stamp.tar.gz"
      echo "$(date -u +%FT%TZ) media backup: media-$stamp.tar.gz"
      last_media=$now
    else
      rm -f "/backups/media-$stamp.tar.gz.tmp"
      echo "$(date -u +%FT%TZ) media backup FAILED" >&2
    fi
  fi

  find /backups -maxdepth 1 -name 'db-*.dump' -mtime +"$KEEP" -delete
  find /backups -maxdepth 1 -name 'media-*.tar.gz' -mtime +"$((KEEP * 4))" -delete
  sleep 86400
done
