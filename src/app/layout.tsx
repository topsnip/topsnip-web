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
  title: "Topsnip — Search any topic. Skip the noise.",
  description:
    "Type a topic. Get one distilled, actionable summary from the best YouTube sources — with all the filler cut out. Just Topsnip it.",
  keywords: [
    "AI tools",
    "automation",
    "n8n",
    "Claude",
    "learning",
    "YouTube summary",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Topsnip — Search any topic. Skip the noise.",
    description: "Distilled knowledge from the best YouTube sources. No noise.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Topsnip — Search any topic. Skip the noise.",
    description: "Distilled knowledge from the best YouTube sources. No noise.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${instrumentSerif.variable} ${inter.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
