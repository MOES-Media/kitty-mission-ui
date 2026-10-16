---
work_package_id: WP02
title: 'Refresh engine: policy, read scheduler, page chains and the refresh-policy plant'
dependencies:
- WP01
requirement_refs:
- FR-007
- FR-008
- FR-009
- FR-010
- FR-017
- NFR-001
- NFR-002
- NFR-003
- C-004
- SC-002
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
subtasks:
- T006
- T007
- T008
- T009
- T010
- T011
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/src/core/refresh-policy.ts
- packages/mission-shell/src/core/scheduler.ts
- packages/mission-shell/test/logic/refresh-policy.test.ts
- packages/mission-shell/test/logic/scheduler.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/core/refresh-policy.ts
- packages/mission-shell/src/core/scheduler.ts
- packages/mission-shell/test/support/**
- packages/mission-shell/test/logic/refresh-policy.test.ts
- packages/mission-shell/test/logic/scheduler.test.ts
- gates/plants/unit-tests/**
role: implementer
tags: []
tracker_refs: []
---

# WP02 — Refresh engine: policy, read scheduler, page chains and the refresh-policy plant

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Build the I/O-free refresh engine of plan IC-02: the `REFRESH_POLICY` table and `refreshKeys`, the read scheduler (one
generation counter, 100 ms coalescing, bypass triggers, stale-while-revalidate, the per-client connection gate, page
chains and load-more), the test-only clients in `test/support/`, and the literal read-recording test with its plant
P-1. WP03's controller wires these pieces; this WP proves them against a minimal test harness.

## Context

- **Why.** FR-008 and SC-002 require that each change re-reads exactly the affected displayed resources (NFR-003: 0
  others), FR-009 that the latest-issued read wins, NFR-002 that a burst costs exactly 2 reads, and NFR-001 that a
  re-read is issued at the delivery tick. C-004 limits the shell to deciding re-reads: no reconnecting, backoff, cursor
  bookkeeping or mapping of transport errors.
- **Authoritative sources** (cite, never re-derive or contradict):
  - `data-model.md`: "ResourceKey and the displayed set", "Refresh policy", "Read scheduling" (ResourceSlot,
    Transitions, Connection gate, Page chain), "Applying a result", "ShellOptions" (`scheduler`).
  - `contracts/refresh-policy.md`: the test set-up, the **expected recording** (the oracle), the separate assertions.
  - `research.md` R-04 (displayed resources, "of Mission M", `missions` vs `mission-names`), R-05 (scheduler), R-06
    (test-local clients), R-18 (refused stream, `log-truncated`).
  - `plan.md` IC-02, "Shared-file ownership", "Gates" / "Plants" (P-1), "Proof-leg timeouts".
  - `reviews/plan.squad.md`: R2-01 to R2-06, R2-02, R4-08, R5-03, R5-08, R5-09, R5-11, R6-08, FS-01, FS-02, FS-05,
    FS-08, FS2-01.
- **Depends on WP01** (IC-01), which delivers:
  - `src/core/routes.ts` (destinations) and `src/core/displayed.ts` (the `ResourceKey` type and the displayed set per
    destination). Use them as WP01 lands them; `displayed.ts` is WP01's file (IC-02 is a requester only).
  - The `logic` Vitest project (Node, `browser: { enabled: false }`, `test/logic/**`) in `vitest.config.ts`, the
    `typeof window === 'undefined'` sentinel, and `test/setup/**` (failure on uncaught errors, NFR-007).
- **Depended on by WP03** (IC-03): `createShellController` composes `refreshKeys`, the scheduler, the gate primitives
  and `src/core/results.ts`. WP03 owns `src/core/connection.ts`, which holds the **refused flag** (FS-06); the
  **gate** and the **first-`connected` mark** live here (T008). WP06 later appends plant P-7 to the plant file you own.
- **The split with WP03 (state it in your hand-off).** `contracts/refresh-policy.md` says "mount the controller"; the
  controller does not exist yet. This WP runs the literal recording through a **test-only engine harness**
  (`test/support/engine-harness.ts`) that composes the same core pieces the controller will. The literal lives in
  `test/support/` so WP03 re-runs it, unchanged, through `createShellController`. These assertions **land in WP03,
  not here**:
  - FR-007 subscription counts (subscribe 1 + 1, unsubscribe 1 + 1, `connection.onChange` the same; a change after
    unmount records 0 reads and no error);
  - FR-010 and R2-10: the refused notice, reads still applying, and a non-first `connected` re-reading the displayed
    set as a shell-side resync with **0** new `subscribe` calls (the refused flag is WP03's);
  - the `error` view words: a degraded state before the first `connected` marking no-value slots `error`, and FS-05
    (a navigation while degraded shows `error`, not `loading`, with its read in flight);
  - the controller-level `setClient(b)` gate test (FS2-01) and the controller-level replay of the literal;
  - the result-to-view table, the refused load-more cursor view, and Ops `loadMoreError` (results.ts).
  - The NFR-001 mounted property check by t = 150 lands in WP06.

## Ownership

Owned files (frontmatter, verbatim):
- `packages/mission-shell/src/core/refresh-policy.ts`
- `packages/mission-shell/src/core/scheduler.ts`
- `packages/mission-shell/test/support/**`
- `packages/mission-shell/test/logic/refresh-policy.test.ts`
- `packages/mission-shell/test/logic/scheduler.test.ts`
- `gates/plants/unit-tests/**`

**Out-of-map edits**: none. Note: WP06 later appends P-7 to `gates/plants/unit-tests/plant.json` as a recorded
out-of-map edit. Keep the file a JSON array, append P-1 after the existing 8 entries, and leave those entries
byte-identical.

**Do not touch** (frozen surface, research R-17 and C-003): `src/client/port.ts`, `src/contract/stream.ts`,
`src/client/**` (including `fixture.ts`; use its existing options only), `src/testing.ts`, `src/index.ts`,
`src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`, `packages/mission-ui/**`, and the gate wiring (`ci.yml`,
plant `ciCommand`s, `scripts/gate-proof*`). Also not yours: `src/core/displayed.ts`, `src/core/routes.ts`,
`vitest.config.ts`, `test/setup/**` (WP01); `src/core/connection.ts`, `src/core/results.ts`, `src/controller/**`
(WP03). Anything you need in a file you do not own is a **change request** in the hand-off (file, change, reason),
not an edit.

### Subtask T006: Refresh policy table and `refreshKeys`

**Purpose**: encode `data-model.md` "Refresh policy" as data, one row per line, so P-1 has a unique anchor, and select
the re-read keys among the displayed ones (FR-008, NFR-003).

**Steps**:
1. In `src/core/refresh-policy.ts` (plain TypeScript; no Svelte, no mission-ui runtime, no timers), define the selector
   vocabulary for one change about Mission M (and WP W):
   - `mission`: `mission:{M}`;
   - `wp`: `wp:{M}/{W}` and `wp-detail:{M}/{W}` for the change's own W only (`wp:M/WP02` is not re-read by a WP01
     transition; see the WP02 row of the recording);
   - `missions`: the Missions screen's pages only, **never** `mission-names` (research R-04, R1-04);
   - `of-mission`: every displayed key whose read parameters carry `missionId = M` (including `drift:{M}`, whose
     `query.missionId` is M; never `drift:*`, `mission-names`, `ops`, `project`);
   - `all`: every displayed key.
2. Write `REFRESH_POLICY` as a `const` object keyed by `Change['kind']`, **exactly one row per line**, in this form:
   ```ts
   export const REFRESH_POLICY = {
     'status-transition': ['mission', 'wp', 'missions'],
     'mission-lifecycle': ['missions', 'mission'],
     'log-truncated': ['of-mission', 'missions'],
     resync: ['all'],
     refused: [],
   } as const satisfies Record<Change['kind'], readonly Selector[]>;
   ```
   The `mission-lifecycle` line must be byte-exactly `  'mission-lifecycle': ['missions', 'mission'],` (P-1's
   `find`). `satisfies Record<Change['kind'], …>` makes a missing or extra kind a type error. Import `Change` as a type
   from the port (`import type`), so `core/` stays runtime-free of the port module.
3. `refreshKeys(change, displayed): ResourceKey[]` returns, in the displayed set's order and without duplicates, the
   displayed keys the change's row selects. `refused` returns `[]` (the notice is WP03's, FR-010). Keys are matched
   on their read parameters, using WP01's `ResourceKey`; if WP01 exposes no parameter accessor, parse the key notation
   of `data-model.md` locally in this file.
4. Export `isStreamChange(kind)`: true for the first three rows, which coalesce; `resync` is a bypass (data-model
   "Refresh policy", last line).

**Files**: `packages/mission-shell/src/core/refresh-policy.ts`.

**Validation**:
- Unit cases in `test/logic/refresh-policy.test.ts`: a WP01 transition on WP Packages M/WP02 selects only `mission:M`;
  `log-truncated` for O selects nothing on Pipeline M (spec edge case "another Mission") but selects `missions` on
  Missions; `status-transition` on Drift M selects nothing; `resync` on Projects selects nothing.
- These unit cases do **not** replace the literal recording (T011), and nothing in the test computes the expected
  recording from `REFRESH_POLICY` (R5-09).

### Subtask T007: Read scheduler core (`src/core/scheduler.ts`)

**Purpose**: the ResourceSlot state machine of `data-model.md` "Read scheduling": coalescing, generations, bypass,
stale-while-revalidate (FR-009, NFR-001, NFR-002).

**Steps**:
1. Declare `ShellScheduler` **once**, here: `{ setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle:
   unknown): void }`, structurally identical to the fixture's `Scheduler` (R4-08). The scheduler takes it as a required
   argument; the "global timers" default of `ShellOptions` belongs to WP03's controller. No global timer reference in
   this file.
2. Export `COALESCE_WINDOW_MS = 100`.
3. `createReadScheduler(options)` with injected `scheduler: ShellScheduler`, `read(key, pageCursor?) =>
   Promise<Result>` and `apply(slot, outcome) => void`. Suggested surface (names may change; record the final exported
   surface in the hand-off for WP03): `setDisplayed(keys, trigger)`, `request(key, trigger)`,
   `requestAll(trigger)`, `loadMore(key, cursor)`, `slot(key)`, `dispose()`.
4. **One controller-wide monotonic generation counter** (R2-04), owned by the scheduler instance, which lives as long
   as the controller. Every issued read (or chain) takes the next number. It never resets, not on navigation and not on
   `setClient` (slots are dropped; the counter keeps rising).
5. `ResourceSlot` has exactly the fields of the data-model table: `latest`, `inFlight`, `trailing`, `windowTimer`,
   `value`, `view`, `refusal`.
6. Implement the transition table row by row:
   - stream request, idle slot, no window: issue, set `inFlight`, arm a 100 ms window on the injected scheduler (the
     leading read meets NFR-001);
   - stream request with the window open or `inFlight`: set `trailing`;
   - **window timer fires** (R2-01): if `trailing` and not `inFlight`: issue, clear `trailing`, arm a new window;
     otherwise the window simply closes (`windowTimer` = none);
   - read or chain settles: apply only if its generation equals `latest`; then, if `trailing` and the window is closed:
     issue, clear `trailing`, arm a new window;
   - **bypass** (R2-03): `navigation`, `resync`, `refresh`, `refocus`, `retry`, `rescan`: issue at once with a new
     generation even inside a window or with a read in flight, clear `trailing`, clear and re-arm the window. Type the
     triggers as a closed union; only `'stream'` coalesces. A retry **with a cursor** is a load-more (FS-08, T009), not
     a bypass;
   - slot removed (navigation drops a key): clear its timer and discard it; a later result finds no slot and is
     ignored without error.
7. **Navigation** (`data-model.md` "Navigation"): drop slots of keys no longer displayed; create fresh slots (no value)
   for new keys and issue them as bypass reads; keep slots and values of keys displayed before and after. Re-selecting
   the current destination re-reads its explicit-refreshed keys (the controller passes them; the scheduler only needs
   `request(key, 'navigation')`).
8. **Stale-while-revalidate** (R2-05): issuing never clears `value`, `view` or `refusal`. Export
   `pendingView(slot)`: `'loading'` only when `inFlight` and the slot has no value; otherwise the slot's own `view`.
   The degraded `error` override (FS-05) and the result-to-view table are WP03's (`results.ts`); `apply` is the hook
   WP03 fills.
9. Never swallow your own errors: no `catch` that hides an exception from `apply` or `read` (NFR-007). The port's reads
   never reject, so the scheduler adds no rejection handling beyond letting a programming error surface.

**Files**: `packages/mission-shell/src/core/scheduler.ts`.

**Validation** (in `test/logic/scheduler.test.ts`, against the scheduler directly with the fake scheduler of T010):
- each transition row has a test; the window-close test is T011's R2-01 case;
- **type test (R4-08)**: `ShellScheduler` and the fixture's `Scheduler` (imported as a type from
  `../../src/client/fixture`) are mutually assignable, for example with `expectTypeOf<ShellScheduler>()
  .toEqualTypeOf<Scheduler>()` plus two plain assignments; it is checked by `pnpm typecheck` (svelte-check includes
  `test/**/*.ts`), and a negative twin (`// @ts-expect-error` on an object missing `clearTimeout`) proves non-vacuity.

