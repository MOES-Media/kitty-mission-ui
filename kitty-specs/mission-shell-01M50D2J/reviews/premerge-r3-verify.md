# Pre-merge squad R2/R3: fix verification (2026-10-16)

**Reviewer:** reviewer-renata. The reviewer wrote none of the fixes and reported only.

**Scope:** `feat/mission-shell-18` at d8de2dd, checked against 51eb864, the commit that holds the R1 record. The fixes came from `premerge/shell`: 13 commits, 385b82c..0800c2c, merged at 270c3a0. The orchestrator then updated `contracts/shell-api.md` in d8de2dd.

**Method:**
- Every R1 finding marked Fold was checked against the files and against live probes, not against the commit messages.
- The probes were throwaway Vitest files. Logic probes ran in Node and Svelte prop-path probes ran in Chromium, all against the real controller and component.
- Each guard was either run red or shown by reasoning to fail on revert. In all, 24 mutants ran in a scratch worktree, one at a time, under the `heavy` wrapper.
- The scratch worktree was removed afterwards, and the checkout was left clean.
- The visual leg and the full gate-proof run were not repeated. The implementer reports that P-7 was proven in 545 s.

## Result per R1 finding

| R1 ID | Result | Guard |
|---|---|---|
| ARCH-001 | VERIFIED | Through the controller and the `mountShell` handle, the probes show:<br>- picker → `setClient(adapter)` shows `/missions`, announces it, and reads only `getProject` and `listMissions`;<br>- Mission → `setClient(null)` shows `/projects` and announces it;<br>- with a null client, `setRoute('/ops')` and `setRoute('/projects')` both stay on `/projects`, announced each time;<br>- project A → B from a Work Package route shows `/missions`, and B reads nothing of A's Mission.<br>Four mutants are killed by `null-client.test.ts`: `setClient` keeping the old destination, no coercion in `show`, no coercion in `reconcile`, and an unannounced `setRoute` coercion. The Svelte prop path is not covered by this; see ARCH-009 and R2-NEW-001. |
| ARCH-001: dashboard behaviour change | Legitimate | On the dashboard, `setClient(null)` with no route now resets to `/missions`. This is the default route of (null, dashboard), which is exactly the rule the contract now states. A Svelte or handle host that wants to keep its screen passes the route. See R2-NEW-004 for the test title. |
| ARCH-001: `host.test.ts` relaxation | Legitimate, coverage-neutral | The old scenario, a null client leaving the picker through `setRoute('/ops')`, cannot happen any more because ARCH-001 coerces it to `/projects`. With a real client the same `leavePicker` path is exercised.<br>The `projectsSeq += 1` in `leavePicker` was already masked before the fold: that mutant survives at 51eb864 with the null-client test too, because `loadProjects` resets the slot on re-entry. The new stale-retry test pins the guard inside `loadProjects` (mutant killed). The A5 test's no-client case moved to the dashboard; `resetSession` does not depend on the mode, so nothing is lost. |
| ARCH-002 / CON-003 / TEST-003 | VERIFIED | `setState` returns early on an unchanged state. A controller probe confirms it: a shown `reconnecting` banner stays shown after a second `reconnecting`, with 0 timers pending.<br>Removing the guard fails all 3 new tests. One of them is the crash-loop replay: `reconnecting` ×3 across backoffs, then degraded, which gives `[null, null, reconnecting, reconnecting, reconnecting, service-missing]` and no timer left behind.<br>The controller's `gate.observe` still sees every state, so a duplicate cannot hide a `first-connected` or a `reconnected`. |
| ARCH-003 | VERIFIED | Probes and contract fidelity:<br>- The handle, the component export, the controller and the watched `copy` prop all reach one `overrides` variable.<br>- It replaces, not merges: a merge mutant fails 3 tests.<br>- `setCopy({})` and a prop that becomes `undefined` restore the defaults.<br>- An override is shown as given (probe: `"raw <b>"` comes back verbatim), and the CP-1 A2 sentence rule applies to the defaults only.<br>- Calling it after `destroy` does nothing.<br>- `ShellCopyOverrides` is exported from `./shell`.<br>- The contract, the package README and `mount.ts` agree.<br>Killed mutants: controller no-op, prop ignored, and handle dropped (killed by `banners.test.ts`; `mount.test.ts` alone does not catch it). One mutant survives: writing after `destroy` is unobservable because the listeners are cleared, so the after-destroy no-op is pinned only as "does not throw". Not a defect. See R2-NEW-002. |
| ARCH-005 | VERIFIED | The README's two host rules (replace for a synchronous canonicalisation, skip an equal route) are present. See R2-NEW-003 for text the ARCH-001 fold made stale. |
| ARCH-008 | VERIFIED | The README names three entries, `.`, `./testing` and `./shell`, matching `package.json`. |
| ARCH-009 | VERIFIED (R3, 22007e8; PARTIAL at d8de2dd) | The same-tick case is fixed. A probe with client A → B plus route `/missions/{id}/artifacts` in one tick gives 0 reads on A and only `getMission` and `listArtifacts` on B, with no default screen read and no spurious `routeChanged`. Dropping the forwarded route fails 2 `props.test.ts` tests.<br>But the route prop is now forwarded on every client change, even when it did not change. That reopens ARCH-001 for prop-driven hosts; see R2-NEW-001. |
| CON-001 | VERIFIED | `isArtifactPath` refuses `\p{Cs}`.<br>- Creating the controller, `setRoute`, `setClient`, intents, the mounted shell and the artifacts tree are all no-throw.<br>- The tree drops only the bad rows.<br>- The pair `dir/` + U+1F600 + `.md` is valid and round-trips (probe).<br>- Reverting `routes.ts` fails 5 tests across the logic, mounted and destination-guard suites; reverting `navigation.ts` fails the `treesOf` test.<br>A Work Package id with a lone surrogate from service data does not throw, because `routeHref` does not percent-encode that segment, so it is outside CON-001. |
| CON-002 | VERIFIED | `go` checks every intent-built destination. An unguarded `go` fails 9 tests, and the round-trip test asserts `formatRoute(parseRoute(r)) === r` for every emitted route.<br>The `retryWorkPackage` and `retryArtifact` guards are present, but their mutants survive. As the test file itself states, they are defence in depth: `scheduler.request` looks up only displayed keys, and those come from destinations that were already validated. They are equivalent by reasoning, not a gap. |
| CON-004 | VERIFIED | A slot with no value now gets `refusal: null` on `unavailable` (probe). The mutant fails the new test for all 10 kinds. The positive control, a slot with a value keeping its refusal, holds. |
| TEST-001 | VERIFIED | Mutants that drop the `query`, `filter` or folder-map reset are each killed, by both A5 cases. At 51eb864 the old A5 test let the `query` mutant survive. |
| TEST-002 | VERIFIED | Dropping `seq !== projectsSeq` in `loadProjects` fails the new stale-retry test. |
| TEST-005 | VERIFIED | The `now` test sees a clock change. A mutant where an applied read no longer moves `now` is killed. |
| GATE-001 | VERIFIED | Against `origin/main`, `ci.yml` changes in only two matrix `timeout:` lines: unit-tests 30 → 32 and eslint 8 → 10. The README's formula checks out: 13 × 34 s + 2 min = 9.4, rounded up to 10. `gate-proof coverage`: ok. |
| GATE-002 | VERIFIED | The README and CHANGELOG now call both timeouts a projection from the `#17` CI run, not a measurement, and say that a `(landing)` change re-derives them. The arithmetic for unit-tests is 11 × 2.7 + 2 = 31.7, which rounds to 32. |

