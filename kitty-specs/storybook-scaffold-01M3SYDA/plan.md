# Implementation Plan: Storybook scaffold

**Branch**: `feat/storybook-scaffold` | **Date**: 2026-09-30 | **Spec**: `kitty-specs/storybook-scaffold-01M3SYDA/spec.md`
**Input**: Feature specification from `kitty-specs/storybook-scaffold-01M3SYDA/spec.md`

**Branch contract**: current branch at plan start `feat/storybook-scaffold`; planning/base branch
`feat/storybook-scaffold`; completed changes merge into `feat/storybook-scaffold` (`branch_matches_target: true`).
The mission PR later goes from that branch into `main`; the operator merges.

## Summary

Stand up a pnpm workspace with `@spec-kitty/mission-ui` (Lit 3, TypeScript strict), a Storybook app that loads the
private `@spec-kitty/tokens|styles|elements` `1.1.0-rc.10`, one sample element `sk-mission-sample` with four view-state
stories plus an autodocs page, and eleven gate ids as separately named checks (the eight charter gates with lint split in
two, plus preflight, hygiene and `proof`) plus one aggregate `Gate: all`, in one GitHub Actions workflow. The `proof` gate is
a matrix of 10 parallel legs (`Gate: proof (<gate>)`, each: clean run, plant, planted run) and a final `Gate: proof` coverage
job; every gate but `proof` is proven non-vacuous. Counts are derived from `ci.yml`, never hard-coded. Decisions and
rationale: `research.md` (R0 holds the fold-in verification log). Structures: `data-model.md`, `contracts/`, `quickstart.md`.

## Technical Context

**Language/Version**: TypeScript 5.9.3 (strict), ECMAScript 2023 target, Node 22.22.2, pnpm 11.18.0 (no corepack: `pnpm/action-setup` in CI, direct install locally)
**Primary Dependencies** (every spec exact; hygiene rejects ranges): Lit 3.3.3, Vite 7.3.6, Storybook 10.6.1 (`@storybook/web-components-vite`), `@spec-kitty/tokens|styles|elements` 1.1.0-rc.10 (GitHub Packages, exact pins, lockfile integrity asserted), `@custom-elements-manifest/analyzer` 0.11.0, ESLint 9.39.5, `@eslint/js` 9.39.5, typescript-eslint 8.71.0, eslint-plugin-lit 2.3.1, Stylelint 16.26.1, stylelint-declaration-strict-value 1.12.1, postcss-lit 1.4.1 (full table: research R4)
**Storage**: N/A (presentational elements; no I/O by rule)
**Testing**: Vitest 4.1.11 browser mode (Chromium) for unit and interaction tests (all `vitest`/`@vitest/*` equal); Playwright 1.62.1 for visual regression and story smoke (stays 1.62.1 deliberately: coupled to the image tag and digest); ESLint 9 + Stylelint 16 self-tests via the gate-proof harness
**Target Platform**: Modern evergreen browsers and Tauri webview (elements only); CI on GitHub-hosted `ubuntu-24.04`; visual checks in container `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e` (digest resolved 2026-09-30; image Node is 24.18.1, repo tooling runs on 22.22.2 installed in the container)
**Project Type**: pnpm monorepo (library package plus tooling app)
**Performance Goals**: NFR-001 clean clone to running workbench in at most 2 commands and under 5 minutes; NFR-002 all PR checks under 15 minutes (per-job `timeout-minutes` and estimates: research R9, `contracts/ci-gates.md`)
**Constraints**: private repo, nothing published (C-004); committed `.npmrc` scope-only (C-002); no exe.dev/Blacksmith (C-003); project CSS layout-only with `--sk-*` tokens (C-005); no real screens (C-006)
**Scale/Scope**: 1 library package, 1 tooling app, 1 sample element, 4 stories + autodocs, 11 gate checks + `Gate: all`

## Charter Check

Charter: `.kittify/charter/charter.md` (present). Evaluated before research and again after design.