### Subtask T008: Connection gate primitives, per client

**Purpose**: no read before the client's first `connected`, then the displayed set at once (FS-01, FS-02, FS2-01;
spec FR-011, US4-1, US4-2). WP03 wires this to `client.connection` and `setClient`.

**Steps**:
1. In `src/core/scheduler.ts`, export `createConnectionGate(initialState: ConnectionState)` holding the **gate** and
   the **first-`connected` mark** of one client. (The refused flag is WP03's, in `core/connection.ts`, FS-06.)
2. `observe(next)` returns one of:
   - `'first-connected'`: the client's first `connected`. **An initial `connected`** (the state at creation or at
     `reset`) counts as first, so `createConnectionGate('connected')` is already open and reports it once;
   - `'reconnected'`: any later `connected`. The adapter's `resync` follows (or, while refused, WP03's shell-side
     resync);
   - `'degraded-before-first'`: a `degraded: …` state before the first `connected` (WP03 marks no-value slots
     `error`, without reads);
   - `'none'` otherwise.
3. `isOpen()`: false until the first `connected`. While closed, the scheduler issues **nothing**: `connecting`, and any
   `degraded` or `reconnecting` state before the first `connected`, issue no reads. Navigation while closed creates or
   drops slots but issues nothing.
4. On `'first-connected'`, the caller issues the **current displayed set** through the bypass path (as a navigation
   onto the current destination). **It is not a `resync`**: there is no `resync` at first contact (the fixture starts
   its replay at the first `connected` and resynchronises only a subscription that has been live).
