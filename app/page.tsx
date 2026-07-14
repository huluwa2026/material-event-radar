import { RadarApp } from "@/components/radar-app";
import { isValidDate, previousCompleteWeekday } from "@/lib/date";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const requestedDate = typeof params.date === "string" ? params.date : null;
  const requestedFiling = typeof params.filing === "string" ? params.filing : null;
  const initialDate = isValidDate(requestedDate) ? requestedDate : previousCompleteWeekday();

  return <RadarApp initialDate={initialDate} initialFiling={requestedFiling} />;
}
