# Contract: refresh policy and the expected read recording (FR-007 to FR-010, SC-002, NFR-001 to NFR-003)

The policy table, the displayed sets and the scheduling rules are in `data-model.md`. This file fixes the
**recording** the refresh-policy test compares against, so the test, its plant P-1 and the reviewer share one oracle.
The expected recording is written in the test as a **literal**. It is not computed from the policy table, which would
make the test circular (R5-09).

## The test set-up

- **Client.** `createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: seq } })`, where:
  - `seq` is a copy of `contracts/fixtures/mission-status.changes.json` with **item 1's `delayMs` set to 250** (R2-02).
    So every change arrives at least 250 ms after the initial reads, outside their 100 ms window. The changes arrive
    at t = 250, 500, 750, 1000 and 1250 ms.
  - The fixture file itself is unchanged (C-003); the test passes a modified copy through the existing
    `fixtures.changes` option.
- **Recording proxy.** The client is wrapped in a test-only proxy that records `"<op> <canonical params>"` for every
  read and delegates to the fixture.
- **Ids.** `M` is the sequence's Mission (`01JZAB3C4D5E6F7G8H9JKMNPQR`). `O` is another valid ULID. `P` is a valid
  artifact path. The changes are `mission-lifecycle`, `status-transition`, `status-transition`, `log-truncated` and
  `status-transition`, all for M; the transitions are for WP01.
- **Steps:**
  1. Mount the controller on the destination.
  2. Flush the initial reads, before advancing the fake scheduler, and clear the recording.
  3. Advance the fake scheduler through the five changes.
  4. Force `reconnecting` and then `connected` with the internal hook (imported by relative path), which delivers one
     `resync`.
- **Project.** Node (`test/logic/`).

## Expected recording (reads after the initial load)

Any read not listed fails (NFR-003), and every listed key must appear at least once (the positive control of SC-002).
Parameters are asserted too: a `wp:M/WP02` read carries `wpId: 'WP02'`.

| Destination | C1 lifecycle | C2 st WP01 | C3 st WP01 | C4 truncated | C5 st WP01 | resync | Total |
|---|---|---|---|---|---|---|---|
| Missions (1 page) | `missions` | `missions` | `missions` | `missions` | `missions` | `project`, `missions` | `missions` 6, `project` 1 |
| Drift `*` | none | none | none | none | none | `project`, `drift:*`, `mission-names` | 3 |
| Drift `M` | none | none | none | `drift:M` | none | `project`, `drift:M`, `mission-names` | `drift:M` 2, others 1 |
| Ops (1 page) | none | none | none | none | none | `project`, `ops` | 2 |
| Pipeline `M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` 6 |
| Pipeline `O` | none | none | none | none | none | `mission:O` | 1 |
| Work Packages `M`, none selected | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` | `mission:M` 6 |
| Work Package `M`/WP01 | `mission:M` | `mission:M`, `wp:M/WP01`, `wp-detail:M/WP01` | same as C2 | same as C2 | same as C2 | same as C2 | `mission:M` 6, `wp` 5, `wp-detail` 5 |
| Work Package `M`/WP02 | `mission:M` | `mission:M` | `mission:M` | `mission:M`, `wp:M/WP02`, `wp-detail:M/WP02` | `mission:M` | `mission:M`, `wp:M/WP02`, `wp-detail:M/WP02` | `mission:M` 6, `wp` 2, `wp-detail` 2 |
| Artifacts `M`, none selected | `mission:M` | `mission:M` | `mission:M` | `mission:M`, `artifacts:M` | `mission:M` | `mission:M`, `artifacts:M` | `mission:M` 6, `artifacts` 2 |
| Artifact `M`, `P` | `mission:M` | `mission:M` | `mission:M` | `mission:M`, `artifacts:M`, `artifact:M:P` | `mission:M` | `mission:M`, `artifacts:M`, `artifact:M:P` | `mission:M` 6, `artifacts` 2, `artifact` 2 |
| Projects (picker) | none | none | none | none | none | none | 0 |

- **P-1** removes `missions` from the `mission-lifecycle` row of `REFRESH_POLICY`. The Missions row's C1 cell then
  records nothing, and the test fails with its assertion message `refresh-policy mismatch on missions`.
- That message is the assertion's custom message, so it is printed only on failure. No test title contains it (R6-08).

## Separate assertions (Node project; no plant of their own)

- **NFR-002 (coalescing)** (R5-03). On Pipeline `M`, an injected change table of five `status-transition` items for M,
  with `delayMs` 0, 10, 10, 10, 10:
  - records **exactly 2** `mission:M` reads;
  - the second is issued at t ≥ 100 ms (fake time);
  - the value applied last is the trailing read's value.
- **R2-01 (window close).** One change at t = 0 and one at t = 50, where the first read resolves at t = 10. The trailing
  read is issued when the window timer fires at t = 100, with nothing in flight.
- **NFR-001 (latency)** (R5-11):
  - With the immediately resolving fixture, the re-read is issued at the change's delivery tick, and the value is
    applied in the same tick (fake time 0 ms after delivery).
  - With a deferred read resolved at t = 120 ms, the value is applied at t = 120 (under 150).
  - A mounted Chromium test asserts the screen **property** holds the new value by t = 150.
- **FR-009 and R2-04 (latest wins).** With `createDeferredClient`:
  - A → B → A: the first A read resolves last and is dropped.
  - Two `mission:M` reads resolve out of order, and the later-issued value is shown.
- **R2-03 (bypass).** A `resync` inside an open window issues at once, with a new generation, and drops the in-flight
  result.
- **R2-06 (page chain).** Missions with **two loaded pages**: one `mission-lifecycle` change gives exactly two
  `listMissions` calls, `{}` then `{ query: { pageCursor: <nextPageCursor of the new page 1> } }`. The pages are
  applied together. Load-more, during a chain and with a trailing request, follows `data-model.md`.
- **FR-007 (subscription counts).** Over mount, client change and unmount: subscribe 1 + 1, unsubscribe 1 + 1;
  `connection.onChange` the same. A change delivered after unmount records 0 reads and no error.
- **FR-010 and R2-10 (refused).**
  - `examples: { streamEvents: 'StreamRefusal.content-mismatch' }` shows the notice, and reads still apply.
  - Then `reconnecting` → `connected` re-reads the whole displayed set (a shell-side resync), with **0** new
    `subscribe` calls.
- **Connection gating** (R2-02; FS-01 and FS-02, superseding R2-09):
  - `initialState: 'connecting'`: 0 reads. Then `setConnectionState('connected')`: no `resync`; shell-issued reads at
    the first `connected`, exactly the destination's initial reads, **observed before the fake scheduler is
    advanced**.
  - `connecting` → `degraded: service-missing`: 0 reads, and every no-value slot shows `error`. Then `connected`: no
    `resync`; shell-issued reads at the first `connected`.
  - `initialState: 'degraded: contract-mismatch'`: 0 reads at mount, `error`. Then `connected`: no `resync`;
    shell-issued reads at the first `connected`.
  - FS-05: after the first `connected`, a navigation while `degraded` shows `error` (not `loading`) on the new no-value
    slot while its read is in flight. The read's result then applies by the table.
- **Edge: `resync` while a read is in flight.** The in-flight result is dropped, and the resync read's result is shown.
- **NFR-007.** A Node setup file fails the run on any `unhandledRejection` or `uncaughtException`. Nothing in the shell
  swallows its own errors.
