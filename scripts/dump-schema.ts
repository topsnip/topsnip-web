/**
 * Dump the actual columns of the tables runtime code references,
 * so we can write migration-v5 to reconcile repo SQL with prod.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envFile = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) continue;
  const [, key, rawValue] = match;
  const value = rawValue.trim().replace(/^"(.*)"$/, "$1");
  if (!process.env[key]) process.env[key] = value;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function probeTable(table: string) {
  const { data, error } = await supabase.from(table).select("*").limit(1);
  if (error) {
    console.log(`[${table}] ERROR: ${error.message}`);
    return;
  }
  const cols = data && data[0] ? Object.keys(data[0]) : [];
  console.log(`\n[${table}] (${cols.length} columns)`);
  for (const c of cols.sort()) console.log(`  - ${c}`);
}

async function main() {
  for (const t of [
    "sources",
    "source_items",
    "topics",
    "topic_sources",
    "topic_cards",
    "topic_tags",
    "tags",
    "youtube_recommendations",
    "stripe_events",
    "profiles",
    "locks",
  ]) {
    await probeTable(t);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
