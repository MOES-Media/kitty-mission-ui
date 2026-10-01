---
work_package_id: WP05
title: Typecheck, ESLint and Stylelint gates with plants
dependencies:
- WP04
requirement_refs:
- C-005
- FR-006
- FR-007
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T019
- T020
- T021
- T022
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: implementer-ivan
authoritative_surface: eslint-rules/
create_intent:
- eslint.config.mjs
- eslint-rules/index.mjs
- stylelint.config.mjs
- gates/plants/typecheck/plant.json
- gates/plants/eslint/plant.json
- gates/plants/stylelint/plant.json
execution_mode: code_change
owned_files:
- eslint.config.mjs
- eslint-rules/**
- stylelint.config.mjs
- gates/plants/typecheck/**
- gates/plants/eslint/**
- gates/plants/stylelint/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP05 - Typecheck, ESLint and Stylelint gates with plants

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Configure the `typecheck`, `eslint` and `stylelint` gates over full packages and ship one plant for each (two for stylelint).

## Context

Read `research.md` R4 (typecheck, eslint, stylelint rows, Stylelint rule set, elements-over-CSS, type-checking scope), R6 (ESLint local rules), `spec.md` FR-006, FR-007, C-005. The `typecheck`, `lint`, `lint:styles` scripts already exist (WP01). Another WP (WP06) owns `eslint.no-io.config.mjs`; do not touch it. This WP runs in parallel with WP06, WP07, WP08.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP05 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T019 Typecheck gate
Confirm strict settings take effect (`tsc --noEmit` in each project via `pnpm -r typecheck`, including `gates/**/*.ts` through the mission-ui tsconfig include). Plant `gates/plants/typecheck/`: overlay adds `const plantTypecheck: number = 'x'` via a `*.ts.plant` file appended to a real source target; `expectFailPattern: plantTypecheck`.

### T020 ESLint flat config with local rules
`eslint.config.mjs`: ESLint 9 flat, `@eslint/js` recommended, `typescript-eslint` type-aware for `packages/*/src`, `eslint-plugin-lit`, `--max-warnings 0` already in the script. Local rules in `eslint-rules/`: (a) `no-restricted-syntax` over Lit `html` templates forbidding raw `<button`, `<input`, `<select`, `<textarea` and `class=`; (b) forbid inline `style=`, `styleMap` and `unsafeCSS` in `packages/*/src`; (c) every `dispatchEvent` must be `dispatchEvent(new CustomEvent('<string literal>', ...))`. `gates/` and `*.plant` paths are ignored via configured globs only where hygiene-consistent (ignore `gates/plants/**` because nothing lintable lives there; do not add broad ignores). Plant `gates/plants/eslint/`: unused variable `plantEslintUnused`, pattern that token.

### T021 Stylelint config
`stylelint.config.mjs` per R4 rule set: `postcss-lit` custom syntax for `.ts`, `stylelint-declaration-strict-value` on colour/background/font/font-size/line-height/padding/margin/gap/border-radius/border/width allowing only `var(--sk-*)`, `0`, `auto`, `inherit`, `currentColor`, `transparent`; `color-no-hex`; `function-disallowed-list` (`rgb`, `rgba`, `hsl`, `hsla`, `oklch`, `color-mix`); `property-allowed-list` restricted to layout properties; global `unit-allowed-list: ['%','fr']`. Plants: two overlays, (1) `color: #ff00aa` in class `.plant-stylelint-color`, (2) a `16px` size in `.plant-stylelint-size`; `plant.json` is an array of two, each with its own unique `expectFailPattern` (the class names).

### T019-T021 plant layout (binding)
Plant sources are new-file overlays: `gates/plants/typecheck/plant-typecheck.ts.plant` -> `packages/mission-ui/src/plant-typecheck.ts` (`const plantTypecheck: number = 'x'; export { plantTypecheck };`); `gates/plants/eslint/plant-eslint.ts.plant` -> `packages/mission-ui/src/plant-eslint.ts` (unused `plantEslintUnused`); `gates/plants/stylelint/plant-stylelint-color.ts.plant` -> `packages/mission-ui/src/plant-stylelint-color.ts` (css template with `.plant-stylelint-color { color: #ff00aa; }`) and `plant-stylelint-size.ts.plant` -> `.../plant-stylelint-size.ts` (`.plant-stylelint-size { padding: 16px; }`). `plant.json` of stylelint is an array of the two. Each token is the literal string quoted above.

### T022 Full-package scope proof
Show the gates evaluate untracked new files: add an untracked violating `.ts` file under `packages/mission-ui/src`, run each of the three gates, see failure, delete the file. Record commands in the hand-off. No script or config uses `--changed`, `git diff` or lint-staged.

## Definition of Done (objective, command-verifiable)

- [ ] `pnpm typecheck && pnpm lint && pnpm lint:styles` exits 0 on the clean tree (WP04 merged in your lane).
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/typecheck/plant-typecheck.ts.plant packages/mission-ui/src/plant-typecheck.ts; if pnpm typecheck >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plantTypecheck' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/plant-typecheck.ts; pnpm typecheck; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm typecheck 2>&1 | grep -c 'plantTypecheck'` prints 0 on the clean tree.
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/eslint/plant-eslint.ts.plant packages/mission-ui/src/plant-eslint.ts; if pnpm lint >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plantEslintUnused' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/plant-eslint.ts; pnpm lint; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm lint 2>&1 | grep -c 'plantEslintUnused'` prints 0 on the clean tree.
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/stylelint/plant-stylelint-color.ts.plant packages/mission-ui/src/plant-stylelint-color.ts; if pnpm lint:styles >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plant-stylelint-color' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/plant-stylelint-color.ts; pnpm lint:styles; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm lint:styles 2>&1 | grep -c 'plant-stylelint-color'` prints 0 on the clean tree.
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/stylelint/plant-stylelint-size.ts.plant packages/mission-ui/src/plant-stylelint-size.ts; if pnpm lint:styles >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plant-stylelint-size' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/plant-stylelint-size.ts; pnpm lint:styles; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm lint:styles 2>&1 | grep -c 'plant-stylelint-size'` prints 0 on the clean tree.
- [ ] Untracked-file scope, literal: `printf "const plantEslintUnused = 1;\n" > packages/mission-ui/src/untracked-plant.ts; pnpm lint; echo exit=$?; rm packages/mission-ui/src/untracked-plant.ts; pnpm lint; echo exit=$?` prints a non-zero then `exit=0` (file is untracked, never `git add`ed).
- [ ] Elements-over-CSS rules, literal: for each of `printf 'import {html} from "lit"; export const x = html`<button>x</button>`;\n'`, `printf 'import {html} from "lit"; export const x = html`<div style="a:b"></div>`;\n'`, `printf 'export const f = (t: HTMLElement, n: string) => t.dispatchEvent(new CustomEvent(n));\n'` redirected into `packages/mission-ui/src/rule-probe.ts`, `pnpm lint` exits non-zero; `rm packages/mission-ui/src/rule-probe.ts` after each; final `pnpm lint` exits 0.
- [ ] `grep -rnE -- '--changed|git diff|lint-staged' package.json eslint.config.mjs stylelint.config.mjs` prints nothing.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

postcss-lit not covering a css template (verify with the `.plant` colour case); typescript-eslint type-aware config picking up plant files; over-broad ignores that blind the gate.

## Reviewer Guidance

Re-run every plant and the untracked-file check personally; read the ignore globs for blind spots. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP05 --agent claude` (depends on WP04; the lane base is computed from lanes.json)
