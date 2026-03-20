import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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
      // Build-time: warn loudly. Runtime enforcement happens in csrf.ts checkOrigin()
      console.error("‼️  [next.config] NEXT_PUBLIC_APP_URL is not set in production — CORS headers will be missing and CSRF checks weakened. Set this variable!");
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
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://us-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' https://i.ytimg.com data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://api.anthropic.com https://us.i.posthog.com https://*.ingest.sentry.io",
              "frame-src 'self' https://checkout.stripe.com https://js.stripe.com https://hooks.stripe.com",
              "frame-ancestors 'none'",
            ].join("; "),
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

// Wrap with Sentry — only active when DSN is set.
// Source maps are uploaded during build when SENTRY_AUTH_TOKEN is present.
export default withSentryConfig(nextConfig, {
  // Suppresses source map upload logs during build
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  // Requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT env vars
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Hide source maps from clients
  hideSourceMaps: true,

  // Tunnel Sentry events through the app to avoid ad blockers
  // tunnelRoute: "/monitoring",

  // Widen the upload timeout for large source maps
  sourcemapUploadOptions: {
    telemetry: false,
  },
});
