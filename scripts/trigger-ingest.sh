#!/bin/bash
# Trigger ingestion run on the live site
# Usage: CRON_SECRET=xxx ./scripts/trigger-ingest.sh

URL="${TOPSNIP_URL:-https://www.topsnip.co}"
SECRET="${CRON_SECRET:?Set CRON_SECRET env var}"

echo "Triggering ingestion at $URL..."
curl -X POST "$URL/api/ingest/run" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
