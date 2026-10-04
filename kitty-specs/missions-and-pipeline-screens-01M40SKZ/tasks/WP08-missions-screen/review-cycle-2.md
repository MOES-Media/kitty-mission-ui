---
affected_files: []
cycle_number: 2
mission_slug: missions-and-pipeline-screens-01M40SKZ
reproduction_command:
reviewed_at: '2026-10-03T19:54:55Z'
reviewer_agent: claude
wp_id: WP08
---

VERDICT: rejected

# WP08 re-review (cycle 2), Renata (independent)
Lane-h at ea1f692 (rework 26f5724, 12563f0, 4b54037 + docs). Lane clean after every experiment.

## Gates (all exit 0, run in lane)
typecheck, lint, lint:styles, lint:no-io, test:no-io, lint:data-driven, test:data-driven, manifest:check, hygiene, test:scripts (incl. new stylelint-e13.test.mjs, 24 pass on lint side), test:contract, contract:check, pnpm test (387 pass), pnpm visual (87 pass).

## Per-finding resolution
- F1 RESOLVED. Baselines empty/no-match show a rounded, filled, dashed card; loading shows rounded filled SOLID card (matches prototype ?state=empty/loading at 1280 dark). Token-only values in the CSS. Experiments: border dashed->0 reds empty, no-match x2 (3 visual); border solid->0 reds loading only (1); drop `solid` from E-13 ignoreValues -> lint:styles red; drop the new properties from the allowed list -> stylelint-e13 test fails 5. Note: removing `background: var(--sk-surface-card)` leaves visual GREEN (the library panel already paints that surface), so the declaration is redundant at present (sev 1, harmless; the extended E-13 background allowance is then unused paint licence).
  E-13 leak judgement: `dashed`/`solid` and `border`/`background`/`radius`/`font-family` are allowed file-wide in sk-missions-screen.ts only; sibling file and Pipeline file refuse every one (24 allowed/no-leak tests + plant). Residual: "heading only" font-family and "loading only" solid are not selector-enforced (stylelint scopes by file); no other file can use them. Acceptable (sev 1), documented in gates.md.
- F2 PARTLY RESOLVED, but introduces a regression (see N1). Populated/row baselines show title + slug inline at 1280 and at 680 (container >=401px); revert experiment (container min-width 99999px) reds 18+ baselines; library narrow reflow below 401px left alone.
- F3 RESOLVED. Mutation `!==` instead of `>` reds "shorter list announces nothing"; dropping `before.length > 0` reds "grows from empty announces nothing"; both have positive controls.
- F4 RESOLVED. `font-family: var(--sk-font-display)` only on `.sk-empty-state__heading`; removing it reds the 3 panel baselines with a visible face change (so the display font DOES load in Storybook).

## New findings
| id | sev | where | claim | remedy |
|---|---|---|---|---|
| N1 | 4 | `sk-missions-screen.ts` container rule (grid-template-columns `auto minmax(0,auto) minmax(0,1fr) auto`); baseline `mission-missions--long-names-1280.png` (re-baselined) | With the inline layout, the long slug column collapses and the slug renders ONE CHARACTER PER LINE down the card (screenshot: vertical glyph column, tags, badge and time pushed far below/out of view). Before the rework (664d14f) the same story was a compact 4-line card. The new baseline blessed the broken render (PNG shrank 52 KB to 44 KB). Long names are an explicit edge case of the screen. | Let the title wrap and the slug truncate/wrap sanely: e.g. title column `minmax(0,1fr)` with slug `minmax(0,auto)` and `overflow-wrap: anywhere` on slug only inside a sane min, or fall back to the stacked layout when content is long (the stacked layout was fine); re-shoot long-names and assert in the story that the row height is bounded (a test on bounding box of the slug part: width > one glyph, row height < e.g. 200px). |
| N2 | 1 | background declaration | redundant (see F1) | optional |

Spot-checked baselines vs prototype / vs previous: empty, loading, no-match, populated, mobile-680, long-names (regressed). Only the 21 mission-missions PNGs changed; 3 Missions baselines (incl. error) and all other stories byte-identical.

Approved only if no finding at 3 or above: N1 is 4, so REJECTED. Everything else is sound; a one-rule CSS fix plus a bounded-height assertion should clear it.
