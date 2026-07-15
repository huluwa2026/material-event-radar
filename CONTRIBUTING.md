# Contributing to Material Event Radar

Thanks for helping make SEC material-event research easier to inspect and verify.

## Before you start

- Use Issues for reproducible bugs and scoped improvements.
- Use Discussions for questions and open-ended product ideas.
- Never include API keys, non-public data, or credentials in code, screenshots, logs, issues, or pull requests.
- Preserve the product boundary: report disclosed facts, do not infer missing terms, explain price moves, or provide investment advice.

## Local setup

Requirements: Node.js 20.9 or newer.

For a zero-credential setup using the recorded July 13, 2026 validation sample:

```bash
npm install
npm run dev:fixture
```

For live data:

```bash
cp .env.example .env.local
npm run dev
```

Set `DRILLR_API_KEY` in `.env.local`. The key must remain server-only.

## Quality checks

Run the same checks used by CI:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Changes to aggregation boundaries should add or update a deterministic fixture test. UI changes should include a browser-level check and, when useful, a screenshot.

## Pull requests

Keep each pull request focused. Describe the user problem, the chosen behavior, validation evidence, and any factual-data or security risk. CI must pass before merge.

By contributing, you agree that your contributions will be licensed under the repository's MIT License.

