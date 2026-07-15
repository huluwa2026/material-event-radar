<div align="center">
  <h1>Material Event Radar</h1>

  <p>
    <a href="https://github.com/huluwa2026/material-event-radar/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/huluwa2026/material-event-radar/actions/workflows/ci.yml/badge.svg"></a>
    <a href="https://github.com/huluwa2026/material-event-radar/actions/workflows/codeql.yml"><img alt="CodeQL" src="https://github.com/huluwa2026/material-event-radar/actions/workflows/codeql.yml/badge.svg"></a>
    <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-15313f.svg"></a>
    <a href="https://material-event-radar.vercel.app"><img alt="Live on Vercel" src="https://img.shields.io/badge/live-Vercel-de5c35.svg"></a>
  </p>

  <p><strong>See what companies disclosed—not why prices moved.</strong></p>
  <p>Material Event Radar groups structured company events by SEC filing, ranks them transparently, and always links back to the original disclosure.</p>

  <p>
    <a href="https://material-event-radar.vercel.app">Open the live radar</a> ·
    <a href="https://material-event-radar.vercel.app/api/v1/events">JSON API</a> ·
    <a href="https://material-event-radar.vercel.app/feed.xml">RSS feed</a> ·
    <a href="docs/architecture.md">Architecture</a>
  </p>
</div>

![Material Event Radar showing the July 13, 2026 SEC filing digest](docs/material-event-radar.png)

## Why it is different

- **Filing first:** collapses duplicate source rows by SEC accession while preserving distinct matters as sections.
- **Auditable:** exposes source tables, merged row counts, completeness, score components, and the original SEC filing.
- **Honest about gaps:** sparse extraction is hidden by default and missing terms are never inferred.
- **Built for scanning:** daily and 7/30-day timelines, shareable filters, local watchlists, and responsive filing dossiers.
- **Open data surfaces:** filtered JSON, CSV, and RSS use the same factual aggregation model as the interface.

### Filing audit view

![Plug Power filing detail with deterministic score and source provenance](docs/material-event-radar-detail.png)

## Try it locally without credentials

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev:fixture
```

Open [http://localhost:3000/?date=2026-07-13](http://localhost:3000/?date=2026-07-13). Fixture mode uses the real recorded July 13, 2026 validation sample and labels it clearly as historical data. It never pretends to be live.

## Run with live Drillr data

```bash
cp .env.example .env.local
npm run dev
```

Set the server-only values in `.env.local`:

```dotenv
DRILLR_API_KEY=drl_replace_me
SEC_USER_AGENT=material-event-radar/0.1 your-email@example.com
```

Create a [Drillr API key](https://drillr.ai/developer/keys). `DRILLR_API_KEY` is read only by the Node.js server; it is never returned by an API route, logged, embedded in HTML, or placed in a `NEXT_PUBLIC_*` variable.

## Product capabilities

- Queries `company_deal_events`, `executive_change`, `debt_issuance`, and `securities_offering` in four parallel requests.
- Excludes synthetic `news_*` accessions and joins company identity inside the queries.
- Merges complementary deals, debt, offerings, departures, and appointments without discarding distinct events.
- Supports 1, 7, and 30 calendar-day views with one bounded range query per source table.
- Persists ticker watchlists only in browser local storage; no account or tracking is required.
- Keeps search, category, form, completeness, window, watchlist mode, and open filing in shareable URLs.
- Provides deterministic importance-score explanations and per-section source-table provenance.
- Displays source mode, refresh time, row counts, extraction completeness, and SEC verification state.

## API, CSV, and RSS

The versioned read-only API supports identical filters across JSON, CSV, and RSS:

```bash
curl 'https://material-event-radar.vercel.app/api/v1/events?window=7&category=deal'
curl -OJL 'https://material-event-radar.vercel.app/api/v1/events?date=2026-07-13&format=csv'
```

Subscribe to a filtered feed:

```text
https://material-event-radar.vercel.app/feed.xml?window=7&tickers=NVDA,AAPL
```

See [Public API and feeds](docs/api.md) for parameters, response shape, rate limits, and caching behavior.

## Data flow

```text
Browser
  └─ Next.js server API
       ├─ 4 parallel Drillr SQL requests
       ├─ accession aggregation and deterministic ranking
       ├─ SEC link/form verification for daily views
       └─ date/window TTL cache
```

The detailed boundaries and range-query design are documented in [Architecture](docs/architecture.md).

## Validation

The fixed 2026-07-13 regression fixture represents 30 structured rows collapsed into 13 filings. It covers:

- Public Storage notes offering
- Plug Power's two property transactions in one filing
- Agenus and Silo Pharma private placements
- Data I/O's nine records and three logical sections
- N-able's departure/appointment transition
- Braskem's Form 6-K boundary
- the historical sparse-extraction case for TOP Financial

Run the full local quality suite:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Playwright automatically starts fixture mode, so browser tests do not need production credentials. GitHub Actions runs the same unit, type, lint, build, browser, and CodeQL checks.

## Configuration

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `DRILLR_API_KEY` | Live mode | — | Server-side Drillr authentication |
| `RADAR_DATA_MODE` | No | `live` | Set `fixture` for the recorded validation sample |
| `DRILLR_API_BASE_URL` | No | `https://gateway.drillr.ai` | Drillr REST base URL |
| `SEC_USER_AGENT` | Recommended | App identifier | Identifies SEC requests responsibly |
| `EVENT_CACHE_TTL_SECONDS` | No | `900` | Aggregated date/window cache |
| `SEC_METADATA_CACHE_TTL_SECONDS` | No | `604800` | SEC form/link metadata cache |

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md), browse the [roadmap](ROADMAP.md), or start with a [`good first issue`](https://github.com/huluwa2026/material-event-radar/labels/good%20first%20issue). Questions and open-ended ideas belong in [Discussions](https://github.com/huluwa2026/material-event-radar/discussions).

Report vulnerabilities privately through the instructions in [SECURITY.md](SECURITY.md). Community participation follows the [Code of Conduct](CODE_OF_CONDUCT.md). Release history is in [CHANGELOG.md](CHANGELOG.md).

## Scope

This project reports what a company disclosed. It does not mix news with filings, infer missing financial terms, attribute stock moves, manage portfolios, or make buy/sell recommendations.

MIT licensed. Drillr supplies structured event data; SEC.gov remains the original disclosure source.