## New findings

| ID | Sev | Finding | Suggested fold | R3 status (22007e8) |
|---|---|---|---|---|
| R2-NEW-001 | 3 | **The ARCH-009 fold reopens ARCH-001 on the Svelte prop path.** The client effect calls `setClient(client, untrack(() => options.route))`, even when the route prop did not change. A host whose route prop holds the current route therefore keeps the old destination on a client-only change. That host might echo `routeChanged` into its route prop (the router-bound pattern that `props.test.ts` itself models), or it might mount the picker with `route: '/projects'`. Chromium probes on `PropsHost`:<br>- (a) null client with `route: '/projects'`, then the host sets a client: the shell stays on the picker, with no `routeChanged`;<br>- (b) an echoing host inside Mission M of project A switches to B: the shell stays on the Pipeline and B reads `getMission` for A's Mission;<br>- (c) an echoing host on `/projects` with a client switches project: the shell stays on the picker.<br>These are the ARCH-001 symptoms: "picking a project changes nothing visible" and "switching projects reads the old Mission". The `mountShell` handle path is correct. | Forward the route only when it changed in the same tick: `options.route !== lastRoute ? options.route : undefined`. Probed in scratch: it fixes (a), (b) and (c), keeps the same-tick case at 0 wasted reads, and keeps the ARCH-009 test green. It fails one existing assertion, in `props.test.ts` "forwards a changed route and a changed client once": that assertion expects a client-only change to stay on `/ops`, which encodes the pre-fold behaviour where the destination was kept. Decide which behaviour the prop path should have, then pin it with a test for (b). | VERIFIED. The client effect forwards the route only when it differs from `lastRoute` (`MissionShell.svelte`). My probes on the tip: (a) the picker with route `/projects` goes to `/missions` when the host sets a client, announcing `/missions`; (b) an echoing host that navigated into Mission M in project A and switches to B shows `/missions`, and B reads only `getProject` and `listMissions`; a non-echoing host behaves the same; (c) an echoing host on `/projects` switches project and lands on `/missions`. The same-tick case still makes 0 reads on the old client and only the target reads on the new one, with no `routeChanged`; an echoing host changing client and route together goes straight to `/ops`. Reverting the fix fails 3 `props.test.ts` tests: the two new tests (a) and (b), and the updated "forwards a changed route and a changed client once". Never forwarding the route fails the ARCH-009 test. The coordinator decided that a client-only prop change resets to Missions, because ARCH-001 supersedes the old behaviour. |
| R2-NEW-002 | 2 | **`setCopy(null)` breaks the shell for good.** It stores `null`, and every later `snapshot()` throws `TypeError: Cannot read properties of null (reading 'serviceMissing')` (probe). `ShellOptions.copy` and the `copy` prop coerce `null` with `?? {}`; the handle and the controller do not. The parameter type excludes `null`, but NFR-007 says the shell never throws, and a JavaScript host or a cast reaches it. | In the controller, `overrides = copy ?? {}`, plus a test. | VERIFIED. The controller now does `overrides = copy ?? {}`. Reverting it fails the new test "restores the defaults and no later snapshot throws". |
| R2-NEW-003 | 2 | **The package README was not updated for ARCH-001.** The contract is correct, but the README has three gaps:<br>- the `setClient(client, route?)` bullet does not say that, with no route, it resets to `/missions` (or `/projects` for a null client on the desktop) and announces the result;<br>- "It never runs for a host-set route that is already canonical" is now false: a null client on the desktop announces `/projects` for a canonical `setRoute('/ops')`;<br>- the replace rule calls every synchronous call "a canonicalisation of the route the host itself just gave", which does not describe the default-route announcement from a `setClient` with no route.<br>Hosts #20 and #21 read the README. | Bring the three sentences in line with `contracts/shell-api.md`. | VERIFIED. The README now: says that `setClient` with no route resets to the default route, including for a Svelte host that changes only the `client` prop; replaces "never runs for a canonical route" with "does not run for a route shown exactly as given", naming the null-client and default-route cases; and applies the replace rule to the default-route announcement. All three match the code and `contracts/shell-api.md`. |
| R2-NEW-004 | 1 | In `null-client.test.ts`, the test "setClient(null) on the dashboard keeps the route and shows …" and its describe block "the dashboard keeps its null-client behaviour" assert a reset to `/missions` and its announcement. | Retitle, for example "setClient(null) on the dashboard resets to /missions and shows …". | VERIFIED. The describe block and the test now say "resets to /missions". |

