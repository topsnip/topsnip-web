import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = "https://www.topsnip.co";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/feed`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Fetch published topics for dynamic routes
  try {
    const supabase = await createClient();
    const { data: topics } = await supabase
      .from("topics")
      .select("slug, published_at")
      .eq("status", "published");

    const topicPages: MetadataRoute.Sitemap = (topics ?? []).map((topic) => ({
      url: `${SITE_URL}/learn/${topic.slug}`,
      lastModified: topic.published_at ? new Date(topic.published_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...topicPages];
  } catch {
    // If Supabase is unavailable, return static pages only
    return staticPages;
  }
}
