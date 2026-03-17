import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/settings", "/onboarding", "/history"],
      },
    ],
    sitemap: "https://topsnip.co/sitemap.xml",
  };
}
