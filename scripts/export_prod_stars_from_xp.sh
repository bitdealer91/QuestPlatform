#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BASE_URL=... ADMIN_TOKEN=... bash scripts/export_prod_stars_from_xp.sh
# Requires existing report_wallet_xp.csv with header wallet,total_xp

: "${BASE_URL:?set BASE_URL}"
: "${ADMIN_TOKEN:?set ADMIN_TOKEN}"

INPUT="report_wallet_xp.csv"
OUT="report_wallet_stars_total.csv"

if [ ! -s "$INPUT" ]; then
  echo "Missing $INPUT (run XP export first)" >&2
  exit 2
fi

tmp_addrs=$(mktemp)
tail -n +2 "$INPUT" | cut -d, -f1 > "$tmp_addrs"

echo "wallet,total_stars" > "$OUT"

BATCH=150
mapfile -t ADDRS < "$tmp_addrs"
total=${#ADDRS[@]}
idx=0
while [ $idx -lt $total ]; do
  last=$(( idx + BATCH ))
  if [ $last -gt $total ]; then last=$total; fi
  slice=( "${ADDRS[@]:idx:last-idx}" )
  addrs_json=$(printf '"%s",' "${slice[@]}" | sed 's/,$//')
  body=$(printf '{"token":"%s","addresses":[%s]}' "$ADMIN_TOKEN" "$addrs_json")
  resp=$(curl -sS --retry 20 --retry-all-errors --connect-timeout 10 --max-time 60 \
    -H 'content-type: application/json' -X POST "$BASE_URL/api/admin/stars/batch" --data "$body" || true)
  if [ -n "$resp" ]; then
    echo "$resp" | jq -r '.items[] | [ .address, (.total // 0) ] | @csv' >> "$OUT"
  fi
  idx=$last
  sleep 0.2
done

rm -f "$tmp_addrs"
echo "Wrote $OUT"



