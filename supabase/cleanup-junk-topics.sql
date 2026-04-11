-- cleanup-junk-topics.sql
-- Run in Supabase SQL Editor to remove non-AI junk topics
-- These got through before the relevance filter was added

-- 1. Archive junk topics (set status to 'rejected' instead of deleting)
UPDATE topics
SET status = 'rejected'
WHERE id IN (
  SELECT t.id FROM topics t
  WHERE t.status = 'published'
  AND (
    -- Religious content mistagged with #ai
    t.title ILIKE '%allah%' OR t.title ILIKE '%islam%' OR t.title ILIKE '%quran%'
    OR t.title ILIKE '%musalman%' OR t.title ILIKE '%prayer%'
    -- Car content
    OR t.title ILIKE '%mercedes%' OR t.title ILIKE '%bmw%' OR t.title ILIKE '%toyota%'
    OR t.title ILIKE '%cla ev%'
    -- Generic non-AI
    OR t.title ILIKE '%cricket%' OR t.title ILIKE '%bollywood%'
  )
  AND NOT (
    -- But keep if it's genuinely AI-related
    t.title ILIKE '%llm%' OR t.title ILIKE '%gpt%' OR t.title ILIKE '%claude%'
    OR t.title ILIKE '%machine learning%' OR t.title ILIKE '%neural%'
    OR t.title ILIKE '%autonomous driv%'
  )
);

-- 2. Check what was cleaned up
SELECT slug, title, status FROM topics
WHERE status = 'rejected'
ORDER BY published_at DESC;
