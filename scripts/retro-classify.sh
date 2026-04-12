#!/bin/bash
# Re-classify already-published topics through the new Haiku filter.
# Archives topics that no longer qualify. Safe to run repeatedly.
#
# Usage:
#   CRON_SECRET=xxx ./scripts/retro-classify.sh           # live run, first batch
#   CRON_SECRET=xxx ./scripts/retro-classify.sh dry       # dry-run, no DB writes
#   CRON_SECRET=xxx ./scripts/retro-classify.sh all       # sweep all pages

URL="${TOPSNIP_URL:-https://www.topsnip.co}"
SECRET="${CRON_SECRET:?Set CRON_SECRET env var}"
MODE="${1:-single}"

run_batch() {
  local offset=$1
  local dry=$2
  local qs="limit=25&offset=${offset}"
  if [ "$dry" = "1" ]; then qs="${qs}&dryRun=1"; fi
  curl -s -X POST "$URL/api/content/retro-classify?${qs}" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json"
  echo ""
}

case "$MODE" in
  dry)
    echo "Dry run — no DB writes."
    run_batch 0 1
    ;;
  all)
    offset=0
    while true; do
      echo "Sweeping offset=$offset ..."
      response=$(run_batch $offset 0)
      echo "$response"
      next=$(echo "$response" | grep -o '"nextOffset":[^,}]*' | cut -d':' -f2 | tr -d ' ')
      if [ -z "$next" ] || [ "$next" = "null" ]; then break; fi
      offset=$next
      sleep 2
    done
    ;;
  *)
    run_batch 0 0
    ;;
esac
