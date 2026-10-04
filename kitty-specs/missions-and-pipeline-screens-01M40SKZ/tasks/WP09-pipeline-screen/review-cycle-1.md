---
affected_files: []
cycle_number: 1
mission_slug: missions-and-pipeline-screens-01M40SKZ
reproduction_command:
reviewed_at: '2026-10-03T21:47:37Z'
reviewer_agent: claude
wp_id: WP09
---

VERDICT: rejected

Reviewer: independent (Renata profile). Subject: lane-i worktree, WP09 sk-pipeline-screen (IC-08). Lane was clean (`git status --short` empty) before and after all experiments.
Reason for rejection: visual drift. Items (2), (4), (5) are COVERED-BY-REJECTION (N-6/DR-7, must match the prototype); items (1) and (8) are NEW-QUESTIONs for the operator. Behaviour, gates and contract are green.

## 1. Gates (run in the lane, all exit 0)

typecheck, lint, lint:styles, lint:no-io, test:no-io (69), lint:data-driven, test:data-driven (72), manifest:check, hygiene, test:scripts, test:contract, contract:check: all exit 0. `pnpm test`: 19 files, 420 passed (expected 420). `pnpm visual` (pinned container, after build-storybook): 91 passed, parity test green; the commits add only the 22 `mission-pipeline--*.png`, no existing baseline file changed (all 43 `mission-shell--*` PNGs untouched). Shell test file: 89 tests pass; the only edit is the title plus `'41.6667%'` to `'42%'` (the intended DR-11 change; 4 changed lines). Log: scratchpad/ui4-wp09-gates.log, ui4-wp09-visual.log.

## 2. Revert experiments (12, each restored with `git checkout -- <file>`; every one went red)

| # | Edit | Red tests |
|---|---|---|
| E1 | percent.ts `Math.round` to `Math.floor` | 2 in percent.test.ts, shell footer test, screen footer-agreement test, screen DR-11 rounding test (5) |
| E2 | shell footer shows `given` unrounded | shell footer test + screen footer/inspector agreement (2) |
| E3 | step.ts ignores `nextAction` | "current step: next action verbatim" (1) |
| E4 | blockers metric shows `wpTotal` | "blockers count only" (1) |
| E5 | `sk-view-artifacts` detail `missionId: ''` | EV-6 (1) |
| E6 | crumb modifier-key guard removed | EV-7 modified/non-primary (1) |
| E7 | crumb `preventDefault` removed | EV-7 unmodified (1) |
| E8 | E-10 lane `min-inline-size` 96px to 130px | screen "five lanes fit" + board "fits five lanes in 904 px cell" (2) |
| E9 | board `mission-id` wrong | EV-5 payload + board-gets-Mission-id (2) |
| E10 | error `errorMessage` override ignored | "error shows the host message" (1) |
| E11 | ready with `mission===null` not collapsed | "ready with no Mission behaves as empty" (1) |
| E12 | header hidden outside ready | empty, error, loading and header-in-any-state tests (4) |

No vacuous test found. Select-work-package payload crosses the screen with the Mission id (E9).

## 3. Visual classification (prototype 03-pipeline.html headless 1280 dark vs the 22 baselines vs what CP-1 showed)

Prototype measured: inspector 260px, background rgb(18,19,23), 1px left border rgb(43,49,59), 0 radius, 20px padding, full height at the right edge (no card); eyebrow 12px mono, letter-spacing 0.96px (0.08em); notice 14px text, 1px full border rgb(169,199,232), 12px radius, 16px padding; View artifacts content-width outlined pill (1px border, 999px radius) with folder icon; phase band background rgb(18,19,23) + 1px bottom rule, 16px/24px padding, full-bleed; lanes 220px wide; cards 220px with whole-word titles.

