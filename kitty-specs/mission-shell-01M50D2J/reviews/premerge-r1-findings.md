# Pre-merge squad R1 findings (2026-10-16)

Three lens groups reviewed `feat/mission-shell-18` at 59da755, using the diff `origin/main...HEAD` from merge-base ee8fea5. Each lens only reported findings.

**Lenses:**
- architect-alphonso: boundary, design, and fitness for #20 and #21.
- reviewer-renata: contract fidelity, fail-closed behaviour, security and accessibility.
- debugger-debbie: tests, gates and flakiness.

**Severity:** 1 to 5, where 5 blocks the merge. No finding is a 5.

**Probes:** each finding was checked before it was reported, using one of:
- throwaway Vitest probes against the real controller and presenter;
- browser probes in Chromium;
- mutants run against the full shell suite;
- loaded and shuffled test runs;
- visual compares.

## Found clean (summary)

- **Consumer fit.**
  - `./shell` matches `contracts/shell-api.md` exactly. `exports` has three entries, and `.` stays port-only.
  - kitty-core's connection-state hints equal the shell's `CONNECTION_STATES`.
  - The picker hooks and the dashboard guards fit #20 and #21.
  - A host that echoes `routeChanged` back causes no extra read.
- **Frozen surface (R-17).**
  - The port, mission-ui, gate-proof, the visual harness, no-io, hygiene and the root `package.json` are unchanged.
  - The only `ci.yml` change is the unit-tests leg timeout, raised from 30 to 32.
  - `sha256sum -c design-review.sha256` passes for all 11 baselines, and no existing baseline was modified, deleted or renamed.
- **Layering.**
  - No I/O in `src/`.
  - Runes appear only in `ui/`.
  - The layering, I/O and markup lint blocks are present.
  - CP-1 A2, A4 and A5 sit in the right layers.
- **Links.**
  - The `openExternalLink` scheme check refuses `javascript:` and its case, tab and newline variants, plus `data:`, `vbscript:`, `blob:`, `//`, leading whitespace and NUL.
  - It accepts `HTTPS:` and `mailto:`.
- **Route parsing.**
  - It refuses encoded traversal (`%2e%2e%2f`, `%2f`, `%00`, `%5C`).
  - It normalises Unicode.
  - It handles 4 MB inputs in about 170 ms.
- **Intents and rendering.**
  - `__proto__`, `constructor`, `toString` and `hasOwnProperty` are no-ops, whether as a tag or as an event, and so are malformed details.
  - The dashboard guard makes 0 host calls for all six picker intents.
  - `src/` contains no `{@html}` or `innerHTML`. Every href is built by `formatRoute`.
- **Host and data handling.**
  - Every host member is guarded against being absent, throwing or rejecting.
  - The latest read wins.
  - Subscriptions are released on `destroy` and on `setClient`.
- **Pipeline visual story.**
  - 110 of 110 compares passed, idle and under load.
  - 12 of 12 forced fresh captures were byte-identical to the baseline.
- **Shell unit tests.** 15 of 15 runs were green, idle, loaded and shuffled.
- **Gate wiring and plants.** The tokens of P-1, P-2, P-3, P-4, P-5, P-7 and P-8 are absent from clean output.
- **Mutation testing.** 32 of 42 mutants were killed, including every CP-1 amendment.

## Findings

