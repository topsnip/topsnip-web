/**
 * Apply the DDL half of migration-v4: unique constraint on sources(platform, url).
 * Uses a transient exec_sql RPC via the Supabase REST API. If the RPC doesn't
 * exist yet, falls back to writing a Supabase Edge-Function-style SQL call
 * using the Management API (not available with service role key).
 *
 * Since we only have service role key, this script creates the unique
 * constraint via the postgres REST endpoint if `exec_sql` is defined.
 * Otherwise it prints the SQL for manual execution.
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const DDL = `
DELETE FROM sources a
USING sources b
WHERE a.ctid < b.ctid AND a.platform = b.platform AND a.url = b.url;

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_platform_url_unique;
ALTER TABLE sources ADD CONSTRAINT sources_platform_url_unique UNIQUE (platform, url);
`.trim();

async function main() {
  // Try calling an exec_sql RPC (common Supabase pattern for DDL via service role).
  const { error: rpcErr } = await supabase.rpc("exec_sql", { sql: DDL });

  if (rpcErr) {
    console.log(
      "\n[apply-v4-ddl] exec_sql RPC not available. Run this in the Supabase SQL Editor:\n"
    );
    console.log("─".repeat(70));
    console.log(DDL);
    console.log("─".repeat(70));
    console.log(`\nRPC error for reference: ${rpcErr.message}\n`);
    process.exit(2);
  }

  console.log("[apply-v4-ddl] DDL applied. Verifying...");

  // Verify by attempting to insert a duplicate — should fail
  const { error: dupErr } = await supabase
    .from("sources")
    .insert({
      name: "_dup_probe",
      platform: "rss",
      url: "https://openai.com/blog/rss.xml",
      is_active: false,
    });

  if (dupErr && /duplicate|unique/i.test(dupErr.message)) {
    console.log("[apply-v4-ddl] confirmed: duplicate insert rejected by unique constraint.");
  } else if (!dupErr) {
    console.error("[apply-v4-ddl] WARNING: duplicate insert succeeded. Constraint not applied.");
    await supabase.from("sources").delete().eq("name", "_dup_probe");
    process.exit(3);
  } else {
    console.log(`[apply-v4-ddl] verification insert errored differently: ${dupErr.message}`);
  }
}

main().catch((err) => {
  console.error("[apply-v4-ddl] FAILED:", err);
  process.exit(1);
});
