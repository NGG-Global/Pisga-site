#!/usr/bin/env bash
# Applies the migrations to a throw-away local PostgreSQL database and runs the permission tests.
# Requires a local PostgreSQL server and a superuser connection. Never point this at Supabase.
#   PGTEST_PSQL  command used to reach the server (default: "psql -U postgres -h localhost")
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL=${PGTEST_PSQL:-psql -U postgres -h localhost}
DB=pisga_rls_test

$PSQL -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { $PSQL -q -v ON_ERROR_STOP=1 -d "$DB" -f "$1"; }

run tests/local-stubs.sql
for f in migrations/*.sql; do run "$f"; done
run tests/rls_test.sql
$PSQL -q -d postgres -c "drop database $DB"
