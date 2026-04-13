#!/usr/bin/env bash
# Re-classify already-published topics through the Haiku filter.
# Archives topics that no longer qualify. Safe to run repeatedly.
#
# Usage:
#   CRON_SECRET=xxx ./scripts/retro-classify.sh           # live run, first batch
#   CRON_SECRET=xxx ./scripts/retro-classify.sh dry       # dry-run, no DB writes
#   CRON_SECRET=xxx ./scripts/retro-classify.sh all       # sweep all pages (cap 40)

set -euo pipefail

URL="${TOPSNIP_URL:-https://www.topsnip.co}"
SECRET="${CRON_SECRET:?Set CRON_SECRET env var}"
MODE="${1:-single}"
MAX_ITERATIONS=40

parse_next_offset() {
  python -c "import json,sys; d=json.load(sys.stdin); v=d.get('nextOffset'); print(v if v is not None else '')"
}

run_batch() {
  local offset="$1"
  local dry="$2"
  local qs="limit=25&offset=${offset}"
  if [ "$dry" = "1" ]; then qs="${qs}&dryRun=1"; fi
  curl -sS -X POST "$URL/api/content/retro-classify?${qs}" \
    -H "Authorization: Bearer $SECRET" \
    -H "Content-Type: application/json"
}

case "$MODE" in
  dry)
    echo "Dry run — no DB writes."
    run_batch 0 1
    echo ""
    ;;
  all)
    offset=0
    iterations=0
    while : ; do
      if [ "$iterations" -ge "$MAX_ITERATIONS" ]; then
        echo "Hit MAX_ITERATIONS=$MAX_ITERATIONS — stopping to avoid runaway loop."
        exit 1
      fi
      echo "Sweeping offset=$offset ..."
      response=$(run_batch "$offset" 0)
      echo "$response"
      echo ""
      next=$(echo "$response" | parse_next_offset)
      if [ -z "$next" ]; then
        echo "Done — no more pages."
        break
      fi
      if [ "$next" = "$offset" ]; then
        echo "nextOffset did not advance (offset=$offset) — breaking to avoid loop."
        exit 1
      fi
      offset="$next"
      iterations=$((iterations + 1))
      sleep 2
    done
    ;;
  *)
    run_batch 0 0
    echo ""
    ;;
esac
