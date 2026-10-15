# Plan-phase adversarial review: mission-shell (mission-ui#18)

**Mode**: three profile-loaded delegates in parallel, read-only. The orchestrator relayed their reports in condensed
form.

| Delegate | Lenses |
|---|---|
| analyst | R1 correspondence, R5 testability and non-vacuity |
| architect | R2 correctness, R4 architecture |
| reviewer | R3 security and safety, R6 process and gates |

**Scope**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md` and `contracts/` at `6392b8f`,
against the repository on `feat/mission-shell-18`. The current port contract is
`kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md` on this branch (5 states plus `resync`). The ui17
checkout copy is stale and was not used.

**Verification**: the plan agent re-checked the load-bearing claims against the files before folding:

- `custom-elements.json` without `sk-mission-sample` declares **40 pairs and 23 distinct event names**. The plan said
  22 (R1-07).
- `gates/markdown-lint.selftest.ts:488,540,544` and `gates/data-driven.selftest.ts:1205` name
  `packages/mission-shell/src/Shell.svelte` (R5-06).
- `contracts/fixtures/mission-status.changes.json` item 1 has `delayMs: 0`, so C1 fell inside the initial read's
  window (R2-02).
- `routes.json` refusals per operation (the R5-08 table in research R-06). No vendored example has schema `Problem`.
- `test/package.test.ts` asserts exactly the `.` and `./testing` entries, so the `./shell` ruling updates it.
- The `sk-artifact-screen` docs carry the `sk-open-link` MUST and SHOULD host obligations (R3-05).
- `ArtifactPath.yaml` has a pattern plus `minLength` 1 and `maxLength` 512 (R3-02).
- mission-ui element modules import `@spec-kitty/elements` (R4-02).
- `spec-kitty doctor coordination --check-staleness` reports `COORDINATION_BRANCH_DIVERGED_VS_TARGET` and
  `COORDINATION_WORKTREE_DIRTY` (R6-07).

Severities are given where the condensed reports carried them; otherwise the column shows "n/g".

## Findings and dispositions

Dispositions follow the procedure's contract: accepted, changed, deferred_with_rationale, or ruled (operator or
orchestrator).

### R1 and R5 (analyst)

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| R5-01 | R5 | 4 | No check stops existing visual baselines from being modified, deleted or renamed. | CONFIRMED | accepted: `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/` is an IC-08a and IC-08b exit check and part of IC-09's frozen check. Only `shell-*.png` may be added, and the reviewer repeats it (plan, research R-17, `stories.md`). |
| R5-02 | R5 | n/g | P-2's marker-type construction is unproven. The token is weak, and the anchor may not be unique. | CONFIRMED | changed: the check type `Exclude<Declared, Mapped>` is assigned `true` (and the reverse). The token is the literal `sk-drift-screen sk-copy-command`, and table entries are one per line (research R-09, plan P-2). |
| R1-01 | R1 | n/g | The degraded state's effect on no-value slots and on gated reads is undefined; the contract-mismatch story has no data source. | CONFIRMED | accepted: entering a degraded state sets no-value slots to `error`, and gated reads are **kept and issued**. Tests cover `connecting` → degraded and an initial degraded state. A story-local `storyClient({ reads: 'unavailable' })` serves the contract-mismatch story (research R-06, R-08; `stories.md`). |
| R1-02 | R1 | n/g | What `unavailable` does on a slot that already has data needs a spec anchor. | CONFIRMED | **ruled** (operator, decision `01M50K4DBT2VCW6DD4JQAGEMB4`): keep the data and the view state. A dated FR-005 amendment is in `spec.md` "Amendments". |
| R5-03 | R5 | n/g | NFR-002 asserted only "at most 2" reads. | CONFIRMED | accepted: **exactly 2**, the second at t ≥ 100, with the trailing value applied (`refresh-policy.md`). |
| R5-04 | R5 | n/g | The SC-004 check ignored every timeout, including job `timeout-minutes`. | CONFIRMED | accepted: job `timeout-minutes` must be exact. Only proof-leg matrix `timeout`s may change, and only upward (research R-17). |
| R5-05 | R5 | n/g | CP-1 hashes had no machine-checkable form. | CONFIRMED | accepted: `design-review.sha256` in `sha256sum` format. IC-08b, IC-09 and the pre-merge squad run `sha256sum -c` and check the set equality. A rebase or commit touching `shell-*` reopens CP-1 (research R-14). |
| R5-06 | R5 | n/g | Removing `src/Shell.svelte` breaks two gate self-tests that name it. | CONFIRMED (grep) | changed: `Shell.svelte` is **kept** unchanged, so no no-io or data-driven self-test is touched. `test:no-io` and `test:data-driven` run before hand-off (IC-06). |
| R5-07 | R5 | n/g | Subscription counts are not tested through the public mount surface. | CONFIRMED | accepted: a Chromium test drives `mountShell(...).setClient(b)` and `destroy()`, counting `subscribe`, `onChange` and `onWindowRefocus` (IC-06). |
| R5-08 | R5 | n/g | The refusal coverage set is unstated; a 404 `Problem` has no example; test-local clients are unnamed. | CONFIRMED | accepted: the refusal table is enumerated from `routes.json`. `Problem.test-not-found` (404) is injected through `fixtures.examples`. `createDeferredClient` and `createSequencedClient` are in `test/support/` (research R-06). |
| R5-09 | R5 | n/g | The recording lacks the WP-none and Artifacts-none rows, and may be computed from the policy (circular). | CONFIRMED | accepted: both rows added. The expected recording is a literal in the test (`refresh-policy.md`). |
| R5-10 | R5 | n/g | The n = 2 page re-read is undefined; the intent sweep may be hand-listed; the logic project may silently run in the browser. | CONFIRMED | accepted: page chains are defined, with a 2-page test. The 40-case sweep is driven from `INTENT_TABLE`. `logic` has `browser: { enabled: false }`, plus a `typeof window === 'undefined'` sentinel (research R-05, R-09, R-15). |
| R5-11 | R5 | n/g | The NFR-001 assertion is loose, and unhandled errors could be swallowed. | CONFIRMED | accepted: the value is applied in the same tick with the fixture; a deferred read resolved at t = 120 is applied at 120; a mounted property test checks by t = 150. The harnesses fail on uncaught errors, and the shell swallows none of its own (`refresh-policy.md`, `data-model.md`). |
| R5-12, R6-01 | R5, R6 | n/g | P-6 ("change the gap token") may not be a visible change; there is no exact anchor or local proof. | CONFIRMED | changed: P-6 changes the reconnecting `sk-notice` tone from `attention` to `danger`, anchored on the exact line `reconnecting: { tone: 'attention', announce: 'polite' },`. IC-08a proves it once locally (`heavy pnpm gate-proof leg --gate visual`), and IC-08b re-proves it after any amendment. It cannot be proven at plan time because the file does not exist yet. |
| R1-03 | R1 | n/g | The issue's acceptance list is not mapped to requirements ("stub adapter" versus fixture); the dashboard's lack of a picker is not tested on a mount. | CONFIRMED | accepted: an "Issue #18 acceptance → requirements" table in the plan (stub → fixture; a stub-backed run belongs to #21), and a mounted dashboard test that no picker entry point exists. |
| R1-04 | R1 | n/g | "The Missions list" is ambiguous between `missions` and `mission-names`. | CONFIRMED | accepted: it means the Missions screen's pages (`missions`) only (research R-04, `data-model.md`). |
| R1-05 | R1 | n/g | The no-selection screens (R-03) depart from the spec's two assumed options. | CONFIRMED | accepted: the departure is stated in research R-03 and flagged for the operator at CP-1 (plan "Design review", `connection-presentation.md`). |
| R1-06, R6-06 | R1, R6 | n/g | The frozen check does not prove the base contains #17. | CONFIRMED | accepted: #17 merged as squash `39a51a6`. The base is `git merge-base HEAD main`, guarded by `git merge-base --is-ancestor 39a51a6 "$base"` (research R-17, quickstart). |
| R1-07 | R1 | n/g | The intent count: the plan said 22; and hygiene is not listed as extended. | CONFIRMED (23 against the manifest; the R4 lens's 22 is wrong) | accepted: 40 pairs and 23 distinct intents everywhere. Hygiene, no-io, data-driven, stylelint and manifest are listed as "extended in content only" (plan Gates). |

### R2 and R4 (architect)

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| R2-01 | R2 | 4 | No transition for a window that closes with `trailing` set and nothing in flight, so the trailing read is lost. | CONFIRMED | accepted: the window timer, on the injected scheduler, issues the trailing read and opens a new window. A dedicated test covers it (`data-model.md` transitions, `refresh-policy.md`). |
| R2-02 | R2 | n/g | C1 (`delayMs: 0`) coincides with the initial read's window; the gating assertion is ill-timed. | CONFIRMED | accepted: the test injects a changes copy with item 1 at `delayMs: 250`. The gating assertion is observed before the fake scheduler advances (`refresh-policy.md`). |
| R2-03 | R2 | n/g | Explicit triggers may be coalesced away. | CONFIRMED | accepted: the bypass list is navigation, `resync`, Refresh, refocus, retry and Rescan, each with a new generation. Only stream changes coalesce (research R-05). |
| R2-04 | R2 | n/g | Per-slot generations break when a slot is removed and recreated. | CONFIRMED | accepted: one controller-wide monotonic counter, with an A→B→A deferred-read test. |
| R2-05 | R2 | n/g | Re-reads flash `loading`. | CONFIRMED | accepted: stale-while-revalidate. `loading` appears only without a value. |
| R2-06 | R2 | n/g | The page-chain re-read and its interplay with load-more are undefined. | CONFIRMED | accepted: sequential, re-chained, one generation, applied atomically; the load-more rules are defined; a 2-page test (research R-05). |
| R2-07 | R2 | n/g | Two consecutive `copied` answers are invisible to the screen. | CONFIRMED | accepted: the copy protocol delivers `null` (emit, then `tick`) before awaiting the host. Tested (research R-18). |
| R2-08 | R2 | n/g | Grace-timer handling on re-entry is undefined. | CONFIRMED | accepted: the state is updated before arming; the timer is cleared on every exit and re-armed on entry. A re-entry test. |
| R2-09 | R2 | n/g | The gate does not release when leaving `connecting` for a non-`connected` state. | CONFIRMED | accepted: the first exit from `connecting` to any state issues the displayed set. The first `connected` ever triggers no extra read. Both paths are tested. |
| R2-10 | R2 | n/g | After `refused`, reconnects leave stale data. | CONFIRMED | **ruled** (operator, decision `01M50K4G2G0EA0JN3B6YGH607S`): each non-first `connected` is a shell-side resync, with no new subscription (research R-18). |
| R2-11, R3-04, R4-03 | R2, R3, R4 | n/g | The dashboard guard misses three picker or dialog intents; the dashboard with a null client is undefined; `routeChanged` timing is undefined; `setClient` has no route. | CONFIRMED | accepted: the guard covers all six, tested through `controller.intent` in Node. The dashboard with a null client is an error state with no reads and no throw. `routeChanged` fires after the shell's navigations and after normalisation, never as an echo. `setClient(client, route?)` (research R-02, R-10). |
| R2-12 | R2 | n/g | Story fixtures replay changes; the story client is unnamed. | CONFIRMED | accepted: empty `changes` in every story fixture; `storyClient({ state, reads })` (`stories.md`). |
| R2-13 | R2 | n/g | Resubscription after `log-truncated` is unaddressed. | CONFIRMED | accepted: one sentence. The unscoped subscription needs no resubscribe (research R-18). |
| R4-01 | R4 | n/g | Exporting the shell from `.` drags Svelte into port-only consumers. | CONFIRMED | **ruled** (operator, decision `01M50K4K059HSWKGA56KV7KNJC`): `.` stays port-only; a new additive `./shell`; `./testing` unchanged; `package.test.ts` updated. |
| R4-02 | R4 | n/g | Host prerequisites (tokens, fonts, theme) and the `@spec-kitty/elements` dependency are implicit. | CONFIRMED | accepted: a "Host prerequisites" section in `shell-api.md` and the README. The reliance on mission-ui's registration of `@spec-kitty/elements` is documented, with no new dependency (research R-10). |
| R4-04 | R4 | n/g | The layering of core and controller is unenforced. | CONFIRMED | changed: a sibling ESLint block for `src/{core,controller,intents}/**` repeats the boundary patterns from one shared constant, plus `svelte`, `svelte/*` and runtime mission-ui (`allowTypeImports`). A sibling block is needed because `ui/` must import Svelte, so the ban cannot sit in the `src/**` boundary block itself. New eslint plant P-8. |
| R4-05 | R4 | n/g | `MissionUiIntents` carries no detail types; `via` is unconstrained. | CONFIRMED | accepted: `{ tag: { event: Detail } }`; handlers are typed by detail; `via` is constrained to hosting tags with the same event and a mutually assignable detail. |
| R4-06, R3-01 | R4, R3 | 3 | The shell lint lists are too narrow: other I/O globals, `document.execCommand` and `document.location`, and resource-loading elements are missing. | CONFIRMED | accepted: the lists are widened as requested. P-3's token becomes `shell-markup: raw controls` and P-4's `shell-io: navigator is forbidden` (research R-13). |
| R4-07, R3-06 | R4, R3 | n/g | The stories boundary exemption is unnecessary and widens the boundary; there is no unmount; a stray `svelte.config.js` could be picked up. | CONFIRMED | accepted: the exemption is dropped (stories import `../testing`, which the patterns do not match); a `beforeEach` cleanup unmounts; `svelte({ configFile: false })`. |
| R4-08 | R4 | n/g | (optional) The scheduler type is declared twice. | CONFIRMED | accepted: `ShellScheduler` is declared once, with a type test of mutual assignability to the fixture's `Scheduler`. |

### R3 and R6 (reviewer)

| Id | Lens | Sev | Finding | Verified | Disposition |
|---|---|---|---|---|---|
| R3-02 | R3 | n/g | Route decoding can throw, and artifact paths are not validated. | CONFIRMED | accepted: `decodeURIComponent` inside `try`/`catch`, with failure meaning unknown; the `ArtifactPath` pattern and length, with a test comparing against the contract YAML; tests for `%`, `..%2F`, `%2F` and `%00` (research R-02). |
| R3-03 | R3 | n/g | The round trip compares strings. | CONFIRMED | accepted: it compares parsed destinations, plus a non-canonical encoding test. |
| R3-05 | R3 | n/g | The link negatives are incomplete; the host obligations are not passed on. | CONFIRMED | accepted: the full negative list sits in the same test as the positive control; the MUST and SHOULD obligations are copied into `openExternalLink`'s docs (`intent-map.md`, `shell-api.md`). |
| R3-07 | R3 | n/g | "The Node test project enforces the layering" is false. | CONFIRMED | accepted: reworded. Lint enforces it (P-8); the Node project only surfaces violations sooner (plan Structure decision, research R-01). |
| R6-02 | R6 | n/g | The frozen list misses the visual harness, no-io, hygiene, package scripts and plant `prepare`s; there is no plant-retention check; job timeouts are not frozen. | CONFIRMED | accepted: all of these are added to research R-17, with job `timeout-minutes` exact and matrix timeouts rising only, plus a check that every base plant except the ruled visual one is retained. |
| R6-03 | R6 | n/g | Timeouts cannot be derived from a PR run before the PR exists. | CONFIRMED | **ruled** (orchestrator, decision `01M50K4S90BX5W0M322WYH8SA1`, following the #17 precedent): provisional values from local measurements in IC-09; a post-PR `(landing)` fold re-derives them. |
| R6-04 | R6 | n/g | IC-08 straddles CP-1; amendments have no owner; the location of `design-review` is unclear. | CONFIRMED | accepted: split into IC-08a and IC-08b. IC-08b has a grant to edit the IC-06 and IC-03 files for amendments and re-proves P-6. The `design-review` files live on `feat/mission-shell-18`. |
| R6-05 | R6 | n/g | The Chromium shell tests have no plant proving they run. | CONFIRMED | **ruled** (operator, decision `01M50K4NSNYD9TEQ12T4J7KVHT`): P-7 in `test/shell` (token `mounted screen mismatch on drift`). The unit-tests leg is re-derived: 10 plants, 11 runs, about 22.5 min, timeout 30 → 32 provisional. |
| R6-07 | R6 | n/g | The coordination branch `kitty/mission-mission-shell-01M50D2J` is stale: it holds the 3 deferred spec decisions only. | NOTED (investigated) | deferred_with_rationale: see "R6-07 investigation" below. The tooling refuses to sync a diverged coordination branch; no hand edit was made; it is escalated to the orchestrator. |
| R6-08 | R6 | n/g | P-1's token origin is unstated; the P-2 fallback said "scoped". | CONFIRMED | accepted: P-1's token is an assertion message (no test title contains it). The P-2 fallback is removed, since the token is now the pair literal. |
| R6-09 | R6 | n/g | The visual timeout appears formula-derived. | CONFIRMED | accepted: a note that the visual timeout is never set from the formula alone. It is held at 60 because timeouts are never lowered. |

## R6-07 investigation

- **Where decisions live.**
  - `spec-kitty agent decision open`, `resolve` and `defer` write the decision files and `decisions/index.json` in the
    primary partition (this checkout, `feat/mission-shell-18`).
  - They append `DecisionPoint*` events to `status.events.jsonl` in the coordination worktree
    (`.worktrees/mission-shell-01M50D2J-coord`).
  - There, the file is **uncommitted**: 15 `DecisionPoint` events in the working tree, 0 at the branch's `HEAD`.
  - `spec-kitty doctor decisions --mission mission-shell-01M50D2J` reports `clean`: the log and the index agree on all
    10 decisions.
- **Branch state.**
  - `spec-kitty doctor coordination --check-staleness` reports `COORDINATION_WORKTREE_DIRTY`.
  - It also reports `COORDINATION_BRANCH_DIVERGED_VS_TARGET`: `kitty/mission-mission-shell-01M50D2J` at `8e80c19` is
    not an ancestor of `feat/mission-shell-18`.
  - Its own `next_step` says `doctor coordination --fix` "will refuse to mutate a diverged coordination branch". The fix
    only fast-forwards.
- **What was done.** The diagnostics were read only. The branch and worktree were not hand-edited, as instructed.
- **For the orchestrator.** Reconcile the coordination branch before `/spec-kitty.tasks`, for example by having the
  tooling commit the coordination worktree's status log and then reconciling the divergence. The CLI offers no
  automatic path for a diverged branch.

## Totals

| Round | Raw rows | Confirmed | Refuted | Noted | Ruled (of the confirmed) |
|---|---|---|---|---|---|
| 1 (three delegates) | 50 | 49 | 0 | 1 | 5 |

- Every confirmed finding is dispositioned.
- The only deferral is R6-07, an orchestrator action outside the plan artifacts.
- Plan decisions: `01M50HMCBJMREJ5XJASGE29X73`, `01M50HMK3E7A4XA93PZMZ9KBT8` (forks) and the five squad rulings above.
  `decision verify` is clean.

## Carried to tasks

- **Plants**: P-1 to P-8 (7 new, 1 moved) are WP deliverables, each with its exact anchor and token (plan Gates).
- **Test obligations**:
  - the literal recording, including the WP-none and Artifacts-none rows;
  - the scheduler transitions and tests of R2-01 to R2-09;
  - the 40-case intent sweep;
  - the link negatives;
  - the route decoding negatives;
  - the `mountShell` subscription counts;
  - the dashboard no-picker mount;
  - the NFR-001 property timing.
- **WP evidence obligations**:
  - the P-6 local proof (IC-08a, and IC-08b after amendments);
  - the baseline diff (R5-01);
  - `sha256sum -c` (R5-05);
  - the provisional leg timings (IC-09);
  - the frozen-surface output (research R-17).
