#!/usr/bin/env bash
# Run as root ONLY inside a disposable Linux VM / CI runner.
set -euo pipefail
artifact_dir=${1:?artifacts directory}
core_uid=${2:?Core UID}
core_gid=${3:?Core GID}
test -s "$artifact_dir/bank-manifest.json"
worker_uid=28002
id fe2-bank >/dev/null 2>&1 || useradd --uid "$worker_uid" --gid "$core_gid" --no-create-home --shell /usr/sbin/nologin fe2-bank
install -d -m 755 /run/fe2/plugins/payment.bank-transfer/1.0.0 /run/aster-payment
install -m 755 "$artifact_dir/bank-transfer" /run/fe2/plugins/payment.bank-transfer/1.0.0/plugin
install -m 644 "$artifact_dir/bank-manifest.json" /run/fe2/plugins/payment.bank-transfer/1.0.0/manifest.json
install -d -m 750 -o "$worker_uid" -g "$core_gid" /run/aster-payment/bank /run/credentials/fe2-bank
python3 - "$core_uid" "$worker_uid" <<'PY'
import hashlib,json,sys
from pathlib import Path
manifest=Path('/run/fe2/plugins/payment.bank-transfer/1.0.0/manifest.json')
policy={'schema':1,'revision':1,'payments':[{'slot':'bank','enabled':True,'id':'payment.bank-transfer','version':'1.0.0','manifest_sha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),'worker_uid':int(sys.argv[2]),'client_uid':int(sys.argv[1]),'socket':'/run/aster-payment/bank/plugin.sock','allowed_targets':[],'merchant_id':'fe2-bank'}]}
Path('/run/fe2/policy.json').write_text(json.dumps(policy))
Path('/run/credentials/fe2-bank/payment_config.json').write_text(json.dumps({'merchant_id':'fe2-bank','instructions':'FE2 TEST BANK — no real transfer. Reference the invoice number.'}))
PY
chmod 644 /run/fe2/policy.json
# Core rejects writable/non-root ancestors even when the leaf is root-owned.
# Hosted runners may give /opt to the runner; use our own protected /run subtree.
stat -c '%n owner=%u group=%g mode=%a' /opt /run /run/fe2 /run/fe2/policy.json
python3 - <<'PYVERIFY'
from pathlib import Path
import stat
for leaf in [Path('/run/fe2/policy.json'), Path('/run/fe2/plugins/payment.bank-transfer/1.0.0/plugin')]:
    for path in [leaf, *leaf.parents]:
        info = path.lstat()
        if info.st_uid != 0 or info.st_mode & 0o6022 or stat.S_ISLNK(info.st_mode):
            raise SystemExit(f'Unprotected plugin path: {path}')
        if not stat.S_ISDIR(info.st_mode) and info.st_nlink != 1:
            raise SystemExit(f'Linked plugin file: {path}')
print('Verified root-owned plugin and policy ancestry')
PYVERIFY
chown "$worker_uid:$core_gid" /run/credentials/fe2-bank/payment_config.json
chmod 600 /run/credentials/fe2-bank/payment_config.json
runner=()
if [ "$(uname -m)" = aarch64 ]; then runner=(/usr/bin/qemu-x86_64-static); fi
systemctl stop fe2-bank.service 2>/dev/null || true
systemctl reset-failed fe2-bank.service 2>/dev/null || true
# systemd keeps the genuine plugin running under a different UID from Core.
systemd-run --unit=fe2-bank --uid="$worker_uid" --gid="$core_gid" \
  --setenv=CREDENTIALS_DIRECTORY=/run/credentials/fe2-bank \
  "${runner[@]}" /run/fe2/plugins/payment.bank-transfer/1.0.0/plugin \
  --socket=/run/aster-payment/bank/plugin.sock --client-uid="$core_uid" --gateway-id=bank --merchant-id=fe2-bank
