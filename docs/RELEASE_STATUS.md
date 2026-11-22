# TraceMortem publishing readiness (2026-11-22)

## Verified locally

- Node.js 22 static checks: passed.
- Engine tests: 27 passed, 0 failed.
- Static build: passed, produces `dist/`.
- Local HTTP smoke test: `/`, `/src/app.js`, `/src/engine.js`, `/assets/icon.svg`, `/manifest.webmanifest` all responded HTTP 200.
- GitHub Actions workflows prepared: `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`.

## External work still pending

- Create the public GitHub repository `MIGPhuong/tracemortem`.
- Upload code and activate the workflows on that repository.
- Enable GitHub Pages with GitHub Actions as the deployment source.
- Verify the actual HTTPS deployment before distributing the link.
- Update the TraceMortem Devpost project's source and demo URLs, then verify they're visible.
- Keep the Kiroween entry unsubmitted until explicitly authorized.

The local tests do not prove GitHub Actions or GitHub Pages have executed successfully. All example logs are synthetic. The implementation is an investigation aid, not a proof of root cause.
