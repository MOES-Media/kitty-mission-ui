---
work_package_id: WP06
title: No-I/O and element manifest gates with plants
dependencies:
- WP04
requirement_refs:
- FR-011
- FR-012
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T023
- T024
- T025
- T026
- T027
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: gates/
create_intent:
- eslint.no-io.config.mjs
- gates/no-io.selftest.ts
- gates/vitest.config.ts
- gates/fixtures/no-io/fetch.ts.txt
- gates/plants/no-io/plant.json
- gates/plants/manifest/plant.json
- scripts/check-manifest.mjs
- packages/mission-ui/custom-elements-manifest.config.mjs
- packages/mission-ui/custom-elements.json
execution_mode: code_change
owned_files:
- eslint.no-io.config.mjs
- gates/no-io.selftest.ts
- gates/vitest.config.ts
- gates/fixtures/no-io/**
- gates/plants/no-io/**
- gates/plants/manifest/**
- scripts/check-manifest.mjs
- packages/mission-ui/custom-elements-manifest.config.mjs
- packages/mission-ui/custom-elements.json
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP06 - No-I/O and element manifest gates with plants

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Deliver the `no-io` gate (ESLint rule set plus a fixture-driven self-test) and the `manifest` gate (analyzer regeneration, byte comparison, `check-manifest.mjs`), each with its plant.

## Context

Read `research.md` R4 (no-io and manifest rows), R6 (no-I/O rule set and fixtures), `data-model.md` ElementManifest, `spec.md` FR-011, FR-012. Scripts `lint:no-io`, `test:no-io`, `manifest:generate`, `manifest:check` exist from WP01 (note `manifest:generate` lives in the mission-ui package script). Write scope is disjoint from WP05 (no edit to `eslint.config.mjs`).

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP06 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T023 eslint.no-io.config.mjs
Rules over `packages/*/src` forbidding network, desktop-bridge and browser-storage use: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `navigator.sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `window.__TAURI__`/`@tauri-apps/*` imports, `import()` of URLs, plus the evasions from R6: bare globals via `globalThis`/`window`/`self` member access, `Reflect.get`, `new Function`, `eval`, `new Image`, script-element creation. Message text for each rule is distinct and names the violation.

### T024 gates/fixtures/no-io and selftest
One fixture per rule as `gates/fixtures/no-io/<rule>.ts.txt` (non-source extension so no gate lints them). `gates/no-io.selftest.ts` is a Vitest test (run by `pnpm test:no-io` through `gates/vitest.config.ts`, node environment) that loads each fixture into ESLint's Linter with the no-io config and asserts it reports the expected rule, and that a clean sample reports nothing. The file is type-checked via the mission-ui tsconfig include.

### T025 no-io plant
`gates/plants/no-io/plant.json`: overlay inserts `fetch('/plant-no-io')` into the real element source; `command: pnpm lint:no-io && pnpm test:no-io`; `expectFailPattern: plant-no-io`.

### T026 Manifest generation and check
`custom-elements-manifest.config.mjs` (analyzer 0.11.0, Lit plugin, globs the element sources); commit generated `custom-elements.json`. `scripts/check-manifest.mjs`: regenerate to a temp file, require byte equality with committed file, then assert every event name matches `^sk-`, every screen-contract element declares `status`, and every `dispatchEvent` in element source is `new CustomEvent('<string literal>', ...)` (scan source with the TypeScript API or a strict regex; must also fail on a non-literal). Must work on untracked new element files.

### T025/T027 plant layout (binding)
Sources are new-file overlays: `gates/plants/no-io/plant-no-io.ts.plant` -> `packages/mission-ui/src/plant-no-io.ts` (contains `fetch('/plant-no-io')`); `gates/plants/manifest/plant-manifest.ts.plant` -> `packages/mission-ui/src/elements/sk-plant-manifest/sk-plant-manifest.ts` (a minimal element that dispatches the undeclared `sk-plant-manifest-x` via `new CustomEvent('sk-plant-manifest-x', ...)`). `plant.json` `command` for no-io is `pnpm lint:no-io && pnpm test:no-io`. Original description:
`gates/plants/manifest/plant.json`: overlay adds `this.dispatchEvent(new CustomEvent('sk-plant-manifest-x', {bubbles:true, composed:true}))` to the real element; `expectFailPattern: sk-plant-manifest-x`; token absent in the clean run.

## Definition of Done (objective, command-verifiable)

- [ ] `pnpm lint:no-io && pnpm test:no-io` exits 0; `pnpm test:no-io 2>&1 | grep -E 'Tests +[0-9]+ passed'` reports at least `$(ls gates/fixtures/no-io | wc -l)` + 1 tests.
- [ ] `pnpm manifest:generate && git diff --exit-code packages/mission-ui/custom-elements.json && pnpm manifest:check` exits 0 (byte-identical regeneration).
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/no-io/plant-no-io.ts.plant packages/mission-ui/src/plant-no-io.ts; if pnpm lint:no-io && pnpm test:no-io >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plant-no-io' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/plant-no-io.ts; pnpm lint:no-io && pnpm test:no-io; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm lint:no-io && pnpm test:no-io 2>&1 | grep -c 'plant-no-io'` prints 0 on the clean tree.
- [ ] Plant toggle, literal: `O=$(mktemp); mkdir -p packages/mission-ui/src/elements/sk-plant-manifest; cp gates/plants/manifest/plant-manifest.ts.plant packages/mission-ui/src/elements/sk-plant-manifest/sk-plant-manifest.ts; if pnpm manifest:check >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'sk-plant-manifest-x' "$O" && echo PLANT-CAUGHT; rm -rf packages/mission-ui/src/elements/sk-plant-manifest; pnpm manifest:check; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm manifest:check 2>&1 | grep -c 'sk-plant-manifest-x'` prints 0 on the clean tree.
- [ ] Mutation, literal: `cp packages/mission-ui/custom-elements.json "$O.bak"; sed -i '0,/"sk-mission-open"/s//"sk-mission-gone"/' packages/mission-ui/custom-elements.json; pnpm manifest:check; echo exit=$?; git checkout -- packages/mission-ui/custom-elements.json; pnpm manifest:check; echo exit=$?` prints non-zero then `exit=0`.
- [ ] Non-literal event name, literal: `printf 'export const f = (t: EventTarget, n: string) => t.dispatchEvent(new CustomEvent(n));\n' > packages/mission-ui/src/elements/sk-mission-sample/probe.ts; pnpm manifest:check; echo exit=$?; rm packages/mission-ui/src/elements/sk-mission-sample/probe.ts` prints a non-zero exit.
- [ ] `grep -rn 'plant-no-io\|sk-plant-manifest-x' packages apps scripts eslint.no-io.config.mjs` prints nothing on the clean tree.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Analyzer's bundled TypeScript rejecting element syntax (report to WP04 owner via orchestrator, do not edit the element); fixtures accidentally lintable; manifest nondeterminism (ordering, timestamps).

## Reviewer Guidance

Regenerate the manifest twice and diff; run each fixture case manually; confirm the plants fail for their own unique token. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP06 --agent claude` (depends on WP04; the lane base is computed from lanes.json)
