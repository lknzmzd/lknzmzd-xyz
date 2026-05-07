#!/usr/bin/env bash
set -euo pipefail
BASE="https://signals.lknzmzd.xyz"
read -rp "ADMIN_TOKEN: " ADMIN
read -rp "Test recipient email: " TO

curl -sS "$BASE/admin/email/status" -H "Authorization: Bearer $ADMIN" | python -m json.tool

curl -sS "$BASE/admin/email/test" \
  -X POST \
  -H "Authorization: Bearer $ADMIN" \
  -H "Content-Type: application/json" \
  --data "{\"to\":\"$TO\",\"subject\":\"LKNZMZD Signals — V2.7 test\",\"title\":\"Email control layer online\",\"preheader\":\"This is a controlled test send from LKNZMZD Signals V2.7.\",\"body_text\":\"This is a test from the LKNZMZD Signals email control layer.\\n\\nIf this arrived correctly, Resend + Cloudflare Worker + Supabase campaign logging are connected.\",\"cta_url\":\"https://lknzmzd.xyz/updates.html\",\"cta_label\":\"Open Signals Feed\"}" | python -m json.tool