**Notes, no action needed:**
- With a null client on the desktop, every host `setRoute` re-lists recent projects, because the coerced `/projects` counts as re-selecting the current screen (US6-2). This is harmless.
- The Work Package tree's href puts a service-supplied `wpId` into the route without encoding it. A malformed id gives an href that parses to Missions; it does not throw. This predates the fixes.

## R3 re-check (2026-10-16)

**Scope:** `feat/mission-shell-18` at 22007e8. The R2 follow-ups were merged from `premerge/shell`: f2bc636, 436b07b, 5d7003d, 2f8939f and 0075478 (lint). The fixes touch only `packages/mission-shell`: the `src` diff is two lines in `shell-controller.ts` and the client effect in `MissionShell.svelte`; the rest is the README and tests. No other path changed.

**Method:** the same as before.
- The Chromium prop-path probes were re-run on the tip, in a scratch worktree that was removed afterwards.
- Each fold was reverted and run red: the route always forwarded (3 tests fail), the route never forwarded (the ARCH-009 test fails), and `setCopy(null)` stored as given (the new test fails).

**Results:**
- `pnpm --filter @moes-media/mission-shell test`: 533/533, including the ARCH-009 same-tick test and the N6 test.
- `pnpm lint`: rc 0.
- `sha256sum -c design-review.sha256`: 11/11.
- No PNG changed since d8de2dd.

