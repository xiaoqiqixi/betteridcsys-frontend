#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root"
commit=$(node -p 'JSON.parse(require("fs").readFileSync("compatibility.json","utf8")).source_commit')
repository=$(node -p 'JSON.parse(require("fs").readFileSync("compatibility.json","utf8")).backend_repository')
bank_commit=$(node -p 'JSON.parse(require("fs").readFileSync("tests/e2e/bank-transfer-source.json","utf8")).source_commit')
bank_repository=$(node -p 'JSON.parse(require("fs").readFileSync("tests/e2e/bank-transfer-source.json","utf8")).repository')
mkdir -p artifacts/go-tmp
export GOCACHE="$repo_root/artifacts/go-cache" GOPATH="$repo_root/artifacts/go" GOTMPDIR="$repo_root/artifacts/go-tmp"
if [ ! -d artifacts/backend/.git ]; then git clone --no-checkout "https://github.com/$repository.git" artifacts/backend; fi
git -C artifacts/backend fetch origin "$commit"
git -C artifacts/backend switch --detach "$commit"
[ "$(git -C artifacts/backend rev-parse HEAD)" = "$commit" ]
[ -z "$(git -C artifacts/backend status --porcelain)" ]
cd artifacts/backend/vps-billing/backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=false -o "$repo_root/artifacts/aster-api" ./cmd/server
# The reference bank worker was removed from Core. Keep its already-reviewed
# source independently pinned so browser acceptance still exercises a real
# payment worker while the API comes from the current compatibility source.
cd "$repo_root"
if [ ! -d artifacts/bank-source/.git ]; then git clone --no-checkout "https://github.com/$bank_repository.git" artifacts/bank-source; fi
git -C artifacts/bank-source fetch origin "$bank_commit"
git -C artifacts/bank-source switch --detach "$bank_commit"
[ "$(git -C artifacts/bank-source rev-parse HEAD)" = "$bank_commit" ]
[ -z "$(git -C artifacts/bank-source status --porcelain)" ]
cd artifacts/bank-source/vps-billing/backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=false -o "$repo_root/artifacts/bank-transfer" ./plugins/payment.bank-transfer/cmd/plugin
go run ./cmd/payment-manifest --plugin bank-transfer --binary "$repo_root/artifacts/bank-transfer" > "$repo_root/artifacts/bank-manifest.json"
