#!/bin/bash
# Regenerate ALL published topic content using current prompts + model
# This resets published topics to "detected" so the content pipeline re-processes them
# Usage: CRON_SECRET=xxx ./scripts/regenerate-content.sh

URL="${TOPSNIP_URL:-https://www.topsnip.co}"
SECRET="${CRON_SECRET:?Set CRON_SECRET env var}"

echo "Step 1: Resetting published topics to 'detected'..."
curl -s -X POST "$URL/api/content/regenerate" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "Step 2: Triggering content generation..."
curl -s -X POST "$URL/api/content/generate" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
