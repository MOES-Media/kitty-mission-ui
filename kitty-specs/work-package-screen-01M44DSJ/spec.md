# Mission Specification: Work Package detail screen

**Mission Branch**: `feat/work-package-screen-5`
**Created**: 2026-10-04
**Status**: Draft (open questions Q1-Q12 ruled 2026-10-04; drift register pending CP-1)
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#5 ("Work Package detail screen against the Mission Status
contract"), written before contract 1.1 and re-derived here against it; the Mission Status contract 1.0 (`WorkPackage`)
plus the 1.1 slice spec-kitty#5625 (`WorkPackageDetail`, the artifact reads); and the approved Kitty Desktop V2
prototype page `04-work-package.html` (with `05-artifact.html` for the artifact links).

## Intent Summary

- **Primary actor**: a host (the local dashboard served by the Mission Status read service, or Kitty Desktop) that
  renders the Work Package screen inside the app shell, and the user looking at it.
- **Trigger**: the Pipeline board's card (`sk-select-work-package`) and the shell's Work Packages tree select one Work
  Package. The host reads that Work Package and passes the data in.
- **Desired outcome**: one screen, **Work Package detail**, that takes the contract's `WorkPackage` (1.0) and
  `WorkPackageDetail` (1.1) in as properties plus a view state, emits `sk-*` intent events out, and is visible in every
  state of the state matrix as a Storybook story with an approved visual baseline, built without a live service.
- **Rules that always hold**: the screen performs no I/O (no fetch, XHR, WebSocket, Tauri API, browser storage, timer
  or clock). It is read-only: no write of any kind. Every UI primitive that the design library provides is rendered
  with that library element (elements over CSS). The prototype is the visual source of truth; only drift listed in the
  Visual Drift Register and confirmed by the operator at CP-1 is allowed. The screen does no arithmetic on contract
  values. The pipeline is data-driven (see "The dynamic-pipeline constraint").
- **Canonical terms**: *Mission* (never "feature"); *Work Package* (WP); *status lane* (one of the nine contract
  values; the only meaning of "lane" for a value of `statusLane`); *code lane* (the `lanes.json` lane worktree and
  lane branch named by `workspace.laneId`, never a status lane); *lane group* (a board or badge grouping of status
  lanes; it belongs to the board and the host, and this screen has no lane-group property, P-2); *view state* (`loading`, `error`, `empty`, `ready`, plus the screen's own
  `not-found` and `nothing-selected`, see FR-028); *tier* (expanded, collapsed, narrow, mobile; the shell owns the tier
  change, the screen owns its own column collapse); *artifact* and *artifact reference* (1.1 terms).
- **Out of scope**: see "Scope".

## Clarifications

### Operator rulings, 2026-10-04

The operator accepted all twelve open questions' recommendations as written on 2026-10-04. Each ruling text below is the recommendation, now binding on plan, tasks and review. Rulings are mirrored in `tracer-design-decisions.md`. The Visual Drift Register (DW-1 to DW-30) is NOT part of these rulings: it stays PROPOSED until the operator confirms it at CP-1 (CP-1 held 2026-10-05: DW-10, DW-11, DW-12, DW-16, DW-17, DW-24 and DW-30 are CONFIRMED; the other 24 are confirmed at the Storybook review after the last WP; see "CP-1 operator rulings (2026-10-05)").

- **Q1, operator ruling 2026-10-04.** **Staleness look** (issue Q1; unchanged by 1.1, still provisional).
  Ruling: A small header badge "stale, N min since last commit" when `stale`; a quiet fact row for `fresh`; nothing for `not_applicable` or null; the field stays optional and hidden when absent.
- **Q2, operator ruling 2026-10-04.** **Subtask list** (issue Q2; 1.1 gives titles and per-subtask lanes).
  Ruling: Progress bar from `subtaskProgress` as given (hidden at total 0) plus a semantic list of id, title and lane word; a null title shows the id alone; the detail list wins over the 1.0 map (N-2).
- **Q3, operator ruling 2026-10-04.** **Prototype panels** (issue Q3, now split by 1.1 sources): (a) Workspace, (b) owned-file badge, (c) per-cycle review text, (d) Mission phase timeline, (e) "Open spec.md".
  Ruling: (a) render the four contract members, drop the path row and the "removed" notice (R-3, R-4); (b) see Q6; (c) drop the inline text, show cycle number, verdict, reviewer, time and an "Open review" action to the artifact; (d) do not render, lane history takes its place, and log the phase timeline as out of scope; (e) render from `artifactReferences.spec`.
- **Q4, operator ruling 2026-10-04.** **Prompt body** (issue Q4; the prompt is now an artifact reference).
  Ruling: An "Open prompt" action from `artifactReferences.prompt` emitting the artifact event; no markdown rendering; the screen neither reads `promptMarkdown` nor needs `includePrompt` (N-3).
