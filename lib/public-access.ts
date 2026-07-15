import { previousCompleteWeekday } from "@/lib/date";
import { isFixtureMode, RECORDED_FIXTURE_DATE } from "@/lib/drillr";

const DEFAULT_MAX_FILINGS = 100;
const DEFAULT_MAX_RSS_ITEMS = 50;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function publicDefaultDate(now = new Date()): string {
  return isFixtureMode() ? RECORDED_FIXTURE_DATE : previousCompleteWeekday(now);
}

export function historicalDatesEnabled(): boolean {
  return isFixtureMode() || process.env.RADAR_ALLOW_HISTORICAL_DATES === "true";
}

export function isPublicDateAllowed(date: string, now = new Date()): boolean {
  if (isFixtureMode()) return true;
  const latest = publicDefaultDate(now);
  if (date > latest) return false;
  return historicalDatesEnabled() || date === latest;
}

export function normalizePublicPageDate(date: string | null, now = new Date()): string {
  const fallback = publicDefaultDate(now);
  return date && isPublicDateAllowed(date, now) ? date : fallback;
}

export function publicFilingLimit(): number {
  return positiveInteger(process.env.PUBLIC_MAX_FILINGS, DEFAULT_MAX_FILINGS);
}

export function publicRssItemLimit(): number {
  return positiveInteger(process.env.PUBLIC_MAX_RSS_ITEMS, DEFAULT_MAX_RSS_ITEMS);
}
