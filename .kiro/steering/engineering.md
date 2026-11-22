# Engineering steering — TraceMortem

- Pure deterministic analysis, no opaque predictions presented as facts.
- Sanitize every untrusted log string before inserting it into HTML.
- Keep all customer/user event files local to the browser. No external dependencies at runtime.
- Tests should include malformed JSON, CSV escaping, Unicode, time ordering, filters, source mapping and report escape cases.
- Keep demo fixtures reproducible. Avoid random data or undocumented scoring changes.
- Accessibility, narrow layouts, low animation and keyboard navigation matter.
- Always run `npm run check` and `npm run build` before committing.
- Do not describe planned Kiro features as completed work.
