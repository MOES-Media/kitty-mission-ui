---
affected_files: []
cycle_number: 1
mission_slug: missions-and-pipeline-screens-01M40SKZ
reproduction_command:
reviewed_at: '2026-10-03T16:46:36Z'
reviewer_agent: claude
wp_id: WP03
---

VERDICT: rejected

Reviewer Renata, WP03 (IC-03a), lane-c at b4a3e5d. Code is sound; the rejection is for one spike-evidence defect that drives an exception decision.

## Checks run (lane left clean, git status empty)
1. FR-033: finite percentage used verbatim (value=pct, max=100, meta unrounded); absent, NaN, +/-Infinity fall back; total<=0 renders no footer. Revert experiments, each restored with git checkout -- shell-parts.ts:
   (a) drop Number.isFinite -> FAIL "NaN and Infinity percentages fall back..."; (b) value always progress.done -> FAIL "shows a given percentage verbatim"; (c) max always progress.total -> same FAIL. All three caught.
2. pnpm visual: 59 passed, 0 diffs (58 baselines + parity test). manifest:check green.
3. cfaf663: waits only (updateComplete + whenDefined); captures nothing new, cannot mask a render diff. Bounded: 10 collect passes, each element settled once, no polling; a never-resolving updateComplete is bounded only by the Playwright test timeout (see F3).
4. library-sheets.ts follows progress-sheet.ts exactly (?inline library CSS into constructable sheets; no colours, no sizes). Scope = the five D-15 families. lint, lint:styles green. shell-frame.ts: outside manifest globs, not exported from index, synthetic data.
6. Gates all exit 0: typecheck, lint, lint:styles, lint:no-io, test:no-io, lint:data-driven, test:data-driven, manifest:check, hygiene, test:scripts, test:contract, contract:check. pnpm test run twice alone: 14 files / 305 tests pass both times; the single timeout in "keeps the frame the same in every status" did not recur, judged load-induced.
5. Evidence: crops are 1280 wide, dark, reduced motion (matches the visual gate's tier/theme policy; gate default viewport 800 is overridden by vw- tags). DR-10 footer==inspector 10.8333% confirmed. N-1 (header much larger, 3 rows) and N-5 ("depends on" wraps mid-word) confirmed to differ from the prototype in the composites. S4 correction is supported by the aria snapshot (progressbar child inside the button).

## Findings
F1 | sev 3 | cp1/DR-08-phase-bar-A-B-C.png, cp1/crops/ours-phase-{A,B,C}.png, cp1/index.md (DR-8/S2) | The S2 candidates are not distinguishable: pixel diff shows B and C are byte-identical, A differs only by the missing 1px connector row (colour 43,49,59). C is described as "<hr> UA line, colour drift", but a UA hr would not equal the token-painted B line, so C was evidently painted (or B built on hr). The composite rows are also unlabelled. S2 "B chosen, needs E-04" therefore rests on evidence that does not show whether an unpainted <hr> (no exception) reaches the same look. | Remedy: re-shoot A, B, C with C as a genuinely unpainted <hr> (no colour/paint), label each row, report pixel diffs vs the prototype; re-decide E-04 from that.
F2 | sev 2 | cp1/index.md Spike outcomes S2 | The index says S2 "B chosen" but never states the S2 pass-rule result; the library indicator draws no ring or filled dot in any candidate (prototype has rings). That is a visible drift stated only inside DR-8 prose. | Remedy: say explicitly that the ring/dot absence is part of DR-8 for the operator to confirm.
F3 | sev 1 | apps/storybook/tests/visual/stories.visual.spec.ts (cfaf663 loop) | `await el.updateComplete` has no own timeout; a hung element stalls until the Playwright timeout. | Acceptable; optionally note it.
F4 | sev 1 | packages/mission-ui/src/story-support/shell-frame.ts:24 | Inline gear SVG carries width/height/stroke-width literals; same practice as the shell stories, not a stylelint/ESLint hit. | None required.
F5 | sev 1 | cp1/checks.json S3/S4 | rowButtonName and cardAccessibleName are "" (computed on the host, not the inner button); the claim is carried by ariaSnapshotCard instead. | Cite the snapshot in the index.
