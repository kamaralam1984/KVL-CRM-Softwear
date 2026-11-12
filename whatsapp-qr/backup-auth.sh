#!/usr/bin/env bash
# Back up the linked-device session so a disk loss doesn't force a re-scan. Keeps the last 7. Run from cron, e.g.:
#   0 3 * * * /path/to/whatsapp-qr/backup-auth.sh
# The archive IS your WhatsApp login — keep the backup directory private (chmod 700) and off shared storage.
set -euo pipefail
cd "$(dirname "$0")"
AUTH="${WHATSAPP_QR_AUTH_DIR:-./auth}"
DEST="${WHATSAPP_QR_BACKUP_DIR:-$HOME/.kvl-wa-backups}"
[ -d "$AUTH" ] || { echo "no auth dir at $AUTH"; exit 1; }
umask 077
mkdir -p "$DEST"
tar czf "$DEST/wa-auth-$(date +%Y%m%d-%H%M%S).tgz" -C "$(dirname "$AUTH")" "$(basename "$AUTH")"
ls -1t "$DEST"/wa-auth-*.tgz | tail -n +8 | xargs -r rm --
echo "backup ok → $DEST"
