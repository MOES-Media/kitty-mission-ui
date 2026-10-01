---
work_package_id: WP04
title: sk-mission-sample element, four stories and interaction tests
dependencies:
- WP03
requirement_refs:
- FR-004
- FR-005
- FR-009
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T014
- T015
- T016
- T017
- T018
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: frontend-freddy
authoritative_surface: packages/mission-ui/src/
create_intent:
- packages/mission-ui/src/index.ts
- packages/mission-ui/src/view-state.ts
- packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts
- packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.stories.ts
- packages/mission-ui/src/elements/sk-mission-sample/fixtures.ts
- packages/mission-ui/test/sk-mission-sample.test.ts
- packages/mission-ui/vitest.config.ts
- packages/mission-ui/CHANGELOG.md
- gates/plants/unit-tests/plant.json
- gates/plants/unit-tests/sk-mission-sample.ts.plant
execution_mode: code_change
owned_files:
- packages/mission-ui/src/**
- packages/mission-ui/test/**
- packages/mission-ui/vitest.config.ts
- packages/mission-ui/CHANGELOG.md
- gates/plants/unit-tests/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP04 - sk-mission-sample element, four stories and interaction tests

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Implement the template element per `contracts/sample-element.md` with its four stories, synthetic fixtures, Vitest browser-mode tests for every event and payload, and the `unit-tests` gate plant.

## Context

Read `contracts/sample-element.md` (authoritative), `data-model.md` (ViewState, MissionSummary, Events), `research.md` R3, R4 (unit-tests row), `spec.md` FR-004, FR-005, FR-009, US3, C-005. Source syntax must stay compatible with the manifest analyzer's bundled TypeScript ~5.4: no `accessor`, no `satisfies`, no 5.5+ features (WP06 regenerates the manifest from this file).

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP04 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T014 view-state.ts, fixtures.ts, index.ts
`ViewState` closed union once in `view-state.ts`; `MissionSummary` type; `fixtures.ts` with synthetic data only (slug like `example-mission-01ABCDEF`; no real names, paths, usernames). `index.ts` registers and exports elements through a guarded `customElements.get` check.

### T015 sk-mission-sample.ts
Properties `status` (reflected, default `loading`, unknown => `empty`), `mission` (`MissionSummary | null`), `errorMessage` (`error-message`). Render exactly as the Rendering table: ready = `sk-card` + heading + `sk-pill-tag` (`done/total`) + `sk-button variant=primary`; empty = `sk-notice tone=info`; loading = `sk-status-indicator pulsing` + text and `aria-busy="true"` on host; error = `sk-notice tone=danger` + `sk-button variant=secondary`. `ready` with `mission === null` renders the empty view. One `display: grid; gap: var(--sk-space-4)` wrapper with at least two children in `ready`. Events: listen to inner `sk-button` click, re-emit `dispatchEvent(new CustomEvent('<string literal>', { detail, bubbles: true, composed: true }))`; literal name only. CSS: `:host{display:block}` and the grid wrapper only; tokens only, units only `%`/`fr`, no inline style, `styleMap`, `unsafeCSS`, raw `<button`, `<input`, `class=`. No I/O of any kind (no fetch, storage, timers to network, `window.__TAURI__`).

### T016 Stories and changelog
`sk-mission-sample.stories.ts`: title `Mission/Sample`, `tags: ['autodocs']`, exports `Ready`, `Empty`, `Loading`, `Error` (story ids `mission-sample--ready` etc.), each setting `status` and passing fixtures. `packages/mission-ui/CHANGELOG.md` records the element's addition (charter documentation policy).

### T017 Vitest browser-mode tests
`vitest.config.ts` using `@vitest/browser-playwright`, Chromium, headless. `test/sk-mission-sample.test.ts` covers the Tests list of the contract: each status renders its composition and no other; open click emits exactly one `sk-mission-open` with `detail.slug === mission.slug`, bubbles and composed (assert by catching on `document`); retry emits exactly one `sk-mission-retry`; `ready` + null mission renders empty. Assertion message for the slug check must contain no `plant-unit-slug` text in the clean run (the token only appears when the plant breaks the payload, e.g. via `expect(detail, 'plant-unit-slug: detail.slug missing').toHaveProperty('slug')`).

### T018 unit-tests plant (binding layout)
The overlay `gates/plants/unit-tests/sk-mission-sample.ts.plant` replaces the real file `packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts`; restore with `git checkout -- <that file>`. Add one more test to T017: a design-system definition test asserting `customElements.get(tag)` is defined for each of `sk-card`, `sk-button`, `sk-notice`, `sk-pill-tag`, `sk-status-indicator` (F8). Original description:
`gates/plants/unit-tests/plant.json` with `command: pnpm test`, `expectFailPattern: plant-unit-slug`, and an overlay replacing `sk-mission-sample.ts` (full-file overlay `sk-mission-sample.ts.plant`) that renames the `slug` key in the `sk-mission-open` detail. Keep the overlay a byte-faithful copy except for that rename so it does not go stale silently: add a check in the plant JSON (`baseSha256` of the real element) that WP10's harness verifies, OR document in the hand-off that the overlay was regenerated from the final element at handoff time.

## Definition of Done (objective, command-verifiable)

- [ ] `pnpm typecheck` exits 0 for the mission-ui project.
- [ ] `pnpm test 2>&1 | grep -E 'Tests +[0-9]+ passed'` shows at least 8 passing tests and no failures: 4 status renders, open event, retry event, null-mission-renders-empty, and the design-system definition test (list the names in the hand-off).
- [ ] Mutation, literal: `sed -i "s/bubbles: true/bubbles: false/" packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; pnpm test; echo exit=$?; git checkout -- packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; pnpm test; echo exit=$?` prints a non-zero then `exit=0`. Same with deleting the `sk-mission-retry` dispatch line via `sed -i "/sk-mission-retry/d" packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts`.
- [ ] Plant toggle, literal: `O=$(mktemp); cp gates/plants/unit-tests/sk-mission-sample.ts.plant packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; if pnpm test >"$O" 2>&1; then echo UNEXPECTED-PASS; false; fi; grep -q 'plant-unit-slug' "$O" && echo PLANT-CAUGHT; git checkout -- packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; pnpm test; echo clean-exit=$?` must print `PLANT-CAUGHT` and `clean-exit=0`; and `pnpm test 2>&1 | grep -c 'plant-unit-slug'` prints 0 on the clean tree.
- [ ] `grep -rnE '#[0-9a-fA-F]{3,8}\b|[0-9.]+(px|rem|em)\b' packages/mission-ui/src` prints nothing; `grep -rn '<button\|<input\| class=\|style=\|fetch(\|localStorage\|XMLHttpRequest\|__TAURI__' packages/mission-ui/src` prints nothing.
- [ ] Stories: `pnpm storybook:build-only && grep -o 'mission-sample--[a-z]*' apps/storybook/storybook-static/index.json | sort -u` prints exactly four ids: empty, error, loading, ready.
- [ ] Runtime design-system check (F8): `python3 -m http.server 6006 --bind 127.0.0.1 -d apps/storybook/storybook-static >/dev/null 2>&1 & SRV=$!; sleep 1; node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('http://127.0.0.1:6006/iframe.html?id=mission-sample--ready&viewMode=story');await p.waitForFunction(t=>t.every(n=>customElements.get(n)),['sk-card','sk-button','sk-pill-tag','sk-notice','sk-status-indicator'],{timeout:15000});await b.close()})().catch(e=>{console.error(e);process.exit(1)})"; R=$?; kill $SRV; exit $R` exits 0 (run after `pnpm storybook:build-only`).
- [ ] `test "$(grep -c "dispatchEvent(new CustomEvent('" packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts)" = "$(grep -c 'dispatchEvent(' packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts)" && echo literal-events-ok` prints `literal-events-ok`.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Decorator syntax differing from the analyzer's TS; Vitest browser mode needing Playwright Chromium installed locally (document the install command); the `sk-*` element attribute names must be taken from the installed `@spec-kitty/elements` package, not guessed (inspect its `custom-elements.json` or types).

## Reviewer Guidance

Open each story in the built output; run the mutation checks; confirm the element renders only `sk-*` primitives. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP04 --agent claude` (depends on WP03; the lane base is computed from lanes.json)
