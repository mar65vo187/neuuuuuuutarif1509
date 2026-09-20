#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

mkdir -p .tmp
DUMP_PATH="$PWD/.tmp/tarifwerk-recovery.dump"
RESTORE_DB="tarifwerk_restore_${GITHUB_RUN_ID:-local}_${GITHUB_RUN_ATTEMPT:-1}"
RESTORE_DB="$(printf '%s' "$RESTORE_DB" | tr -cd 'A-Za-z0-9_')"

ADMIN_URL="$(node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/postgres";u.search="";console.log(u.toString())')"
RESTORE_URL="$(RESTORE_DB="$RESTORE_DB" node -e 'const u=new URL(process.env.DATABASE_URL);u.pathname="/"+process.env.RESTORE_DB;u.search="";console.log(u.toString())')"

psql17() {
  docker run --rm --network host postgres:17 psql "$@"
}

cleanup() {
  set +e
  psql17 "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '$RESTORE_DB' and pid <> pg_backend_pid();" >/dev/null 2>&1
  psql17 "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "drop database if exists \"$RESTORE_DB\";" >/dev/null 2>&1
  rm -f "$DUMP_PATH"
}
trap cleanup EXIT

psql17 "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "insert into audit_events (actor_employee_id, action, entity_type, entity_id, new_values, created_at) values (null, 'ci.recovery.marker', 'system', null, '{\"source\":\"quality-workflow\"}'::jsonb, now());" >/dev/null

docker run --rm --network host -v "$PWD/.tmp:/backup" postgres:17 \
  pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file=/backup/tarifwerk-recovery.dump

psql17 "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "create database \"$RESTORE_DB\";" >/dev/null

docker run --rm --network host -v "$PWD/.tmp:/backup" postgres:17 \
  pg_restore --dbname="$RESTORE_URL" --no-owner --no-acl --exit-on-error /backup/tarifwerk-recovery.dump

DATABASE_URL="$RESTORE_URL" node scripts/verify-migrations.mjs

marker_count="$(psql17 "$RESTORE_URL" -tA -v ON_ERROR_STOP=1 -c "select count(*) from audit_events where action = 'ci.recovery.marker' and new_values->>'source' = 'quality-workflow';" | tr -d '[:space:]')"
if [ -z "$marker_count" ] || [ "$marker_count" -lt 1 ]; then
  echo "Restore verification failed: recovery marker missing." >&2
  exit 1
fi

echo "PostgreSQL backup/restore smoke test passed."