| Charter rule | Plan response | Status |
|---|---|---|
| Stack: TS strict, Lit 3, Storybook, Vite, pnpm workspaces | R1, R2 | pass |
| Screen contract: props in, `status` view state, `sk-*` bubbling+composed events out, no I/O | `contracts/sample-element.md`; `no-io` gate + selftest | pass |
| Elements over CSS; project CSS layout-only, tokens only, Stylelint rejects literals | sample element composes `sk-*`; `stylelint` gate with property allow-list (R4) | pass |
| Gates: typecheck, ESLint, Stylelint, Storybook build, unit/interaction, visual, manifest, no-I/O, token-only Stylelint | one named job each (`contracts/ci-gates.md`) | pass |
| Visual regression "against the prototype" | not an exception: follows from the operator-confirmed Intent Summary (no real screens; C-006). Baselines are the sample element's own rendering (spec Assumptions); prototype comparison starts with the first real screen mission (research, "Recorded scope decision") | pass with recorded scope note |
| Documentation policy | README (FR-016), package `CHANGELOG.md`, Storybook autodocs page for the sample element | pass |
| Elements over CSS (enforced, not just reviewed) | ESLint forbids raw `<button`, `<input`, `class=`, inline `style=`, `styleMap`, `unsafeCSS`; Stylelint `unit-allowed-list ['%','fr']` | pass |
| Fixtures: no real data, absolute paths, usernames | `hygiene` gate scans all non-ignored files; fixtures synthetic | pass |
| No secrets committed; install needs `read:packages` from the environment | `.npmrc` scope-only, preflight, hygiene | pass |
| PRs into `main`, operator merges, separate reviewer per WP | unchanged | pass |
| Adversarial squad after plan only | run by the orchestrator; findings folded 2026-09-30 (research R10) | done |
| No quality standards relaxed | none relaxed; no exceptions requested | pass |

Post-design re-check: no new violations; the extra `hygiene` and `proof` checks strengthen, not relax, the charter.
Complexity Tracking: no violations to justify.

## Project Structure

### Documentation (this mission)

```
kitty-specs/storybook-scaffold-01M3SYDA/
├── spec.md
├── plan.md                      # this file
├── research.md                  # decisions R1..R10 and open risks
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── sample-element.md
│   ├── ci-gates.md
│   └── gate-proof-record.schema.json
└── tasks.md                     # NOT created by plan
```

### Source Code (repository root)

```
.nvmrc                           # 22.22.2
.npmrc                           # @spec-kitty:registry=https://npm.pkg.github.com  (only line; hygiene: byte-equal)
.pnpmfile.cjs                    # pre-resolution credential check (offline, reads ~/.npmrc)
package.json                     # private root, packageManager pnpm@11.18.0, engines, scripts; exact dependency specs only
pnpm-workspace.yaml              # packages/*, apps/*; allowBuilds: { esbuild: true, rs-module-lexer: true }
pnpm-lock.yaml
tsconfig.base.json               # strict settings shared
eslint.config.mjs                # general rules
eslint.no-io.config.mjs          # no-I/O gate rules
stylelint.config.mjs
README.md                        # FR-016
.github/workflows/ci.yml
packages/mission-ui/
├── package.json                 # @spec-kitty/mission-ui
├── CHANGELOG.md
├── tsconfig.json                # includes src and test
├── custom-elements.json         # generated, committed
├── custom-elements-manifest.config.mjs
├── vitest.config.ts
├── src/
│   ├── index.ts                 # registers and exports elements
│   ├── view-state.ts            # ViewState type
│   └── elements/sk-mission-sample/
│       ├── sk-mission-sample.ts
│       ├── sk-mission-sample.stories.ts
│       └── fixtures.ts
└── test/sk-mission-sample.test.ts
apps/storybook/
├── package.json                 # @spec-kitty/storybook-app (private)
├── tsconfig.json
├── .storybook/{main.ts,preview.ts,preview-head.html}
├── playwright.config.ts         # visual:run = plain `playwright test`
└── tests/visual/{stories.visual.spec.ts,__snapshots__/}
scripts/
├── preflight.mjs                # online+offline credential check
├── preflight-core.cjs           # offline part, shared with .pnpmfile.cjs
├── check-hygiene.mjs
├── check-manifest.mjs
├── visual.sh                    # in pinned image: runs visual:run; else podman/docker; FAILS (never skips) if neither
└── gate-proof.mjs               # local: throwaway worktree with symlinked node_modules; CI: leg fragments, coverage, assemble
gates/
├── plants/<gate>/{plant.json, overlays: *.ts.plant, *.css.plant, *.json.plant}   # no lintable file here (hygiene)
├── fixtures/no-io/*.ts.txt
└── no-io.selftest.ts            # included by tsconfig so typecheck covers it
# gate-proof output (proof-record.json, PROOF.md) is a CI artifact; if committed it is a snapshot of its PARENT commit
```

