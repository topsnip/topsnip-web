import type { Metadata } from "next";
import { Instrument_Serif, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.topsnip.co"),
  title: "TopSnip — Understand AI in 3 minutes, not 3 hours",
  description:
    "Search any AI topic and get a clear, structured explainer with sources. TopSnip monitors 7+ platforms so you don't have to.",
  keywords: [
    "AI learning",
    "AI tools",
    "AI explainers",
    "Claude",
    "MCP",
    "RAG",
    "AI trends",
    "YouTube AI summary",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "TopSnip — Understand AI in 3 minutes, not 3 hours",
    description:
      "Search any AI topic and get a clear, structured explainer with sources. No noise, just signal.",
    type: "website",
    siteName: "TopSnip",
    url: "https://www.topsnip.co",
  },
  twitter: {
    card: "summary_large_image",
    title: "TopSnip — Understand AI in 3 minutes, not 3 hours",
    description:
      "Search any AI topic and get a clear, structured explainer with sources. No noise, just signal.",
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
      <body
        className={`${instrumentSerif.variable} ${inter.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
