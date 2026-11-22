# TraceMortem — product requirements (planning draft)

**Status:** Initial design artifact; not evidence of completed Kiro development.

## Goal
Provide a local-first, evidence-driven incident investigation workbench that turns timestamped logs into an inspectable timeline, a trace correlation map, a shortlist of investigatory leads, and a Markdown report. A ranked lead must NEVER be labeled as verified root cause.

## Core acceptance criteria
- Import JSON arrays/objects, JSONL, CSV (quoted fields), and documented plain text logs; reject malformed or empty content with actionable messages.
- Never upload user data to an external API; import limit 5 MB and 8,000 log events.
- Preserve original service, timestamp, severity, message, trace ID and source code where present.
- Show first error, sample-wide summary metrics, and clearly distinguish sample error ratio from production-wide rates.
- Show correlations by actual shared trace ID; do not claim a directed causal dependency graph.
- Evidence details, filtered event rows, and exported reports must refer to actual input events.
- User-supplied content must never execute scripts when displayed.
- Provide three explicitly synthetic incident case studies for testing and demonstration.
- Keyboard-accessible controls and responsive layout, including 390px mobile viewport.
- Provide CI tests and static HTTPS deployable output.

## Non-goals
Production telemetry ingestion, remote log storage, distributed tracing backend, autonomous incident remediation, proven causal inference, or guaranteed root-cause diagnosis.

## Meaningful next phase to implement with Kiro
1. Add a real HAR/OTLP-to-event adapter with validation fixtures.
2. Implement and validate an interactive hypothesis comparison panel with competing-explanation evidence.
3. Add event provenance and integrity checks across import/export.
4. Improve accessible keyboard interactions and mobile service graph navigation.
5. Add browser end-to-end regression tests and document actual Kiro Specs / Steering / Hooks or other tools used.

Only report Kiro functionality after it has actually been used and its contribution is verifiable.
