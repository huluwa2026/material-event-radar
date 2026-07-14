export const EVENT_CATEGORIES = ["deal", "executive", "debt", "offering"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type Completeness = "complete" | "partial" | "sparse";

export interface MonetaryValue {
  raw?: string | null;
  label?: string | null;
  amount?: number | null;
  currency?: string | null;
}

export type RawRow = Record<string, unknown>;

export interface CategorizedRows {
  deal: RawRow[];
  executive: RawRow[];
  debt: RawRow[];
  offering: RawRow[];
}

export interface MaterialEventSection {
  id: string;
  category: EventCategory;
  sourceCategories: EventCategory[];
  headline: string;
  facts: string[];
  amount?: number;
  currency?: string;
  itemCode?: string;
  rawRowCount: number;
}

export interface MaterialFiling {
  accession: string;
  formType: string | null;
  ticker: string;
  companyName: string;
  cik: string;
  filingDate: string;
  eventDate: string | null;
  secUrl: string;
  secAccessible: boolean | null;
  importanceScore: number;
  completeness: Completeness;
  headline: string;
  primaryAmount?: number;
  currency?: string;
  rawRowCount: number;
  categories: EventCategory[];
  sections: MaterialEventSection[];
}

export interface RadarStats {
  filings: number;
  deal: number;
  executive: number;
  debt: number;
  offering: number;
  complete: number;
  sparse: number;
}

export interface DailyRadar {
  date: string;
  fetchedAt: string;
  sourceRowCount: number;
  filings: MaterialFiling[];
  stats: RadarStats;
}

export interface SecMetadata {
  formType: string | null;
  accessible: boolean | null;
}
