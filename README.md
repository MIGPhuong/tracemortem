# TraceMortem — Every failure leaves a trace.

**Category:** Frankenstein · **Hackathon:** Kiroween 2026 · **Status:** Working local-first MVP, draft submission in progress.

TraceMortem combines incident observability, structured evidence, and a detective-style investigation workbench. Drop in log events and explore the timeline, shared trace IDs, investigative leads, and a defensible case report.

## Quick start

Requires Node.js 22+ for local preview (no third-party runtime or build dependencies).

```bash
npm run dev
# http://127.0.0.1:4173
```

To run tests and build a static site:

```bash
npm run check     # 27 core engine tests
npm run build     # generates dist/
```

Deploy the **contents of `dist/`** to GitHub Pages or another HTTPS static host. GitHub Actions workflows are included and will run after a repository is created and Pages source is set to GitHub Actions. See [PUBLISHING.md](PUBLISHING.md) for safe setup using the **MIGPhuong** account only. No backend, API key, account or CDN is required.

## What is implemented

- Three **synthetic** sample incidents: checkout outage, login failures, ingestion schema mismatch. No real customer data.
- Import `.json`, `.jsonl`, `.csv`, `.txt` and `.log` (timestamped). Max 5 MB and 8,000 events.
- Interactive first-error, service metrics, trace-ID co-occurrence diagram, severity bar chart, timeline.
- Ranked investigative leads with transparent rule scores and event ID citations. **Not** causal certainty.
- Search/filter evidence by level, service and text; inspect any event.
- Export a Markdown incident brief with event excerpts and limitations.
- Mobile-responsive original interface with reduced-motion support and keyboard-friendly controls.
- Dependency-free static runtime. All log analysis occurs on the user's device.

### JSONL example

```jsonl
{"timestamp":"2026-11-20T09:00:00Z","service":"api","level":"info","message":"Deployment v1.2.0 completed","traceId":"deploy-01"}
{"timestamp":"2026-11-20T09:01:00Z","service":"api","level":"error","message":"HTTP 503 after deploy","traceId":"request-101"}
```

The parser also accepts a JSON event array, `{ "events": [...] }` wrapper, CSV headers (`timestamp,service,level,message,traceId`), or timestamp-prefixed plain text log lines.

## Investigation method

This is deterministic forensic triage, not an AI root-cause oracle. Events are normalized and grouped by actual shared trace ID. Heuristics look for change, resource pressure, authentication, schema and timeout signatures. They rank leads by **matching evidence counts** and proximity to the first ERROR. The score is not a probability or proof that a change caused the outage. Exported reports name event IDs so investigators can re-check the underlying logs.

## Security & privacy

- No analytics or third-party telemetry. User-selected files are processed in the browser, not uploaded.
- Synthetic demo logs are clearly marked and **must not be presented as production incident evidence**.
- Imported logs may contain secrets, tokens or personal data: review before screen-sharing or exporting reports.
- Reports are not certified diagnoses. Validate root cause against metrics, deployments and real operational evidence before acting.
- No automated remediation is performed.

## Project layout

- `src/engine.js` — pure parser + normalization + analysis + report.
- `src/samples.js` — reproducible synthetic datasets.
- `src/app.js` / `src/styles.css` — front-end and graphics.
- `tests/engine.test.mjs` — automated tests.
- `scripts/build.mjs` — static output into `dist/`.
- `.github/workflows/` — CI + GitHub Pages deployment.
- `.kiro/` — **planning drafts** for future work, not evidence of completed Kiro usage.

## Kiroween submission status

A substantial verified Kiro development phase is still required. The current `.kiro` specs and steering are **preparatory**. After Kiro is genuinely used to improve the product, update the project story, document the actual tool usage and verify the resulting commits. A real demo video and publicly reachable HTTPS site must also be completed before final submission.

## License

MIT. No third-party runtime libraries are bundled.
