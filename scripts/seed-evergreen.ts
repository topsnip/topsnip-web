/**
 * Seed script for evergreen topics.
 * Run: npx tsx scripts/seed-evergreen.ts
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 * Idempotent — safe to run multiple times.
 */

import { createClient } from "@supabase/supabase-js";
import { EVERGREEN_TOPICS } from "../src/lib/content/evergreen";

// ── Env validation ──────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
  process.exit(1);
}

// ── Supabase client ─────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${EVERGREEN_TOPICS.length} evergreen topics...\n`);

  let seeded = 0;
  let errors = 0;

  for (let i = 0; i < EVERGREEN_TOPICS.length; i++) {
    const topic = EVERGREEN_TOPICS[i];
    const label = `[${i + 1}/${EVERGREEN_TOPICS.length}]`;

    try {
      // Upsert topic
      const { data: topicRow, error: topicErr } = await supabase
        .from("topics")
        .upsert(
          {
            slug: topic.slug,
            title: topic.title,
            status: "published",
            is_evergreen: true,
            published_at: new Date().toISOString(),
            trending_score: 10,
          },
          { onConflict: "slug" }
        )
        .select("id")
        .single();

      if (topicErr) {
        throw new Error(`Topic upsert failed: ${topicErr.message}`);
      }

      const topicId = topicRow.id;

      // Upsert topic content
      const { error: contentErr } = await supabase
        .from("topic_content")
        .upsert(
          {
            topic_id: topicId,
            role: "general",
            tldr: topic.tldr,
            what_happened: topic.what_happened,
            so_what: topic.so_what,
            now_what: topic.now_what,
            generated_by: "seed-script",
            generated_at: new Date().toISOString(),
          },
          { onConflict: "topic_id,role" }
        );

      if (contentErr) {
        throw new Error(`Content upsert failed: ${contentErr.message}`);
      }

      seeded++;
      console.log(`${label} Seeded: ${topic.title}`);
    } catch (err) {
      errors++;
      console.error(
        `${label} FAILED: ${topic.title} — ${err instanceof Error ? err.message : err}`
      );
    }
  }

  console.log(`\nDone. ${seeded} seeded, ${errors} errors.`);
  process.exit(errors > 0 ? 1 : 0);
}

main();
