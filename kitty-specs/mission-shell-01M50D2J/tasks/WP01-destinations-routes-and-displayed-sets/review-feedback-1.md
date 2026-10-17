# WP01 review feedback, cycle 1 (reviewer-renata)

**Verdict: changes requested.** One blocking finding (setup files swallow errors). Everything else passes.

## BLOCKING (high): the setup files swallow unhandled rejections that Vitest would otherwise fail the run on (NFR-007, R5-11)

The WP prompt (T001, Definition of Done) says that both setup files must fail the run on uncaught errors and unhandled
rejections, and that "neither swallows them". In fact, both files make the suite **weaker than having no setup file
at all**. The listeners record an error, but only an `afterEach` reads the record back. Any error that arrives after
a file's last `afterEach` is recorded and then dropped, and having the listener installed also stops Vitest from
reporting it as an "Unhandled Rejection".

Reproduction (throwaway probes, deleted after the run; the default config, `isolate` left at its default):

```ts
// test/logic/zz-probe-b.test.ts  (and the same file under test/ for the unit project)
import { afterAll, it } from 'vitest';
it('probe-b only', () => {});
afterAll(async () => { void Promise.reject(new Error('setup-probe-afterall')); await new Promise((r) => setTimeout(r, 20)); });
```

- With the WP01 config, both `logic` and `unit (chromium)` report `Test Files 2 passed`, **exit 0**. The rejection is
  swallowed in both projects.
- Control: the same config with the two `setupFiles` lines removed. Vitest prints "Unhandled Errors ... Unhandled
  Rejection: setup-probe-afterall" and exits **1**.

A second defect in `test/setup/node.ts` is in the double-registration guard. The guard keeps the `process.on`
handlers from the first evaluation, but each evaluation creates a new module-level `recorded` array. When the setup
file runs again in the same process (`--isolate=false`, which is exactly the case the guard exists for), the old
handlers push into an array that no `afterEach` reads. Reproduction: `vitest run --project logic --isolate=false
--no-file-parallelism`, with a plain file A scheduled before file B, and B doing an unawaited
`Promise.reject(...)` inside a test. The result is `2 passed`, **exit 0**. Without the setup file, the same run exits
1 with "Unhandled Rejection".

What was verified as working: an unawaited rejection, or a `setTimeout` throw, inside a test body fails that test
with the original error, in both projects.

Fix direction (the implementer chooses):
- the errors must reach a failure on every path. Either drain the record in an `afterAll` as well as in `afterEach`,
  or stop consuming the event so that Vitest's own unhandled-error failure still fires;
- keep the record on `globalThis` next to the guard (or register per evaluation and remove the listeners in
  `afterAll`), so the guard cannot orphan it;
- re-run the three probes above (in-test rejection, `afterAll` rejection, `--isolate=false` cross-file) for each
  project. Each must exit non-zero, and the hand-off must record the failing lines.

## Non-blocking (low)

- `WP_ID_MAX_LENGTH` (64) is not part of the YAML copy test. Only the `WpId` pattern is compared with `WpId.yaml`.
  Add `expect(WP_ID_MAX_LENGTH).toBe(schemas('WpId')['maxLength'])` so the copy test covers what T003 step 4 asks for.

## Passing checks (no action)

- Routes: the round trip compares parsed destinations (13 rows, all 7 screens, loop count asserted, literal route
  strings). Every probed negative parses to Missions and does not throw: `%`, `%E0%A4%A`, `%ED%A0%80`, `..%2F`,
  `%2E%2E`, `a%2F..%2Fb`, `%2F`, `%00`, `a%0Ab`, `%E2%80%A8`, `C%3Ax`, `%7E%2Fx`, `a%5Cb`, `a%2F%2Fb`, a 65-character
  WP id, a lowercase or 25-character ULID, `/ops/` and `/missions%2F{M}`. The `decode` try/catch wraps only
  `decodeURIComponent`. `normaliseRoute` derives `canonical` from the parsed destination, re-formatted (R3-03). No
  ReDoS was observed.
- Displayed sets: the oracle is literal key strings, not values derived from `displayed.ts`. They match the
  data-model table row for row, including WP-none and Artifacts-none. `missions` and `mission-names` are distinct.
  `ofMission` has positive and negative cases.
- Projects: `logic` runs 27 tests in Node with `browser: { enabled: false }` set explicitly, and the sentinel is real.
  `unit (chromium)` runs 69 tests, unchanged from #17.
- Gates: `pnpm lint`, `pnpm lint:no-io`, the shell `typecheck`, `pnpm hygiene` and `pnpm test:terminology` all exit
  0. `src/core/**` imports only `./routes` (type only), and the layering block covers `src/{core,controller,intents}/**`.
- Frozen surface: the `git diff --exit-code` over the frozen paths is empty. Commit d915d3a touches only the seven
  owned files.