- **Q5, operator ruling 2026-10-04.** **Event contract for navigation and artifact links** (new). The issue says `sk-view-artifacts` with the Work Package id; contract 1.1 gives artifact paths; #4 has `sk-open-mission` and `sk-open-missions`.
  Ruling: One `sk-open-artifact` `{ missionId, path, kind }` for spec, prompt and review cycles; no `sk-view-artifacts` on this screen (the shell's Artifacts item covers the listing); `sk-open-pipeline` `{ missionId }` for "Return to Pipeline" and `sk-open-mission` `{ missionId, slug }` for the crumb, collapsed to one event if both route to the Pipeline; `sk-retry-load` `{ missionId, wpId, target }`. All verb-noun. [Superseded in part by P-1, 2026-10-05 (below): the collapse applies, no `sk-open-pipeline` event exists, and "Return to Pipeline" emits `sk-open-mission`.]
- **Q6, operator ruling 2026-10-04.** **Change-state badge** (new; replaces the prototype's `draft`).
  Ruling: Words "changed", "unchanged", "unknown" with tones info, neutral, neutral, never colour-only; when every entry is `unknown` (host without git or worktree) show no per-row badges and one quiet note "Change state unavailable on this host".
- **Q7, operator ruling 2026-10-04.** **Partial and refusal states** (new): `WorkPackage` and `WorkPackageDetail` are two reads.
  Ruling: Keep `status` for the whole screen and add `detailStatus` (`loading`, `ready`, `error`, `not-found`) for the detail regions; a refused detail is a regional notice naming `not_found` or `source_unreadable` in words with a retry, the 1.0 regions stay; only a `WorkPackage` 404 is the whole-screen not-found.
- **Q8, operator ruling 2026-10-04.** **Contract pin** (new): 1.1 is `1.1.0-SNAPSHOT` on spec-kitty#5625, not on `main`.
  Ruling: Vendor from spec-kitty `main` once #5625 merges; if planning must proceed earlier, pin to a recorded commit of the #5625 branch as provisional and re-pin to `main` before the PR, with gate `contract` checking the pin.
- **Q9, operator ruling 2026-10-04.** **Provisional 1.1 parts** (new): `reviewCycles`, `workspace`, `ArtifactKind`, refusal codes.
  Ruling: Consume them as optional regions that hide when the property is omitted (as staleness); an empty array or null member is drawn as defined; the artifact `kind` and refusal `code` are passed through, worded only through `defaults/`.
- **Q10, operator ruling 2026-10-04.** **Actor display** (issue gap 10): the prototype's `claude:opus:implementer-ivan` versus `tool`, `role`, `profile`.
  Ruling: Header badge and Facts row show the non-null handles joined with a colon (matches the prototype look); the Assignment panel shows them as separate rows.
- **Q11, operator ruling 2026-10-04.** **Review panel composition** (new): `review.latestResult` and `override` (1.0) with `reviewCycles` (1.1).
  Ruling: One panel: a summary (latest result, override notice) above the cycle list; show both without reconciling them; when no cycles exist but a latest result does, show the summary alone.
- **Q12, operator ruling 2026-10-04.** **History markers** (new).
  Ruling: "Current" on the newest entry only; no lane-keyed "Complete" marker, since it needs a lane literal; a host-supplied lane-group prop could add one later.

### Operator rulings, 2026-10-05 (the plan squad's forks and the plan's amendment proposals)

The operator ruled on 2026-10-05 on everything the plan-phase squad held: all 14 technical forks and ARCH-010 (A), and the amendments P-1, P-2, P-3, P-4 and P-6 are ACCEPTED exactly as the arbiter recommended (`kitty-specs/work-package-screen-01M44DSJ/reviews/plan.forks.yaml`, `plan.forks2.yaml`, and the "Rulings applied" table in `plan.md`). The drift register DW-1 to DW-30 stays PROPOSED until CP-1 (after the IC-03a spikes), except the items amended below.

- **Amendments to this specification by ruling (operator ruling 2026-10-05).** These read as the requirement text; where they differ from the table rows below, THESE govern.
  - **P-1** FR-003, FR-026, EV-3, EV-4: the Mission crumb and "Return to Pipeline" both emit the one existing event `sk-open-mission` `{ missionId, slug }`; no `sk-open-pipeline` event exists.
  - **P-2** FR-001: no `laneGroups` property.
  - **P-3** FR-001, FR-026: the public surface gains `wpId` (`wp-id`) and `detailRefusalCode` (string or null, no attribute, the detail refusal code `not_found` or `source_unreadable` or an unknown code worded through `defaults/` with raw fallback). Payload rule: the one payload builder takes `wpId`, then `workPackage.wpId`, then `detail.wpId`; a detail whose `wpId` differs from the shown Work Package is treated as omitted; controls that need `missionId` are drawn inert when `mission` is null; one test per branch.
  - **P-4** FR-037: SH-06 and SH-07 are the `app-shell-01M3V82X` stories `MissionWorkPackageSelected1280` and `MissionWorkPackageNoneSelected1280`; they stay untouched (existing shell baselines unchanged). The intent (the screen as shell content) is met by this mission's own WP-01 (selected) and WP-43 (nothing selected) in `shellFrame`.
  - **P-6** DW-24 and FR-029: the header wraps at the one-column threshold of the 800 px prototype breakpoint (stated in container terms, below), not at 620 px; WP-40 is `status` `empty` with no Work Package. WP-46 to WP-48: the tier widths name viewport widths of 1100, 800 and 620 in the shell; the screen's column switch uses container thresholds derived from the shell's real content widths (848 and 688 px, proven by spike S8), so the 1280 stories show the prototype's three columns.
  - **P-7 / DW-7** Frontmatter dependencies are titled pills, plain (not actionable); a dependency is actionable only as a node of the dependency chain. DW-7 is amended accordingly (still confirmed at CP-1 with the register).
  - **DW-30** the panels are the library's `sk-card` with `sk-section-header`: DW-30 becomes "keep" (identical look). A card spike (S9) renders the card beside the prototype `.panel` for CP-1. CP-1 ruling 2026-10-05: the look is kept through a NARROWED E-18 (five properties, `panel-parts.ts` only, sunset spec-kitty-design#516).
- **Exceptions (charter approval), operator ruling 2026-10-05.** E-17 APPROVED (per-file `classOnly` for the styles-only families, each with a leak plant; no `sk-breadcrumbs*` row for `state-parts.ts`). E-18 REJECTED as written; approved only conditionally, narrowed, for whatever gap the card spike S9 proves (token values, `panel-parts.ts`, design-library sunset). E-19 (a) APPROVED conditionally on the Stylelint probe (deleted if the probe passes); E-19 (b) APPROVED. E-20 APPROVED conditionally on spike S6 (otherwise `sk-button`). CP-1 outcome (2026-10-05): E-18 approved NARROWED to five properties (sunset spec-kitty-design#516); E-19 (a) DELETED (the probe passed); E-19 (b) stays; E-20 DROPPED (nodes are `sk-button`); E-17 stands.
- **Technical forks (all accepted as recommended).** CORRECT-003 (a) named omit relaxations; CORRECT-004 (a) shell stories untouched; CORRECT-008 (a) `detailRefusalCode`; CORRECT-012 (a) baselines committed only in IC-09; ARCH-003 (A) IC-03b stubs, wiring and `library-sheets.ts`; ARCH-006 (A) the data-driven gate learns the new words; ARCH-010 (A) `sk-card` panels; ARCH-013 (a') the payload rule above; VISUAL-001 (a) container thresholds derived from real content widths; VISUAL-006 (b) spikes committed under an excluded path and deleted before approval; VISUAL-011 (a) the screen moves focus to its `h1` when the focused control is removed; VISUAL-014 (a) visually hidden text for `not_applicable`; FRESH-002 (a) WP-01 paired with an empty-cycles detail and a review-state agreement assertion, which forces FRESH-001 (b) (WP-29 paired with a Work Package whose `latestResult` is present, plus `detailNoCycles`); FRESH-003 (a) the not-found crumb renderer is written complete by IC-03b in `header-parts.ts`.

### CP-1 operator rulings (2026-10-05)

The operator ruled on 2026-10-05, after the IC-03a spike evidence (`WP03` review PASS; renders, `measurements.json`, accessibility trees and the verbatim Stylelint probe in the CP-1 evidence set), accepting every recommendation. This is the `CP-1 confirmed` entry that the WP04 to WP10 file preconditions look for.

1. **DW-30 and E-18 (panels).** The panels stay `sk-card` plus `sk-section-header`, with a NARROWED E-18 in `panel-parts.ts` only. It restyles exactly five properties, each with a token: border width 1px (`--sk-border-width-1`), radius `--sk-radius-md` (12px), padding `--sk-space-5` (20px), title 18px and weight 700 (title typography tokens), and the title-to-body gap `--sk-space-4` (16px). No other panel chrome property is restyled; no `letter-spacing` literal. Sunset: spec-kitty-design#516 (a compact density for `sk-card`). DW-30 becomes "keep the prototype look via the narrowed E-18" (CONFIRMED).
2. **DW-16 and E-19 gap (Evidence chain).** A native ordered list (`ol`) of `sk-pill-tag` items with `aria-hidden` arrow separators and a layout-only `flex-wrap` (spike variant D). No style exception. The library gap (the library `sk-evidence-chain` cannot fit the column or reproduce the chips) is recorded as spec-kitty-design#517 (a wrapping evidence chain). DW-16 is CONFIRMED in that form; it no longer reads "keep" with `sk-evidence-chain`.
3. **DW-24 (thresholds).** Three columns from content-cell `min-width: 848px` (NOT 805: the prototype's three tracks need 760px plus two 20px gaps plus 24px padding on both sides = 848px, and between 805 and 847px the grid overflows its padding box and the shell scrolls sideways); one column at `max-width: 688px`; two columns between (689 to 847px). This intentionally deviates from the prototype in the band of browser windows of about 1101 to 1143px in the expanded shell tier (content cell 805 to 847px): two columns where the prototype shows three. The header wraps at the same 688px threshold (the prototype's 800px block; an 800px viewport has a cell of 688px). Every statement of 805, 690 or "about 690" in the mission artifacts is replaced (P-6, WP-46 to WP-48, FR-029, DW-24, plan, contracts, research, WP04, WP09). DW-24 is CONFIRMED with these values.
4. **DW-17 and E-20 (dependency nodes).** Nodes are library ghost `sk-button`s carrying three texts (id, title, lane word) wrapped in ONE slot element, stacked vertically in the narrow column, with layout-only `::part(button)` rules (`overflow-wrap`, `text-align`) for long titles where needed (three bare spans become flex items and shatter, so the one wrapper is mandatory). **E-20 is dropped.** DW-17 is CONFIRMED.
5. **DW-10, DW-11, DW-12 (history).** The history timeline is confirmed on the library event-timeline sheet with the "from -> to" summary. The final wording stays tunable at the operator's Storybook review. DW-10, DW-11 and DW-12 are CONFIRMED.
6. **E-19 (a) is DELETED** (the Stylelint probe passed: `@container (min-width: 805px)` and `(max-width: 688px)` raised no error; the only errors were the six `px` track minimums, which are E-19 (b)). E-19 (b) stays APPROVED. E-17 stands.
7. **The other 24 DW items** (DW-1 to DW-9, DW-13 to DW-15, DW-18 to DW-23, DW-25 to DW-29; not rendered by the spikes) are built as the register states them and are confirmed at the operator's Storybook review after the last WP, as on #4. Until then they stay PROPOSED; a difference from the prototype that is in neither the register nor this entry is a REJECT item.
8. **Lesson for WP04 (spike S9).** A stack that is `display: grid` needs `grid-template-columns: minmax(0, 1fr)`, or an unbreakable word widens the whole column (the prototype's `.stack` lacks it). WP04's layout step and exit checks carry it.

Container-query form for WP04: `@container (min-width: 848px)` three columns; `@container (max-width: 688px)` one column; two columns between.

Source of truth for the entry: `tracer-design-decisions.md`, "CP-1 operator rulings (2026-10-05)".

## Contract Basis (1.0 plus 1.1)

The screen reads two payloads of one Work Package. They are two operations and fail independently.

| Payload | Operation | Version | What the screen reads from it |
|---|---|---|---|
| `WorkPackage` | `GET /missions/{missionId}/work-packages/{wpId}` | 1.0 | `wpId`, `title`, `statusLane` (null = no events), `actor` (three handles), `assignment` against `authored`, `phaseLabel`, `executionMode`, `taskType`, `priority`, `mergeTargetBranch`, `trackerRefs`, `lastTransitionAt`, `forceCount`, `implementerOfRecord`, `requirementRefs`, `subtaskProgress` (`done`/`total`), `readiness` (`satisfied`, `unsatisfied`), `readyToStart`, `review.latestResult`, `review.override`, `history[]`, `staleness` (provisional), `cancellation`; `ownedFiles`, `dependencies` and `subtasks` (bare strings, bare ids and an id-to-lane map) are superseded for display by the detail payload |
| `WorkPackageDetail` | `GET /missions/{missionId}/work-packages/{wpId}/detail` | 1.1 | `subtasks[]` (`id`, `title` or null, `statusLane` or null), `dependencies[]` (`wpId`, `title`, `statusLane` or null), `reviewCycles[]` (`cycleNumber`, `reviewedAt` or null, `reviewer` or null, `verdict` or null, `feedbackReference` or null, `artifactPath` or null; provisional), `workspace` (`laneId`, `laneBranch`, `planningBranch`, `worktreePresent`; provisional), `ownedFiles[]` (`pattern`, `isGlob`, `changeState`: `changed`, `unchanged`, `unknown`), `artifactReferences` (`prompt`, `spec`: `{ path, kind }` or null) |

- The Mission, the Work Package and the detail are identified by `missionId` and `wpId`. `WorkPackage` carries no
  `missionId`; the host passes the Mission identity (and name) in. `WorkPackageDetail` carries both.
- **Refusals.** `WorkPackage`: 404 = unknown Mission or Work Package. `WorkPackageDetail`: `not_found` (404: Mission or
  Work Package unknown, id ill-formed, or id known only to the status log) and `source_unreadable` (500: a source of the
  detail could not be read); both are provisional codes. The artifact reads (`listArtifacts`, `getArtifactContent`)
  belong to the Artifacts screen, not to this one: the screen holds artifact references and emits an event; it never
  reads an artifact (the seven artifact refusal codes are therefore out of this screen, see Scope).
- **`ArtifactKind`** (twelve snake_case values, provisional) arrives only inside an `ArtifactReference.kind`; the screen
  passes it through in the event and never branches on it.
- **Provisional parts consumed with care**: `staleness` (1.0), `reviewCycles`, `workspace`, `ArtifactReference.kind`,
  and the detail refusal codes (1.1). Each is optional for the screen: when a host omits it (property absent), its
  region is not drawn; an empty array or a null member is drawn as the contract defines it (FR-018, Q9).
- Contract version at specify time: `1.1.0-SNAPSHOT` on spec-kitty#5625, not on `main`. The pin is ruled (Q8, 2026-10-04): vendor from `main` once #5625 merges; earlier, a recorded commit of the #5625 lane as provisional, re-pinned to `main` before the PR.
- Response schemas are closed. Fixtures are generated from the contract's own examples (FR-033).

## Contract Gaps Re-derived Against 1.1

The issue listed eleven gaps against 1.0. Against 1.0 plus 1.1 together:

| # | Issue gap | 1.1 status | What closes it, and what remains |
|---|---|---|---|
| 1 | Staleness (provisional, prototype has no element) | **Open** | Unchanged by 1.1; still `x-provisional` and null when built from events alone. Look is new (Q1). |
| 2 | Owned-file state ("draft" badge) | **Closed (data), residual R-1** | `OwnedFile.changeState` (`changed`/`unchanged`/`unknown`). R-1: the prototype's word "draft" has no source; the state means "the code lane touched a matching file", and is `unknown` on a host without git or without the lane worktree (Q6). |
| 3 | Per-item review cycles with times | **Closed (data), residual R-2** | `reviewCycles[]` with number, time, reviewer, verdict and a pointer. R-2: the review text ("Human review: ...") is not in the detail; it needs a separate artifact read of `artifactPath` (a host action, Q3c). |
| 4 | Workspace environment | **Closed (data), residuals R-3, R-4** | `workspace` gives code lane, lane branch, planning branch and `worktreePresent`. R-3: a worktree path is deliberately never exposed, so the prototype's "Worktree path" row has no source and stays out. R-4: `worktreePresent: false` means "no worktree on this host" as much as "removed", so the prototype's "Worktree removed" notice cannot be stated (Q3a). |
| 5 | Compact timeline of Mission phases | **Open** | Phases belong to `MissionDetail`; no 1.1 change. The screen shows its own lane history instead (Q3d). |
| 6 | Evidence chain | **Not a gap** | Presentation of data the screen holds. Unchanged. |
| 7 | "Open spec.md" needs a reference | **Closed** | `artifactReferences.spec` (null when absent or not eligible). |
| 8 | Subtask titles | **Closed** | `Subtask.title` (null when the task list gives none) and a per-subtask `statusLane`. |
| 9 | Dependency titles and lanes | **Closed** | `DependencyRef` (`title` never empty: the id stands in; `statusLane` or null). |
| 10 | Actor copy: prototype's three-part string vs contract handles | **Open (presentation)** | Contract carries `tool`, `role`, `profile` as separate handles; display rule is Q10. |
| 11 | Prototype title drift (header vs sidebar) | **Open (decided)** | The screen shows the contract `title` everywhere; the "Evidence" notice that explained the disagreement is dropped (DW-15). |

Summary: 1.1 closes gaps 7, 8 and 9 outright and gaps 2, 3 and 4 as to data source (residuals R-1 to R-4 remain).
Gaps 1, 5, 10 and 11 stay open; gap 6 was never a contract gap.

New gaps and observations found while re-deriving (to be raised on spec-kitty#5528 or #5625 by the orchestrator, not
by this mission; none is invented around):

- **N-1 Mission identity and name are absent from `WorkPackage`.** The host passes `mission` (identity, name, Work
  Package count) in. The breadcrumb, the nothing-selected copy and every event payload need them.
- **N-2 Two payloads overlap.** `ownedFiles`, `dependencies` and `subtasks` exist in both, in different shapes. The
  screen's rule: the detail payload wins for those three lists when present; the `WorkPackage` payload supplies
  everything else (FR-004). When only `WorkPackage` is present the three lists degrade to ids and states.
- **N-3 `promptMarkdown` and `includePrompt` are redundant for this screen.** The prompt is now an artifact
  reference; the screen never needs the prompt body (Q4).
- **N-4 `review.latestResult` (1.0) and `reviewCycles` (1.1) are two views of one history** with no declared link
  beyond the reference string; the screen shows both without reconciling them (Q11).
- **N-5 The detail may be refused while the Work Package reads fine**: the screen needs a regional state for the
  detail (Q7).
- **N-6 Deferred to the next contract major** (not gaps of this screen): an actor on `WorkPackageSummary`, Mission
  staleness, the project branch, lane weights.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read one Work Package at a glance (Priority: P1)

A user selects a Work Package on the Pipeline board or in the Mission sidebar and sees the Work Package screen: a
breadcrumb back to the Mission, the title, a status badge and an actor badge; the facts; the frontmatter (dependencies,
requirement references, priority, execution mode); the lane history; the review; the evidence and dependency chains;
the workspace; and links to the spec and the prompt.

**Why this priority**: this is the Work-Package-level answer to "what is this and where is it".

**Independent Test**: render the populated in-progress story and read the header, every panel and the emitted events.

**Acceptance Scenarios**:

1. **Given** a Work Package in `in_progress` with an actor, part-done subtasks and no review yet, **When** the screen is
   `ready`, **Then** header, facts, frontmatter, owned files, subtasks, lane history, review (empty form), chains,
   workspace and artifact links show, and the review panel says no review is recorded.
2. **Given** the breadcrumb, **When** the user activates the Mission crumb, **Then** the screen emits its Mission-level
   navigation intent and does not navigate.
3. **Given** a Work Package whose lane is a value the screen has never seen, **When** it renders, **Then** the raw
   lane value is shown as its state word, nothing is dropped.

---

### User Story 2 - Follow dependencies and see whether the Work Package can start (Priority: P1)

A user reads the dependency chain: each dependency shows its id, its title and its current lane, and whether the
dependencies are satisfied; activating a dependency opens that Work Package.

**Why this priority**: it is the main way to move across the board without going back to it.

**Independent Test**: render blocked, ready and none; activate a dependency and assert the event.

**Acceptance Scenarios**:

1. **Given** unsatisfied dependencies and `readyToStart` false, **When** rendered, **Then** the blocking dependencies are
   marked unsatisfied with text, not colour alone.
2. **Given** a dependency, **When** the user activates it by pointer or keyboard, **Then** `sk-select-work-package` is
   emitted with the Mission and the dependency's `wpId`.
3. **Given** a dependency with a null lane, **When** rendered, **Then** it shows its id and title and a "not started"
   word, never a blank.

---

### User Story 3 - Read the review history (Priority: P1)

A user sees each review cycle: its number, verdict, reviewer and time, with the changes-requested cycles distinguished
by text and tone; and the latest review result and any override with who, when and why.

**Why this priority**: the review outcome is what decides whether the Work Package is acceptable.

**Independent Test**: render one cycle approved, two cycles (changes requested then approved), none, an unparseable
cycle, a complete override and a partial override.

**Acceptance Scenarios**:

1. **Given** two cycles, **When** rendered, **Then** they list in the order the contract gives (ascending cycle number; the screen never sorts), each with its verdict as
   words and its time; a null `reviewedAt` or `reviewer` shows an absent marker, not a made-up value.
2. **Given** a cycle with a non-null `artifactPath`, **When** the user activates "Open review", **Then**
   `sk-open-artifact` is emitted with that path and the kind `review_cycle`.
3. **Given** a partial override (`complete` false), **When** rendered, **Then** blank members show as absent and a
   notice says the merge gate stays blocked.

---

### User Story 4 - See who is on it, where it runs and what it owns (Priority: P2)

A user reads the assignment (agent, role, profile, version, model, provider, against the authored recommendation),
the workspace (code lane, lane branch, planning branch, worktree present) and the owned files with their change state.

**Why this priority**: it explains the Work Package's footprint.

**Independent Test**: render structured, handle-only and absent actors; each workspace shape; mixed, all-unknown and
empty owned files.

**Acceptance Scenarios**:

1. **Given** an actor with only a tool handle, **When** rendered, **Then** only that handle shows and no empty slot.
2. **Given** owned files with `changed`, `unchanged` and `unknown` states and one glob, **When** rendered, **Then** each
   row shows its pattern and a state word, and the glob is marked as a set of files.
3. **Given** a lane-planning Work Package (`laneBranch` null), **When** rendered, **Then** the branch row is drawn
   with the absent marker (`ABSENT_MARKER`, the same as every other absent value), not an empty value.

---

### User Story 5 - Open the spec and the prompt (Priority: P2)

A user activates "Open spec.md" or "Open prompt" to read those artifacts; the screen emits an event and the host
routes to the Artifact screen.

**Why this priority**: it replaces the prototype's static link and closes the issue's gap 7.

**Independent Test**: render both references present, either null, both null; activate each and assert the payload.

**Acceptance Scenarios**:

1. **Given** both references, **When** the user activates "Open spec.md", **Then** `sk-open-artifact` is emitted with
   `{ missionId, path: 'spec.md', kind: 'spec' }`.
2. **Given** a null reference, **When** rendered, **Then** its action is not drawn (not disabled, not a placeholder).

---

### User Story 6 - Every state keeps the frame, the detail may fail alone (Priority: P2)

A screen that is loading, empty, failed, not found, nothing selected or at a narrow width stays inside the app shell
with the frame unchanged. When only the 1.1 detail is pending or refused, the 1.0 regions still show and the detail
regions say what happened.

**Why this priority**: every screen shows these states; the two-payload design adds a partial one.

**Independent Test**: one story per view state and tier, plus the partial-detail stories.

**Acceptance Scenarios**:

1. **Given** the view state `loading`, `error`, `empty`, `not-found` or `nothing-selected`, **When** rendered, **Then**
   the state's own content replaces the screen content only.
2. **Given** a refused detail (`not_found` or `source_unreadable`), **When** rendered, **Then** the 1.0 regions show and
   the three detail-only regions (review cycles, workspace, artifact links) are replaced by one regional notice
   stating the refusal in words, while subtasks, dependencies and owned files remain in their bare 1.0 form.
3. **Given** the collapsed, narrow or mobile tier, **When** rendered, **Then** the columns collapse as the prototype
   does and nothing overflows horizontally because of the screen.

---

### User Story 7 - The screen follows the data, not the pipeline (Priority: P2)

A later Mission will shape lanes and phases from the charter and doctrine packs. The history timeline, dependency
lanes and subtask lanes render whatever lane values arrive, labelled through one mapping with a raw-value fallback, so
the screen survives that change unmodified.

**Why this priority**: the operator's binding FUTURE CONSTRAINT.

**Independent Test**: render a history of lane values the screen has never seen.

**Acceptance Scenarios**:

1. **Given** history entries with unknown `toStatusLane` values, **When** rendered, **Then** every entry shows, in array
   order, labelled by the label hook or the raw value, with the data-driven gate green.

### Edge Cases

- **`statusLane` null**: no events yet; header badge "not started"; history empty (WP-09); actor three nulls.
- **Unknown lane value** in the header, history, a dependency or a subtask: shown raw, never dropped (research of #4).
- **`staleness` absent (null or property omitted)**: no staleness element at all.
- **Detail omitted by the host** (no `detail` property): the three overlapping lists degrade to ids and states; the
  detail-only regions are not drawn (distinct from an empty array, which says "none").
- **Empty arrays**: `subtasks`, `dependencies`, `reviewCycles`, `ownedFiles` empty each draw a quiet "none" form, not
  hidden panels (the prototype's owned-files empty panel is the analogue). Exception (Q11, FR-014, WP-29): an empty
  `reviewCycles` beside a latest result or an override draws the summary alone and no none-found statement.
- **All-unknown owned files** (host without git or without the lane worktree): not a column of identical "unknown".
- **Brace patterns** in `ownedFiles` are always `unknown`; shown as authored.
- **Redaction markers**: `[path]` and `[email]` inside titles are shown verbatim (the contract redacted them).
- **A subtask title that is null**: the subtask id alone; a dependency title is never empty (the id stands in).
- **Two files hold one WP id**: the contract picks one; the screen shows what it was given.
- **Long text**: a very long title, reason, reference, file path, branch or handle wraps between words, never
  mid-word (a single over-long word ellipsizes with the full text as the accessible name and a title tooltip), as
  ruled in #4 (Q2 ruling). A 40-subtask list and a 60-entry history scroll inside the page, never overflow it.
- **Large text**: at a root font size of 200% the panels reflow without horizontal overflow caused by the screen.
- **Force count above 0**: shown as a fact with text; a forced transition in the history is marked "forced" in words.
- **Override complete and latest result present together**: both shown; neither suppresses the other.
- **Canceled**: the lane word and tone come from the defaults; `cancellation.reason` null and a synthetic
  `reasonSource` are both drawn without a made-up reason.
- **Incoming selection**: an `sk-select-work-package` from the board or tree is a host matter; the screen never
  re-emits it.

## State Matrix and Acceptance

Each row is one Storybook story and one visual baseline: dark theme, 1280 px unless the row names a tier, synthetic
fixtures, rendered inside the mission shell. "Prototype source" names the prototype element (`?wp=WP03`, `?wp=WP04`,
`?wp=WP01`, `?state=unselected` of `04-work-package.html`); "None" means the prototype has no such state and the row is
built from the named analogue, with the drift listed in the Visual Drift Register. Rows marked **(1.1)** are new or
reworked against contract 1.1.

| ID | State | Prototype source | Pass condition (Given / When / Then) | Event asserted |
|---|---|---|---|---|
| WP-01 | Populated, `in_progress`, actor present, subtasks part done, no review yet | `?wp=WP03`: header badges, facts, evidence chain | Given that Work Package; Then header, facts, frontmatter, lane history, chains, workspace and links show; the Review panel shows the empty summary form ("No review outcome recorded") and the none-found cycles statement (empty `reviewCycles`) | none |
| WP-02 | Review state none (`latestResult` null, `override` null, no cycles), lane `for_review` | None; WP-01 layout, review panel empty (prototype row "Not reached / No review outcome recorded") | Then the review panel says no review is recorded in words, and, when the cycles list is empty, that no cycle was found (WP-01 and WP-02 draw both texts and both region ids) | none |
| WP-03 | Review approved: one cycle `approved`, `latestResult` approved, lane `approved` | `?wp=WP04` review cycles "Approved" | Then the cycle shows number, "Approved", reviewer, time; latest result shows the verdict as text | none |
| WP-04 | Review changes requested: cycle `changes_requested` with reference, lane back in `in_progress` | `?wp=WP04` "Changes requested" (danger tone) | Then verdict text "Changes requested" with danger tone (never colour alone) and the reference text | none |
| WP-05 | Override complete (who, when, reason) | None; review panel plus a notice (prototype notice panel) | Then the override notice shows actor, time and reason | none |
| WP-06 | Override partial (`complete` false, blank members absent) | None; same as WP-05 | Then blank members show an absent marker and the notice says the merge gate stays blocked | none |
| WP-07 | Done, full history, all subtasks done | `?wp=WP04` | Then done badge, history through done, subtask bar full | none |
| WP-08 | History: long, with a forced transition, a transition with `reason`, a first transition (`fromStatusLane` null) | `?wp=WP04` lane history | Then each entry shows lane word, time, actor; forced and reason marked in words; first entry has no "from" | none |
| WP-09 | History empty: `statusLane` null, three-null actor | None; prototype empty-state panel | Then "not started" badge, an empty-history form, no actor badge | none |
| WP-10 | Subtasks none (`total` 0, list empty) **(1.1)** | None; owned-files empty panel analogue | Then a quiet "no subtasks" form and no progress bar | none |
| WP-11 | Subtasks some done: titled list with per-subtask lane **(1.1)** | Card subtask bar (#4) plus a list; list form has no prototype (Q2) | Then bar from `subtaskProgress` as given, and each subtask `id`, title, lane word | none |
| WP-12 | Subtask title null and subtask lane null **(1.1)** | None | Then the id alone and a "not started" word, no blank | none |
| WP-13 | Dependencies blocked: `unsatisfied` lists WPs, `readyToStart` false **(1.1)** | `?wp=WP04` dependency chain (`WP01 -> WP04`) | Then titled dependency nodes with lane words, the unsatisfied ones marked in words | activating a node emits `sk-select-work-package` `{ missionId, wpId }` |
| WP-14 | Dependencies ready: `satisfied` true, lane `planned`, `readyToStart` true **(1.1)** | `?wp=WP04` dependency chain | Then dependencies shown as satisfied and a "ready to start" statement | same as WP-13 |
| WP-15 | Dependencies none | None; chain panel empty form | Then a quiet "no dependencies" form | none |
| WP-16 | Dependency with null lane; dependency title is the id **(1.1)** | None | Then id (as title) and "not started" | `sk-select-work-package` |
| WP-17 | Assignment structured: role, profile, version, model, provider (against authored) | `?wp=WP04` header actor badge, facts "Actor" row | Then the assignment rows show; authored never merged with assigned | none |
| WP-18 | Assignment handle only (`tool` set, other two null) | `?wp=WP04` badge `claude:opus` | Then only that handle shows in the badge and rows; no empty slot | none |
| WP-19 | Assignment absent: all null, or redacted actor (three nulls) | `?wp=WP01` "committed source only" actor text (closest analogue) | Then no actor badge and no assignment rows; no placeholder invented | none |
| WP-20 | Staleness `stale` (minutes since commit) | None (Q1) | Then a badge "stale" with minutes and a reason in words | none |
| WP-21 | Staleness `fresh`, and `not_applicable` with a reason | None | Then a quiet fact row for `fresh`; nothing visible for `not_applicable`, whose status and reason are visually hidden text in the Facts panel ("Staleness: not applicable, <reason>") | none |
| WP-22 | Staleness absent (null or omitted) | None; the prototype has none, so also the default look | Then no staleness element is drawn | none |
| WP-23 | Canceled with an operator reason | None; header badge plus a notice | Then canceled badge (word and tone from `defaults/lanes.ts`) and the reason | none |
| WP-24 | Canceled with a synthetic reason, and with a null reason | None | Then the reason source in words; null reason shows no made-up text | none |
| WP-25 | Owned files mixed: `changed`, `unchanged`, `unknown`, one glob **(1.1)** | `?wp=WP04` file list (draft badge, Q6) | Then each row has pattern and state word; the glob marked as a set | none |
| WP-26 | Owned files all `unknown` (host without git or worktree) **(1.1)** | None | Then no per-row badges and one quiet note that change state is unavailable on this host (Q6) | none |
| WP-27 | Owned files none **(1.1)** | `?wp=WP03` owned-files empty panel | Then the empty-state form | none |
| WP-28 | Review cycles: two cycles, changes requested then approved **(1.1)** | `?wp=WP04` review cycles | Then the cycles in the order the contract gives (ascending cycle number; no screen sort), verdict words, reviewer, times; "Open review" on each cycle with a path | "Open review" emits `sk-open-artifact` `{ missionId, path, kind: 'review_cycle' }` |
| WP-29 | Review cycles none (empty list) with a latest result present **(1.1)** | None | Then the panel shows the summary alone (Q11): no cycle rows and no none-found statement (the none-found wording belongs to WP-01 and WP-02, where no latest result exists) | none |
| WP-30 | Review cycle unparseable: `reviewedAt` and `reviewer` null; and a cycle with null `artifactPath` **(1.1)** | None | Then absent markers for the nulls; no "Open review" for the null path | none |
| WP-31 | Workspace populated: code lane, lane branch, planning branch, worktree present **(1.1)** | `?wp=WP04` workspace panel (path and "removed" notice dropped, Q3a) | Then four rows with words; "worktree present" yes | none |
| WP-32 | Workspace: `worktreePresent` false **(1.1)** | `?wp=WP04` "Worktree removed" notice (not derivable, R-4) | Then "worktree present: no" in words and no claim that it was removed | none |
| WP-33 | Workspace: lane-planning (`laneBranch` null) and all-null (no lanes) **(1.1)** | None | Then each null member is a row showing `ABSENT_MARKER` (the panel is drawn for an all-null workspace); code lane never confused with a status lane | none |
| WP-34 | Artifact links: spec and prompt both present **(1.1)** | `?wp=WP03` "Open spec.md →" | Then "Open spec.md" and "Open prompt" show | each emits `sk-open-artifact` `{ missionId, path, kind }` |
| WP-35 | Artifact links: prompt null, spec null, both null **(1.1)** | None | Then only the present action shows; none when both null | none |
| WP-36 | Detail refused: `not_found`, and `source_unreadable`, with the 1.0 payload fine **(1.1)** | None; #4 notice look | Then the 1.0 regions show and the detail regions are one regional notice naming the refusal in words | retry emits `sk-retry-load` `{ missionId, wpId, target: 'detail' }` |
| WP-37 | Detail pending: 1.0 payload ready, detail loading **(1.1)** | None; #4 loading panel look | Then the 1.0 regions show and the detail regions show a busy indicator | none |
| WP-38 | Facts with every optional value null (`executionMode`, `priority`, `mergeTargetBranch`, `phaseLabel`, `trackerRefs` empty, `implementerOfRecord` null) | `?wp=WP03` facts panel, rows hidden when absent | Then absent rows are not drawn | none |
| WP-39 | Loading | Prototype `?state=loading` panel look as #4's loading panels (04 has none) | Then a busy indicator in the frame under the page header, no panels (the page header band keeps its frame with the breadcrumb and an `h1`, no title and no badges: #4 D-33 precedent, DW-27) | none |
| WP-40 | Empty (`status` `empty`: no Work Package to show) | `?wp=WP03` owned-files empty panel | Then the frame and a neutral empty form | none |
| WP-41 | Error (host-neutral copy, as DR-5 of #4) | Prototype `?state=error` look as #4 | Then an alert notice, no panels | retry emits `sk-retry-load` `{ missionId, wpId, target: 'work-package' }` |
| WP-42 | Not found: 404 with "Return to Pipeline" | `?wp=WP01` and `?wp=WP02` "Task detail unavailable" | Then header with crumb and id only and the unavailable panel with the action | "Return to Pipeline" emits `sk-open-mission` `{ missionId, slug }` |
| WP-43 | Nothing selected: the Mission has N Work Packages, "Choose a Work Package" | `?state=unselected` | Then eyebrow, heading, Mission slug and the count | none |
| WP-44 | Long texts: title, reason, reference, file paths, branches, handles; 40-subtask list; 60-entry history | None; words-only wrapping and ellipsis from #4 | Then no mid-word wrap, no horizontal overflow of the page | none |
| WP-45 | Unknown lane values in history, dependency lane and subtask lane | None; data-driven constraint | Then raw values shown, in order, nothing dropped | none |
| WP-46 | Viewport 1100 px (the shell's content cell is about 804 px) | Prototype breakpoint 1100 px: two columns, third stack spans below in two sub-columns (the screen's two-column band is content cell 689 to 847 px, so 804 px is inside it) | Then the two-column layout and the third stack spanning (the column switch follows the content width, not the viewport) | none |
| WP-47 | Viewport 800 px (content cell about 688 px, the one-column threshold `max-width: 688px`) | Prototype breakpoint 800 px: one column | Then one column, header wraps | none |
| WP-48 | Viewport 620 px (and below) | Prototype breakpoint 620 px (no further rule for this screen) | Then single column, header wraps, timeline readable | none |
| WP-49 | Focus order and focus ring: tab stops tagged like `tab-12` and `tab-19` in #4 | None; rules from #4 | Then every control reachable in documented order with a visible ring | none |
| WP-50 | Redaction markers (`[path]`, `[email]`) in subtask and dependency titles **(1.1)** | None | Then markers shown verbatim, not parsed | none |

Sum of rows: 50 (WP-01 to WP-50). The issue's own matrix had 34 rows (WP-01 to WP-34); 1.1 reworks the subtask and
dependency rows (now titled) and adds the owned-files, review-cycle, workspace, artifact-link, partial-detail and
redaction rows.

### Event interaction checks

Event names follow the operator's verb-noun ruling from #4 (`sk-open-mission`); names marked "proposed" are resolved at
plan (Q5). Every event bubbles and is composed, is declared once with `@fires` and is typed.

| Check | Trigger | Asserted event and payload |
|---|---|---|
| EV-1 | Activate a dependency | `sk-select-work-package`, `{ missionId, wpId }` (the dependency's id) |
| EV-2 | Incoming `sk-select-work-package` from the board or tree | none re-emitted (the host handles it; asserted with a positive control) |
| EV-3 | "Return to Pipeline" (not-found state) | `sk-open-mission`, `{ missionId, slug }` (the same event as EV-4; no `sk-open-pipeline`, P-1) |
| EV-4 | Breadcrumb Mission crumb | `sk-open-mission`, `{ missionId, slug }` (the Mission-level event of #4; shared with EV-3, P-1) |
| EV-5 | "Open spec.md" / "Open prompt" | `sk-open-artifact`, `{ missionId, path, kind }` (name ruled at Q5, final in the plan) |
| EV-6 | "Open review" on a review cycle | `sk-open-artifact`, `{ missionId, path, kind: 'review_cycle' }` |
| EV-7 | Retry on `error` and on a refused detail | `sk-retry-load`, `{ missionId, wpId, target }` (name final in the plan) |
| EV-8 | Every state-only interaction (focus, scroll) | none |

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | User Story | Priority | Status | Delivery | No-op passable? |
|----|-------|------------|----------|--------|----------|-----------------|
| FR-001 | Element and public surface | As a host, I want one element `sk-work-package-screen` taking the `WorkPackage` (1.0) as `workPackage`, the `WorkPackageDetail` (1.1) as `detail`, the Mission as `mission` (identity, name, Work Package count), `status`, `detailStatus`, `detailRefusalCode`, `wpId`, `now`, `labels` and `errorMessage` (ten properties; no `laneGroups`), so that I pass contract-shaped data and nothing else. | High | Open | [build] | no |
| FR-002 | Header | As a user, I want a breadcrumb "Mission name / WP id", the title, a status badge and an actor badge, so that I know which Work Package this is. The status word and tone come from the lane defaults; the actor badge is absent when all three handles are null. | High | Open | [build] | no |
| FR-003 | Mission-level navigation | As a host, I want the breadcrumb Mission crumb to emit the navigation intent `sk-open-mission` (EV-4, the same event as "Return to Pipeline", EV-3), so that I route; the screen never navigates. | High | Open | [build] | no |
| FR-004 | One source per list | As a user, I want the detail payload's subtasks, dependencies and owned files to win over the `WorkPackage` payload's bare forms when the detail is present, and the bare forms to degrade to ids and states when it is not, so that the two payloads never show two lists. | High | Open | [build] | no |
| FR-005 | Facts | As a user, I want a Facts panel with Work Package, committed state (the status lane word and tone of the header badge; "not started" for a null lane), actor, target branch (`mergeTargetBranch`) and, when present, phase label, task type, tracker refs, last transition, force count and implementer of record, so that I see the resolved facts. Absent values draw no row. | High | Open | [build] | no |
| FR-006 | Assignment | As a user, I want the assignment (agent, assignee, role, profile, version, model, provider) shown separately from the authored recommendation (role, profile, model), never merged, so that I can tell planned from actual. | Medium | Open | [build] | no |
| FR-007 | Frontmatter | As a user, I want a Frontmatter panel with dependencies, requirement references, priority and execution mode, so that I see the authored plan. | Medium | Open | [build] | no |
| FR-008 | Subtasks | As a user, I want a subtask panel with a progress bar from `subtaskProgress` as given (hidden when `total` is 0) and a semantic list of subtask id, title and lane word, a null title showing the id alone, so that I know the work remaining. | High | Open | [build] | no |
| FR-009 | Dependency chain and readiness | As a user, I want dependencies as chain nodes with id, title and lane word, the readiness stated in words (`satisfied`, `unsatisfied` ids, `readyToStart`), each node an actionable control emitting `sk-select-work-package` (EV-1). Readiness words have three cases: `satisfied` false shows the blocked text with the unsatisfied ids; `readyToStart` true shows the satisfied and ready texts; `satisfied` true with `readyToStart` false (a started or finished Work Package) shows the satisfied text alone, never the ready or blocked text. | High | Open | [build] | no |
| FR-010 | Owned files | As a user, I want each owned file's pattern, a glob marker and its change state in words, with an all-unknown list collapsed to one quiet note, so that I see what the Work Package touches. | Medium | Open | [build] | no |
| FR-011 | Lane history | As a user, I want the `history` as a semantic ordered list, each entry with the lane word (or the raw value), time, actor, a "forced" marker in words, the reason and the review verdict as text, the first entry without a "from", so that I can read how the Work Package moved. It renders any `toStatusLane` value, in array order. | High | Open | [build] | no |
| FR-012 | History markers | As a user, I want the newest entry marked "Current" and no other lane-keyed marker, so that no lane literal enters the screen (DW-11, Q12 ruled 2026-10-04). | Medium | Open | [build] | no |
| FR-013 | Review panel | As a user, I want one review panel showing the latest result (reviewer, verdict, reference as text), any override (complete or partial, with who, when, why, and the merge-gate-stays-blocked notice for partial), and the review cycles (FR-014), the verdict never colour-only. | High | Open | [build] | no |
| FR-014 | Review cycles | As a user, I want each cycle with number, verdict, reviewer and time, listed in the order the contract gives (ascending cycle number; the screen never sorts), a null time or reviewer shown as absent, an empty list stating that none was found on the primary planning surface (only when no latest result and no override is present: with a latest result or an override and no cycles the panel shows the summary alone, Q11, and draws no none-found statement), and an "Open review" action only when `artifactPath` is non-null (EV-6). | High | Open | [build] | no |
| FR-015 | Workspace | As a user, I want the workspace's code lane, lane branch, planning branch and "worktree present" in words, each null member shown with the absent marker (`ABSENT_MARKER`), with no path and no claim that a worktree was removed, so that I read only what the contract states. | Medium | Open | [build] | no |
| FR-016 | Artifact links | As a user, I want "Open spec.md" and "Open prompt" from `artifactReferences`, each only when non-null, emitting `sk-open-artifact` (EV-5), so that I can read them in the Artifact screen. The screen never renders markdown and never reads an artifact. | High | Open | [build] | no |
| FR-017 | Evidence chain | As a user, I want the chain Mission, Work Package, state as in the prototype, so that the position of the Work Package is explicit. | Low | Open | [build] | no |
| FR-018 | Optional and provisional regions | As a host, I want a region fed by an omitted provisional property (`staleness`, `reviewCycles`, `workspace`) not to be drawn, distinct from an empty or null value that the contract defines, so that a host that lacks a part still renders. | High | Open | [build] | no |
| FR-019 | Staleness | As a user, I want staleness shown as the operator confirms (Q1): a header badge with minutes since commit when `stale`, a quiet fact row for `fresh`, nothing visible for `not_applicable` or absent (a `not_applicable` status carries visually hidden text in the Facts panel, NFR-011). | Medium | Open | [build] | no |
| FR-020 | Canceled | As a user, I want a canceled Work Package to show the lane word and tone from the defaults and a notice with the cancellation reason and its source, a null reason drawing no made-up text. | Medium | Open | [build] | no |
| FR-021 | No events yet | As a user, I want a Work Package with `statusLane` null to show a "not started" badge, an empty-history form and no actor, so that a fresh Work Package is not an error. | High | Open | [build] | no |
| FR-022 | Relative time | As a user, I want times as relative text computed from a host-passed `now` or a label hook, with an ISO fallback, so that the screen needs no clock. | Medium | Open | [build] | no |
| FR-023 | Data-driven vocabulary | As a host, I want every lane word, lane tone, change-state word, verdict word and refusal word to come from `src/defaults/` or the `labels` prop with a raw-value fallback, the artifact kind to pass through unbranched, and the history, dependency and subtask lanes to render any value, so that a dynamic pipeline needs different props only. | High | Open | [build] | no |
| FR-024 | Detail regional states | As a user, I want `detailStatus` (`loading`, `ready`, `error`, `not-found`) to govern only the detail regions, a refused detail replacing them with one regional notice stating `not_found` or `source_unreadable` in words with a retry, while the 1.0 regions stay (Q7). | High | Open | [build] | no |
| FR-025 | Whole-screen states | As a user, I want `status` (`loading`, `error`, `empty`, `ready`, `not-found`, `nothing-selected`) to render the state's own content in the frame, with the #4 panel look and host-neutral copy; `loading` shows a busy indicator in the frame under the page header band (data-less: breadcrumb and `h1`, no panels; #4 D-33 precedent, DW-27). | High | Open | [build] | no |
| FR-026 | Not found | As a user, I want a 404 Work Package to show "Task detail unavailable" and a "Return to Pipeline" action that emits `sk-open-mission` (EV-3), the header showing the crumb and id only (the id comes from `wpId`). | High | Open | [build] | no |
| FR-027 | Nothing selected | As a user, I want "Choose a Work Package" with the Mission slug and "N Work Packages" from the host `mission` prop. | High | Open | [build] | no |
| FR-028 | View-state contract | As a developer, I want `status` to extend the charter's four states with the screen's own `not-found` and `nothing-selected`, declared in the manifest, so that each is a story. | Medium | Open | [build] | no |
| FR-029 | Responsive columns | As a user, I want the prototype's three columns at the 1280 px viewport, two at 1100 px with the third spanning in two sub-columns, one at 800 px, the header wrapping at the one-column threshold (the prototype's 800 px block, not 620 px), the switches made by container thresholds of 848 and 688 px derived from the shell's real content widths, so that the screen works at every tier while the shell owns the tier change. | High | Open | [build] | no |
| FR-030 | Keyboard and focus | As a keyboard user, I want every control (crumb, dependency nodes, artifact links, review links, retry, return) reachable by Tab and operable by Enter and Space with a visible focus ring, no trap and a documented focus order tagged like `tab-12` and `tab-19`. | High | Open | [build] | no |
| FR-031 | Accessible semantics | As a user of assistive technology, I want semantic lists for history, subtasks, cycles, files and dependencies, text for verdict, override, force, staleness and change state (never colour alone), a polite live region for loading, ready, not-found and detail changes (the assertive alert notice announces errors), and a labelled progress indicator for the subtask bar. | High | Open | [build] | no |
| FR-032 | Typed properties and events | As a developer, I want every public property and event declared in the custom-elements manifest, typed from the generated contract types, the public surface frozen once the skeleton lands, with `manifest:check` green. | High | Open | [build] | no |
| FR-033 | Contract-derived fixtures | As a reviewer, I want fixtures generated from the 1.0 examples (`populated`, `with-prompt`, `provisional`, `no-events`, `actor-structured`, `actor-handle`, `actor-redacted`, `canceled`, `override`, `override-partial`) and the 1.1 examples (`populated`, `no-cycles`, `null-workspace`, `planning-lane`, `unknown-change-state`, `unparseable-cycle`, and both refusals), plus named overlays only for states they lack, contract-valid and free of paths and usernames. | High | Open | [build] | no |
| FR-034 | Quality gates | As a reviewer, I want ESLint (`data-driven`, `no-io`), Stylelint (token-only), typecheck, Storybook build, unit and interaction tests, `contract`, `manifest` and gate-proof green. | High | Open | [build] | yes: paired with gate-proof plants (a fetch call, a raw colour, a lane literal, a missing manifest event) |
| FR-035 | Interaction tests | As a reviewer, I want tests asserting every event and payload of EV-1 to EV-8, including that an incoming selection is not re-emitted, with positive controls. | High | Open | [build] | no |
| FR-036 | State matrix as stories and baselines | As a reviewer, I want every row of the state matrix as a story with an approved dark-theme baseline in the shell, and the visual review side by side against the prototype per row and tier. | High | Open | [build] | no |
| FR-037 | Shell wiring | As a reviewer, I want the shell's SH-06 and SH-07 stories (`app-shell-01M3V82X`: Work Packages current, one selected or nothing selected) left untouched with their baselines unchanged, and the screen shown as shell content by this mission's own WP-01 (selected) and WP-43 (nothing selected) in `shellFrame`, using the shell's `flush` option. | Medium | Open | [build] | no |
| FR-038 | Elements over CSS and recorded gaps | As a maintainer, I want every library primitive rendered with its element, project CSS layout-only with `--sk-*` tokens, and a missing primitive recorded as a component gap; any local override is a numbered exception continuing the E-xx list in `contracts/gates.md` with scope, rationale and a design-library sunset. | High | Open | [build] | no |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | Typecheck, ESLint, Stylelint, `no-io`, `data-driven`, `contract`, `manifest`, hygiene, Storybook build, unit and interaction tests and gate-proof pass with 0 findings on the pull request. | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline of the state matrix gives 0 visual failures across 5 consecutive runs on an unchanged commit, at the tiers each row names. | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of interactive controls are reachable and operable by keyboard alone in every tier, in no more tab stops than controls shown; a scrolling region counts as a control. | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200% the screen causes no horizontal overflow of the content area at 1100 px and 720 px. | Accessibility | Medium | Open |
| NFR-005 | No I/O | The no-io gate reports 0 violations: no fetch, XHR, WebSocket, Tauri API, browser storage, timer, `Date.now()` or navigation in the screen or its parts. | Security | High | Open |
| NFR-006 | Render responsiveness | With a 40-subtask list, a 60-entry history and 100 owned files, the screen renders and re-renders on a property change in 200 ms or less in the interaction test environment. | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address or the executing account's username; actors only from the `SYNTHETIC_ACTORS` allow-list, checked by the hygiene and `contract` gates. | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences from the prototype in the side-by-side review of each baseline; any drift not in the confirmed Visual Drift Register is a REJECT. | Quality | High | Open |
| NFR-009 | Data-driven gate extended | The `data-driven` gate, extended in IC-02 for verdict, change-state and staleness words (ARCH-006 (A)), reports 0 violations: no lane or phase literal outside `defaults/` and no view-type field named like a lane or phase; the new vocabularies (change state, verdict, refusal code) live in `defaults/` or the `labels` prop; refusal codes and `ArtifactKind` are not read by the gate and are covered by the self-check list and the foreign-value tests. | Quality | High | Open |
| NFR-010 | Contract gate covers 1.1 | The `contract` gate reports 0 findings with the vendored 1.1 contract: pin equal, generated types and fixtures fresh, every 1.1 example used as a fixture is producible by the contract. | Quality | High | Open |
| NFR-011 | Text never colour-only | 100% of statuses (lane, verdict, override, force, staleness, change state, readiness, refusal) carry a text form in the DOM. | Accessibility | High | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the Mission Status contract; view state in as a property; intent out as `sk-*` CustomEvents that bubble and are composed; no I/O (charter, "The screen contract"). | Technical | High | Open |
| C-002 | Contract basis | Types are generated from the vendored Mission Status contract (1.0 plus the 1.1 slice) at a recorded pin; response schemas are closed; provisional parts are consumed as optional (Q8, Q9). | Technical | High | Open |
| C-003 | Read-only | The screen performs no write: no move lane, claim, approve or override. A retry event asks the host to read again. | Product | High | Open |
| C-004 | No arithmetic | The screen does no arithmetic on contract values: subtask progress and counts are shown as given; a whole-percent display, if any, follows the #4 ruling (display formatting only). | Product | High | Open |
| C-005 | Elements over CSS | As FR-038 and the charter: layout CSS only with tokens; missing primitives are component gaps; temporary stand-ins are numbered exceptions. | Technical | High | Open |
| C-006 | Prototype is the visual authority | `04-work-package.html` (and `05-artifact.html` for the links) is the visual source of truth; only confirmed drift is allowed. | Design | High | Open |
| C-007 | Data-driven pipeline | See "The dynamic-pipeline constraint". | Technical | High | Open |
| C-008 | Fixtures and risk boundaries | Synthetic fixtures: no real user data, absolute paths, usernames or secrets (charter, "Risk boundaries"). No worktree path is ever shown. | Security | High | Open |
| C-009 | Terminology | "Mission" everywhere, never "feature"; "status lane" and "code lane" kept distinct. | Product | Medium | Open |
| C-010 | Shell dependency | The screen renders inside the app shell (`sk-mission-shell`, with its `flush` option); the shell owns the top bar, rail, sidebar (including the Work Packages tree), tiers and skip link. | Scope | High | Open |
| C-011 | Review and governance | Pull request into `main`; the operator merges; every work package is reviewed by a separate reviewer agent; the adversarial squad runs after the plan phase only (charter; this governs the design phases, and the aggregate review squad before the pull request is the operator's standing wrap-up rule, as in #4: `plan.md`, "PR shape and wrap-up"); the operator reviews Storybook after the last work package and before wrap-up. | Governance | High | Open |
| C-012 | Stacking | This mission builds on mission-ui#4 (not merged at specify time): it starts once #4 lands or stacks on its branch, reusing the shell, `sk-work-package-board`, `defaults/`, the vendored contract, the gates and the exception approach. | Scope | High | Open |

### Key Entities *(include if the mission involves data)*

- **Work Package (1.0)**: identity, title, resolved state (`statusLane` or null), actor (three handles), assignment against
  authored, facts, readiness, review, history, staleness, cancellation. Carries no Mission identity.
- **Work Package detail (1.1)**: `missionId`, `wpId`, subtasks (id, title, lane), dependencies (id, title, lane), review
  cycles, workspace, owned files with change state, artifact references.
- **Subtask**: `id`, `title` (nullable), `statusLane` (nullable).
- **Dependency reference**: `wpId`, `title` (never empty), `statusLane` (nullable).
- **Review cycle**: `cycleNumber`, `reviewedAt` (nullable), `reviewer` (nullable), `verdict` (`approved`,
  `changes_requested`, or null), `feedbackReference` (nullable), `artifactPath` (nullable).
- **Workspace**: `laneId`, `laneBranch`, `planningBranch` (each nullable), `worktreePresent`.
- **Owned file**: `pattern`, `isGlob`, `changeState` (`changed`, `unchanged`, `unknown`).
- **Artifact reference**: `path`, `kind` (twelve provisional values).
- **Mission (host prop)**: `missionId`, `slug`, name, Work Package count.
- **View state**: `status` (`loading`, `error`, `empty`, `ready`, `not-found`, `nothing-selected`) and `detailStatus`
  (`loading`, `ready`, `error`, `not-found`).
- **Intent events**: `sk-select-work-package`, `sk-open-mission`, `sk-open-artifact`,
  `sk-retry-load` (names per Q5 and P-1; no `sk-open-pipeline`).

## Visual Drift Register (CP-1 held 2026-10-05: seven items confirmed, 24 confirmed at the Storybook review)

Every prototype element against what the screen will show. Each item is PROPOSED drift until the operator confirms it: the seven spike-rendered items were confirmed at CP-1 (2026-10-05, marked CONFIRMED below), the other 24 are confirmed at the operator's Storybook review after the last WP, as in #4. A difference from the prototype that is in neither the register nor the CP-1 rulings is a
REJECT in review. #4's confirmed rulings apply as precedents: card state words (DR-2), host-neutral error copy
(DR-5), whole-percent display, words-only wrapping, the page header (N-1, N-2) and numbered exceptions. #4's flat-panel precedent (N-4) and its panel chrome via exceptions do NOT apply: the
panels are the library's `sk-card` with `sk-section-header` (DW-30 "keep", ARCH-010 (A)).

| ID | Prototype element | What the screen shows | Proposed ruling |
|----|-------------------|-----------------------|-----------------|
| DW-1 | Breadcrumb: Mission name (link to Pipeline), "/", WP id | Same; the Mission name comes from the host `mission` prop; the crumb emits EV-4 | keep (identical look) |
| DW-2 | Title "Implement dark mode toggle in preferences" in the header, "Repair lane guard" in the sidebar | The contract `title` everywhere; the disagreement cannot occur | confirm (copy drift removed) |
| DW-3 | Header status badge words `coding`, `done`, `detail unavailable`, `selection required` | Words from `defaults/lanes.ts` STATE_BADGES (queued, claimed, coding, review, reviewing, approved, done, blocked, canceled; "not started" for null); no badge in not-found and nothing-selected | confirm (#4 DR-2 precedent) |
| DW-4 | Header actor badge as one string (`spec-kitty`, `claude:opus:implementer-ivan`); "committed source only"; "4 Work Packages" | The non-null handles joined with a colon (Q10); no badge when all three are null; no placeholder text | confirm per Q10 |
| DW-5 | (none) staleness | A header badge "stale, N min since last commit" when stale; a quiet fact row for fresh; nothing otherwise | new element, confirm per Q1 |
| DW-6 | Facts panel: Work Package, Committed state, Actor, Target branch | Same four rows (Committed state shows the status lane word and tone of the header badge, the contract's `statusLane`; "not started" for null) plus phase label, task type, tracker refs, last transition, force count, implementer of record, each only when present | confirm (additive rows) |
| DW-7 | Frontmatter panel (WP04 only): Dependencies badge, Requirement refs badge, Priority, Execution mode | The panel on every Work Package; dependencies as titled pills, plain and not actionable (operator ruling 2026-10-05, P-7: a dependency is actionable only as a node of the dependency chain); requirement refs as pills; priority and execution mode as rows, each only when present | confirm |
| DW-8 | Owned files: a list of file rows with a `draft` badge; empty copy "No committed file list is surfaced in the approved source." | Rows with the pattern and a change-state word (changed, unchanged, unknown) in place of `draft`; a glob marker; all-unknown collapsed to one note; empty copy "No owned files declared" (host-neutral) | confirm per Q6 (word drift) |
| DW-9 | WP03 panel "Compact event timeline" of Mission phases (Specify, Plan, Tasks, Implement, Review) | Dropped. Always the panel "Lane history" (WP04's) fed by `history[]` | confirm per Q3d |
| DW-10 | Lane history entry: lane word, optional "claimed by <actor>" or "3 files modified", clock time | Lane word (or raw value) with the "from -> to" summary, time, actor, "forced" in words, reason, verdict as text; "N files modified" dropped (no source); on the library event-timeline sheet | CONFIRMED at CP-1 (2026-10-05); wording tunable at the Storybook review |
| DW-11 | Markers: "Current" on in-progress, "Complete" on approved and done | "Current" on the newest entry only; no lane-keyed "Complete" marker (it would need a lane literal) | CONFIRMED at CP-1 (2026-10-05) per Q12 |
| DW-12 | Times as clock time (`10:42:01`, `11:15:00`) | Relative time from `now` or the label hook, ISO fallback | CONFIRMED at CP-1 (2026-10-05); as #4 FR-010 |
| DW-13 | Review cycles: "Changes requested" (danger text), time, "Human review: <text>"; "Approved", time | Cycle number, verdict as words with tone, reviewer, time; no inline review text; an "Open review" action when `artifactPath` is non-null | confirm per Q3c (text dropped, link added) |
| DW-14 | (none) latest review result and override | A summary above the cycle list: latest result (reviewer, verdict, reference), override notice (complete or partial) | new element, confirm per Q11 |
| DW-15 | "Evidence" notice explaining the title disagreement | Dropped (nothing to explain) | confirm |
| DW-16 | Evidence chain Mission, WP03, coding | Mission, Work Package, state word from defaults, as a native ordered list of `sk-pill-tag` items with `aria-hidden` arrow separators and a layout-only `flex-wrap` (spike variant D; rounded pills, no connector rule); no style exception; library gap spec-kitty-design#517 (a wrapping evidence chain) | CONFIRMED at CP-1 (2026-10-05) in this form |
| DW-17 | Dependency chain `WP01 -> WP04` (one dependency) | The Work Package with its dependencies as a list of library ghost `sk-button` nodes, each with id, title and lane word wrapped in ONE slot element, stacked vertically in the narrow column (layout-only `::part(button)` rules for long titles); readiness in words; no E-20 | CONFIRMED at CP-1 (2026-10-05) |
| DW-18 | Workspace panel: Worktree path, Branch, "Worktree removed" notice | Code lane, lane branch, planning branch, worktree present (yes or no). Path and notice dropped (R-3, R-4) | confirm per Q3a |
| DW-19 | "Open spec.md →" quiet button | Same look, shown when `artifactReferences.spec` is non-null; plus "Open prompt →" | confirm |
| DW-20 | (none) subtasks | A panel: progress bar (as given; hidden at total 0) and a list of id, title, lane word | new element, confirm per Q2 |
| DW-21 | (none) assignment | A panel: agent, assignee, role, profile and version, model, provider, against the authored recommendation | new element, confirm |
| DW-22 | (none) cancellation and override notices | Notices in the library notice look | new element, confirm |
| DW-23 | WP03 and WP04 place different panels in three stacks | One placement: col 1 Facts, Assignment, Frontmatter, Owned files; col 2 Lane history, Review; col 3 Evidence chain, Dependency chain, Subtasks, Workspace, artifact links (proposed; the order is for the operator to settle at CP-1) | confirm placement |
| DW-24 | Grid 3 columns; 2 at 1100 px with the third spanning in two sub-columns; 1 at 800 px; header wraps in the 800 px block | The same behaviour per viewport tier, switched by container thresholds on the content cell: three columns from `min-width: 848px`, one column at `max-width: 688px`, two between (derived from the shell's real content widths and proven by spike S8; 848px, not 805px, so the grid never overflows sideways; this intentionally differs from the prototype in the browser-window band of about 1101 to 1143px, where the screen shows two columns), so the 1280 stories show three columns; the header wraps at the one-column threshold (the prototype's 800 px block; its 620 px block has no header rule) | CONFIRMED at CP-1 (2026-10-05): fidelity except the 1101 to 1143px band (VISUAL-001 (a), P-6) |
| DW-25 | `?wp=WP01`: "Task detail unavailable" and the copy "The approved references name this Work Package but do not include a committed detail record." with a title and badge in the header | Header with crumb and id only (a 404 has no title); host-neutral copy; "Return to Pipeline" kept | confirm (copy drift) |
| DW-26 | `?state=unselected`: eyebrow "Mission", "Choose a Work Package", the slug, "contains 4 Work Packages. Select one from the Mission sidebar" | Same shape; the count and slug come from `mission`; the sidebar wording kept only if the host has a sidebar | confirm |
| DW-27 | (04 has no loading or error state) | #4's loading and error panel look and host-neutral copy; in `loading` the data-less header band (breadcrumb and an `h1` carrying the `wpId`, or "Choose a Work Package" when it is empty; no title, no badges) stays above the busy indicator, as #4's D-33 keeps a page header in its frame; `error` and `empty` draw no header | confirm (#4 precedent, D-33) |
| DW-28 | (none) partial detail: pending or refused | One regional notice in place of the detail regions, 1.0 regions untouched | new state, confirm per Q7 |
| DW-29 | Page header typography and band | As the CP-1 rulings N-1 and N-2 of #4 (not full-bleed) | confirm (precedent) |
| DW-30 | Panels: bordered panel cards | The library's `sk-card` (inset where nested) with an `sk-section-header` title: identical look; card spike S9 renders it beside the prototype `.panel` for CP-1; the prototype look is kept through the narrowed E-18 (five properties: border width 1px, radius 12px, padding 20px, title 18px/700, title-to-body gap 16px, all tokens, `panel-parts.ts` only; sunset spec-kitty-design#516) | CONFIRMED at CP-1 (2026-10-05): keep the prototype look via the narrowed E-18 (ARCH-010 (A)) |

Sum of drift-register items: 30 (DW-1 to DW-30).

Note (operator rulings 2026-10-05): DW-7, DW-24 and DW-30 carry the amended text above. CP-1 (2026-10-05) CONFIRMED DW-10, DW-11, DW-12, DW-16, DW-17, DW-24 and DW-30 (the spike-rendered items). The other 24 items (DW-1 to DW-9, DW-13 to DW-15, DW-18 to DW-23, DW-25 to DW-29) were not rendered by the spikes: they stay PROPOSED and are confirmed at the operator's Storybook review after the last WP, as on #4. The precedent list above names "flat panels (N-4)" and "panel chrome via numbered exceptions"; for this mission DW-30 is "keep" (the panels are `sk-card`), so N-4 does not apply to the panels.

## The dynamic-pipeline constraint

Nothing about the pipeline is hard-coded. Lane words, badge tones, phase names and step names come in as
data (lane groups are the board's business: this screen has no lane-group property, P-2), with defaults in `src/defaults/`, exactly as on the board. The `data-driven` gate, extended in IC-02 for verdict, change-state and staleness words, applies to this screen:
no lane or phase literal outside `defaults/`, and no view-type field named like a lane or phase. The new
vocabularies this screen reads (change state, review verdict, refusal code) are treated the same way: words live in
`defaults/` or the `labels` prop, with a raw-value fallback; the artifact kind is passed through unbranched. The
history timeline, the dependency lane and the subtask lane render whatever lane value they are given, including one the
screen has never seen. No marker, ordering or tone of the screen is keyed on a lane literal (hence DW-11). A later
dynamic pipeline (phases and lanes following the charter and doctrine packs) must need no change to this element, only
different props. The Mission-phase timeline of the prototype is not part of this screen (DW-9).

## Scope

**In**: the element `sk-work-package-screen` and its private parts; every region listed in the state matrix; the view
states and the regional detail states; fixtures from the 1.0 and 1.1 examples plus named overlays; stories, visual
baselines, interaction tests, manifest entry; the screen shown as shell content by WP-01 and WP-43 in `shellFrame`, with SH-06 and SH-07 left untouched (FR-037); numbered exceptions and the drift register.

**Out**: fetching, routing, URL handling, time source (host); writes of any kind; rendering markdown (prompt, spec,
review text) and the Artifact screens, including the artifact reads and their seven refusal codes; reading `promptMarkdown`
or passing `includePrompt`; fields the contract does not carry (path, "removed" notice, phase timeline, review text); the
dynamic pipeline itself and the contract major it needs; server-side anything (paging, search); the Mission-phase
timeline; reconciling `latestResult` with `reviewCycles` beyond showing both.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every row of the state matrix (WP-01 to WP-50) exists as a Storybook story with an approved visual baseline and passes its pass condition. — [build] · no-op passable: no
- **SC-002**: Every event of EV-1 to EV-8 is asserted by an interaction test with its exact payload, and 0 events are emitted that are not declared in the manifest. — [build] · no-op passable: no
- **SC-003**: A history, dependency and subtask set with lane values the screen has never seen renders every entry in array order with the `data-driven` gate green. — [build] · no-op passable: no
- **SC-004**: A refused or pending detail leaves 100% of the 1.0 regions visible and replaces exactly the detail regions with one stated notice. — [build] · no-op passable: no
- **SC-005**: A keyboard-only user reaches and operates every control in every tier with a visible focus ring; 100% of controls. — [build] · no-op passable: no
- **SC-006**: All quality gates pass on the pull request with 0 findings and 0 visual failures across 5 consecutive runs. — [build] · no-op passable: no
- **SC-007**: A side-by-side visual review of each baseline against the prototype finds 0 differences outside the confirmed drift register. — [build] · no-op passable: no
- **SC-008**: A host renders the screen by passing only contract-shaped data, the Mission, the view states, `now` and labels, with no change to the screen and no I/O performed by it. — [build] · no-op passable: no
- **SC-009**: Every statement the screen makes about a Work Package (lane, verdict, override, change state, readiness, refusal) is available as text to assistive technology; 0 statuses are colour-only. — [build] · no-op passable: no

## Assumptions

- The app shell, `sk-work-package-board` and its `sk-select-work-package` event, `defaults/`, the vendored contract and gates
  come from mission-ui#4 (not merged at specify time), by stacking or after the merge (C-012).
- The screens are built against the contract and fixtures, not a live service (the read service is built in parallel,
  spec-kitty#5528).
- The host passes `mission` (identity, name, count); `WorkPackage` carries no Mission identity (N-1).
- The detail payload is optional to the screen: a host may omit it, and then the screen degrades to the 1.0 lists (FR-004).
- `reviewCycles`, `workspace`, `ArtifactKind` and the detail refusal codes are provisional and may change before 1.1
  is released; the screen holds them behind optional regions and defaults (FR-018).
- The Work Package id in the Work Packages tree and the board card is the same `wpId` the detail operation takes.
- No Decision Moments were recorded for this specify phase; the binding inputs are the issue, contract 1.1 as read, the
  prototype and the rulings of #4 (CP-1 drift, event naming `verb-noun`, wrapping, exceptions). The open questions below were held for the operator and are now ruled (Clarifications).

## Open Questions (all twelve ruled by the operator on 2026-10-04: each recommendation accepted as written)

The issue's four questions are updated for 1.1; Q5 to Q12 are new. Each had a recommendation; the operator accepted all twelve on 2026-10-04 (see Clarifications).

| # | Question | Recommendation | State |
|---|----------|----------------|-------|
| Q1 | **Staleness look** (issue Q1; unchanged by 1.1, still provisional). | A small header badge "stale, N min since last commit" when `stale`; a quiet fact row for `fresh`; nothing for `not_applicable` or null; the field stays optional and hidden when absent. | RULED 2026-10-04: accepted as recommended |
| Q2 | **Subtask list** (issue Q2; 1.1 gives titles and per-subtask lanes). | Progress bar from `subtaskProgress` as given (hidden at total 0) plus a semantic list of id, title and lane word; a null title shows the id alone; the detail list wins over the 1.0 map (N-2). | RULED 2026-10-04: accepted as recommended |
| Q3 | **Prototype panels** (issue Q3, now split by 1.1 sources): (a) Workspace, (b) owned-file badge, (c) per-cycle review text, (d) Mission phase timeline, (e) "Open spec.md". | (a) render the four contract members, drop the path row and the "removed" notice (R-3, R-4); (b) see Q6; (c) drop the inline text, show cycle number, verdict, reviewer, time and an "Open review" action to the artifact; (d) do not render, lane history takes its place, and log the phase timeline as out of scope; (e) render from `artifactReferences.spec`. | RULED 2026-10-04: accepted as recommended |
| Q4 | **Prompt body** (issue Q4; the prompt is now an artifact reference). | An "Open prompt" action from `artifactReferences.prompt` emitting the artifact event; no markdown rendering; the screen neither reads `promptMarkdown` nor needs `includePrompt` (N-3). | RULED 2026-10-04: accepted as recommended |
| Q5 | **Event contract for navigation and artifact links** (new). The issue says `sk-view-artifacts` with the Work Package id; contract 1.1 gives artifact paths; #4 has `sk-open-mission` and `sk-open-missions`. | One `sk-open-artifact` `{ missionId, path, kind }` for spec, prompt and review cycles; no `sk-view-artifacts` on this screen (the shell's Artifacts item covers the listing); `sk-open-pipeline` `{ missionId }` for "Return to Pipeline" and `sk-open-mission` `{ missionId, slug }` for the crumb, collapsed to one event if both route to the Pipeline; `sk-retry-load` `{ missionId, wpId, target }`. All verb-noun. | RULED 2026-10-04: accepted as recommended; superseded in part by P-1 (2026-10-05): no `sk-open-pipeline` event exists, "Return to Pipeline" emits `sk-open-mission` |
| Q6 | **Change-state badge** (new; replaces the prototype's `draft`). | Words "changed", "unchanged", "unknown" with tones info, neutral, neutral, never colour-only; when every entry is `unknown` (host without git or worktree) show no per-row badges and one quiet note "Change state unavailable on this host". | RULED 2026-10-04: accepted as recommended |
| Q7 | **Partial and refusal states** (new): `WorkPackage` and `WorkPackageDetail` are two reads. | Keep `status` for the whole screen and add `detailStatus` (`loading`, `ready`, `error`, `not-found`) for the detail regions; a refused detail is a regional notice naming `not_found` or `source_unreadable` in words with a retry, the 1.0 regions stay; only a `WorkPackage` 404 is the whole-screen not-found. | RULED 2026-10-04: accepted as recommended |
| Q8 | **Contract pin** (new): 1.1 is `1.1.0-SNAPSHOT` on spec-kitty#5625, not on `main`. | Vendor from spec-kitty `main` once #5625 merges; if planning must proceed earlier, pin to a recorded commit of the #5625 branch as provisional and re-pin to `main` before the PR, with gate `contract` checking the pin. | RULED 2026-10-04: accepted as recommended |
| Q9 | **Provisional 1.1 parts** (new): `reviewCycles`, `workspace`, `ArtifactKind`, refusal codes. | Consume them as optional regions that hide when the property is omitted (as staleness); an empty array or null member is drawn as defined; the artifact `kind` and refusal `code` are passed through, worded only through `defaults/`. | RULED 2026-10-04: accepted as recommended |
| Q10 | **Actor display** (issue gap 10): the prototype's `claude:opus:implementer-ivan` versus `tool`, `role`, `profile`. | Header badge and Facts row show the non-null handles joined with a colon (matches the prototype look); the Assignment panel shows them as separate rows. | RULED 2026-10-04: accepted as recommended |
| Q11 | **Review panel composition** (new): `review.latestResult` and `override` (1.0) with `reviewCycles` (1.1). | One panel: a summary (latest result, override notice) above the cycle list; show both without reconciling them; when no cycles exist but a latest result does, show the summary alone. | RULED 2026-10-04: accepted as recommended |
| Q12 | **History markers** (new). | "Current" on the newest entry only; no lane-keyed "Complete" marker, since it needs a lane literal; a host-supplied lane-group prop could add one later. | RULED 2026-10-04: accepted as recommended |
