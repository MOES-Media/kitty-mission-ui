---
work_package_id: WP02
title: Credential preflight command, plants and harness tests
dependencies:
- WP01
requirement_refs:
- FR-013
- NFR-001
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T006
- T007
- T008
- T009
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: node-norris
authoritative_surface: scripts/
create_intent:
- scripts/preflight.mjs
- scripts/preflight.test.mjs
- gates/plants/preflight/plant.json
execution_mode: code_change
owned_files:
- scripts/preflight.mjs
- scripts/preflight.test.mjs
- gates/plants/preflight/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP02 - Credential preflight command, plants and harness tests

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load node-norris` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Deliver the `preflight` gate: the online/CI credential check, its two plants, and harness tests proving the offline-skip rules and the named failure messages.

## Context

Read `research.md` R7 and `contracts/ci-gates.md` (preflight row, token handling), `spec.md` FR-013, US1 scenario 3, US2 scenario 3. `.pnpmfile.cjs` and `scripts/preflight-core.cjs` already exist from WP01 and are NOT edited here (import `shouldSkip` and the core check).

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP02 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T006 scripts/preflight.mjs
Node ESM, zero dependencies (it runs before install in CI). Flags: none (local: offline core check, then online check), `--ci` (token from env `NPM_TOKEN`; empty => fail naming the repository secret `NPM_TOKEN`). Online check: `GET https://npm.pkg.github.com/@spec-kitty%2felements` with the token; 401 => `token rejected or expired`; 403/404 => `token cannot read @spec-kitty/elements: needs read:packages and org access (SSO authorised)`. Never print the token. Emit the marker `PLANT-PREFLIGHT-MISSING` only in the missing-credential message so the plant can match it, and make sure the marker is absent from a successful run.

### T007 Plants (two)
`gates/plants/preflight/plant.json` is an ARRAY of two plants (data-model, Plant): (1) empty HOME, no env: expects `PLANT-PREFLIGHT-MISSING` and the named message; (2) a temp user npmrc holding a generated non-token placeholder (assemble at run time, never a token-shaped literal in a committed file): expects `token rejected or expired`. Each has `expectFailPattern`, `command`, and a `generated` overlay description per data-model. If the online plant needs network, document that it runs in the preflight proof leg only.

### T008 Offline-skip and hook harness tests (verifier N2)
`scripts/preflight.test.mjs` using `node:test`. Cases: `shouldSkip` returns true ONLY for argv containing both `--offline` and `--frozen-lockfile`; explicit tests for `--prefer-offline --frozen-lockfile` (false), `--offline` only (false), `--frozen-lockfile` only (false), neither (false). Integration tests in a scratch copy of the repo root files (copy `.pnpmfile.cjs`, `scripts/preflight-core.cjs`, `.npmrc`, a minimal workspace) with empty HOME: (a) `pnpm install --offline --frozen-lockfile` is NOT blocked by the credential check; (b) online form `pnpm install --frozen-lockfile` exits 9 with the named message; (c) the hook still fires (guards against a future pnpm that stops loading `.pnpmfile.cjs` early).

### T009 Wire and document
Ensure `pnpm preflight` and `pnpm test:preflight` (already declared by WP01) run these files. Add a short comment block at the top of `scripts/preflight.mjs` describing exit codes and messages (no README edit; WP11 owns it).

## Definition of Done (objective, command-verifiable)

- [ ] `HOME=$(mktemp -d) node scripts/preflight.mjs` exits non-zero and prints `PLANT-PREFLIGHT-MISSING` plus the R7 message naming `~/.npmrc`.
- [ ] `NPM_TOKEN= node scripts/preflight.mjs --ci` exits non-zero and the message names the repository secret `NPM_TOKEN`.
- [ ] `pnpm test:preflight` exits 0 and its output lists one passing test for each of the four `shouldSkip` cases and the three integration cases.
- [ ] Mutation check recorded in the hand-off: change `shouldSkip` to accept `--prefer-offline`, rerun `pnpm test:preflight`, see it fail, restore; `git status --short` is clean afterwards.
- [ ] `jq 'length' gates/plants/preflight/plant.json` prints 2; `grep -rn "_auth""Token=[A-Za-z0-9_]\{20,\}" gates scripts` prints nothing.
- [ ] With a valid credential `pnpm preflight` exits 0 and the token never appears in its output (`pnpm preflight 2>&1 | grep -c "$(sed -n 's/.*_auth[T]oken=//p' ~/.npmrc)"` prints 0; do not echo the value).

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

The online check depends on network and a real token; keep the offline portion testable without either. Do not commit any token-shaped literal. Cross-platform `mktemp` differences are acceptable; Linux only.

## Reviewer Guidance

Run the mutation check yourself and the two empty-credential commands; grep the plant JSON for anything token-shaped. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP02 --agent claude` (depends on WP01; the lane base is computed from lanes.json)
