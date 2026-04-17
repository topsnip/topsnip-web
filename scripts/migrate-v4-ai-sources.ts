/**
 * One-shot migration: expand RSS source coverage.
 *
 * Runs the DML parts of supabase/migration-v4-ai-sources.sql:
 *   - Removes broken Anthropic RSS rows (URLs return 404 as of 2026-04)
 *   - Inserts 21 verified feeds (native RSS + Google News RSS proxies)
 *
 * Skipped: the ALTER TABLE unique-constraint step (DDL). Run it manually
 * in the Supabase SQL Editor when convenient.
 *
 * Usage:
 *   npx tsx scripts/migrate-v4-ai-sources.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Load .env.local manually (Next.js isn't booting it for us)
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

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

type NewSource = {
  name: string;
  platform: "rss";
  url: string;
  check_interval_min: number;
  is_active: boolean;
};

const BROKEN_ANTHROPIC_URLS = [
  "https://www.anthropic.com/rss.xml",
  "https://www.anthropic.com/blog/rss",
];

const NEW_SOURCES: NewSource[] = [
  // Native RSS — official labs & tooling
  { name: "NVIDIA Blog",            platform: "rss", url: "https://blogs.nvidia.com/feed/",                                    check_interval_min: 180, is_active: true },
  { name: "Microsoft AI Blog",      platform: "rss", url: "https://blogs.microsoft.com/ai/feed/",                              check_interval_min: 180, is_active: true },
  { name: "Apple Machine Learning", platform: "rss", url: "https://machinelearning.apple.com/rss.xml",                         check_interval_min: 360, is_active: true },
  { name: "Stability AI News",      platform: "rss", url: "https://stability.ai/news-updates?format=rss",                      check_interval_min: 240, is_active: true },
  { name: "Replicate Blog",         platform: "rss", url: "https://replicate.com/blog/rss",                                    check_interval_min: 240, is_active: true },
  { name: "GitHub Blog",            platform: "rss", url: "https://github.blog/feed/",                                         check_interval_min: 240, is_active: true },
  { name: "OpenAI News",            platform: "rss", url: "https://openai.com/news/rss.xml",                                   check_interval_min: 120, is_active: true },
  { name: "LangChain Blog",         platform: "rss", url: "https://langchain.substack.com/feed",                               check_interval_min: 360, is_active: true },

  // Curators & researchers
  { name: "Simon Willison",         platform: "rss", url: "https://simonwillison.net/atom/everything/",                        check_interval_min: 120, is_active: true },
  { name: "Import AI (Jack Clark)", platform: "rss", url: "https://jack-clark.net/feed/",                                      check_interval_min: 720, is_active: true },
  { name: "Last Week in AI",        platform: "rss", url: "https://lastweekin.ai/feed",                                        check_interval_min: 720, is_active: true },
  { name: "The Sequence",           platform: "rss", url: "https://thesequence.substack.com/feed",                             check_interval_min: 720, is_active: true },
  { name: "Ben's Bites",            platform: "rss", url: "https://www.bensbites.com/feed",                                    check_interval_min: 360, is_active: true },

  // Industry press (AI sections only)
  { name: "The Verge AI",           platform: "rss", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", check_interval_min: 180, is_active: true },
  { name: "TechCrunch AI",          platform: "rss", url: "https://techcrunch.com/category/artificial-intelligence/feed/",     check_interval_min: 180, is_active: true },

  // Google News RSS proxies for labs with no native feed
  { name: "Anthropic (Google News)",  platform: "rss", url: "https://news.google.com/rss/search?q=site:anthropic.com&hl=en-US&gl=US&ceid=US:en",                         check_interval_min: 180, is_active: true },
  { name: "Mistral (Google News)",    platform: "rss", url: "https://news.google.com/rss/search?q=site:mistral.ai&hl=en-US&gl=US&ceid=US:en",                            check_interval_min: 180, is_active: true },
  { name: "Perplexity (Google News)", platform: "rss", url: "https://news.google.com/rss/search?q=site:perplexity.ai&hl=en-US&gl=US&ceid=US:en",                         check_interval_min: 240, is_active: true },
  { name: "ElevenLabs (Google News)", platform: "rss", url: "https://news.google.com/rss/search?q=site:elevenlabs.io&hl=en-US&gl=US&ceid=US:en",                         check_interval_min: 240, is_active: true },
  { name: "Cohere (Google News)",     platform: "rss", url: "https://news.google.com/rss/search?q=site:cohere.com+announce&hl=en-US&gl=US&ceid=US:en",                   check_interval_min: 360, is_active: true },
  { name: "xAI / Grok (Google News)", platform: "rss", url: 'https://news.google.com/rss/search?q=%22xAI%22+Grok+OR+%22x.ai%22&hl=en-US&gl=US&ceid=US:en',               check_interval_min: 240, is_active: true },
];

async function main() {
  console.log(`\n[migrate-v4] connected to ${SUPABASE_URL}\n`);

  // ── Step 1: delete broken Anthropic feeds ──────────────────────
  const { data: toDelete, error: findErr } = await supabase
    .from("sources")
    .select("id, name, url")
    .in("url", BROKEN_ANTHROPIC_URLS);
  if (findErr) throw findErr;

  if (toDelete && toDelete.length > 0) {
    console.log(`[migrate-v4] removing ${toDelete.length} broken Anthropic source row(s):`);
    for (const row of toDelete) console.log(`   - ${row.name} :: ${row.url}`);
    const { error: delErr } = await supabase
      .from("sources")
      .delete()
      .in("id", toDelete.map((r) => r.id));
    if (delErr) throw delErr;
    console.log("[migrate-v4] deleted.\n");
  } else {
    console.log("[migrate-v4] no broken Anthropic rows found (already clean).\n");
  }

  // ── Step 2: find which new sources already exist ───────────────
  const targetUrls = NEW_SOURCES.map((s) => s.url);
  const { data: existing, error: existErr } = await supabase
    .from("sources")
    .select("url")
    .in("url", targetUrls);
  if (existErr) throw existErr;

  const existingUrls = new Set((existing ?? []).map((r) => r.url));
  const toInsert = NEW_SOURCES.filter((s) => !existingUrls.has(s.url));

  console.log(`[migrate-v4] ${existingUrls.size} already present, ${toInsert.length} to insert.\n`);

  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await supabase
      .from("sources")
      .insert(toInsert)
      .select("id, name, url");
    if (insErr) throw insErr;

    console.log(`[migrate-v4] inserted ${inserted?.length ?? 0} sources:`);
    for (const row of inserted ?? []) console.log(`   + ${row.name}`);
    console.log("");
  }

  // ── Step 3: final report ───────────────────────────────────────
  const { data: summary, error: sumErr } = await supabase
    .from("sources")
    .select("platform, is_active");
  if (sumErr) throw sumErr;

  const counts = summary!.reduce<Record<string, { active: number; inactive: number }>>(
    (acc, row) => {
      const key = row.platform;
      acc[key] = acc[key] ?? { active: 0, inactive: 0 };
      if (row.is_active) acc[key].active++;
      else acc[key].inactive++;
      return acc;
    },
    {},
  );

  console.log("[migrate-v4] final source counts:");
  for (const [platform, { active, inactive }] of Object.entries(counts).sort()) {
    console.log(`   ${platform.padEnd(10)} active=${active}  inactive=${inactive}`);
  }
  console.log("\n[migrate-v4] done.\n");
}

main().catch((err) => {
  console.error("[migrate-v4] FAILED:", err);
  process.exit(1);
});
