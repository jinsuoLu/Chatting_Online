# Backup and Restore

Run `docker compose exec postgres pg_dump --format=custom -U "$POSTGRES_USER" "$POSTGRES_DB" > backups/chatting_online-$(Get-Date -Format yyyy-MM-dd).dump` (PowerShell) or use `scripts/backup.sh` in a scheduled job. Retention is controlled by `BACKUP_RETENTION_DAYS`; backups are ignored by Git.

Restore into a stopped application with `docker compose exec -T postgres pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" < backups/file.dump`, then run migrations and restart. Test restores regularly and alert on non-zero backup exit codes.

The Compose ackup service writes a custom PostgreSQL dump once every 24 hours, names it with the UTC date, prunes it after the configured retention period, and posts to BACKUP_ALERT_WEBHOOK on failure when configured.
