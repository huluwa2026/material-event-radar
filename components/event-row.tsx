"use client";

import type { EventCategory, MaterialFiling } from "@/lib/types";
import { ArrowUpRight, ChevronRight, CircleAlert, Layers3 } from "lucide-react";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  deal: "Deal",
  executive: "Leadership",
  debt: "Debt",
  offering: "Offering",
};

function formatAmount(amount?: number, currency = "USD"): string | null {
  if (amount == null) return null;
  const prefix = currency === "USD" ? "$" : `${currency} `;
  if (amount >= 1_000_000_000) return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount / 1_000_000_000)}B`;
  if (amount >= 1_000_000) return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount / 1_000_000)}M`;
  if (amount >= 1_000) return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(amount / 1_000)}K`;
  return `${prefix}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;
}

export function EventRow({ filing, onOpen }: { filing: MaterialFiling; onOpen: () => void }) {
  const categories = filing.categories;
  const facts = filing.sections.flatMap((section) => section.facts).slice(0, 3);
  const amount = formatAmount(filing.primaryAmount, filing.currency);

  return (
    <article className={`event-row event-row--${categories[0] || "deal"}`}>
      <button className="event-row__button" onClick={onOpen} aria-label={`Open ${filing.ticker} filing details`}>
        <div className="event-row__identity">
          <div className="ticker-line">
            <span className="ticker">{filing.ticker}</span>
            <span className="form-badge">{filing.formType || "Form pending"}</span>
          </div>
          <p className="company-name">{filing.companyName}</p>
          <p className="filing-meta">Filed {filing.filingDate} · score {Math.round(filing.importanceScore)}</p>
        </div>

        <div className="event-row__body">
          <div className="category-line">
            {categories.map((category) => (
              <span className={`category-tag category-tag--${category}`} key={category}>
                {CATEGORY_LABELS[category]}
              </span>
            ))}
            {filing.sections.length > 1 && (
              <span className="section-count"><Layers3 size={13} /> {filing.sections.length} sections</span>
            )}
          </div>
          <h2>{filing.headline}</h2>
          <ul className="fact-preview">
            {facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </div>

        <div className="event-row__signal">
          {amount && <strong>{amount}</strong>}
          <span className={`completeness completeness--${filing.completeness}`}>
            {filing.completeness === "sparse" && <CircleAlert size={13} />}
            {filing.completeness}
          </span>
          <ChevronRight className="row-chevron" size={20} aria-hidden="true" />
        </div>
      </button>

      <a
        className="sec-shortcut"
        href={filing.secUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${filing.ticker} filing on SEC.gov`}
      >
        SEC <ArrowUpRight size={13} />
      </a>
    </article>
  );
}