**Structure Decision**: pnpm workspace with `packages/*` for libraries and `apps/*` for non-published tooling; Storybook
in `apps/storybook` so dev tooling never enters the library package. Gate proof assets live in `gates/`, outside every
gate's glob by construction.

## Gate traceability

| Requirement | Delivered by |
|---|---|
| FR-001 | workspace files, `packages/mission-ui` |
| FR-002 | root `.npmrc`, exact pins, lockfile |
| FR-003 | `apps/storybook` |
| FR-004, FR-005 | `sk-mission-sample`, stories, test file |
| FR-006 | `typecheck` |
| FR-007 | `eslint`, `stylelint` |
| FR-008 | `storybook-build` |
| FR-009 | `unit-tests` |
| FR-010 | `visual` |
| FR-011 | `manifest` |
| FR-012 | `no-io` |
| FR-013 | `preflight` job, `.pnpmfile.cjs`, `pnpm preflight` |
| FR-014 | `.github/workflows/ci.yml` (10 gate jobs, 10 proof legs, `Gate: proof`, aggregate `Gate: all`) |
| FR-015 | `gates/plants`, `scripts/gate-proof.mjs` (local worktree run, coverage, assemble), CI proof matrix and final `Gate: proof`, sanitised record artifact |
| FR-016 | `README.md` |
| NFR-001 | two-command quickstart; `.pnpmfile.cjs` fails fast |
| NFR-002 | parallel jobs; per-job `timeout-minutes` chain to 15 min; durations in the proof record and PR description |
| NFR-003 | single container image; `--repeat-each=5` in the `visual` job |
| NFR-004 | `hygiene` (source files, PNG chunks, `storybook-static`, workflow rules, record re-scan, two narrow CLI-record-path allow-list entries: charter `source_path`, status-file `feedback_path`) |
| NFR-005 | committed lockfile with integrity, `--frozen-lockfile`, exact pins enforced by hygiene |

## Implementation Concern Map

### IC-01 - Workspace and toolchain skeleton

- **Purpose**: root files, pnpm workspace, versions, TypeScript base config, scope-only `.npmrc`, lockfile.
- **Relevant requirements**: FR-001, FR-002, NFR-005, C-001, C-002
- **Affected surfaces**: repository root files, `packages/mission-ui/package.json`, `apps/storybook/package.json`
- **Sequencing/depends-on**: none
- **Risks**: `allowBuilds` (not `onlyBuiltDependencies`) with exactly `esbuild` and `rs-module-lexer`; exact pin of every tool (research R4 table); no corepack.

### IC-02 - Credential preflight

- **Purpose**: named, early failure for a missing or unusable registry credential, locally and in CI.
- **Relevant requirements**: FR-013, NFR-001, C-002
- **Affected surfaces**: `.pnpmfile.cjs`, `scripts/preflight*.{mjs,cjs}`, README section
- **Sequencing/depends-on**: IC-01
- **Risks**: pnpm ignores `NODE_AUTH_TOKEN`, so the offline check reads `~/.npmrc` (R0 b3); pnpmfile hook behaviour across pnpm versions; two plants (missing, bogus token).

### IC-03 - Design-system wiring and Storybook

- **Purpose**: Storybook loading tokens, elements and a pinned dark theme.
- **Relevant requirements**: FR-003, FR-002
- **Affected surfaces**: `apps/storybook/.storybook/*`
- **Sequencing/depends-on**: IC-01
- **Risks**: font URL emission; single `lit` copy; theme fallback flip.

### IC-04 - Sample element, stories, interaction tests

- **Purpose**: the template element exercising the screen contract.
- **Relevant requirements**: FR-004, FR-005, FR-009, US3
- **Affected surfaces**: `packages/mission-ui/src`, `packages/mission-ui/test`
- **Sequencing/depends-on**: IC-01, IC-03 (stories render in Storybook)
- **Risks**: elements-over-CSS review; events must bubble and compose.

### IC-05 - Static gates (typecheck, ESLint, Stylelint, no-I/O, manifest, hygiene)

