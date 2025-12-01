#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BASE_URL="https://odyssey.somnia.network" \
#   ADMIN_TOKEN="..." \
#   BATCH=20000 \
#   INSECURE=1 \
#   bash scripts/export_prod_xp_from_wallets.sh
#
# Input:
#   report_airdrop_unlocked_by_wallet.csv (col1: wallet)
# Output:
#   report_wallet_xp.csv (wallet,total_xp)

REQ_BIN() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 2; }; }
REQ_ENV() { [ -n "${!1-}" ] || { echo "Missing env var: $1" >&2; exit 2; }; }

REQ_BIN curl
REQ_BIN jq
REQ_BIN awk
REQ_ENV BASE_URL
REQ_ENV ADMIN_TOKEN

INPUT="${INPUT:-report_airdrop_unlocked_by_wallet.csv}"
OUT="${OUT:-report_wallet_xp.csv}"
BATCH="${BATCH:-20000}"
SUB="${SUB:-2000}" # set SUB=0 or SUB>=BATCH to send full 20k in one request
CURL_BIN="curl"
[ "${INSECURE:-0}" = "1" ] && CURL_BIN="curl -k"
RETRY="${RETRY:-20}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-300}"
RETRY_DELAY_MS="${RETRY_DELAY_MS:-1000}"

if [ ! -s "$INPUT" ]; then
  echo "Missing $INPUT" >&2
  exit 2
fi

# Header
printf "%s\n" "wallet,total_xp" > "$OUT"

# Prepare address list
tmp_addrs=$(mktemp)
tail -n +2 "$INPUT" | cut -d, -f1 | tr -d '\r"' | tr 'A-Z' 'a-z' | awk 'NF' > "$tmp_addrs"

# Work in a temporary directory to avoid clutter
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir" "$tmp_addrs" 2>/dev/null || true' EXIT

echo "Splitting into chunks of $BATCH (temp: $tmp_dir) ..."
split -l "$BATCH" "$tmp_addrs" "$tmp_dir/addrs_chunk_"

processed=0
total=$(wc -l < "$tmp_addrs" | awk '{print $1}')
for f in "$tmp_dir"/addrs_chunk_*; do
  if [ "$SUB" -gt 0 ] && [ "$SUB" -lt "$BATCH" ]; then
    # Further split each 20k chunk into SUB-sized sub-batches to avoid large payload/timeouts
    split -l "$SUB" "$f" "${f}_sub_"
    for s in "${f}_sub_"*; do
      # Build JSON array from sub-chunk
      addrs_json=$(jq -R -s 'split("\n")[:-1]' "$s")
      body=$(printf '{"token":"%s","addresses":%s}' "$ADMIN_TOKEN" "$addrs_json")
      # Retry loop for robustness
      attempt=0
      success=0
      while [ $attempt -lt "$RETRY" ]; do
        attempt=$(( attempt + 1 ))
        resp=$($CURL_BIN -sS --retry "$RETRY" --retry-all-errors --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
          -H 'content-type: application/json' -X POST "$BASE_URL/api/admin/xp/batch" --data "$body" || true)
        if [ -n "$resp" ] && echo "$resp" | jq -e 'has("items")' >/dev/null 2>&1; then
          echo "$resp" | jq -r '.items[] | [ .address, (.xp // 0) ] | @csv' >> "$OUT"
          success=1
          break
        fi
      # backoff
      sleep "$(awk "BEGIN{printf \"%.3f\", ${RETRY_DELAY_MS}/1000}")"
      done
      # Progress update
      scount=$(wc -l < "$s" | awk '{print $1}')
      processed=$(( processed + scount ))
      echo "done: $processed / $total (last sub-batch: ${scount}, ok=${success})"
      rm -f "$s"
      # Small pacing
      sleep 0.2
    done
  else
    # Send full 20k in a single request (increase MAX_TIME to avoid timeouts)
    addrs_json=$(jq -R -s 'split("\n")[:-1]' "$f")
    body=$(printf '{"token":"%s","addresses":%s}' "$ADMIN_TOKEN" "$addrs_json")
    attempt=0
    success=0
    while [ $attempt -lt "$RETRY" ]; do
      attempt=$(( attempt + 1 ))
      resp=$($CURL_BIN -sS --retry "$RETRY" --retry-all-errors --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
        -H 'content-type: application/json' -X POST "$BASE_URL/api/admin/xp/batch" --data "$body" || true)
      if [ -n "$resp" ] && echo "$resp" | jq -e 'has("items")' >/dev/null 2>&1; then
        echo "$resp" | jq -r '.items[] | [ .address, (.xp // 0) ] | @csv' >> "$OUT"
        success=1
        break
      fi
      sleep "$(awk "BEGIN{printf \"%.3f\", ${RETRY_DELAY_MS}/1000}")"
    done
    ccount=$(wc -l < "$f" | awk '{print $1}')
    processed=$(( processed + ccount ))
    echo "done: $processed / $total (20k request, ok=${success})"
  fi
done

# Deduplicate by wallet (keep first occurrence)
awk -F, 'NR==1{print; next} !seen[$1]++' "$OUT" > "${OUT}.dedup" && mv "${OUT}.dedup" "$OUT"
echo "Wrote $OUT"


