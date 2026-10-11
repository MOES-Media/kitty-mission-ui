# Tasks notes: Artifact Viewer screen

Companion to the generated `tasks.md` (which `finalize-tasks` regenerates from `wps.yaml` and which carries only the per-WP header lines). This file holds what the generated file cannot: the dependency graph with CP-1 and Base A, the shared-file ownership rule, the requirement and story coverage tables, and the items deliberately left to CP-1. It is orchestrator-readable planning text, not tool state. Mission `artifact-viewer-screen-01M47VP5`, target branch `feat/artifact-viewer-screen-7`.

## Work packages (13, one per implementation concern of `plan.md`)

| WP | Concern | Title | Depends on | Chain |
|---|---|---|---|---|
| WP01 | IC-01a | Contract re-vendor, fixtures and relaxations | none; BLOCKED until mission-ui#5 has merged to `main` (Base A) | serial |
| WP02 | IC-01b | markdown-it dependency, supply-chain record and spike S-A0 step one | WP01 | serial |
| WP03 | IC-02 | Defaults, logic and data-driven extension | WP02 | serial |
| WP04 | IC-03 | Markdown model: parse, budget and links | WP03 | serial |
| WP05 | IC-04 | Markdown renderer, hostile corpus and plants (the security gate) | WP04 | serial |
| WP06 | IC-05 | Foundation spikes S-A1 to S-A6 and CP-1 evidence | WP05 | serial |
| WP07 | IC-06a | Exceptions, Stylelint grant and lint configuration | WP06 | serial |
| WP08 | IC-06b | Skeleton, layout and surface freeze | WP07 | serial |
| WP09 | IC-07 | Document pane (chain X) | WP08 | X |
| WP10 | IC-08 | Refusals and states (chain X) | WP09 | X |
| WP11 | IC-09 | Inspector, Work Package links and tree stories (chain Y) | WP08 | Y |
| WP12 | IC-10 | Tiers, accessibility and edge cases | WP10 | X + Y merged by the orchestrator |
| WP13 | IC-11 | Integration, baselines and wrap-up inputs | WP12 | serial |

## Dependency graph

```
#5 merged to main (Base A: the ENTRY CONDITION of WP01, not a tool dependency)
   -> WP01 -> WP02 -> WP03 -> WP04 -> WP05 -> WP06
   -> [CP-1: orchestrator step, operator confirmed the values on 2026-10-07; NOT a work package]
   -> WP07 -> WP08
WP08 -> WP09 -> WP10 (chain X) -> WP12 <- WP11 (chain Y, merged in by the orchestrator)
WP08 -> WP11 (chain Y)
WP12 -> WP13
```

The tool records WP12's dependency as WP10 only; WP11 is merged into WP12's lane by the orchestrator (`plan.md` "Lane mechanics" item 3) and WP12's first subtask stops if chain Y is absent. This is the plan's own shape and the precedent of #4 (its WP10 on WP09 with chain B merged in).

**CP-1 (checkpoint, not a work package).** After WP06 is approved the orchestrator puts the prototype beside the spike renders in front of the operator and records `CP-1 confirmed` in `tracer-design-decisions.md` and `spec.md` Clarifications. The tool cannot express CP-1 as a dependency, so WP07 and WP08 each open with a FILE PRECONDITION (the entry exists and `git merge-base --is-ancestor <CP-1 commit> HEAD` holds; absent means stop and report; the reviewer rejects otherwise). WP09 to WP12 repeat the ancestor check as a first step. The CP-1 write-back list items (1) to (10) of `plan.md` and every formerly PENDING value were CP-1 work, NOT resolved by this task breakdown, and are DONE in the CP-1 commit of 2026-10-07 (the WP07 to WP13 prompts carry the ruled values); NFR-014 and NFR-015 (amendment A-7, accepted) were not in `spec.md` when the prompts were generated, so they are cited in the WP prompts and not in `requirement_refs` (the tool would have reported an unknown spec id); they are in `spec.md` now, and `requirement_refs` is not re-generated (no mutating `finalize-tasks`).

