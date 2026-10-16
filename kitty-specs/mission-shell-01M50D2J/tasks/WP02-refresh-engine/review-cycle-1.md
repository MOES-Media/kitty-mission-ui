---
affected_files: []
cycle_number: 1
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T13:16:58Z'
reviewer_agent: claude
wp_id: WP02
---

# WP02 review feedback, cycle 1 (reviewer-renata)

**Verdict: changes requested.** There is one blocking finding: the connection gate does not count an initial
`connected` as the first `connected`. The fix is small and sits in a file WP02 owns. If it is not fixed here, WP03
would need an out-of-map change request against `scheduler.ts`. Apart from the findings below, everything passes.

## BLOCKING (medium): an initial `connected` does not set the first-`connected` mark (data-model "Connection gate", FS2-01)

`data-model.md` "Connection gate" says: "A client whose state is already `connected` when it is mounted, or passed to
`setClient`, **counts as that client's first `connected`**." Research R-05 and plan.squad FS2-01 say the same.

In `createConnectionGate`, `start(state)` sets `open = state === 'connected'` but leaves `reported = false`. The
mark is set only when `observe('connected')` is called later. The port's `connection.onChange` does not replay the
current state (see `fixture.ts` `onChange`), so nothing calls that `observe` unless the caller adds a synthetic
`observe(client.connection.state)` right after it creates or resets the gate. The test harness does this
(`engine-harness.ts:85`), which hides the defect. This calling rule is written nowhere.

Reproduction (a scratch Node test, deleted afterwards):

```ts
const gate = createConnectionGate('connected');
gate.observe('reconnecting');            // 'none'
gate.observe('connected');               // expected 'reconnected', got 'first-connected'

const g2 = createConnectionGate('connecting');
g2.observe('connected'); g2.reset('connected');
g2.observe('reconnecting');
g2.observe('connected');                 // expected 'reconnected', got 'first-connected'
```

Consequence: suppose the controller (WP03) takes "`createConnectionGate('connected')` is already open" at its word.
It issues the displayed set at mount without the synthetic `observe`. The client's first real reconnect is then
classified as `first-connected`. The controller would issue a navigation bypass of the whole displayed set **and** the
adapter's `resync` would do the same, so every key would be read twice in the resync step (NFR-003). The refused
path's shell-side resync, which is keyed on `reconnected`, would also take the wrong branch.

Requested fix (in `src/core/scheduler.ts`, test updates in `test/logic/scheduler.test.ts`):
1. In `start(state)`, set the mark when the state is `connected` (`reported = state === 'connected'`), so that a
   later `connected` after `reconnecting` is `reconnected`.
2. Make the initial observation explicit instead of relying on a synthetic `observe`. For example, `reset(state)`
   returns its `GateObservation` (`'first-connected'` for a connected client), and the gate exposes the initial one
   (an `initial` field, or `createConnectionGate` returning it). Document that the caller issues the displayed set when
   this is `'first-connected'`. Any equivalent design is fine, as long as the rule is stated in the type's doc comment.
3. Update the harness to use it (and drop the `gate.observe(client.connection.state)` call, or keep it harmless).
4. Tests: add the two reproductions above (`reconnected` expected), and adjust "an initial connected is already open
   and reports first-connected once" and "FS2-01: reset onto a connected client reports first-connected at once" to
   assert on the new explicit report rather than on a synthetic `observe('connected')`.

## Non-blocking (low): the window timer and settle issue a trailing read without checking the gate

`closeWindow` and `afterSettle` call `issue(entry)` without consulting `isOpen()`. Every other issuing path checks
the gate. In a scratch test, a stream request set `trailing`, then the gate closed (`isOpen` → false). When the window
closed at t = 100, a read was still issued while gated. Today the gate closes only on `reset` (`setClient`), and the
plan drops slots there, so this is latent. A one-line guard (`if (!isOpen()) return;`, keeping or clearing `trailing`)
makes the "while closed the scheduler issues nothing" rule hold for every path. Recommended in the same cycle.

## Nits (optional)

- `scheduler.test.ts:72`: the title says "a stream request on an idle slot", but the test drives `setDisplayed` (a
  navigation bypass). The stream-on-idle path is covered at line 129. Rename the test or drive `request(..., 'stream')`.
- `scheduler.test.ts:239`: the comment says "the first A read last", but `r.settle` resolves call 0 (A1) **first**.
  The test at line 247 covers the reverse order correctly. Fix the comment or the order.
- `scheduler.ts:364`: `void trigger;` sits inside the loop. Move it out of the loop, or drop the parameter's use
  note. Cosmetic.

## Deviations judged acceptable

- **Private bookkeeping outside `ResourceSlot`** (`Entry`: `pages`, `lastCursor`, `loadingMore`, `queuedMore`,
  `removed`). `ResourceSlot` has exactly the seven data-model fields. The chain state is exposed through `pages()` and
  `loadingMore()`. Accepted.
- **A load-more takes a generation.** This is harmless: a load-more never runs alongside an in-flight chain, because
  it is queued behind it. A bypass still supersedes the load-more. The FS-08 test asserts that a cursor retry during a
  chain does not bump `latest`. Accepted.
- **`void trigger`.** Cosmetic. Accepted.

## Checks that passed (evidence)

- Scheduler rules, against the code and scratch tests:
  - Leading read plus at most one trailing read per window, including a 35-request stream over 350 ms.
  - R2-01: the window timer issues the trailing read when nothing is in flight.
  - A shared, monotonic counter. A → B → A plus a bypass with out-of-order deferred settles applies only the newest
    value.
  - Only `stream` coalesces. The latest-issued read wins.
  - Stale-while-revalidate holds.
  - A cursor retry is a load-more.
  - R2-06: the chain re-reads with the new page-1 cursor and applies once; a superseded chain is dropped.
- The literal oracle `expected-recording.ts` imports nothing from the policy. All 12 rows match the contract table,
  including WP-none, Artifacts-none, Pipeline O and Projects. `changes.ts` sets `items[0].delayMs = 250`.
- NFR-002: exactly 2 reads, the second at t ≥ 100, with the trailing value applied last. The t = 250 variant also
  passes.
- P-1:
  - The anchor occurs once.
  - The token comes only from an assertion message.
  - The clean output has 0 matches.
  - With the overlay applied by hand, the `logic` project fails on `refresh-policy mismatch on missions (C1
    mission-lifecycle)`.
  - `plant.json` has 9 entries, and entries 1 to 8 equal the base.
- `pnpm lint`, `pnpm lint:no-io`, `pnpm typecheck` (0 errors) and `pnpm hygiene` (0 findings) all pass.
- `heavy pnpm --filter @moes-media/mission-shell test`: 174 passed.
- No `catch` or `console` in the new source or tests.
- `src/core` imports only types from the port.
- Commit `abc471f` touches only owned files.
