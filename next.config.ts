import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (isProduction ? undefined : "http://localhost:3000");

    if (isProduction && !process.env.NEXT_PUBLIC_APP_URL) {
      console.warn("[next.config] NEXT_PUBLIC_APP_URL is not set in production — CORS headers will be omitted");
    }

    const appOrigin = appUrl ? new URL(appUrl).origin : null;

    const globalHeaders = [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' https://i.ytimg.com data:; connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com; frame-src 'self' https://checkout.stripe.com https://js.stripe.com; frame-ancestors 'none'",
          },
        ],
      },
    ];

    // CORS: restrict API access to our own origin (skip if no origin available in production)
    if (appOrigin) {
      globalHeaders.push({
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: appOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      });
    }

    return globalHeaders;
  },
};

export default nextConfig;