**Limitation:** a declarative host that wants to keep the current screen across a client change, without changing its `route` prop, cannot do so: an unchanged prop now counts as "no route". The README says so: "changing `route` in the same tick sets that route instead".

## Gate summary (at d8de2dd; see the R3 re-check for 22007e8)

| Check | Result |
|---|---|
| `pnpm --filter @moes-media/mission-shell test` | 530/530 (31 files) |
| `typecheck`, `lint`, `lint:no-io` | rc 0 |
| `hygiene` | 0 findings, including this record |
| `test:terminology` | 13/13 |
| `test:scripts` | 646/646 |
| `gate-proof coverage` | ok |
| `sha256sum -c design-review.sha256` | 11/11 OK |
| `shell-*.png` since CP-1 | No commit since the R1 record touches a PNG. `git log 7d5f7c2..HEAD` lists two commits, d2a27d0 and deefb56: they were authored before 7d5f7c2 and arrived through lane merges, and the approved hashes in 7d5f7c2 match the files. |
| Frozen surface | The fixes touch only `packages/mission-shell` (`src`, `test`, README), the mission records, `ci.yml` (two lines), the root README and the CHANGELOG. The port, mission-ui, the harness, gate-proof and the root `package.json` are unchanged. |
| `ci.yml` against `origin/main` | Only the unit-tests 30 → 32 and eslint 8 → 10 `timeout:` lines. |
| Mutants | 24 run: 19 killed. Of the 5 survivors, 3 are equivalent: the two retry guards, and writing after destroy. 1 is pre-existing and masked: `leavePicker`'s `projectsSeq` bump, which also survives at 51eb864. 1 is caught by another file: the handle mutant, which `mount.test.ts` misses and `banners.test.ts` kills. |

## Verdict

**Ready for PR.** All 14 R1 Fold items and all four R2 new findings are VERIFIED, and each has a guard that goes red on revert. No regression: 533/533, and the baselines are unchanged.

At d8de2dd the verdict was "not yet ready": ARCH-009 was PARTIAL because of R2-NEW-001. The R3 re-check below closes it.

**Carried to the PR:**
- The provisional unit-tests (32) and eslint (10) proof-leg timeouts, re-derived from the first CI run (GATE-003).
- The R1 follow-ups: ARCH-004, ARCH-006, ARCH-007, ARCH-010, ARCH-011, SEC-001, SEC-002, A11Y-001 to A11Y-003, TEST-004, TEST-006 to TEST-009.
