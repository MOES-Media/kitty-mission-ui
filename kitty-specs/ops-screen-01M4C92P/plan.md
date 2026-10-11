# Implementation Plan: Ops screen

**Branch**: `feat/ops-screen-11` (planning base and merge target; implementation lanes branch from `main` once the shared contract re-vendor has landed) | **Date**: 2026-10-08 | **Spec**: `kitty-specs/ops-screen-01M4C92P/spec.md`
**Input**: the specification with the operator rulings of 2026-10-08 (`tracer-design-decisions.md`), GitHub issue spec-kitty/spec-kitty-mission-ui#11, the Mission Status contract slice of spec-kitty PR #5881 (`GET /ops/invocations`), the approved prototype page `07-ops.html` and its `?state=` variants, and the code of mission-ui `main` at `ad94164` (#4, #5).

## Summary

Add ONE public element, `sk-ops-screen`, to `@spec-kitty/mission-ui`, with three private part files, taking the contract's `OpsInvocationPage` as properties (eleven: `items`, `pageInfo`, `totalCount`, `skippedCount`, `profile`, `status`, `loadingMore`, `loadMoreError`, `refusalCode`, `labels`, `errorMessage`) and emitting two events (`sk-load-more`, `sk-retry-load` with the new target `ops-page`). It is read-only and does no I/O. Rows are plain list items: id, outcome word, six facts, up to three optional facts (Mission, Work Package, Mode), a swept-Op fact, and evidence as inert mono text. New defaults module `ops-copy.ts`, four `logic/` modules, an extension of the `data-driven` gate for the Ops vocabularies, fixtures generated from the contract examples plus overlays, 36 stories with baselines committed only in the last work package, and the shell wiring of the project layout's Ops item.

## Technical Context

**Language/Version**: TypeScript 5.9 strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), Lit 3.3.3, Node 22.22.2, pnpm 11.18.0, as #4 and #5
**Primary Dependencies**: `@spec-kitty/elements` 1.1.0-rc.10 (`sk-page-header`, `sk-pill-tag`, `sk-notice`, `sk-button`, and the adopted styles-only `empty-state` and `progress` families as the Missions screen does). Whether `sk-action-row`, `sk-card` or `sk-facts` carries the row is decided by spike S-O1. No new runtime dependency
**Storage**: N/A
**Testing**: Vitest browser mode, `node:test` for contract tooling, vitest node environment for the data-driven self-test, Storybook stories, Playwright visual spec in the pinned container
**Target Platform**: evergreen browsers (dashboard) and the Kitty Desktop webview; the screen renders inside `sk-mission-shell` (project layout, `flush`)
**Project Type**: pnpm workspace as #4: `packages/mission-ui`, `apps/storybook`, root `contracts/` and `scripts/`
**Performance Goals**: 200 rows re-render in 200 ms or less; 1,000 loaded rows in 500 ms or less (NFR-006)
**Constraints**: no I/O; layout-only token CSS (Stylelint; numbered exceptions E-40, E-42, E-43 only); no raw `<button>`, `class=` or `style=` outside recorded exceptions; no arithmetic beyond `items.length`; no Ops vocabulary literal outside `defaults/` and `contract/`; synthetic fixtures; baselines only in the pinned container
**Scale/Scope**: 1 public element (11 properties, 2 events), 3 part files, 1 defaults module, 4 `logic/` modules, about 14 contract-derived plus 22 overlay fixtures, 36 stories and baselines, 1 data-driven gate extension, 3 approved exceptions (E-40 widened, E-42 narrowed, E-43; E-41 deleted at CP-1)

## Build base

1. **No stacking** (operator, 2026-10-08). The contract re-vendor is done ONCE, first, by the Projects mission after spec-kitty PR #5881 merges. This mission's implementation lanes start from `main` after that lands. IC-01 begins by verifying that `contracts/spec-kitty/PIN.json` is `provenance: "main"` and that `OpsInvocationPage.yaml` exists in the vendored schemas; if not, IC-01 stops and reports (nothing is vendored here).
2. **Retry union location.** `src/retry-types.ts` arrives on `main` with #7. At branch start IC-01 looks: if the file exists, the `ops-page` member is added there; if not, it is added beside the union where `main` holds it (`logic/wp-retry.ts` at `ad94164`) and the build base record in `quickstart`-level notes says which. Either way the union is extended, never redeclared (FR-028).
3. **Shared one-line touches** that serialise with Projects and Drift: `src/defaults/index.ts` and `src/index.ts` exports (IC-03b), and the shell's `nav-ops` item content wiring (IC-03b). Whoever lands second rebases.
4. **Baseline.** IC-01 runs every gate command on the build base and records the green baseline in the mission's timing record. A red found there is escalated.

