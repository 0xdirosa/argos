#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

# Load .env if exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
elif [ -f "$PROJECT_DIR/.env.local" ]; then
  set -a
  source "$PROJECT_DIR/.env.local"
  set +a
fi

echo "======================================"
echo "Argos Worker — $(date)"
echo "Project: $PROJECT_DIR"
echo "Node: $(node --version)"
echo "======================================"

exec npx tsx "$SCRIPT_DIR/worker.ts" >> "$LOG_DIR/worker.log" 2>&1
