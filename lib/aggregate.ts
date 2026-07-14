import type {
  CategorizedRows,
  Completeness,
  DailyRadar,
  EventCategory,
  MaterialEventSection,
  MaterialFiling,
  MonetaryValue,
  RawRow,
} from "@/lib/types";

interface NormalizedRecord {
  category: EventCategory;
  accession: string;
  ticker: string;
  companyName: string;
  cik: string;
  filingDate: string;
  eventDate: string | null;
  sourceUri: string | null;
  itemCode: string | null;
  formType: string | null;
  row: RawRow;
}

const CORE_EXECUTIVE = /chief|ceo|cfo|coo|president|chair/i;

function asText(value: unknown): string | null {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed || null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(asText).filter((item): item is string => Boolean(item)) : [];
}

function asMonetaryValues(value: unknown): MonetaryValue[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is MonetaryValue => Boolean(item) && typeof item === "object");
}

function dateOnly(value: unknown): string | null {
  const text = asText(value);
  return text ? text.slice(0, 10) : null;
}

function normalizeAccession(value: unknown): string | null {
  const accession = asText(value)?.replace(/^\/+|\/+$/g, "");
  if (!accession || /^news_/i.test(accession)) return null;
  return /^\d{10}-\d{2}-\d{6}$/.test(accession) ? accession : null;
}

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function splitSentences(value: string | null, limit = 6): string[] {
  if (!value) return [];
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function formatMoney(amount: number, currency = "USD"): string {
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const absolute = Math.abs(amount);
  if (absolute >= 1_000_000_000) return `${symbol}${trimDecimal(amount / 1_000_000_000)}B`;
  if (absolute >= 1_000_000) return `${symbol}${trimDecimal(amount / 1_000_000)}M`;
  if (absolute >= 1_000) return `${symbol}${trimDecimal(amount / 1_000)}K`;
  return `${symbol}${trimDecimal(amount)}`;
}

function trimDecimal(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value);
}

