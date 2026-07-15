# Changelog

Notable changes to Material Event Radar are documented here.

The project follows [Semantic Versioning](https://semver.org/) for tagged releases.

## [Unreleased]

### Fixed

- Parse SEC filing pages with a standards-based HTML parser instead of regular-expression tag filtering.

## [0.1.0] - 2026-07-15

### Added

- GitHub community, security, CI, dependency update, CodeQL, production smoke-test, and protected-main configuration.
- Recorded-fixture development mode and contributor documentation.
- Shareable filter state, 7/30-day timeline, local watchlist, and visible data freshness state.
- Deterministic score explanations and per-section source-table provenance.
- Filterable JSON/CSV API and RSS feed.
- Responsive SEC material-event radar backed by Drillr structured data.
- Filing-level aggregation across deals, executive changes, debt, and securities offerings.
- Deterministic importance ranking, completeness states, SEC verification, search, filters, and filing detail drawer.
- Unit, regression, and Playwright browser tests.
- Public Vercel deployment and MIT license.

[Unreleased]: https://github.com/huluwa2026/material-event-radar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/huluwa2026/material-event-radar/releases/tag/v0.1.0
