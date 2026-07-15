import { describe, expect, it } from "vitest";
import { sanitizeAnalyticsUrl } from "@/lib/analytics";

describe("sanitizeAnalyticsUrl", () => {
  it("removes search, ticker, watchlist, and selected-filing parameters", () => {
    expect(
      sanitizeAnalyticsUrl(
        "https://material-event-radar.vercel.app/?search=merger&tickers=NVDA&watchlist=1&selected=secret#filing",
      ),
    ).toBe("https://material-event-radar.vercel.app/");
  });

  it("preserves a URL that has no query string or fragment", () => {
    expect(sanitizeAnalyticsUrl("https://material-event-radar.vercel.app/"))
      .toBe("https://material-event-radar.vercel.app/");
  });

  it("removes a fragment even when there is no query string", () => {
    expect(sanitizeAnalyticsUrl("https://material-event-radar.vercel.app/#detail"))
      .toBe("https://material-event-radar.vercel.app/");
  });
});
