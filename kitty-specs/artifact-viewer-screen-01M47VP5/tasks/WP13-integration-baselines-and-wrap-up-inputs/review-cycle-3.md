---
affected_files: []
cycle_number: 3
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T11:32:14Z'
reviewer_agent: user
wp_id: WP13
---

# WP13 reopened: operator Storybook review (2026-10-08)

The operator's review, verbatim: "use the whole content area to render the artifacts ... you have the space to render the whole table and it looks cut off here". The screenshot showed the plan story at a wide viewport: the document was capped at about 900 px, the requirements table scrolled with half the pane empty, and its rows were about 195 px tall.

The ruling is in the tracer section "Operator Storybook review (2026-10-08)", which outranks this summary:

1. In `prose-styles.ts`, remove `max-width: 800px` from `[data-scroll='article']`, so the article fills the pane.
   - Paragraphs and lists keep the 68ch measure (the existing `max-width: 68ch`). Extend it to lists if they do not already have it.
   - Tables, code blocks and the raw and fallback source use the full width.
2. Update the E-23 pin in `stylelint.config.mjs` so the `800px` literal is gone, and plant `max-width: 800px` to show it is refused. This is a named out-of-map edit.
3. Add tests, red-first:
   - At 1280, with the inspector present, a six-column table in the plan fixture does not overflow its box. Its box width equals the article content width, and its rows are under a sensible height. Pick the bound from evidence and report it.
   - The 9-column fixture still scrolls inside its own box at 620.
   - A paragraph's width is at most 68ch.
   - A control: with the cap restored, the first test fails.
4. Regenerate ONLY the baselines that change, in the pinned container: `git rm` each by literal path, then `--update-snapshots=missing`. Read each new PNG and describe it. No pre-existing #4 or #5 PNG may change.
5. Run the visual streak: five consecutive `pnpm visual` runs, 0 failures, on one unchanged tip. Then gate-proof once and the full gate set.
6. Update `README.md` or the CHANGELOG only if they mention the reading column.
