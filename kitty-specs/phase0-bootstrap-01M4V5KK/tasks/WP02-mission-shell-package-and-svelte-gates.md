---
work_package_id: WP02
title: mission-shell package and Svelte tooling in the gates
dependencies: []
requirement_refs:
- C-001
- FR-005
- FR-006
- FR-007
- NFR-003
- SC-002
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T007
- T008
- T009
- T010
- T011
- T012
- T013
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/package.json
- packages/mission-shell/tsconfig.json
- packages/mission-shell/svelte.config.js
- packages/mission-shell/vitest.config.ts
- packages/mission-shell/src/index.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/package.json
- packages/mission-shell/tsconfig.json
- packages/mission-shell/svelte.config.js
- packages/mission-shell/vitest.config.ts
- packages/mission-shell/src/index.ts
- package.json
- pnpm-lock.yaml
- eslint.config.mjs
- eslint.no-io.config.mjs
- eslint.data-driven.config.mjs
- gates/no-io.selftest.ts
- gates/fixtures/no-io/**
- gates/plants/typecheck/**
- gates/plants/eslint/**
- gates/plants/no-io/**
- gates/plants/stylelint/**
- gates/plants/data-driven/**
- stylelint.config.mjs
- gates/data-driven.selftest.ts
- gates/fixtures/data-driven/**
- scripts/terminology.mjs
- scripts/terminology.test.mjs
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP02 - mission-shell package and Svelte tooling in the gates (IC-03)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Create the `@moes-media/mission-shell` package and teach the existing gates about Svelte. `svelte-check` joins the typecheck gate. ESLint parses `.svelte` files. Stylelint's token-only rules cover `.svelte` style blocks (B2), and the data-driven gate covers `.svelte` with a plant (B3, C1). The no-io gate covers the shell, including `<script>` blocks (FR-007, C-001). The terminology scan includes `.svelte` and `.rs` files. Every new rule gets a planted defect (FR-006). All new npm dependencies are pinned exactly, with supply-chain evidence (NFR-003).

## Context

Read:
- `plan.md`: IC-03, Gates, "Shared-file ownership", Project Structure.
- `research.md`: R-01, R-04, and "Supply-chain controls".
- `reviews/plan.squad.md`: F-19, F-36, F-37, F-44, F-45, F-48.

Repository facts:
- `pnpm-workspace.yaml` already globs `packages/*`.
- Root scripts: `typecheck` is `pnpm -r typecheck`, `lint` is `eslint . --max-warnings 0`, and `lint:no-io` is `eslint -c eslint.no-io.config.mjs packages/*/src`.
- `checkPackageJson` rejects version ranges, `checkTypecheckScripts` requires a `typecheck` script per workspace package, and `checkVitestFamily` requires one Vitest version (4.1.11) across the repository.
- `packages/mission-ui/vitest.config.ts` shows the browser-mode set-up to copy (the `@vitest/browser-playwright` provider, Chromium).
- pnpm 11 denies dependency build scripts unless they are listed in `pnpm-workspace.yaml` `allowBuilds`. Keep its two entries; any new entry needs a written justification.
- The repository pins vite 7.3.6. `@sveltejs/vite-plugin-svelte` must be the newest version at least 14 days old whose peer range accepts vite 7, which is the 6.x line (F-37).

This WP owns the root `package.json`. To avoid later conflicts it also pre-adds two things other WPs need:
- the root script `"contract:drift": "node scripts/contract/drift.mjs"` (WP08 creates the file; no gate runs this script);
- the exact-path lint ignore for the generated `packages/mission-shell/src/generated/elements.d.ts` (WP04 creates it), recorded as an exception, like E-05 for `types.generated.ts` (F-45).

Two later WPs make recorded out-of-map edits to this file: WP04 (`manifest:check` and `test:scripts`) and WP06 (the root `test` script).

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: none. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP02 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T007 Gate baseline and the `mission-shell` package skeleton

**Steps**:
1. Record the TypeScript gate baseline on the build base, exactly as WP01 T001 does. If WP01 already recorded it on the same base, cite its hand-off instead.
2. Create `packages/mission-shell/package.json`:
   - `"name": "@moes-media/mission-shell"`, `"private": true`, `"type": "module"`, `"main": "src/index.ts"`, licence AGPL-3.0-or-later;
   - dependency `"@moes-media/mission-ui": "workspace:*"`;
   - scripts `"typecheck": "svelte-check --tsconfig ./tsconfig.json --fail-on-warnings"` and `"test": "vitest run"`.
3. `tsconfig.json` **extends `../../tsconfig.base.json`** (F-44). svelte-check type-checks the imported mission-ui Lit sources, which need `experimentalDecorators` and `useDefineForClassFields: false` from the base. Include `src/**/*.ts`, `src/**/*.svelte` and `test/**/*.ts`.
4. `svelte.config.js`: `vitePreprocess()` and no other options.
5. `vitest.config.ts`: copy mission-ui's browser-mode config (Playwright provider, Chromium, one project, `include: ['test/**/*.test.ts']`) and add the Svelte Vite plugin.
6. `src/index.ts`: a module doc comment and `export {};`. The port arrives in WP05, the harness in WP06.
7. Until WP06 exists, `vitest run` with no tests would fail. WP06 changes the root `test` script, so the root `pnpm test` does not reach the shell yet. Do not add `passWithNoTests`.

### T008 Dependencies, exact pins and supply-chain evidence

**Steps**:
1. Add, pinned exactly, to the root `package.json` devDependencies (the repository convention keeps tooling at the root):
   - `svelte` 5.x: newest at least 14 days old;
   - `@sveltejs/vite-plugin-svelte` 6.x: peer `vite: ^6.3.0 || ^7.0.0`;
   - `svelte-check`;
   - `eslint-plugin-svelte`;
   - `svelte-eslint-parser`, listed explicitly because the config imports it (F-36).
   - `postcss-html`, the Stylelint custom syntax for `.svelte` style blocks (B2).
   Do **not** add `@wc-toolkit/svelte-types` (F-30).
2. Add `"contract:drift": "node scripts/contract/drift.mjs"` to the root scripts.
3. `pnpm install`, and commit `pnpm-lock.yaml`.
4. Supply-chain evidence per package (DIRECTIVE_051, recorded in the hand-off):
   - **S-1:** the registry is npmjs.
   - **S-2:** first-publish and latest-publish dates, and the chosen version's age.
   - **S-3:** whether the package has install scripts (`npm view <pkg>@<v> scripts`). No new `allowBuilds` entry is expected.
   - **S-4:** the lockfile diff summary, with the count of new transitive packages and their publish dates (F-29 deferral evidence).
   - **S-5:** the `pnpm audit --prod=false` result.

### T009 ESLint and Stylelint parse Svelte (R-04, B2)

**Steps**:
1. In `eslint.config.mjs`, add the `eslint-plugin-svelte` flat config for `packages/*/src/**/*.svelte`, using `svelte-eslint-parser` with the TypeScript parser for `<script lang="ts">`.
2. Add exact-path ignores for `packages/mission-shell/src/generated/elements.d.ts` in `eslint.config.mjs`, `eslint.no-io.config.mjs` and `eslint.data-driven.config.mjs`. Add a comment naming the exception (the next free E-number in the repository's exception list; check `scripts/stylelint-exceptions.test.mjs` and the earlier missions' E-05 for how exceptions are recorded). Record the exception in the hand-off for the PR description with **scope** (the exact path), **rationale** (generated output, guarded by the staleness check), **sunset criteria** (removed when the generator emits lint-clean output or the lint configs gain a generated-file allowance) and an **operator-approval request**, as the charter's "Amendments and exceptions" requires (A15).
3. **Stylelint over `.svelte` (B2, charter "token-only Stylelint rules")**: extend the root `lint:styles` glob with `packages/*/src/**/*.svelte`, and add an `overrides` entry in `stylelint.config.mjs` for `**/*.svelte` with `customSyntax: 'postcss-html'` (the syntax Stylelint documents for Svelte/HTML style blocks). Pin `postcss-html` exactly, with S-1 to S-5 evidence like the other new packages (T008). The existing token-only rules apply unchanged to `<style>` blocks; `.svelte` files without a `<style>` block must lint clean. Plant (stylelint gate): append to the existing `gates/plants/stylelint/plant.json` array an entry whose `source` overlay creates `packages/mission-shell/src/PlantStylelint.svelte` with `<style>.plant-stylelint-svelte { color: #ff0000; }</style>`; `ciCommand` `pnpm lint:styles` (byte-equal to the existing entries); `expectFailPattern` (C4, one substring; `scripts/gate-proof/lib.mjs` matches with `output.includes`): the **rule id** Stylelint prints for the raw hex colour under this config. Determine it once by running `pnpm lint:styles` with the plant applied, and use exactly that id (for example `color-no-hex`). A parse error does not print a rule id, so it cannot satisfy the plant, and the clean run prints no violation, so the id is absent from clean output. The stylelint proof leg already runs 13 plants: record its local leg time with this 14th (F-42).
4. Plant (eslint gate): add a plant to `gates/plants/eslint/plant.json`. A `source` overlay creates `packages/mission-shell/src/PlantEslint.svelte` with a script block containing `let plantEslintSvelte = 1; plantEslintSvelte = plantEslintSvelte;` (no-self-assign). `expectFailPattern`: `plantEslintSvelte`.

### T010 No-io over the shell, including `.svelte` (FR-007, C-001, F-19)

**Steps**:
1. Extend `eslint.no-io.config.mjs` so its file globs include `packages/*/src/**/*.svelte` with the Svelte parser. Apply the existing banned-globals and banned-member rules unchanged inside `<script>` blocks. `.ts` files of the shell are already in `packages/*/src`.
2. Extend `gates/no-io.selftest.ts` with fixture cases:
   - a `.svelte` file using `fetch` is reported;
   - a `.svelte` file with no I/O is clean (positive control);
   - a `.ts` file in the shell using `EventSource` is reported.
3. Plant (no-io gate): a `source` overlay creating `packages/mission-shell/src/PlantNoIo.svelte` with `<script lang="ts">fetch('x');</script>`. The `expectFailPattern` is the **no-io rule's message text** (copy it from `eslint.no-io.config.mjs`), not the file name. A parse error would also print the file name, which would make the plant vacuous (F-19).
4. **Data-driven over `.svelte` (B3)**: `eslint.data-driven.config.mjs` lints only `**/*.ts` today, so `.svelte` files are not scanned. Add `**/*.svelte` to its rule blocks with `svelte-eslint-parser` (TypeScript parser for `<script lang="ts">`), applying the same selectors unchanged. Extend `gates/data-driven.selftest.ts` with fixtures under `gates/fixtures/data-driven/`: a `.svelte` file hard-coding a lane word is reported; a clean `.svelte` file is not (positive control). Nothing in the shell may hard-code lane, phase or artifact-kind words.
5. Plant (data-driven gate, C1, spec FR-006): append to the existing `gates/plants/data-driven/plant.json` array an entry whose `source` overlay creates `packages/mission-shell/src/PlantDataDriven.svelte` with `<script lang="ts">const plantDataDrivenSvelte = 'planned';</script>` (a lane word as a literal). `ciCommand` is byte-equal to the existing entries (`pnpm lint:data-driven && pnpm test:data-driven`). `expectFailPattern`: `data-driven: S1 phase name or lane value as a literal` (the S1 rule message in `eslint.data-driven.config.mjs`; one substring, printed only on that violation). Record the leg's local time with the new total of plants (C3, F-42).

### T011 `svelte-check` in the typecheck gate

**Steps**:
1. `pnpm typecheck` already runs every workspace package's `typecheck` script. Confirm its output includes `@moes-media/mission-shell` and `svelte-check found 0 errors`.
2. Plant (typecheck gate): `gates/plants/typecheck/plant.json` is currently a single object. Convert it to an array keeping the existing plant unchanged, and add a plant whose `source` overlay creates `packages/mission-shell/src/PlantTypecheck.svelte` with `<script lang="ts">const plantSvelteType: number = 'x';</script>`. `expectFailPattern`: `plantSvelteType`. Check that `scripts/gate-proof*` accepts both the object and the array form. Every other plant directory uses arrays.
3. WP04 adds two more typecheck plants as a recorded out-of-map edit. Leave the array open.

### T012 Terminology scan covers `.svelte` and `.rs` (F-48)

**Steps**:
1. In `scripts/terminology.mjs`, add `.svelte` to `SOURCE_EXTENSIONS`, and extend `scannedFiles` to walk `crates/**/src/**/*.rs` and `crates/**/tests/**/*.rs`, skipping `target/`.
2. Extend `scripts/terminology.test.mjs`:
   - a `.svelte` file with the banned word is found;
   - an `.rs` file under `crates/` with the banned word is found;
   - a file under `target/` is skipped;
   - positive controls for each.

### T013 Exit checks

Run every gate in "Gates this work package must pass". Also run `node scripts/gate-proof.mjs local --only typecheck,eslint,no-io,stylelint,data-driven` (or one `--only` at a time if the tool takes one) and record that each new plant is red on its pattern and each clean leg is green. Record each leg's local wall-clock and its total plant count (A26); WP09 consolidates them.

## Test strategy

The no-io and data-driven self-test cases, the terminology tests and the five new plants (typecheck, eslint, no-io, stylelint, data-driven). `gate-proof local` runs for typecheck, eslint, no-io, stylelint and data-driven. `pnpm visual` does not run.

## Definition of Done

- **Package:** `@moes-media/mission-shell` exists with a `typecheck` (svelte-check) and a `test` script, and its tsconfig extends the base. For this source-only package, "builds" (FR-005, US2 AC1) means `pnpm --filter @moes-media/mission-shell typecheck` (svelte-check) exits 0 with 0 errors (B14).
- **Dependencies:** six npm dependencies (including `postcss-html`) pinned exactly, with supply-chain evidence (S-1 to S-5 and transitive publish dates). No `@wc-toolkit`. `allowBuilds` is unchanged.
- **Svelte in the gates:** ESLint parses `.svelte`. Stylelint's token-only rules cover `.svelte` style blocks (stylelint plant, B2). The data-driven gate covers `.svelte` (self-test cases, B3, and a plant on the S1 rule message, C1). The no-io gate covers `.svelte` and `.ts` in the shell (self-test cases plus a plant on the rule message). The typecheck and eslint gates have Svelte plants. The terminology scan covers `.svelte` and `.rs`.
- **Pre-added for later WPs:** the `contract:drift` script and the generated-typings lint ignore, with the exception recorded.
- **Unchanged:** nothing under `packages/mission-ui` changed. Every gate is green.

## Risks

- **Analyzer version:** `svelte-check` with mission-ui's decorators needs the base tsconfig.
- **Vacuous plant:** the no-io plant could pass on a parse error. Match the rule message.
- **Peer mismatch:** the newest `vite-plugin-svelte` requires vite 8. Use 6.x.

## Reviewer guidance

- **Pins:** check the versions are exact and the evidence is real (dates, `npm view` output).
- **No-io plant:** its pattern must be the rule message.
- **Svelte rules:** check `.svelte` files really reach the no-io rule (try the self-test).
- **Typecheck plant:** the existing plant must be preserved byte-for-byte in the array conversion.
- **Unchanged:** no mission-ui change.

## Owned files, gates, red-first, commit rule

**Owned files** (the frontmatter `owned_files` is authoritative; stage only these). `owned_files` and `lanes.json` `write_scope` are tool-owned and never hand-edited. A shared file you do not own is changed ONLY where this prompt says so, as a **recorded out-of-map edit**: you commit it with a plain `git add <path>` and `git commit`, and list it in the hand-off with a one-line rationale. A change you need in a file you do not own, and that this prompt does not name, is a **change request** in the hand-off (file, change, reason), not an edit. Generated files (`custom-elements.json`, `types.generated.ts`, `fixtures.generated.ts`, `contracts/fixtures/*.json` except `mission-status.changes.json`, `packages/mission-shell/src/generated/elements.d.ts`, and `packages/mission-shell/src/generated/intents.ts` if WP04 generates it) are never edited by hand: regenerate them.

Shared-file owners (from `plan.md`, "Shared-file ownership"):

| File | Owning WP |
|---|---|
| `.github/workflows/ci.yml`, root `Cargo.toml`, `Cargo.lock`, `rust-toolchain.toml`, `.gitignore`, `gates/plants/rust/**` | WP01 |
| root `package.json`, `pnpm-lock.yaml`, `eslint.config.mjs`, `eslint.no-io.config.mjs`, `eslint.data-driven.config.mjs`, `gates/plants/typecheck/**`, `gates/plants/eslint/**`, `gates/plants/no-io/**`, `gates/plants/data-driven/**`, `gates/plants/stylelint/**`, `stylelint.config.mjs`, `gates/data-driven.selftest.ts` | WP02 |
| `scripts/contract/{generate,check,registry}.mjs` and their tests, `contracts/fixtures/**`, `gates/plants/contract/**` | WP03 |
| `gates/plants/manifest/**`, `scripts/typings.mjs` | WP04 |
| `gates/plants/unit-tests/**` | WP06 |
| `scripts/check-hygiene.mjs`, `scripts/hygiene/**`, `gates/plants/hygiene/**`, `scripts/contract/{common,drift}.mjs` | WP08 |
| `README.md`, `CHANGELOG.md` | WP09 |

**Gates this work package must pass before hand-off.** Each must exit 0, with the reporter's pass count above 0 and fail 0 where a reporter exists. Run them from the lane worktree root, after confirming `git rev-parse --show-toplevel` is that worktree.
- TypeScript and repository gates: `pnpm typecheck`, `pnpm lint`, `pnpm lint:styles`, `pnpm lint:no-io && pnpm test:no-io`, `pnpm manifest:check`, `pnpm hygiene && pnpm test:scripts && pnpm test:terminology`, `pnpm contract:check && pnpm test:contract`, `pnpm lint:data-driven && pnpm test:data-driven`, `pnpm test`, `pnpm build-storybook`.
- From WP01 on, the Rust gate, preceded by its two install steps: `rustup toolchain install` then `cargo fetch --locked`, then exactly:
  ```
  cargo fmt --all --check && cargo clippy --workspace --all-targets --frozen -- -D warnings && cargo test --workspace --frozen
  ```
- If WP01 is not in this lane's history yet, the Rust gate is not applicable; say so.
- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- **Gate-proof clean-output rule (C5):** `scripts/gate-proof/lib.mjs` fails a leg when any plant's `expectFailPattern` appears in the **clean** run's output, and it matches a plant with one `output.includes` substring (C4). So every plant token must be a single substring that is printed only when that plant's violation fires: never a test name, an identifier that clean tests print, or a file name a parse error would also print.
- If a script name differs on the build base, use the name the base provides and say so.

**Red-first rule.** For every behaviour, plant and gate case:
1. Write the failing test, the plant or the negative case FIRST.
2. Run it and see it fail for the right reason. Record the failing line in the hand-off.
3. Only then implement.

Per test file, make one deliberate revert of the behaviour (a temporary local edit, never committed) that produces a named failing test, then restore it. List it in the hand-off as the revert check; the reviewer re-runs two of them.

**Test-quality rules (binding).**
1. Counts are asserted with equality, never "at least". Every loop over fixtures, routes, events or examples asserts it ran the expected N times, so an empty loop fails.
2. Every "absent", "refused" or "no event" assertion is paired with a positive control on the same fixture or target, where the thing IS present, accepted or emitted.
3. A test that compares against an oracle must read the oracle from an independent source (the vendored YAML, `changes.json`, `custom-elements.json`), never from the output under test.
4. Vitest browser-mode tests call `page.viewport` first.
5. Terminology rule: the banned synonym for "mission" (`scripts/terminology.mjs`) never appears in source, tests, fixtures or docs.

**Commit locally. NEVER push, NEVER open a pull request, NEVER comment on an issue.** The mission lands as ONE pull request after accept and the pre-merge squad; the orchestrator owns that.
- Commit on your lane branch with a conventional message, for example `feat(mission-shell): ... (#17)`, ending with the attribution trailer the harness gives you.
- Stage owned files and the recorded out-of-map edits only. Never `git add -A`.
- The hand-off lists each commit hash, verified with `git cat-file -t`.

## Hard rules (every work package in this mission)

- **No delegation.** No sub-agents or forks; do this work package yourself.
- **No outward actions.** No push, no pull request, no issue comment.
- **No branch mechanics.** Never switch, create, reset or rebase branches yourself; the orchestrator owns lane mechanics. Never `git stash`.
- **Denied means stop.**
  - A DENIED command means stop and report. Never retry it another way.
  - Never pattern-kill processes. Nothing may be left running when you finish: stop every `kitty-stub` or dev server you start.
- **No absolute paths and no usernames** in any committed file (use `<repo>`); run `pnpm hygiene` before committing.
- **Charter boundaries.**
  - No I/O under `packages/*` (fetch, XHR, EventSource, WebSocket, Tauri APIs, storage, `location`, bare `window`). I/O lives only in `apps/*` and `crates/*`.
  - No mission-ui screen, element, story or generated file changes (C-002, SC-005). `git diff --exit-code <base> -- packages/mission-ui` must stay empty.
- **Exact pins.** Every new npm or Cargo dependency is pinned exactly: `x.y.z` in `package.json`, `=x.y.z` in `Cargo.toml` (NFR-003).
- **Supply-chain evidence.** Every new dependency gets the DIRECTIVE_051 evidence in the hand-off (see `research.md`, "Supply-chain controls").
- **Orchestrator-owned files.** Files under `kitty-specs/` belong to the orchestrator. Report decisions and friction in the hand-off and write nothing there.
- **No mission-state mutation.** Do not run `spec-kitty` commands that change mission state; the orchestrator moves tasks.

## Hand-off checklist (the report you write when you move to review)

1. **Commits:** each hash, verified with `git cat-file -t <hash>` (report the output), in the order made, with its one-line subject.
2. **Gates:** for every gate above, the command, its exit code and the reporter's pass count. A gate you did not run is listed, with the reason.
3. **Red-first evidence:** the failing line for every red-first test or plant, and the revert check per test file.
4. **Edits outside the owned files:** each out-of-map edit with a one-line rationale, and each change request.
5. **Supply chain:** evidence for any dependency added (S-1 to S-5).
6. **Measurements** this prompt asks for (timings, counts).