| ID | Sev | Where | Finding | Call |
|---|---|---|---|---|
| ARCH-001 | 4 | `shell-controller.ts` `show`, `attach`, `setClient` | `setClient` without a route keeps the old destination, and the null-client desktop rule ("only `projects`") is never enforced. Picking a project changes nothing visible, closing a project loads forever, and switching projects reads the old Mission. | Fold: default route per client and mode, coerce to `projects` |
| ARCH-002 / CON-003 / TEST-003 | 3 | `core/connection.ts` | A duplicate `reconnecting` hides a banner already shown and re-arms the grace period. kitty-core sends about three per crash cycle. | Fold: ignore an unchanged state |
| ARCH-003 | 3 | `ui/mount.ts`, `MissionShell.svelte` | The degraded copy is fixed at mount, so #20 cannot show reason-specific text such as "quarantined" or "not found". | Fold (operator approved): additive `setCopy` |
| ARCH-004 | 2 | `core/host.ts`, `MissionShell.svelte` | The shell has no way to retry the service from a degraded state. | Follow-up on #20, with a design pass |
| ARCH-005 | 2 | `shell-controller.ts`, README | `routeChanged` doesn't say whether to push or replace. Refresh and re-selection fire the same route again. | Fold the README guidance. An API option is a follow-up |
| ARCH-006 | 2 | `ui/options.ts` | The public `ShellOptions` is derived from an internal type. | Follow-up |
| ARCH-007 | 1 | `MissionShell.svelte`, `snapshot.ts` | The CP-1 A1 rule lives in the view, so the snapshot disagrees with what is rendered. | Follow-up |
| ARCH-008 | 1 | package README | It says the exports map has two entries. | Fold |
| ARCH-009 | 2 | `MissionShell.svelte` | A same-tick change of client and route calls `setClient` without the route. | Fold with ARCH-001 |
| ARCH-010 | 2 | `intents/table.ts` | Detail typing stops at `unknown`, so a mission-ui field rename is a silent no-op. | Follow-up |
| ARCH-011 | 1 | `core/routes.ts` | There is no extension point for host screens. #20 should build About natively. | Note for #20 |
| CON-001 | 4 | `core/routes.ts`, `ui/navigation.ts` | A lone UTF-16 surrogate in an artifact path passes validation, then throws `URIError` in route code, `setClient` and the tree render. | Fold |
| CON-002 | 3 | `shell-controller.ts` intent commands | Destinations built from intents skip the id patterns. A traversal id reaches `routeChanged` and the port. | Fold: one destination guard |
| CON-004 | 1 | `core/results.ts` | An `unavailable` result on a slot with no value keeps a stale refusal. | Fold |
| SEC-001 | 1 | `core/host.ts`, contract | The `openExternalLink` docs don't name the residual risks: userinfo, IDN and length. | Follow-up |
| SEC-002 | 2 | mission-ui `drift-copy.ts` (predates this branch) | The copied command interpolates an unvalidated Mission slug. | Follow-up, mission-ui |
| A11Y-001 | 3 | `MissionShell.svelte` | Focus is lost to `<body>` after navigating inside a screen. | Follow-up, needs a mission-ui focus hook |
| A11Y-002 | 3 | `ConnectionBanner.svelte` | The live region is inserted already holding its content, and the h2 sits inside the region. | Follow-up, with a screen-reader check |
| A11Y-003 | 1 | `snapshot.ts`, `connection.ts` | While degraded, the A2 body changes on navigation and re-announces the alert. | Follow-up |
| TEST-001 | 3 | `controller.test.ts` | The A5 test claims a per-client reset it never checks. Three mutants survive. | Fold |
| TEST-002 | 2 | `shell-controller.ts` | The stale-answer guard on the picker's project list is untested. | Fold |
| TEST-004 | 2 | `shell-controller.ts` `resolveHandler` | The `via` hop is unreachable in shipped wiring, and its one test is masked. | Follow-up |
| TEST-005 | 1 | `controller.test.ts` | The `now` test contains a no-op line. | Fold |
| TEST-006 | 1 | `snapshot.ts` | A2's "data loaded" check is untested with partial data. | Follow-up |
| TEST-007 | 1 | `MissionShell.svelte` | The `afterRender` flush is proven by inspection only. | Follow-up |
| TEST-008 | 1 | `shell-controller.ts` | The released-client epoch guards are not pinned by any test. | Follow-up |
| TEST-009 | 2 | mission-ui `sk-drift-screen.a11y.test.ts` (predates this branch) | The unnamed load flake is now identified as the forced-colours test. | Follow-up, mission-ui |
| GATE-001 | 2 | `ci.yml` | The eslint proof-leg timeout of 8 breaks the README formula, which gives 10. | Fold: raise it to 10 |
| GATE-002 | 2 | README, CHANGELOG | They say the timeouts come from local measurements. The 32 is a CI projection. | Fold |
| GATE-003 | 1 | `ci.yml` | The unit-tests leg timeout of 32 needs confirming from the first CI run. | Landing |
