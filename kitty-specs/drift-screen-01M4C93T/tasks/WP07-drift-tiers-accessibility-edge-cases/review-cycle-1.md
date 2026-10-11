---
affected_files: []
cycle_number: 1
mission_slug: drift-screen-01M4C93T
reproduction_command:
reviewed_at: '2026-10-10T09:12:52Z'
reviewer_agent: user
wp_id: WP07
---

# WP07 feedback, cycle 1: your change requests are ruled

The rulings are in the tracer section "Rulings at WP07 (2026-10-10)", which outranks this summary. Every item is a named out-of-map edit and must be done red-first.

1. **Row-title leak.** Scope the G-6 `[data-title]` rule in `detail-parts.ts` to the detail region. Measure the list row title back to 14 px, bold, colour 214, and the detail title still at 18 px in the display face. Add a test that fails if the rule leaks into rows.
2. **Missing `scannedAt`.** No "last scan undefined" anywhere: show the raw string, or no line, as the spec says. Fix `lastScanLine` and the header and state parts. Remove the `it.fails` marker so the test passes normally.
3. **Mission link wrap.** Add a pinned grant of `text-align: start` on `sk-button[data-mission-link]::part(button)` in `detail-parts.ts`, with a pass case, leak tests and a plant. Measure a wrapped link left-aligned.
4. **Copy divider and pane.** Covered by F-1; no change.

Afterwards, re-run the gates (no visual; use `pnpm test --maxWorkers=2`) and grep the tree for `it.fails|\.skip\(|\.only\(|\.todo\(`. The grep must find nothing.
