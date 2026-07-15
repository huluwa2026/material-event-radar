import { GET as getCompatibilityEvents } from "@/app/api/events/route";
import { GET as getVersionedEvents } from "@/app/api/v1/events/route";
import { GET as getRss } from "@/app/feed.xml/route";
import { clearRateLimits } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  clearRateLimits();
});

function request(path: string, address: string): NextRequest {
  return new NextRequest(`https://radar.example${path}`, {
    headers: { "x-forwarded-for": address },
  });
}

describe("hosted route boundaries", () => {
  it("rejects arbitrary historical dates before any upstream work", async () => {
    vi.stubEnv("RADAR_DATA_MODE", "live");
    vi.stubEnv("RADAR_ALLOW_HISTORICAL_DATES", "false");

    const versioned = await getVersionedEvents(request("/api/v1/events?date=2020-01-02", "203.0.113.10"));
    expect(versioned.status).toBe(403);
    await expect(versioned.json()).resolves.toMatchObject({
      error: { code: "historical_date_unavailable" },
    });

    const compatibility = await getCompatibilityEvents(request("/api/events?date=2020-01-02", "203.0.113.11"));
    expect(compatibility.status).toBe(403);

    const rss = await getRss(request("/feed.xml?date=2020-01-02", "203.0.113.12"));
    expect(rss.status).toBe(403);
  });

  it("applies the same rate-limit headers to every route family", async () => {
    vi.stubEnv("RADAR_DATA_MODE", "live");
    vi.stubEnv("RADAR_ALLOW_HISTORICAL_DATES", "false");
    const responses = await Promise.all([
      getVersionedEvents(request("/api/v1/events?date=2020-01-02", "203.0.113.20")),
      getCompatibilityEvents(request("/api/events?date=2020-01-02", "203.0.113.21")),
      getRss(request("/feed.xml?date=2020-01-02", "203.0.113.22")),
    ]);

    for (const response of responses) {
      expect(response.headers.get("x-ratelimit-limit")).toBe("20");
      expect(response.headers.get("x-ratelimit-daily-limit")).toBe("200");
    }
  });
});