## Charter Check

| Charter rule | Status |
|---|---|
| Data in as properties typed from the OpenAPI read contract | pass: types generated from the vendored pin; fixtures generated from the contract's examples; `contract` gate with `--require-main` |
| View state in as a property | pass: `status` (`loading`, `error`, `empty`, `ready`); the screen adds no state of its own; partial states are `loadingMore` and `loadMoreError` |
| Events out as `bubbles` `composed` `sk-*`, every payload asserted | pass: two events, literal dispatch in the screen file, `@fires`, EV-1 to EV-6 tests with positive controls |
| No I/O | pass: no timers, clock, storage or navigation; evidence never loaded (structural walk, NFR-005) |
| Elements over CSS; gap not hand-rolled | pass with exceptions E-40, E-42, E-43 (approved at CP-1; E-41 deleted) and recorded library gaps (`contracts/gates.md`) |
| Atomic design, deep modules | pass: one public element, small surface, three private parts |
| Quality gates incl. manifest, no-io, visual | pass: all apply; `data-driven` extended; `surface-freeze.test.ts` extended |
| A story per view state, synthetic fixtures; a test per event | pass: 36 stories; fixtures hygiene-checked |
| Visual regression against the prototype; drift is REJECT | pass-with-condition: DO-1..DO-24 PROPOSED; those a spike renders (DO-13, DO-22, DO-24) are decided at CP-1; the rest at the operator's Storybook review after the last WP; baselines only in IC-08 |
| Fixtures: no real user data, paths, usernames | pass: hygiene and `contract` gates; the prototype's real record ids are not copied |
| Reviewer agent per WP; squad after the plan phase only | pass: this plan is the squad's input; the aggregate review and compact history before the PR is the operator's standing wrap-up rule |
| PR into `main`, operator merges; Storybook review after the last WP | pass: one PR after wrap-up |
| Amendments and exceptions need operator approval | pass: E-40, E-42 and E-43 were approved by the operator at CP-1 (2026-10-11); E-41 was deleted |

Re-check after design: unchanged.

## Architecture

**Decisions (D-nn; research.md carries the evidence).**

