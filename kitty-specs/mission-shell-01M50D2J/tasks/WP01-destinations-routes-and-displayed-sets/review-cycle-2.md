---
affected_files: []
cycle_number: 2
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T12:51:25Z'
reviewer_agent: claude
wp_id: WP01
---

# WP01 review feedback, cycle 2 (reviewer-renata)

**Verdict: changes requested.** Commit 8cd0ba4 fixes most of cycle 1, but one case is still swallowed in the `unit`
(Chromium) project.

## BLOCKING (high): the browser setup file still swallows a rejection raised synchronously in `afterAll`

Reproduction (throwaway probe, deleted after the run):

```ts
// test/zz-aa0.test.ts  (unit project)
import { afterAll, it } from 'vitest';
it('only', () => {});
afterAll(() => { void Promise.reject(new Error('probe-br-afterall-sync')); });
```

- With the WP01 config, `vitest run --project unit test/zz-aa0.test.ts` reports `Test Files 1 passed`, **exit 0**.
  It gave the same result on a second run.
- Control: the same config with only the `setupFiles: ['test/setup/browser.ts']` line removed. Vitest prints
  "Unhandled Errors ... Unhandled Rejection: probe-br-afterall-sync" and exits **1**.

So `test/setup/browser.ts` still makes the `unit` project weaker than Vitest's own baseline. The DoD says "neither
swallows them" (NFR-007, R5-11). The same probe in the `logic` project fails correctly, with exit 1. When the
afterAll awaits 50 ms after rejecting, the browser case also fails correctly, with exit 1. So what remains is the
case where the rejection is raised without an await and the setup file's `afterAll` drain does not see it, while the
listener still stops Vitest's own report. I did not pin down the mechanism. A console-log probe of the hook order
printed nothing from the browser. The implementer should diagnose it:
- whether the setup-file `afterAll` runs before or after the test file's `afterAll` in browser mode;
- whether the `unhandledrejection` event is dispatched after the `setTimeout(0)` drain;
- whether an error thrown from the setup-file `afterAll` reaches the reporter at all.

Possible fixes: drain later (for example, wait until the event has had time to arrive, with a bound); or record
without suppressing Vitest's report. Whatever the fix, verify it with the probe above **and** its control.

## Verified fixed (no action)

| Probe | logic | unit (chromium) |
|---|---|---|
| In-test unawaited rejection | exit 1, `probe-node-intest` | exit 1, `probe-br-intest` |
| `afterAll` rejection with a 20/50 ms await | exit 1 | exit 1 |
| `afterAll` synchronous rejection | exit 1 | **exit 0 (above)** |
| `--isolate=false --no-file-parallelism`, plain file first, rejection in the second file | exit 1, attributed to `probe-b rejects` | exit 1 (also `--browser.isolate=false`) |

- The `globalThis` store fixes the stale-array defect of the node.ts guard.
- The low finding is folded in: `WP_ID_MAX_LENGTH` is now compared with `WpId.yaml` `maxLength`.
- A passing run reports 96 tests: logic 27, unit (chromium) 69. All probe files are deleted and the worktree is
  clean.
