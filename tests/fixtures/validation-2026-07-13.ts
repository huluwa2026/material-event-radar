import type { CategorizedRows, RawRow } from "@/lib/types";

const DATE = "2026-07-13T00:00:00.000Z";

const companies: Record<string, [string, string]> = {
  AGEN: ["Agenus Inc.", "0001098972"],
  AMPH: ["Amphastar Pharmaceuticals, Inc.", "0001297184"],
  BAK: ["Braskem S.A.", "0001071438"],
  BNAIW: ["Brand Engagement Network, Inc.", "0001838163"],
  CODI: ["Compass Diversified", "0001345126"],
  DAIO: ["Data I/O Corporation", "0000351998"],
  FVNNU: ["Future Vision II Acquisition Corp.", "0002010653"],
  NABL: ["N-able, Inc.", "0001834488"],
  OABIW: ["OmniAb, Inc.", "0001846253"],
  PLUG: ["Plug Power Inc.", "0001093691"],
  PSA: ["Public Storage", "0001393311"],
  SILO: ["Silo Pharma, Inc.", "0001514183"],
  TOP: ["TOP Financial Group Limited", "0001848275"],
};

const accessions: Record<string, string> = {
  AGEN: "0001193125-26-301414",
  AMPH: "0001104659-26-082772",
  BAK: "0001292814-26-003735",
  BNAIW: "0001493152-26-032913",
  CODI: "0001345126-26-000054",
  DAIO: "0001654954-26-006627",
  FVNNU: "0001829126-26-007528",
  NABL: "0001834488-26-000038",
  OABIW: "0001846253-26-000042",
  PLUG: "0001104659-26-082854",
  PSA: "0001193125-26-301175",
  SILO: "0001213900-26-077296",
  TOP: "0001213900-26-077316",
};

function common(ticker: string): RawRow {
  return {
    ticker,
    company_name: companies[ticker][0],
    cik: companies[ticker][1],
    filing_date: DATE,
    event_date: DATE,
  };
}

function money(raw: string, label: string, amount: number, currency: string | null = "USD") {
  return { raw, label, amount, currency };
}

let rowId = 0;
function deal(ticker: string, extra: RawRow): RawRow {
  return {
    ...common(ticker),
    id: ++rowId,
    source_accession: accessions[ticker],
    source_type: "8-K",
    source_item: "1.01",
    deal_fingerprint: `${ticker.toLowerCase()}|fixture|other`,
    currency: "USD",
    ...extra,
  };
}

function executive(ticker: string, eventType: string, person: string, title: string, extra: RawRow = {}): RawRow {
  return {
    ...common(ticker),
    id: ++rowId,
    accession_number: accessions[ticker],
    item_code: "5.02",
    event_type: eventType,
    person_name: person,
    title,
    form_type: ticker === "BAK" ? "6-K" : "8-K",
    ...extra,
  };
}

