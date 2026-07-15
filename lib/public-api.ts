import { EVENT_CATEGORIES } from "@/lib/types";
import type { Completeness, DailyRadar, EventCategory, MaterialFiling } from "@/lib/types";

export interface PublicEventFilters {
  query: string;
  ticker: string;
  tickers: string[];
  category: "all" | EventCategory;
  formType: string;
  completeness: "all" | Completeness;
  includeSparse: boolean;
}

const COMPLETENESS = new Set<Completeness>(["complete", "partial", "sparse"]);

export function parseWindow(value: string | null): 1 | 7 | 30 | null {
  if (value == null || value === "") return 1;
  const parsed = Number(value);
  return parsed === 1 || parsed === 7 || parsed === 30 ? parsed : null;
}

export function parseFilters(params: URLSearchParams): PublicEventFilters {
  const categoryValue = params.get("category");
  const completenessValue = params.get("completeness");
  return {
    query: (params.get("q") || "").trim().slice(0, 100),
    ticker: (params.get("ticker") || "").trim().toUpperCase().slice(0, 12),
    tickers: (params.get("tickers") || "")
      .split(",")
      .map((ticker) => ticker.trim().toUpperCase())
      .filter((ticker) => /^[A-Z0-9.-]{1,12}$/.test(ticker))
      .slice(0, 50),
    category: categoryValue && EVENT_CATEGORIES.includes(categoryValue as EventCategory)
      ? categoryValue as EventCategory
      : "all",
    formType: (params.get("form") || "all").trim().slice(0, 24),
    completeness: completenessValue && COMPLETENESS.has(completenessValue as Completeness)
      ? completenessValue as Completeness
      : "all",
    includeSparse: params.get("sparse") === "1" || completenessValue === "sparse",
  };
}

export function filterFilings(
  filings: MaterialFiling[],
  filters: PublicEventFilters,
): MaterialFiling[] {
  const query = filters.query.toLowerCase();
  return filings.filter((filing) => {
    if (!filters.includeSparse && filing.completeness === "sparse") return false;
    if (filters.ticker && filing.ticker !== filters.ticker) return false;
    if (filters.tickers.length && !filters.tickers.includes(filing.ticker)) return false;
    if (query && !`${filing.ticker} ${filing.companyName} ${filing.headline}`.toLowerCase().includes(query)) return false;
    if (filters.category !== "all" && !filing.categories.includes(filters.category)) return false;
    if (filters.formType !== "all" && filing.formType !== filters.formType) return false;
    if (filters.completeness !== "all" && filing.completeness !== filters.completeness) return false;
    return true;
  });
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function filingsToCsv(filings: MaterialFiling[]): string {
  const headers = [
    "filing_date",
    "ticker",
    "company_name",
    "form_type",
    "accession",
    "headline",
    "categories",
    "completeness",
    "importance_score",
    "primary_amount",
    "currency",
    "section_count",
    "source_row_count",
    "sec_url",
  ];
  const rows = filings.map((filing) => [
    filing.filingDate,
    filing.ticker,
    filing.companyName,
    filing.formType,
    filing.accession,
    filing.headline,
    filing.categories.join("|"),
    filing.completeness,
    filing.importanceScore,
    filing.primaryAmount,
    filing.currency,
    filing.sections.length,
    filing.rawRowCount,
    filing.secUrl,
  ]);
  return `${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

export function publicRadarData(radar: DailyRadar, filings: MaterialFiling[]) {
  return {
    ...radar,
    filings,
    stats: {
      ...radar.stats,
      returned: filings.length,
    },
  };
}