5. `reset(state)`: the `setClient` API. It forgets the mark and recomputes from the new client's state; a new client
   already `connected` reports `'first-connected'` and is issued at once.
6. Pure logic only: the gate holds no timers and does no I/O; the reconnecting grace timer is WP03's.

**Files**: `packages/mission-shell/src/core/scheduler.ts`.

**Validation**:
- Primitive tests: `connecting` → `reconnecting` → `degraded: service-missing` → `connected` gives `none`, `none`,
  `degraded-before-first`, `first-connected`; a second `connected` after `reconnecting` gives `reconnected`;
  `reset('connecting')` after a first `connected` closes the gate, and the next `connected` is `first-connected`, not
  `reconnected` (FS2-01).
- Harness-level gating paths are in T011.

### Subtask T009: Page chains and the load-more interplay

**Purpose**: re-read multi-page lists (`missions`, `ops`) correctly, and order load-more against re-reads (R2-06,
R5-10, FS-08).

**Steps**:
1. A re-read of a chain key with n pages loaded reads page 1, then each next page with `query.pageCursor` set to the
   `pageInfo.nextPageCursor` of the page **just read** (re-chained, never the old cursors), up to n pages or until a
   page has no next cursor. Pages are read **sequentially**; a chain of n pages is n port calls in the recording.
