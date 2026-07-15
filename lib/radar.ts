import { aggregateEventRows } from "@/lib/aggregate";
import { TtlPromiseCache } from "@/lib/cache";
import { shiftDate } from "@/lib/date";
import { fetchEventRows, fetchEventRowsRange, isFixtureMode, RECORDED_FIXTURE_DATE } from "@/lib/drillr";
import { attachSecMetadata } from "@/lib/sec";
import type { CategorizedRows, DailyRadar, EventCategory, MaterialFiling, RadarStats, RawRow } from "@/lib/types";
import { unstable_cache } from "next/cache";

const requestedCacheSeconds = Number(process.env.EVENT_CACHE_TTL_SECONDS || 3600);
const cacheSeconds = Number.isFinite(requestedCacheSeconds) && requestedCacheSeconds > 0
  ? requestedCacheSeconds
  : 3600;
const radarCache = new TtlPromiseCache<DailyRadar>(Math.max(30, cacheSeconds) * 1000);

function sourceState(mode: "fixture" | "live"): DailyRadar["source"] {
  return mode === "fixture"
    ? { mode: "fixture", provider: "Recorded fixture", fixtureDate: RECORDED_FIXTURE_DATE }
    : { mode: "live", provider: "Drillr" };
}

function statsFor(filings: MaterialFiling[]): RadarStats {
  const countCategory = (category: EventCategory) =>
    filings.filter((filing) => filing.categories.includes(category)).length;
  return {
    filings: filings.length,
    deal: countCategory("deal"),
    executive: countCategory("executive"),
    debt: countCategory("debt"),
    offering: countCategory("offering"),
    complete: filings.filter((filing) => filing.completeness === "complete").length,
    sparse: filings.filter((filing) => filing.completeness === "sparse").length,
  };
}

function rowDate(row: RawRow): string | null {
  if (row.filing_date == null) return null;
  return String(row.filing_date).slice(0, 10);
}

function rowsForDate(rows: CategorizedRows, date: string): CategorizedRows {
  return {
    deal: rows.deal.filter((row) => rowDate(row) === date),
    executive: rows.executive.filter((row) => rowDate(row) === date),
    debt: rows.debt.filter((row) => rowDate(row) === date),
    offering: rows.offering.filter((row) => rowDate(row) === date),
  };
}

async function buildRadar(date: string, windowDays: 1 | 7 | 30, mode: "fixture" | "live"): Promise<DailyRadar> {
  const fixture = mode === "fixture";
  if (windowDays === 1) {
    const rows = await fetchEventRows(date);
    const radar = aggregateEventRows(rows, date, mode);
    return {
      ...radar,
      filings: fixture ? radar.filings : await attachSecMetadata(radar.filings),
    };
  }

  const fromDate = shiftDate(date, -(windowDays - 1));
  const rows = await fetchEventRowsRange(fromDate, date);
  const dates = new Set<string>();
  for (const category of Object.keys(rows) as EventCategory[]) {
    for (const row of rows[category]) {
      const value = rowDate(row);
      if (value) dates.add(value);
    }
  }

  const filings = [...dates]
    .sort()
    .reverse()
    .flatMap((filingDate) =>
      aggregateEventRows(rowsForDate(rows, filingDate), filingDate, mode).filings,
    )
    .sort((left, right) =>
      right.filingDate.localeCompare(left.filingDate) ||
      right.importanceScore - left.importanceScore ||
      left.ticker.localeCompare(right.ticker),
    );

  return {
    date,
    fromDate,
    windowDays,
    fetchedAt: new Date().toISOString(),
    source: sourceState(mode),
    sourceRowCount: Object.values(rows).reduce((total, categoryRows) => total + categoryRows.length, 0),
    filings,
    stats: statsFor(filings),
  };
}

const getPersistedRadar = unstable_cache(
  buildRadar,
  ["material-event-radar", "radar-v2"],
  { revalidate: Math.max(30, cacheSeconds) },
);

export function getDailyRadar(date: string): Promise<DailyRadar> {
  return getRadarWindow(date, 1);
}

export function getRadarWindow(date: string, windowDays: 1 | 7 | 30): Promise<DailyRadar> {
  const mode = isFixtureMode() ? "fixture" : "live";
  const cacheKey = `${mode}:${date}:${windowDays}`;
  return radarCache.getOrCreate(cacheKey, () => {
    return getPersistedRadar(date, windowDays, mode);
  });
}
