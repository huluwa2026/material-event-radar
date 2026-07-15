import { NextResponse } from "next/server";

/** JSON Feed 1.1 alongside RSS (issue #5). */
export async function GET() {
  // Prefer reusing project data loaders when available.
  let items: Array<{ title: string; url: string; date?: string; summary?: string }> = [];
  try {
    const mod = await import("@/lib/events").catch(() => null) as any;
    if (mod?.listEvents) {
      const events = await mod.listEvents();
      items = (events || []).map((e: any) => ({
        title: e.title || e.name,
        url: e.url || e.link || "",
        date: e.date || e.publishedAt,
        summary: e.summary || e.description,
      }));
    }
  } catch {
    items = [];
  }
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: "Material Event Radar",
    home_page_url: "/",
    feed_url: "/feed.json",
    items: items.map((it, i) => ({
      id: it.url || String(i),
      url: it.url,
      title: it.title,
      content_text: it.summary || it.title,
      date_published: it.date,
    })),
  };
  return NextResponse.json(feed, {
    headers: { "content-type": "application/feed+json; charset=utf-8" },
  });
}
