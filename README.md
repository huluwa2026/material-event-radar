# Material Event Radar

![Material Event Radar showing the July 13, 2026 SEC filing digest](docs/material-event-radar.png)

Material Event Radar is a responsive web app for scanning material company events disclosed in SEC filings. It groups structured event rows by SEC accession, keeps related disclosures together, marks incomplete extraction honestly, and always links back to the original filing.

It reports what a company disclosed. It does not explain price moves or provide investment advice.

### Filing detail

![Plug Power filing detail with two grouped material-event sections](docs/material-event-radar-detail.png)

## What it does

- Queries `company_deal_events`, `executive_change`, `debt_issuance`, and `securities_offering` in parallel through the Drillr REST API.
- Excludes synthetic `news_*` accessions from the filing feed.
- Joins `company_snapshot` inside those four queries for company names and CIKs.
- Collapses duplicate rows into one filing and preserves distinct matters as sections.
- Merges complementary deal, debt, and offering records when they describe the same disclosed amount.
- Combines related leadership departures and appointments into a transition.
- Verifies the SEC index page and reads the actual form type, including 6-K.
- Ranks filings with deterministic rules based on event class, disclosed value, and completeness.
- Supports date navigation, ticker/company search, category filters, form filters, and a filing-detail drawer.
- Keeps sparse events out of the default feed without inventing missing terms.

## Run locally

Requirements: Node.js 20.9 or newer and a [Drillr API key](https://drillr.ai/developer/keys).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the server-only values in `.env.local`:

```dotenv
DRILLR_API_KEY=drl_replace_me
SEC_USER_AGENT=material-event-radar/0.1 your-email@example.com
```

Open [http://localhost:3000](http://localhost:3000). A specific filing day can be shared as `/?date=2026-07-13` and an open filing as `/?date=2026-07-13&filing=<accession>`.

The app does not fall back to fabricated demo data. A missing API key or upstream failure is shown as an explicit data-unavailable state.

## Data flow

```text
Browser
  └─ GET /api/events?date=YYYY-MM-DD
       └─ Next.js server
            ├─ 4 parallel Drillr run_sql requests
            ├─ accession aggregation and deterministic ranking
            ├─ SEC form/link verification
            └─ date-keyed in-memory TTL cache
```

`DRILLR_API_KEY` is read only in the Node.js server data client. It is never returned by the API route, logged, embedded in HTML, or placed in a `NEXT_PUBLIC_*` variable.

## Validation

The fixed 2026-07-13 regression fixture represents 30 structured rows collapsed into 13 filings. It covers the important grouping boundaries found during data validation:

- Public Storage notes offering
- Plug Power's two property transactions in one filing
- Agenus and Silo Pharma private placements
- Data I/O's nine records and three logical sections
- N-able's departure/appointment transition
- Braskem's Form 6-K boundary
- the historical sparse-extraction case for TOP Financial

The live upstream dataset can improve after the fixture is captured. For example, TOP's formerly missing terms are now populated; the app displays those current facts while the fixture keeps the original no-inference regression boundary.

Run all checks:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

For browser-level desktop and mobile checks, start the production server on port 3100 with `DRILLR_API_KEY` configured, then run:

```bash
npm run test:e2e
```

## Configuration

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `DRILLR_API_KEY` | Yes | — | Server-side Drillr authentication |
| `DRILLR_API_BASE_URL` | No | `https://gateway.drillr.ai` | Drillr REST base URL |
| `SEC_USER_AGENT` | Recommended | App identifier | Identifies SEC requests responsibly |
| `EVENT_CACHE_TTL_SECONDS` | No | `900` | Aggregated daily result cache |
| `SEC_METADATA_CACHE_TTL_SECONDS` | No | `604800` | SEC form/link metadata cache |

## Scope

This MVP intentionally does not mix news with filings, infer missing financial terms, attribute stock moves, manage portfolios, or make buy/sell recommendations.

MIT licensed. Drillr supplies the structured event data; SEC.gov remains the original disclosure source.
