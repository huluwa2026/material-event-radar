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
