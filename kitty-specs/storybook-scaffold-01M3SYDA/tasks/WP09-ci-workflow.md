---
work_package_id: WP09
title: GitHub Actions workflow with one named job per gate
dependencies:
- WP02
- WP05
- WP06
- WP07
- WP08
requirement_refs:
- C-002
- C-003
- FR-014
- NFR-002
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T038
- T039
- T040
- T041
- T042
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: .github/workflows/
create_intent:
- .github/workflows/ci.yml
execution_mode: code_change
owned_files:
- .github/workflows/ci.yml
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP09 - GitHub Actions workflow with one named job per gate

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Write `.github/workflows/ci.yml` exactly per `contracts/ci-gates.md`: preflight first, one named job per gate, the proof matrix and final `Gate: proof`, and the aggregate `Gate: all`.

## Context

Read `contracts/ci-gates.md` (whole, authoritative), `research.md` R7 (CI preflight), R8 (proof legs), R9 (workflow shape, token lifecycle, budget), `spec.md` FR-014, C-002, C-003, NFR-002. All gate commands exist now (WP02, 05, 06, 07, 08). `scripts/gate-proof.mjs` is delivered by WP10; this workflow calls it through the interface fixed in T040 and therefore cannot run the proof jobs green until WP10 merges.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP09 --agent claude` resolves. Do not create branches or switch branches by hand.
- Do NOT push.

## Guidance for this WP

Do not spawn sub-agents or forks; do this WP yourself.

Standing rules:

- Do not spawn sub-agents or forks; do this WP yourself.
- If any command is denied, STOP and report; never retry another way.
- No absolute home paths, usernames or tokens in any committed file or in any file you write (use `<repo>`/`<home>` placeholders).
- Every `package.json` dependency spec is exact (no `^`, `~`, ranges); the pins are in `research.md` R4.
- Gates evaluate full packages, never changed-files; a new file must be seen (list files with `git ls-files --cached --others --exclude-standard`).
- Stay inside `owned_files`; a small out-of-map edit is allowed only with a one-line rationale in your hand-off note.
- Plants live under `gates/plants/<gate>/` as non-source extensions (`*.ts.plant`, `*.css.plant`, `*.json.plant`) and are shipped in the same WP as their gate.

## Subtasks

### T038 Skeleton, triggers, permissions
Triggers `pull_request` (branches: main) and `push` (branches: main) only. `permissions: contents: read` at workflow and job level. Runner `ubuntu-24.04`. Every action pinned to a full commit SHA (resolve SHAs with `gh api`/`git ls-remote` and record the tag in a trailing comment). Every checkout `persist-credentials: false`. `pnpm/action-setup` (pnpm 11.18.0) and `actions/setup-node` 22.22.2; no corepack. Cache holds the pnpm store only, restored before the credential step. Artifacts `retention-days: 1`. Per-job `timeout-minutes` exactly as the contract table. No `continue-on-error`, no `VITE_*`/`STORYBOOK_*` secret.

### T039 Gate jobs
Job ids (these ids ARE the gate ids, verifier N3): `preflight`, `typecheck`, `eslint`, `stylelint`, `no-io`, `manifest`, `hygiene`, `storybook-build`, `unit-tests`, `visual`, each with display name `Gate: <id>`, `needs: preflight` (visual also `storybook-build`), command per the table. `unit-tests` and `visual` run in the digest-pinned Playwright container plus `setup-node` 22.22.2 and assert `node -v` is `v22.22.2`. `storybook-build` uploads `storybook-static`; `visual` downloads it. Token lifecycle in every job that installs: step-level `env`, `::add-mask::`, `umask 077` write of `//npm.pkg.github.com/:_authToken=` to `$HOME/.npmrc`, `chmod 600`, used only by `pnpm install --frozen-lockfile`, `rm -f "$HOME/.npmrc"` right after and again in an `if: always()` step; gate steps run without it. `preflight` has no install: `node scripts/preflight.mjs --ci` with step-level `NPM_TOKEN`.

### T040 Proof matrix, `Gate: proof`, `Gate: all`
Matrix job id `proof-leg`, `matrix.gate` = every plant directory name (10 legs today; counts are never hard-coded anywhere). Verifier N4 decision, stated here and in a workflow comment: ONE matrix with `container: ${{ matrix.image }}` where `image` is the digest-pinned Playwright image for the `unit-tests` and `visual` legs and an EMPTY string for runner legs via `matrix.include`; the WP verifies with a dry parse that an empty `container` runs on the host. Fallback if GitHub rejects the empty value: split into two matrices (`proof-leg-runner`, `proof-leg-container`) with identical step lists, and record the change in `contracts/ci-gates.md` via the orchestrator. Leg steps: checkout; auth and frozen install unless gate is `preflight` (R8 lifecycle); `node scripts/gate-proof.mjs leg --gate ${{ matrix.gate }}` (this single command does clean run, plant, planted run and writes the fragment); upload fragment. Leg timeouts per contract (6 typical; preflight 4; storybook-build 8; unit-tests 8; visual 9). Job `proof` (`Gate: proof`, `needs: proof-leg`) WITH a frozen install (F1: `assemble` needs the exact-pinned JSON-schema validator and `scripts/check-hygiene.mjs` dependencies): same auth -> `pnpm install --frozen-lockfile` -> `rm -f "$HOME/.npmrc"` (+ `if: always()` delete) lifecycle as every installing job, timeout 3 (visual proof leg timeout 9): `node scripts/gate-proof.mjs coverage` then `assemble`, upload record and `PROOF.md`. Job `all` (`Gate: all`): `needs` every other job, `if: always()`, fails unless every `needs.*.result == 'success'`.

