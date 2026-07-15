"use client";

import type { EventCategory, MaterialFiling } from "@/lib/types";
import { ArrowUpRight, CheckCircle2, CircleAlert, FileText, Gauge, Table2, X } from "lucide-react";
import { useEffect, useRef } from "react";

const CATEGORY_LABELS: Record<EventCategory, string> = {
  deal: "Deal or material agreement",
  executive: "Leadership change",
  debt: "Debt issuance",
  offering: "Securities offering",
};

export function FilingDrawer({ filing, onClose }: { filing: MaterialFiling; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.classList.add("drawer-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("drawer-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="drawer-shell" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="filing-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-header">
          <div>
            <p className="eyebrow">SEC filing dossier</p>
            <div className="drawer-title-line">
              <span className="drawer-ticker">{filing.ticker}</span>
              <span>{filing.formType || "Form unverified"}</span>
            </div>
            <h2 id="drawer-title">{filing.companyName}</h2>
          </div>
          <button ref={closeRef} className="icon-button" onClick={onClose} aria-label="Close details">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-summary">
          <div><span>Filed</span><strong>{filing.filingDate}</strong></div>
          <div><span>Event date</span><strong>{filing.eventDate || "Not disclosed"}</strong></div>
          <div><span>Accession</span><strong>{filing.accession}</strong></div>
          <div><span>Source rows</span><strong>{filing.rawRowCount}</strong></div>
        </div>

        <div className={`disclosure-status disclosure-status--${filing.completeness}`}>
          {filing.completeness === "sparse" ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
          <div>
            <strong>{filing.completeness === "sparse" ? "Disclosure terms incomplete" : `${filing.completeness} structured disclosure`}</strong>
            <p>{filing.completeness === "sparse" ? "The event was identified, but missing terms are not inferred or filled in." : "Facts below come from structured filing records and are grouped by accession."}</p>
          </div>
        </div>

        <section className="audit-panel" aria-labelledby="audit-heading">
          <div className="audit-panel__heading">
            <div><Gauge size={17} /><span id="audit-heading">Why this filing ranks here</span></div>
            <strong>{Math.round(filing.ranking.total)}</strong>
          </div>
          <div className="score-breakdown">
            <div><span>Event class</span><b>+{filing.ranking.eventClass}</b></div>
            <div><span>Disclosed value</span><b>+{filing.ranking.disclosedValue}</b></div>
            <div><span>Multiple sections</span><b>+{filing.ranking.multiSection}</b></div>
            <div><span>Completeness</span><b>{filing.ranking.completeness}</b></div>
          </div>
          <ul>{filing.ranking.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
          <p>The deterministic score uses disclosed structure only; it does not predict market impact.</p>
        </section>

        <div className="drawer-sections">
          {filing.sections.map((section, index) => (
            <section className={`drawer-section drawer-section--${section.category}`} key={section.id}>
              <div className="drawer-section__number">{String(index + 1).padStart(2, "0")}</div>
              <div className="drawer-section__content">
                <p className="section-kicker">
                  {section.sourceCategories.map((category) => CATEGORY_LABELS[category]).join(" + ")}
                  {section.itemCode ? ` · Item ${section.itemCode}` : ""}
                </p>
                <h3>{section.headline}</h3>
                <ul>
                  {section.facts.map((fact) => <li key={fact}>{fact}</li>)}
                </ul>
                <div className="raw-provenance">
                  <Table2 size={13} />
                  <span>Merged from {section.rawRowCount} structured {section.rawRowCount === 1 ? "record" : "records"}</span>
                  {section.sourceTables.map((table) => <code key={table}>{table}</code>)}
                </div>
              </div>
            </section>
          ))}
        </div>

        <footer className="drawer-footer">
          <div className="sec-state">
            <FileText size={17} />
            <span>{filing.secAccessible === false ? "SEC page check failed" : filing.secAccessible === true ? "SEC page verified" : "SEC page linked"}</span>
          </div>
          <a href={filing.secUrl} target="_blank" rel="noreferrer" className="sec-primary">
            Read original filing <ArrowUpRight size={16} />
          </a>
        </footer>
      </aside>
    </div>
  );
}
