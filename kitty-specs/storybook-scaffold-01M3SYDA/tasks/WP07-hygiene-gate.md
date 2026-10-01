---
work_package_id: WP07
title: 'Hygiene gate: credentials, paths, pins, workflow rules'
dependencies:
- WP04
requirement_refs:
- NFR-004
- NFR-005
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T028
- T029
- T030
- T031
- T032
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: scripts/hygiene/
create_intent:
- scripts/check-hygiene.mjs
- scripts/hygiene/rules.mjs
- scripts/hygiene/hygiene.test.mjs
- gates/plants/hygiene/plant.json
execution_mode: code_change
owned_files:
- scripts/check-hygiene.mjs
- scripts/hygiene/**
- gates/plants/hygiene/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP07 - Hygiene gate: credentials, paths, pins, workflow rules

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Implement `scripts/check-hygiene.mjs`: the repository-wide scan for credentials, absolute user paths, unpinned versions, lockfile integrity, workflow rules, PNG chunk allow-list and plant coverage, with its plant.

## Context

Read `research.md` R4 (exact versions, lockfile, gate-count derivation, plant overlays), R6 (hygiene scope), R8 (sanitiser, hygiene re-scan), R9 (workflow rules), `contracts/ci-gates.md`, `spec.md` NFR-004, NFR-005, SC-004, plan hard requirements 2, 5, 6. The `hygiene` and `build-storybook` scripts exist (WP01) and call `node scripts/check-hygiene.mjs` (with `--storybook-static` for the built output).

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP07 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T028 File scan core
List files with `git ls-files --cached --others --exclude-standard` (untracked files seen). Reject: absolute user paths (`/home/<name>`, `/Users/<name>`, `C:\\Users`), token shapes with bodies (`ghp_`, `gho_`, `github_pat_`, `npm_`, `_authToken=` followed by a non-placeholder value), everywhere including `kitty-specs/` and `.kittify/`. Allow-list exactly two entries, both CLI-written record paths (hard requirement 5): (1) by file AND end-anchored line pattern, the `source_path` line in `.kittify/charter/charter.yaml` (use the hit WP01 documented); (2) by file AND key, the `"feedback_path": "/home/<user>/…/kitty-specs/<mission>/tasks/<WP…>/review-…md"` value in `kitty-specs/<mission>/status.json` and `status.events.jsonl` only, stripping just that value so any other path or token on the same line is still flagged. Non-placeholder test: an angle-bracket value like `<redacted>` passes, anything else fails. Also re-run (WP01 T005) guarantees: zero other hits in `kitty-specs/` and `.kittify/` (fix or narrowly allow-list any new hit and cite it).

### T029 Pin, lockfile and config rules
Every `package.json` dependency spec exact (reject `^ ~ > < * x latest`, allow `workspace:*`); all `vitest`/`@vitest/*` equal; `@playwright/test` version equals the image tag in `scripts/visual.sh` and `ci.yml` when present; `.npmrc` byte-equal to the one-line scope mapping; `pnpm-lock.yaml` has `integrity:` for each `@spec-kitty/*` rc package; workspace packages each declare a `typecheck` script; no gate script uses `--changed`/`git diff`/lint-staged.

### T030 Workflow and coverage rules (verifier N3)
Parse `.github/workflows/ci.yml`: triggers only `pull_request` into main and `push` to main (`pull_request_target`, `workflow_run` forbidden); `permissions: contents: read` at workflow and job level; every `actions/checkout` has `persist-credentials: false`; actions pinned to 40-hex SHAs; no `continue-on-error`; artifacts `retention-days: 1`; no `VITE_*`/`STORYBOOK_*` secret; container image references digest-pinned. Gate-id derivation (N3): derive gate ids from WORKFLOW JOB IDS (and `matrix.gate` values for the proof legs), NOT from display names; assert `{gate job ids} minus {proof, all}` equals the proof matrix `gate:` list equals `gates/plants/*` directory names; the exclusion set is pinned to exactly `{proof, all}`; ids pairwise distinct. Until WP09 creates `ci.yml`, the script reports exactly one finding: 'ci.yml missing' (do NOT add a flag that suppresses it); the rule logic is unit-tested against fixture workflows embedded in `scripts/hygiene/hygiene.test.mjs`.

### T031 PNG, storybook-static and record scans
`--storybook-static` scans the built output directory for tokens and absolute paths. PNG baselines under `apps/storybook/tests/visual/__snapshots__/`: only `IHDR`, `IDAT`, `IEND` (plus `PLTE`/`tRNS`) chunks (no `tEXt`, `iTXt`, `eXIf`, etc.); baselines 1:1 with story ids when a stories index is given (no orphans, none missing); a directory with zero baselines is a finding only when stories exist. Also scan the gate-proof record and `PROOF.md` when present (`--record <path>`; WP10 calls it). Fail closed on unreadable input. No file under `gates/plants/` has a lintable/compilable extension.

### T032 plant layout (binding)
The hygiene plant is `generated`: literal generator `node -e "require('fs').writeFileSync('plant-hygiene.txt','tok='+'ghp_'+'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8')"` (an UNTRACKED new file at the repo root; the token is assembled at run time and never appears whole in a committed file). The scanner prints the label `plant-hygiene-token` for a token-shape finding. Original description:
`gates/plants/hygiene/plant.json`: `generated` overlay that, at run time, assembles a non-placeholder token-shaped string into a NEW UNTRACKED file (never commit the literal); `command: pnpm hygiene`; `expectFailPattern` = a unique label the scanner prints for that rule (for example `plant-hygiene-token`). `scripts/hygiene/hygiene.test.mjs` (`node:test`) covers each rule with positive and negative fixtures. Add a package script only via WP01's root file: if `test:hygiene` is missing, run `node --test scripts/hygiene/` and record it.

## Definition of Done (objective, command-verifiable)

- [ ] `node --test scripts/hygiene/ 2>&1 | grep -E '^# (pass|fail)'` shows `# fail 0` and a pass count of at least 15 (one failing-input and one passing-input case per rule family).
- [ ] `pnpm hygiene; echo exit=$?` on the clean tree reports zero findings other than `ci.yml missing` (until WP09), and `node scripts/check-hygiene.mjs --list-allowed | wc -l` prints 2 (the CLI-record-path charter `source_path` line and the CLI-record-path status-file `feedback_path` key).
- [ ] Plant toggle, literal: `O=$(mktemp); node -e "require('fs').writeFileSync('plant-hygiene.txt','tok='+'ghp_'+'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8')"; if pnpm hygiene >"$O" 2>&1; then echo UNEXPECTED-PASS; fi; grep -q plant-hygiene-token "$O" && echo PLANT-CAUGHT; rm plant-hygiene.txt; pnpm hygiene 2>&1 | grep -c plant-hygiene-token` prints `PLANT-CAUGHT` then `0`.
- [ ] Untracked path check: `printf '/%s/%s/x\n' home someone > probe-path.txt; pnpm hygiene; echo exit=$?; rm probe-path.txt` exits non-zero.
- [ ] Range check: `sed -i '0,/"lit": "3.3.3"/s//"lit": "^3.3.3"/' packages/mission-ui/package.json; pnpm hygiene; echo exit=$?; git checkout -- packages/mission-ui/package.json pnpm-lock.yaml` exits non-zero (restore the lockfile too: pnpm 11 may rewrite it).
- [ ] Storybook scan wiring: after `pnpm storybook:build-only`, `node scripts/check-hygiene.mjs --storybook-static; echo exit=$?` prints `exit=0`; then `printf 'x/%s/%s/y' home someone > apps/storybook/storybook-static/probe.txt; node scripts/check-hygiene.mjs --storybook-static; echo exit=$?; rm apps/storybook/storybook-static/probe.txt` exits non-zero; `pnpm build-storybook; echo exit=$?` prints `exit=0`.
- [ ] PNG rule, literal: a copy of any valid PNG with an added `tEXt` chunk (create with `python3 -c` inline in the test suite) makes the PNG scan fail; covered by a named case in `scripts/hygiene/hygiene.test.mjs`.
- [ ] `grep -n "name:" scripts/hygiene/rules.mjs | grep -ci 'gate'` prints 0 (no gate-id derivation from display names).

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Over-broad allow-list; hygiene flagging its own rule fixtures (keep pattern fixtures in non-scanned extension or construct at run time); false positives in planning docs that mention `/home/` as prose (fix the docs narrowly, do not widen the rule).

## Reviewer Guidance

Try to smuggle a token, a path, a range and an untracked file past the script; confirm all are caught; confirm the allow-list has exactly the two CLI-record-path entries and neither hides anything beyond its CLI-written value. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP07 --agent claude` (depends on WP04; the lane base is computed from lanes.json)
