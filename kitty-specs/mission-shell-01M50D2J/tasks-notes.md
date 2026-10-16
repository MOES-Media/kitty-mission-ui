# Tasks notes: mission-shell (mission-ui#18)

This file is the orchestrator-facing companion to the generated `tasks.md`. `finalize-tasks` regenerates `tasks.md`
from `wps.yaml` and it carries no prose.

- Mission `mission-shell-01M50D2J`, target branch `feat/mission-shell-18`.
- Ten work packages, one per implementation concern of `plan.md`: IC-01 to IC-07, IC-08a, IC-08b and IC-09.
- Work packages never push and never open pull requests. The mission lands as **one** PR after accept and the
  pre-merge squad (R1 to R3).
- Every browser, Storybook, visual or gate-proof command in a WP is written as `heavy <cmd>`: the memory-capped
  wrapper, run in the foreground, one at a time.

## IC mapping

| WP | Plan concern | Title | Profile | Plants |
|---|---|---|---|---|
| WP01 | IC-01 | Destinations, routes and displayed sets (with the Node test project) | frontend-freddy | none (the `logic` project is proven by P-1) |
| WP02 | IC-02 | Refresh engine: policy, read scheduler, page chains | frontend-freddy | P-1 (unit-tests) |
| WP03 | IC-03 | Shell controller | frontend-freddy | none |
| WP04 | IC-04 | Host interface, modes and link safety | frontend-freddy | none |
| WP05 | IC-05 | Intent table and the type-level coverage check | frontend-freddy | P-2 (typecheck) |
| WP06 | IC-06 | Svelte view, intent bindings and the `./shell` entry | frontend-freddy | P-7 (unit-tests) |
| WP07 | IC-07 | Shell lint: I/O globals, markup and layering | node-norris | P-3, P-4, P-8 (eslint) |
| WP08 | IC-08a | Stories, Storybook integration, candidate baselines | frontend-freddy | P-5 (storybook-build), P-6 (visual, moved) |
| WP09 | IC-08b | Baseline finalisation after CP-1 | frontend-freddy | re-proofs of P-6 and P-7 |
| WP10 | IC-09 | Provisional timings, documentation, frozen-surface wrap-up | node-norris | none |

## Dependency graph

```
WP01 ─► WP02 ─► WP03 ─► WP04 ─► WP05 ─┐
                                       ├─► WP06 ─► WP08 ─► [CP-1] ─► WP09 ─► WP10
WP07 ──────────────────────────────────┘
```

## CP-1: an orchestrator checkpoint, not a work package

The tool cannot express CP-1 as a dependency, so the orchestrator runs this procedure:

1. When WP08 is approved, its candidate `shell-*.png` baselines, the copy of `contracts/connection-presentation.md`
   and the research R-03 departure (the no-selection screens) go to the operator.
2. The orchestrator commits two files on `feat/mission-shell-18`:
   - `kitty-specs/mission-shell-01M50D2J/design-review.md`, a dated `CP-1 confirmed` entry with any amendments;
   - `kitty-specs/mission-shell-01M50D2J/design-review.sha256`, in `sha256sum` format with repository-relative paths.
3. The orchestrator brings that commit into WP09's lane before dispatch.
4. WP09 checks for both files as its first step, and stops if either is absent.
5. If P-6 is re-anchored during WP09, WP09 reports the new anchor. The orchestrator then updates the anchor quotes in
   `contracts/connection-presentation.md` and `contracts/stories.md` on `feat/mission-shell-18`, in the same commit as
   the updated `design-review.sha256`. Planning artifacts are not edited from a lane.

## Out-of-map edits (recorded in the WP that makes them)

| WP | File | Owner | Why |
|---|---|---|---|
| WP04 | `packages/mission-shell/src/controller/shell-controller.ts` | WP03 | Host-facing commands. IC-04 extends the controller through its owner, IC-03. |
| WP05 | `packages/mission-shell/src/controller/shell-controller.ts` | WP03 | Makes `INTENT_TABLE` the dispatch source of `controller.intent` (created by WP03, extended by WP04). |
| WP06 | `gates/plants/unit-tests/plant.json` | WP02 | Appends plant P-7 (operator ruling `01M50K4NSNYD9TEQ12T4J7KVHT`). |
| WP07 | `gates/markdown-lint.selftest.ts` (one line) | none (#17 file) | "knows the browser globals" reads `navigator.language` as shell source. Replace it with `String(performance.now())`, since `navigator` is now banned in the shell (C-001, R-13). No rule changes. |
| WP08 | `apps/storybook/tests/visual/__snapshots__/shell-*.png` | WP09 | Candidate baselines for CP-1. WP09 owns the final files. |
| WP09 | `packages/mission-shell/src/ui/**` | WP06 | CP-1 amendments only (plan IC-08b grant). |
| WP09 | `packages/mission-shell/src/core/connection.ts` | WP03 | CP-1 copy and presentation amendments only (plan IC-08b grant). |
| WP09 | `gates/plants/visual/plant.json` | WP08 | Re-anchoring P-6 only, if CP-1 changes the reconnecting tone (FS-04). |
| WP09 | `packages/mission-shell/test/shell/banners.test.ts`, `packages/mission-shell/test/logic/connection.test.ts` | WP06, WP03 | Banner and copy tests that follow a CP-1 amendment (FS-04). |
| WP10 | (none) | | Its `ci.yml` edit is matrix `timeout` values only, and only upward. |

## Proof-leg timing obligations

Each WP that owns or re-proves a plant records its local `heavy pnpm gate-proof leg --gate <gate>` time in its final
report. WP10 uses these to set provisional matrix timeouts (ruling `01M50K4S90BX5W0M322WYH8SA1`). A post-PR
`(landing)` fold re-derives them from the PR's first CI run.

## Follow-ups outside this mission

- #20 and #21 consume `./shell` (SC-005 is checked at their plan reviews).
- The SO-DES-017 gate-proof cost architecture is still open; this mission adds two unit-tests runs.
