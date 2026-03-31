-- Step 10: Allow anonymous reads on published topics and general content
-- Required for: shareable topic URLs, anonymous browsing, SEO crawling

-- Allow anyone (including anon) to read published topics
CREATE POLICY "Anyone can read published topics"
  ON public.topics FOR SELECT
  USING (status = 'published');

-- Drop the old authenticated-only policy (superseded by the above)
DROP POLICY IF EXISTS "Authenticated users can read published topics" ON public.topics;

-- Allow anyone to read general-role topic content (free tier content)
CREATE POLICY "Anyone can read general topic content"
  ON public.topic_content FOR SELECT
  USING (role = 'general');

-- Keep the existing policy for authenticated users reading role-specific content
-- (the "Users can read topic content for their role" policy handles Pro users)
