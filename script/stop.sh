#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Stopping app"
if [ -f "$ROOT_DIR/logs/app.pid" ]; then
  PID="$(cat "$ROOT_DIR/logs/app.pid" || true)"
  if [ -n "${PID:-}" ] && kill -0 "$PID" >/dev/null 2>&1; then
    kill "$PID"
    sleep 1
    if kill -0 "$PID" >/dev/null 2>&1; then
      kill -9 "$PID" || true
    fi
    echo "Stopped app pid $PID"
  else
    echo "No running app process found"
  fi
  rm -f "$ROOT_DIR/logs/app.pid"
else
  echo "No PID file found"
fi

echo "==> Done"