function humanize(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function monetaryPriority(label = ""): number {
  const value = label.toLowerCase();
  if (/upfront|initial|principal_amount|expected_aggregate_gross|total_value$/.test(value)) return 100;
  if (/net_proceeds|base_purchase|aggregate_principal/.test(value)) return 90;
  if (/shares.*offered|shares.*issued|units_issued/.test(value)) return 75;
  if (/price_per|purchase_price|interest_rate/.test(value)) return 65;
  if (/potential|warrant.*exercise|maximum|max_aggregate/.test(value)) return 45;
  if (/par_value|prior|pre_offering/.test(value)) return 10;
  return 50;
}

function monetaryFacts(rows: NormalizedRecord[], limit = 5): string[] {
  const values = rows.flatMap((record) => asMonetaryValues(record.row.monetary_values));
  return unique(
    values
      .sort((a, b) => monetaryPriority(b.label ?? "") - monetaryPriority(a.label ?? ""))
      .map((value) => {
        const raw = asText(value.raw);
        const label = humanize(asText(value.label));
        if (!raw) return null;
        return label ? `${raw} — ${label.toLowerCase()}.` : `${raw}.`;
      }),
  ).slice(0, limit);
}

function primaryMonetaryValue(rows: NormalizedRecord[], directFields: string[]): MonetaryValue | null {
  for (const field of directFields) {
    for (const record of rows) {
      const amount = asNumber(record.row[field]);
      if (amount != null && amount > 0) {
        return { amount, currency: asText(record.row.currency) || "USD", label: field };
      }
    }
  }

  const values = rows
    .flatMap((record) => asMonetaryValues(record.row.monetary_values))
    .filter((value) => typeof value.amount === "number" && value.amount > 0)
    .sort((a, b) => monetaryPriority(b.label ?? "") - monetaryPriority(a.label ?? ""));
  return values[0] ?? null;
}

function normalizeRows(rows: CategorizedRows): NormalizedRecord[] {
  const result: NormalizedRecord[] = [];

  for (const category of Object.keys(rows) as EventCategory[]) {
    for (const row of rows[category]) {
      const accession = normalizeAccession(
        category === "deal" ? row.source_accession : row.accession_number,
      );
      if (!accession) continue;

      const ticker = (asText(row.ticker) || "—").toUpperCase();
      const filingDate = dateOnly(row.filing_date);
      if (!filingDate) continue;

      result.push({
        category,
        accession,
        ticker,
        companyName: asText(row.company_name) || ticker,
        cik: (asText(row.cik) || "").replace(/^0+/, ""),
        filingDate,
        eventDate: dateOnly(row.event_date),
        sourceUri: asText(category === "deal" ? row.source_uri : row.source_uri),
        itemCode: asText(category === "deal" ? row.source_item : row.item_code),
        formType: asText(row.form_type) || (category === "deal" ? asText(row.source_type) : null),
        row,
      });
    }
  }

  return result;
}

export function buildSecUrl(cik: string, accession: string): string {
  const compact = accession.replace(/-/g, "");
  const normalizedCik = cik.replace(/^0+/, "");
  return `https://www.sec.gov/Archives/edgar/data/${normalizedCik}/${compact}/${accession}-index.html`;
}

function dealBuckets(records: NormalizedRecord[]): NormalizedRecord[][] {
  const fingerprints = new Map<string, NormalizedRecord[]>();
  for (const record of records) {
    const fingerprint = asText(record.row.deal_fingerprint) || `row-${record.row.id}`;
    const group = fingerprints.get(fingerprint) ?? [];
    group.push(record);
    fingerprints.set(fingerprint, group);
  }

  const buckets: NormalizedRecord[][] = [];
  for (const group of fingerprints.values()) {
    const amountGroups = new Map<string, NormalizedRecord[]>();
    const amountless: NormalizedRecord[] = [];
    for (const record of group) {
      const amount = asNumber(record.row.total_value);
      if (amount == null) {
        amountless.push(record);
      } else {
        const key = String(amount);
        const matches = amountGroups.get(key) ?? [];
        matches.push(record);
        amountGroups.set(key, matches);
      }
    }

    if (amountGroups.size <= 1) {
      buckets.push(group);
      continue;
    }

    const split = [...amountGroups.values()];
    split[0].push(...amountless);
    buckets.push(...split);
  }
  return buckets;
}

function dealHeadline(rows: NormalizedRecord[], amount: MonetaryValue | null): string {
  const text = rows.map((record) => `${record.row.key_terms ?? ""} ${record.row.amendment_summary ?? ""}`).join(" ");
  let label = "Material agreement";
  if (/private placement|issue and sell|gross proceeds/i.test(text)) label = "Financing agreement";
  else if (/real property|purchase price|asset/i.test(text)) label = "Asset transaction";
  else if (/convert|preferred stock/i.test(text)) label = "Financing conversion";
  else if (/management fee|management services/i.test(text)) label = "Management agreement revised";
  else if (/extend|extension/i.test(text)) label = "Transaction terms extended";
  else if (rows.some((record) => record.row.stage === "terminated")) label = "Agreement terminated or converted";

  return amount?.amount ? `${label} · ${formatMoney(amount.amount, amount.currency ?? "USD")}` : label;
}

function buildDealSections(records: NormalizedRecord[]): MaterialEventSection[] {
  return dealBuckets(records).map((rows, index) => {
    const primary = primaryMonetaryValue(rows, ["total_value"]);
    const terms = rows.flatMap((record) => [
      ...splitSentences(asText(record.row.key_terms), 4),
      ...splitSentences(asText(record.row.amendment_summary), 2),
      ...splitSentences(asText(record.row.stage_evidence), 1),
    ]);
    const dates = rows.flatMap((record) => [
      dateOnly(record.row.expected_close_date)
        ? `Expected close: ${dateOnly(record.row.expected_close_date)}.`
        : null,
      dateOnly(record.row.expiry_date) ? `Outside or expiry date: ${dateOnly(record.row.expiry_date)}.` : null,
    ]);
    const counterparties = unique(
      rows.flatMap((record) => asStringArray(record.row.counterparty_names)),
    );
    const facts = unique([
      ...terms,
      ...monetaryFacts(rows, 3),
      counterparties.length ? `Counterparties: ${counterparties.join(", ")}.` : null,
      ...dates,
    ]).slice(0, 7);

    return {
      id: `deal-${index + 1}`,
      category: "deal",
      sourceCategories: ["deal"],
      headline: dealHeadline(rows, primary),
      facts,
      amount: primary?.amount ?? undefined,
      currency: primary?.currency ?? undefined,
      itemCode: unique(rows.map((record) => record.itemCode)).join(", ") || undefined,
      rawRowCount: rows.length,
    };
  });
}

function executiveFact(record: NormalizedRecord): string | null {
  const event = (asText(record.row.event_type) || "change").toLowerCase();
  const person = asText(record.row.person_name);
  const title = asText(record.row.title);
  if (!person && !title) return null;
  const effective = dateOnly(record.row.effective_date);
  const reason = asText(record.row.departure_reason);
  const interim = record.row.is_interim === true ? " on an interim basis" : "";

  if (/depart|resign|retire|terminat/.test(event)) {
    const reasonText = reason === "not_disclosed" || !reason ? " Reason was not disclosed." : ` Reason: ${reason}.`;
    return `${person || "An executive"} departed as ${title || "an executive"}.${reasonText}`;
  }
  if (/appoint|promot|elect/.test(event)) {
    return `${person || "An executive"} was ${event === "election" ? "elected" : event === "promotion" ? "promoted" : "appointed"} ${title ? `as ${title}` : ""}${interim}${effective ? `, effective ${effective}` : ""}.`;
  }
  return `${person || "An executive"}: ${humanize(event)}${title ? ` — ${title}` : ""}${effective ? `, effective ${effective}` : ""}.`;
}

function buildExecutiveSection(records: NormalizedRecord[]): MaterialEventSection {
  const departures = records.filter((record) => /depart|resign|retire|terminat/i.test(asText(record.row.event_type) || ""));
  const appointments = records.filter((record) => /appoint|promot|elect/i.test(asText(record.row.event_type) || ""));
  const titles = unique(records.map((record) => asText(record.row.title)));
  const facts = unique(records.map(executiveFact));

  let headline = "Leadership change";
  if (departures.length && appointments.length) headline = `${titles[0] || "Leadership"} transition`;
  else if (records.length > 1 && records.every((record) => /director/i.test(asText(record.row.title) || ""))) {
    headline = `${records.length} directors elected`;
  } else if (appointments.length === 1) {
    const event = asText(appointments[0].row.event_type);
    headline = `${asText(appointments[0].row.title) || "Executive"} ${event === "promotion" ? "promoted" : /director/i.test(asText(appointments[0].row.title) || "") ? "appointed" : "named"}`;
  } else if (departures.length === 1) {
    headline = `${asText(departures[0].row.title) || "Executive"} departure`;
  }

  return {
    id: "executive-1",
    category: "executive",
    sourceCategories: ["executive"],
    headline,
    facts,
    itemCode: unique(records.map((record) => record.itemCode)).join(", ") || undefined,
    rawRowCount: records.length,
  };
}

function buildDebtSection(records: NormalizedRecord[]): MaterialEventSection {
  const primary = primaryMonetaryValue(records, ["principal_amount"]);
  const facts = unique([
    ...records.flatMap((record) => [
      asText(record.row.instrument_type) ? `Instrument: ${humanize(asText(record.row.instrument_type))}.` : null,
      asText(record.row.interest_rate) ? `Interest rate: ${record.row.interest_rate}.` : null,
      dateOnly(record.row.maturity_date) ? `Maturity: ${dateOnly(record.row.maturity_date)}.` : null,
      asText(record.row.lender_name) ? `Lender: ${record.row.lender_name}.` : null,
      asText(record.row.use_of_proceeds) ? `Use of proceeds: ${record.row.use_of_proceeds}.` : null,
      ...splitSentences(asText(record.row.amendment_summary), 2),
    ]),
    ...monetaryFacts(records, 4),
  ]).slice(0, 7);

  return {
    id: "debt-1",
    category: "debt",
    sourceCategories: ["debt"],
    headline: primary?.amount
      ? `Debt financing · ${formatMoney(primary.amount, primary.currency ?? "USD")}`
      : "Debt terms disclosed",
    facts,
    amount: primary?.amount ?? undefined,
    currency: primary?.currency ?? undefined,
    itemCode: unique(records.map((record) => record.itemCode)).join(", ") || undefined,
    rawRowCount: records.length,
  };
}

function offeringSubstance(records: NormalizedRecord[]): number {
  return records.reduce((score, record) => {
    const fields = [
      "offering_type",
      "security_type",
      "shares_amount",
      "price_per_share",
      "total_proceeds",
      "investor_names",
      "exemption",
      "use_of_proceeds",
      "closing_date",
    ];
    const direct = fields.filter((field) => {
      const value = record.row[field];
      return value != null && value !== "" && (!Array.isArray(value) || value.length > 0);
    }).length;
    return score + direct + Math.min(asMonetaryValues(record.row.monetary_values).length, 4);
  }, 0);
}

function buildOfferingSection(records: NormalizedRecord[]): MaterialEventSection {
  const primary = primaryMonetaryValue(records, ["total_proceeds"]);
  const substance = offeringSubstance(records);
  const facts = unique([
    ...records.flatMap((record) => [
      asText(record.row.offering_type) ? `Offering: ${humanize(asText(record.row.offering_type))}.` : null,
      asText(record.row.security_type) ? `Security: ${humanize(asText(record.row.security_type))}.` : null,
      asNumber(record.row.shares_amount) != null
        ? `${trimDecimal(asNumber(record.row.shares_amount) as number)} securities disclosed.`
        : null,
      asNumber(record.row.price_per_share) != null
        ? `${formatMoney(asNumber(record.row.price_per_share) as number, asText(record.row.currency) || "USD")} per share or unit.`
        : null,
      asText(record.row.use_of_proceeds) ? `Use of proceeds: ${record.row.use_of_proceeds}.` : null,
      dateOnly(record.row.closing_date) ? `Closing date: ${dateOnly(record.row.closing_date)}.` : null,
      ...splitSentences(asText(record.row.amendment_summary), 2),
    ]),
    ...monetaryFacts(records, 5),
  ]).slice(0, 8);

  return {
    id: "offering-1",
    category: "offering",
    sourceCategories: ["offering"],
    headline:
      substance === 0
        ? "Offering disclosed; terms unavailable"
        : primary?.amount
          ? `Securities offering · ${formatMoney(primary.amount, primary.currency ?? "USD")}`
          : "Securities offering",
    facts: facts.length ? facts : ["SEC offering disclosure identified; structured terms are not available."],
    amount: primary?.amount ?? undefined,
    currency: primary?.currency ?? undefined,
    itemCode: unique(records.map((record) => record.itemCode)).join(", ") || undefined,
    rawRowCount: records.length,
  };
}

function amountsMatch(left?: number, right?: number): boolean {
  if (left == null || right == null) return false;
  return Math.abs(left - right) <= Math.max(1, Math.abs(left) * 0.0001);
}

function mergeComplementarySections(sections: MaterialEventSection[]): MaterialEventSection[] {
  const result = sections.map((section) => ({
    ...section,
    facts: [...section.facts],
    sourceCategories: [...section.sourceCategories],
  }));

  for (const category of ["debt", "offering"] as const) {
    for (let index = result.length - 1; index >= 0; index--) {
      const candidate = result[index];
      if (candidate.category !== category) continue;
      const target = result.find(
        (section, targetIndex) =>
          targetIndex !== index && section.category === "deal" && amountsMatch(section.amount, candidate.amount),
      );
      if (!target) continue;

      target.facts = unique([...target.facts, ...candidate.facts]).slice(0, 10);
      target.sourceCategories = [...new Set([...target.sourceCategories, ...candidate.sourceCategories])];
      target.rawRowCount += candidate.rawRowCount;
      target.itemCode = unique([target.itemCode, candidate.itemCode]).join(", ") || undefined;
      result.splice(index, 1);
    }
  }

  return result;
}

function completenessFor(sections: MaterialEventSection[], records: NormalizedRecord[]): Completeness {
  const offeringRecords = records.filter((record) => record.category === "offering");
  const nonOfferingFacts = sections
    .filter((section) => section.category !== "offering")
    .reduce((count, section) => count + section.facts.length, 0);
  const offeringScore = offeringRecords.length ? offeringSubstance(offeringRecords) : 0;
  const factCount = sections.reduce((count, section) => count + section.facts.length, 0);

  if (offeringRecords.length === records.length && offeringScore === 0) return "sparse";
  if (nonOfferingFacts >= 3 || offeringScore >= 3 || factCount >= 4) return "complete";
  if (factCount >= 1) return "partial";
  return "sparse";
}

function importanceFor(sections: MaterialEventSection[], completeness: Completeness): number {
  let score = 0;
  for (const section of sections) {
    let sectionScore = section.category === "deal" ? 72 : section.category === "debt" ? 62 : section.category === "offering" ? 56 : 48;
    if (section.category === "executive" && CORE_EXECUTIVE.test(section.headline)) sectionScore = 66;
    if (section.amount && section.amount > 0) sectionScore += Math.min(24, Math.log10(section.amount) * 2.6);
    score = Math.max(score, sectionScore);
  }
  score += Math.min(12, Math.max(0, sections.length - 1) * 4);
  if (completeness === "partial") score -= 5;
  if (completeness === "sparse") score -= 80;
  return Math.round(score * 10) / 10;
}

function chooseEventDate(records: NormalizedRecord[]): string | null {
  return records.map((record) => record.eventDate).filter((date): date is string => Boolean(date)).sort().at(-1) ?? null;
}

export function aggregateEventRows(rows: CategorizedRows, date: string): DailyRadar {
  const normalized = normalizeRows(rows);
  const groups = new Map<string, NormalizedRecord[]>();
  for (const record of normalized) {
    const group = groups.get(record.accession) ?? [];
    group.push(record);
    groups.set(record.accession, group);
  }

  const filings: MaterialFiling[] = [];
  for (const [accession, records] of groups) {
    const byCategory = new Map<EventCategory, NormalizedRecord[]>();
    for (const record of records) {
      const group = byCategory.get(record.category) ?? [];
      group.push(record);
      byCategory.set(record.category, group);
    }

    const rawSections: MaterialEventSection[] = [];
    if (byCategory.has("deal")) rawSections.push(...buildDealSections(byCategory.get("deal") as NormalizedRecord[]));
    if (byCategory.has("executive")) rawSections.push(buildExecutiveSection(byCategory.get("executive") as NormalizedRecord[]));
    if (byCategory.has("debt")) rawSections.push(buildDebtSection(byCategory.get("debt") as NormalizedRecord[]));
    if (byCategory.has("offering")) rawSections.push(buildOfferingSection(byCategory.get("offering") as NormalizedRecord[]));
    const sections = mergeComplementarySections(rawSections);

    const completeness = completenessFor(sections, records);
    const primary = sections
      .filter((section) => section.amount != null)
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
    const first = records[0];
    const formTypes = unique(records.map((record) => record.formType));
    const topSection = [...sections].sort((a, b) => {
      const rank: Record<EventCategory, number> = { deal: 4, debt: 3, executive: 2, offering: 1 };
      return rank[b.category] - rank[a.category] || (b.amount ?? 0) - (a.amount ?? 0);
    })[0];

    filings.push({
      accession,
      formType: formTypes[0] ?? null,
      ticker: first.ticker,
      companyName: first.companyName,
      cik: first.cik,
      filingDate: first.filingDate,
      eventDate: chooseEventDate(records),
      secUrl: buildSecUrl(first.cik, accession),
      secAccessible: null,
      importanceScore: importanceFor(sections, completeness),
      completeness,
      headline: sections.length > 2 ? `${sections.length} material disclosures in one filing` : topSection?.headline || "Material event",
      primaryAmount: primary?.amount,
      currency: primary?.currency,
      rawRowCount: records.length,
      categories: [...byCategory.keys()],
      sections,
    });
  }

  filings.sort((a, b) => b.importanceScore - a.importanceScore || a.ticker.localeCompare(b.ticker));

  const countCategory = (category: EventCategory) =>
    filings.filter((filing) => filing.categories.includes(category)).length;

  return {
    date,
    fetchedAt: new Date().toISOString(),
    sourceRowCount: normalized.length,
    filings,
    stats: {
      filings: filings.length,
      deal: countCategory("deal"),
      executive: countCategory("executive"),
      debt: countCategory("debt"),
      offering: countCategory("offering"),
      complete: filings.filter((filing) => filing.completeness === "complete").length,
      sparse: filings.filter((filing) => filing.completeness === "sparse").length,
    },
  };
}
