"use client";

import { EventRow } from "@/components/event-row";
import { FilingDrawer } from "@/components/filing-drawer";
import { shiftDate } from "@/lib/date";
import type { Completeness, DailyRadar, EventCategory, MaterialFiling } from "@/lib/types";
import { ArrowLeft, ArrowRight, CalendarDays, Database, Filter, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ApiError {
  error?: { message?: string };
}

type CategoryFilter = "all" | EventCategory;
type CompletenessFilter = "all" | Completeness;

export function RadarApp({ initialDate, initialFiling }: { initialDate: string; initialFiling: string | null }) {
  const [date, setDate] = useState(initialDate);
  const [radar, setRadar] = useState<DailyRadar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [formType, setFormType] = useState("all");
  const [completeness, setCompleteness] = useState<CompletenessFilter>("all");
  const [showSparse, setShowSparse] = useState(false);
  const [selected, setSelected] = useState<MaterialFiling | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // A new date/refresh token represents a new external request lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setSelected(null);

    fetch(`/api/events?date=${encodeURIComponent(date)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as DailyRadar | ApiError;
        if (!response.ok) {
          const failure = payload as ApiError;
          throw new Error(failure.error?.message || "Unable to load filing data.");
        }
        return payload as DailyRadar;
      })
      .then((payload) => {
        setRadar(payload);
        if (initialFiling) {
          setSelected(payload.filings.find((filing) => filing.accession === initialFiling) ?? null);
        }
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof Error && requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    const url = new URL(window.location.href);
    url.searchParams.set("date", date);
    url.searchParams.delete("filing");
    window.history.replaceState(null, "", url);
    return () => controller.abort();
  }, [date, refreshToken, initialFiling]);

  const forms = useMemo(
    () => [...new Set((radar?.filings ?? []).map((filing) => filing.formType).filter((value): value is string => Boolean(value)))].sort(),
    [radar],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (radar?.filings ?? []).filter((filing) => {
      if (!showSparse && filing.completeness === "sparse") return false;
      if (query && !`${filing.ticker} ${filing.companyName}`.toLowerCase().includes(query)) return false;
      if (category !== "all" && !filing.categories.includes(category)) return false;
      if (formType !== "all" && filing.formType !== formType) return false;
      if (completeness !== "all" && filing.completeness !== completeness) return false;
      return true;
    });
  }, [radar, showSparse, search, category, formType, completeness]);

  const openFiling = useCallback((filing: MaterialFiling) => {
    setSelected(filing);
    const url = new URL(window.location.href);
    url.searchParams.set("filing", filing.accession);
    window.history.replaceState(null, "", url);
  }, []);

  const closeFiling = useCallback(() => {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("filing");
    window.history.replaceState(null, "", url);
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
          <div className="source-state"><ShieldCheck size={16} /> SEC-linked data <span>via Drillr</span></div>
        </div>
      </header>

      <section className="research-bar" aria-label="Research date controls">
        <div className="research-bar__inner">
          <div className="date-controls">
            <button className="square-button" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous date"><ArrowLeft size={18} /></button>
            <label className="date-field">
              <CalendarDays size={17} />
              <span>Research date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <button className="square-button" onClick={() => setDate(shiftDate(date, 1))} aria-label="Next date"><ArrowRight size={18} /></button>
          </div>
          <div className="research-meta">
            {radar && <span><Database size={14} /> {radar.sourceRowCount} source records</span>}
            <button className="text-button" onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "is-spinning" : ""} /> Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="workspace">
        <section className="daily-heading">
          <div>
            <p className="eyebrow">Daily filing digest</p>
            <h1>{formatDisplayDate(date)}</h1>
            <p>Material company disclosures organized by SEC accession—not by noisy alert rows.</p>
          </div>
          {radar && <p className="as-of">Updated {formatTime(radar.fetchedAt)}</p>}
        </section>

        <section className="stat-strip" aria-label="Daily event totals">
          <Stat label="Unique filings" value={radar?.stats.filings} primary />
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
        </section>

        <div className="list-caption"><span>{loading ? "Loading filings…" : `${filtered.length} filing${filtered.length === 1 ? "" : "s"} shown`}</span><span>Ranked by event class, disclosed value, and completeness</span></div>

        <section className="event-list" aria-live="polite" aria-busy={loading}>
          {loading && <LoadingRows />}
          {!loading && error && <ErrorState message={error} onRetry={() => setRefreshToken((value) => value + 1)} />}
          {!loading && !error && filtered.map((filing) => <EventRow key={filing.accession} filing={filing} onOpen={() => openFiling(filing)} />)}
          {!loading && !error && filtered.length === 0 && <EmptyState hasData={Boolean(radar?.filings.length)} />}
        </section>

        <footer className="page-footer"><p>Source: structured corporate-event records from Drillr, linked to original SEC filings.</p><p>No price-move attribution. No investment advice. Missing terms are never inferred.</p></footer>
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
