FROM postgres:16-alpine
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh
CMD ["/bin/sh", "-c", "while true; do /usr/local/bin/backup.sh || { echo backup_failed >&2; [ -z \"$BACKUP_ALERT_WEBHOOK\" ] || wget -qO- --post-data='backup failed' \"$BACKUP_ALERT_WEBHOOK\"; }; sleep 86400; done"]
