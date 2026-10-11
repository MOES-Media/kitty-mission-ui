# Mission Specification: Drift screen

**Mission Branch**: `feat/drift-screen-10`
**Created**: 2026-10-07
**Status**: Draft (Q1-Q10 ruled 2026-10-08, all as recommended; the drift register is PROPOSED and goes to the operator at CP-1)
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#10 ("Drift screen against the Mission Status contract"); the Mission Status
contract after spec-kitty#5776 (landing as PR #5881), `GET /drift` (`getDriftReport`, `DriftReport`) with the optional `missionId`
query; its operator rulings (`tracer-design-decisions.md` of the contract mission); and the approved Kitty Desktop V2 prototype page
`06-drift.html`. Precedents that bind: the specs and tracer rulings of mission-ui#4, #5 and #7.

## Intent Summary

- **Primary actor**: a host (the local dashboard served by the Mission Status read service, or Kitty Desktop) that renders the Drift
  screen inside the app shell's project layout, and the user looking at it.
- **Trigger**: the shell's project-level "Drift" item (whole project), or a Mission context of the Pipeline screen (one Mission, the
  `missionId` scope). The host calls `GET /drift` and passes the report in.
- **Desired outcome**: one screen, **Drift**, that takes the contract's `DriftReport` in as a property plus a view state, emits
  `sk-*` intent events out, and is visible in every state of the state matrix as a Storybook story with an approved visual baseline,
  built without a live service. The user reads a list of findings, picks one, and reads what disagrees, which side decides, which
  lanes differ, and the suggested repair as text to copy.
