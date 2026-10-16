---
affected_files: []
cycle_number: 2
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T13:29:51Z'
reviewer_agent: claude
wp_id: WP02
---

# WP02 review feedback, cycle 2 (reviewer-renata)

**Verdict: changes requested. The only item left is one missing test.** The F1 fix is correct, documented and
well covered. The F2 code is correct. But one of the two F2 guards is not covered by any committed test, and this
cycle's acceptance bar was that each reproduction is covered.

## BLOCKING (low, test only): the `closeWindow` guard of F2 is untested

The new test "F2: a trailing read is not issued by the window timer or a settle once the gate has closed" leaves the
read **in flight** when the window closes at t = 100. On that path `closeWindow` would issue nothing anyway
(`!slot.inFlight` is false), so the test exercises only the `afterSettle` guard.

Mutation evidence (each one applied by hand and reverted):
- Removing `&& isOpen()` from `closeWindow`: `logic` passes 108/108. **This mutant survives.**
- Removing `&& isOpen()` from `afterSettle`: 1 test fails. This mutant is caught.

Requested: add the cycle-1 F2 case (or extend the existing test) so that the read settles **before** the window
closes. Then close the gate and advance to t = 100. Expect no second call. Optionally, reopen the gate with
`requestAll('navigation')` and expect exactly one read with `trailing` cleared. Sketch:

```ts
r.sched.setDisplayed([MISSION]);
r.sched.request(MISSION, 'stream');          // trailing
await r.settle('getMission', { v: 1 });      // settles inside the window: nothing in flight
open = false;
await r.fake.advance(100);                   // window closes while gated
expect(r.calls()).toHaveLength(1);
```

Confirm that the new test fails with the `closeWindow` guard removed.

## Verified this cycle (no change needed)

- **F1 reproductions** (scratch, deleted):
  - `createConnectionGate('connected')` → `reconnecting` → `connected` gives `reconnected`.
  - `reset('connected')` returns `first-connected`, and a later reconnect is `reconnected`.
  - Both are now committed tests.
  - A mutation that restores the old bug fails 14 tests: both F1 unit tests, plus every literal recording row,
    because the harness no longer makes a synthetic `observe` and the resync step would double-read.
- **Design for WP03**:
  - `initial()` and the `reset()` return value are documented on `ConnectionGate`, including "the caller does NOT
    call `observe` for the current state".
  - `reset('connecting')` after an open gate closes it, and the next `connected` is `first-connected`.
  - `reset('degraded: …')` reports `degraded-before-first`.
  - A `degraded` state after the gate has opened is `none`.
  - Because the gate closes only on `reset`, using `open` as the first-`connected` mark is sound.
  - Engine level: an initial `connected` plus one reconnect gives exactly one re-read.
- **No regressions**:
  - `heavy pnpm --filter @moes-media/mission-shell test`: 177 passed, and the token is absent from the clean output.
  - `pnpm lint`, `pnpm lint:no-io`, `pnpm typecheck` (0 errors, 0 warnings) and `pnpm hygiene` (0 findings) all
    pass.
  - The nits are folded in.
  - `73bf749` touches only owned files.
