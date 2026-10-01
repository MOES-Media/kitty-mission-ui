---
work_package_id: WP10
title: Gate proof harness, record, local run
dependencies:
- WP09
requirement_refs:
- FR-015
- NFR-004
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T043
- T044
- T045
- T046
- T047
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: scripts/gate-proof/
create_intent:
- scripts/gate-proof.mjs
- scripts/gate-proof/lib.mjs
- scripts/gate-proof/gate-proof.test.mjs
execution_mode: code_change
owned_files:
- scripts/gate-proof.mjs
- scripts/gate-proof/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP10 - Gate proof harness, record and local run

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Implement `scripts/gate-proof.mjs` (leg, coverage, assemble, and the local all-gates run in throwaway worktrees) and the sanitised fail-closed record.

## Context

Read `research.md` R8 (whole), `data-model.md` (Plant, GateProofRecord), `contracts/gate-proof-record.schema.json`, `contracts/ci-gates.md` (proof rows), `spec.md` FR-015, SC-002, NFR-004. The workflow (WP09) already calls this script with the interface in its header comment. All plants exist (WP02-08).

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP10 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T043 Plant loading and the `leg` subcommand
`leg --gate <id>`: load `gates/plants/<id>/plant.json` (object or array); run the gate's clean command, assert exit 0 AND that the unique token is absent from the output; apply overlays (copy `*.plant` sources to targets; run `generated` overlays at run time); run the planted command, assert non-zero exit AND token present; write a sanitised fragment (clean exit, planted exit, patternMatched, tokenAbsentFromCleanOutput, durationMs, excerpt) to the output dir. `preflight` runs both plants. Visual plant runs through `scripts/visual.sh`.

### Stated scope (F6)
This WP owns the end-to-end proof run; WP09 only parsed the workflow. The `assemble` step runs in a job with a frozen install (F1), so it may import the pinned schema validator and `scripts/check-hygiene.mjs` dependencies.

### T044 Sanitiser and `assemble`
Sanitiser order: cwd, `$HOME`, `/__w`, `/github/workspace`, `/github/home`, repo root become `<repo>`/`<home>`; any `_authToken=` value becomes `_authToken=<redacted>`. `assemble`: merge fragments into `proof-record.json` and `PROOF.md` (`schemaVersion: 2`, commit sha, `snapshotOf`, image, generatedAt, verdict), validate against the JSON schema (exact-pinned validator from WP01), run the hygiene scanner over both candidate files (`node scripts/check-hygiene.mjs --record <path>`) and FAIL CLOSED on any match or unreadable input.

### T045 `coverage` subcommand (verifier N3)
Derive gate ids from workflow JOB IDS (and `matrix.gate` for the legs), never from display names; assert `{gate job ids} minus {proof, all}` (the pinned exclusion set) equals the matrix `gate:` list equals `gates/plants/*` dirs equals the fragment set when fragments exist; ids pairwise distinct. Exit 1 with a readable diff otherwise.

### T046 Local `pnpm gate-proof` (verifier N1)
Run coverage, then per gate: `git worktree add` a throwaway worktree of `HEAD`, run `pnpm install --offline --frozen-lockfile` INSIDE each worktree (do NOT symlink `node_modules`; the offline+frozen argv satisfies preflight-core's skip rule so no credential is needed), apply the plant, run the planted command, restore, assert `git status --porcelain` is empty in the worktree (`localWorktreeCleanAfterRestore`), remove the worktree in a `finally`. Never mutate the main checkout. Document the requirement that the pnpm store is warm (a prior online install) in the error text when the offline install fails.

### T047 Quickstart consistency and tests
`quickstart.md` was already updated by the tasks phase for N1 (offline frozen install per worktree; finalize-tasks forbids WP ownership of `kitty-specs/`). Verify the harness behaves exactly as the quickstart now says; if the behaviour must differ, record a one-line out-of-map edit of `quickstart.md` with rationale. `gate-proof.test.mjs` (`node:test`): sanitiser cases (a home path, `/__w`, and a token assignment with a non-placeholder value, each assembled at runtime), fail-closed on a planted home path in a fragment, coverage mismatch cases (missing plant dir, extra matrix id, display-name rename must NOT change the result).

## Definition of Done (objective, command-verifiable)

- [ ] `node --test scripts/gate-proof/ 2>&1 | grep -E '^# (pass|fail)'` shows `# fail 0`; the display-name-rename case passes (result unchanged) and the job-id-mismatch case fails coverage as intended.
- [ ] End-to-end: `pnpm gate-proof; echo exit=$?` prints `exit=0` locally (container runtime available, warm pnpm store), and `node -e "const r=require('./proof-record.json');process.exit(r.verdict==='pass'&&r.gates.every(g=>g.cleanExit===0&&g.plantedExit!==0&&g.patternMatched&&g.tokenAbsentFromCleanOutput&&g.localWorktreeCleanAfterRestore)?0:1)"` exits 0 (record path as written by the script; state it).
- [ ] Schema validation: `node -e "const Ajv=require('ajv');const fs=require('fs');const v=new Ajv({allErrors:true}).compile(JSON.parse(fs.readFileSync('kitty-specs/storybook-scaffold-01M3SYDA/contracts/gate-proof-record.schema.json','utf8')));process.exit(v(JSON.parse(fs.readFileSync('<record-path>','utf8')))?0:1)"` exits 0 (use the record path the script writes; add `ajv-formats` only if WP01 pinned it).
- [ ] `grep -n 'install --offline --frozen-lockfile' scripts/gate-proof/lib.mjs` hits and `grep -niE 'symlink' scripts/gate-proof.mjs scripts/gate-proof/lib.mjs` prints nothing.
- [ ] `git worktree list | wc -l` prints 1 after the run, and again after an induced failure (`kill -INT` the script mid-run, then check).
- [ ] Record hygiene: `node scripts/check-hygiene.mjs --record <record-path>; echo exit=$?` prints `exit=0`; after `sed -i "s#<repo>#/$(printf %s home)/someone/x#" <record-path>` it exits non-zero (use a copy).
- [ ] `grep -n 'symlink' kitty-specs/storybook-scaffold-01M3SYDA/quickstart.md` prints nothing and `grep -n 'offline' kitty-specs/storybook-scaffold-01M3SYDA/quickstart.md` hits (quickstart already updated by the tasks phase).
- [ ] CI legs are exercised by the real PR run (orchestrator); this WP's local run covers every plant via `scripts/gate-proof.mjs leg --gate <id>` for each of `ls gates/plants`: `for g in $(ls gates/plants); do node scripts/gate-proof.mjs leg --gate $g --out "$(mktemp -d)" || echo FAIL $g; done` prints no `FAIL`.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Run time versus NFR-002 (record durations; note the R9 fallback if visual/storybook legs exceed budget); plants leaking into real gates; sanitiser missing a path form; offline install failing on a cold store.

## Reviewer Guidance

Run `pnpm gate-proof` yourself; confirm the record validates; try to leak a path through an excerpt; diff the quickstart change. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP10 --agent claude` (depends on WP09; the lane base is computed from lanes.json)