| # | Difference | Class | Evidence | Remedy (exact declarations) |
|---|---|---|---|---|
| 1 | Inspector chrome: our `sk-card` (rounded, all-round border, floats inside padded main) vs the prototype's flat panel: hero background, 1px left border only, no radius | NEW-QUESTION | DR-7/N-6 rejected only the width and the content (metric rows, eyebrow, icon, notice size). Chrome was not itemised at CP-1 (DR-07 composite shows a framed box on both sides). N-2 (not full-bleed) confirmed, so the edge-attached full-height look cannot be reproduced anyway. | Operator question Q1 below. If "match": a token-only exception extension (E-12 or E-13 file list) allowing `background: var(--sk-surface-hero)`, `border-inline-start: var(--sk-border-width-1) solid var(--sk-border-default)`, `border-radius: 0` on `aside > sk-card::part(...)` or replacing `sk-card` with a plain `aside`, in `pipeline-parts.ts`; stylelint `properties` + `strict` token values, scoped to that file. Not performed. |
| 2 | Eyebrow "Current step" lacks the prototype's `letter-spacing: 0.08em` | COVERED-BY-REJECTION (N-6: "small uppercase mono") | prototype 0.96px; ours normal (baseline shows tight "CURRENT STEP"). E-12 allows `letter-spacing` token values only, and no tracking token exists, so the implementer could not set it. | In `pipeline-parts.ts` `[data-eyebrow] { letter-spacing: 0.08em; }`. Stylelint: extend the second E-09 entry (the pinned `0.08em` literal) from `files: ['sk-work-package-board/sk-work-package-board.ts']` to also list `'sk-pipeline-screen/pipeline-parts.ts'` (properties `['letter-spacing']`, `strict: ['letter-spacing']`, `keywords: ['0.08em']`, `values: {'letter-spacing': ['0.08em']}`, `emProperties: ['letter-spacing']`); add a stylelint-exceptions test case; amend gates.md E-09 (scope) and the PR text; sunset spec-kitty-design#506 (tracking token). |
| 3 | No `overflow-wrap` for long unbroken inspector values | NOT A DIFFERENCE (prototype is `normal` too) | I set a 77-char unbroken target branch on the rendered story: the metric value stays inside the card (value right edge 1222 < card right edge 1256; value box 154px, wrapped), no inspector or page overflow. | None. Drop from the list. |
| 4 | "View artifacts": our `variant="ghost"` renders full-width, borderless, centred; prototype and the CP-1 spike show a content-width outlined pill | COVERED-BY-REJECTION (DR-7 content, N-6 "folder icon on View artifacts"; the operator saw the outlined content-width button in DR-07) | baseline vs DR-07 crop | `pipeline-parts.ts`: drop `variant="ghost"` (omit for the base outlined look the spike used) or use `variant="secondary"`; verify width in a render. No CSS exception needed (the `sk-button svg` size rule stays). Amend contracts/sk-pipeline-screen.md ("a `sk-button variant="ghost"`") accordingly. Layout fallback if the host stretches it: `[data-button-row]`/`sk-button { align-self: flex-start; }` (layout property, already allowed). |
| 5 | Notice: 12px text (`sk-notice::part(body){font-size: var(--sk-text-xs)}`) with the library accent bar vs prototype 14px text with a full border | Size: COVERED-BY-REJECTION (N-6 "the notice size as in the prototype"). Accent bar: CONFIRMED (DR-5 confirmed "the library notice look") | prototype 14px; ours 12px, so ours is smaller than the prototype and not merely "compact" | `pipeline-parts.ts`: change to `sk-notice::part(body) { font-size: var(--sk-text-sm); }` (14px; `font-size` is already in E-12's properties, no new declaration kind). The full border/radius is not requested (library look confirmed under DR-5). |
| 6 | Phase band has no hero background / bottom rule; target-branch pill sits on its own row under the title | CONFIRMED (weak) | Pill row: N-1 confirmed, N-header-pipeline.png shows the same third row. Band chrome: the index "Held constant in A/B/C" line says the prototype's own phase-bar background and bottom rule are not reproduced, and the operator confirmed candidate B (DR-8) on that composite. Not itemised as a rejection. | None. Note for the operator that the band chrome is carried by that disclosure only (see Q2 optional). |
| 7 | "Current step: Implement" under the eyebrow "CURRENT STEP" duplicates the words | CONFIRMED | spec FR-019 and the contract fix this fallback text ("Current step: <label of the in-progress phase>"); CP-1 COPY confirmed every default. The CP-1 spike showed the nextAction command string, never this fallback, so the duplication was not seen. Not a defect against the signed spec. | None. Optional rewording is a spec change (operator). |
| 8 | Five-lane titles wrap ("IN / PROGRESS") and card titles break mid-word ("accessibili/ty") | NEW-QUESTION | N-4 rejected "lanes overflow" and ruled five lanes fit at 1280 without scroll; E-10 (96px, orchestrator) then makes lanes ~104px against the prototype's 220px. The operator saw spike lanes that scrolled, not wrapped narrow lanes. N-5 only names "depends on WP03" (which now wraps whole: confirmed by baseline). The title break comes from the library title in a ~72px text area, not from E-11. | Operator question Q2 below. |

## 4. Operator questions (verbatim)

Q1 (inspector chrome). The prototype's inspector is a flat full-height panel with the hero background and a 1px left border only. Ours is a rounded bordered `sk-card` floating in the padded content area. CP-1 rejected the inspector's width and content but did not name its chrome. Options: (A) accept the `sk-card` look as the library's card; (B) match the prototype: flat panel, hero background, left border only, no radius, through a scoped token-only exception extension (E-12 file list in `pipeline-parts.ts`: `background`, `border-inline-start` with token width/colour, `border-radius: 0`; sunset #509); (C) match the left-border and background only, keep the radius.

Q2 (five narrow lanes). At 1280 px five lanes are about 104 px wide with the 260 px inspector beside them, so "IN PROGRESS" wraps onto two lines, the count pill sits beside it, and card titles such as "accessibility" break mid-word. The prototype's lanes are 220 px wide with three lanes. Options: (A) accept the wrapping as the price of N-4 (five lanes, no scroll, 260 px inspector); (B) keep the width but stack the lane count under the title (a layout-only change in the board head) and shorten the break behaviour with `overflow-wrap: break-word` instead of `anywhere` (E-11 allows it) which only helps when a word fits; (C) let the inspector wrap below the board at 1280 (lanes ~170 px, the "wrapping row" breaks earlier via a larger inspector `flex-basis`, a departure from DR-7's side-by-side); (D) lower the lane count shown by default (departs AD-2). Reviewer's lean: (B) plus accepting remaining card-title breaks.

