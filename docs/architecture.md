# Architecture

Material Event Radar is a server-rendered Next.js application that turns structured event rows into filing-level research records. The browser never receives a Drillr credential and never calls the Drillr gateway directly.

```text
Browser
  ├─ page and shareable filter state
  ├─ local-only ticker watchlist
  └─ GET /api/events or /api/v1/events
       └─ Next.js server
            ├─ four parallel Drillr SQL queries
            ├─ accession normalization and synthetic-news exclusion
            ├─ filing/section aggregation
            ├─ deterministic ranking and audit explanation
            ├─ SEC link/form verification for daily views
            └─ shared persistent date/window cache + in-process coalescing
```

## Data boundaries

The four source tables are `company_deal_events`, `executive_change`, `debt_issuance`, and `securities_offering`. `company_snapshot` supplies company names and CIKs inside each SQL query.

The reliable identity is an SEC accession, not an individual source row. Rows with `news_*` accessions are excluded. Every accepted row is grouped by accession, then organized into logical sections. Complementary debt or offering sections may merge into a deal section only when disclosed monetary values match within a narrow deterministic tolerance.

## Ranking

Ranking is deterministic and returned with every filing as `ranking`:

- event class establishes the base score;
- a disclosed monetary value adds a capped logarithmic contribution;
- multiple distinct sections add a small bonus;
- partial and sparse extraction apply explicit penalties.

The drawer exposes the numeric breakdown and reasons. The score prioritizes reading order; it is not a price-impact forecast.

## Daily and range queries

`/api/events` remains the daily compatibility endpoint. `/api/v1/events` supports 1, 7, and 30 calendar-day windows. Range mode still sends four SQL requests—not four requests per day—using a bounded filing-date interval, then partitions rows by date before reusing the daily aggregator.

The public hosted instance fixes the end date to the latest complete weekday. This leaves only three live cache keys (1/7/30 days) instead of allowing anonymous callers to create an unbounded series of historical keys. Next.js' persistent data cache is backed by a small in-process promise cache so separate requests can reuse results while concurrent work is coalesced. Self-hosted deployments can explicitly restore arbitrary dates with `RADAR_ALLOW_HISTORICAL_DATES=true`.

Daily mode verifies SEC metadata with bounded concurrency and a long TTL. Range mode keeps SEC links but avoids fetching metadata for every historical filing; opening a daily link restores verified metadata.

## Recorded fixture mode

`npm run dev:fixture` sets `RADAR_DATA_MODE=fixture`. Only the real recorded July 13, 2026 validation rows are returned, and the UI labels them as historical fixture data. Other dates return an honest empty result. No generated or fabricated fallback is used.

## Public surfaces

| Route | Purpose |
|---|---|
| `/api/events?date=YYYY-MM-DD` | Backward-compatible daily JSON |
| `/api/v1/events` | Versioned filtered JSON/CSV API |
| `/feed.xml` | Filterable RSS 2.0 feed |
| `/api/health` | Secret-free deployment readiness |

All data-bearing routes apply the same minute and daily best-effort request budgets and emit rate-limit headers. Each server-function instance maintains its own counter; strict global quotas still require an edge or durable counter. Upstream-cost exposure is bounded separately by the hosted date policy and persistent three-window cache.

## Security

- `DRILLR_API_KEY` is read only by Node.js server code.
- No API response, page, fixture, or log contains the credential.
- Public exports contain normalized filing facts, audit metadata, and SEC links only.
- GitHub secret scanning, push protection, dependency alerts, CodeQL, CI, and protected-main rules form the repository safety boundary.

## Independence

Material Event Radar is an independent open-source project. Drillr is the configured structured-data access path, and SEC.gov is the original filing source. The project is not affiliated with or endorsed by Drillr.
