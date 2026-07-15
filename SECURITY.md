# Security Policy

## Supported version

The latest deployment from the `main` branch and the latest tagged release are supported.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use [GitHub private vulnerability reporting](https://github.com/huluwa2026/material-event-radar/security/advisories/new) and include:

- the affected route, component, or commit;
- reproduction steps and expected impact;
- any suggested mitigation;
- only redacted logs or screenshots.

You should receive an acknowledgment within seven days. The maintainer will validate the report, coordinate a fix, and publish an advisory when appropriate.

## Sensitive data boundary

`DRILLR_API_KEY` is server-only. It must never appear in browser code, public API responses, logs, screenshots, fixtures, issues, or pull requests. If a credential may have been exposed, revoke and rotate it immediately before continuing investigation.