### T041 Interface contract with WP10 and README pointer
Document at the top of `ci.yml` (comment) the exact CLI WP10 must provide: `gate-proof.mjs leg --gate <id> [--out <dir>]`, `gate-proof.mjs coverage`, `gate-proof.mjs assemble`, exit codes 0/1. Do not create the script.

### T042 Validate without a CI run (scope statement, F5/F6)
This WP verifies the workflow by PARSING and by coverage derivation only. The proof jobs (`proof-leg`, `proof`) call `scripts/gate-proof.mjs`, which WP10 delivers, so they are NOT run here; their end-to-end proof is WP10's acceptance. NFR-002 (under 15 minutes), FR-014 and SC-003 (separately named results per PR) are proven by the real PR CI run, which the orchestrator opens and babysits after all WPs merge; note this in your hand-off. Original description:
Run `actionlint` if available (else `pnpm dlx`-free alternative: a YAML parse with the repo's pinned `yaml` dependency plus a script-less check); run `pnpm hygiene` and confirm the 'ci.yml missing' finding from WP07 is gone and no workflow rule fires; derive job ids, matrix list and `gates/plants/*` by a one-liner and show they match. Do not push and do not open a PR; the orchestrator opens the PR, and a green branch run is confirmed by the orchestrator's CI babysit (record any fix requests in the hand-off).

## Definition of Done (objective, command-verifiable)

- [ ] `pnpm hygiene; echo exit=$?` prints `exit=0` on the merged lane tree: the `ci.yml missing` finding is gone and no workflow rule fires; coverage equality holds.
- [ ] Merged-tree lint (F7; this lane contains WP05-WP08): `pnpm lint && pnpm lint:styles && pnpm typecheck; echo exit=$?` prints `exit=0`.
- [ ] `node -e "console.log(Object.keys(require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8')).jobs).join(' '))"` prints exactly `preflight typecheck eslint stylelint no-io manifest hygiene storybook-build unit-tests visual proof-leg proof all` (order free).
- [ ] Coverage derivation one-liner (job ids minus `proof`, `proof-leg`, `all` equals matrix `gate:` list equals `ls gates/plants`): `diff <(ls gates/plants | sort) <(node -e "const y=require('yaml').parse(require('fs').readFileSync('.github/workflows/ci.yml','utf8'));console.log(y.jobs['proof-leg'].strategy.matrix.gate.slice().sort().join('\n'))")` prints nothing.
- [ ] `test "$(grep -c 'uses: .*@[0-9a-f]\{40\}' .github/workflows/ci.yml)" = "$(grep -c 'uses:' .github/workflows/ci.yml)" && echo pinned-ok` prints `pinned-ok`; `test "$(grep -c 'persist-credentials: false' .github/workflows/ci.yml)" = "$(grep -c 'actions/checkout' .github/workflows/ci.yml)" && echo checkout-ok` prints `checkout-ok`.
- [ ] `grep -nE 'pull_request_target|workflow_run|continue-on-error' .github/workflows/ci.yml` prints nothing; `grep -n 'secrets\.' .github/workflows/ci.yml` shows only `secrets.NPM_TOKEN` inside step-level `env`.
- [ ] Every job has `timeout-minutes` matching the contract table (proof 3, visual leg 9): `node -e` one-liner listing `job: timeout` compared to `contracts/ci-gates.md`; chain arithmetic `preflight 1 + visual leg 9 + proof 3 + all 1 = 14` and `1 + 5 + 6 + 1 = 13` both <= 15, written in the hand-off.
- [ ] The `proof` job has the credential lifecycle: `grep -n 'rm -f "\$HOME/.npmrc"' .github/workflows/ci.yml` hits at least twice per installing job, including `proof`.
- [ ] Matrix `image` decision (empty-string container vs split into two matrices) is recorded with the evidence used. Proof jobs are NOT run in this WP (see T042).

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

GitHub rejecting an empty `container:`; SHA resolution needing network; token leaking through `set -x` or step echo (no `set -x` in auth steps); dry parse cannot prove runtime behaviour, so the first real PR run is the true test.

## Reviewer Guidance

Diff the job table against `contracts/ci-gates.md`; check every `needs`; read the auth step for any path where the token is echoed, cached, uploaded or left on disk. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP09 --agent claude` (depends on WP02, WP05, WP06, WP07, WP08; the lane base is computed from lanes.json)
