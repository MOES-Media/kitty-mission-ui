# Mission Specification: Ops screen

**Mission Branch**: `feat/ops-screen-11`
**Created**: 2026-10-08
**Status**: Specified and planned (operator questions OQ-1 to OQ-10 ruled 2026-10-08, see Clarifications; the drift register is PROPOSED until CP-1)
**Input**: GitHub issue spec-kitty/spec-kitty-mission-ui#11 ("Ops screen against the Mission Status contract"); the Mission Status contract
slice of spec-kitty PR #5881 (`GET /ops/invocations`, `listOpsInvocations`, the Ops schemas), read from the landing worktree with its
operator rulings in `tracer-design-decisions.md`; and the approved Kitty Desktop V2 prototype page `07-ops.html` with its `?state=`
variants (`empty`, `loading`, `error`) and the Ops block of `states.html`.

## Intent Summary

- **Primary actor**: a host (the local dashboard served by the Mission Status read service, or Kitty Desktop) that renders the Ops
  screen inside the app shell's project layout, and the person reading it.
- **Trigger**: the project-level "Ops" item of the shell. The host reads one page of `GET /ops/invocations` and passes it in; "Load
  more" asks the host for the next page.
- **Desired outcome**: one screen, **Ops**, that takes the contract's `OpsInvocationPage` (items, `pageInfo`, `totalCount`,
  `skippedCount`) in as properties plus a view state, shows the project's Op invocation records newest first, emits `sk-*` intent
  events out, and is visible in every state of the state matrix as a Storybook story with an approved visual baseline, built without
  a live service.
- **Rules that always hold**: the screen performs no I/O (no fetch, XHR, WebSocket, Tauri API, browser storage, timer, clock or
  navigation). It is read-only: it never starts an agent and writes nothing, and a row has no action. It never resolves, opens or
  loads evidence. Every UI primitive the design library provides is rendered with that library element (elements over CSS). The
  prototype is the visual source of truth; only drift listed in the Visual Drift Register and confirmed by the operator at CP-1 is
  allowed. The screen sorts nothing and does no arithmetic on contract values. Nothing about the pipeline is hard-coded.
