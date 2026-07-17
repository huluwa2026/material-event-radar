"use client";

import { EventRow } from "@/components/event-row";
import { FilingDrawer } from "@/components/filing-drawer";
import { shiftDate } from "@/lib/date";
import type { Completeness, DailyRadar, EventCategory, MaterialFiling } from "@/lib/types";
import { ArrowLeft, ArrowRight, Bookmark, CalendarDays, Clock3, Database, Download, Filter, Radio, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ApiError {
  error?: { message?: string };
}

interface ApiEnvelope {
  data?: DailyRadar;
  error?: { message?: string };
}

type CategoryFilter = "all" | EventCategory;
type CompletenessFilter = "all" | Completeness;
type WindowDays = 1 | 7 | 30;

interface RadarAppProps {
  initialDate: string;
  allowDateNavigation: boolean;
  initialFiling: string | null;
  initialQuery: string;
  initialCategory: CategoryFilter;
  initialFormType: string;
  initialCompleteness: CompletenessFilter;
  initialShowSparse: boolean;
  initialWindow: WindowDays;
  initialWatchlistOnly: boolean;
}

const WATCHLIST_KEY = "material-event-radar.watchlist.v1";

export function RadarApp({
  initialDate,
  allowDateNavigation,
  initialFiling,
  initialQuery,
  initialCategory,
  initialFormType,
  initialCompleteness,
  initialShowSparse,
  initialWindow,
  initialWatchlistOnly,
}: RadarAppProps) {
  const [date, setDate] = useState(initialDate);
  const [windowDays, setWindowDays] = useState<WindowDays>(initialWindow);
  const [radar, setRadar] = useState<DailyRadar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState<CategoryFilter>(initialCategory);
  const [formType, setFormType] = useState(initialFormType);
  const [completeness, setCompleteness] = useState<CompletenessFilter>(initialCompleteness);
  const [showSparse, setShowSparse] = useState(initialShowSparse);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchlistOnly, setWatchlistOnly] = useState(initialWatchlistOnly);
  const [selected, setSelected] = useState<MaterialFiling | null>(null);
  const initialSelectionHandled = useRef(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || "[]") as unknown;
      if (Array.isArray(stored)) {
        // Hydrate the browser-only preference after the server render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWatchlist(stored.filter((ticker): ticker is string => typeof ticker === "string"));
      }
    } catch {
      window.localStorage.removeItem(WATCHLIST_KEY);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // A new date/refresh token represents a new external request lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setSelected(null);

    const endpoint = windowDays === 1
      ? `/api/events?date=${encodeURIComponent(date)}`
      : `/api/v1/events?date=${encodeURIComponent(date)}&window=${windowDays}`;
    fetch(endpoint, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as DailyRadar | ApiEnvelope | ApiError;
        if (!response.ok) {
          const failure = payload as ApiError;
          throw new Error(failure.error?.message || "Unable to load filing data.");
        }
        return "data" in payload && payload.data ? payload.data : payload as DailyRadar;
      })
      .then((payload) => {
        setRadar(payload);
        if (!initialSelectionHandled.current && initialFiling) {
          setSelected(payload.filings.find((filing) => filing.accession === initialFiling) ?? null);
        }
        initialSelectionHandled.current = true;
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [date, windowDays, refreshToken, initialFiling]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const setOptional = (name: string, value: string, defaultValue: string) => {
      if (value === defaultValue || value === "") url.searchParams.delete(name);
      else url.searchParams.set(name, value);
    };
    url.searchParams.set("date", date);
    setOptional("window", String(windowDays), "1");
    setOptional("q", search.trim(), "");
    setOptional("category", category, "all");
    setOptional("form", formType, "all");
    setOptional("completeness", completeness, "all");
    if (showSparse) url.searchParams.set("sparse", "1");
    else url.searchParams.delete("sparse");
    if (watchlistOnly) url.searchParams.set("watchlist", "1");
    else url.searchParams.delete("watchlist");
    if (selected) url.searchParams.set("filing", selected.accession);
    else url.searchParams.delete("filing");
    window.history.replaceState(null, "", url);
  }, [date, windowDays, search, category, formType, completeness, showSparse, watchlistOnly, selected]);

  const forms = useMemo(
    () => [...new Set((radar?.filings ?? []).map((filing) => filing.formType).filter((value): value is string => Boolean(value)))].sort(),
    [radar],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (radar?.filings ?? []).filter((filing) => {
      if (!showSparse && filing.completeness === "sparse") return false;
      if (watchlistOnly && !watchlist.includes(filing.ticker)) return false;
      if (query && !`${filing.ticker} ${filing.companyName}`.toLowerCase().includes(query)) return false;
      if (category !== "all" && !filing.categories.includes(category)) return false;
      if (formType !== "all" && filing.formType !== formType) return false;
      if (completeness !== "all" && filing.completeness !== completeness) return false;
      return true;
    });
  }, [radar, showSparse, watchlistOnly, watchlist, search, category, formType, completeness]);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const filing of filtered) counts.set(filing.filingDate, (counts.get(filing.filingDate) ?? 0) + 1);
    return counts;
  }, [filtered]);

  const exportParams = useMemo(() => {
    const params = new URLSearchParams({ date, window: String(windowDays) });
    if (search.trim()) params.set("q", search.trim());
    if (category !== "all") params.set("category", category);
    if (formType !== "all") params.set("form", formType);
    if (completeness !== "all") params.set("completeness", completeness);
    if (showSparse) params.set("sparse", "1");
    if (watchlistOnly && watchlist.length) params.set("tickers", watchlist.join(","));
    return params.toString();
  }, [date, windowDays, search, category, formType, completeness, showSparse, watchlistOnly, watchlist]);

  const toggleWatchlist = useCallback((ticker: string) => {
    setWatchlist((current) => {
      const next = current.includes(ticker)
        ? current.filter((candidate) => candidate !== ticker)
        : [...current, ticker].sort();
      window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openFiling = useCallback((filing: MaterialFiling) => {
    setSelected(filing);
  }, []);

  const closeFiling = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="masthead__inner">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
            <div>
              <p className="brand-name">Material Event Radar</p>
              <p className="brand-subtitle">SEC filing intelligence · factual, grouped, auditable</p>
            </div>
          </div>
          <div className="source-state">
            <ShieldCheck size={16} /> SEC-linked data
            {radar?.source.mode === "fixture" ? (
              <span>recorded fixture</span>
            ) : (
              <a href="https://drillr.ai/l/material-radar-app" target="_blank" rel="noreferrer">build with Drillr</a>
            )}
          </div>
        </div>
      </header>

      <section className="research-bar" aria-label="Research date controls">
        <div className="research-bar__inner">
          <div className="date-controls">
            {allowDateNavigation ? (
              <>
                <button className="square-button" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous date"><ArrowLeft size={18} /></button>
                <label className="date-field">
                  <CalendarDays size={17} />
                  <span>Research date</span>
                  <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </label>
                <button className="square-button" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next date"><ArrowRight size={18} /></button>
              </>
            ) : (
              <div className="date-field date-field--fixed">
                <CalendarDays size={17} />
                <span>Latest complete date</span>
                <time dateTime={date}>{date}</time>
              </div>
            )}
          </div>
          <div className="research-meta">
            {radar && <span><Database size={14} /> {radar.sourceRowCount} source records</span>}
            {radar && <span><Clock3 size={14} /> {radar.source.mode === "fixture" ? `Recorded ${radar.source.fixtureDate}` : `Updated ${formatTime(radar.fetchedAt)}`}</span>}
            <button className="text-button" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "is-spinning" : ""} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="workspace">
        {radar?.source.mode === "fixture" && <div className="data-notice"><strong>Recorded fixture mode</strong><span>This is the real July 13, 2026 validation sample, not live market data.</span></div>}
        <section className="daily-heading">
          <div>
            <p className="eyebrow">{windowDays === 1 ? "Daily filing digest" : `${windowDays}-day filing timeline`}</p>
            <h1>{windowDays === 1 ? formatDisplayDate(date) : `${formatShortDate(radar?.fromDate || shiftDate(date, -(windowDays - 1)))} — ${formatShortDate(date)}`}</h1>
            <p>Material company disclosures organized by SEC accession—not by noisy alert rows. Every score and merged source remains inspectable.</p>
          </div>
          <div className="heading-actions">
            <div className="window-switch" aria-label="Timeline window">
              {([1, 7, 30] as const).map((value) => <button key={value} aria-pressed={windowDays === value} onClick={() => setWindowDays(value)}>{value === 1 ? "1D" : `${value}D`}</button>)}
            </div>
            {radar && <p className="as-of">{radar.source.mode === "live" ? "Live structured data" : "Historical validation data"}</p>}
          </div>
        </section>

        <section className="stat-strip" aria-label="Daily event totals">
          <Stat label={windowDays === 1 ? "Unique filings" : `${windowDays}-day filings`} value={radar?.stats.filings} primary />
          <Stat label="Deals" value={radar?.stats.deal} />
          <Stat label="Leadership" value={radar?.stats.executive} />
          <Stat label="Debt" value={radar?.stats.debt} />
          <Stat label="Offerings" value={radar?.stats.offering} />
        </section>

        <section className="filter-bar" aria-label="Event filters">
          <label className="search-field">
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticker or company" aria-label="Search ticker or company" />
          </label>
          <div className="select-field"><Filter size={15} /><select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)} aria-label="Filter by event category"><option value="all">All event types</option><option value="deal">Deals</option><option value="executive">Leadership</option><option value="debt">Debt</option><option value="offering">Offerings</option></select></div>
          <div className="select-field"><select value={formType} onChange={(event) => setFormType(event.target.value)} aria-label="Filter by form type"><option value="all">All forms</option>{forms.map((form) => <option key={form} value={form}>{form}</option>)}</select></div>
          <div className="select-field"><select value={completeness} onChange={(event) => setCompleteness(event.target.value as CompletenessFilter)} aria-label="Filter by completeness"><option value="all">All completeness</option><option value="complete">Complete</option><option value="partial">Partial</option><option value="sparse">Sparse</option></select></div>
          <label className="sparse-toggle"><input type="checkbox" checked={showSparse} onChange={(event) => setShowSparse(event.target.checked)} /><span>Show sparse</span>{radar && radar.stats.sparse > 0 && <b>{radar.stats.sparse}</b>}</label>
          <label className="sparse-toggle watchlist-toggle"><input type="checkbox" checked={watchlistOnly} onChange={(event) => setWatchlistOnly(event.target.checked)} /><Bookmark size={14} /><span>Watchlist</span>{watchlist.length > 0 && <b>{watchlist.length}</b>}</label>
        </section>

        <div className="list-caption"><span>{loading ? "Loading filings…" : `${filtered.length} filing${filtered.length === 1 ? "" : "s"} shown`}</span><span>Ranked by event class, disclosed value, and completeness</span></div>
        <nav className="data-tools" aria-label="Data feeds and exports">
          <a href={`/api/v1/events?${exportParams}`} target="_blank" rel="noreferrer"><Database size={14} /> JSON API</a>
          <a href={`/api/v1/events?${exportParams}&format=csv`}><Download size={14} /> CSV</a>
          <a href={`/feed.xml?${exportParams}`} target="_blank" rel="noreferrer"><Radio size={14} /> RSS</a>
          <span>Filters are included in every export link.</span>
        </nav>

        <section className="event-list" aria-live="polite" aria-busy={loading}>
          {loading && <LoadingRows />}
          {!loading && error && <ErrorState message={error} onRetry={() => setRefreshToken((value) => value + 1)} />}
          {!loading && !error && filtered.map((filing, index) => (
            <Fragment key={`${filing.filingDate}-${filing.accession}`}>
              {windowDays > 1 && filtered[index - 1]?.filingDate !== filing.filingDate && (
                <div className="timeline-day"><time dateTime={filing.filingDate}>{formatDisplayDate(filing.filingDate)}</time><span>{dayCounts.get(filing.filingDate)} filings</span></div>
              )}
              <EventRow filing={filing} watched={watchlist.includes(filing.ticker)} onToggleWatch={() => toggleWatchlist(filing.ticker)} onOpen={() => openFiling(filing)} />
            </Fragment>
          ))}
          {!loading && !error && filtered.length === 0 && <EmptyState hasData={Boolean(radar?.filings.length)} />}
        </section>

        <footer className="page-footer">
          <p>Independent open-source project using structured data accessed through Drillr and linked to original SEC filings. <a href="https://drillr.ai/l/material-radar-app" target="_blank" rel="noreferrer">Build your own radar</a>.</p>
          <p>Not affiliated with or endorsed by Drillr. No investment advice. Missing terms are never inferred.</p>
        </footer>
      </div>

      {selected && <FilingDrawer filing={selected} onClose={closeFiling} />}
    </main>
  );
}

function Stat({ label, value, primary = false }: { label: string; value: number | undefined; primary?: boolean }) {
  return <div className={primary ? "stat stat--primary" : "stat"}><span>{label}</span><strong>{value ?? "—"}</strong></div>;
}

function LoadingRows() {
  return <>{[0, 1, 2, 3].map((index) => <div className="loading-row" key={index}><span /><div><i /><i /><i /></div><b /></div>)}</>;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="state-panel state-panel--error"><span>DATA UNAVAILABLE</span><h2>The filing feed could not be loaded.</h2><p>{message}</p><button onClick={onRetry}>Try again</button></div>;
}

function EmptyState({ hasData }: { hasData: boolean }) {
  return <div className="state-panel"><span>{hasData ? "NO MATCHES" : "NO FILINGS"}</span><h2>{hasData ? "No filings match these filters." : "No structured material events were found for this date."}</h2><p>{hasData ? "Adjust the search or filters to widen the view." : "Use the date controls to inspect another filing day."}</p></div>;
}

function formatDisplayDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00Z`));
}
