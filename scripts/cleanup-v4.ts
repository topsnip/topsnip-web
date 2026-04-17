/**
 * Cleanup pass after migration-v4:
 *   - Remove duplicate OpenAI Blog row (kept the one with more items)
 *   - Deactivate known-broken feeds: Meta AI Blog, TLDR AI, The Batch
 *     (Meta moved to a different blog infra; TLDR/The Batch no longer
 *     serve their old RSS paths. Leaving them active spams the error log.)
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
  // ── 1. Drop duplicate OpenAI Blog row (keep the one with most items) ──
  const { data: openaiRows } = await supabase
    .from("sources")
    .select("id, name, url")
    .eq("platform", "rss")
    .eq("url", "https://openai.com/blog/rss.xml");

  if (openaiRows && openaiRows.length > 1) {
    console.log(`Found ${openaiRows.length} duplicate OpenAI Blog rows.`);
    const keepers: { id: string; items: number }[] = [];
    for (const row of openaiRows) {
      const { count } = await supabase
        .from("source_items")
        .select("*", { count: "exact", head: true })
        .eq("source_id", row.id);
      keepers.push({ id: row.id, items: count ?? 0 });
    }
    keepers.sort((a, b) => b.items - a.items);
    const keep = keepers[0];
    const drop = keepers.slice(1);
    console.log(`  keeping id=${keep.id.slice(0, 8)} (${keep.items} items)`);
    for (const d of drop) {
      console.log(`  deleting id=${d.id.slice(0, 8)} (${d.items} items)`);
      // Reassign any linked items first
      if (d.items > 0) {
        await supabase
          .from("source_items")
          .update({ source_id: keep.id })
          .eq("source_id", d.id);
      }
      const { error } = await supabase.from("sources").delete().eq("id", d.id);
      if (error) throw error;
    }
    console.log();
  }

  // ── 2. Deactivate known-broken pre-existing feeds ──
  const brokenNames = ["Meta AI Blog", "TLDR AI", "The Batch (deeplearning.ai)"];
  const { data: toDeactivate } = await supabase
    .from("sources")
    .select("id, name, url, is_active, health_status")
    .in("name", brokenNames);

  if (toDeactivate && toDeactivate.length > 0) {
    console.log(`Deactivating ${toDeactivate.length} persistently-broken feeds:`);
    for (const row of toDeactivate) {
      console.log(`   - ${row.name} (${row.health_status}) :: ${row.url}`);
    }
    const { error } = await supabase
      .from("sources")
      .update({ is_active: false })
      .in("id", toDeactivate.map((r) => r.id));
    if (error) throw error;
    console.log("   marked is_active=false.\n");
  }

  console.log("cleanup done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
