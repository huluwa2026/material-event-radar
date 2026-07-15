import { aggregateEventRows } from "@/lib/aggregate";
import { TtlPromiseCache } from "@/lib/cache";
import { shiftDate } from "@/lib/date";
import { fetchEventRows, fetchEventRowsRange, isFixtureMode, RECORDED_FIXTURE_DATE } from "@/lib/drillr";
import { attachSecMetadata } from "@/lib/sec";
import type { CategorizedRows, DailyRadar, EventCategory, MaterialFiling, RadarStats, RawRow } from "@/lib/types";

const cacheSeconds = Number(process.env.EVENT_CACHE_TTL_SECONDS || 900);
const radarCache = new TtlPromiseCache<DailyRadar>(Math.max(30, cacheSeconds) * 1000);

function sourceState(): DailyRadar["source"] {
  return isFixtureMode()
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

export function getDailyRadar(date: string): Promise<DailyRadar> {
  return radarCache.getOrCreate(date, async () => {
    const rows = await fetchEventRows(date);
    const radar = aggregateEventRows(rows, date, isFixtureMode() ? "fixture" : "live");
    return {
      ...radar,
      filings: isFixtureMode() ? radar.filings : await attachSecMetadata(radar.filings),
    };
  });
}

export function getRadarWindow(date: string, windowDays: 1 | 7 | 30): Promise<DailyRadar> {
  if (windowDays === 1) return getDailyRadar(date);
  const cacheKey = `${date}:${windowDays}`;
  return radarCache.getOrCreate(cacheKey, async () => {
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
        aggregateEventRows(rowsForDate(rows, filingDate), filingDate, isFixtureMode() ? "fixture" : "live").filings,
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
      source: sourceState(),
      sourceRowCount: Object.values(rows).reduce((total, categoryRows) => total + categoryRows.length, 0),
      filings,
      stats: statsFor(filings),
    };
  });
}
