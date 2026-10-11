# Research and decisions: Drift screen

Decisions D-01 onward, numbered afresh for this mission. Each lists the rejected alternatives. Facts were checked against the
clone at `ad94164` (`main`) and the contract worktree of PR #5881; nothing was run (no install, no browser), so every visual fact is
a spike, not a finding.

## Facts verified in the clone

- `main` has #5's screen merged. `sk-retry-load` is typed by the union in `logic/wp-retry.ts` (`RetryLoadDetail`); the event map entry
  is declared once in `sk-work-package-screen.ts`. `src/retry-types.ts` does not exist yet (it arrives with #7).
- The vendored contract is `1.0.0-SNAPSHOT`, pin `b61d1fa` (provenance `main`). It has no Drift schema: the re-vendor (by #9) is the
  only way the Drift types exist.
- `projectNavItems` in `elements/sk-mission-shell/fixtures.ts` already contains `nav-drift` (icon `drift`, `#/drift`) and `nav-ops`.
  `shellFrame` takes `layout`, `current`, `flush`.
- The `data-driven` gate reads its vocabulary from the vendored schemas and has an allow-list (`defaults`, `contract`, stories,
  fixtures, `story-support`). `error` is a `ViewState` value used by every screen; the gate therefore cannot read `DriftSeverity`.
- Existing shared helpers to reuse, not copy: `OverflowRegion` (`overflow-region.ts`), `ShellTierController` (`shell-tier.ts`),
  `visually-hidden.ts`, `library-sheets.ts` (breadcrumbs, empty-state, facts, event-timeline, segmented-choice, workflow sheets,
  none for tables, listboxes or copy fields), `progress-sheet.ts`, `resolveLaneLabel`, `relativeTime`/`resolveActivity`.
- The stylelint exception table is file-scoped (E-18 is `panel-parts.ts` only; E-21 per file). A new file needs its own entry.

## Decisions

- **D-01 One public element, private parts.** `sk-drift-screen` with parts `header`, `list`, `detail`, `table`, `resolution`, `state`,
  `panel`. Rejected: separate `sk-finding-list` and `sk-finding-detail` elements (the host would own the pairing and two surfaces would
  freeze); the list in the shell tree (the prototype draws it in the page). Issue Q1, ruled.
- **D-02 The list is a native `button` per option with `role="option"`, roving tabindex.** One tab stop for the listbox; arrows, Home
  and End move focus and selection. Rejected: `aria-activedescendant` on the listbox (focus stays on a container the ring must
  imitate; Playwright and screen-reader behaviour is less uniform); `sk-action-row` (a different widget, rows are not options).
  ESLint bans raw `button` outside exceptions, so this is E-36 (with the token paint keyed on `aria-selected`, as #7's E-26 did
  for tabs).
- **D-03 Selection follows focus, each move emits `sk-select-finding`.** Rejected: activation on Enter only (spec DR-17). Because the
  host owns the selection, the screen moves DOM focus to the option of the new `selectedFinding` only when focus was inside the
  listbox, so a host-driven change does not steal focus.
- **D-04 No virtualization.** 1000 plain rows in a scroller, Lit `repeat` with the finding key. NFR-006 measures it; S3 spikes it. A
  selection change re-renders the rows' `aria-selected`/`tabindex` and the detail only. Rejected: a virtual list (a new dependency and
  a focus-management problem; #7 Q9 made the same call).
- **D-05 Panels: the screen's own `panel-parts.ts` over `sk-card` plus `sk-section-header`, with the ruled E-18 properties.** The
  authority panel, the facts and the resolution are panels. This requires extending E-18's file scope to `panel-parts.ts` of this
  element, same five tokens, same sunset (spec-kitty-design#516); it needs operator confirmation at CP-1 (not a new number).
  Rejected: importing #5's `panel-parts.ts` across elements (couples two screens' private parts); hoisting it to a shared module now
  (edits a landed screen in a parallel mission); flat panels with no exception (the prototype's `.panel` look would drift).
- **D-06 Layout: container queries plus `ShellTierController`.** The two-pane grid (`420px 1fr`, E-35) collapses to one column at the
  content-cell threshold S2 derives and in the shell's mobile tier (`:state(shell-mobile)`), the #5 ruling that a container query alone
  cannot separate mobile from collapsed. The numbers are NOT carried over from #5 (848 and 688 were measured in the mission layout);
  S2 measures the project layout at 1280, 1100, 800 and 620 px. Rejected: viewport media queries (the shell, not the viewport, sets the
  content cell).
- **D-07 Lane table: a native `table` with `th scope`.** Styled by a library family if S1 finds one; otherwise layout-only CSS plus
  tokens. Scroll via the existing `OverflowRegion` (focusable and labelled only while it overflows). Rejected: a div grid with
  `role="table"` (no gain); wrapping every cell (breaks the words-only rule).
- **D-08 Copy field: a `code` element beside an `sk-button`.** The screen never touches the clipboard. On `manual` it selects the
  command's text with the Selection API on its own `code` node; S5 proves this works inside a shadow root in the pinned browser and
  the Kitty Desktop webview engine. If it does not, the fallback is to leave the text selectable and say so in the result text, and
  that is recorded, not silently chosen. Rejected: a raw readonly `input` (ESLint-banned and a second control); `execCommand`
  (clipboard access, banned by the no-io gate).
- **D-09 One polite live region keyed on the content shown.** `announcementFor(effectiveState, props)` is a pure function:
  loading, ready ("N findings, last scan ..."), rescanned (a later `scannedAt` while ready), refused, copy result (only for the finding
  whose Copy was pressed). The rescan announcement compares `scannedAt` strings for inequality, never as dates ordered by a clock.
  A mismatch (scoped foreign finding) announces nothing for the report.
- **D-10 Retry.** `DriftRetryDetail = { missionId: string | null; target: 'drift-report' }` joins the union where `main` holds it at
  implementation time; IC-02 records which file and rebases onto #7's `retry-types.ts` if it has landed.
- **D-11 Gate scope.** Read the Drift enums that are unambiguous (defaults.md); do not gate `error`, `warning`, `git`; document it in
  the gate header and cover with foreign-value tests.
- **D-12 Shell wiring needs no shell change.** `nav-drift` exists; FR-023 is amended (A-1): the work is a story that renders the
  screen in `shellFrame(..., { current: 'nav-drift', flush: true })`, plus the one-line exports.
- **D-13 Contract dependency.** IC-01 starts from `main` after #9's re-vendor. If the Drift schemas are not on `main` at dispatch, the
  mission is BLOCKED; no one re-vendors from this branch. Registry and overlays additions are append-only and rebased over #9's and #11's.
- **D-14 Focus rule.** In `willUpdate` note whether the active element is inside the screen; after `updateComplete` plus one frame,
  if focus fell to `body` or null, move it to the listbox (ready) or the state's action (error, not-found). The same rule as #7
  PLAN-FRESH4-002.
- **D-15 Baselines in the last WP only.** Region WPs hand over uncommitted side-by-side captures against the prototype.
- **D-16 Time.** Last scan text is `labels.time` then `relativeTime(scannedAt, now)` then the ISO string; `title` carries the instant.
  The screen reads no clock.

## Spikes (IC-03a; throwaway stories under `spikes/ic-03a/`, removed by a named final commit; evidence for CP-1)

| ID | Question (a visual or platform fact not known from the code) | Decides |
|---|---|---|
| S1 | Does the pinned library (`@spec-kitty/elements`, `@spec-kitty/styles` 1.1.0-rc.10) ship a table, listbox/option, copy-field, or split-pane family? Which `sk-pill-tag` tones exist for danger and attention? | whether E-36, E-37, E-38 are needed or dropped; severity badge tones |
| S2 | Content-cell widths of the shell's project layout at 1280, 1100, 800, 620 and 390 px (expanded, collapsed, mobile) | the one-column container threshold and whether the 420 px track survives at 1100 |
| S3 | A 1000-option listbox: render and selection-change cost, focus retention when the host changes `selectedFinding`, roving tabindex with `repeat` | D-02, D-03, D-04 |
| S4 | The lane table at 620 px with 40 rows and a long WP id: scroll region, header cells, `OverflowRegion` reuse | E-37 form |
| S5 | `Selection` over a `code` node inside a shadow root: does selecting work in Chromium (pinned) and what is known of the Desktop webview engine; the implementation must pass `lint:no-io` and typecheck as written (no cast or alias of `document`) | D-08 |
| S6 | `sk-card` + `sk-section-header` panel beside the prototype `.panel` for the authority and facts panels; the neutral selected-row marker token and hover token | D-05 and DD-15 |

CP-1 is the operator checkpoint after IC-03a (orchestrator-owned): the prototype beside the spike renders at 1280, 1100, 800 and 620,
the drift register DD-1..DD-21 (the spike-rendered items confirmed there, the rest at the Storybook review), the copy of
`contracts/defaults.md`, E-35..E-39 and the E-18 scope extension.

## Spec amendments proposed by planning (operator to confirm at CP-1)

- **A-1** FR-023: the Drift nav item already exists in the shell fixtures; the wiring is a story, not a shell change. APPLIED to spec.md as a factual correction (squad finding PLAN-GOV-001), not an operator decision.
- **A-2** FR-014/Gap 17: for an `error` finding with a null `remedy` the detail draws nothing for the resolution (unchanged), and the
  Storybook review judges whether a quiet sentence is wanted.
