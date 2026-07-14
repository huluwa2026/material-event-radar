import { aggregateEventRows, buildSecUrl } from "@/lib/aggregate";
import type { CategorizedRows } from "@/lib/types";
import { validationRows } from "@/tests/fixtures/validation-2026-07-13";
import { describe, expect, it } from "vitest";

const radar = aggregateEventRows(validationRows, "2026-07-13");

describe("filing aggregation", () => {
  it("collapses the 30-row validation sample into 13 unique filings", () => {
    expect(radar.sourceRowCount).toBe(30);
    expect(radar.filings).toHaveLength(13);
    expect(new Set(radar.filings.map((filing) => filing.accession)).size).toBe(13);
  });

  it("preserves two distinct PLUG transactions under one accession", () => {
    const plug = radar.filings.find((filing) => filing.ticker === "PLUG");
    expect(plug).toBeDefined();
    expect(plug?.sections.filter((section) => section.category === "deal")).toHaveLength(2);
    expect(plug?.rawRowCount).toBe(2);
  });

  it("collapses nine DAIO records while retaining three event categories", () => {
    const daio = radar.filings.find((filing) => filing.ticker === "DAIO");
    expect(daio?.rawRowCount).toBe(9);
    expect(daio?.categories).toEqual(expect.arrayContaining(["deal", "executive", "offering"]));
    expect(daio?.sections).toHaveLength(3);
    expect(daio?.sections.find((section) => section.sourceCategories.includes("offering"))?.category).toBe("deal");
  });

  it("merges NABL departure and appointment into one transition", () => {
    const nabl = radar.filings.find((filing) => filing.ticker === "NABL");
    expect(nabl?.sections).toHaveLength(1);
    expect(nabl?.headline.toLowerCase()).toContain("transition");
    expect(nabl?.sections[0].facts.join(" ")).toContain("Frank Colletti");
    expect(nabl?.sections[0].facts.join(" ")).toContain("Russell Rosa");
  });

  it("keeps the verified 6-K boundary and sparse extraction boundary", () => {
    expect(radar.filings.find((filing) => filing.ticker === "BAK")?.formType).toBe("6-K");
    expect(radar.filings.find((filing) => filing.ticker === "TOP")?.completeness).toBe("sparse");
  });

  it("drops synthetic news accessions", () => {
    const withNews: CategorizedRows = {
      ...validationRows,
      executive: [
        ...validationRows.executive,
        { ...validationRows.executive[0], accession_number: "news_123", ticker: "FAKE" },
      ],
    };
    const result = aggregateEventRows(withNews, "2026-07-13");
    expect(result.filings).toHaveLength(13);
    expect(result.sourceRowCount).toBe(30);
  });
});

describe("SEC URLs", () => {
  it("builds the canonical filing index URL", () => {
    expect(buildSecUrl("0001393311", "0001193125-26-301175")).toBe(
      "https://www.sec.gov/Archives/edgar/data/1393311/000119312526301175/0001193125-26-301175-index.html",
    );
  });
});
