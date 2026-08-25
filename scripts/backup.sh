#!/bin/sh
set -eu
file="/backups/chatting_online-$(date -u +%Y-%m-%d).dump"
pg_dump --format=custom --file="$file" "$DATABASE_URL"
find /backups -type f -name '*.dump' -mtime "+${BACKUP_RETENTION_DAYS:-14}" -delete
