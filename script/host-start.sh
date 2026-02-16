#!/bin/sh
set -eu

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-ui_user}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    sleep 2
  done
else
  echo "pg_isready not found, skipping readiness check."
fi

echo "Running database schema sync..."
npm run db:push

echo "Starting app..."
NODE_ENV=production PORT="${PORT:-5000}" node dist/index.cjs
