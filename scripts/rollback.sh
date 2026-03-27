#!/bin/bash
# rollback.sh — Restore previous .next build and restart the app
#
# Usage:  ssh into the VPS and run:
#   cd /var/www/pulse-radio && bash scripts/rollback.sh
#
# This script restores the single previous build backup (.next.backup)
# created during the last deployment and restarts pm2.

set -euo pipefail

APP_DIR="/var/www/pulse-radio"
cd "$APP_DIR"

if [ ! -d .next.backup ]; then
  echo "ERROR: No .next.backup found — nothing to roll back to."
  exit 1
fi

echo "Rolling back to previous build..."

rm -rf .next
mv .next.backup .next

pm2 startOrRestart ecosystem.config.js --env production

# Verify the rollback worked
sleep 5
if curl --fail --silent --max-time 10 http://localhost:3000/ > /dev/null 2>&1; then
  echo "Rollback successful — app is healthy."
else
  echo "WARNING: App may still be unhealthy after rollback. Check logs with: pm2 logs pulse-radio"
  exit 1
fi
