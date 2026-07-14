import { aggregateEventRows } from "@/lib/aggregate";
import { TtlPromiseCache } from "@/lib/cache";
import { fetchEventRows } from "@/lib/drillr";
import { attachSecMetadata } from "@/lib/sec";
import type { DailyRadar } from "@/lib/types";

const cacheSeconds = Number(process.env.EVENT_CACHE_TTL_SECONDS || 900);
const radarCache = new TtlPromiseCache<DailyRadar>(Math.max(30, cacheSeconds) * 1000);

export function getDailyRadar(date: string): Promise<DailyRadar> {
  return radarCache.getOrCreate(date, async () => {
    const rows = await fetchEventRows(date);
    const radar = aggregateEventRows(rows, date);
    return {
      ...radar,
      filings: await attachSecMetadata(radar.filings),
    };
  });
}
