---
work_package_id: WP09
title: Documentation, proof-leg timings and wrap-up evidence
dependencies:
- WP06
- WP07
- WP08
requirement_refs:
- C-002
- C-004
- C-005
- NFR-001
- NFR-002
- NFR-005
- SC-002
- SC-004
- SC-005
planning_base_branch: feat/phase0-bootstrap-17
merge_target_branch: feat/phase0-bootstrap-17
branch_strategy: Planning artifacts for this mission were generated on feat/phase0-bootstrap-17. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/phase0-bootstrap-17 unless the human explicitly redirects the landing branch.
subtasks:
- T049
- T050
- T051
- T052
- T053
history: []
agent_profile: node-norris
authoritative_surface: README.md
create_intent:
- packages/mission-shell/README.md
execution_mode: code_change
model: ''
owned_files:
- README.md
- CHANGELOG.md
- packages/mission-shell/README.md
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP09 - Documentation, proof-leg timings and wrap-up evidence (IC-09)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

Do not spawn sub-agents or forks; do this work package yourself.

---

## Objective

Finish the mission:
- **Documentation:** document the workspace for the people building #18 to #21 (prerequisites, the shell, the stub, the fixtures, the drift alert).
- **Timeouts:** measure every proof leg this mission changed and set the matrix timeouts by the agreed formula (NFR-002, F-42).
- **Final checks:** run the full gate set and the gate-proof coverage, prove mission-ui is byte-unchanged (SC-005), and consolidate the evidence the PR needs. The supply-chain evidence, the exceptions and the F-29 follow-up go to the orchestrator.

## Context

Read:
- `plan.md`: IC-09, Gates ("Proof-leg timeouts");
- spec NFR-002;
- `quickstart.md`;
- `reviews/plan.squad.md`: "Carried to tasks", F-14, F-18, F-29, F-39, F-42, R2-04;
- every earlier WP's hand-off (timings, supply-chain evidence, exceptions, change requests).

`ci.yml` belongs to WP01. This WP makes one recorded out-of-map edit to it: the measured proof-leg timeouts. Every earlier WP must be approved before this one starts. Its lane is based on the merged tips of all of them.

## Branch Strategy

Planning branch and final merge target: `feat/phase0-bootstrap-17`. Execution happens in the lane worktree the tool allocates (see `lanes.json`). Depends on: WP06, WP07, WP08. Start from the tip the orchestrator prepares. Do not create, switch or reset branches yourself.

Implementation command (orchestrator-run): `spec-kitty agent action implement WP09 --agent claude --mission phase0-bootstrap-01M4V5KK`.

## Subtasks

### T049 Proof-leg timings and timeouts (F-42, NFR-002)

1. Work packages never push, so measure locally with `node scripts/gate-proof.mjs local` per affected gate, labelled **local proxy** (spec NFR-002 verification, A3). Record for each affected proof leg (rust, typecheck, eslint, stylelint, no-io, data-driven, unit-tests, manifest, contract, hygiene; C3):
   - the clean gate time;
   - the total number of plants in the leg, existing and new (A24);
   - the measured leg time.
2. Set each matrix `timeout` to (1 + total plants in the leg) × the measured local gate minutes + 2, rounded up, as the starting value. Never lower an existing value below its pre-mission value.
3. Check locally that every **gate** job (not proof leg) touched by this mission runs in ≤ 8 minutes (NFR-002 proxy). A gate over 8 locally is a BLOCKED report, not a timeout raise. The binding CI-runner check, and the final proof-leg timeouts from measured CI times, are orchestrator items at the PR stage (T052 hand-off list).
4. Recorded out-of-map edit to `ci.yml` (timeouts only). `gate-proof coverage` and hygiene must still pass.

### T050 Documentation

1. **Root `README.md`**, a new "Host workspace" section:
   - prerequisites: Node 22.22.2, pnpm 11.18.0, and rustup, which installs the toolchain pinned in `rust-toolchain.toml` on first use. State the pinned version (F-18);
   - the layout: `packages/mission-shell`, `crates/kitty-core`, `crates/kitty-stub`, and the `apps/*` placeholders;
   - how to run the stub, from `quickstart.md`, with the Host rule and the selection headers;
   - the shared `contracts/fixtures/` files and which ones are generated;
   - the drift alert: what it checks, its exit codes, and that GitHub disables scheduled workflows in public repositories after 60 days without activity, so the operator should re-enable it if the repository goes quiet (F-39);
   - the Rust gate and its plants.
2. **`packages/mission-shell/README.md`**:
   - the port (`MissionStatusClient`, the connection states, the cursor rule);
   - the fixture adapter and its options;
   - the binding rules: register first, the intent-binding path WP04 chose, and the generated typings.
3. **`CHANGELOG.md`**: one entry for #17, covering the shell package, the Rust workspace and gate, the stub, the shared fixtures, the hygiene extensions and the drift workflow.
4. No local paths and no banned terminology. `pnpm hygiene` and `pnpm test:terminology` must be green.

### T051 Full gate run, coverage and the SC-005 probe

