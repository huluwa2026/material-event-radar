import { RadarApp } from "@/components/radar-app";
import { isValidDate, previousCompleteWeekday } from "@/lib/date";
import { EVENT_CATEGORIES } from "@/lib/types";
import type { Completeness, EventCategory } from "@/lib/types";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedDate = typeof params.date === "string" ? params.date : null;
  const requestedFiling = typeof params.filing === "string" ? params.filing : null;
  const initialDate = isValidDate(requestedDate) ? requestedDate : previousCompleteWeekday();
  const requestedCategory = typeof params.category === "string" ? params.category : "all";
  const requestedCompleteness = typeof params.completeness === "string" ? params.completeness : "all";
  const requestedWindow = Number(typeof params.window === "string" ? params.window : "1");

  return (
    <RadarApp
      initialDate={initialDate}
      initialFiling={requestedFiling}
      initialQuery={typeof params.q === "string" ? params.q.slice(0, 100) : ""}
      initialCategory={EVENT_CATEGORIES.includes(requestedCategory as EventCategory) ? requestedCategory as EventCategory : "all"}
      initialFormType={typeof params.form === "string" ? params.form.slice(0, 24) : "all"}
      initialCompleteness={(["complete", "partial", "sparse"] as string[]).includes(requestedCompleteness) ? requestedCompleteness as Completeness : "all"}
      initialShowSparse={params.sparse === "1" || requestedCompleteness === "sparse"}
      initialWindow={requestedWindow === 7 || requestedWindow === 30 ? requestedWindow : 1}
      initialWatchlistOnly={params.watchlist === "1"}
    />
  );
}
