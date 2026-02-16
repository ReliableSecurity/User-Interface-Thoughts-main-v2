#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> Checking dependencies"
command -v node >/dev/null 2>&1 || { echo "Node.js not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm not found"; exit 1; }

echo "==> Installing dependencies"
npm ci

echo "==> Building client and server"
npm run build

echo "==> Checking database availability (no schema changes)"
if command -v pg_isready >/dev/null 2>&1; then
  if ! pg_isready -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-55432}" -U "${DB_USER:-ui_user}" >/dev/null 2>&1; then
    if command -v systemctl >/dev/null 2>&1; then
      echo "PostgreSQL not ready. Trying to start service..."
      systemctl start postgresql >/dev/null 2>&1 || true
    fi
    if ! pg_isready -h "${DB_HOST:-127.0.0.1}" -p "${DB_PORT:-55432}" -U "${DB_USER:-ui_user}" >/dev/null 2>&1; then
      echo "PostgreSQL is not ready. Start your local DB and retry."
      exit 1
    fi
  fi
else
  echo "pg_isready not found, skipping readiness check."
fi

if [ "${DB_MIGRATE:-1}" = "1" ]; then
  echo "==> Applying database schema (db:push)"
  npm run db:push
else
  echo "==> DB_MIGRATE=0, skipping schema sync"
fi

echo "==> Applying database schema"
npm run db:push

echo "==> Starting app on host"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-55432}"
export DB_USER="${DB_USER:-ui_user}"
export DATABASE_URL="${DATABASE_URL:-postgres://ui_user:ui_password@127.0.0.1:${DB_PORT}/ui_thoughts}"
export PORT="${PORT:-5000}"

LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

if [ "${START_APP:-1}" = "1" ]; then
  nohup node dist/index.cjs > "$LOG_DIR/app.log" 2>&1 &
  echo $! > "$LOG_DIR/app.pid"
else
  echo "==> START_APP=0, skipping app start"
fi

echo "==> Done"
echo "UI: http://localhost"
echo "App: http://localhost:${PORT}"
