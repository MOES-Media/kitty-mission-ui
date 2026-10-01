---
work_package_id: WP03
title: Storybook app wired to the design system, with build gate and plant
dependencies:
- WP01
requirement_refs:
- FR-003
- FR-008
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T010
- T011
- T012
- T013
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: frontend-freddy
authoritative_surface: apps/storybook/.storybook/
create_intent:
- apps/storybook/.storybook/main.ts
- apps/storybook/.storybook/preview.ts
- apps/storybook/.storybook/preview-head.html
- gates/plants/storybook-build/plant.json
- gates/plants/storybook-build/plant-storybook-missing.stories.ts.plant
execution_mode: code_change
owned_files:
- apps/storybook/.storybook/**
- gates/plants/storybook-build/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP03 - Storybook app wired to the design system, with build gate and plant

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Wire Storybook 10 (`@storybook/web-components-vite`) to load `@spec-kitty/tokens|styles|elements` with a pinned dark theme, and deliver the `storybook-build` gate with its plant.

## Context

Read `research.md` R2 (how Storybook loads the design system, verified), R0, R9 (storybook-build job), `spec.md` FR-003, FR-008, US1. `apps/storybook/package.json` and `tsconfig.json` exist from WP01 (do not edit; if a script is wrong, record an out-of-map edit with rationale). No stories exist yet; WP04 adds them.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP03 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T010 .storybook/main.ts
Framework `@storybook/web-components-vite`; `stories` glob `../../../packages/mission-ui/src/**/*.stories.ts`; `addons` only what autodocs needs (`@storybook/addon-docs` if R2 requires it, exact-pinned in WP01 list; if missing from `package.json`, record an out-of-map edit); `viteFinal` dedupes `lit` to a single copy (`resolve.dedupe: ['lit']`) and emits no external font URLs (R2). Sample docs: `docs.autodocs` default on via tags, not global.

### T011 .storybook/preview.ts and preview-head.html
Import the token and style CSS from `@spec-kitty/tokens` and `@spec-kitty/styles`, register all elements via `@spec-kitty/elements`, and pin the theme (dark) so a fallback flip cannot change renders (R2 'theme fallback flip'). Set `parameters` for layout padded. No project colours or fonts. `preview-head.html` only carries what R2 lists (font handling, theme attribute).

### T012 Verify with a throwaway story
Create an UNCOMMITTED story rendering `<sk-button variant="primary">x</sk-button>`; run `pnpm storybook:build-only`; confirm it builds, `storybook-static/` contains the token CSS and no `https://fonts.` URL, then delete the throwaway story. Record the commands and results in the hand-off. (The full `pnpm build-storybook`, which also runs the hygiene token scan, is only available after WP07.)

### T013 storybook-build plant (binding layout)
Plant source `gates/plants/storybook-build/plant-storybook-missing.stories.ts.plant` is copied to `packages/mission-ui/src/elements/sk-mission-sample/plant-storybook-build.stories.ts` (create the directory with `mkdir -p` if WP04 is not yet in your lane). `pnpm storybook:build-only` is declared by WP01 (= build without the scan) and `pnpm build-storybook` = build-only + hygiene scan; verify both definitions with `node -p "require('./package.json').scripts['build-storybook']"` before relying on them. Original description:
`gates/plants/storybook-build/plant.json`: `{gate:'storybook-build', command:'pnpm build-storybook', expectFailPattern:'plant-storybook-missing', overlays:[{target:'packages/mission-ui/src/elements/sk-mission-sample/plant-storybook-build.stories.ts', source:'plant-storybook-missing.stories.ts.plant'}]}`. The overlay story imports `./plant-storybook-missing.js` (a file that does not exist). The token `plant-storybook-missing` must not appear in a clean build output.

## Definition of Done (objective, command-verifiable)

- [ ] `node -p "require('./package.json').scripts['storybook:build-only']"` prints `pnpm --filter @spec-kitty/storybook-app build`, and `node -p "require('./package.json').scripts['build-storybook']"` prints `pnpm storybook:build-only && node scripts/check-hygiene.mjs --storybook-static` (the scan itself is verified in WP07 and WP09, not here).
- [ ] With an uncommitted throwaway story `packages/mission-ui/src/throwaway.stories.ts` (title `Throwaway/Probe`, story `Default` rendering `<sk-button variant="primary">x</sk-button>`): `pnpm storybook:build-only` exits 0 and `grep -rl 'fonts.googleapis\|fonts.gstatic' apps/storybook/storybook-static` prints nothing.
- [ ] Design-system runtime check (F8), same throwaway build, Chromium installed via `pnpm exec playwright install chromium`: `python3 -m http.server 6006 --bind 127.0.0.1 -d apps/storybook/storybook-static >/dev/null 2>&1 & SRV=$!; sleep 1; node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://127.0.0.1:6006/iframe.html?id=throwaway-probe--default&viewMode=story');await p.waitForFunction(t=>t.every(n=>customElements.get(n)),['sk-button'],{timeout:15000});await b.close()})().catch(e=>{console.error(e);process.exit(1)})"; R=$?; kill $SRV; exit $R` exits 0 (proves `sk-button` is defined in the built preview).
- [ ] `rm packages/mission-ui/src/throwaway.stories.ts` afterwards; `git status --short` shows no throwaway file.
- [ ] Single `lit` copy: `pnpm ls lit --depth 3 -r | grep -c 'lit 3.3.3'` prints 1 (one resolved version line).
- [ ] Plant toggle, literal: `O=$(mktemp); mkdir -p packages/mission-ui/src/elements/sk-mission-sample; cp gates/plants/storybook-build/plant-storybook-missing.stories.ts.plant packages/mission-ui/src/elements/sk-mission-sample/plant-storybook-build.stories.ts; if pnpm storybook:build-only >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plant-storybook-missing' "$O" && echo PLANT-CAUGHT; rm -f packages/mission-ui/src/elements/sk-mission-sample/plant-storybook-build.stories.ts; pnpm storybook:build-only; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm storybook:build-only 2>&1 | grep -c 'plant-storybook-missing'` prints 0 on the clean tree.
- [ ] `jq -e '.gate=="storybook-build" and (.expectFailPattern|length>0)' gates/plants/storybook-build/plant.json` exits 0, and `find apps/storybook/.storybook gates/plants/storybook-build \( -name '*.ts' -o -name '*.css' \) -not -name '*.plant' ` lists only `main.ts` and `preview.ts`.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Storybook major-version config drift; emitted font URL; duplicate `lit`. The plant target directory does not exist until WP04 - the overlay copy in T012/acceptance must create it temporarily.

## Reviewer Guidance

Re-run the throwaway-story build and the plant toggle; check `main.ts` globs match the plan tree. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP03 --agent claude` (depends on WP01; the lane base is computed from lanes.json)
