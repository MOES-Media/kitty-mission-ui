---
affected_files: []
cycle_number: 4
mission_slug: artifact-viewer-screen-01M47VP5
reproduction_command:
reviewed_at: '2026-10-08T12:11:30Z'
reviewer_agent: user
wp_id: WP13
---

# WP13 review feedback, cycle 4: the table still does not render whole when there is room

The orchestrator checked the cycle-3 change at the operator's window width, headless, on the rebuilt Storybook, story `document--av-03`:

| Viewport | Box width | Table width | Rows (px) |
|---|---|---|---|
| 1920 | 1306 | 1306 (fits) | 45 / 94 / 94 |
| 1640 | 1026 | 1198 (scrolls) | 45 / 164 / 164 |

At 1640 the 9th column is off-screen and every row is 164 px tall. The cause is the WP12 `min-width: 12ch` floor on every cell: 9 × 12ch plus padding exceeds the pane, and the long last cell wraps inside its floor, which stretches every row. The ruling is at the end of the tracer section "Operator Storybook review", and it outranks this summary.

1. In `prose-styles.ts`:
   - remove `min-width: 12ch` from `[data-md='table'] th, td`;
   - the table sizes to its content (`width: max-content`; the scroll box still scrolls);
   - data cells cap at a readable `max-width` in `ch`, chosen from evidence (try 30, 35 and 40ch), so that only long cells wrap;
   - header cells do not wrap mid-word.
2. Update the E-23 pin in `stylelint.config.mjs`: swap `12ch` for the new value, and add `min-width: 12ch` as a refused plant.
3. Tests, red-first, in `sk-artifact-screen.table.test.ts`. Replace the 1600 px six-column test with the real plan fixture:
   - at 1640 with the inspector, the 9-column `document--av-03` table fits with no overflow and every row is at most 3 text lines tall;
   - at 1280 it may scroll, but every row stays at most 4 lines;
   - at 620 it scrolls inside its box, with rows at most 4 lines;
   - a 3-column table never scrolls at 620;
   - control: restoring the 12ch floor fails the 1640 test.

   Report the measured numbers for each case.
4. Regenerate ONLY the baselines that change (AV-03, AV-32a and AV-32c showed the tall rows): `git rm` each by literal path, then `--update-snapshots=missing` in the container. Read each new PNG and describe it. No pre-existing #4 or #5 PNG may change.
5. Take uncommitted headless shots of `document--av-03` at 1640 and 1920 (the operator's case) and list them in the report.
6. Run the five-run visual streak and gate-proof once on the final tip, then the full gate set.

Coordinate: #9 WP09 may start its own visual streak when yours is idle. Never touch its processes.