1. Run every gate on the lane tip, plus the canonical Rust gate with its install steps.
2. Run `node scripts/gate-proof.mjs coverage` and the full `node scripts/gate-proof.mjs local`. Record every leg, and count the new plants: **18** (rust 3, typecheck 3, eslint 1, stylelint 1, no-io 1, data-driven 1, unit-tests 3, manifest 1, contract 2, hygiene 2). The count is asserted against the plant files, with equality.
3. Run `git diff --exit-code "$(git merge-base HEAD main)" -- packages/mission-ui` (the merge-base with `main`, B22), and record the empty diff (SC-005, C-002).
4. Run `pnpm hygiene` and record that `cargo-pins` passes over WP07's manifests: WP07 and WP08 ran in parallel lanes, so this is the first combined run (A18).
5. **NFR-001 step audit (A12):** for every job in `ci.yml` `all.needs` (each gate job, `proof-leg`, `proof`), list every step with its network use: none, dependency install from a lockfile (pnpm install, `rustup toolchain install`, `cargo fetch --locked`), or other. Any "other" step, or a gate step (`id: gate`) with network use, is a finding. Record the table in the hand-off.
6. **C-005 evidence (A28):** record that `scripts/preflight.mjs` and `.github/actions/install` are unchanged by the mission (`git diff --exit-code <base> -- scripts/preflight.mjs .github/actions/install`), so no fork-PR workaround was added.

### T052 Evidence consolidation for the PR (orchestrator input)

Write into the hand-off, not into `kitty-specs/`:
- a supply-chain table across WP02 and WP07 (S-1 to S-5 per dependency, transitive publish dates, the `cargo audit` result);
- the exceptions recorded, each with **scope, rationale, sunset criteria and an explicit operator-approval request**, as the charter's "Amendments and exceptions" requires (A15). The generated-typings lint ignore: scope = the exact path `packages/mission-shell/src/generated/elements.d.ts` (one file; the fallback `intents.ts`, if generated, is lint-clean and has no exception, B5); rationale = generated output, guarded by the staleness check; sunset = when the generator emits lint-clean output or the lint rule gains a generated-file allowance; approval = requested in the PR description;
- every out-of-map edit made in the mission, collected from the hand-offs;
- the decisions taken in WP04 T021 (the intent-binding path);
- **orchestrator items at the PR stage** (A3, A11): (a) verify every gate job ≤ 8 minutes and set the final proof-leg timeouts from the PR's first CI run (NFR-002); (b) confirm `Gate: visual` is green on that run, because no WP runs `pnpm visual` (NFR-005, SC-005);
- **SC-004 (A14)**: deferred to the #18 and #19 plan reviews. List the checklist they will apply: zero changes to `MissionStatusClient`, `Result`, `Refusal`, `ConnectionState`, `Change`, `SubscriptionScope`, `CLIENT_OPERATIONS` and `CONNECTION_STATES` (C14); zero changes to the workspace members and gate wiring; zero changes to `contracts/fixtures/*` shapes. Record it as "deferred, not failed";
- **the F-29 follow-up**: already filed by the orchestrator as #28 (pnpm `minimumReleaseAge` with an `@spec-kitty` exclusion). Link it from the hand-off as "Follow-up: #28"; do not file anything.

### T053 Scope and acceptance check

Walk spec FR-001 to FR-012, NFR-001 to NFR-005, C-001 to C-006 and SC-001 to SC-005. For each, name the test, plant or document that shows it, by file and test name, in a table in the hand-off. Anything not shown is a finding, not a pass.

## Test strategy

No new tests; this WP runs and measures. `gate-proof local` (full) runs here.

## Definition of Done

- **Timeouts:** every affected proof leg is measured, and its timeout set by the formula. Every gate job is ≤ 8 minutes, or reported BLOCKED.
- **Docs:** the README "Host workspace" section, the mission-shell README and the CHANGELOG entry are written; hygiene and terminology are green.
- **Gates:** every gate and full gate-proof are green; 18 new plants are counted with equality; coverage passes.
- **SC-005:** the `packages/mission-ui` diff is empty, recorded.
- **Evidence:** the hand-off has the evidence tables (supply chain, exceptions with sunset criteria and approval request, out-of-map edits, decisions), the NFR-001 step audit, the C-005 no-workaround evidence, the SC-004 deferral checklist, the orchestrator PR-stage items (CI timings, visual) and the requirement-to-proof table. The F-29 follow-up (#28) is linked.

## Risks

- **No CI run:** WPs never push. Use `gate-proof local` timings, labelled as local; the CI check is the orchestrator's at the PR stage (A3).
- **Gate over budget:** a gate over 8 minutes is BLOCKED; do not raise its timeout.

## Reviewer guidance

- **Requirement-to-proof table:** check each row points to a real test or plant. SC-002's six named proofs map to: rust format / clippy / failing-test plants (WP01), the typecheck "Svelte type error" plant (WP02), the typecheck "non-existent element property" plant as the declaration-typings proof (WP04, B21) and the no-io `.svelte` plant (WP02).
- **Timeouts:** re-derive two of them from the recorded measurements.
- **Out-of-map edit:** the `ci.yml` change must be timeouts only.

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

- `pnpm visual` and `node scripts/gate-proof.mjs local` are run only where this prompt's "Test strategy" says so.
- **Gate-proof clean-output rule (C5):** `scripts/gate-proof/lib.mjs` fails a leg when any plant's `expectFailPattern` appears in the **clean** run's output, and it matches a plant with one `output.includes` substring (C4). So every plant token must be a single substring that is printed only when that plant's violation fires: never a string the clean run prints (for example the name of an existing test, or an identifier clean tests print), and never a file name a parse error would also print. A planted test's own name is fine, because it only exists in the planted run (D8).
- **Plant payload convention (D3):** a `source` overlay's payload lives at `gates/plants/<gate>/<Name>.<ext>.plant` (for example `PlantDataDriven.svelte.plant`), never with a lintable extension: `checkPlantFiles` in `scripts/hygiene/rules.mjs` rejects those. `source` names that `.plant` file; `target` names the real path it is copied to.
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
