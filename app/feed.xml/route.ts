import { isValidDate, previousCompleteWeekday } from "@/lib/date";
import { filterFilings, parseFilters, parseWindow } from "@/lib/public-api";
import { getRadarWindow } from "@/lib/radar";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const date = params.get("date") || previousCompleteWeekday();
  const windowDays = parseWindow(params.get("window") || "7");
  if (!isValidDate(date) || !windowDays) {
    return new NextResponse("Invalid date or window.", { status: 400 });
  }

  const radar = await getRadarWindow(date, windowDays);
  const filters = parseFilters(params);
  const filings = filterFilings(radar.filings, filters);
  const origin = request.nextUrl.origin;
  const feedUrl = `${origin}/feed.xml?${params.toString()}`;
  const items = filings.map((filing) => {
    const appUrl = `${origin}/?date=${filing.filingDate}&filing=${encodeURIComponent(filing.accession)}`;
    const facts = filing.sections.flatMap((section) => section.facts).slice(0, 4).join(" ");
    return `
    <item>
      <title>${xml(`${filing.ticker} — ${filing.headline}`)}</title>
      <link>${xml(appUrl)}</link>
      <guid isPermaLink="false">${xml(filing.accession)}</guid>
      <pubDate>${new Date(`${filing.filingDate}T12:00:00Z`).toUTCString()}</pubDate>
      <description>${xml(`${filing.companyName}. ${facts}`)}</description>
      <source url="${xml(filing.secUrl)}">SEC filing</source>
    </item>`;
  }).join("");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Material Event Radar</title>
    <link>${xml(origin)}</link>
    <description>Material company events grouped by SEC filing, factual and auditable.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(radar.fetchedAt).toUTCString()}</lastBuildDate>
    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
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
