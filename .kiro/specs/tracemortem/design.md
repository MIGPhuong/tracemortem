# Architecture — planning draft

TraceMortem is a browser-side static web app with no server or remote API.

- `src/engine.js`: pure, deterministic parsing, normalization, classification, aggregation, correlation, heuristic investigative leads, report export.
- `src/samples.js`: three clearly synthetic incident datasets (checkout, identity, ingestion).
- `src/app.js`: accessible, stateful views; DOM rendering; file upload; filters; graph; timeline; event inspection; report download.
- `src/styles.css` and `index.html`: original responsive investigation interface and semantic content.
- `scripts/build.mjs`: copies deployable static assets into `dist/`.
- `tests/engine.test.mjs`: Node built-in test runner.
- `.github/workflows`: CI and automatic Pages deploy templates (after selecting Actions source in repo settings).

Pipeline: User file / sample → validate and normalize → derive evidence signals → render timeline, trace-ID co-occurrence map, investigative leads → generate reviewable report.

Important: lead scores are deterministic heuristic scores, not probabilities or certified root-cause attribution. Edges in the network graph mean shared trace IDs, not causal directed links.

Local privacy: imported files never leave the browser; no analytics. Log content could be sensitive. Do not upload real production secrets to a public demo and be cautious when exporting reports.

## Kiro work plan
Open the repository in Kiro and review this draft. Use actual Kiro workflows to improve import adaptors, evidence quality, accessibility or testing. Save genuine Kiro-produced work and related commits; do not mislabel this draft as Kiro-generated.
