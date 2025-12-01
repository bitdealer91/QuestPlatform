#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BASE_URL="https://odyssey.somnia.network" \
#   ADMIN_TOKEN="..." \
#   bash scripts/export_prod_reports.sh
#
# Outputs:
#   report_wallet_xp.csv
#   report_wallet_stars.csv

REQ_BIN() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 2; }; }
REQ_ENV() { [ -n "${!1-}" ] || { echo "Missing env var: $1" >&2; exit 2; }; }

REQ_BIN curl
REQ_BIN jq
REQ_BIN awk
REQ_ENV BASE_URL
REQ_ENV ADMIN_TOKEN

# Optional tuning
CURL_BIN="curl"
[ "${INSECURE:-0}" = "1" ] && CURL_BIN="curl -k"
XP_BATCH="${XP_BATCH:-200}"
STARS_BATCH="${STARS_BATCH:-200}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-120}"

XP_OUT="report_wallet_xp.csv"
STARS_RAW="stars_raw.csv"
STARS_OUT="report_wallet_stars.csv"

# Helper: validate JSON shape (.cursor and .items array)
valid_json(){
  echo "$1" | jq -e 'has("cursor") and (.items|type=="array")' >/dev/null 2>&1
}

export_xp(){
  echo "Exporting XP to ${XP_OUT} ..."
  # If XP file already exists and not forcing, skip to avoid re-appending
  if [ -s "${XP_OUT}" ] && [ "${FORCE_XP:-0}" != "1" ]; then
    echo "XP file already exists; skipping (set FORCE_XP=1 to rebuild)"
    return 0
  fi
  printf "%s\n" "wallet,total_xp" >"${XP_OUT}"
  local cursor="0"
  while true; do
    local body
    body=$(printf '{"token":"%s","batch":%d,"cursor":"%s"}' "$ADMIN_TOKEN" "$XP_BATCH" "$cursor")
    local resp
    resp=$($CURL_BIN -sS --retry 20 --retry-all-errors --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -H 'content-type: application/json' \
      -X POST "$BASE_URL/api/admin/xp/page" --data "$body" || true)
    if [ -z "$resp" ] || ! valid_json "$resp"; then sleep 1; continue; fi
    echo "$resp" | jq -r '.items[] | [ .address, (.xp // 0) ] | @csv' >>"${XP_OUT}"
    cursor=$(echo "$resp" | jq -r '.cursor // "0"')
    [ "$cursor" = "0" ] && break
    sleep 0.5
  done
  # Deduplicate by wallet (keep first occurrence)
  awk -F, 'NR==1{print; next} !seen[$1]++' "${XP_OUT}" >"${XP_OUT}.dedup" && mv "${XP_OUT}.dedup" "${XP_OUT}"
}

export_stars(){
  echo "Exporting stars raw to ${STARS_RAW} ..."
  if [ ! -s "${STARS_RAW}" ]; then
    printf "%s\n" "wallet,week,count" >"${STARS_RAW}"
  fi
  local cursor="0"
  while true; do
    local body
    body=$(printf '{"token":"%s","batch":%d,"cursor":"%s"}' "$ADMIN_TOKEN" "$STARS_BATCH" "$cursor")
    local resp
    resp=$($CURL_BIN -sS --retry 20 --retry-all-errors --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -H 'content-type: application/json' \
      -X POST "$BASE_URL/api/admin/stars/page" --data "$body" || true)
    if [ -z "$resp" ] || ! valid_json "$resp"; then sleep 1; continue; fi
    echo "$resp" | jq -r '.items[] | [ .address, (.week // 0), (.count // 0) ] | @csv' >>"${STARS_RAW}"
    cursor=$(echo "$resp" | jq -r '.cursor // "0"')
    [ "$cursor" = "0" ] && break
    sleep 0.5
  done

  echo "Aggregating stars -> ${STARS_OUT} ..."
  awk -F, 'BEGIN{
    OFS=",";
    print "wallet","total_stars","stars_w1","stars_w2","stars_w3","stars_w4","stars_w5","stars_w6","stars_w7","stars_w8"
  }
  NR>1{
    gsub(/"/,"",$1); gsub(/"/,"",$2); gsub(/"/,"",$3);
    w=$1; week=$2+0; c=$3+0;
    # keep only the latest value for (wallet,week)
    stars[w,week]=c
    wallets[w]=1
  }
  END{
    for (k in wallets){
      s=0;
      for (i=1;i<=8;i++) s+=((stars[k,i] == "") ? 0 : stars[k,i]);
      printf "%s,%d", k, s;
      for (i=1;i<=8;i++) printf ",%d", ((stars[k,i] == "") ? 0 : stars[k,i]);
      print ""
    }
  }' "${STARS_RAW}" >"${STARS_OUT}"
}

# Allow skipping XP step to avoid re-appending
if [ "${SKIP_XP:-0}" = "1" ]; then
  echo "Skipping XP export (SKIP_XP=1)"
else
  export_xp
fi
export_stars

echo "Done:"
wc -l -- "${XP_OUT}" || true
wc -l -- "${STARS_OUT}" || true

