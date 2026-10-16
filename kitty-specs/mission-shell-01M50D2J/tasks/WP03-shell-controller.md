---
work_package_id: WP03
title: 'Shell controller: results to view state, session, explicit refresh and connection'
dependencies:
- WP02
requirement_refs:
- FR-005
- FR-006
- FR-010
- FR-011
- FR-016
- NFR-004
- NFR-007
- SC-003
- FR-007
- FR-008
- NFR-003
- SC-002
- C-004
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement
  this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless
  the human explicitly redirects the landing branch.
subtasks:
- T012
- T013
- T014
- T015
- T016
- T017
- T018
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/src/core/results.ts
- packages/mission-shell/src/core/connection.ts
- packages/mission-shell/test/logic/controller.test.ts
- packages/mission-shell/test/logic/results.test.ts
- packages/mission-shell/test/logic/connection.test.ts
- packages/mission-shell/test/logic/controller-recording.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/core/results.ts
- packages/mission-shell/src/core/connection.ts
- packages/mission-shell/src/controller/**
- packages/mission-shell/test/logic/controller.test.ts
- packages/mission-shell/test/logic/results.test.ts
- packages/mission-shell/test/logic/connection.test.ts
- packages/mission-shell/test/logic/controller-recording.test.ts
role: implementer
tags: []
tracker_refs: []
---

# WP03 — Shell controller: results to view state, session, explicit refresh and connection

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Build the shell's deep module, `createShellController`, which ties the core (routes, displayed sets, refresh policy,
read scheduler) to one `MissionStatusClient`. It turns port results into each screen's properties and view state, holds
the session state, runs the explicit refresh triggers, and owns the connection presentation's logic and copy. Everything
is plain TypeScript, tested in the Node `logic` project, with no Svelte and no I/O.

## Context

- **Why**: plan IC-03. The view (WP06) renders only from the controller's snapshot and calls its commands, so every
  behaviour of FR-005, FR-006, FR-010, FR-011, FR-016 and NFR-004 is decided here and proven in Node, where it is cheap
  (plan "Complexity Tracking": the second Vitest project).
- **Read first** (authoritative; cite, never re-derive):
  - `plan.md` IC-03 (risks list), "Shared-file ownership", "Plants";
  - `data-model.md`: "ResourceKey and the displayed set", "Read scheduling" (Connection gate, Page chain), "Applying a
    result", "ConnectionPresentation", "SessionState", "ShellOptions";
  - `research.md`: R-04, R-05 (gate, bypass list, page chains, load-more), R-06 (result table, refusal coverage, test
    clients), R-11 (explicit refresh), R-18 (refused stream, copy protocol, grace timer, `now`);
  - `contracts/connection-presentation.md` (the copy, the timing rules, the FS-06 split);
  - `contracts/refresh-policy.md`, "Separate assertions" (FR-007, FR-010/R2-10, connection gating, FS-05, NFR-007);
  - `contracts/intent-map.md` (the effect of each session and retry intent this WP implements as a command);
  - `reviews/plan.squad.md`: FS-01, FS-02, FS-03, FS-05, FS-06, FS2-01, R2-07, R2-08, R5-08, R5-11;
  - decisions `01M50K4DBT2VCW6DD4JQAGEMB4` (`unavailable` keeps data; spec FR-005 amendment) and
    `01M50K4G2G0EA0JN3B6YGH607S` (after `refused`, each non-first `connected` is a shell-side resync, no new
    subscription).
- **What the dependencies deliver**:
  - WP01: `src/core/routes.ts` (`Destination`, `parseRoute`, `formatRoute`), `src/core/displayed.ts` (the displayed
    set and the explicit-refreshed keys per destination, "of Mission M"), the `logic` Vitest project with its
    `typeof window === 'undefined'` sentinel, and the Node setup file under `test/setup/**` that fails the run on any
    `unhandledRejection` or `uncaughtException` (NFR-007).
  - WP02: `src/core/refresh-policy.ts` (`REFRESH_POLICY`, `refreshKeys`), `src/core/scheduler.ts` (the controller-wide
    generation counter, slots, the 100 ms window, bypass, stale-while-revalidate, page chains and load-more, and the
    `ShellScheduler` type), and `test/support/{deferred-client,sequenced-client,recording-client}.ts`.
    Use those modules as they are. If one lacks something this WP needs, that is a change request in the hand-off,
    not an edit.
- **Key decisions**:
  - The gate, the first-`connected` mark and the refused flag are **per client**, and `setClient` resets all three
    (FS2-01). No read before the client's first `connected`; that first `connected` issues the displayed set itself as
    bypass reads, and there is no `resync` at first contact (FS-01, FS-02).
  - A refusal always applies; `unavailable` keeps an existing value and its view (spec FR-005 amendment).
  - One home per part of the presentation (FS-06): core owns state → condition, the refused flag, the grace timer and
    the copy; `src/ui/ConnectionBanner.svelte` (WP06) owns tone and announce only.
  - The controller never imports Svelte: the copy protocol's flush is an injected `afterRender` (FS-03), and the
    layering lint block (WP07, plant P-8) enforces it.
- **Who builds on this**: WP04 adds the host-facing commands (picker, dialog, links, `routeChanged`,
  `host.onWindowRefocus` wiring, the dashboard guard and the null-client dashboard error) to
  `src/controller/shell-controller.ts`, and replaces this WP's copy fallback seam with the `src/core/host.ts` wrapper.
  WP05 maps the intent table onto the commands built here. WP06 renders the snapshot. WP09 (IC-08b) may amend the copy
  in `src/core/connection.ts` after CP-1, by grant.

## Ownership

Owned files (verbatim):
- `packages/mission-shell/src/core/results.ts`
- `packages/mission-shell/src/core/connection.ts`
- `packages/mission-shell/src/controller/**`
- `packages/mission-shell/test/logic/controller.test.ts`
- `packages/mission-shell/test/logic/results.test.ts`
- `packages/mission-shell/test/logic/connection.test.ts`
- `packages/mission-shell/test/logic/controller-recording.test.ts` (A1: the recording replayed through the shipped
  controller)

**Out-of-map edits**: none. (Later edits by others, recorded in their own WPs: WP04 adds host-facing commands to
`src/controller/shell-controller.ts`; WP09 may edit `src/core/connection.ts` for CP-1 amendments.)

**Do not touch**:
- The frozen surface (research R-17, C-003): `src/client/port.ts` (and the rest of `src/client/**`),
  `src/contract/stream.ts`, `src/testing.ts`, `src/index.ts`, `src/harness/**`, `src/Shell.svelte`,
  `contracts/fixtures/*`, `packages/mission-ui/**`, and the gate wiring (`ci.yml` structure, plant `ciCommand`s and
  `prepare`s, gate scripts).
- Other WPs' files: `src/core/{routes,displayed,refresh-policy,scheduler,host,links}.ts`, `test/support/**`,
  `test/setup/**`, `vitest.config.ts`, `src/ui/**`, `src/intents/**`, `eslint.config.mjs`, `gates/plants/**`.
- `kitty-specs/**` (orchestrator-owned).

The fixture's test hook `setConnectionState` is imported in tests by relative path from `src/client/fixture.ts`; it is
never re-exported (`src/testing.ts` stays unchanged). Fixture overrides go through the existing `examples` and
`fixtures` options only (C-003).

### Subtask T012: Result application (`src/core/results.ts`)

**Purpose**: one pure function that turns a port `Result` into a slot's next value, view and refusal, per screen, so
FR-005 (with its amendment) has a single implementation and a table-driven test.

**Steps**:
1. Export `applyResult(slot, result, rule)`, pure, returning the next `{ value, view, refusal }`. It implements
   `data-model.md` "Applying a result" exactly:
   - `{ ok: true, value }`: the value is set or replaced, unchanged (FR-005: no copy, no reshaping); the view is
     `ready`, or `empty` by the screen's rule.
   - `{ ok: false, refusal }`: **always applies**, with or without a value. The view is `error`, or `not-found` for a
     404 where the screen's vocabulary defines `not-found`; the refusal is kept so the view can pass its code to the
     screen's refusal property (`refusalCode`, `detailRefusalCode`).
   - `{ ok: false, unavailable }`: on a slot **with** a value, value and view are kept (decision
     `01M50K4DBT2VCW6DD4JQAGEMB4`); on a slot **without** a value, `error`.
2. **Empty, per screen** (`data-model.md`): Missions is empty when page 1 has no items; Ops when it has no items; Drift
   when the report has no findings. No other key has `empty`. Express the rule as a small per-key-kind table, one row
   per line, not as conditionals spread through the controller.
3. **Status vocabularies**: type each screen's status word against the types the generated typings reference
   (`src/generated/elements.d.ts`): `ViewState`, `WpScreenStatus`, `DetailStatus`, `ArtifactStatus`,
   `ArtifactContentStatus`, `DriftScreenStatus`, `OpsScreenStatus`. Import them **type-only** (the layering block of
   WP07 allows type imports of mission-ui and nothing else). A word the screen does not declare is a compile error.
   Where a screen's own vocabulary names a refusal differently (for example `ArtifactContentStatus` has `refused` and
   no `not-found`), read that screen's element documentation in mission-ui and follow it; record the choice in the
   hand-off. Never invent a word.
4. **Load-more refusal**: a refused load-more cursor (400, `PageCursorRefusal` with code `invalid`) drops the loaded
   pages and asks for page 1 again (`data-model.md`, "Applying a result"; spec edge case). An Ops load-more failure
   (`unavailable`, or a refusal other than that cursor refusal) sets `loadMoreError` and keeps the items. Return these
   as explicit outcomes the controller acts on; `results.ts` itself issues nothing.
5. **Page chain failure on page k > 1** is the scheduler's (WP02): apply the pages read so far, `pageInfo` from the
   last good page. `applyResult` must accept that partial value without special-casing it.

**Files**: `src/core/results.ts`, `test/logic/results.test.ts`.

**Validation**:
- `test/logic/results.test.ts` is table-driven: for each key kind, a success, an empty (where the screen has one) and
  **every refusal of research R-06's table**, enumerated from `contracts/fixtures/mission-status.routes.json` read as
  the oracle (R5-08): `ArtifactRefusal` 400, 404, 413, 415, 422, 500 (content), 404, 500 (listing); `DriftRefusal`
  404, 500; `Problem` 404 for `getMission` and `getWorkPackage`; `WorkPackageDetailRefusal` 404, 500;
  `PageCursorRefusal` 400 for both lists; `OpsRefusal` 500; and none for `getProject`.
- The loop asserts it ran exactly the number of (operation, refusal) pairs counted from `routes.json`, with equality,
  so an empty loop fails, and a second assertion compares that count with the literal of the R-06 table.
- No vendored example has schema `Problem`: inject `Problem.test-not-found` (`status: 404`) through
  `fixtures.examples` and select it with `examples: { getMission: 'Problem.test-not-found' }` (and the same for
  `getWorkPackage`). Additive use of existing options only.
- `unavailable` is asserted on both sides: with a value (kept, view unchanged) and without (`error`). Each
  "kept" assertion has a positive control where the same slot does change (a refusal on the same slot gives `error`).
- A value passed through is asserted with `toBe` (identity), not only `toEqual` (FR-005, "unchanged").

### Subtask T013: Connection presentation logic and copy (`src/core/connection.ts`)

**Purpose**: the core half of FS-06: map the connection state and the refused flag to a banner condition, run the 1 s
reconnecting grace timer, and hold the default copy, so the view only looks up tone and announce.

**Steps**:
1. Export the condition union: `'connecting' | 'reconnecting' | 'service-missing' | 'contract-mismatch' |
   'live-updates-off'`, plus "no banner". Name them so WP06's tone table has one line per condition
   (`contracts/connection-presentation.md`; P-6 anchors on the `reconnecting` line there, not here).
2. Export the default copy, verbatim from `contracts/connection-presentation.md` (titles and bodies of the five
   conditions, and the "Other shell copy" table: project head eyebrow, Mission not found, read failed with no data,
   shell chrome error, "No project is open."). Apply `ShellCopyOverrides` for the two degraded conditions only. Keep
   the copy in one exported object so a CP-1 amendment (WP09, by grant) is a one-place edit, and so the terminology gate
   scans it.
3. A small presenter object created per client, with the injected `ShellScheduler`:
   - `connected` hides any banner in the same update (NFR-004).
   - `degraded: service-missing` and `degraded: contract-mismatch` show their condition **in the same update** as the
     state change.
   - `connecting` shows its condition at once.
   - **Grace timer (R2-08)**: on entering `reconnecting`, update the state **first**, then arm a 1000 ms timer. The
     condition becomes `reconnecting` only if the state is still `reconnecting` when it fires. **Every exit clears the
     timer**; a re-entry arms a fresh one. A flap shorter than 1 s shows nothing.
   - The refused flag: once set, the `live-updates-off` condition shows whenever no connection-state condition does
     (it is neutral, and the degraded and reconnecting banners take precedence; if the CP-1 design wants both visible,
     that is a CP-1 amendment). It stays until `setClient` or remount.
   - A `dispose()` clears any timer.
4. No tone, no announce, no markup here (FS-06). No Svelte, no DOM, no global timers: only the injected scheduler.

**Files**: `src/core/connection.ts`, `test/logic/connection.test.ts`.

**Validation** (fake scheduler, manual advance):
- Each of the five connection states, plus refused, gives its condition; `connected` gives none (SC-003: 5 of 5, plus
  the refused notice), and none throws.
- Degraded: the condition is present immediately after the state change, before any advance.
- Grace: `reconnecting` at t = 0 shows nothing at t = 999 and the condition at t = 1000 (positive control in the same
  test).
- Re-entry (R2-08): `reconnecting`, 500 ms later `connected`, then `reconnecting` again: nothing at the first entry's
  1000 ms mark; the condition appears exactly 1000 ms after the second entry.
- The fake scheduler's pending-timer count is 0 after every exit and after `dispose()`.
- The copy test compares each string with the literal from the contract; the override test changes only the degraded
  pair and leaves the other three conditions equal to the defaults.

### Subtask T014: `createShellController` (`src/controller/shell-controller.ts`)

**Purpose**: the deep module: one object that owns the subscription, the connection listener, the slots, the snapshot
and navigation for the current client.

**Steps**:
1. `createShellController(options)`, where the options are those of `data-model.md` "ShellOptions" plus two
   controller-only seams: `client` (or `null`), `host` (default `{}`), `mode`, `route`, `scheduler` (default global
   timers, typed `ShellScheduler` from `src/core/scheduler.ts`), `clock` (default the system clock), `copy`, and
   `afterRender: () => Promise<void>` (default `() => Promise.resolve()`; T017).
2. **Subscriptions** (FR-007): on mount with a client, exactly **one unscoped** `client.subscribe(listener)` (no scope:
   R-18 "After `log-truncated`") and exactly **one** `client.connection.onChange`. The `host.onWindowRefocus` wiring is
   WP04's; this WP exposes `windowRefocused()` for it (T016).
3. **Snapshot and store contract**: `snapshot()` returns the current immutable view model, and
   `subscribe(run): () => void` follows the Svelte store contract (calls `run` at once, then on every change) without
   importing Svelte. The snapshot carries at least: the destination and its layout; the chrome values (project head,
   mission head); per screen the properties and status of `data-model.md` "ResourceKey" (including `loadingMore`,
   `loadMoreError`, `rescanning`, `detailStatus`, `detailRefusalCode`, `contentStatus`); the connection condition and
   its copy (T013); the session (T015); `copyResult`; whether Refresh is shown (Artifact and Ops only); and `now`.
4. **`now`**: read from the injected clock **when a result is applied**. No ticking timers (R-18).
5. **Navigation** (`data-model.md` "Navigation"): compute the new displayed set (WP01), diff it with the current one:
   drop slots no longer displayed (the scheduler clears their timers; late results find no slot); create fresh slots
   without values for new keys and issue them as bypass reads (if the gate is open); keep the slots and values of keys
   displayed before and after (chrome). Re-selecting the current destination re-reads its explicit-refreshed keys.
   Reset `copyResult` to `null` on navigation (`data-model.md` "SessionState").
6. **`setClient(client, route?)`**: release the old subscription and connection listener, dispose the presenter, drop
   every slot, **reset the per-client gate, the first-`connected` mark and the refused flag** (FS2-01), set the route
   if given, then subscribe the new client once. A client already `connected` at mount or at `setClient` counts as its
   first `connected` and issues the displayed set at once.
7. **`destroy()`**: releases the subscription, the connection listener and every timer. A change or state change
   delivered after `destroy()` records 0 reads and throws nothing.
8. **`client: null`**: no subscription, no reads, nothing thrown. The desktop's `projects` destination and the
   dashboard's "No project is open." error are WP04's (IC-04); keep the null path safe for them.
9. Do not swallow the controller's own errors: no blanket `try/catch` around reads or listeners (NFR-007, R5-11). Only
   host calls are wrapped (T017, then WP04).

**Files**: `src/controller/shell-controller.ts` (split helpers into other files under `src/controller/` if it grows;
all are owned).

**Validation**: covered in T018 (subscription counts, navigation, `setClient`, `destroy`, `now`).

### Subtask T015: Session state and commands

**Purpose**: FR-006 and the session rows of `data-model.md` "SessionState", as named controller commands that WP05's
intent table will call.

**Steps**:
0. **`controller.intent(tag, event, detail)`** is the single typed entry point that WP04's tests and WP05's table rely
   on. WP03 creates it as a dispatcher keyed on `(tag, event)` that calls the named commands below and does nothing
   (no throw) for a pair it does not know yet.
   - WP04 extends it, as its recorded out-of-map edit, with the host, picker and dialog pairs and the dashboard guard.
   - WP05 makes `INTENT_TABLE` the dispatch source. Its entries call these named commands, so the table and
     `intent()` cannot diverge.
1. Commands (names are yours; keep one per effect of `contracts/intent-map.md`):
   - Missions `query` and `filter`: survive leaving and re-entering Missions.
   - Drift `selectedFinding`: survives re-entering the **same** Drift scope; a different scope starts with none.
   - Artifacts tree expansion: per Mission (`sk-tree-toggle`: folder `detail.id` set to `detail.expanded`).
   - `drawerOpen`, `flyoutOpen`: shell-wide.
2. **Retries by named target** (bypass reads of exactly that key, nothing else):
   - Work Package: `work-package` → `wp:{M}/{W}`; `detail` → `wp-detail:{M}/{W}`.
   - Artifact: `content` → `artifact:{M}:{P}`; `listing` → `artifacts:{M}`.
   - Drift: `drift-report` → `drift:{missionId or *}`.
   - Ops: `ops-page` **with** a cursor is a **load-more** (append, not a bypass; FS-08); without a cursor it re-reads
     page 1 as a bypass.
   - Shell chrome (`sk-shell-retry`): re-read the chrome keys that are in `error`.
   The Projects and dialog retries are WP04's.
3. **Load-more** (Missions and Ops): read the next page with `pageCursor = detail.cursor` through WP02's page-chain
   API, append it, `loadingMore` true while it runs. Ops failures set `loadMoreError` and keep the items (T012). The
   refused-cursor outcome of T012 drops the pages and re-reads page 1. The queueing, trailing and supersede rules are
   the scheduler's (research R-05, "Page chains").
4. **Rescan** (`sk-rescan-drift`): a bypass read of `drift:{detail.missionId or *}`; `rescanning` true until it settles;
   the old report stays visible (stale-while-revalidate).

**Files**: `src/controller/**`, `test/logic/controller.test.ts`.

**Validation**:
- Each retry target re-reads exactly its key: the recording shows one read of that key and **none** of any other
  (positive and negative in one test).
- Query and filter survive Missions → Pipeline → Missions; `selectedFinding` survives Drift `M` → Missions → Drift `M`
  and is cleared for Drift `*` (positive and negative controls).
- Load-more appends one page with `loadingMore` true during the read and false after; the Ops failure keeps the items
  and sets `loadMoreError`; a cursor retry appends and is not a bypass (assert the in-flight page-1 generation is not
  superseded).
- Rescan: `rescanning` is true while the deferred read is unsettled, the old report is still the snapshot's report,
  then the new one applies and `rescanning` is false.

### Subtask T016: Explicit refresh, refused stream and the connection gate

**Purpose**: FR-016's logic, FR-010 and FR-011's gating, in the controller.

**Steps**:
1. **`refresh()` and `windowRefocused()`**: on the Artifact and Ops destinations only, re-read that destination's
   explicit-refreshed keys once, as bypass reads (`data-model.md` table; research R-11). Chrome keys are not re-read.
   On every other destination they do nothing (no read, no throw). Drift keeps its Rescan.
2. **Refused stream** (FR-010; decision `01M50K4G2G0EA0JN3B6YGH607S`): a `refused` change sets the per-client refused
   flag (the `live-updates-off` notice, T013). Reads keep working. The controller **never subscribes again** for that
   client. From then on, **each `connected` that is not that client's first** is a shell-side resync: re-read the whole
   displayed set as bypass reads (the policy row "`resync` (adapter), or a shell-side resync").
3. **Adapter `resync`**: re-reads every displayed key, as bypass (WP02's policy).
4. **Gate before the first `connected`** (FS-01, FS-02): while `connecting`, or `degraded`/`reconnecting` reached
   before the client's first `connected`, issue nothing. A degraded state before the first `connected` sets the
   no-value slots of the displayed set to `error` without reads. The first `connected` issues the current displayed set
   itself as bypass reads; it is not a `resync`.
5. **Degraded after the first `connected`** (FS-05): every displayed slot without a value shows `error`, **even with a
   read in flight**; the read's result applies by the T012 table when it arrives. Slots with values keep them.
6. `connecting` with no value shows `loading` (FR-011); `reconnecting` keeps data.

**Files**: `src/controller/**`, `test/logic/controller.test.ts`.

**Validation** (fixture client and the WP02 recording proxy; the fixture's scheduler and the shell's are the same fake
instance):
- `refresh()` on Ops records exactly one `listOpsInvocations` chain and nothing else; on Artifact `M`, `P` exactly one
  `listArtifacts` and one `getArtifactContent`; on Missions and Pipeline, 0 reads (the negative paired with the two
  positives). Same for `windowRefocused()`.
- The refused, gating and FS-05 cases are T018's.

### Subtask T017: Copy protocol (R2-07, FS-03)

**Purpose**: two consecutive `copied` answers must each reach the screen as a change, without the controller importing
Svelte.

**Steps**:
1. A command for `sk-copy-command` with the intent's `text`. The order is fixed:
   1. set `copyResult = null`;
   2. emit the snapshot;
   3. `await afterRender()`;
   4. `await` the host copy;
   5. set `copyResult` to the answer and emit.
2. **Host seam**: until WP04 lands `src/core/host.ts`, call `host.copyText` through a local, private fallback in
   `src/controller/` that turns an absent member, a throw or a rejection into `'manual'` (FR-012's fallback). Keep it
   in one function so WP04 swaps it for its wrapper in one place. It catches only the host call, nothing of the
   controller's.
3. If the destination changed while the copy was pending, the late answer is not applied to the new destination
   (navigation reset `copyResult` to `null`).

**Files**: `src/controller/**`, `test/logic/controller.test.ts`.

**Validation**:
- An ordered call log (`emit:null`, `afterRender`, `copyText`, `emit:copied`) asserted with `toEqual` on the whole
  array, for two consecutive copies (8 entries; the `null` emit appears twice).
- A host without `copyText`, a throwing one and a rejecting one each yield `'manual'`, with no unhandled rejection; a
  host answering `'copied'` is the positive control.

### Subtask T018: Controller tests (Node, `test/logic/controller.test.ts`)

**Purpose**: prove the controller's behaviours in the `logic` project, with equality counts and paired controls.

**Steps** (fake scheduler; `createFixtureClient` with injected options, `createDeferredClient`,
`createSequencedClient` and the recording proxy from `test/support/`):
1. **FR-007 subscription counts** over mount, `setClient`, `destroy`: subscribe 1 + 1, unsubscribe 1 + 1;
   `connection.onChange` registrations 1 + 1, releases 1 + 1. A change delivered after `destroy()` records 0 reads and
   no error; the positive control is the same change before `destroy()` recording its reads.
2. **FR-010, R2-10**: `examples: { streamEvents: 'StreamRefusal.content-mismatch' }` gives the `live-updates-off`
   condition, and reads still apply. Then `setConnectionState(client, 'reconnecting')`, then `'connected'`: the whole
   displayed set is re-read (a shell-side resync) with **0** new `subscribe` calls. Positive control: the same sequence
   on a non-refused client re-reads through the adapter's `resync`, not the shell-side path.
3. **Gating**, each asserting "no `resync`; shell-issued reads at the first `connected`", observed **before** the fake
   scheduler is advanced:
   - `initialState: 'connecting'`: 0 reads; then `connected`: exactly the destination's initial reads.
   - `connecting` → `degraded: service-missing`: 0 reads, every no-value slot `error`; then `connected`: the initial
     reads.
   - `initialState: 'degraded: contract-mismatch'`: 0 reads at mount, `error`; then `connected`: the initial reads.
   - `initialState: 'connected'` (positive control): the initial reads at mount.
4. **FS2-01**: mount with client `a` (connected), then `setClient(b)` with `b` in `connecting`: 0 reads through `b`;
   then `b` → `connected`: shell-issued reads through `b`, no `resync`, and 0 further reads through `a`.
5. **FS-05**: after the first `connected`, `degraded`, then navigate to a new destination with a deferred client: the
   new no-value slot is `error` (not `loading`) while its read is in flight; after the read resolves, it applies by
   the table (`ready`). Control: the same navigation while `connected` shows `loading`.
6. **Grace timer through the controller**: the snapshot's condition follows T013 including the re-entry case.
7. **Copy order**: T017's ordered log.
8. **FR-009, latest wins at controller level**: with `createDeferredClient`, A → B → A navigation, the first A read
   resolves last and is dropped; and two `mission:M` reads resolve out of order, and the later-issued value is the
   snapshot's.
9. **`now`**: the clock's value at apply time is the snapshot's `now`; advancing the fake scheduler alone does not
   change it.
10. **NFR-007**: the run relies on WP01's Node setup file failing on uncaught errors and unhandled rejections. Add one
    test that drives every connection state, every refusal example of T012 and every change kind through a mounted
    controller and asserts it completes (SC-003: 0 throws). Do not wrap the controller in `try/catch` in tests.

11. **A8, C-004 (ownership boundary), scoped to `subscribe` arguments only (B2)**:
    - Assert that every `client.subscribe` call has **no `SubscriptionScope`**: the second argument is `undefined`, or
      absent. So no stream `cursor` is ever passed.
    - The test runs over a full mount, every change kind, a reconnect with `resync`, a `setClient` and a `destroy`. It
      reads the subscribe arguments that WP02's `recording-client.ts` records.
    - Reads are out of scope for this assertion: a read's `missionId` or `pageCursor` is not a stream cursor.
    - Positive control: the recording client does record the scope of a direct test call
      `client.subscribe(l, { missionId: M })`, so the assertion is not vacuous.
    - No edit to `test/support/**` is needed (WP02 owns it).
12. **A9, US1-2 (Mission title in the mission head)**: after navigating to Pipeline `M`, the snapshot's mission head
    `title` equals the `friendlyName` (or else `slug`) of the `getMission` value served (research R-18). Control: on
    the Missions destination the snapshot has no mission head.
13. **A9, US6-2 (re-selecting the current destination reads fresh)**: on Artifact `M`, `P` and on Ops, navigating to
    the destination that is already current issues exactly one read of each of its explicit-refreshed keys
    (`artifacts:M` and `artifact:M:P`; `ops`), as bypass reads, and none of its chrome keys. Control: re-selecting
    Pipeline `M` issues none.
14. **A1, the recording through the shipped controller** (`test/logic/controller-recording.test.ts`):
    - Replay WP02's literal `test/support/expected-recording.ts`, row by row, through `createShellController`, not
      through WP02's scheduler-level harness.
    - Use the same set-up as `contracts/refresh-policy.md` "The test set-up": the same injected changes copy with
      item 1 at `delayMs: 250`, the same fake scheduler for fixture and controller, the same recording proxy, and the
      same reconnect sequence for the `resync` column.
    - Assert each row with the **same custom message** `` `refresh-policy mismatch on ${row.name}` `` (R6-08: no test
      title contains `refresh-policy mismatch`).
    - Under plant P-1 this test also fails with that token, alongside WP02's test. That is expected: P-1's token is
      only required to appear in the planted output and be absent from the clean output.
    - **The P-1 leg proof with this file present is deferred to WP06 T033 step 4** (B1), whose unit-tests leg already
      includes it. WP03 keeps only a clean-output check: `grep -c 'refresh-policy mismatch on missions'` on its clean
      `heavy pnpm --filter @moes-media/mission-shell test` output must print 0.
    - This closes the gap the analyze gate found: the scheduler-level recording alone does not prove that the shipped
      controller wires the policy.

**Files**: `test/logic/controller.test.ts`; `test/logic/controller-recording.test.ts` (new).

**Validation**: every count is an equality; every "none", "0 reads" or "no `resync`" assertion has a positive control
on the same fixture; every loop asserts its iteration count. Make one deliberate local revert per test file (for
example, skip resetting the refused flag in `setClient`, or arm the grace timer before the state update) and record the
failing test name; restore it before committing.

## Plants

None owned. The `logic` project these tests run in is proven by **P-1** (WP02: the refresh-policy row plant in
`src/core/refresh-policy.ts`, token `refresh-policy mismatch on missions`), which fails inside the same project. The
checks here carry in-test positive controls instead (research R-15). No gate-proof leg is run by this WP, so no leg
time is recorded (IC-03 is not in plan IC-09's timing list).

## Exit checks

- [ ] `pnpm --filter @moes-media/mission-shell typecheck` passes (status words typed against the generated typings).
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes, including WP07's layering block for `src/{core,controller,intents}/**`: no `svelte` or
      `svelte/*` import, and no runtime `@moes-media/mission-ui` import (type-only imports only), in `src/core/results.ts`,
      `src/core/connection.ts` and `src/controller/**`.
- [ ] `pnpm lint:no-io` passes (no I/O globals; timers only through the injected scheduler).
- [ ] `heavy pnpm --filter @moes-media/mission-shell test` passes, foreground, one at a time. Report the pass counts of
      `test/logic/results.test.ts`, `test/logic/connection.test.ts` and `test/logic/controller.test.ts`, and that the
      `logic` sentinel still passes.
- [ ] Hygiene: `pnpm hygiene` passes; no absolute local paths or usernames in any tracked file.
- [ ] Terminology: the banned synonym for "mission" appears nowhere in the new sources, tests or copy.
- [ ] Frozen surface untouched: `git diff --exit-code "$(git merge-base HEAD main)" -- packages/mission-shell/src/client
      packages/mission-shell/src/contract/stream.ts packages/mission-shell/src/testing.ts packages/mission-shell/src/index.ts
      packages/mission-shell/src/harness packages/mission-shell/src/Shell.svelte contracts/fixtures packages/mission-ui`.
- [ ] Only owned files are staged (`git diff --name-only --cached`); no out-of-map edits.
- [ ] Each subtask recorded: `spec-kitty agent tasks mark-status T012 --status done` (and T013 to T018).

## Definition of Done

- `test/logic/controller-recording.test.ts` replays the literal expected recording through `createShellController`
  with the message `refresh-policy mismatch on ${row.name}` and passes. Under P-1 it fails with that token (A1).
- The subscription is unscoped, and no cursor is ever passed (A8, C-004). US1-2 and US6-2 are asserted at controller
  level (A9).
- `applyResult` implements "Applying a result" including the FR-005 amendment, the per-screen empty rule, the 404
  `not-found` rule, the refused-cursor and Ops load-more outcomes, and the refusal coverage of research R-06, all
  typed against the screens' own status vocabularies.
- `src/core/connection.ts` owns state → condition, the refused flag, the grace timer (R2-08) and the contract's copy
  with degraded overrides; it holds no tone or announce (FS-06).
- `createShellController` holds exactly one unscoped subscription and one connection listener per client, exposes a
  snapshot and store-contract `subscribe`, navigates by displayed-set diff, implements `setClient` (per-client reset,
  FS2-01) and `destroy`, sets `now` on apply, and runs no ticking timers.
- The session commands, the named retries, load-more, Rescan, `refresh()`, `windowRefocused()`, the refused-stream
  shell-side resync, the connection gate (FS-01, FS-02) and FS-05 behave as specified.
- The copy protocol runs in the fixed order with an injected `afterRender` and a single host-call seam for WP04.
- All T018 tests pass in the `logic` project with equality counts and paired controls, and the run fails on any
  uncaught error (NFR-007).
- Exit checks green; commits local only.

## Risks

- **Gate drift**: re-introducing reads on leaving `connecting`, or a `resync` expectation at first contact, would
  contradict FS-01 and FS-02 (R1-01 and R2-09 are superseded). Read the fixture: it replays from the first `connected`
  and sends `resync` only to a subscription that has been live.
- **Global gate state**: storing the first-`connected` mark or the refused flag on the controller rather than per
  client breaks `setClient` (FS2-01). Reset all three together.
- **Grace-timer order**: arming before the state update, or not clearing on an exit to a degraded state, flashes a
  banner or leaks a timer (R2-08). Assert the pending-timer count.
- **Over-catching**: a `try/catch` around reads or listeners would hide shell bugs that NFR-007 must surface. Catch only
  host calls.
- **Svelte creep**: using `tick()` or a `.svelte.ts` store in the controller breaks the layering (FS-03; P-8 fails the
  lint). Use the injected `afterRender` and a plain store contract.
- **Scheduler API gaps**: if WP02's scheduler does not expose what load-more or the shell-side resync needs, raise a
  change request; do not fork the scheduling rules into the controller.
- **Status words**: the screens' vocabularies differ (`ArtifactContentStatus` has `refused`; `WpScreenStatus` and
  `ArtifactStatus` have `nothing-selected`). Follow each screen's documentation and record any judgement call.

## Reviewer Guidance

- **FR-005 amendment**: an `unavailable` result on a slot with a value keeps value and view; the test pairs it with a
  refusal on the same slot that does change it.
- **Refusal coverage is non-vacuous**: the loop count equals the count derived from `routes.json` and the R-06 literal;
  `Problem.test-not-found` is injected through `fixtures.examples`, not by editing `contracts/fixtures/*`.
- **Gating tests** read "no `resync`; shell-issued reads at the first `connected`", observe the reads before the fake
  scheduler is advanced, and include the `initialState: 'connected'` positive control and the FS2-01 `setClient(b)`
  case.
- **Refused stream**: 0 new `subscribe` calls after `refused`, and the reconnect re-reads the whole displayed set.
- **Subscription counts** are equalities over mount, `setClient` and `destroy`, with the post-destroy change recording
  0 reads beside a pre-destroy positive control.
- **Grace timer**: the re-entry test, and 0 pending timers after each exit.
- **FS-06**: no tone or announce in `src/core/connection.ts`; copy matches `contracts/connection-presentation.md`
  verbatim.
- **Copy order**: the whole ordered log is asserted, for two consecutive copies; the host seam is one function.
- **Layering**: no `svelte` import and no runtime mission-ui import in core or controller (`pnpm lint` green).
- **Ownership**: only the six owned paths changed; no edit to the frozen surface, `test/support/**` or the scheduler.
- Re-run two of the implementer's revert checks and confirm each fails with the named test.

## Implementation command

`spec-kitty agent action implement WP03 --agent claude`
