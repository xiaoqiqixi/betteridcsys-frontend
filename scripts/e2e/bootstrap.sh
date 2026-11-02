#!/usr/bin/env bash
# Requires an empty disposable DB, the real backend binary and production config.
set -euo pipefail
: "${MYSQL_DSN:?Set the disposable DB DSN}"
case "$MYSQL_DSN" in */fe2_test\?*) ;; *) echo 'Refusing a database other than fe2_test' >&2; exit 1 ;; esac
artifacts/aster-api -migrate
export BOOTSTRAP_PASSWORD=Fe2-Local!2026-Deterministic
for identity in owner client reader; do
  export BOOTSTRAP_EMAIL="$identity@fe2.test" BOOTSTRAP_NAME="$identity" BOOTSTRAP_ROLE=admin
  if [ "$identity" = client ]; then export BOOTSTRAP_ROLE=customer; fi
  artifacts/aster-api -create-user
done
if [ -n "${MYSQL_SOCKET:-}" ]; then
  mysql --protocol=socket --socket="$MYSQL_SOCKET" -u root fe2_test < scripts/e2e/seed.sql
else
  mysql --protocol=tcp --host=127.0.0.1 --port="${MYSQL_PORT:-3306}" -u root fe2_test < scripts/e2e/seed.sql
fi
