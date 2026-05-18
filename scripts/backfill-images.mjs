#!/usr/bin/env node
// One-shot backfill: regenerate gpt-image-1 illustrations for topic_cards
// where image_url is null. Uses the existing illustration_prompt that was
// stored at original card-generation time. Skips cards without a prompt.
//
// Usage:
//   node backfill-images.mjs           # dry run, lists what would happen
//   node backfill-images.mjs --apply   # actually generate + upload + update

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.env.HOME || process.env.USERPROFILE, 'topsnip-web', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

const APPLY = process.argv.includes('--apply');
const BUCKET = 'topic-illustrations';
const MAX = parseInt(process.argv.find(a => a.startsWith('--max='))?.split('=')[1] || '20', 10);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const { data: rows, error } = await supabase
    .from('topic_cards')
    .select('topic_id, headline, category_tag, image_url, illustration_prompt, topics!inner(slug)')
    .is('image_url', null)
    .not('illustration_prompt', 'is', null)
    .order('generated_at', { ascending: false })
    .limit(MAX);

  if (error) { console.error('Query failed:', error); process.exit(1); }
  console.log(`Found ${rows.length} null-image cards with stored prompts.`);
  if (!APPLY) {
    for (const r of rows) {
      const slug = Array.isArray(r.topics) ? r.topics[0]?.slug : r.topics?.slug;
      console.log(`  - [${r.category_tag}] ${slug}  "${r.headline.slice(0, 60)}..."`);
    }
    console.log('\nDry run. Add --apply to actually regenerate.');
    return;
  }

  let ok = 0, fail = 0;
  for (const r of rows) {
    const slug = Array.isArray(r.topics) ? r.topics[0]?.slug : r.topics?.slug;
    if (!slug) { console.warn('  skip: no slug for topic', r.topic_id); fail++; continue; }
    process.stdout.write(`  [${ok + fail + 1}/${rows.length}] ${slug.slice(0, 50)}... `);
    try {
      const resp = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: r.illustration_prompt,
        n: 1,
        size: '1024x1024',
        quality: 'medium',
      });
      const b64 = resp.data?.[0]?.b64_json;
      if (!b64) throw new Error('no b64_json in response');
      const buf = Buffer.from(b64, 'base64');
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(`${slug}.png`, buf, { contentType: 'image/png', upsert: true });
      if (upErr) throw new Error(`upload: ${upErr.message}`);
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(`${slug}.png`);
      const publicUrl = urlData.publicUrl;
      const { error: updErr } = await supabase
        .from('topic_cards')
        .update({ image_url: publicUrl })
        .eq('topic_id', r.topic_id);
      if (updErr) throw new Error(`db update: ${updErr.message}`);
      console.log('OK');
      ok++;
    } catch (e) {
      console.log('FAIL —', e.message);
      fail++;
    }
  }
  console.log(`\nDone. ${ok} ok, ${fail} failed.`);
}

main().catch(e => { console.error(e); process.exit(1); });
