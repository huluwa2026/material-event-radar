# Public API and feeds

The public API is read-only and versioned at `/api/v1/events`.

## Query parameters

| Parameter | Values | Default |
|---|---|---|
| `date` | `YYYY-MM-DD`, end date of the window | previous complete weekday |
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
curl 'https://material-event-radar.vercel.app/api/v1/events?date=2026-07-13&window=7&category=deal'
```

CSV export:

```bash
curl -OJL 'https://material-event-radar.vercel.app/api/v1/events?date=2026-07-13&format=csv'
```

## JSON shape

The response contains `apiVersion`, normalized `query`, request `meta`, and `data`. `data.filings` contains filing-level records. Every filing includes:

- accession, company identity, filing/event dates, SEC URL and form metadata;
- headline, categories, completeness and structured sections;
- source row counts and source table names;
- deterministic `ranking` breakdown and human-readable reasons.

The response is factual research data, not investment advice. Consumers must handle `partial` and `sparse` records without inventing missing terms.

## Rate limiting and caching

The API currently allows 60 requests per minute per observed client address on each server instance and returns `X-RateLimit-*` headers. Responses use short shared-cache freshness with stale-while-revalidate. This is a lightweight public interface, not an availability-guaranteed commercial API.

## RSS

`/feed.xml` accepts the same date, window, ticker, category, form, completeness, and sparse filters. The default window is seven days.

```text
https://material-event-radar.vercel.app/feed.xml?window=7&tickers=NVDA,AAPL
```

