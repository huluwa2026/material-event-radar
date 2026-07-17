import { TtlPromiseCache } from "@/lib/cache";
import { isValidDate, previousCompleteWeekday, shiftDate } from "@/lib/date";
import { parseSecFormType } from "@/lib/sec";
import {
  historicalDatesEnabled,
  isPublicDateAllowed,
  normalizePublicPageDate,
  publicDefaultDate,
  publicFilingLimit,
  publicRssItemLimit,
} from "@/lib/public-access";
import { filterFilings, filingsToCsv, parseFilters, parseWindow } from "@/lib/public-api";
import { aggregateEventRows } from "@/lib/aggregate";
import { checkRateLimit, clearRateLimits, rateLimitHeaders } from "@/lib/rate-limit";
import { validationRows } from "@/tests/fixtures/validation-2026-07-13";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  clearRateLimits();
});

describe("date helpers", () => {
  it("validates calendar dates and shifts safely", () => {
    expect(isValidDate("2026-07-13")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(shiftDate("2026-07-13", -1)).toBe("2026-07-12");
  });

  it("uses Friday as the complete date on Monday", () => {
    expect(previousCompleteWeekday(new Date("2026-07-13T16:00:00Z"))).toBe("2026-07-10");
  });
});

describe("SEC form parsing", () => {
  it("distinguishes 8-K and 6-K filing pages", () => {
    expect(parseSecFormType("<html><body><b>Form 8-K</b></body></html>")).toBe("8-K");
    expect(parseSecFormType("<table><tr><td>Form 6-K</td></tr></table>")).toBe("6-K");
    expect(parseSecFormType("<main>Form&nbsp;8-K/A</main>")).toBe("8-K/A");
    expect(parseSecFormType("Form 10-Q")).toBeNull();
  });

  it("ignores form-like text in non-visible HTML elements", () => {
    expect(parseSecFormType("<script>Form 8-K</script><style>.x::after{content:'Form 8-K'}</style>")).toBeNull();
    expect(parseSecFormType("<script>Form 8-K</script foo='bar'><main>Form 6-K</main>")).toBe("6-K");
    expect(parseSecFormType("<template>Form 8-K</template><p>Form 6-K/A</p>")).toBe("6-K/A");
  });
});

describe("TTL promise cache", () => {
  it("coalesces concurrent work for the same date", async () => {
    const cache = new TtlPromiseCache<number>(1_000);
    const factory = vi.fn(async () => 13);
    const [first, second] = await Promise.all([
      cache.getOrCreate("2026-07-13", factory),
      cache.getOrCreate("2026-07-13", factory),
    ]);
    expect(first).toBe(13);
    expect(second).toBe(13);
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("hosted access policy", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("keeps the hosted deployment on the latest complete weekday", () => {
    vi.stubEnv("RADAR_DATA_MODE", "live");
    vi.stubEnv("RADAR_ALLOW_HISTORICAL_DATES", "false");

    expect(publicDefaultDate(now)).toBe("2026-07-14");
    expect(isPublicDateAllowed("2026-07-14", now)).toBe(true);
    expect(isPublicDateAllowed("2026-07-13", now)).toBe(false);
    expect(isPublicDateAllowed("2026-07-15", now)).toBe(false);
    expect(normalizePublicPageDate("2026-07-13", now)).toBe("2026-07-14");
    expect(historicalDatesEnabled()).toBe(false);
  });

  it("lets self-hosted and fixture deployments opt into historical dates", () => {
    vi.stubEnv("RADAR_DATA_MODE", "live");
    vi.stubEnv("RADAR_ALLOW_HISTORICAL_DATES", "true");
    expect(isPublicDateAllowed("2020-01-02", now)).toBe(true);
    expect(isPublicDateAllowed("2026-07-15", now)).toBe(false);

    vi.stubEnv("RADAR_ALLOW_HISTORICAL_DATES", "false");
    vi.stubEnv("RADAR_DATA_MODE", "fixture");
    expect(publicDefaultDate(now)).toBe("2026-07-13");
    expect(historicalDatesEnabled()).toBe(true);
  });

  it("uses bounded export limits with configurable self-host overrides", () => {
    expect(publicFilingLimit()).toBe(100);
    expect(publicRssItemLimit()).toBe(50);
    vi.stubEnv("PUBLIC_MAX_FILINGS", "12");
    vi.stubEnv("PUBLIC_MAX_RSS_ITEMS", "7");
    expect(publicFilingLimit()).toBe(12);
    expect(publicRssItemLimit()).toBe(7);
  });
});

describe("public request budget", () => {
  it("enforces minute and daily counters and emits both header sets", () => {
    const now = Date.parse("2026-07-15T12:00:00Z");
    let result = checkRateLimit("203.0.113.1", now);
    for (let index = 1; index < 20; index += 1) {
      result = checkRateLimit("203.0.113.1", now);
    }
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);

    const blocked = checkRateLimit("203.0.113.1", now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(rateLimitHeaders(blocked)).toMatchObject({
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Daily-Limit": "200",
    });
  });

  it("keeps the daily budget after minute windows reset", () => {
    const now = Date.parse("2026-07-15T12:00:00Z");
    let result = checkRateLimit("203.0.113.2", now);
    for (let index = 1; index < 200; index += 1) {
      const minuteWindow = Math.floor(index / 20);
      result = checkRateLimit("203.0.113.2", now + minuteWindow * 61_000);
    }
    expect(result.allowed).toBe(true);
    expect(result.dailyRemaining).toBe(0);

    const blocked = checkRateLimit("203.0.113.2", now + 10 * 61_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(80_000);
  });
});

describe("Drillr project attribution", () => {
  it("sends a stable project header without exposing the API key to the browser", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
      readFile(new URL("../lib/drillr.ts", import.meta.url), "utf8"),
    );
    expect(source).toContain('"X-Drillr-Via": "material-event-radar"');
    expect(source).toContain("process.env.DRILLR_API_KEY");
  });
});

describe("public API helpers", () => {
  const radar = aggregateEventRows(validationRows, "2026-07-13", "fixture");

  it("accepts only supported timeline windows", () => {
    expect(parseWindow(null)).toBe(1);
    expect(parseWindow("7")).toBe(7);
    expect(parseWindow("30")).toBe(30);
    expect(parseWindow("14")).toBeNull();
  });

  it("filters by category, ticker list, and sparse policy", () => {
    const filters = parseFilters(new URLSearchParams("category=deal&tickers=PLUG,PSA"));
    expect(filterFilings(radar.filings, filters).map((filing) => filing.ticker)).toEqual(["PLUG", "PSA"]);
    const sparse = parseFilters(new URLSearchParams("completeness=sparse"));
    expect(filterFilings(radar.filings, sparse).map((filing) => filing.ticker)).toEqual(["TOP"]);
  });

  it("exports one CSV row per filing without section-level duplication", () => {
    const csv = filingsToCsv(radar.filings);
    expect(csv.trim().split("\n")).toHaveLength(14);
    expect(csv).toContain("filing_date,ticker,company_name");
    expect(csv).toContain("0001193125-26-301175");
  });
});
