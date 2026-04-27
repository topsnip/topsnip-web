import type { Metadata } from "next";
import { Suspense } from "react";
import PostHogProvider from "@/components/providers/PostHogProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.topsnip.co"),
  title: "TopSnip — Your AI Intelligence Feed",
  description:
    "Stay current on everything happening in AI. InShorts-style cards, visual explainers, and curated videos — no noise, just signal.",
  keywords: [
    "AI news",
    "AI tools",
    "AI updates",
    "AI dashboard",
    "AI intelligence",
    "AI trends",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "TopSnip — Your AI Intelligence Feed",
    description:
      "Stay current on everything happening in AI. No noise, just signal.",
    type: "website",
    siteName: "TopSnip",
    url: "https://www.topsnip.co",
  },
  twitter: {
    card: "summary_large_image",
    title: "TopSnip — Your AI Intelligence Feed",
    description:
      "Stay current on everything happening in AI. No noise, just signal.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0C0C0E" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <Suspense fallback={null}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </Suspense>
      </body>
    </html>
  );
}
