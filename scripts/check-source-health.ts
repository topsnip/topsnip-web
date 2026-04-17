/**
 * Post-ingest health report.
 * For each source, runs a server-side COUNT (not affected by row limits).
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
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, name, platform, url, health_status, last_checked_at, is_active")
    .order("platform")
    .order("name");
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const s of sources!) {
    const { count } = await supabase
      .from("source_items")
      .select("*", { count: "exact", head: true })
      .eq("source_id", s.id);
    counts.set(s.id, count ?? 0);
  }

  console.log("\n=== Source Health Report ===\n");
  const byStatus: Record<string, typeof sources> = { down: [], degraded: [], healthy: [] };
  for (const s of sources!) (byStatus[s.health_status] ??= []).push(s);

  for (const status of ["down", "degraded", "healthy"] as const) {
    const rows = byStatus[status] ?? [];
    if (rows.length === 0) continue;
    console.log(`── ${status.toUpperCase()} (${rows.length}) ──`);
    for (const s of rows) {
      const items = counts.get(s.id) ?? 0;
      const last = s.last_checked_at ? new Date(s.last_checked_at).toISOString().slice(11, 19) : "never";
      const flag = items === 0 && status === "healthy" ? " ⚠ zero items" : "";
      console.log(`   [${s.platform.padEnd(7)}] ${s.name.padEnd(32)} items=${String(items).padStart(4)}  last=${last}${flag}`);
      if (status !== "healthy") console.log(`              url: ${s.url}`);
    }
    console.log();
  }

  let totalItems = 0;
  for (const n of counts.values()) totalItems += n;
  console.log(`Total sources: ${sources!.length}`);
  console.log(`Total items  : ${totalItems}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
