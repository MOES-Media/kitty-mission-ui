# Tasks notes: Ops screen (mission-ui#11)

Orchestrator-facing companion to the generated `tasks.md` (which finalize-tasks regenerates from `wps.yaml` and which carries no prose). Mission `ops-screen-01M4C92P`, target branch `feat/ops-screen-11`. Nine work packages follow the plan's implementation concerns; one operator checkpoint CP-1 sits between WP03 and WP04 and is NOT a work package. Work packages never push and never open pull requests: the mission lands as ONE pull request after accept, the aggregate review squad, compact history and a rebase (the charter's squad runs after the plan phase only; the one aggregate review before the PR is the operator's standing wrap-up rule).

## IC mapping (the `IC-##` regex refuses suffixes)

`plan_concern_refs` must match `IC-##`, so the plan's IC-03a and IC-03b are both cited as `IC-03`:

| WP | Plan concern | Title |
|---|---|---|
| WP01 | IC-01 | Contract slice check, fixtures, gate baseline |
| WP02 | IC-02 | Defaults, logic, data-driven and R-ops-1 gates |
| WP03 | IC-03a (cited IC-03) | Foundation spikes S-O1 to S-O4 and CP-1 evidence |
| WP04 | IC-03b (cited IC-03) | Skeleton, exceptions wiring, surface freeze |
| WP05 | IC-04 | Rows (chain X) |
| WP06 | IC-05 | Paging and notices (chain Y) |
| WP07 | IC-06 | States (chain Y, after WP06) |
| WP08 | IC-07 | Tiers, accessibility, edge cases |
| WP09 | IC-08 | Integration, baselines, timings |

## Dependency graph

```
build base (orchestrator, recorded before any claim): spec-kitty PR #5881 merged AND #9 Projects re-vendored the contract on main
WP01 -> WP02 -> WP03 -> [CP-1: orchestrator, operator rules on the spike evidence] -> WP04
WP04 -> WP05                      (chain X: rows)
WP04 -> WP06 -> WP07              (chain Y: paging and notices, then states)
WP05 + WP07 -> WP08 -> WP09       (tiers, accessibility, edge cases; integration)
```

WP08 lists BOTH WP05 and WP07 as dependencies (the plan: IC-07 follows both chains); the tool accepted the two-parent form at finalize. Fallback if the lane allocation for WP08 cannot merge two parents (a spec-kitty tooling issue family): the orchestrator pre-creates WP08's lane from the approved WP07 tip, merges the approved WP05 tip with `git merge --no-ff`, resolves `custom-elements.json` by `pnpm manifest:generate` only, applies the `status.json` rule, and checks that the stories of all three earlier story files are present before `implement WP08`.

## Entry condition and the CP-1 precondition

- **WP01 entry condition (stop-check, T001).** IC-01 starts only after spec-kitty PR #5881 has merged AND the Projects mission (#9) has re-vendored the contract on `main` (operator rule 2026-10-08: no stacking). The orchestrator merges that `main` into `feat/ops-screen-11` and fast-forwards `kitty/mission-<slug>` before the first claim; WP01 then verifies the merge state of #5881, `PIN.json` `provenance: "main"`, the Ops schemas and examples in the pin, and the re-vendor commit's ancestry, and STOPS if any check fails.
- **CP-1 file precondition (WP04 to WP09).** The tool cannot express CP-1 as a dependency. WP04's first step and first exit check is a FILE PRECONDITION: `tracer-design-decisions.md` holds a dated `CP-1 confirmed` entry and it is an ancestor of the lane tip (`git merge-base --is-ancestor <CP-1 commit> HEAD`), committed before WP04's first commit. The orchestrator commits the entry on the target branch, fast-forwards `kitty/mission-<slug>`, pre-creates WP04's lane from the approved WP03 tip with the target branch merged in, checks the ancestry, and names the CP-1 commit in the dispatch. WP05 to WP09 carry the same precondition as their first step. The reviewer REJECTS if it is absent.
- **CP-1 content** (plan): the row and facts construction (DO-22, DO-24, E-40, E-41), the id and evidence wrapping (DO-13, E-43, E-42), the tier thresholds and the controller question (D-10), and whether to add the earlier mission's bidirectional-control notice. Ruled 2026-10-11 (`tracer-design-decisions.md`, "CP-1 confirmed"): E-40 approved and widened, E-41 deleted, E-42 narrowed, E-43 approved; the tracer and `research/cp1-evidence.md` override any WP prompt text written before CP-1.

## Lane mechanics (orchestrator-owned; WP agents never do any of this)

