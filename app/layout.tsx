import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://material-event-radar.vercel.app"),
  title: "Material Event Radar",
  description: "Daily material company events, grouped by SEC filing and linked to the original disclosure.",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
  openGraph: {
    title: "Material Event Radar",
    description: "Factual, grouped, and auditable material events from SEC filings.",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Material Event Radar",
    description: "Factual, grouped, and auditable material events from SEC filings.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}


export function toJsonFeed(items: Array<{ title: string; url: string; date?: string; summary?: string }>, meta: { title: string; home: string; feed: string }) {
  return {
    version: "https://jsonfeed.org/version/1.1",
    title: meta.title,
    home_page_url: meta.home,
    feed_url: meta.feed,
    items: items.map((it, i) => ({
      id: it.url || String(i),
      url: it.url,
      title: it.title,
      content_text: it.summary || it.title,
      date_published: it.date,
    })),
  };
}
