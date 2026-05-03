#!/usr/bin/env bash
set -euo pipefail

curl -sS "https://signals.lknzmzd.xyz/subscribe" \
  -X POST \
  -H "Origin: https://lknzmzd.xyz" \
  -H "Content-Type: application/json" \
  --data '{"email":"test@example.com","interests":["All Updates","Robotics"],"source":"manual-test","consent_version":"signals-v1"}' | jq .
