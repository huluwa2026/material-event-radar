# Roadmap

Material Event Radar prioritizes factual accuracy, auditability, and fast SEC research over generic portfolio or news features.

## Available now

- Filing-level aggregation across four structured event datasets.
- Deterministic importance ranking with an inspectable score breakdown.
- Daily and 7/30-day timelines, shareable filters, local ticker watchlist.
- JSON/CSV API, filtered RSS feed, SEC source links, and data freshness state.
- Recorded-fixture contributor mode, CI, security automation, and production smoke tests.

## Next

- Broaden recorded regression fixtures across more filing dates and edge cases.
- Add automated accessibility checks and improve screen-reader announcements.
- Improve keyboard-first scanning and documented shortcuts.
- Add Atom/JSON Feed variants while preserving one filtering model.
- Measure and document aggregation performance on larger 30-day ranges.

## Later, if evidence supports it

- Durable globally shared API rate limiting.
- User-controlled notification delivery built on the existing RSS filters.
- More structured event categories after their data boundaries are validated.

## Explicitly out of scope

- Price-move attribution, recommendations, target prices, or portfolio trading.
- Mixing synthetic news events into the SEC filing feed.
- LLM completion of missing amounts, dates, terms, or counterparties.
- Account infrastructure solely to store preferences already handled locally.

Feature proposals should start with a concrete research problem and preserve these boundaries.