- **Purpose**: configs, scripts and the no-I/O selftest with fixtures.
- **Relevant requirements**: FR-006, FR-007, FR-011, FR-012, NFR-004, C-005
- **Affected surfaces**: root configs, `scripts/check-*.mjs`, `gates/fixtures`, `gates/no-io.selftest.ts`, manifest config and committed manifest
- **Sequencing/depends-on**: IC-01, IC-04 (real input)
- **Risks**: `postcss-lit` coverage of `.ts` css templates; gates must scan full packages and untracked files; no-I/O rule set (bare globals, `Reflect.get`, `new Function`, `eval`, `new Image`, script elements) with a fixture each; analyzer's bundled TS ~5.4 vs element syntax.

### IC-06 - Visual regression environment

- **Purpose**: Playwright config, per-story spec, container wrapper, committed baselines.
- **Relevant requirements**: FR-010, NFR-003
- **Affected surfaces**: `apps/storybook/playwright.config.ts`, `apps/storybook/tests/visual`, `scripts/visual.sh`
- **Sequencing/depends-on**: IC-03, IC-04
- **Risks**: baselines only in the digest-pinned image; `visual:run` plain Playwright; `visual.sh` fails rather than skips; test count == story count (>= 4) and baselines 1:1 with stories; PNG chunk allow-list; image Node 24 vs repo Node 22.

### IC-07 - CI workflow

- **Purpose**: one workflow, one named job per gate, preflight first.
- **Relevant requirements**: FR-014, C-002, C-003, NFR-002
- **Affected surfaces**: `.github/workflows/ci.yml`
- **Sequencing/depends-on**: IC-02, IC-05, IC-06
- **Risks**: SHA-pinned actions; per-job token file lifecycle (write, install, delete, `if: always()` delete); `Gate: all` aggregate; container Node assertion; forbidden triggers; timeouts.

### IC-08 - Gate proof harness and record

- **Purpose**: plants per gate, runner (coverage + one planted run per gate in a throwaway worktree), sanitised record artifact, verification job.
- **Relevant requirements**: FR-015, SC-002, NFR-004
- **Affected surfaces**: `gates/`, `scripts/gate-proof.mjs`, CI proof matrix and `Gate: proof`
- **Sequencing/depends-on**: IC-05, IC-06, IC-07
- **Risks**: runtime (NFR-002 budget, research R9); plants must never reach real gates (non-source extensions); fail-closed sanitiser; offline worktree install.

### IC-09 - Contributor documentation

- **Purpose**: README: setup (pnpm installed directly, `~/.npmrc` credential), workbench, each gate, adding an element, refreshing baselines; package `CHANGELOG.md`; Storybook autodocs page.
- **Relevant requirements**: FR-016, NFR-001
- **Affected surfaces**: `README.md`
- **Sequencing/depends-on**: all others (final)
- **Risks**: must not contain an absolute path or a token.

## Work-package slicing hints (for `/spec-kitty.tasks`, not tasks)

- Suggested order and parallelism: IC-01 then IC-02 and IC-03 in parallel; IC-04 after IC-03; IC-05 and IC-06 in
  parallel after IC-04 (disjoint write scopes: root lint/manifest configs and `scripts/check-*` versus
  `apps/storybook/tests` and `scripts/visual.sh`); IC-07 after both; IC-08 after IC-07; IC-09 last.
- IC-01 to IC-04 could plausibly be 3 to 4 packages; IC-05 is large enough to split into "lint + typecheck" and
  "no-I/O + manifest + hygiene".
- Every package that adds a gate should add its plant under `gates/plants/<gate>/` so the proof harness (IC-08)
  only wires and records rather than invents.
- Forbid sub-agents inside package briefs; visual baselines must be produced only in the pinned container.
- **Hard WP requirements** (1) before first use the implementer re-runs
  `skopeo inspect --raw docker://mcr.microsoft.com/playwright:v1.62.1-noble | sha256sum` and records that it equals
  `dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e` (if it differs, halt and report; do not swap silently);
  (2) every `package.json` spec exact, verified by hygiene; (3) `allowBuilds` re-verified against the real lockfile; (4) the
  plant for each gate ships in the same package as the gate; (5) the CLI-written `source_path` line in
  `.kittify/charter/charter.yaml` is covered only by a narrow hygiene allow-list entry, the file is not edited; likewise the CLI-written `feedback_path` values in the mission's status files (second entry).
  (6) the first implementation WP runs the hygiene gate against `kitty-specs/` and `.kittify/` and fixes or narrowly allow-lists every hit (planning documents are scanned like any file).
