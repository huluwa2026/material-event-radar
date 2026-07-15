# Public API and feeds

The public API is read-only and versioned at `/api/v1/events`.

## Query parameters

| Parameter | Values | Default |
|---|---|---|
| `date` | Hosted instance: latest complete weekday only; self-hosting may opt into `YYYY-MM-DD` history | latest complete weekday |
| `window` | `1`, `7`, `30` calendar days | `1` |
| `q` | ticker, company, or headline text | empty |
| `ticker` | one ticker | empty |
| `tickers` | comma-separated tickers | empty |
| `category` | `deal`, `executive`, `debt`, `offering` | all |
| `form` | exact SEC form label | all |
| `completeness` | `complete`, `partial`, `sparse` | all |
| `sparse` | `1` to include sparse records | excluded |
| `format` | `json`, `csv` | `json` |

Example:

```bash
curl 'https://material-event-radar.vercel.app/api/v1/events?window=7&category=deal'
```

CSV export:

```bash
curl -OJL 'https://material-event-radar.vercel.app/api/v1/events?format=csv'
```

## JSON shape

The response contains `apiVersion`, normalized `query`, request `meta`, and `data`. `meta` reports matched and returned counts plus truncation state. `data.filings` contains up to 100 filing-level records by default. Every filing includes:

- accession, company identity, filing/event dates, SEC URL and form metadata;
- headline, categories, completeness and structured sections;
- source row counts and source table names;
- deterministic `ranking` breakdown and human-readable reasons.

The response is factual research data, not investment advice. Consumers must handle `partial` and `sparse` records without inventing missing terms.

## Rate limiting and caching

The JSON, CSV, compatibility JSON, and RSS routes each apply the same best-effort budget of 20 requests per minute and 200 requests per day per observed client address. They return minute and daily `X-RateLimit-*` headers. The limiter is deliberately lightweight and remains per server-function instance; the bounded date/window surface and shared persistent data cache prevent arbitrary cache-key churn from repeatedly reaching the upstream source.

The hosted instance accepts only rolling windows ending on its latest complete weekday. A request for another valid date returns `403 historical_date_unavailable`. Self-hosted deployments may set `RADAR_ALLOW_HISTORICAL_DATES=true` and use their own server-side key.

## RSS

`/feed.xml` accepts the same window, ticker, category, form, completeness, and sparse filters. The hosted feed uses the latest complete weekday, defaults to seven days, and returns at most 50 items.

```text
https://material-event-radar.vercel.app/feed.xml?window=7&tickers=NVDA,AAPL
```
