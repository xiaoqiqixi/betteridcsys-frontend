#!/usr/bin/env bash
# Disposable Linux host only; MySQL 8.4 must already contain an empty fe2_test DB.
set -euo pipefail
cd "$(dirname "$0")/../.."
export APP_MODE=production APP_ORIGIN=https://localhost:5178 LISTEN_ADDR=127.0.0.1:18080
export SESSION_SECRET="$(cat artifacts/session-secret)"
export MYSQL_DSN="${MYSQL_DSN:-root@tcp(127.0.0.1:3306)/fe2_test?parseTime=true}"
export MYSQL_ALLOW_INSECURE=true
export PLUGIN_DIRECTORY=/opt/fe2/plugins PLUGIN_POLICY_FILE=/opt/fe2/policy.json
bash scripts/e2e/bootstrap.sh
sudo bash scripts/e2e/install-bank.sh "$PWD/artifacts" "$(id -u)" "$(id -g)"
artifacts/aster-api > artifacts/backend.log 2>&1 &
echo "$!" > artifacts/backend.pid
curl --fail --silent --show-error --retry 30 --retry-connrefused --retry-delay 1 \
  http://127.0.0.1:18080/healthz > /dev/null