- **Rules that always hold**: the screen performs no I/O (no fetch, XHR, WebSocket, Tauri API, browser storage, timer, clock or
  clipboard). It is read-only and never repairs: the suggested resolution is a command shown as text, and "Rescan" and "Copy" are
  requests to the host. Every UI primitive that the design library provides is rendered with that library element. The prototype is
  the visual source of truth; only drift confirmed by the operator at CP-1 is allowed. The pipeline is data-driven (see "The
  dynamic-pipeline constraint"): the screen holds no kind, severity, authority, remedy, source-code or lane literal.

## Clarifications

### Binding inputs (from the dispatch and the issue; persisted here so later phases can audit them)

These are contract rulings the screen must honour exactly.

- **B-1, unreachable remote.** An unreachable remote does not fail the scan: the contract answers 200, read from the Mission's own
  directory, with no fallback entry. The screen therefore never shows a "remote unreachable" state, and a report cannot say which
  Missions were scanned from their own directory (Contract Gap 11).
- **B-2, the cap.** The finding list is capped at 1000 and `truncated` says whether more existed (true above 1000, false for exactly
  1000). Findings are not paged. The screen draws the list it is given, in the contract's order, and a note when `truncated`.
- **B-3, `derived_view_stale` is not shipped.** The prototype's third finding, "Derived views are stale" (with ".kittify/derived ·
  3 Missions"), is dropped drift. No story, no kind word, no aggregate finding (a finding belongs to exactly one Mission and one file).
- **B-4, `remedy` is a name, not a command.** `DriftFinding.remedy` is `materialize_status` or null. It stands for the CLI command
  `spec-kitty agent status materialize --mission <slug>`, which the screen shows as text. The screen never runs it. The prototype's
  `spec-kitty materialize --mission ...` is wrong for this contract (that command writes only derived views). The template lives in
  `defaults/`; the slug is `MissionHead.slug` of the finding's `missionId`, joined by the host.
- **B-5, Rescan is a host event, not a fetch.** "Rescan" emits `sk-rescan-drift`; the host re-calls `GET /drift` (the 200 carries
  `Cache-Control: no-store`, each call has a later `scannedAt`) and passes the new report.

### Operator rulings, 2026-10-08

- **Q1-Q10 and the five confirmations of `operator-questions.md`: all accepted as recommended.** The recommendation text is the ruling (Q1 (a), Q2 (a), Q3 (a), Q4 (a), Q5 (a), Q6 (a) with no Pipeline change, Q7 (a), Q8 (a), Q9 (a), Q10 (a)).
- **The V2 prototype pages are current.**
- **Contract re-vendor:** done ONCE, first, by #9 Projects after spec-kitty PR #5881 merges. No stacked branches: #10 starts implementation from `main` after that re-vendor lands (supersedes Q10 (a)'s "re-vendor on this branch").
- **Exception range:** this mission uses E-35..E-39 (Projects E-31..E-34, Ops E-40..E-43). The former E-31..E-35 are renumbered; an unused number stays unused.
- **Retry target:** `sk-retry-load` uses `target: 'drift-report'` (unique across screens; taken: `work-package`, `detail`, #7's artifact targets, #9's `project`, `projects`, `folders`, #11's `ops-page`). The union lives in `src/retry-types.ts`, which arrives with #7; if this branch starts before #7 merges, it extends the union wherever `main` holds it and the plan records that.
- **`sk-open-mission`** carries `{ missionId, slug }`, as shipped.

### Orchestrator notes on the issue

- The issue's wording for the shared event is `sk-open-mission` with `{ missionId }`. The shipped event (Missions, Work Package
  screens) carries `{ missionId, slug }` (`SkOpenMissionDetail`). The screen emits the shipped payload; see FR-016.
- `remedy` is present for a missing `status.json` whose event log exists (contract examples `DriftReport.truncated`), not only for
  `SNAPSHOT_DRIFT` and `CORRUPT_JSON`. The issue's DR-07 ("no remedy") is split into DR-07a and DR-07b below.

## Contract Basis

Contract: Mission Status, spec-kitty `main` after #5776 (version `1.0.0-SNAPSHOT`, not yet tagged). One read, `GET /drift`, with the
optional query parameter `missionId` (`DriftMissionId`, a ULID). The screen re-vendors the contract once #5881 merges; until then
planning reads the PR worktree. The contract version, the pin and the `contract:check --require-main` rule are the mission's
dependency, not a requirement the screen's code can meet by itself (see C-002 and the assumptions).

| Region | Contract field | Notes |
|---|---|---|
| Header, last scan | `DriftReport.scannedAt` (date-time) | Relative or absolute via `now` or the label hook; never a clock. |
| Finding list | `DriftReport.findings[]` | Sorted by `missionId`, `kind`, `artifactPath` in byte order, at most 1000; the key (`missionId`, `kind`, `artifactPath`) is unique. `[]` means the scan ran and found none. |
| Truncation | `DriftReport.truncated` (x-provisional) | True above 1000, false for exactly 1000. The cap may be replaced by paging. |
| Title | `DriftFinding.summary` | One of six fixed sentences, "and no other text". |
| Kind | `DriftFinding.kind`, `DriftKind` (x-provisional) | `snapshot_disagrees_with_event_log`, `snapshot_or_event_log_missing`, `lane_branch_missing`. |
| Severity | `DriftFinding.severity` | `error` (`SNAPSHOT_DRIFT`, `CORRUPT_JSON`), `warning` (the rest). No `info`. |
| Mission | `DriftFinding.missionId` | ULID, never null. The slug is not in the finding. |
| File | `DriftFinding.artifactPath` | `status.json`, `status.events.jsonl` or `lanes.json`, relative to the Mission directory; never null. |
| Authority / derived side | `authority` (`event_log`, `git`), `derivedSide` (`status_json`, `lanes_json`) | Fixed by the kind. |
| Lane table | `laneComparison[]` (x-provisional): `wpId`, `persistedStatusLane`, `derivedStatusLane` | Only Work Packages whose lane differs, sorted by `wpId`; null on a side = absent on that side, or a lane outside the nine display lanes. |
| Resolution | `remedy` (x-provisional): `materialize_status` or null | See B-4. |
| Source code | `sourceCode` | `SNAPSHOT_DRIFT`, `SNAPSHOT_DRIFT_PROVENANCE`, `SNAPSHOT_DRIFT_TERMINAL`, `CORRUPT_JSON`, or null. A machine value, never free text. |
| Refusals | `DriftRefusal` (a `Problem`), by `code` | 404 `mission_not_found`; 500 `drift_scan_unreadable` (never a partial report); 400 for a non-ULID `missionId` is the shared `Problem`. `DriftRefusalCode` is x-provisional. |

Fixtures are generated from the contract examples: `DriftReport.populated`, `.clean`, `.corrupt-json`, `.truncated`;
`DriftRefusal.mission-not-found`, `.scan-unreadable`; plus named overlays (see FR-029).

## Contract Gaps

Each prototype element with no source, or a different source, is raised on spec-kitty#5528 or dropped. None is invented. Items 1-15
are the issue's list, re-checked against the contract; items 16-20 are new in this spec.

1. **Prototype badge codes** (`SK-02`, `SK-91`) have no source: no badge-code namespace exists (operator ruling OR-9). The badge word is
   the severity. `sourceCode` is a machine value shown in mono as a quiet tag or not at all (Q3).
2. **Third finding and "3 Missions"**: dropped (B-3).
3. **Explanatory paragraphs**: the contract gives one sentence. The prototype's prose has no source; it is `defaults/` copy keyed by
   `kind` and `sourceCode`, and it must not assert more than the contract (never a branch name; never "out of date", Gap 8).
4. **Mission name**: a finding carries `missionId` only; the host joins `MissionHead` fields. An unknown Mission shows its `missionId`.
5. **The command**: B-4. A null `remedy` shows no command and no empty panel.
6. **Lane table scope**: only differing Work Packages; equal rows are not invented; the authoritative side is stated in words, not by
   colouring a column (the prototype colours only the two differing cells).
7. **Lane word null**: absent on one side and a lane outside the nine display lanes (genesis, uninitialized) both read null; the
   screen shows one "not present" word.
8. **Which file is wrong**: for `snapshot_disagrees_with_event_log` the comparison is against the replay of the log at the snapshot's
   own generation. The screen says "differs from the event log", never "is out of date".
9. **Authority panel**: the prototype's green `status.events.jsonl` badge becomes the vocabulary word for `authority`, from `defaults/`.
10. **Last scan**: `scannedAt` is a full instant; the prototype's clock time is replaced per the #4 ruling (relative text, ISO fallback).
11. **Network dependence**: no field says which Missions were scanned from their own directory (B-1), so a scan can lag the
    coordination surface and the screen cannot say so per finding. Raised for the epic.
12. **Legacy manifest**: a manifest that predates `mission_slug` is not evaluated for `lane_branch_missing`. "No drift found" must not
    say "everything is consistent".
13. **No empty, loading or error state in the prototype** (no `?state=` variants): DR-18 to DR-23 are built from the Missions and Ops
    analogues and listed for confirmation.
14. **Static prototype notices** ("Static prototype: the last approved scan is shown unchanged") are tooling and are not built.
15. **Provisional**: `DriftKind`, `remedy`, `laneComparison`, `truncated`, `DriftRefusalCode`; fixtures are regenerated when tagged.
16. **Which file `artifactPath` names for the missing-file kind.** The contract says the file "the finding is about". The examples
    show `status.json` with a remedy (event log present) and `status.events.jsonl` without one (event log missing), so the path is the
    missing file, but no sentence says so. The explanation therefore says only "one of the two files is missing" and the Facts row shows
    the path as the file the finding is about; the screen does not state that the named file is the missing one.
17. **Why a `remedy` is null is invisible.** For an `error` finding on a Mission merged to main the remedy is null, and the finding
    does not say so. The screen draws no resolution region and no sentence about why; it never claims that no repair exists.
18. **`sk-open-mission` payload**: the issue says `{ missionId }`, the shared event carries `{ missionId, slug }` (see Clarifications).
19. **Scope echo**: the report does not carry the `missionId` it was scoped to. The screen cannot verify a scoped report except by its
    findings (FR-009); an empty scoped report is indistinguishable from an empty whole-project report.
20. **The prototype's listbox** holds a non-option child (`finding-head` inside `role="listbox"`), which is invalid ARIA. The head moves
    outside the listbox (drift DD-3).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the findings and pick one (Priority: P1)

As a user, I open Drift and see how many findings the last scan produced, each with its fixed summary, the Mission it belongs to and
its severity word. I pick one and read the detail.

**Why this priority**: it is the screen.
**Independent Test**: render `DriftReport.populated`; the list shows five rows in report order; choosing one swaps the detail.

**Acceptance Scenarios**:
1. **Given** a ready report, **When** the screen renders, **Then** the head reads the finding count and a severity roll-up, the rows
   carry summary, Mission (slug in mono) and a severity badge with its word, and the host-selected finding is marked.
2. **Given** a row, **When** I click it or press Enter, **Then** `sk-select-finding` is emitted with `{ missionId, kind, artifactPath }`.
3. **Given** the list has focus, **When** I press arrow keys, Home or End, **Then** focus and selection move together, each move
   emitting `sk-select-finding`.

### User Story 2 - Read what disagrees and who decides (Priority: P1)

As a user, I read the kicker, the title, an explanation, which side is authoritative, and which file is derived; for a snapshot
disagreement I read the Work Packages whose lanes differ, both values in words.

**Acceptance Scenarios**:
1. **Given** a `SNAPSHOT_DRIFT` finding with two lane rows, **Then** the table has real header cells and two rows; a null side reads
   "not present"; the difference is never shown by colour alone.
2. **Given** `SNAPSHOT_DRIFT_PROVENANCE` (no rows), **Then** no table is drawn and the explanation says only provenance fields differ.
3. **Given** `CORRUPT_JSON`, **Then** the table region is one sentence that the snapshot is not a valid JSON object.

### User Story 3 - Copy the suggested repair, never run it (Priority: P1)

As a user, when a finding offers a repair, I see the command as text and a Copy button.

**Acceptance Scenarios**:
1. **Given** `remedy` `materialize_status` and a known Mission slug, **Then** the command reads `spec-kitty agent status materialize
   --mission <slug>`; Copy emits `sk-copy-command` with `{ text, missionId, remedy }`; the screen never touches the clipboard.
2. **Given** the host answers `copied` or `manual`, **Then** the result is announced; on `manual` the command text is selected.
3. **Given** a `remedy` the screen does not know, or a Mission the host does not list, **Then** no command and no copy field are drawn;
   for the unlisted Mission one sentence says the Mission was not found in the list.

### User Story 4 - Rescan and see that it happened (Priority: P2)

As a user, I press Rescan; the old report stays visible, the button shows it is busy, and when the new report arrives I hear that the
scan was refreshed.

### User Story 5 - Every state keeps the frame (Priority: P2)

Loading, clean, truncated, unreadable scan (retry) and Mission not found (return to Missions) each draw their own content in the
page frame. A clean report says "No drift found", never "everything is consistent".

### User Story 6 - One Mission (Priority: P2)

With a `missionId` scope the header names the Mission, the list holds only its findings and the Mission column is dropped.

### User Story 7 - The screen follows the data, not the pipeline (Priority: P2)

A finding with a kind, severity, authority, remedy or source code the screen has never seen renders as given, in the neutral tone,
with no explanation and no command. Nothing but props changes when a fourth kind ships.

### Edge Cases

- **Unknown `kind`, `severity`, `authority`, `derivedSide`, `sourceCode`, `remedy`, lane word**: raw value as its word, neutral tone, no explanation, no command (DR-10, DR-11); the finding is never hidden.
- **A Mission missing from the host's name map**: the `missionId` in mono, no Mission link, the finding stays (Q7 of the issue; DR-13, DD-8).
- **A finding for another Mission in a scoped report**: NOT LOADED (FR-009).
- **`status` `ready` with a null report**: the loading look, announcing nothing for a report (FR-008).
- **Selected key not in the report** (for example after a rescan fixed it): nothing is marked and the detail says the selected finding is not in this scan (Q2).
- **A report whose `findings` is not an array**: loading look, never clean (FR-008).
- **A host that ignores `sk-select-finding`**: selection and detail stay on the property (FR-022).
- **Duplicate keys** (a contract violation): the first wins for selection; the list still draws every row once with a stable Lit key made from the key plus the index.
- **1000 rows**: plain DOM, no virtualization (as #7 Q9), list scrolls inside its column; render budget in NFR-006.
- **Very long command or lane table**: words-only wrapping; the command scrolls inside its field (E-38); the table scrolls sideways inside its region (E-37).
- **Rescan pressed twice**: the second press while `rescanning` emits nothing.
- **Report replaced while a copy is pending**: the copy result is shown only for the finding whose Copy was pressed (FR-021).
- **`scannedAt` unparseable or missing**: the raw string or no last-scan line; no throw.

## State Matrix and Acceptance

One story and one visual baseline per row, dark theme at 1280 px and at each tier a row names. "None" in the Source column means the
prototype has no such state; the row is built from the named analogue and its drift is in the register for confirmation.

| ID | State | Source (prototype) | Pass condition |
|---|---|---|---|
| DR-01 | Ready: list with the first finding selected, detail drawn, header with last scan and Rescan | `06-drift.html` default | Matches the prototype layout within the confirmed register |
| DR-02 | `SNAPSHOT_DRIFT`, `error`: danger tone, authority panel, lane table, suggested resolution | `finding-status-json` | Table rows = `laneComparison`; command built; copy button present |
| DR-03 | Lane table: differing rows only; a one-sided Work Package shows "not present" on the null side | lane table (all lanes; drift) | No equal rows; null word on the right side |
| DR-04 | `SNAPSHOT_DRIFT_PROVENANCE`, `warning`, no remedy, no rows | None; DR-02 without table and resolution | No table, no resolution region |
| DR-05 | `SNAPSHOT_DRIFT_TERMINAL`, `warning`, one lane row, no remedy | None; DR-04 with the table | One row; no resolution region |
| DR-06 | `CORRUPT_JSON`, `error`, empty table, remedy present | None; DR-02 with the table region as one sentence | One sentence; command present |
| DR-07a | `snapshot_or_event_log_missing`, `warning`, `artifactPath` `status.json`, remedy present (event log exists) | None; `finding-branch` layout | Command and copy present; no claim about which file is missing (Gap 16) |
| DR-07b | `snapshot_or_event_log_missing`, `warning`, `artifactPath` `status.events.jsonl`, no remedy | None; as DR-07a | No resolution region |
| DR-08 | `lane_branch_missing`, `warning`, authority `git`, derived side `lanes_json`, no remedy; names no branch | `finding-branch` | No branch name anywhere; authority word and Facts rows |
| DR-09 | Prototype third finding "Derived views are stale" | Dropped (B-3) | No story; recorded drift DD-1 |
| DR-10 | Unknown `kind` | None; #4 data-driven rule | `summary` title, neutral tone, raw word, no explanation |
| DR-11 | Unknown `remedy` | None; as DR-10 | No command, no copy field |
| DR-12 | Resolution: command from `remedy` and slug; Copy emits; `copied` or `manual` announced | `copy-field`, `copy-result` | Event payload exact; live region text |
| DR-13 | Command for a Mission whose slug the host does not know | None; DR-11 | No command; one sentence |
| DR-14 | Head: count, severity roll-up, a head badge when any finding has a danger-tone severity | `3 findings`, `disagreement` badge | Counts derived from findings; no contract roll-up field |
| DR-15 | Finding rows: summary, Mission slug in mono, severity badge with its word | `finding` button | Word always present |
| DR-16 | Selection: click and Enter select; selected row marked; detail swapped; one per key | `data-finding`, `aria-selected` | Event payload = the key |
| DR-17 | Listbox keyboard: Up/Left previous, Down/Right next (wrapping), Home, End; selection follows focus; roving tabindex | `bindArrowKeys` | Each move emits once; a table test pins wrap and the one-item case |
| DR-18 | Clean report: "No drift found", last scan shown | None; `07-ops.html?state=empty` | Copy does not say "consistent" |
| DR-19 | Truncated: note "Showing the first N findings" (N = `findings.length`) | None; #7 truncation note | `sk-notice`; no "1000" literal |
| DR-20 | Loading the first scan | None; `07-ops.html?state=loading` | `aria-busy`, labelled progress |
| DR-21 | Rescanning with a report shown | None; DR-20 inside the header | Report kept; the Rescan button is `aria-busy` true then false (the root is busy only for the first load); one "Rescanning" announcement; the option and detail nodes present before the new report are the same nodes after it (no remount); Rescan keeps focus; exactly one rescanned announcement |
| DR-22 | Scan unreadable (500 `drift_scan_unreadable`), retry | None; `07-ops.html?state=error` | `sk-retry-load` `{ target: 'drift-report', missionId }` |
| DR-23 | Mission not found (404 `mission_not_found`), "Return to Missions" | None; #5 not-found | `sk-open-missions` |
| DR-24 | Scoped scan: header names the Mission, own findings only, Mission column dropped | None; DR-01 | Foreign finding = not loaded |
| DR-25 | Long texts: long Mission name, 1000 rows, long lane table, very long command | None; #4/#5 words-only rule | No page overflow; pills ellipsize by the shared rule |
| DR-26 | Focus order and ring: skip target, header Rescan, list, detail Mission link, Copy; stops tagged | None; #4 rules | Documented order, tagged stops |
| DR-27 | Collapsed tier, about 1100 px | breakpoint 1100 | List and detail side by side |
| DR-28 | Narrow tier, about 800 px: list above detail, list border dropped | breakpoint 800 | One column |
| DR-29 | Mobile tier, 620 px and below: one column, table scrolls sideways, Copy reachable | breakpoint 620 | Via `:state(shell-mobile)` |
| DR-30 | Nothing selected (null selection) or selected finding not in this scan | None; #5 nothing-selected | "Choose a finding"; no event emitted |
| DR-31 | Unknown refusal code or a 400 | None; DR-22 | Generic scan-error words, retry |
| DR-32 | Finding with `sourceCode` tag (if Q3 is accepted) | None | Quiet mono tag under the title |

### Event interaction checks

| ID | Event | Payload | Trigger |
|---|---|---|---|
| EV-1 | `sk-select-finding` | `{ missionId, kind, artifactPath }` | Click, Enter, Space or arrow/Home/End on an option; never for an incoming `selectedFinding` change |
| EV-2 | `sk-rescan-drift` | `{ missionId: string \| null }` | Rescan (scope or `null`); nothing while `rescanning` |
| EV-3 | `sk-copy-command` | `{ text, missionId, remedy }` | Copy |
| EV-4 | `sk-open-mission` | `{ missionId, slug }` | Mission name in the detail Facts (only when the slug is known) |
| EV-5 | `sk-retry-load` | `{ target: 'drift-report', missionId: string \| null }` | Retry in the error state |
| EV-6 | `sk-open-missions` | `{}` | "Return to Missions" |

Each event is declared once with `@fires` and typed; `sk-retry-load` extends the union in `src/retry-types.ts` (after #5 and #7 land).
State-only interactions (focus, scroll) emit nothing.

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | Requirement | Priority | Status |
|----|-------|-------------|----------|--------|
| FR-001 | Element and public surface | One element `sk-drift-screen` with properties `report` (`DriftReport`), `status` (`loading`, `ready`, `empty`, `error`, `not-found`), `selectedFinding` (the key or null), `missionId` (scope), `missions` (map of `MissionHead`-shaped name entries by `missionId`), `rescanning`, `copyResult`, `refusalCode`, `now`, `labels`, `errorMessage`; data in as properties, events out | High | Open |
| FR-002 | Page header | Title "Drift", subtitle "Derived state checked against the event log and git", last scan from `scannedAt`, and a Rescan button; in a scoped scan the header also names the Mission | High | Open |
| FR-003 | Last scan | `scannedAt` shown as relative text from `now` or the label hook, ISO fallback; the full instant in `title`; never read from a clock | Medium | Open |
| FR-004 | Rescan | Rescan emits `sk-rescan-drift` `{ missionId }` and performs no fetch; while `rescanning` the button is busy (`aria-busy`, still focusable), emits nothing, and the report stays visible | High | Open |
| FR-005 | Finding list | A real listbox: `role="listbox"` with `role="option"` rows, `aria-selected`, roving tabindex; rows in the report's own order; the screen never sorts, groups or filters. Keys follow the prototype's `bindArrowKeys`: Up and Left previous, Down and Right next, both wrapping, Home first, End last, no other key; one item stays put | High | Open |
| FR-006 | Finding row | Summary as title, Mission display (slug in mono, else `missionId`), severity badge whose word comes from `defaults/` (raw value for an unknown severity, neutral tone) | High | Open |
| FR-007 | Head | Count of findings shown (`findings.length`), a severity roll-up counted per severity value present (words from `defaults/`), and a head badge when any shown finding has a severity whose tone is `danger`; presentation only (Q4 of the issue) | Medium | Open |
| FR-008 | View states | `status` extends the charter's four with `not-found`; a `ready` status with a null report, or with a report whose `findings` is not an array, renders as loading (never as clean) | High | Open |
| FR-009 | Agreement with scope | In a scoped scan (`missionId` non-empty) a report containing a finding of another Mission counts as NOT LOADED (the loading look, nothing announced for it), as #5 CORR-004 and #7 FORK-3 (a) | High | Open |
| FR-010 | Detail kicker and title | Severity badge and the kind word (from `defaults/` by `kind`, raw value when unknown) as the kicker, `summary` as the `h2` title; `sourceCode` as a quiet mono tag only if Q3 is accepted | High | Open |
| FR-011 | Explanation | A paragraph from `defaults/` keyed by `kind` and `sourceCode`; none for an unknown pair; it never names a branch, never says "out of date", never claims a repair exists | High | Open |
| FR-012 | Authority | An "Authoritative side" panel with the word for `authority` from `defaults/` (raw value when unknown); the derived side and file shown in Facts; one layout for every authority (DD-6) | High | Open |
| FR-013 | Lane table | A table with real header cells (Work Package, status.json, Event log) of `laneComparison` rows in the given order; each lane word from the existing lane vocabulary (`resolveLaneLabel`), a null side the word "not present"; empty `laneComparison` draws no table; for `CORRUPT_JSON` one sentence replaces the table | High | Open |
| FR-014 | Suggested resolution | When `remedy` is known and the Mission slug is known, the command from the `defaults/` template, a Copy button and a live result region; otherwise nothing (no empty panel); the screen never runs or builds a command for an unknown remedy | High | Open |
| FR-015 | Copy | Copy emits `sk-copy-command` `{ text, missionId, remedy }` with the exact text shown; the screen never writes to the clipboard; with no host answer the command stays selectable | High | Open |
| FR-016 | Mission link | The Mission slug in Facts is a link emitting `sk-open-mission` `{ missionId, slug }` when the slug is known; an unknown Mission shows its `missionId` and no link | Medium | Open |
| FR-017 | Facts | Mission, File (`artifactPath`, mono), Derived side (word), each only when present | Medium | Open |
| FR-018 | Truncation | When `truncated`, an `sk-notice` states only that the first N findings are shown (N from `findings.length`); no total is claimed and the roll-up is labelled as covering the shown findings | Medium | Open |
| FR-019 | Clean and empty | `findings: []` (or `status` `empty`) draws "No drift found" with the last scan and a note of what the scan covers; it never says everything is consistent (Gap 12) | High | Open |
| FR-020 | Errors | `status` `error` draws words from `defaults/` keyed by `refusalCode` (`drift_scan_unreadable`; unknown or absent code and the 400 draw the generic words) and a Retry emitting `sk-retry-load` `{ target: 'drift-report', missionId }`; `not-found` draws "Mission not found" and "Return to Missions" emitting `sk-open-missions` | High | Open |
| FR-021 | Copy result | At press time the screen clears any displayed copy result and records the finding; it accepts as an answer only a CHANGE of `copyResult` observed after the press (a value already present at press time is stale and ignored). `copied` and `manual` are announced and shown only for the finding whose Copy was pressed and are dropped when the selection or the report changes; `manual` selects the command text | Medium | Open |
| FR-022 | Selection | `selectedFinding` is host-owned; an incoming change is never re-emitted; a null or unmatched key marks nothing and draws the choose-a-finding detail (DR-30). `aria-selected` and the detail follow the property only; the roving focus is internal and re-syncs to the selected option after an update when focus is not inside the list, so a host that ignores `sk-select-finding` leaves selection unchanged | High | Open |
| FR-023 | Shell wiring | The project layout's Drift item already exists in the shell fixtures (`nav-drift`, icon `drift`), so no nav item is added; the work is a story that renders the screen as content in `shellFrame` (`current` `nav-drift`, `flush`) and the one-line exports in `src/defaults/index.ts` and `src/index.ts` (serialised with #9 and #11, whoever lands second rebases) | Medium | Open |
| FR-024 | Responsive tiers | Prototype breakpoints 1100, 800 and 620 px; the shell tier through `ShellTierController` and `:state(shell-mobile)` where a container query cannot separate tiers | High | Open |
| FR-025 | Keyboard and focus | Every control by Tab, Enter and Space with a visible ring, no trap, documented focus order with tagged stops; the listbox is one tab stop; after an update that loses focus (active element is body or null) focus moves to the list, as #7 PLAN-FRESH4-002 | High | Open |
| FR-026 | Live region | One polite live region announces loading, ready (count and last scan), rescanned (a later `scannedAt` while ready), refused and copy results, keyed on what is actually shown; mismatched or late data announces nothing | High | Open |
| FR-027 | Data-driven vocabulary | Kind, severity, authority, derived-side, source-code and remedy words, tones, the explanation paragraphs, the command template and the refusal words come from `defaults/` or `labels`, with a raw-value fallback; no literal of these in a component | High | Open |
| FR-028 | View-model helper | A pure helper in `logic/` turns a finding into a view-model (title, kicker, explanation, authority and file words, command text, lane rows); no DOM, no I/O | High | Open |
| FR-029 | Fixtures | Generated from the contract examples plus named overlays: each refusal code, an unknown `kind`, an unknown `remedy`, a finding whose Mission is missing from the map, a 1000-finding report, a scoped report, and a foreign-finding scoped report | High | Open |
| FR-030 | Stories, baselines, manifest | A story per state-matrix row; baselines committed only in the final work package; `manifest:generate` regenerated and `manifest:check` green | High | Open |
| FR-031 | Interaction tests | Every event of EV-1 to EV-6 asserted with its exact payload and a positive control, including that an incoming selection is not re-emitted and that Rescan during `rescanning` emits nothing | High | Open |
| FR-032 | Elements over CSS | Every library primitive rendered with its element; project CSS is layout with `--sk-*` tokens; each local override is a numbered exception (E-35 to E-39 proposed) | High | Open |
| FR-033 | Retry type | `src/retry-types.ts` gains the member `{ missionId, target: 'drift-report' }`; the event is declared once | Medium | Open |
| FR-034 | Quality gates | ESLint (`data-driven`, `no-io`), Stylelint, typecheck, Storybook build, unit and interaction tests, `contract`, `manifest` and gate-proof green | High | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | All gates of FR-034 pass with 0 findings on the pull request | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline gives 0 visual failures across 5 consecutive runs on an unchanged commit, at the tiers each row names | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of interactive controls reachable and operable by keyboard alone in every tier | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200% there is no horizontal overflow of the content area at 1100 px and 720 px (the lane table and the command scroll inside their own regions) | Accessibility | Medium | Open |
| NFR-005 | No I/O | The `no-io` gate reports 0 violations: no fetch, storage, timer, `Date.now()`, clipboard or navigation | Security | High | Open |
| NFR-006 | Render responsiveness | With 1000 findings the screen renders, and re-renders on a selection change, in 200 ms or less in the interaction test environment; a selection change re-renders the detail only | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address or an account username; Mission slugs are synthetic | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences in the side-by-side review of each baseline; drift outside the confirmed register is a REJECT | Quality | High | Open |
| NFR-009 | Data-driven gate | The `data-driven` gate reports 0 violations: no kind, severity, authority, remedy, source-code or lane literal outside `defaults/`; extended to the new word families | Quality | High | Open |
| NFR-010 | Text never colour-only | 100% of severities, lane differences and refusals carry a text form in the DOM | Accessibility | High | Open |
| NFR-011 | Forced colours and reduced motion | In forced colours the selected row, focus ring and table scroll box stay distinguishable; under reduced motion the screen runs no animation of its own | Accessibility | Medium | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the contract; view state in as a property; intent out as `sk-*` CustomEvents (`bubbles`, `composed`); no I/O (charter) | Technical | High | Open |
| C-002 | Contract basis | Types generated from the vendored contract at a recorded pin; response schemas closed; provisional parts consumed defensively; the contract is re-vendored once #5881/#5776 are on `main` (a shared, first, separate change) | Technical | High | Open |
| C-003 | Read-only | No repair, no branch creation, no acknowledging or dismissing; the command is text | Product | High | Open |
| C-004 | No arithmetic on contract values beyond display counts | Counts are `findings.length` and per-severity tallies for display only | Product | Medium | Open |
| C-005 | Elements over CSS | As FR-032 and the charter | Technical | High | Open |
| C-006 | Prototype is the visual authority | `06-drift.html` is the source of truth; only confirmed drift is allowed | Design | High | Open |
| C-007 | Data-driven pipeline | See below | Technical | High | Open |
| C-008 | Fixtures and risk boundaries | Synthetic fixtures; no absolute paths or usernames; no branch name is ever shown (a finding never carries one) | Security | High | Open |
| C-009 | Terminology | "Mission" everywhere, never "feature"; "status lane" not "code lane" for the table | Product | Medium | Open |
| C-010 | Shell dependency | The screen renders inside the shell's project layout (`flush`); the shell owns the top bar, sidebar, tiers and the skip link target | Scope | High | Open |
| C-011 | Review and governance | Pull request into `main`; the operator merges; each work package reviewed by a separate reviewer; the adversarial squad runs after the plan phase only (charter); the operator reviews Storybook after the final work package | Scope | High | Open |
| C-012 | Stacking and parallel work | Builds on #4 (merged), #5 (PR #8, merged on `main`) and #7; Projects (#9) and Ops (#11) have disjoint new files; the shared touches (re-vendor, one-line exports, nav items) serialise | Scope | High | Open |

### Key Entities

- **DriftReport**: `scannedAt`, `findings[]` (at most 1000), `truncated`.
- **DriftFinding**: `kind`, `severity`, `missionId`, `artifactPath`, `summary`, `authority`, `derivedSide`, `laneComparison[]`, `remedy`, `sourceCode`. Key: (`missionId`, `kind`, `artifactPath`).
- **LaneComparison**: `wpId`, `persistedStatusLane`, `derivedStatusLane` (each nullable).
- **Mission name entry (host prop)**: `MissionHead` fields `missionId`, `slug`, `friendlyName`.
- **View state**: `status` (`loading`, `ready`, `empty`, `error`, `not-found`); `rescanning`; `copyResult`.
- **Intent events**: `sk-select-finding`, `sk-rescan-drift`, `sk-copy-command`, `sk-open-mission`, `sk-retry-load`, `sk-open-missions`.

## Visual Drift Register (PROPOSED; confirmed by the operator at CP-1)

Every prototype element against what the screen will show. Each item is PROPOSED drift until confirmed; a difference from the
prototype that is in neither this register nor the CP-1 record is a REJECT. #4's and #5's confirmed rulings apply as precedents
(state words, host-neutral error copy, relative time, words-only wrapping, the one shared pill ellipsis rule, flat panels or the
narrowed library card per the panel ruling, numbered exceptions).

| ID | Prototype element | What the screen shows | Proposed ruling |
|----|-------------------|-----------------------|-----------------|
| DD-1 | Third finding "Derived views are stale", ".kittify/derived · 3 Missions" | Dropped (B-3) | confirm |
| DD-2 | Badge codes `SK-02`, `SK-91` in rows and kicker | The severity word in the badge; `sourceCode` only as a quiet tag if Q3 | confirm per Q3 |
| DD-3 | `finding-head` inside the listbox | The head sits above the listbox, outside it (valid ARIA); same look | confirm |
| DD-4 | Head badge "disagreement" | A badge from the severity roll-up, present when any finding has a danger-tone severity; words from `defaults/` | confirm per Q4 |
| DD-5 | Row titles ("status.json disagrees with the event log") | The contract `summary` (one of six sentences) | confirm (copy drift) |
| DD-6 | Status finding: authority panel; branch finding: a notice "Authoritative source: local git refs" | One authority panel for every authority, word from `defaults/`; the branch notice's sentence is dropped | confirm per Q8 |
| DD-7 | Facts only on the branch finding | Facts (Mission, File, Derived side) on every finding | confirm (additive) |
| DD-8 | Mission as a mono slug | Slug in mono; the `missionId` when the host does not list the Mission | confirm per issue Q7 |
| DD-9 | Lane table with all lanes, colouring only two cells; lane words `COMPLETED`, `IN_PROGRESS` (upper case, not the app's words) | Differing rows only; both values in words from the lane vocabulary; "not present" for null; no cell colour | confirm (Gaps 6, 7) |
| DD-10 | Explanation prose ("A manual sync or re-materialization is required") | `defaults/` copy by kind and source code that asserts no more than the contract | confirm (Gap 3) |
| DD-11 | Command `spec-kitty materialize --mission <slug>` | `spec-kitty agent status materialize --mission <slug>` | confirm (B-4) |
| DD-12 | Suggested resolution on the status finding only | Wherever `remedy` is known; nowhere else | confirm |
| DD-13 | Clock time "last scan 14:32:07" | Relative text from `now`, ISO fallback, full instant in `title` | confirm (#4 DR-12 precedent) |
| DD-14 | "Rescan" quiet button, static notice on click | A quiet button emitting `sk-rescan-drift`; busy while `rescanning`; the static notice is not built | confirm (Gap 14) |
| DD-15 | Selected row marker: danger-coloured left border for every finding | A neutral selection marker token (selection is not severity) | confirm per Q9 |
| DD-16 | Copy result texts "copied", "manual - the command is selected; copy it with your keyboard.", "failed - clipboard access is unavailable." | `copied` and `manual` texts in `defaults/`; the `failed` text is dropped (the host answers `manual`) | confirm per Q5 |
| DD-17 | Panels and facts drawn as `.panel` / `.facts` | The library card/facts look as ruled for #5 (narrowed panel exception) | confirm (precedent) |
| DD-18 | No loading, empty, error, not-found, truncated, rescanning or choose-a-finding states | Built from the Ops and Missions analogues and #5, #7 | confirm (Gap 13) |
| DD-19 | `drift-layout` 420 px list track | The same track via exception E-35; collapsed at 800 px | confirm |
| DD-20 | Mission column in rows on a scoped scan | Dropped when `missionId` is set (the issue's DR-24) | confirm |
| DD-21 | Skip link "Skip to Drift" | Belongs to the shell; the screen exposes the `#content` target only | confirm (C-010) |

Sum of drift-register items: 21 (DD-1 to DD-21).

## Proposed Exceptions

Numbered in the range the orchestrator allocated (Projects E-31..E-34, Drift E-35..E-39, Ops E-40..E-43; an unused number stays unused). Each needs operator approval; the library gaps are
recorded for spec-kitty-design, with the issue numbers allocated at CP-1 (none is invented here).

| ID | Scope | Rationale | Sunset |
|----|-------|-----------|--------|
| E-35 | The `drift-layout` track `420px 1fr`, the list border and the one-column switch at 800 px (a layout file only) | The `px` track is a layout literal Stylelint refuses (as E-19 (b), E-28) | A list-detail pane in spec-kitty-design (issue to be filed) |
| E-36 | The finding option: a raw `button` with `role="option"` painted with tokens keyed on `aria-selected`, with a forced-colours `Highlight` border | The library has no listbox option; the library segmented choice does not follow `aria-selected` (the E-26 finding) | A listbox/option element in spec-kitty-design (issue to be filed) |
| E-37 | The lane table scroll region: `overflow-x: auto`, focusable only while it overflows | A table cannot wrap lane words below its header widths at 620 px | A responsive table in spec-kitty-design (issue to be filed) |
| E-38 | The copy field: a `code` block with `overflow-x: auto` beside the Copy button, selectable text | The library has no copy-field element; a long slug is one unbreakable word | A copy-field element in spec-kitty-design (issue to be filed) |
| E-39 | Single-line ellipsis of the Mission slug in rows and header (`text-overflow`, keyword values, file-scoped) | A 26-character `missionId` or a long slug must not widen the column; the pill rule does not cover plain mono text | Utilities in the library, as E-11 and E-21 |

## The dynamic-pipeline constraint

Nothing about the pipeline is hard-coded. Kind words, explanation paragraphs, authority and file words, severity words and tones, the
command template and the refusal wording come in as data, with defaults in `src/defaults/` (a new `drift-copy.ts`), as lanes do on
the board. The lane table uses the existing lane vocabulary. The existing `data-driven` gate applies and is extended for the new
word families (NFR-009). A value the screen has never seen renders as given: `summary` as the title, the neutral tone, the raw value
as its word, no explanation, no command. The list is drawn in report order; the screen never sorts, groups or counts by a kind
literal. A later dynamic pipeline needs no change to this element, only different props.

## Scope

**In**: `sk-drift-screen` and its parts; the view-model helper; `defaults/drift-copy.ts`; fixtures and overlays; stories, baselines,
interaction tests, manifest entry; the shell wiring of the project layout's Drift item.
**Out**: fetching, routing, URL handling, clipboard, time source; repair actions of any kind; a fix queue, bulk actions, dismissing
or acknowledging; history of earlier scans; fields the contract does not carry; server side; paging beyond the contract.

## Success Criteria *(mandatory)*

- **SC-001**: Every row of the state matrix has a Storybook story with an approved baseline and passes its pass condition.
- **SC-002**: Every event EV-1 to EV-6 is asserted with its exact payload; 0 undeclared events are emitted.
- **SC-003**: A finding with a kind, severity, authority, remedy and source code the screen has never seen renders as given with the `data-driven` gate green.
- **SC-004**: With `remedy` null or unknown, 0 commands and 0 empty resolution panels are drawn; with `materialize_status` and a known slug the text equals the template.
- **SC-005**: A keyboard-only user reaches and operates every control in every tier, 100% of controls.
- **SC-006**: All gates pass on the pull request with 0 findings and 0 visual failures across 5 consecutive runs.
- **SC-007**: The side-by-side review of each baseline finds 0 differences outside the confirmed register.
- **SC-008**: A host renders the screen by passing only contract-shaped data, the name map, the view states, `now` and labels, with no I/O performed by the screen.
- **SC-009**: 0 statuses are colour-only; every severity, lane difference and refusal is available as text.

## Assumptions

- The contract is final. PR #5881 is the source until it merges; the screen re-vendors it once and the `contract` gate then checks the pin on `main`.
- The screens are built against fixtures, not a live service (the read service is spec-kitty#5528).
- #5 (PR #8) is on `main` at ad94164; #7 (Artifact Viewer) is in flight, so `src/retry-types.ts` is extended by whichever lands second.
- The host joins the Missions list: `missions` carries `missionId`, `slug` and `friendlyName`. The screen does not fetch it.
- The "last scan" is the report's own `scannedAt`; the first report and each rescan are separate calls and the screen keeps no history.
- Selection is host-owned, like `wpId` on the Work Package screen; the host decides whether to preselect the first finding.
- The 1000 in "at most 1000" never appears as a literal in the screen; the cap in copy is `findings.length`.
- The prototype is current; no design-pause notice was found in the design workspace (issue Q10). Confirm before the side-by-side.
- No Decision Moments were recorded for this specify phase.

## Open Questions

All ten forks of `operator-questions.md` and its five confirmations were RULED on 2026-10-08, each as recommended (see Clarifications); no question is open. The issue's own ten questions were folded
in: its Q1 (one element), Q2 (`rescanning` property), Q7 (unlisted Mission), Q8 (a 400 is the generic scan error) and Q10 (prototype freshness) are recommendations this spec adopts unless the operator rules otherwise (listed there as confirmations); its Q3, Q4, Q5, Q6 and Q9 are Q3, Q4, Q5, Q6 and Q10 of that file.
