import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: "https://topsnip.co",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://topsnip.co/about",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: "https://topsnip.co/upgrade",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
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
      url: `https://topsnip.co/topic/${topic.slug}`,
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