Facts relied on (recorded in the orchestrator's ledger and restated so nothing depends on it): a spec-kitty tooling issue (a lane parents off the local `kitty/mission-<slug>` branch, created at first claim and never refreshed), a spec-kitty tooling issue (allocating a lane for a WP that depends on an approved WP starts from a stale coordination commit), a spec-kitty tooling issue (allocation refuses on a conflict in the derived `status.json`), a spec-kitty tooling issue (parallel claims race the index: claim ONE WP at a time). Procedure: (1) fast-forward `kitty/mission-<slug>` to the target branch before every first claim and after any merge of `main`; (2) for every dependent WP pre-create the lane from the approved parent's tip or merge the parent into the new lane, applying the `status.json` rule; (3) WP05 and WP06 may run in parallel after WP04 (disjoint part files) but their claims are serialised; (4) the CP-1 entry reaches the lanes as above; (5) `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited; out-of-map edits are committed by the WP agent with plain `git add` and `git commit` and listed in its hand-off. finalize-tasks computed nine lanes (one per WP) with no collapse and no dependency cycle.

## Shared files: one owner each

| File | Owner | Others |
|---|---|---|
| `contract/fixtures.generated.ts`, `types.generated.ts`, `scripts/contract/**`, `gates/plants/contract/**`, `elements/sk-ops-screen/fixtures.ts` | WP01 | change request |
| `defaults/ops-copy.ts`, `logic/ops-*.ts`, `logic/index.ts`, the retry-union file (`logic/wp-retry.ts` or `retry-types.ts`, whichever holds it at branch start), `eslint.data-driven.config.mjs`, `gates/data-driven.selftest.ts`, `gates/fixtures/data-driven/**`, `gates/plants/data-driven/**`, `eslint.config.mjs`, `gates/plants/eslint/**` | WP02 | WP03 adds and removes one `ignores` entry in `eslint.config.mjs` (recorded out-of-map); WP04 edits it only if CP-1 needs a `class=` override (recorded out-of-map) |
| `sk-ops-screen.ts`, `src/index.ts`, `defaults/index.ts`, `custom-elements.json`, `surface-freeze.test.ts`, `stylelint.config.mjs`, `scripts/stylelint-exceptions.test.mjs`, `gates/plants/stylelint/**` | WP04 | later WPs touch `sk-ops-screen.ts` only at the stub wiring lines, recorded out-of-map |
| `ops-row-parts.ts`, rows stories and tests | WP05 (stub created by WP04) | WP08: container-query blocks only |
| `ops-page-parts.ts`, paging stories, `sk-ops-screen.events.test.ts` | WP06 (stub created by WP04) | WP08: container-query blocks only |
| `ops-state-parts.ts`, states stories and tests | WP07 (stub created by WP04) | WP08: container-query blocks only |
| tier stories, a11y, perf, hostile, edge, tiers tests | WP08 | none |
| `screens-ops-*.png` baselines, `ci.yml` timeouts, `package.json`, `README.md`, both `CHANGELOG.md`, `scripts/ops-story-catalogue.test.mjs` | WP09 only | none |
| `tracer-*.md`, `spec.md` Clarifications, CP-1 entry | the orchestrator only | WP09 adds the timing record to `contracts/gates.md` (recorded out-of-map) |

The tool bans `kitty-specs/` paths in a code WP's `owned_files`, so the one `kitty-specs` edit (the timing record) is a recorded out-of-map edit.

## Tasks-time shaping decisions not stated in the plan (for analysis and the operator's awareness)

1. **Exception wiring owner.** The plan's Implementation Concern Map is silent on `stylelint.config.mjs`. Following the earlier missions, WP04 (which runs after CP-1 has approved or dropped E-40..E-43) writes ALL the file-scoped overrides with their leak plants, so the parallel chains WP05 and WP06 never contend for the file. R-ops-1 (ESLint) stays with WP02 as the plan states.
2. **EV-3 test placement.** The plan lists EV-1..EV-5 under IC-05, but EV-3 (first-page error retry) needs the error look, which is IC-06's. WP06 proves EV-1, EV-2, EV-4, EV-5; WP07 proves EV-3 (`sk-ops-screen.events-retry.test.ts`). The behaviour still lives in `sk-ops-screen.ts` (WP04).
3. **Live region and focus.** The plan places the behaviour in IC-03b and the proof in IC-06; WP04 implements, WP07 proves, and a minimal test-backed fix to the wiring line is a recorded out-of-map edit.
4. **Story titles and baseline names.** `Screens/Ops/Rows` (16), `Screens/Ops/Paging and notices` (9), `Screens/Ops/States` (7), `Screens/Ops/Tiers and edge cases` (4) = 36 stories, one per built matrix row (OP-34 not built); baselines `screens-ops-*.png`; export names `Op<NN>[letter]`, row tags `op-<nn>`. The plan fixes the count and the row split, not the titles.
5. **Parity test.** WP09 adds `scripts/ops-story-catalogue.test.mjs` (matrix row to story, modelled on the earlier mission's catalogue test) so FR-044 is mechanically checked; the plan lists no such test.
6. **Timing record location.** The mission's `contracts/gates.md` (as the earlier missions), written by WP09 from WP01's baseline.
7. **Shell wiring (FR-040).** The `nav-ops` item already exists in the shell fixtures; the plan names no file for "shell wiring". WP04 reads the shell, makes at most one minimal recorded out-of-map touch, and proves existing shell story arguments are unchanged.
8. **Spike evidence.** WP03 (code_change, like the earlier mission's) owns `spikes/ic-03a-ops/**` and `.storybook/main.ts`; evidence travels in its hand-off; a named final commit deletes all spike code so its tip tree equals its base tree.
9. **finalize-tasks warnings.** Two zero-match glob warnings (WP03 `spikes/ic-03a-ops/**`, WP09 `screens-ops-*.png`) are expected: both paths are created by their work package.

## PR shape

ONE pull request into `main` (default), reviewed in a sitting only after compact history: slices proposed for the wrap-up are contract slice and fixtures (WP01), defaults, logic and gates (WP02), skeleton and exceptions (WP04), rows (WP05), paging and notices (WP06), states (WP07), tiers and edge cases (WP08), integration and baselines (WP09). There is NO spike slice (WP03 removes its code). The diff is dominated by 36 baselines; no per-WP split is recommended (a decision for the orchestrator and operator). The operator reviews Storybook after WP08 and before the wrap-up.

## Gate set and baseline

The gate set is the plan's: typecheck, eslint, stylelint, no-io, data-driven (extended), contract (`--require-main`), manifest, hygiene, storybook-build, unit tests, visual (36 baselines, WP09 only), gate-proof (two new plants plus the stylelint leak plants). The baseline of the build base is recorded by WP01 T002 (the known-red set on `main` when implementation starts), so nobody mistakes a pre-existing failure for a regression.
