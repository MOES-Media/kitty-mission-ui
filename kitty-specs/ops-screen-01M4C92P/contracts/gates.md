# Contract: gates, exceptions and plants for this mission

#4's `contracts/gates.md` and #5's are the reference for gate commands, plant mechanism and timeouts. Exceptions E-04..E-30 stand. This mission owns **E-40..E-43** (Projects E-31..E-34, Drift E-35..E-39); an unused number stays unused. CP-1 confirmed (2026-10-11): E-40, E-42 and E-43 are APPROVED with the scopes below; E-41 is DELETED (number unused). Values are in `research/cp1-evidence.md`.

## How each gate applies

| Gate | This mission's change |
|---|---|
| `typecheck`, `eslint`, `stylelint`, `no-io`, `manifest`, `storybook-build`, `hygiene`, `preflight` | unchanged; new files covered by their globs; manifest regenerated once in IC-03b |
| `unit-tests` | `surface-freeze.test.ts` gains `sk-ops-screen` (11 properties, attributes, defaults, 2 events) |
| `data-driven` | extended (plan D-12): Ops enums read from the vendored schemas; self-test cases for each word class and for a bare-word property that must stay clean; no plants for the cases |
| `contract` | fixtures and overlays registered in IC-01; `--require-main` green before merge; relaxation `ops-vocab-open` |
| `visual` | 36 new stories and baselines, committed only in IC-08; timeouts re-derived by #4's rule |
| `gate-proof` | one plant for the new ESLint rule R-ops-1 (an `href` bound to an item value in `ops-row-parts.ts` is refused) and one for the data-driven extension (`'doctor_sweep'` literal outside `defaults/`) |

## ESLint rule R-ops-1 (new, scoped to `elements/sk-ops-screen/*-parts.ts`)
Refuses `unsafeHTML`, `unsafeSVG`, `.innerHTML`, `innerHTML` assignment, and an attribute binding named `href`, `src`, `srcset`, `action`, `formaction` or `xlink:href` in those files; plant included.

## Proposed exceptions

| Id | Item | Files (only) | Allowed | Sunset | Condition |
|---|---|---|---|---|---|
| E-40 | APPROVED (widened). The row frame and row typography of a plain `li` with the project grid (S-O1 option d); `sk-card` and the library facts element are not used. Second clause: the Ops status badge keeps `sk-pill-tag`; a data-attribute-scoped grant adds the outline border and the mono font (as #10 G-4), leak-tested against the sibling parts | `ops-row-parts.ts` selectors only | `border` (token width plus `solid`), `border-radius`, `padding`, `background`, `font-size`, `font-family`, `font-weight`, `font-variant-numeric`, `color`: token values only, plus one pinned literal `line-height: 1.5` (no line-height token exists) | spec-kitty-design record-row element and a leading token | none (approved) |
| E-41 | DELETED (number unused). The term minimum is `minmax(calc(var(--sk-space-10) + var(--sk-space-4)), .55fr)` = 80 px, which passes the unmodified config | n/a | n/a | n/a | n/a |
| E-42 | APPROVED (narrowed). Extension of E-21 (words-only wrapping; keyword values, file-scoped) to `ops-row-parts.ts` and `ops-page-parts.ts` | those two | `text-overflow` and `white-space` keywords, plus `overflow-wrap` as E-21; `overflow` needs no grant | E-21's sunset | none (approved) |
| E-43 | APPROVED. `overflow-wrap: anywhere` on the id and the evidence value; a fact wraps at any text size (operator ruling A11Y-001) and only a pill ellipsizes. At 390 the stacked head uses `align-items: stretch` | `ops-row-parts.ts` | that one declaration on two selectors | spec-kitty-design long-token text treatment | none (approved) |

Layout-only `::part` rules (E-22 style) are added with a row only if S-O1 proves one is needed.

## Self-check list for reviewers (copy into every WP brief)

- No `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `abandoned`, `advisory`, `task_execution`, `mission_step`, `doctor_sweep`, `repo_path`, `ops_unreadable`, `invalid_page_cursor` literal outside `defaults/`, `contract/` and stories; no `=== '<word>'`.
- No profile or action literal in any non-fixture file.
- No `Date`, `setTimeout`, `fetch`, storage, `location`, `history`; no `Math.` on contract values.
- Every `dispatchEvent` has a literal `sk-*` name, sits in `sk-ops-screen.ts` and is declared by `@fires`.
- No `href`, `src`, `unsafeHTML` or `innerHTML` in a parts file.
- Rows have no listener, role or tabindex.
- Absolute-path and username check on every new file.

## Timing record (IC-08, recorded by WP09)

Baseline: 174 baselines before this mission, 210 after (36 Ops baselines, one per built matrix row; OP-34 is not built).

Five consecutive local `pnpm visual` runs (build-storybook plus the pinned container, one commit, 1-minute load at or below 5.3 before each): 94 s, 94 s, 91 s, 100 s, 90 s wall-clock; 211 tests passed, 0 failed, 0 flaky each run (210 stories plus the baseline-parity test). Generating the baselines took 92 s.

Timeouts: measured CI runs exist on the public repository and replace the earlier scaled estimate. Main with 210 baselines took 9m24s for the `visual` job and 25m41s for `proof (visual)`; the Artifact Viewer PR with 255 baselines took 13m44s and 30m44s. Main has since raised the timeouts to 28 and 47 minutes, and this branch takes those values when it merges main. With the Artifact Viewer, Drift and Ops screens all landed (about 330 baselines), `proof (visual)` projects to about 40 minutes, so it is re-derived at the port from the latest CI run and kept under 70% of its timeout. The local `gate-proof local` run passed all 12 legs (each planted failure refused); its visual leg took 990 s.

## Exceptions as built

E-40, E-42 and E-43 stand as approved at CP-1 (scope in the table above); E-41 is unused. Sunsets: E-40 and E-43 end with the spec-kitty-design record-row element and leading token; E-42 ends with E-21's sunset. New gate rule added by WP09 (project-wide, not an exception): an aliased lit `css` import is refused by ESLint, with a plant and a self-test.
