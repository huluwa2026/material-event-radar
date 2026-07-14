import type { CategorizedRows, EventCategory, RawRow } from "@/lib/types";

const DEFAULT_BASE_URL = "https://gateway.drillr.ai";

export class DrillrConfigurationError extends Error {
  constructor() {
    super("DRILLR_API_KEY is not configured on the server.");
    this.name = "DrillrConfigurationError";
  }
}

export class DrillrRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DrillrRequestError";
  }
}

interface RunSqlResponse {
  data?: {
    columns?: string[];
    rows?: unknown[][];
    rowCount?: number;
  };
  error?: { message?: string; code?: string } | string;
}

function sqlFor(category: EventCategory, date: string): string {
  const companyColumns = "c.company_name, c.cik";

  if (category === "deal") {
    return `SELECT d.id, d.deal_fingerprint, d.ticker, d.source_type, d.source_id, d.source_accession, d.source_item, d.source_uri, d.stage, d.stage_evidence, d.deal_type, d.direction, d.consideration_type, d.structure, d.filer_role, d.counterparty_names, d.deal_name, d.total_value, d.currency, d.price_per_share, d.monetary_values, d.event_date, d.filing_date, d.expected_close_date, d.expiry_date, d.amendment_summary, d.key_terms, d.conditions, d.termination_reason, ${companyColumns} FROM company_deal_events d LEFT JOIN company_snapshot c ON c.ticker = d.ticker WHERE d.filing_date = '${date}' AND d.source_type = '8-K' ORDER BY d.ticker, d.id LIMIT 500`;
  }

  if (category === "executive") {
    return `SELECT e.id, e.ticker, e.accession_number, e.item_code, e.event_date, e.filing_date, e.event_type, e.person_name, e.title, e.effective_date, e.departure_reason, e.successor_name, e.is_interim, e.compensation, e.board_committees, e.previous_company, e.is_independent, e.source_uri, ${companyColumns} FROM executive_change e LEFT JOIN company_snapshot c ON c.ticker = e.ticker WHERE e.filing_date = '${date}' AND e.accession_number NOT LIKE 'news_%' ORDER BY e.ticker, e.id LIMIT 500`;
  }

  if (category === "debt") {
    return `SELECT d.id, d.ticker, d.accession_number, d.item_code, d.event_date, d.filing_date, d.action, d.instrument_type, d.principal_amount, d.interest_rate, d.maturity_date, d.lender_name, d.covenants, d.use_of_proceeds, d.trigger_event, d.is_secured, d.source_uri, d.currency, d.monetary_values, d.is_amendment, d.amendment_summary, ${companyColumns} FROM debt_issuance d LEFT JOIN company_snapshot c ON c.ticker = d.ticker WHERE d.filing_date = '${date}' AND d.is_current = true AND d.accession_number NOT LIKE 'news_%' ORDER BY d.ticker, d.id LIMIT 500`;
  }

  return `SELECT o.id, o.ticker, o.accession_number, o.item_code, o.event_date, o.filing_date, o.offering_type, o.security_type, o.shares_amount, o.price_per_share, o.total_proceeds, o.discount_pct, o.investor_names, o.exemption, o.registration_rights, o.lock_up_period, o.use_of_proceeds, o.closing_date, o.source_uri, o.currency, o.monetary_values, o.is_amendment, o.amendment_summary, ${companyColumns} FROM securities_offering o LEFT JOIN company_snapshot c ON c.ticker = o.ticker WHERE o.filing_date = '${date}' AND o.is_current = true AND o.accession_number NOT LIKE 'news_%' ORDER BY o.ticker, o.id LIMIT 500`;
}

export function tabularRowsToObjects(columns: string[], rows: unknown[][]): RawRow[] {
  return rows.map((values) =>
    Object.fromEntries(columns.map((column, index) => [column, values[index] ?? null])),
  );
}

async function runSql(category: EventCategory, date: string, signal: AbortSignal): Promise<RawRow[]> {
  const apiKey = process.env.DRILLR_API_KEY;
  if (!apiKey) throw new DrillrConfigurationError();

  const baseUrl = (process.env.DRILLR_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/v1/data/run_sql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ sql: sqlFor(category, date) }),
    cache: "no-store",
    signal,
  });

  let payload: RunSqlResponse;
  try {
    payload = (await response.json()) as RunSqlResponse;
  } catch {
    throw new DrillrRequestError(`Drillr returned a non-JSON response for ${category}.`, response.status);
  }

  if (!response.ok || payload.error) {
    const detail =
      typeof payload.error === "string" ? payload.error : payload.error?.message || response.statusText;
    throw new DrillrRequestError(`Drillr ${category} query failed: ${detail}`, response.status);
  }

  const columns = payload.data?.columns;
  const rows = payload.data?.rows;
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    throw new DrillrRequestError(`Drillr ${category} response did not include tabular data.`);
  }

  return tabularRowsToObjects(columns, rows);
}

export async function fetchEventRows(date: string): Promise<CategorizedRows> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const [deal, executive, debt, offering] = await Promise.all([
      runSql("deal", date, controller.signal),
      runSql("executive", date, controller.signal),
      runSql("debt", date, controller.signal),
      runSql("offering", date, controller.signal),
    ]);
    return { deal, executive, debt, offering };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new DrillrRequestError("Drillr did not respond within 20 seconds.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
