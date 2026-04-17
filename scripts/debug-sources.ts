/**
 * Debug: inspect 0-item sources by running the actual RSS fetcher
 * and checking what's happening.
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

async function main() {
  // Check 1: duplicate sources
  const { data: all } = await supabase.from("sources").select("id, name, url, platform");
  const byKey = new Map<string, typeof all>();
  for (const s of all ?? []) {
    const key = `${s.platform}|${s.url}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(s);
  }
  console.log("=== Duplicate sources (same platform+url) ===");
  let dupes = 0;
  for (const [key, rows] of byKey) {
    if (rows!.length > 1) {
      dupes++;
      console.log(`  ${key}  x${rows!.length}  ids=[${rows!.map(r => r.id.slice(0, 8)).join(", ")}]`);
    }
  }
  if (dupes === 0) console.log("  (none)");

  // Check 2: direct fetch from a 0-item new source — e.g. NVIDIA
  const { data: nvidia } = await supabase
    .from("sources")
    .select("id, name, url")
    .eq("name", "NVIDIA Blog")
    .single();

  if (nvidia) {
    console.log(`\n=== Direct fetch from ${nvidia.name} (${nvidia.url}) ===`);
    const res = await fetch(nvidia.url, {
      headers: { "User-Agent": "TopSnip/1.0 (+https://topsnip.co)" },
    });
    const text = await res.text();
    console.log(`  HTTP ${res.status}, content-type: ${res.headers.get("content-type")}`);
    console.log(`  body length: ${text.length}`);
    const itemMatches = text.match(/<item>/g) ?? text.match(/<entry>/g) ?? [];
    console.log(`  RSS items in feed: ${itemMatches.length}`);

    // Now check what's in source_items for this source
    const { count } = await supabase
      .from("source_items")
      .select("*", { count: "exact", head: true })
      .eq("source_id", nvidia.id);
    console.log(`  source_items rows for this source_id: ${count}`);
  }

  // Check 3: are all items being attributed? total check
  const { count: totalItems } = await supabase
    .from("source_items")
    .select("*", { count: "exact", head: true });
  console.log(`\n=== Totals ===`);
  console.log(`  total source_items: ${totalItems}`);

  const { data: sampleItems } = await supabase
    .from("source_items")
    .select("source_id, title, url")
    .limit(5)
    .order("ingested_at", { ascending: false });
  console.log(`  recent sample:`);
  for (const i of sampleItems ?? []) console.log(`    - [${i.source_id.slice(0, 8)}] ${i.title?.slice(0, 80)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