- **D-01 One element, three parts.** `sk-ops-screen.ts` (properties, state resolution, events, live region, focus), `ops-row-parts.ts` (row, facts, evidence), `ops-page-parts.ts` (header, source notice, heading and badge, Load more, skipped note, load-more error, profile fact) and `ops-state-parts.ts` (loading, empty, error). Parts are pure `html` functions of view-models; they register nothing and dispatch nothing. Events are dispatched only from the screen file.
- **D-02 State resolution is one pure function** `resolveOpsLook(props)` in `logic/ops-look.ts`, returning `'loading' | 'error' | 'empty' | 'ready'` and the reason. Precedence: `status` normalised (unknown collapses to `empty`); `loading`, `error`, `empty` win as given; `ready` with zero items is `empty` (OP-37); `ready` with a non-null `profile` and any item whose `profileId` is not exactly `profile` is `loading` (FR-032, ruled exact equality) and announces nothing; otherwise `ready`. `loadMoreError` is read only in `ready`; `refusalCode` only in `error`.
- **D-03 Row view-model** `buildOpsRow(item, vocabulary, labels)` in `logic/ops-row.ts`: badge (outcome word and tone for a non-null outcome, else the status word and tone), the ordered fact list with absent facts removed (Mission, Work Package, Mode, Closed by) or replaced by the quiet word (Actor, Completed, Evidence), the evidence display (class word, value, `changed` flag). Words and tones from `defaults/ops-copy.ts` through one `lookup`; unknown values raw with the neutral tone. No branch on a vocabulary literal in the function: the tone table is data.
- **D-04 Time** `formatUtcInstant(iso)` in `logic/ops-time.ts`: a strict RFC 3339 pattern; the fields are converted to UTC from the offset by integer arithmetic on the parsed numbers and printed `D Mon YYYY, HH:MM:SS UTC` with month names from `defaults/` (no `Intl`, so baselines do not depend on the browser locale); fractional seconds are dropped from the text and kept in `datetime`. Month, day (calendar-valid, leap years), hour, minute and second (0 to 59; a leap-second `60` is not valid here) and offset (hours 0 to 23, minutes 0 to 59) are range-checked; any failure, like a pattern mismatch, returns null and the part prints the string as given with no `datetime`. No `Date.now()`; no `new Date()` at all (the arithmetic is on numbers), which keeps the `no-io` rule trivially satisfied. The label hook may reword the text (`labels.time`).
- **D-05 Count and announcement texts** are functions in `defaults/ops-copy.ts` (`opsCountText(loaded, total)`, `skippedText(n)`, `loadedAnnouncement(...)`), as `missionCountText` is. The screen passes `items.length` and `totalCount`; no other arithmetic.
- **D-06 Load more** repeats the Missions mechanics exactly: `requestedCursor` memo, reset when `loadingMore`, `items` or `pageInfo` change; `sk-button variant="secondary" ?busy`; the row `li` carries `aria-busy`. The event type is the Missions screen's `SkLoadMoreDetail` (imported, not redeclared).
- **D-07 Load-more error** replaces the Load more control with an `sk-notice` (tone danger, `announce` off because the live region speaks) and a retry `sk-button`; a code of `invalid_page_cursor` swaps the sentence and the button text to "Refresh from the newest", whose payload has no `cursor`. The code is compared through a `defaults/` constant, never a literal.
- **D-08 Live region** is one `role="status"` `aria-live="polite"` region keyed (`keyed`) on an announcement sequence number, as the Missions screen. The announcement is derived in `willUpdate` from the SHOWN look and the shown row count, compared with the previous shown pair; it changes only when the shown pair changes. The error look is `role="alert"` and is not duplicated in the region; a load-more error is announced through the region.
- **D-09 Focus.** `willUpdate` records whether focus is inside the screen; after `updateComplete` plus one animation frame, if the focused control was removed and focus fell to the body, focus moves to the section heading (`tabindex="-1"`), or to the state's heading in loading, empty and error. Rows are never focus targets. The pending spike S-O4 proves `sk-button busy` keeps focus across the busy toggle and the page arrival.
- **D-10 Tiers.** The screen's collapses are container queries on a wrapper inside the screen (CP-1 orchestrator ruling; not the host), thresholds 696 px (facts) and 588 px (head and section heading) derived derived by spike S-O2 from the shell's real content-cell widths at the 1100, 800 and 620 px viewports (#5 DW-24 method), not viewport media queries. `ShellTierController` with `:state(shell-mobile)` is used ONLY if S-O2 shows a container threshold cannot reproduce the prototype's 620 px head stack at zero drift (#7 CP-1 option C); the screen calls `attachInternals` nowhere else.
- **D-11 Evidence is inert by construction.** Every item-derived text (id, profile, action, actor, Mission, Work Package, evidence value) is wrapped in a `bdi`, so a bidirectional override in evidence text cannot reorder its neighbours (no notice; CP-1 may add #7's). The evidence value is interpolated only as a text binding inside a `<span data-evidence-value>`. No part uses `unsafeHTML`, `unsafeSVG`, `.innerHTML`, `href`, `src` or `srcset` on a value derived from an item; an ESLint selector set for `ops-row-parts.ts` (R-ops-1) forbids them, with a plant.
- **D-12 Data-driven extension.** `eslint.data-driven.config.mjs` reads `OpsOutcome`, `OpsClosedBy`, `OpsModeOfWork`, `OpsEvidenceKind`, `OpsInvocationStatus`, `OpsRefusalCode` and the `invalid_page_cursor` constant from the vendored schemas. Matched anywhere as literals: `task_execution`, `mission_step`, `doctor_sweep`, `repo_path`, `ops_unreadable`, `invalid_page_cursor`, `abandoned`. Matched only in a comparison or case label (common identifiers): `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `advisory`. `done` is already gated as a lane. Self-test cases (not plants) for each, plus a plant for the new mechanism (gate-proof).
- **D-13 Profile and action are open text.** No part, helper or test double holds a profile or action literal other than in fixtures and stories (allow-listed).
- **D-14 Surface.** Eleven properties; attributes: `status` (reflected), `loading-more`, `error-message`, `profile`, `total-count`, `skipped-count`, `refusal-code`; object properties (`items`, `pageInfo`, `loadMoreError`, `labels`) have no attribute. Frozen at IC-03b by `surface-freeze.test.ts`.

**Open plan forks:** none. Proposed exceptions are decisions for the operator at CP-1, not forks.

## Project Structure

### Documentation (this mission)

```
kitty-specs/ops-screen-01M4C92P/
  spec.md  plan.md  research.md  data-model.md  operator-questions.md  tracer-design-decisions.md
  contracts/ sk-ops-screen.md  defaults.md  gates.md
  reviews/    (plan squad trail)
```

### Source code (additions on top of `main`)

```
packages/mission-ui/src/
  defaults/ops-copy.ts                      (+ one export line in defaults/index.ts)
  logic/ops-look.ts  ops-row.ts  ops-time.ts  ops-text.ts   (+ exports in logic/index.ts)
  elements/sk-ops-screen/
    sk-ops-screen.ts  ops-row-parts.ts  ops-page-parts.ts  ops-state-parts.ts  fixtures.ts
    sk-ops-screen.rows.stories.ts  .paging.stories.ts  .states.stories.ts  .tiers.stories.ts
  contract/fixtures.generated.ts  types.generated.ts   (regenerated, not hand-edited)
packages/mission-ui/test/ ops-*.test.ts  sk-ops-screen.*.test.ts   (+ surface-freeze.test.ts extended)
eslint.data-driven.config.mjs  gates/data-driven.selftest.ts  gates/plants/...   (extended)
```

## Implementation Concern Map

Lane mechanics (claiming, worktrees, moves) are orchestrator-owned; WP agents never run them and never spawn sub-agents. Shared files and who may write them:

| File | Writer |
|---|---|
| `fixtures.generated.ts`, `types.generated.ts`, contract tooling relaxations | IC-01 only |
| `defaults/ops-copy.ts`, `logic/ops-*.ts`, data-driven config and self-test | IC-02 only |
| `sk-ops-screen.ts`, `src/index.ts`, `defaults/index.ts`, shell wiring, manifest | IC-03b (skeleton with stubs for every part and every dispatch); later ICs edit only their own part file and, where a wiring line is needed, the stub IC-03b left |
| `elements/sk-ops-screen/fixtures.ts` (story argument helpers, overlay builders, the 200-row builder) | IC-01 |
| `ops-row-parts.ts` and `sk-ops-screen.rows.stories.ts` | IC-04 |
| `ops-page-parts.ts` (header, source notice, heading and badge, profile fact, Load more, skipped note, load-more error) and `.paging.stories.ts` | IC-05 |
| `ops-state-parts.ts` and `.states.stories.ts` | IC-06 |
| tier CSS (in the part files, by the IC that owns each; IC-07 edits only the container-query blocks), `.tiers.stories.ts`, a11y and edge tests | IC-07 |
| baselines, timing record | IC-08 only |

### IC-01 Contract slice, fixtures, baseline
Verify the pin (Build base 1); record the gate baseline; register the Ops fixtures in the generation step (page `first`, `last`, `empty`; nine invocations; the two refusals) and the overlays (a row of each outcome, closer, mode, evidence kind and redaction; null actor; null Mission and Work Package; 512-character evidence; hostile inert evidence; unknown outcome, closer, mode, kind; 128-character profile; long action; `+02:00` offset; a 200-row generated page). Named relaxations: `ops-vocab-open` (foreign vocabulary values), `ops-field-length` (none expected; recorded if a generated overlay needs one). Exit: `contract:check --require-main` green, hygiene green, fixture count recorded.

### IC-02 Defaults, logic, gate extension
`ops-copy.ts` (contracts/defaults.md), the four `logic/` modules with unit tests (time conversion incl. offsets, leap-second `60`, midnight rollover, invalid strings; row view-model incl. unknown vocabularies and defensive combinations; look resolution table; count and skipped texts incl. singular), the retry-union member (Build base 2), the data-driven extension and self-test cases (D-12), the R-ops-1 ESLint selectors with a plant. Exit: `test:data-driven`, `gate-proof`, unit tests green.

### IC-03a Foundation spikes and CP-1 evidence
S-O1 to S-O4 (research.md). Output: renders, measurements, accessibility trees, the verbatim Stylelint probe, in an evidence set. No product code is merged.

### CP-1 Operator checkpoint (orchestrator-owned)
The operator rules on the spike evidence: the row and facts construction (DO-22, DO-24, E-40, E-41), the id and evidence wrapping (DO-13, E-43), the tier thresholds (D-10 and the controller question). No IC-03b until CP-1 is recorded as "CP-1 confirmed".

### IC-03b Skeleton and surface freeze
The element with eleven properties, two events with `@fires`, state resolution, live region, stubs for every part, exports, shell wiring (`nav-ops` content with `flush`), the manifest regenerated once, `surface-freeze.test.ts` extended, a skeleton test. After this the public surface is frozen.

### IC-04 Rows (chain X)
`ops-row-parts.ts`: head, badge, facts, evidence, quiet words, redacted word; stories OP-02..OP-14, OP-26, OP-27, OP-33; tests incl. the structural walk for every evidence fixture (NFR-005).

### IC-05 Paging and notices (chain Y)
`ops-page-parts.ts`: header, notice, heading and badge, profile fact, Load more, skipped note, load-more error and refresh; stories OP-01, OP-15..OP-18, OP-24, OP-25, OP-28, OP-35; tests EV-1..EV-5 incl. no-event cases.

### IC-06 States (chain Y)
`ops-state-parts.ts`: loading, empty (three wordings), error; live-region and focus behaviour; stories OP-19..OP-23, OP-36, OP-37; announcement tests (NFR-013).

### IC-07 Tiers, accessibility, edge cases
Container queries per S-O2; OP-29..OP-32; 200% text test; focus-order test; 1,000-row timing; hostile-corpus test with CSP observation and a positive control; the self-check list over all files.

### IC-08 Integration and wrap-up inputs
Baselines for 36 stories committed here only; five consecutive `pnpm visual` runs in the pinned container; timeouts re-derived and recorded; `contract:check --require-main`; exceptions table final; PR description inputs; the aggregate review squad and compact history happen before the PR (standing rule), not in this IC.

Chains: X = IC-04; Y = IC-05 then IC-06 (they may run in parallel; they edit disjoint part files). IC-07 follows both.

## CP-1 and spikes

See `research.md`. Spikes run in IC-03a before the skeleton, because the visual facts (row frame, facts look, wrapping, thresholds) change file shapes and exceptions.

## Gates

Per-gate table, data-driven extension, exceptions, plants and the reviewer self-check list: `contracts/gates.md`. `pnpm visual` is not an exit check of IC-04..IC-07 (no committed baselines until IC-08); their exit evidence is the uncommitted side-by-side screenshot per story.

## PR shape and wrap-up (operator standing rule)

One PR into `main`, drafted after the aggregate squad review and a compact history (charter and wrap-up procedure), the operator merging. The operator reviews Storybook after IC-07 and before wrap-up.

## Traceability

| Requirement | Concern |
|---|---|
| FR-001, FR-014, FR-042 | IC-03b |
| FR-002, FR-041 | IC-01 |
| FR-003, FR-004, FR-005, FR-022, FR-023, FR-031 | IC-05 |
| FR-006..FR-013, FR-015, FR-016, FR-019 | IC-04 (view-model IC-02) |
| FR-017, FR-018, FR-039 | IC-02, IC-04 |
| FR-020, FR-037 | IC-07 (spikes S-O2, S-O3) |
| FR-021, FR-024, FR-029, FR-030 | IC-05 |
| FR-025..FR-028, FR-033, FR-034 | IC-06 (+ IC-03b skeleton) |
| FR-032 | IC-02 (function), IC-03b (use), IC-05 (story) |
| FR-035, FR-036 | IC-07 |
| FR-038 | IC-02 |
| FR-040 | IC-03b |
| FR-043 | IC-03a, IC-08 |
| FR-044 | every IC; baselines IC-08 |
| NFR-005, NFR-012, NFR-013 | IC-04, IC-06, IC-07 |
| NFR-002, NFR-008, NFR-010 | IC-08 |
