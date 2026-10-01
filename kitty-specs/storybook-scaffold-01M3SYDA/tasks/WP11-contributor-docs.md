---
work_package_id: WP11
title: Contributor documentation (README)
dependencies:
- WP10
requirement_refs:
- FR-016
- NFR-001
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T048
- T049
- T050
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: curator-carla
authoritative_surface: README.md
create_intent: []
execution_mode: code_change
owned_files:
- README.md
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP11 - Contributor documentation (README)

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load curator-carla` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Write the README (FR-016): setup, the credential, the workbench, each gate, adding an element, refreshing baselines, verifying gates are not vacuous.

## Context

Read `quickstart.md` (updated by WP10), `contracts/ci-gates.md`, `contracts/sample-element.md`, `spec.md` FR-016, NFR-001, NFR-004. The repository already has a `README.md` that is a stub: edit it in place, do not create another file.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP11 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T048 Setup and credential
Prerequisites (Node 22.22.2 via `.nvmrc`, pnpm 11.18.0 installed directly, no corepack); the `~/.npmrc` `//npm.pkg.github.com/:_authToken=<token>` line with `read:packages` and SSO authorisation; that pnpm ignores `NODE_AUTH_TOKEN` for this scope; the two-command run (`pnpm install`, `pnpm storybook`); what the named preflight failure looks like; `pnpm preflight`. Use placeholders only, never a real token or a home path.

### T049 Gates reference
A table of every gate id with its root script, what it checks, the requirement it serves, and its planted violation; the `Gate: all` aggregate and which checks are required; how visual baselines work (`pnpm visual`, `pnpm visual:update`, pinned container, review the PNG diff in the PR); the offline frozen-install note for `pnpm gate-proof`. Derive the gate list from `.github/workflows/ci.yml` job ids, do not hard-code a count that can drift.

### T050 Adding an element and verifying
The 'Add an element' steps (contract rules, story per state, test per event, changelog line, `pnpm manifest:generate`, baselines); how to run `pnpm gate-proof` and read its record; the NFR-001 timed clean-clone check the accepting reviewer records in the PR description.

## Definition of Done (objective, command-verifiable)

- [ ] `wc -l README.md` >= 60 and every heading named in T048-T050 exists (`grep -n '^## ' README.md`).
- [ ] `pnpm hygiene` exits 0 (no token, no absolute user path in the README).
- [ ] Every `pnpm <script>` named in the README exists: `for s in $(grep -o 'pnpm [a-z:-]*' README.md | awk '{print $2}' | sort -u); do node -e "process.exit(require('./package.json').scripts['$s']?0:1)" || echo MISSING $s; done` prints nothing for real scripts (install/storybook-style built-ins excluded by name and listed).
- [ ] The README's gate list equals the job ids in `ci.yml` (one-liner diff recorded).
- [ ] A fresh reader test: following only the README's two commands from a clean clone with a credential reaches the workbench (record time; this is also the NFR-001 measurement, stopwatch from `git clone`).

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Drift between docs and scripts; accidentally documenting a token-shaped example; hard-coded gate counts.

## Reviewer Guidance

Execute the README commands verbatim in a scratch clone; grep for paths and tokens. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP11 --agent claude` (depends on WP10; the lane base is computed from lanes.json)