export const validationRows: CategorizedRows = {
  deal: [
    deal("AGEN", {
      source_id: "agen-1",
      total_value: 85_000_000,
      key_terms: "Agenus agreed to issue 23,035,227 common shares or pre-funded warrants plus Series A and Series B warrants. Initial gross proceeds are approximately $85 million, with up to $255 million if all warrants are exercised.",
      counterparty_names: ["Commodore Capital Master LP"],
      monetary_values: [money("approximately $85 million", "expected_aggregate_gross_proceeds", 85_000_000), money("up to an additional $255 million", "additional_potential_proceeds", 255_000_000)],
    }),
    deal("AGEN", { source_id: "agen-2", total_value: null, key_terms: "The lead investor may designate two directors while maintaining at least 5% ownership." }),
    deal("CODI", {
      total_value: null,
      key_terms: "The management fee becomes 1.25% on the first $3 billion, 1.125% on $3–5 billion and 1.0% above $5 billion. The 2027 base-management-fee cap is $30 million. Performance awards are weighted 70% to relative total shareholder return and 30% to adjusted EBITDA.",
      monetary_values: [money("$30 million", "2027_base_management_fee_cap", 30_000_000)],
    }),
    deal("DAIO", { total_value: 6_825_400, stage: "terminated", key_terms: "A $6.8254 million aggregate principal note automatically converted after shareholder approval." }),
    deal("DAIO", { deal_fingerprint: "daio|equity-plan|other", total_value: null, stage: "terminated", key_terms: "The 2023 equity incentive plan was amended after shareholder approval." }),
    deal("DAIO", { total_value: 6_825_400, stage: "terminated", key_terms: "The note converted into 6,841.33 Series B preferred shares plus applicable interest." }),
    deal("FVNNU", { total_value: 191_475, key_terms: "A non-interest-bearing sponsor note funds an extension of the business-combination deadline and may convert at $10 per unit.", expiry_date: "2026-08-13" }),
    deal("FVNNU", { deal_fingerprint: "fvnnu|microtouch|other", total_value: null, key_terms: "The proposed MicroTouch Technology merger deadline was extended to August 13, 2026.", expiry_date: "2026-08-13" }),
    deal("PLUG", { total_value: 142_000_000, key_terms: "The New York Gateway Project was amended to permit an interim closing. Purchase price was fixed at $142 million and the outside date extended to March 31, 2027.", expiry_date: "2027-03-31" }),
    deal("PLUG", { total_value: 76_500_000, key_terms: "The Graham, Texas project carries $50 million base consideration plus up to $26.5 million contingent consideration tied to electrical-load capacity." }),
    deal("PSA", { total_value: 900_000_000, key_terms: "Public Storage offered $400 million of 4.700% senior notes due 2032 and $500 million of 5.150% notes due 2036. Proceeds will partly fund the pending National Storage Affiliates Trust acquisition.", expected_close_date: "2026-07-20" }),
    deal("SILO", { total_value: 4_000_000, key_terms: "Silo Pharma entered a private placement for approximately $4 million, with expected net proceeds of approximately $3.5 million." }),
    deal("SILO", { total_value: null, key_terms: "The placement includes 124,000 common shares and 495,965 pre-funded warrants plus two warrant series." }),
  ],
  executive: [
    executive("AMPH", "appointment", "Anthony Pierce", "Class III Director", { effective_date: "2026-07-09" }),
    executive("BAK", "election", "Alessandro de Castro Melo", "Chief Engineering, Technology and Innovation Officer"),
    executive("BNAIW", "promotion", "Tyler Luck", "Chief Executive Officer", { effective_date: "2026-06-01" }),
    ...["Anthony Ambrose", "William G. Walker", "Douglas Wells", "Garrett Larson", "Steven Waszak"].map((name) => executive("DAIO", "election", name, "Director", { effective_date: "2026-07-08" })),
    executive("NABL", "departure", "Frank Colletti", "Chief Revenue Officer", { departure_reason: "not_disclosed", successor_name: "Russell Rosa", effective_date: "2026-07-09" }),
    executive("NABL", "appointment", "Russell Rosa", "Chief Revenue Officer", { effective_date: "2026-07-13" }),
    executive("OABIW", "appointment", "Amechi Nwachuku", "Chief Operating Officer", { effective_date: "2026-07-13" }),
  ],
  debt: [
    {
      ...common("FVNNU"),
      id: ++rowId,
      accession_number: accessions.FVNNU,
      item_code: "2.03",
      currency: "USD",
      monetary_values: [money("$191,475", "principal_amount", 191_475), money("No interest", "interest_rate", 0, null)],
    },
  ],
  offering: [
    { ...common("AGEN"), id: ++rowId, accession_number: accessions.AGEN, item_code: "3.02", price_per_share: 3.69, currency: "USD", monetary_values: [money("$85 million", "total_upfront_gross_proceeds", 85_000_000), money("23,035,227 shares", "upfront_common_shares_offered", 23_035_227, null)] },
    { ...common("DAIO"), id: ++rowId, accession_number: accessions.DAIO, item_code: "3.02", currency: "USD", monetary_values: [money("$6,825,400", "aggregate_principal_amount", 6_825_400)] },
    { ...common("FVNNU"), id: ++rowId, accession_number: accessions.FVNNU, item_code: "3.02", price_per_share: 10, currency: "USD", monetary_values: [money("$191,475", "principal_amount", 191_475)] },
    { ...common("SILO"), id: ++rowId, accession_number: accessions.SILO, item_code: "3.02", price_per_share: 6.452, currency: "USD", monetary_values: [money("approximately $4 million", "upfront_aggregate_gross_proceeds", 4_000_000), money("approximately $3.5 million", "expected_net_proceeds", 3_500_000), money("619,965 shares", "total_upfront_shares_equivalent", 619_965, null)] },
    { ...common("TOP"), id: ++rowId, accession_number: accessions.TOP, item_code: "3.02", currency: "USD", monetary_values: null },
  ],
};
