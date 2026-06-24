#!/bin/bash
# PostgreSQL Backup Script - runs via cron: 0 2 * * * /app/scripts/backup.sh

BACKUP_DIR="/var/backups/fabric"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="fabric_automation"
DB_USER="fabric_user"
KEEP_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting backup..."

# Database backup
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h localhost \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-password \
  --format=custom \
  --compress=9 \
  -f "$BACKUP_DIR/db_${DATE}.dump"

# Upload backups older than KEEP_DAYS
find "$BACKUP_DIR" -name "*.dump" -mtime +$KEEP_DAYS -delete

echo "[$(date)] Backup complete: db_${DATE}.dump"

# Redis backup
redis-cli --pass "$REDIS_PASSWORD" BGSAVE
cp /var/lib/redis/dump.rdb "$BACKUP_DIR/redis_${DATE}.rdb"

echo "[$(date)] All backups done"