Optional (non-blocking): the phase band loses its prototype background and bottom rule (item 6 band chrome). Confirm that disclosure stands, or request a token-only `background`/`border-block-end` on `[data-phases]` (E-12 extension).

## 5. Tab tags and scroll region

Tags 12/19 are right; the contract/plan numbers 11/18 are stale. Both story baselines show the real focus ring on the intended element (WP01 card at tab 12; View artifacts at tab 19), the visual spec counts real Tab presses through the shell, and the shell stories already put the settings button first (tab-1 skip link, tab-4 first nav item). The tag convention is "stops from the page start" including the header settings button; the contract's 11/18 omitted it. Finding F6 (sev 1): correct plan/contract text. The phase band as scroll region (tabindex only while it overflows, one stop like the board, WCAG 2.1.1 / P-4) is acceptable and tested (Tab-walk per tier includes `phases` only when `scrollWidth > clientWidth`).

## 6. Findings

| id | sev | file:line | claim | remedy |
|---|---|---|---|---|
| F1 | 3 | pipeline-parts.ts `renderInspector` (`<sk-card>`) | inspector chrome differs from the prototype and was never itemised at CP-1 | operator Q1 |
| F2 | 3 | pipeline-parts.ts `[data-eyebrow]` (E-12 block) | eyebrow lacks 0.08em tracking (N-6) | add `letter-spacing: 0.08em`; extend the pinned E-09 literal to `pipeline-parts.ts` in `stylelint.config.mjs` EXCEPTIONS (details in table row 2) plus a test case |
| F3 | 3 | pipeline-parts.ts `renderInspector` (`<sk-button variant="ghost">`) | View artifacts is full-width borderless; prototype/CP-1 outlined content-width | drop the ghost variant (or `secondary`), amend contract wording |
| F4 | 3 | pipeline-parts.ts `sk-notice::part(body)` | notice text 12px, prototype 14px (N-6 notice size) | `font-size: var(--sk-text-sm)` |
| F5 | 3 | sk-work-package-board.ts (E-10 96px) with the screen padding | five-lane titles wrap, card titles break mid-word | operator Q2 |
| F6 | 1 | contracts/sk-pipeline-screen.md, plan.md story table | tab tags 11/18 stale; 12/19 correct | update the numbers |
| F7 | 2 | sk-pipeline-screen.ts header / library breadcrumbs sheet (visible in `mission-pipeline--long-names-1280.png`) | a very long Mission name is clipped at the right edge of the breadcrumb ("...tobre"), not wrapped; the full name is available in the sidebar, no page overflow (NFR-005 test passes) | wrap or ellipsize with a token-only `overflow-wrap`/`min-width: 0` (check the E-12 keyword list), or accept and note |
| F8 | 1 | (item 7) | "CURRENT STEP" then "Current step: Implement" reads as a duplicate; spec-mandated copy | optional reword by the operator |

No findings against behaviour, events, tests, contract, gates, hygiene or the E-13 Pipeline half (stylelint entry scoped to `sk-pipeline-screen.ts` only, background/border/border-radius/font-weight/font-family, `dashed` and `solid` only; matches the tracer ruling and the planning-branch gates.md).
Approved only if none sev >=3: F1-F5 are sev 3, so the verdict is rejected. After the operator answers Q1 and Q2 and F2-F4 are applied, the remaining work is small (about 4 style/markup lines, one stylelint entry, 2-3 baselines regenerated in the pinned container).