2. The whole chain uses **one generation** and is applied **once, atomically**, when it completes (one `apply` with all
   pages). A newer generation discards the chain: no further page of a superseded chain is issued, and its result is
   not applied.
3. A refusal or `unavailable` on page 1 is applied like any single read. On page k > 1, the pages read so far are
   applied, with `pageInfo` from the last good page (partial apply).
4. Load-more:
   - `loadMore(key, cursor)` reads one page with the given cursor and appends it; the slot carries `loadingMore` while
     it runs (exposed for WP03's view);
   - a **stream** request during a load-more becomes `trailing` and, after the append, re-reads n + 1 pages;
   - a **bypass** during a load-more takes a new generation: the load-more result is discarded and the chain re-reads
     n pages;
   - a load-more arriving while a chain is in flight is **queued**, then issued after the chain applies, with the
     **new** last page's cursor, and dropped if that page has no next cursor;
   - **a cursor retry is a load-more** (FS-08): an Ops `sk-retry-load` with a `cursor` appends; it is not a bypass. A
     retry without a cursor re-reads page 1 as a bypass.
5. Report load-more outcomes to `apply` distinctly (an append, or a failed append), so WP03 can implement "a refused
   load-more cursor (400 `PageCursorRefusal`) drops the loaded pages and re-reads page 1" and Ops `loadMoreError`
   (`data-model.md` "Applying a result"). If the drop-and-reread is a scheduler action, expose it as a method WP03
   calls (it is a bypass page-1 read with n reset to 1).

**Files**: `packages/mission-shell/src/core/scheduler.ts`.

**Validation** (`test/logic/scheduler.test.ts`, with `createSequencedClient` serving two distinct pages):
- **2-page chain (R2-06)**: two loaded pages and one `mission-lifecycle` change give exactly two `listMissions`
  calls, `{}` then `{ query: { pageCursor: <nextPageCursor of the new page 1> } }` (a cursor distinct from the one
  originally loaded, so a test reusing old cursors fails), applied together in one `apply`.
- Partial apply on a page-2 failure; early stop on a page without a next cursor; a superseded chain issues no page 2.
- Load-more: append with `loadingMore`; trailing during load-more re-reads 3 pages; bypass during load-more discards
  the append; load-more during a chain is queued and uses the new cursor; a cursor retry appends and does not bump the
  chain's generation.

### Subtask T010: Test-only clients and harness in `test/support/`

**Purpose**: the deterministic clients and tools the Node tests (and later WP03 and WP06) need, without touching the
port (R5-08, C-003).

**Steps**:
1. `test/support/fake-scheduler.ts`: `createFakeScheduler()` implementing `ShellScheduler` with `now()`,
   `pending()`, and `async advance(ms)` that fires due timers in due-time then creation order and **flushes
   microtasks after each timer**, so a read resolved in a timer's tick is applied before the next timer fires. Export
   `flushMicrotasks()`. Use no Node-only API, so WP06's Chromium tests can reuse it. **The same instance is passed to
   the fixture and to the scheduler** (contract set-up).
2. `test/support/deferred-client.ts`: `createDeferredClient()`, a `MissionStatusClient` whose every read returns a
   promise the test settles (`resolveNext(op, result)`, or by call index), with a settable connection state and a
   captured stream listener so a test can emit changes.
3. `test/support/sequenced-client.ts`: `createSequencedClient(queues)`, one queue of `Result`s per operation. An
   exhausted queue throws synchronously with `sequenced client: <op> queue exhausted` (the port never rejects, so no
   rejected promise).
4. `test/support/recording-client.ts`: a recording proxy over any client. Each read records
   `"<op> <canonical params>"`, where canonical params are JSON with recursively sorted keys and `undefined` dropped
   (`getMission {"path":{"missionId":"…"}}`, `listMissions {}`). It also counts `subscribe`, unsubscribe,
   `connection.onChange` and its releases (WP03's FR-007 test). It delegates everything else. Note:
   `setConnectionState` must be called on the **inner fixture client** (the fixture keys its hook by instance).
5. `test/support/engine-harness.ts`: `mountEngine({ client, destination, scheduler })`, test-only: one unscoped
   subscription; stream changes → `refreshKeys` → `request(key, 'stream')`; `resync` → `requestAll('resync')`;
   `refused` → no reads; connection changes → the T008 gate; `navigate(destination)`; `dispose()`. It never becomes
   shell code; WP03's controller replaces it.
6. `test/support/expected-recording.ts`: the **literal** of `contracts/refresh-policy.md` "Expected recording", per
   destination and per step (C1 to C5, resync), as recording strings built from the constants `M`
   (`01JZAB3C4D5E6F7G8H9JKMNPQR`), `O` (another valid ULID) and `P` (a valid artifact path). It imports nothing from
   `src/core/refresh-policy.ts` (R5-09). Destination names are the test's message suffix: the Missions row is named
   exactly `missions`, and no other name starts with `missions`.
7. `test/support/changes.ts`: the injected changes copy: a deep copy of `contracts/fixtures/mission-status.changes.json`
   with **`items[0].delayMs` set to 250** (the contract's "item 1", the first item; the others are already 250), so the
   changes arrive at t = 250, 500, 750, 1000 and 1250 (R2-02). The fixture file stays unchanged.

**Files**: `packages/mission-shell/test/support/*.ts`.

**Validation**: each helper is exercised by T011's tests; the deferred and sequenced clients each satisfy
`MissionStatusClient` at the type level (a `satisfies` line), so the port is unchanged and covered.

### Subtask T011: Tests and plant P-1

**Purpose**: the literal oracle of SC-002 and NFR-003, the separate scheduler assertions, and the plant that proves the
`logic` project runs (FR-017).

**Steps**:
1. `test/logic/refresh-policy.test.ts`, for every row of the contract table (all 12, including WP-none, Artifacts-none,
   Pipeline O and Projects):
   - `createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: seq } })`, wrapped in the
     recording proxy; mount the engine harness on the destination;
   - flush the initial reads **before advancing** the fake scheduler, then clear the recording;
   - advance to each change, take and clear the recording per step; then
     `setConnectionState(inner, 'reconnecting')` and `setConnectionState(inner, 'connected')` (the internal hook,
     imported by relative path from `../../src/client/fixture`), which delivers one `resync`;
   - compare each step's sorted recording to the literal with
     `expect(actual, `refresh-policy mismatch on ${row.name}`).toEqual(expected)`. That custom message is the P-1
     token; **no test title contains `refresh-policy mismatch`** (R6-08). Use titles like `recording: missions`;
   - positive control (SC-002, non-vacuity): for every row with a non-zero total, the summed recording is non-empty,
     and parameters are asserted (a `wp:M/WP02` read carries `wpId: 'WP02'`).
2. `test/logic/scheduler.test.ts`, the separate assertions of the contract (no plant of their own):
   - **NFR-002** (R5-03): Pipeline M, an injected table of five `status-transition` items for M with `delayMs` 0, 10,
     10, 10, 10: **exactly 2** `mission:M` reads, the second at t ≥ 100, and the trailing read's value applied last.
     Count from mount: with `delayMs` 0 the burst falls inside the initial read's window, so the initial read is the
     leading read. Add a second burst variant starting at t = 250 (the first `delayMs` 250) that clears the recording
     after the initial load and still sees exactly 2 reads, at 250 and at ≥ 350;
   - **R2-01 window close**: a change at t = 0 and one at t = 50, the first read resolving at t = 10; the trailing read
     is issued at t = 100 by the window timer, with nothing in flight;
   - **NFR-001** (R5-11): with the immediately resolving fixture, the re-read is issued at the delivery tick and applied
     with fake time unchanged; with a deferred read resolved at t = 120, the value is applied at t = 120 (< 150);
   - **FR-009, R2-04**: A → B → A with `createDeferredClient`, the first A read resolving last and being dropped; two
     `mission:M` reads resolving out of order, the later-issued value shown;
   - **R2-03 bypass**, and the edge "`resync` while a read is in flight": a `resync` inside an open window issues at
     once with a new generation, and the in-flight result is dropped while the resync result is shown;
   - **R2-05**: a re-read leaves `value` and `view` in place, and `pendingView` is `loading` only without a value;
   - **R2-06** and load-more: T009's cases;
   - **gating paths** (FS-01, FS-02) through the harness and the fixture, each with the wording "no `resync`;
     shell-issued reads at the first `connected`", reads **observed before the fake scheduler is advanced**:
     `initialState: 'connecting'` (0 reads, then `connected`: exactly the destination's initial reads, and the harness
     saw no `resync` change); `connecting` → `degraded: service-missing` (0 reads) → `connected`; `initialState:
     'degraded: contract-mismatch'` (0 reads at mount) → `connected`; an initial `connected` reads at mount;
   - the R4-08 type test and the T008 primitive tests.
3. Append P-1 to `gates/plants/unit-tests/plant.json`, as the 9th element:
   ```json
   {
     "gate": "unit-tests",
     "ciCommand": "pnpm test",
     "expectFailPattern": "refresh-policy mismatch on missions",
     "overlays": [
       {
         "target": "packages/mission-shell/src/core/refresh-policy.ts",
         "edits": [
           { "find": "  'mission-lifecycle': ['missions', 'mission'],\n", "replace": "  'mission-lifecycle': ['mission'],\n" }
         ]
       }
     ]
   }
   ```
   Check that the `find` string occurs exactly once in the file. Under the plant only the Missions row's C1 cell loses
   its read, so the token appears only on failure.

**Files**: `packages/mission-shell/test/logic/refresh-policy.test.ts`, `packages/mission-shell/test/logic/scheduler.test.ts`,
`gates/plants/unit-tests/plant.json`.

**Validation**: the clean run passes with the token absent from its output; the P-1 leg turns red on the token; a JSON
parse of `plant.json` gives 9 entries, the first 8 equal to the base.

## Plants

- **P-1** (unit-tests): anchored edit in `packages/mission-shell/src/core/refresh-policy.ts` removing `missions` from
  the `mission-lifecycle` row (`  'mission-lifecycle': ['missions', 'mission'],` →
  `  'mission-lifecycle': ['mission'],`). Failure-only token: `refresh-policy mismatch on missions`, the assertion's
  custom message (no test title contains it). `ciCommand`: `pnpm test`. P-1 also proves that the `logic` project runs
  (plan "Plants", IC-01 risk on a vacuous project).

## Exit checks

Run from the lane worktree root (confirm with `git rev-parse --show-toplevel`). Browser and gate-proof commands go
through `heavy`, in the foreground, one at a time.
- [ ] `pnpm typecheck` passes (includes the R4-08 type test and its negative twin).
- [ ] `pnpm lint` passes, and `pnpm lint:no-io` passes over the new `src/core` files (no timers, globals or I/O in
      `core/`; no Svelte or mission-ui runtime imports).
- [ ] `heavy pnpm --filter @moes-media/mission-shell test` passes; the `logic` project reports both new test files
      with a pass count above 0, and the output is saved to a scratch file.
- [ ] The token is absent from the clean output: `grep -c 'refresh-policy mismatch on missions'` on that file prints 0.
- [ ] `heavy pnpm gate-proof leg --gate unit-tests` passes: the base run is green and every plant, P-1 included, turns
      red on its token. Record the **local leg time** in your final report (IC-09 sets the provisional timeout from
      it).
- [ ] `plant.json` parses as an array of 9 entries; entries 1 to 8 are unchanged (`git diff` shows only the append).
- [ ] Hygiene: no local paths, usernames or host names in any tracked file you changed (`pnpm hygiene`).
- [ ] The frozen surface is untouched: `git diff --exit-code "$(git merge-base HEAD main)" -- packages/mission-shell/src/client packages/mission-shell/src/index.ts packages/mission-shell/src/testing.ts packages/mission-shell/src/contract/stream.ts contracts/fixtures`.
- [ ] Each subtask recorded: `spec-kitty agent tasks mark-status T006 --status done` (and T007 to T011).

## Definition of Done

- `REFRESH_POLICY` is one row per line, typed against `Change['kind']`, and `refreshKeys` selects only displayed keys,
  with `missions` meaning the Missions pages only.
- The scheduler implements every transition of `data-model.md` "Read scheduling", including the window close, the six
  bypass triggers, one monotonic counter, stale-while-revalidate, page chains and the load-more rules; `ShellScheduler`
  is declared once and is mutually assignable with the fixture's `Scheduler`.
- The per-client gate issues nothing before the first `connected`, issues the displayed set at it (no `resync`), and
  resets for `setClient`.
- `test/support/` holds the fake scheduler, the deferred, sequenced and recording clients, the engine harness, the
  changes copy and the literal recording; the port and fixture are unchanged.
- The literal recording test and every separate assertion listed in T011 pass; P-1 is appended and proven.
- The hand-off lists: the final exported surface of `refresh-policy.ts` and `scheduler.ts`, the tests deferred to WP03
  and WP06 (see Context), the local unit-tests leg time, and any change requests.

## Risks

- **The NFR-002 set-up overlaps the initial window.** With `delayMs` 0 the burst lands inside the initial read's
  window, so "exactly 2" counts the initial read as the leading read. Count from mount, and keep the t = 250 variant so
  the stream-leading path is proven too. Do not change the contract's numbers.
- **Async timing in the fake scheduler.** Without a microtask flush between timers, results apply late and windows
  look open; that hides R2-01 and NFR-001 bugs. Keep `advance` async and flush per timer.
- **`setConnectionState` on the proxy** throws ("needs a client made by createFixtureClient"). Keep a handle on the
  inner fixture client.
- **A circular oracle.** Building the expected recording from `REFRESH_POLICY` would make P-1 pass silently. The
  literal never imports the policy.
- **Token leakage.** A test title or a `console` line containing the token would make the clean output match. Grep the
  clean output.
- **WP01 surface drift.** If `displayed.ts` lacks a parameter accessor, parse keys locally; do not edit WP01's files.
- **Leg time.** The unit-tests leg now runs the base plus 9 plants; expect over 20 minutes locally. Run it once, in the
  foreground, under `heavy`.

## Reviewer Guidance

- **Oracle independence**: `test/support/expected-recording.ts` is a literal and imports nothing from
  `src/core/refresh-policy.ts`; all 12 rows of the contract are present, including WP-none, Artifacts-none, Pipeline O
  and Projects, with parameters (a `wp:M/WP02` read carries `wpId: 'WP02'`).
- **Set-up fidelity**: `items[0].delayMs` is 250 in the copy, the fixture file is unchanged, the same fake scheduler
  instance goes to the fixture and the engine, the initial reads are flushed before the first advance, and the resync
  comes from `setConnectionState` imported by relative path.
- **P-1**: the anchor is unique, the token appears only on failure and in no test title, and the leg goes red on the
  token alone. Re-run the leg, or at least apply the overlay by hand and run the `logic` project once.
- **Non-vacuity**: the positive control fails if the engine issues no reads (try an engine that never reads: the
  recording test must fail). The gating tests assert reads **before** advancing the scheduler, and assert no `resync`
  change was seen.
- **Transitions**: one test per row, the window-close case issued by the timer (not by settle), bypass with a new
  generation, and the counter shared across slots (A → B → A).
- **Page chains**: the second call's cursor comes from the new page 1, not the old one; one `apply` per chain.
- **Boundaries**: `core/` has no timers, globals, Svelte or mission-ui runtime imports; the port, fixture and
  `displayed.ts` are untouched; `plant.json` entries 1 to 8 are byte-identical.
- **Split**: the hand-off names the tests deferred to WP03 (subscription counts, refused resync, `error` view words,
  controller replay) and WP06 (mounted NFR-001), and none of them is silently dropped.

## Implementation command

`spec-kitty agent action implement WP02 --agent claude`