- **Canonical terms**: *Op* (one governed invocation of an agent profile on an action; the contract's `OpsInvocation`); *Ops directory*
  and *closure spine* (the contract's words for the source; the screen names no file path or format); *outcome* (`done`, `failed`,
  `abandoned`; null while open); *status* (`open`, `closed`); *closer* (`closedBy`: `agent`, `doctor_sweep`); *mode of work*; *evidence*
  and *evidence class* (`kind`); *skipped record* (legacy or unreadable, counted, never shown); *view state* (`loading`, `error`,
  `empty`, `ready`); *tier* (expanded, collapsed, narrow, mobile; the shell owns the tier change, the screen owns its own column
  collapse). "Mission" is never "feature". An Op's Mission is the contract's `missionId`; it is not the Missions screen's Mission
  identity object.
- **Out of scope**: see "Scope".

## Clarifications

### Rulings that bind this specification (from the contract's design record)

These are contract rulings, not questions. They are quoted from the landing worktree's `tracer-design-decisions.md` and honoured exactly.

- **R-A. A credential-shaped `actor` is served `null`.** `OpsInvocation.actor` is required but nullable (`ActorHandle` is
  `[string, null]`): the Op stays in `items` and in `totalCount`, and `skippedCount` is unchanged. **This corrects the issue**, which
  says `actor` is "required and never null in the final contract": the issue text predates the ruling. The screen draws a null actor.
- **R-B. A credential-shaped `profileId` or `action` skips the record.** The record is in neither `items` nor `totalCount`; it is
  counted in `skippedCount`. The screen never sees it and never has to hide it.
- **R-C. A malformed closure instant skips the record.** It is counted in `skippedCount`, never served as open. Consequently a served
  `completedAt` and `startedAt` are valid RFC 3339 instants; the screen still shows a value it cannot parse as given (FR-017).
- **R-D. Evidence is redacted.** Host paths become `[path]`, e-mail addresses `[email]`, address userinfo, query and fragment are
  removed, the value is cut at 512 characters, and `redacted` is true exactly when the value differs from the stored reference. A
  credential in the evidence makes `evidence` null (withheld), and the Op is still served. The screen shows `value` as given and never
  tries to reconstruct it.
- **R-E. A swept Op reads as closed** (`status` `closed`, `closedBy` `doctor_sweep`, `completedAt` the instant of the closure).
- **R-F. Paging is a cursor.** Newest first (`startedAt` descending, ties by `invocationId` descending); `totalCount` is the number of
  served Ops matching the profile filter and can lag the newest records; `skippedCount` is over the whole candidate set and
  independent of the filter. The operation, `totalCount`, `skippedCount`, `evidence` and `OpsRefusalCode` are `x-provisional`.
- **R-G. Left out of the contract on purpose, so absent here**: `request_text`, `model_id`, `governance_context_hash`,
  `governance_context_available`, `router_confidence`.

### Operator rulings, 2026-10-08

The operator ruled on `operator-questions.md` on 2026-10-08. Binding on plan, tasks and review; mirrored in `tracer-design-decisions.md`.

- **OQ-9 (ruled).** Exact UTC times as in the prototype, the served string in `datetime`. The `now` property is dropped (FR-001, FR-018).
- **OQ-8 (ruled by the orchestrator from the contract), option (a).** The profile filter matches exactly: the reference reader compares
  `op.profile == profile` and `OpsProfile` is a case-sensitive id. A page whose items disagree with a non-null `profile` counts as NOT
  LOADED, by exact string equality (FR-032, OP-35). Assumption A-5 is now a ruling.
- **OQ-1 to OQ-7 and OQ-10: as recommended.** Mission, Work Package and mode facts shown when present, unlinked (OQ-1 a); no profile
  filter control, the host's `profile` shown as one quiet mono fact (OQ-2 a); evidence null "Not recorded" (closed Op) or "Not recorded
  yet" (open Op), actor null "Not shown" (OQ-3 a); tones `done` success, `failed` danger, `abandoned` attention, `open` neutral, a swept
  Op gains "Closed by: sweep" (OQ-4 a); badge "{loaded} of {total}" (OQ-5 a); host-neutral copy (OQ-6 a); the word "changed" (OQ-7 a);
  the V2 prototype pages are current (OQ-10 a). With OQ-2 (a) there is no `sk-clear-profile` event: FR-031 option (a) applies, OP-34 and
  EV-7 are NOT built.
- **Orchestrator decisions.** Exceptions are E-40..E-43 (CP-1: E-40, E-42, E-43 approved; E-41 deleted). The `sk-retry-load` target of this screen is `ops-page` (unique across screens).
  The contract is re-vendored once, first, by the Projects mission after spec-kitty PR #5881 merges; this mission starts implementation
  from `main` after that re-vendor, with no stacked branches. The `sk-retry-load` union lives in `src/retry-types.ts` (arrives with #7);
  if this branch starts before #7 merges it extends the union wherever `main` holds it, and the plan records which. `sk-open-mission`
  is unchanged and unused here.

### Contract-text notes for spec-kitty#5528 (for the orchestrator; nothing is posted from here)

1. The issue says `actor` is "required and never null"; the final contract makes it nullable and serves a credential-shaped actor as null.
2. The code of the 400 for a `profile` failing its pattern is not stated: the 400 response is typed `PageCursorRefusal` (code always
   `invalid_page_cursor`) while the operation text says only "a 400 problem".

## Contract Basis (Mission Status `1.0.0-SNAPSHOT`, spec-kitty PR #5881, not yet on `main`)

One read. No other operation is used.

| Item | Contract |
|---|---|
| Operation | `GET /ops/invocations`, `listOpsInvocations`, tag `Ops`, returns `OpsInvocationPage`. `x-provisional` (the handling of legacy and unreadable records, and the paging, are a proposal; the marker is dropped once `skippedCount` is settled). |
| Query | `profile` (`OpsProfile`, pattern `^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$`; a page cursor is bound to the profile it was issued for), `pageSize` (1 to 200, default 50), `pageCursor`. All three are the host's; the screen sends none of them. |
| `OpsInvocationPage` | `items[]`, `pageInfo` (`hasNextPage`, `nextPageCursor`, `pageSize`: the shared `PageInfo`), `totalCount`, `skippedCount`. A project with no Ops directory is an empty page with both counts 0. |
| `OpsInvocation` | Thirteen required members, seven nullable: `invocationId` (26-character ULID), `profileId`, `action` (both pattern as `OpsProfile`), `actor` (`ActorHandle`, string up to 128 characters of `[A-Za-z0-9._:-]` or **null**), `modeOfWork`, `startedAt`, `missionId` (ULID or null), `wpId` (or null), `status`, `outcome` (null while open), `closedBy` (null while open), `completedAt` (null while open), `evidence` (null for none, for an open Op and when withheld). Closed schema. |
| Vocabularies | `OpsModeOfWork`: `task_execution`, `advisory`, `mission_step`, `query`. `OpsInvocationStatus`: `open`, `closed`. `OpsOutcome`: `done`, `failed`, `abandoned`. `OpsClosedBy`: `agent`, `doctor_sweep`. `OpsEvidenceKind`: `repo_path`, `url`, `text`. All may be extended by a later contract. |
| `OpsEvidence` | `kind`, `value` (up to 512 characters, redacted), `redacted`. |
| Refusals | 500 `OpsRefusal` (a `Problem`), `code` `ops_unreadable` (the Ops directory or the closure spine exists but cannot be read: no page, never a partial one). 400 `PageCursorRefusal`, `code` always `invalid_page_cursor` (a malformed, forged or other-profile `pageCursor`). The operation text also says "a profile that fails its pattern is a 400 problem" without naming a code (contract gap CG-9). |
| Contract pin | `1.0.0-SNAPSHOT`. The Ops slice exists only in spec-kitty PR #5881. The contract is re-vendored ONCE, first, by the Projects mission after the slice is merged (operator, 2026-10-08); this mission does not re-vendor and starts from `main` after that lands (FR-041). |
| Fixtures | `OpsInvocationPage.first` (an open Op and a closed one, `hasNextPage` true, `totalCount` 5, `skippedCount` 1), `.last`, `.empty`; `OpsInvocation.open`, `.closed-by-agent`, `.closed-by-doctor-sweep`, `.evidence-null`, `.evidence-repo-path`, `.evidence-url`, `.evidence-url-redacted`, `.evidence-text`, `.evidence-text-redacted`; `OpsRefusal.ops-unreadable`; `PageCursorRefusal.invalid`. |

Response schemas are closed. Fixtures are generated from the contract's own examples (FR-041).

## Contract Gaps (the issue's thirteen, re-derived against the final contract, plus new ones)

Each is raised on spec-kitty#5528 by the orchestrator, or dropped. None is invented around.

| # | Gap | Status and handling |
|---|---|---|
| CG-1 | **Source copy.** The prototype names `kitty-ops/*.jsonl` and "tracked records". The contract says only "the Ops directory" and a closure spine. | Open. The source notice and the state copy use host-neutral words and name no path or format (OQ-6). |
| CG-2 | **Count wording.** "6 newest · 249 total" assumed one fixed page. The contract pages with a cursor and `totalCount` can lag. | Open (presentation). The badge shows the loaded count against `totalCount` and never claims the total is exact (OQ-5). |
| CG-3 | **Mission, Work Package and mode.** The prototype brief restricts rows to id, profile, action, actor, outcome, times and evidence and forbids inferred Mission or Work Package relations. The contract carries `missionId`, `wpId`, `modeOfWork` as plain, non-inferred fields. | Open (design). OQ-1. |
| CG-4 | **Open, abandoned and swept Ops.** The prototype shows only closed `done` and `failed` Ops. | Open. Built from the nearest analogue, listed as drift (DO-5 to DO-7); tones OQ-4. |
| CG-5 | **Evidence none versus withheld.** `evidence` is null for no evidence, for an open Op and when withheld for a credential. Only GitHub tokens, an AWS access key id and a private-key header are detected; other secret shapes are not. | Open. The row cannot tell the cases apart, so its wording must not claim there was none (OQ-3). |
| CG-6 | **Evidence cut and redaction.** The prototype's values are not what the contract serves: a host path arrives as `[path]`. | Closed as to data. The screen shows `value` as given; `redacted` true gets a quiet word (OQ-7). |
| CG-7 | **Skipped records are invisible by design.** Legacy records, a bad closure instant, a credential-shaped `profileId` or `action`, a file named differently from its id and an index entry naming no file are skipped and counted together. | Open. One count; the screen cannot say why or which. |
| CG-8 | **`skippedCount` is not filtered.** With a profile filter active it can exceed what the filtered view could ever show. | Open. The note says "in this project", never "for this profile" (FR-024). |
| CG-9 | **A bad `profile` is a 400 without a stated code.** The `400` response is typed `PageCursorRefusal` (code always `invalid_page_cursor`), while the operation text says a profile failing its pattern is "a 400 problem". The issue says both are `invalid_page_cursor`. | New. The screen cannot assume the code. A first-page 400 is an `error` with the host's `refusalCode`, worded from `defaults/` with a generic fallback (FR-027); a 400 on a later page is the load-more error (FR-029). To raise on #5528. |
| CG-10 | **No profile list and no profile on the page.** The contract has a `profile` query but no read that lists profiles, and the page does not echo the profile it was filtered by. | New. The screen cannot validate a profile and cannot detect a page that answers another profile's request, beyond comparing each item's `profileId` (FR-032). OQ-2 and OQ-8. |
| CG-11 | **Time zone.** The prototype shows UTC; the contract serves an instant with an offset (the example fixtures use `Z`, the prototype's `datetime` carries microseconds). | Open (host question). UTC display, exact string kept in `datetime` (FR-017). |
| CG-12 | **Actor can be null** (R-A). The prototype always shows an actor. | New. A null actor is drawn with a quiet word (FR-014, OQ-3); it cannot tell "not a handle" from "withheld for a credential". |
| CG-13 | **No per-Op detail.** The contract has no read for one Op. | Closed (decided): rows are complete and non-interactive; a detail pane would need a new read. |
| CG-14 | **Provisional parts.** The operation, `totalCount`, `skippedCount`, `evidence` and `OpsRefusalCode` are `x-provisional`; only one refusal code is defined. | Open. Fixtures are regenerated when the vocabulary is tagged; an unknown refusal code shows its generic wording (FR-027). |
| CG-15 | **Static prototype tooling.** The prototype's `data-state-normal` and `data-state-panel` toggles and the "visible fixtures are the six newest records" note are prototype tooling. | Closed (decided): not built (DO-18). |
| CG-16 | **`modeOfWork` `advisory` is a legacy value.** New records no longer write it, old ones carry it. | Open. Shown as the contract names it, with no special treatment. |
| CG-17 | **Issue `now` property is not needed.** The issue lists a host-supplied `now`; the prototype and OQ-9 use absolute UTC times, so no relative time is drawn. | Decided here: no `now` property (a dead property is a frozen surface to carry); OQ-9 confirms. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the newest Ops at a glance (Priority: P1)

A person opens the project's Ops item and sees a read-only list of Op invocation records, newest first: each shows its id, how it
ended (as a word), the profile, action, actor, when it started and completed, and the evidence the closure recorded.

**Why this priority**: it is the whole screen.

**Independent Test**: render the six-row ready story and read the header, notice, count badge, every row and the emitted events.

**Acceptance Scenarios**:

1. **Given** a page of Ops in service order, **When** the screen is `ready`, **Then** the header ("Project", "Ops", "Read only"), the
   source notice, the section heading with the count badge and one row per Op in the order given show, and no row is interactive.
2. **Given** a closed `done` Op, **When** rendered, **Then** the row shows the id in mono, the outcome word with the success tone, and
   the facts Profile, Action, Actor, Started, Completed and Evidence.
3. **Given** the same page, **When** the person tabs through it, **Then** no row takes focus and the screen emits nothing.

---

### User Story 2 - Tell how each Op ended, including the ones that did not end (Priority: P1)

A person can tell a `done`, a `failed` and an `abandoned` Op apart by word and tone, and can tell an Op that is still open from one
that closed, and an Op the agent closed from one a doctor sweep closed.

**Why this priority**: the outcome is the point of the list.

**Independent Test**: render one row of every outcome, an open row, an agent-closed row and a swept row.

**Acceptance Scenarios**:

1. **Given** an open Op, **When** rendered, **Then** the badge says "open", no outcome is claimed, and Completed and Evidence say they
   are not recorded yet.
2. **Given** an Op with `closedBy` `doctor_sweep`, **When** rendered, **Then** one extra fact states that a sweep closed it, and
   Completed is the closure instant.
3. **Given** an outcome, closer or mode the screen has never seen, **When** rendered, **Then** the raw word shows with the neutral
   tone and nothing is dropped.

---

### User Story 3 - Read the evidence safely (Priority: P1)

A person reads the evidence of a closed Op as text. It is never a link, never loaded and never resolved, whatever its class; a value
the contract changed says so.

**Why this priority**: evidence is the part most likely to hold hostile or sensitive-looking text.

**Independent Test**: render each evidence class, a redacted value, a 512-character value and a hostile value (markup, a `javascript:`
address, a long unbroken token); assert the structural walk of the produced template finds no anchor, image or loading element.

**Acceptance Scenarios**:

1. **Given** evidence of any class, **When** rendered, **Then** `value` shows in mono as plain text and the class is a quiet label.
2. **Given** `redacted` true, **When** rendered, **Then** the `[path]` or `[email]` markers show as given and a quiet word says the
   value was changed.
3. **Given** `evidence` null, **When** rendered, **Then** the row says nothing is shown, without claiming none was recorded.

---

### User Story 4 - Page through a long history (Priority: P1)

A person loads further pages with "Load more" and sees how many records they have loaded against how many there are.

**Why this priority**: a project can have hundreds of Ops (the prototype's own fixture says 249).

**Independent Test**: render a first page, a loading-more page, a last page and a 200-row page; activate "Load more" repeatedly and
assert one request per cursor.

**Acceptance Scenarios**:

1. **Given** `hasNextPage` true, **When** the person activates "Load more", **Then** `sk-load-more` is emitted with
   `{ cursor }` once, and not again for that cursor until `loadingMore`, `items` or `pageInfo` changes.
2. **Given** `loadingMore` true, **When** rendered, **Then** the control is busy and inert and the loaded rows stay.
3. **Given** the last page, **When** rendered, **Then** no "Load more" shows and the loaded count equals `totalCount` unless the total lags.

---

### User Story 5 - Know what is missing (Priority: P2)

A person is told how many records were skipped because they could not be read, and that they are not shown.

**Why this priority**: the contract promises that skipped records are counted, never silent.

**Independent Test**: render `skippedCount` 0, 1 and many, with and without rows.

**Acceptance Scenarios**:

1. **Given** `skippedCount` above 0, **When** rendered with rows, **Then** one quiet note below the list states the count and that the
   records are not shown.
2. **Given** `skippedCount` 0, **When** rendered, **Then** no note shows.
3. **Given** no readable records and `skippedCount` above 0, **When** rendered, **Then** the empty state names the skipped count.

---

### User Story 6 - Every state keeps the frame (Priority: P2)

A screen that is loading, empty, failed, failed halfway through paging or refused keeps the shell frame and says what happened, with
retry where retry can help.

**Why this priority**: every screen shows these states, and paging adds two partial ones.

**Independent Test**: one story per state and tier.

**Acceptance Scenarios**:

1. **Given** the view state `loading`, `empty` or `error`, **When** rendered, **Then** the state's own content replaces the list only.
2. **Given** a load-more failure, **When** rendered, **Then** the loaded rows stay and a regional notice with a retry shows.
3. **Given** a refused page cursor, **When** rendered, **Then** the loaded rows stay and the notice offers "Refresh from the newest".

---

### User Story 7 - The screen follows the data, not the pipeline (Priority: P2)

A later Mission will shape lanes, phases and Op vocabularies from the charter and doctrine packs. Every outcome, status, closer, mode and
evidence-class word, and every profile and action, renders whatever value arrives.

**Why this priority**: the operator's binding FUTURE CONSTRAINT.

**Independent Test**: render Ops whose outcome, closer, mode and evidence kind are values the screen has never seen, and profiles and
actions the screen has no literal for, with the data-driven gate green.

**Acceptance Scenarios**:

1. **Given** an unknown outcome, **When** rendered, **Then** the raw word shows with the neutral tone, labelled by the label hook if one
   exists.
2. **Given** any profile id and action, **When** rendered, **Then** they show as given in mono with no enumeration anywhere.

### Edge Cases

- **Profile and action are open text**: never an enumeration; a 128-character profile and a long action show as given.
- **Unknown vocabulary** (outcome, closer, mode, evidence kind): raw word, neutral tone, never dropped, never branched on. An unknown or null refusal code shows the generic error sentence (FR-027); the code itself is only the invisible `data-error-code` attribute.
- **A closed Op with a null `outcome`** (not produced by the contract, defensive): the status word "closed" with the neutral tone.
- **An open Op carrying an `outcome`, `closedBy` or `evidence`** (not produced by the contract, defensive): the screen draws what it
  was given and does not reconcile the fields.
- **`actor` null** (R-A): the Actor fact shows a quiet word, never blank (FR-014).
- **`missionId` and `wpId` null**: those facts are not drawn (OQ-1).
- **Evidence `value` of 512 characters** and **a very long unbroken token** wrap inside the row and never widen it (FR-020).
- **Bidirectional controls in evidence text** (an override character can visually reorder text): every item-derived value is isolated in a `bdi`; no notice is drawn (the profile, action and actor patterns exclude such characters, so only evidence text can carry them); whether to add #7's notice is a CP-1 question.
- **Redaction markers** (`[path]`, `[email]`) are shown verbatim; a literal bracket pair in text is not special.
- **A hostile `value`** (markup, an address with a script scheme, bidirectional controls, a leading `=`): inert text; no element is
  built from it. The check is structural (NFR-005).
- **`totalCount` smaller than the loaded count** (the total lags, or an Op was removed): shown as given; the screen does not clamp,
  correct or flag it, and never shows "loaded of total" with a loaded count above the total as an error (FR-022).
- **`hasNextPage` true with `nextPageCursor` null** (inconsistent): no "Load more" (nothing to request).
- **`hasNextPage` false with a cursor present**: no "Load more".
- **Two pages with an overlapping id** (an Op appended between reads shifts the pages): the screen shows what the host passed; it never
  de-duplicates, sorts or merges (the host owns the accumulation).
- **200 rows on a page and several pages**: plain DOM, no virtualization; the page scrolls, never the screen.
- **Large text**: at a root font size of 200% the rows reflow with no horizontal overflow caused by the screen.
- **Empty with a profile filter**: "No records for this profile" (a profile that matches nothing is an empty page, not an error).
- **`status` `ready` with zero `items` and `totalCount` above 0** (a page the host has not filled): drawn as ready with no rows and
  the badge as given; the host's job to send `empty` or `loading`.
- **The view state `loading` while rows are loaded** (the host re-reads): the loading state replaces the list; rows are not kept
  (only load-more keeps rows, through `loadingMore`).

## State Matrix and Acceptance

Each row is one Storybook story and one visual baseline: dark theme, 1280 px unless the row names a tier, synthetic fixtures, rendered
inside the mission shell's project layout with `flush`. "Prototype source" names the prototype element on `07-ops.html` (default,
`?state=empty`, `?state=loading`, `?state=error`); "None" means the prototype has no such state and the row is built from the named
analogue, with the drift listed in the Visual Drift Register.

| ID | State | Prototype source | Pass condition (Given / When / Then) | Event asserted |
|---|---|---|---|---|
| OP-01 | Ready, six rows newest first, count badge, source notice, "Read only" badge | `07-ops.html` default: six records, badge "6 newest · 249 total" | Given six Ops and `totalCount` 249; Then header, notice, heading, badge and rows show in the order given | none |
| OP-02 | Row, closed `done` by the agent: success word; facts Profile, Action, Actor, Started, Completed, Evidence | `invocation-row` (`done`) | Then the outcome word "done" carries the success tone and the six facts show in that order | none |
| OP-03 | Row, closed `failed`: danger tone with the word | row `failed` (`01M02TF0...`) | Then "failed" carries the danger tone and the word | none |
| OP-04 | Row, closed `abandoned`: attention tone with the word | None; nearest OP-03 | Then "abandoned" carries the attention tone (OQ-4) | none |
| OP-05 | Row, `open`: status word "open", outcome absent, Completed and Evidence say not recorded yet | None; nearest the "Not recorded" evidence line | Then the badge says "open" in the neutral tone and no outcome word shows | none |
| OP-06 | Row closed by `doctor_sweep`: closer stated, `completedAt` is the closure instant | None; nearest OP-02 plus one fact | Then a "Closed by" fact reads "sweep" (words from `defaults/`) and Completed shows the instant | none |
| OP-07 | Evidence null | prototype "Not recorded" | Then the Evidence fact shows the quiet null wording (OQ-3), never blank, never "none" | none |
| OP-08 | Evidence `repo_path` | prototype evidence `kitty-ops/<id>.review3.yaml` | Then the value shows in mono as plain text; no link | none |
| OP-09 | Evidence `text`, wrapped, up to 512 characters | prototype `blockers=cursor_provenance,...` | Then the full value wraps inside the row; the row width is unchanged | none |
| OP-10 | Evidence `url`: shown as text, not a link | None; nearest OP-09 | Then no anchor element exists and the address is plain text | none |
| OP-11 | Evidence `redacted` true: `[path]` and `[email]` visible, quiet "changed" word | None; nearest #7 AV-08 | Then the markers show as given and the quiet word shows with an accessible explanation (OQ-7) | none |
| OP-12 | Mission and Work Package facts present and absent | None; OQ-1 | Then, per OQ-1, `missionId` and `wpId` show in mono when non-null and the facts are absent when null | none |
| OP-13 | Mode of work word | None; OQ-1 | Then each of the four modes shows as its word (from `defaults/`, raw fallback) | none |
| OP-14 | Times: UTC with the exact instant in `<time datetime>`; a source offset converted | `22 Aug 2026, 09:29:46 UTC` | Given `startedAt` with a `+02:00` offset; Then the text is the UTC instant and `datetime` is the served string | none |
| OP-15 | Count badge: loaded against total, the "may lag" caveat not shown as an error | "6 newest · 249 total" | Then "6 of 249" (OQ-5) and nothing flags a lag | none |
| OP-16 | `hasNextPage` true: "Load more"; `loadingMore`: busy, one request per cursor | None; the Missions "Load more" from #4 | Then activation emits `sk-load-more` `{ cursor }` once; the second activation emits nothing until the host changes a property; busy is inert | `sk-load-more` |
| OP-17 | Last page: no "Load more" | None; as OP-16 | Then no control shows and the badge reads loaded equals total | none |
| OP-18 | Skipped records note | None; nearest the prototype's secondary source notice | Given `skippedCount` 3; Then "3 records in this project could not be read and are not shown" (words from `defaults/`) | none |
| OP-19 | Empty, no records | `?state=empty` | Then "No invocation records" and neutral-copy sentence; no list, no badge | none |
| OP-20 | Empty with `skippedCount` above 0 | None; nearest OP-19 plus OP-18 | Then the empty state names the skipped count | none |
| OP-21 | Empty with an active `profile` | None; nearest OP-19 | Then "No records for this profile" names the profile in mono (OQ-2) | none |
| OP-22 | Loading the first page | `?state=loading`: indeterminate progress, "Reading local invocation records", `aria-busy` | Then the progress and the sentence show; `aria-busy` is true; no list | none |
| OP-23 | Error, 500 `ops_unreadable`: no rows, retry | `?state=error`: `role="alert"`, "Invocation records unavailable" | Then the alert names the failure in words (no path), no rows, a retry; activation emits `sk-retry-load` `{ target: 'ops-page' }` | `sk-retry-load` |
| OP-24 | Error while loading more: loaded rows kept, regional error with retry | None; nearest OP-23 | Then rows and the badge stay; the notice has a retry that emits `{ target: 'ops-page', cursor }` | `sk-retry-load` |
| OP-25 | Refused cursor (400 `invalid_page_cursor`): rows kept, "Refresh from the newest" | None; nearest OP-24 | Then rows stay and the action emits `{ target: 'ops-page' }` with no cursor | `sk-retry-load` |
| OP-26 | Unknown outcome, closer, mode or evidence kind (a refusal code shows the generic error sentence, FR-027) | None; rule from #4 | Then the raw word with the neutral tone; nothing dropped | none |
| OP-27 | Long texts: 512-character evidence, 128-character profile, long action, very long unbroken token | None; E-21 and the shared pill ellipsis rule | Then no horizontal overflow; pills ellipsize from the one shared rule with the full text in `title` and the accessible name | none |
| OP-28 | Many rows: 200 on a page, several pages | None; plain DOM | Then the screen renders and re-renders within NFR-006 | none |
| OP-29 | Focus order and focus ring | None; rules from #4 | Then the order is header, Load more or its error actions; rows are not tab stops | none |
| OP-30 | Collapsed tier, 1100 px | breakpoint 1100 px | Then the screen sits in the collapsed shell with no overflow | none |
| OP-31 | Narrow tier, 800 px: facts in one column | breakpoint 800 px (`invocation-facts` one column) | Then facts stack in one column | none |
| OP-32 | Mobile tier, 620 px and below: head stacks, single column | breakpoint 620 px (`invocation-head` column) | Then the head stacks and the page header stacks | none |
| OP-33 | Actor null (R-A) | None; nearest OP-07 | Then the Actor fact shows the quiet word, never blank | none |
| OP-34 | (NOT BUILT: ruled OQ-2 (a), no chip) | None | The host-passed `profile` shows as one quiet mono fact in the heading; no control, no event | none |
| OP-35 | Profile disagreement: `profile` set and an item whose `profileId` differs | None; the selection-agreement rule of #7 | Then the page counts as NOT LOADED (the loading look) and announces nothing for it (FR-032) | none |
| OP-36 | Header and notice in each non-ready state | `?state=` variants | Then header and source notice stay in `loading`, `empty` and `error`, as the prototype shows | none |
| OP-37 | Zero count: `totalCount` 0 with `items` empty and `ready` | `?state=empty` | Then as OP-19 (the empty look wins over a ready look with no rows) | none |

### Event interaction checks

Every event bubbles and is composed, is declared once with `@fires` and is typed; names are verb-noun.

| Check | Trigger | Asserted event and payload |
|---|---|---|
| EV-1 | "Load more" with `hasNextPage` and a cursor | `sk-load-more` `{ cursor }`: the same event and the same detail type as the Missions screen's; once per cursor until `loadingMore`, `items` or `pageInfo` changes |
| EV-2 | "Load more" while `loadingMore`, with no cursor, or on the last page | nothing |
| EV-3 | Retry on the first-page error | `sk-retry-load` `{ target: 'ops-page' }` |
| EV-4 | Retry on a load-more error | `sk-retry-load` `{ target: 'ops-page', cursor }` (the cursor that failed) |
| EV-5 | "Refresh from the newest" (refused cursor) | `sk-retry-load` `{ target: 'ops-page' }`, no cursor |
| EV-6 | A row, an id, an evidence value, a time | nothing: rows have no action |
| EV-7 | (NOT BUILT: ruled OQ-2 (a)) The active profile fact | nothing: it has no control |
| EV-8 | Focus, hover, scroll | nothing |

## Requirements *(mandatory)*

### Functional Requirements

| ID | Title | Requirement | Priority | Status |
|----|-------|-------------|----------|--------|
| FR-001 | Element and public surface | One element `sk-ops-screen` in `@spec-kitty/mission-ui` takes twelve properties: `items` (`OpsInvocation[]`, the loaded Ops in service order), `pageInfo`, `totalCount`, `skippedCount`, `profile` (string or null, the active filter the host applied), `status` (`loading`, `error`, `empty`, `ready`), `loadingMore`, `loadMoreError` (null, or an object `{ code }` with the refusal code or null), `refusalCode` (the first-page refusal code or null) and `labels` (label hooks), `errorMessage` and `project` (the contract `Project` or null; its name is the muted line of the header, and no line is drawn when it is null or its name is empty; added at the 2026-10-11 ruling, so the surface is twelve properties). The plan finalises the list before the surface freeze; the frozen surface is asserted by the surface test (FR-042). Unknown `status` values collapse to `empty`, as every screen | High | Open |
| FR-002 | Contract-shaped inputs | `items` uses the contract's field names exactly (`invocationId`, `profileId`, `action`, `actor`, `modeOfWork`, `startedAt`, `missionId`, `wpId`, `status`, `outcome`, `closedBy`, `completedAt`, `evidence`); no view-type field is renamed, translated or given a lane-like name. The screen performs no write and never mutates its inputs | High | Open |
| FR-003 | Page header | Eyebrow "Project", the title "Ops", a muted line naming the project (shell-supplied, never a literal), and a "Read only" badge. The skip link "Skip to Ops" belongs to the shell. The header stays in every state (OP-36) | High | Open |
| FR-004 | Source notice | One neutral `sk-notice` states that the records are read from the project's Ops directory, newest first, and that viewing Ops never invokes an agent. The copy is host-neutral and names no path pattern or file format (CG-1, OQ-6); it comes from `defaults/` or `labels` | High | Open |
| FR-005 | Section heading and count badge | Eyebrow "Invocation records", heading "Newest records", and a badge with the loaded count against `totalCount` (OQ-5). The screen counts `items.length` and prints `totalCount` as given; it does no other arithmetic and never claims the total is exact. The badge is absent in `loading`, `empty` and `error` | High | Open |
| FR-006 | Rows | One `invocation-row` per item, in the order given: a head (the id in mono, then the outcome or status badge) and a facts list. The row is a plain list item: no click, focus, hover or active style, no role of button or link, no tab stop (EV-6). The prototype's row hover rule changes nothing and is not built | High | Open |
| FR-007 | Facts | In order: Profile, Action, Actor, Started, Completed, Evidence, each with a term and a value. Profile, Action and Actor values are mono and shown as given. A fact that has no data draws its quiet word (FR-014), never a blank, except Mission, Work Package and mode, which are absent when null (OQ-1) | High | Open |
| FR-008 | Outcome badge | A closed Op shows its `outcome` word as the badge: `done` success, `failed` danger, `abandoned` attention (OQ-4), in the shared pill; the word is always present (NFR-011). Words and tones come from `defaults/` and are overridable through `labels`; a value not in the table shows raw with the neutral tone (OP-26) | High | Open |
| FR-009 | Open Op | An Op whose `status` is `open` shows the status word "open" (neutral) in place of an outcome; Completed and Evidence say not recorded yet. The screen never infers staleness, a stuck Op, a duration or a "running" state | High | Open |
| FR-010 | Swept Op | An Op with `closedBy` `doctor_sweep` shows one extra fact "Closed by" with the word "sweep" (OQ-4); an agent-closed Op shows no closer fact (the prototype shows none), unless the closer is an unknown value, which shows raw. `completedAt` is shown as given, with no statement about when the work ended | High | Open |
| FR-011 | Mode of work | Per OQ-1: a "Mode" fact with the mode word from `defaults/` (raw fallback) | High | Open |
| FR-012 | Mission and Work Package facts | Per OQ-1: "Mission" and "Work Package" facts with `missionId` and `wpId` in mono as given, only when non-null. The screen does not resolve a Mission name, does not link to the Mission or Work Package, and emits no event for them (a link would be an inferred relation and a row action) | High | Open |
| FR-013 | Evidence rendering | Every evidence class renders `value` as text in mono, inside the row, wrapped; the class (`repo_path`, `url`, `text`, or an unknown raw value) is a quiet label from `defaults/`. Never an anchor, an image, a `src`, an `href`, an `iframe` or any element that could load, and no event. A `repo_path` is not resolved and its existence is not checked (OQ-3 for the null wording) | High | Open |
| FR-014 | Null wording | An absent value says so in a quiet word from `defaults/`: evidence null, a null actor, a null `completedAt` on an open Op. The evidence and actor wording must not claim "none recorded" because null also means withheld (CG-5, CG-12; OQ-3) | High | Open |
| FR-015 | Redacted evidence | When `evidence.redacted` is true, a quiet word ("changed", OQ-7) sits beside the value with the explanation in its accessible description ("host paths and e-mail addresses are replaced, or the text was cut"). The markers `[path]` and `[email]` show as given. The word is absent when `redacted` is false | Medium | Open |
| FR-016 | Evidence cut | A 512-character value is shown in full; the screen does not truncate, ellipsize or expand it. It wraps (FR-020) | High | Open |
| FR-017 | Times | `startedAt` and `completedAt` render in UTC as `22 Aug 2026, 09:29:46 UTC` (the prototype's form, seconds always shown) inside `<time class="mono" datetime="...">`, where `datetime` is the served string exactly. A source offset is converted to UTC for the text. A value that cannot be parsed shows as given with no `datetime`. A label hook may reword the text; the exact instant stays in `datetime` | High | Open |
| FR-018 | No clock | The screen has no `now` and draws no relative time. It reads no clock: parsing a served instant (`Date.parse`) is allowed, `Date.now()` and `new Date()` with no argument are not (NFR-005) | High | Open |
| FR-019 | Ids and machine values | The id, profile, action, actor, evidence value, `missionId` and `wpId` are mono. They are never linked, never copied by a control, never branched on | High | Open |
| FR-020 | Wrapping | Words-only wrapping from #4 (E-21): a pill ellipsizes with its full text in `title` and the accessible name. A fact (its term, its value, its evidence labels and the section-heading profile) wraps and never ellipsizes, at any text size (operator ruling A11Y-001); the id and the evidence value, which are one unbroken token by nature, wrap anywhere inside the row (DO-13, E-43). A status badge keeps its natural width and ellipsizes only when its word is wider than the row (Ops G-7). Every pill uses the one shared ellipsis rule | High | Open |
| FR-021 | Load more | When `pageInfo.hasNextPage` is true and `pageInfo.nextPageCursor` is non-null, a secondary busy-capable `sk-button` "Load more" (the Missions screen's look) shows below the rows; activation emits `sk-load-more` `{ cursor }` with `SkLoadMoreDetail`, once per cursor until `loadingMore`, `items` or `pageInfo` changes (EV-1, EV-2). While `loadingMore` it is busy and inert and its row has `aria-busy` true. The screen never fetches | High | Open |
| FR-022 | Count display rules | `totalCount` smaller than the loaded count is shown as given. The badge reads like "6 of 249"; when the loaded count equals `totalCount` it may read "249 records" (OQ-5). A "records may be missing from the total" caveat is not shown by default (issue Q7) | Medium | Open |
| FR-023 | End of list | On the last page there is no "Load more" and nothing says "end". The badge carries the state | Low | Open |
| FR-024 | Skipped note | When `skippedCount` is above 0, one quiet `sk-notice` below the list (and in the empty state) states the count and that those records are not shown ("N records in this project could not be read and are not shown", singular handled in `defaults/`). It says "in this project", never "for this profile" (CG-8). It is not an error and not a warning tone. It states no reason (CG-7) | High | Open |
| FR-025 | Empty state | `status` `empty` shows "No invocation records" with a neutral sentence (no path), in the frame. With a non-null `profile` the headline reads "No records for this profile" and names the profile in mono (OP-21, OQ-2); otherwise the plain wording. Whenever `skippedCount` is above 0 the skipped sentence is shown in the "in this project" wording, so the count is never hidden (OP-20; CP-1). With a profile it is two sentences with the profile code between them (headline sentence, the profile, then the skipped sentence; OP-21a); without a profile it follows the headline in the one paragraph | High | Open |
| FR-026 | Loading state | `status` `loading` shows the indeterminate library progress "Reading invocation records" and a sentence that no agent is invoked, with `aria-busy` true on the region; no rows, no badge | High | Open |
| FR-027 | Error state | `status` `error` shows a `role="alert"` danger `sk-notice` "Invocation records unavailable" with a host-neutral sentence and "No invocation rows are shown", and a retry. The sentence is chosen by `refusalCode` from `defaults/` (every code, `ops_unreadable` included, shows the generic sentence; the lookup is a table of code to copy key that a test can inject, as the CP-1 copy ruling and the pre-merge squad ruling of 2026-10-11 left it; an unknown or null code shows the generic one) and may be overridden by `errorMessage`. No path, directory or record content is shown | High | Open |
| FR-028 | Retry | The first-page retry emits `sk-retry-load` with `{ target: 'ops-page' }` (EV-3). The screen carries no Mission, so this member has no `missionId`; the shared union in the retry-types module is extended with its own member, never redeclared | High | Open |
| FR-029 | Load-more error | When `loadMoreError` is non-null the loaded rows and the badge stay, "Load more" is replaced by a regional `sk-notice` with a retry; activation emits `{ target: 'ops-page', cursor }` with the cursor of the failed page (EV-4). The wording is generic ("The next records could not be loaded") | High | Open |
| FR-030 | Refused cursor | When `loadMoreError.code` is `invalid_page_cursor`, the rows stay and the notice says the position is no longer valid and offers "Refresh from the newest", which emits `{ target: 'ops-page' }` with no cursor (EV-5); the host restarts at the first page. The word is read from `defaults/`; any other code uses FR-029 | High | Open |
| FR-031 | Active profile | When `profile` is non-null the screen shows it as one quiet mono fact in the section heading ("Profile: ..."), ruled OQ-2 (a). No chip, no clear event, no filter control, search or sort in v1 | Medium | Open |
| FR-032 | Data agreement | A page whose items include a `profileId` different from a non-null `profile` counts as NOT LOADED (the loading look; nothing announced for it), as #7's selection agreement does, so a late page of an earlier request is never drawn as the current one. The comparison is exact string equality (OQ-8 asks whether to enforce it, since the contract does not say whether the service matches case-insensitively). With a null `profile` no check is made | Medium | Open |
| FR-033 | Announcements | One polite live region announces what is SHOWN: loading, "{loaded} of {total} records loaded" (ready), "No invocation records" (empty), "Loading more records" (while a load-more is busy), "N more records loaded" (after a load-more), and the load-more error. The error state is `role="alert"` and not duplicated in the region. A property refresh that shows the same thing announces nothing; a late page that agrees is announced once; a mismatched page (FR-032) announces nothing. A page counts as the same page when its first record id and its next-page cursor are both unchanged; any other change of the first id, the cursor or the row count is announced. It is announced as "N more records loaded" when the first record is unchanged and the rows grew (a load-more always moves the cursor, so the cursor does not decide this), and otherwise as "{loaded} of {total} records loaded" | High | Open |
| FR-034 | Focus | Focus is captured on every update that replaces the focused control: after "Load more" is activated and the new rows arrive, focus stays on the control while it is busy; when the control is replaced (a load-more error, or the last page), focus moves to the section heading (CP-1 S-O4, the pre-merge squad ruling of 2026-10-11); after a state change that removes the focused control, focus moves to the new region's heading, which is programmatically focusable (`tabindex="-1"`), only when focus was inside the screen or on the body. Rows are never focus targets. The documented order is: Load more or the load-more error actions, retry | High | Open |
| FR-035 | Keyboard | Every control (Load more, retry, Refresh) is reachable by Tab, activates with Enter and Space, has a visible focus ring and creates no trap. The number of tab stops equals the number of controls shown; rows add none | High | Open |
| FR-036 | Text never colour-only | Every state carries its word in the DOM: outcome, status, closer, mode, evidence class, redacted, skipped, error. A tone only reinforces | High | Open |
| FR-037 | Tiers | The shell owns the tier. The screen's own collapses follow the prototype: facts in one column at the 800 px breakpoint, the row head and the section heading stacked at 620 px. They use content-cell container thresholds derived at plan from the shell's real content widths (as #5 DW-24 did), plus `ShellTierController` with `:state(shell-mobile)` where the shell's mobile tier is needed. The screen calls `attachInternals` only through the controller | High | Open |
| FR-038 | Data-driven vocabulary | All words, tones and copy of the screen are in `src/defaults/` (a new `ops-copy` module, exported from `defaults/index.ts`) or in `labels`: outcome, status, closer, mode, evidence-class, redacted, null, skipped, count, empty, loading, error and refusal wording. No contract word of the Ops vocabularies appears outside `defaults/` and `src/contract/`; no view-type field is named like one. `profileId` and `action` are open text with no literal. The `data-driven` gate learns the Ops vocabularies from the vendored schemas as #5's ARCH-006 did (the underscored and rare members are matched as literals; the bare common words `open`, `closed`, `agent`, `query`, `text`, `url`, `failed`, `advisory` are matched only in a comparison or case label), with plants for each (NFR-009) | High | Open |
| FR-039 | Pure helpers | `logic/` gains pure, tested helpers: the row view-model from `OpsInvocation` (outcome word and tone, status word, evidence class word and display, started and completed words, closer word, which facts are drawn), the UTC time formatter (FR-017), the count text and the announcement text. They take the vocabulary as input with `defaults/` as the default, hold no state and do no I/O | High | Open |
| FR-040 | Shell wiring | The shell's project layout "Ops" item (the nav item `nav-ops` and the rail item) gets the screen as content with `flush`; the existing shell baselines stay untouched (as #5's P-4); this mission's own stories show the screen as shell content in `shellFrame`. The nav item is a one-line shell touch that serialises with the Drift screen's (the second to land rebases) | Medium | Open |
| FR-041 | Contract vendoring and fixtures | The contract is re-vendored once, first, by the Projects mission after spec-kitty PR #5881 merges; this mission verifies the pin is `main` and holds the Ops slice (it vendors nothing) and keeps `contract:check --require-main` green before merge. Generated types gain the Ops types. Fixtures are generated from the contract's examples (`OpsInvocationPage.first`, `.last`, `.empty`, the nine `OpsInvocation` examples, `OpsRefusal.ops-unreadable`, `PageCursorRefusal.invalid`) plus named overlays: a row of every `outcome`, `closedBy`, `modeOfWork`, evidence kind and redaction; a null-actor row; null Mission and Work Package; a 512-character evidence value; a hostile evidence value; an unknown outcome, closer, mode and kind; a 128-character profile and a long action; a `+02:00` source offset; a page with `hasNextPage` and a last page; a 200-row page. Overlays use only synthetic values (NFR-007) and are checked against the contract schema except where an overlay deliberately carries a foreign vocabulary value (named relaxation, as #5) | High | Open |
| FR-042 | Manifest and surface freeze | The custom-elements manifest is regenerated with `manifest:generate` and `manifest:check` is green; the surface test gains `sk-ops-screen` (properties, attributes, defaults, event names) so a later change fails there; `src/index.ts` and `src/defaults/index.ts` each gain their one-line export | High | Open |
| FR-043 | Exceptions | Local overrides (the facts grid track minimum, the evidence and id wrapping, and any row frame the card spike proves) are numbered exceptions in the range E-40..E-43 in `contracts/gates.md` and in the PR description, each with scope, rationale, a Stylelint or ESLint proof case and a sunset tied to a spec-kitty-design issue (a record-row or facts element is the likely one) | High | Open |
| FR-044 | Stories and baselines | One Storybook story per matrix row, an interaction test for every event of the event table, and visual baselines committed only in the final work package | High | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Gates stay green | Typecheck, ESLint, Stylelint, `no-io`, `data-driven`, `contract`, `manifest`, hygiene, Storybook build, unit and interaction tests and gate-proof pass with 0 findings on the pull request. | Quality | High | Open |
| NFR-002 | Visual stability | Every baseline of the state matrix gives 0 visual failures across 5 consecutive runs on an unchanged commit, at the tiers each row names. | Reliability | High | Open |
| NFR-003 | Keyboard reachability | 100% of controls are reachable and operable by keyboard alone in every tier, in no more tab stops than controls shown; a row is never a tab stop. | Accessibility | High | Open |
| NFR-004 | Large text | At a root font size of 200% the screen causes no horizontal overflow of the content area at 1100 px and 720 px. | Accessibility | Medium | Open |
| NFR-005 | No I/O, no loadable evidence | The `no-io` gate reports 0 violations: no fetch, XHR, WebSocket, Tauri API, browser storage, timer, `Date.now()` or navigation in the screen, its parts or `logic/`. A structural walk of the produced template for every evidence fixture, including the hostile one, finds 0 anchor, image, `src`, `href`, form, script, style, iframe or other loading element built from `value`, and 0 network requests (corroborated by a CSP and a resource-load observation with a positive control, as #7). | Security | High | Open |
| NFR-006 | Render responsiveness | With 200 rows on a page and 1,000 rows loaded across pages, the screen renders and re-renders on a property change in 200 ms or less (1,000 rows: 500 ms or less) in the interaction test environment, with no virtualization. | Performance | Medium | Open |
| NFR-007 | Fixture hygiene | 0 fixture values contain an absolute filesystem path, a real e-mail address, a credential-shaped string or the executing account's username; actors only from the synthetic allow-list; the hostile evidence fixture holds inert synthetic text. Checked by the hygiene and `contract` gates. | Security | High | Open |
| NFR-008 | Prototype fidelity | 0 unapproved visual differences from `07-ops.html` and its three `?state=` variants in the side-by-side review of each baseline; any drift not in the confirmed Visual Drift Register is a REJECT. | Quality | High | Open |
| NFR-009 | Data-driven gate extended | The `data-driven` gate (FR-038) reports 0 violations: no Ops contract word outside `defaults/` and `src/contract/`; the plants prove each new word is caught; the profile and action have no literal. | Quality | High | Open |
| NFR-010 | Contract gate covers the Ops slice | The `contract` gate reports 0 findings: pin equal to `main` (the `--require-main` check), generated types and fixtures fresh, every fixture producible by the contract. | Quality | High | Open |
| NFR-011 | Text never colour-only | 100% of states (outcome, status, closer, mode, evidence class, redaction, skipped, error) carry a text form in the DOM. | Accessibility | High | Open |
| NFR-012 | Contract rulings proved | One test per ruling R-A to R-E: a null-actor Op is served in `items` and draws the quiet word; a page whose `skippedCount` is above 0 shows the note and none of the skipped records exist in the DOM (the contract withholds them; the test uses fixtures, it cannot assert the service); a redacted evidence shows its markers verbatim; a swept Op reads closed; an Op is never drawn open when its `status` is `closed`. | Quality | High | Open |
| NFR-013 | Live-region discipline | An interaction test per announcement of FR-033, including the no-announcement cases (same content, mismatched page), asserts the live region's text and count of changes, including "Loading more records" once per busy period and the page-identity rule (an unchanged first id, cursor and row count announces nothing; a longer list with the same first id says "N more records loaded"; a list with another first id says "{loaded} of {total} records loaded"). | Accessibility | Medium | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Screen contract | Data in as properties typed from the Mission Status contract; view state in as a property; intent out as `sk-*` CustomEvents that bubble and are composed; no I/O (charter, "The screen contract"). | Technical | High | Open |
| C-002 | Contract basis | Types are generated from the vendored contract at a recorded pin; response schemas are closed; provisional parts are consumed as defined (CG-14). | Technical | High | Open |
| C-003 | Read-only | No write, no agent invocation, no rerun, retry-the-Op, open or approve; the prototype brief forbids commands, mutation controls, severity, rankings and inferred relations. A retry event asks the host to read again; it is never an action on an Op. | Product | High | Open |
| C-004 | No arithmetic | No counting beyond `items.length`; `totalCount` and `skippedCount` are shown as given; no percentage, rate, duration or age. | Product | High | Open |
| C-005 | Elements over CSS | Every primitive the library provides (notice, pill tag, button, progress, section header, card or row if proved) is that `sk-*` element; project CSS is layout with `--sk-*` tokens only; a missing primitive is a component gap for the design library, or a numbered exception. | Technical | High | Open |
| C-006 | Prototype is the visual authority | `07-ops.html` is the visual source of truth; only confirmed drift is allowed. The Ops page has no Stitch reference; its approval is the earlier visual approval recorded in the prototype's `states.html` and the issue (OQ-10 asks the operator to reconfirm it is still current). | Design | High | Open |
| C-007 | Data-driven pipeline | See "The dynamic-pipeline constraint". | Technical | High | Open |
| C-008 | Fixtures and risk boundaries | Synthetic fixtures: no real user data, absolute paths, usernames or secrets (charter, "Risk boundaries"). The prototype's own record ids and values are the visual reference; synthetic ids replace them in fixtures. | Security | High | Open |
| C-009 | Terminology | "Mission" everywhere, never "feature"; "Op" for the invocation record; "sweep" for `doctor_sweep` in copy. | Product | Medium | Open |
| C-010 | Shell dependency | The screen renders inside the app shell (`sk-mission-shell`, with `flush`); the shell owns the top bar, rail, project sidebar, tiers and skip link. | Scope | High | Open |
| C-011 | Review and governance | Pull request into `main`; the operator merges; every work package is reviewed by a separate reviewer; the adversarial squad runs after the plan phase only (not after specify); the operator reviews Storybook after the last work package and before wrap-up. | Governance | High | Open |
| C-012 | Stacking | This mission builds on mission-ui#4 and #5 (merged) and reuses the shell, `defaults/`, the vendored contract, the gates and the exception approach. It uses #7's neutral `retry-types.ts` if #7 has landed by then; otherwise it extends the union where #5 left it and #7 rebases (a plan fork). | Scope | High | Open |
| C-013 | Parallel work | Projects, Drift and Ops have disjoint new files. Three shared touches serialise: the contract re-vendor (once, first), the one-line exports in `src/defaults/index.ts` and `src/index.ts`, and the shell nav items (this screen and Drift each add one). Exception numbers are allocated across the three missions: this one owns E-40..E-43. | Scope | High | Open |
| C-014 | Private repository, public bundle | The repository is private; the built bundle becomes public once vendored. Nothing committed names an absolute home path or an OS username. | Security | High | Open |

### Key Entities *(include if the mission involves data)*

- **OpsInvocationPage** (contract): `items`, `pageInfo`, `totalCount`, `skippedCount`. The host accumulates pages and passes the
  accumulated `items` with the last page's `pageInfo`; the screen shows what it is given.
- **OpsInvocation** (contract): thirteen members (above). The screen's row view-model is derived from it by a pure function and never
  stored.
- **OpsEvidence** (contract): `kind`, `value`, `redacted`.
- **Ops vocabulary** (screen data in `defaults/`): outcome, status, closer, mode and evidence-class words and tones, count, notice,
  empty, loading, error and refusal wording. Overridable through `labels`.
- **Load-more error** (screen input): `{ code }` or null.

## Visual Drift Register (PROPOSED: confirmed by the operator at CP-1)

Drift from `07-ops.html` is a REJECT unless it is listed here and confirmed. Ids are `DO-n`. "Confirm" means the operator confirms the
drift at CP-1; "keep" means no drift, listed so the review checks it.

| ID | Prototype | This screen | Reason | Proposal |
|---|---|---|---|---|
| DO-1 | Badge "6 newest · 249 total" | "6 of 249" (OQ-5) | The contract pages with a cursor; "newest" and a fixed six are wrong for any page size | confirm |
| DO-2 | Source notice names `kitty-ops/*.jsonl` and "tracked records" | Host-neutral copy from the contract's words | CG-1 | confirm |
| DO-3 | Empty and loading sentences name `kitty-ops/*.jsonl` and "Kitty Desktop is reading" | Host-neutral copy | CG-1; the dashboard host is not Kitty Desktop | confirm |
| DO-4 | Error sentence names `kitty-ops/*.jsonl` and "Kitty Desktop could not read" | Host-neutral copy | CG-1 | confirm |
| DO-5 | Only `done` and `failed` rows | `abandoned` attention tone; `open` neutral status word | CG-4 | confirm |
| DO-6 | No closer | One "Closed by: sweep" fact on a swept Op | CG-4 | confirm |
| DO-7 | Completed always shown | Completed and Evidence say "not recorded yet" on an open Op | CG-4 | confirm |
| DO-8 | Evidence is a value or "Not recorded" | A quiet class label beside the value; a quiet "changed" word when `redacted` | R-D; CG-5; CG-6 | confirm |
| DO-9 | Evidence values are real checkout paths | `[path]` and `[email]` markers appear | R-D | confirm |
| DO-10 | Actor always a value | A null actor shows a quiet word | R-A; CG-12 | confirm |
| DO-11 | No Mission, Work Package or mode facts | Extra facts when present (OQ-1) | CG-3 | confirm if OQ-1 option (a) |
| DO-12 | No active-filter element | One quiet mono fact when the host passes `profile` (OQ-2 a) | The contract has the query | confirm |
| DO-13 | Id wraps with `overflow-wrap: anywhere` | Same for the id; plus evidence values wrap anywhere inside the row (E-43); a fact (term, value, evidence label, profile) wraps at any text size (operator ruling A11Y-001), and only a pill ellipsizes (E-42) | A 512-character token must stay readable in full | confirmed at CP-1 |
| DO-14 | Four static fixtures and the "visible fixtures are the six newest records" note | Not built | CG-15 | confirm |
| DO-15 | One skipped-records absence (not shown) | A quiet note below the list when `skippedCount` above 0 | CG-7; the contract promises counted, never silent | confirm |
| DO-16 | No "Load more" (a fixed six) | A secondary "Load more" with the Missions look; a load-more error and a refresh action | R-F | confirm |
| DO-17 | Page header `sk-` look from the project shell | The same header; the project name is shell-supplied | The prototype's literal "spec-kitty" is data | keep |
| DO-18 | Hover rule on `.invocation-row` (no visible change) | Not built | A row has no action | confirm |
| DO-19 | Plain `.badge` pill with a tone class | The library `sk-pill-tag` with the shared ellipsis rule | Elements over CSS | keep |
| DO-20 | `.notice` blocks | The library `sk-notice` | Elements over CSS | keep |
| DO-21 | `sk-progress` indeterminate compact | The library progress element | Elements over CSS | keep |
| DO-22 | Facts as a two-column definition list with `minmax(80px, .55fr)` terms | The same look built by the project grid on a plain `li`; the library facts element differs (one column, no dividers, no evidence wrap) and the register records it (as #7 DA-34); term minimum `minmax(calc(var(--sk-space-10) + var(--sk-space-4)), .55fr)` (E-41 deleted) | #5's facts-grid lesson (a grid needs `minmax(0, 1fr)` tracks) | confirmed at CP-1 |
| DO-23 | Time text `22 Aug 2026, 09:29:46 UTC` with microsecond `datetime` | The same text form; `datetime` is the served string | CG-11 | keep |
| DO-24 | Rows separated by the collection's row dividers | The same: dividers between the facts of a plain `li` row built with the project grid, no `sk-card` (E-40 widened) | Elements over CSS | confirmed at CP-1 |

## The dynamic-pipeline constraint

Nothing about the pipeline is hard-coded. Outcome, status, closer, mode and evidence-class words and tones, the count, skipped and
refusal wording and the copy come in as data, with the defaults in `src/defaults/`, exactly as lanes do on the board. The `data-driven`
gate applies unchanged and is extended for the Ops vocabularies (FR-038). A value the screen has never seen renders as given with the
neutral tone and the raw word. `profileId` and `action` are open text, never an enumeration in a component: no `audit`, `generate`,
`implement` or any profile literal anywhere. A later dynamic pipeline must need no change to this element, only different props.

## Scope

**In**

- The element `sk-ops-screen` (FR-001 to FR-040), its parts, `logic/` helpers and `defaults/ops-copy`.
- The contract re-vendor (shared, done once, first) and the generated types, fixtures and overlays (FR-041).
- Stories, interaction tests, a manifest entry and surface test, visual baselines in the final work package.
- The shell wiring of the Ops nav item and rail item (FR-040).
- The numbered exceptions, the drift register and the gate extension.

**Out**

- Any fetching, routing, URL handling or time source. The host passes pages; the screen emits events. "Load more" is a host event.
- Writes of any kind; any action on an Op; any agent invocation.
- Opening, resolving, linking or loading evidence; checking that a `repo_path` exists.
- Sorting, search, and filter controls in v1 (the profile filter is a host query; OQ-2).
- Any per-Op detail view (CG-13), Mission or Work Package resolution, links to Missions (OQ-1), durations, staleness, rankings.
- Fields the contract does not carry (R-G) and the prototype's tooling (CG-15).
- Server-side anything (spec-kitty#5528); virtualization; infinite scroll.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: all 36 built matrix rows (OP-34 is not built) have a story and a baseline, and the side-by-side review of the baselines finds 0 unconfirmed
  differences from the prototype.
- **SC-002**: every event of EV-1 to EV-6 and EV-8 has an interaction test asserting its payload, including the no-event cases.
- **SC-003**: 0 gate findings (NFR-001), with `manifest:check` and `contract:check --require-main` green.
- **SC-004**: for every evidence fixture, including the hostile one, the structural walk finds 0 loadable elements and 0 network
  requests (NFR-005).
- **SC-005**: a fixture page with an outcome, closer, mode and evidence kind the screen has never seen renders every row with the raw
  word and the data-driven gate green (US-7).
- **SC-006**: a person can read the outcome of each of the six rows of the default story from the words alone with colour removed
  (NFR-011).
- **SC-007**: with 1,000 loaded rows a property change re-renders within the NFR-006 ceiling.

## Assumptions

- **A-1**: Contract PR #5881 merges to `main` without changing the Ops shapes in this specification; the re-vendor then pins `main`.
  If an Ops shape changes, the affected rows are re-derived before the skeleton freezes.
- **A-2**: #7 may or may not have landed when this mission starts; the shared `sk-retry-load` union is extended either way (C-012).
- **A-3**: The shell's project layout already carries an Ops item (`nav-ops`, `rail-ops`) as a placeholder (it does: the shell fixtures
  and stories name it); this mission gives it content.
- **A-4**: The host accumulates pages and passes the accumulated `items`; the screen never merges pages.
- **A-5**: Matching of the `profile` filter on the service is exact (OQ-8 flags the assumption).
- **A-6**: The prototype's Ops page is still the current design. The design workspace holds no `PAUSED.md` at the prototype
  directory's parent that applies to Ops (searched at specify time; none found), and `states.html` states the Ops design "is visually
  approved". OQ-10 asks the operator to reconfirm.
- **A-7**: The library provides `sk-notice`, `sk-pill-tag`, `sk-button` (busy), the progress element and `sk-section-header`, as #4,
  #5 and #7 rely on. A library `sk-facts` exists (named in #7's drift DA-34) and its look may differ from the prototype's; the
  facts spike at plan time decides (DO-22).
- **A-8**: Project names in the header are supplied by the shell through the project layout, as for the Missions screen.
- **A-9**: Exception ids are E-40..E-43, this mission's allocated range (Projects E-31..E-34, Drift E-35..E-39); an unused number stays unused.
- **A-10**: Exceptions (CP-1, 2026-10-11: E-40, E-42, E-43 approved with the scopes in `contracts/gates.md`; E-41 deleted):
  - **E-40** (approved, widened): the row frame and the row typography of a plain `li` with the project grid, plus the Ops status badge outline and mono font by data attribute; token values only, except `line-height: 1.5`; `ops-row-parts.ts` only; sunset: a spec-kitty-design record-row element.
  - **E-41**: DELETED at CP-1; `minmax(calc(var(--sk-space-10) + var(--sk-space-4)), .55fr)` passes the unmodified config.
  - **E-42** (approved, narrowed): extension of E-21 to the Ops files: `text-overflow` and `white-space` keywords, plus `overflow-wrap` as E-21.
  - **E-43**: `overflow-wrap: anywhere` on the id and the evidence value in `ops-row-parts.ts` only; sunset: a spec-kitty-design
    long-token text treatment.
  - Layout-only `::part` rules (E-22 style) only if a library element requires one, each with a row.

## Open Questions

All are ruled (2026-10-08, see Clarifications); `operator-questions.md` keeps the options and the recommendations. The ones this specification builds on:

- **OQ-1** Mission, Work Package and mode facts (issue question 3; CG-3).
- **OQ-2** The profile filter (issue question 2; CG-10).
- **OQ-3** The wording for null evidence and null actor (CG-5, CG-12).
- **OQ-4** Tones and words for open, abandoned and swept Ops (issue question 4).
- **OQ-5** The count badge wording (issue question 7; CG-2).
- **OQ-6** The source notice and state copy (CG-1).
- **OQ-7** The redacted-evidence word (R-D).
- **OQ-8** Whether to enforce the profile agreement check (CG-10).
- **OQ-9** Time display and dropping `now` (issue question 6; CG-11, CG-17).
- **OQ-10** Prototype freshness (issue question 11).
