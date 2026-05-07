#!/usr/bin/env bash
set -euo pipefail
BASE_URL="https://signals.lknzmzd.xyz"
ADMIN_TOKEN="${LKNZMZD_SIGNALS_ADMIN_TOKEN:-}"

echo "[1] Health"
curl -sS "$BASE_URL/health" | jq . || true

echo "[2] Public count"
curl -sS "$BASE_URL/count" | jq . || true

echo "[3] Subscribe test"
curl -sS -X POST "$BASE_URL/subscribe" \
  -H "Origin: https://lknzmzd.xyz" \
  -H "Content-Type: application/json" \
  -d '{"email":"control-test@example.com","interests":["All Updates","Tools"],"source":"v2.7-control-test","consent_version":"signals-v1"}' | jq . || true

echo "[4] Unsubscribe test"
curl -sS -X POST "$BASE_URL/unsubscribe" \
  -H "Origin: https://lknzmzd.xyz" \
  -H "Content-Type: application/json" \
  -d '{"email":"control-test@example.com","source":"v2.7-control-test"}' | jq . || true

if [[ -n "$ADMIN_TOKEN" ]]; then
  echo "[5] Admin counts"
  curl -sS "$BASE_URL/admin/counts" -H "Authorization: Bearer $ADMIN_TOKEN" | jq . || true
  echo "[6] Export CSV"
  curl -L "$BASE_URL/admin/export?format=csv&status=active" -H "Authorization: Bearer $ADMIN_TOKEN" -o lknzmzd-signals-active.csv
else
  echo "Skipping admin tests. Set LKNZMZD_SIGNALS_ADMIN_TOKEN first."
fi