**Base A.** WP01 is blocked until mission-ui#5 has merged to `main` (operator ruling PLAN-DESIGN-017). The orchestrator re-verifies the merge upstream at dispatch (`gh pr list`, `git ls-tree` of the merged `main`; local refs are never evidence). WP08 also edits two files that exist only after #5 merges (`logic/wp-retry.ts`, `sk-work-package-screen.ts`), declared as `.*` globs for that reason.

**Dispatch rule for WP12.** The tool does not order WP12 after WP11 (the plan's shape records only WP10). The orchestrator does not run `implement WP12` until WP10 AND WP11 are both approved, the approved WP11 tip is merged into WP12's lane, `custom-elements.json` conflicts (if any) are resolved by `pnpm manifest:generate` only, and the owned-files disjointness check of WP11's changed files against WP09 and WP10's owned files has passed (any overlap is a stop).

**Baseline.** WP01's first subtask runs every gate on the unchanged merged tree. The orchestrator writes WP01's baseline table into `tracer-approach.md` after WP01 is approved and names it in every later dispatch; a red gate is classed against it (absent from it means introduced and fixed in the WP, present means reported as pre-existing). The plan's baseline (`main` known-red set) is therefore a recorded artifact, not a memory.

**Plan concern refs.** `wps.yaml` records IC-01a and IC-01b as `IC-01` and IC-06a and IC-06b as `IC-06`, because the tool accepts only `IC-##` (tracer-tooling-friction); the generated `tasks.md` therefore shows `Plan Concerns: IC-01` for WP01 and WP02 and `IC-06` for WP07 and WP08. The plan's names are the authority; the WP prompts and this file use them.

## Chokepoints (shared gates, shared contracts, shared configuration)

These work packages own a surface every later work package depends on, so they serialise the mission whether or not the plan admits it, and a change request against any of them is raised before chains X and Y start: WP03 (the `data-driven` gate and `ShellIcon` set), WP05 (the ESLint rule set R1 to R5 and `noInlineConfig`, the `test:no-io` and `test:scripts` scripts, the five plants, the `unit-tests` proof-leg timeout), WP07 (the Stylelint `ch` grant and the numbered exceptions), WP08 (the `sk-retry-load` event typing shared with #5, the one named edit of #5's merged files, the `OverflowRegion` edit, the frozen public surface and the single manifest regeneration) and WP13 (`ci.yml` timeouts and the root `package.json`). No open pull request exists on the repository at the time of writing (checked with `gh pr list`), so no write scope collides with another PR; the orchestrator re-checks at dispatch.

## RULED: fork found by analyze (A1), operator ruled option (A) on 2026-10-06; applied in plan.md, contracts/defaults.md, WP03 and WP04

**Forward dependency inside the plan.** IC-02 (WP03) is ordered before IC-03 (WP04), but three of IC-02's deliverables name types and a builder that IC-03 creates: `markdownFor` (`contracts/defaults.md`, file `artifact-view.ts`: "else `buildMarkdownModel(content.content)`"), `resolveArtifactView` (its input `markdown: MarkdownResult | null`; `MarkdownResult` is defined in `logic/markdown/model.ts`, `data-model.md`), and the vocabulary's budget group (plan IC-02: "`buildMarkdownModel` the budget", an exit check that calls each vocabulary reader with and without a `vocabulary`). IC-03 cannot move before IC-02 either: `links.ts` imports `../artifact-path.ts` and `budget.ts` imports `defaults/markdown.ts`, both IC-02. WP03's `pnpm typecheck` and its `markdownFor` tests therefore cannot pass on its own lane base. The plan squad did not catch it and neither did the tasks squad; analyze did (finding A1, high).

Defensible remedies (more than one, so this is a fork, not ruled here):

- **(A) recommended: move `markdownFor` and its tests to WP04, type the seam structurally in WP03.** WP03 types `resolveArtifactView`'s `markdown` input and the vocabulary budget group with minimal structural types in `artifact-types.ts` (the discriminant `{ kind: 'ok' | 'fallback' }` and the budget record of `defaults/markdown.ts`), which `MarkdownResult` and `MARKDOWN_BUDGET` satisfy; WP04 owns `markdownFor` (a named additive edit of `artifact-view.ts` or a new file it owns) and the with-and-without-`vocabulary` test of `buildMarkdownModel`. Dependencies and WP count unchanged; cost: the `markdownFor` file column in `contracts/defaults.md` and two sentences of plan IC-02 and IC-03 are amended at the next write-back.
- **(B) inject the builder.** `markdownFor(content, build)` takes `buildMarkdownModel` as a parameter supplied by the screen (WP08), so WP03 keeps `markdownFor` and imports nothing from IC-03; `MarkdownResult` is still needed as a type, so WP03 also declares it (and the closed `Block` union placeholder) in `artifact-types.ts` and WP04's `model.ts` imports it. Cost: changes the `markdownFor` signature in the contract and moves type ownership.
- **(C) merge IC-02 and IC-03 into one work package.** Removes the forward reference but breaks the plan's 13-WP shaping and the WP size guidance (about 20 deliverables).

Recommendation: (A). It touches the least (one function and its tests change owner, no signature changes, no dependency or WP-count change) and keeps WP03 independently compilable. RULED (A): applied; the text below is kept as the record of the options.

## Ownership and parallel chains

`finalize-tasks` collapses work packages with overlapping `owned_files` into one execution lane, and an intermediate work package with disjoint files then makes a lane dependency cycle (`LANE_DEPENDENCY_CYCLE`, seen on this mission's first validate-only run). Every shared file therefore has ONE owner in `owned_files`, and every other writer records a named out-of-map edit exactly as the plan's "Shared files: who may write them" table grants (quoted in each WP prompt). Owners: `eslint.config.mjs`, `eslint-rules/**`, `gates/markdown-lint.selftest.ts`, `gates/plants/**`: WP05 (WP06, WP07 and WP08 edit as named); `stylelint.config.mjs`: WP07; `custom-elements.json`, `src/index.ts`: WP08; root `package.json`, `ci.yml`, README, both CHANGELOGs: WP13 (WP05 makes the three named edits); `package.json` of the package and the lockfile: WP02; the part files: WP09 (toolbar, tab, document, source, prose-styles), WP10 (refusal, state), WP11 (inspector), created as stubs by WP08.

Chains X (WP09, WP10) and Y (WP11) are dependency-unordered and their owned files are disjoint: part files, one stories file per chain, and distinct test-file name prefixes (`sk-artifact-screen.tabs|links|document|source|notices` and `markdown-corpus.screen` for WP09; `.refusal|state|focus|announce|payload` for WP10; `.inspector|tree|treehost` for WP11; `.tier|a11y|timing|media|composition|dynamic|truncation|eyebrow` for WP12). The file names are fixed by this breakdown (the plan names areas, not files) so ownership stays disjoint.

## Requirement coverage (every FR, NFR and C of `spec.md`)

| ID | Work packages |
|---|---|
| C-001 | WP08 |
| C-002 | WP01 |
| C-003 | WP08 |
| C-004 | WP03 |
| C-005 | WP07, WP08 |
| C-006 | WP06, WP13 |
| C-007 | WP03, WP12 |
| C-008 | WP01, WP13 |
| C-009 | WP13 |
| C-010 | WP08, WP13 |
| C-011 | WP13 |
| C-012 | WP13 |
| C-013 | WP02 |
| C-014 | WP04, WP05 |
| FR-001 | WP08 |
| FR-002 | WP08, WP09 |
| FR-003 | WP09 |
| FR-004 | WP09 |
| FR-005 | WP04, WP05, WP09 |
| FR-006 | WP04, WP05, WP09 |
| FR-007 | WP04, WP05, WP09 |
| FR-008 | WP04, WP05, WP09 |
| FR-009 | WP04, WP05, WP09 |
| FR-010 | WP05, WP09 |
| FR-011 | WP09 |
| FR-012 | WP09 |
| FR-013 | WP09 |
| FR-014 | WP09 |
| FR-015 | WP10 |
| FR-016 | WP10 |
| FR-017 | WP10 |
| FR-018 | WP03, WP11 |
| FR-019 | WP11 |
| FR-020 | WP03, WP11 |
| FR-021 | WP03, WP11 |
| FR-022 | WP03, WP11 |
| FR-023 | WP10 |
| FR-024 | WP10 |
| FR-025 | WP03, WP11 |
| FR-026 | WP03, WP11 |
| FR-027 | WP03, WP11 |
| FR-028 | WP03, WP11 |
| FR-029 | WP11 |
| FR-030 | WP03, WP11 |
| FR-031 | WP03, WP12 |
| FR-032 | WP08, WP09, WP10, WP11, WP12 |
| FR-033 | WP03, WP12 |
| FR-034 | WP03, WP12 |
| FR-035 | WP09, WP10, WP11, WP12 |
| FR-036 | WP06, WP12 |
| FR-037 | WP03, WP08, WP13 |
| FR-038 | WP01, WP13 |
| FR-039 | WP08 |
| FR-040 | WP06, WP07, WP08 |
| FR-041 | WP13 |
| FR-042 | WP03 |
| FR-043 | WP02, WP05, WP13 |
| FR-044 | WP01, WP05 |
| NFR-001 | WP13 |
| NFR-002 | WP12, WP13 |
| NFR-003 | WP09, WP12 |
| NFR-004 | WP12 |
| NFR-005 | WP05 |
| NFR-006 | WP04, WP05, WP12 |
| NFR-007 | WP01, WP13 |
| NFR-008 | WP06, WP13 |
| NFR-009 | WP03, WP12 |
| NFR-010 | WP01, WP13 |
| NFR-011 | WP03, WP09, WP12 |
| NFR-012 | WP05 |
| NFR-013 | WP02, WP05, WP13 |
| SC-001 | WP13 |
| SC-002 | WP12 |
| SC-003 | WP05 |
| SC-004 | WP12 |
| SC-005 | WP10 |
| SC-006 | WP12 |
| SC-007 | WP13 |
| SC-008 | WP13 |
| SC-009 | WP13 |
| SC-010 | WP12 |

## Story and event coverage (state matrix AV-01 to AV-35, events EV-1 to EV-10)

| Rows | Built by | Verified in |
|---|---|---|
| AV-01 to AV-08 (Document) | WP09 | WP09; AV-01 and AV-08 side-by-side repeated in WP12 |
| AV-09 to AV-14, AV-20 to AV-23 (Refusals and states) | WP10 | WP10 |
| AV-15, AV-16, AV-18, AV-19 (tree) | WP11 | WP11 |
| AV-17 (truncated note) | story title WP11; note render body WP09 | test in WP12 (merged chains) |
| AV-24 to AV-28 (inspector, Work Package links) | WP11 | WP11 |
| AV-29 (unknown kind) | WP11 (tree data, inspector) | eyebrow half in WP12 |
| AV-30, AV-32a to AV-32d, AV-33 to AV-35 (Tiers and edge cases) | WP12 | WP12 |
| AV-31 (tablist) | WP09 | WP09 |
| all 45 baselines | WP13 only | WP13 (five consecutive runs) |
| EV-1 to EV-3, EV-10 | WP09 | WP09; SC-002 audit in WP12 |
| EV-4, EV-9 | WP11 | WP11; SC-002 audit in WP12 |
| EV-5, EV-6, EV-7 | WP10 | WP10; SC-002 audit in WP12 |
| EV-8 | WP12 | WP12 |

## PR shape, gate set, baseline, tracer files

ONE pull request for the mission (operator standing rule, charter 046), opened only after accept, test cleanup, the aggregate squad, history compaction into the twelve named slices of `plan.md`, rebase, full gate re-run and the operator's Storybook review; WPs never push or open pull requests. 13 work packages; the diff is large (a security gate, 45 baselines, one element with eight part files) but is sliced for review by the named compaction slices; no per-work-package split is recommended here (the decision belongs to the orchestrator and the operator). The gate set is the plan's ("Gates" and `contracts/gates.md`); the baseline of known-red gates is recorded by WP01 before any change. Tracer files: `tracer-design-decisions.md` exists; `tracer-tooling-friction.md` is written for the friction found in this phase.

