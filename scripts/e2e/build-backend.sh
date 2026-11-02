#!/usr/bin/env bash
set -euo pipefail
repo_root=$(cd "$(dirname "$0")/../.." && pwd)
cd "$repo_root"
commit=$(node -p 'JSON.parse(require("fs").readFileSync("compatibility.json","utf8")).source_commit')
repository=$(node -p 'JSON.parse(require("fs").readFileSync("compatibility.json","utf8")).backend_repository')
mkdir -p artifacts/go-tmp
export GOCACHE="$repo_root/artifacts/go-cache" GOPATH="$repo_root/artifacts/go" GOTMPDIR="$repo_root/artifacts/go-tmp"
if [ ! -d artifacts/backend/.git ]; then git clone --no-checkout "https://github.com/$repository.git" artifacts/backend; fi
git -C artifacts/backend fetch origin "$commit"
git -C artifacts/backend switch --detach "$commit"
[ "$(git -C artifacts/backend rev-parse HEAD)" = "$commit" ]
[ -z "$(git -C artifacts/backend status --porcelain)" ]
cd artifacts/backend/vps-billing/backend
CGO_ENABLED=0 GOOS=linux go build -trimpath -buildvcs=false -o "$repo_root/artifacts/aster-api" ./cmd/server
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -trimpath -buildvcs=false -o "$repo_root/artifacts/bank-transfer" ./plugins/payment.bank-transfer/cmd/plugin
go run ./cmd/payment-manifest --plugin bank-transfer --binary "$repo_root/artifacts/bank-transfer" > "$repo_root/artifacts/bank-manifest.json"
