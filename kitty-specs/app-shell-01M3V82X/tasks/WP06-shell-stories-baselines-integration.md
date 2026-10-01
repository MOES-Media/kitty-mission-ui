---
work_package_id: WP06
title: Shell stories, baselines and integration
dependencies:
- WP05
requirement_refs:
- FR-013
- FR-015
- NFR-001
- NFR-002
planning_base_branch: feat/app-shell
merge_target_branch: feat/app-shell
branch_strategy: Planning artifacts for this mission were generated on feat/app-shell. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/app-shell unless the human explicitly redirects the landing branch.
subtasks:
- T031
- T032
- T033
- T034
- T035
- T036
phase: Phase 4 - Integration
history:
- timestamp: '2026-10-01T00:00:00Z'
  agent: tasks-phase
  action: Prompt generated via /spec-kitty.tasks
agent_profile: implementer-ivan
authoritative_surface: packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.stories.ts
create_intent:
- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.stories.ts
- packages/mission-ui/src/elements/sk-mission-shell/story-fixtures.ts
execution_mode: code_change
owned_files:
- packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.stories.ts
- packages/mission-ui/src/elements/sk-mission-shell/story-fixtures.ts
- apps/storybook/tests/visual/__snapshots__/mission-shell--*.png
- CHANGELOG.md
- packages/mission-ui/CHANGELOG.md
- .github/workflows/ci.yml
role: implementer
tags: []
tracker_refs: []
---

# Work Package Prompt: WP06 - Shell stories, baselines and integration

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load implementer-ivan` (role: implementer). Follow its boundaries for the whole WP.

Do not spawn sub-agents or forks; do this WP yourself.

## Objective

Write the 42 shell stories (title `Mission/Shell`), generate their baselines in the pinned container, set the CI timeouts, update both changelogs, prove 5 consecutive clean visual runs and the gate proof, and assemble the design-review and gap list for the final PR. This is the only WP that adds shell stories.

## Context

Read `research.md` D-05 (visual spec tags, the 42-row state matrix with exports and tags, budget and timeouts, NFR-002 basis), D-06, D-08 (gaps G-01 to G-15) and Risk 5; `spec.md` FR-013, FR-015, NFR-001, NFR-002, SC-001, SC-004. WP04's `packages/mission-ui/src/elements/sk-mission-shell/fixtures.ts` already holds fixtures for every matrix state; use them without editing that file (create `packages/mission-ui/src/elements/sk-mission-shell/story-fixtures.ts` only for argument helpers it lacks). WP01 built the `vw-<n>`/`tab-<n>` visual-spec handling; you must not edit `stories.visual.spec.ts`, `preview-head.html`, `index.ts`.

## Subtasks

### T031 The 42 stories
`packages/mission-ui/src/elements/sk-mission-shell/sk-mission-shell.stories.ts`, title `Mission/Shell`, `parameters.layout = 'fullscreen'`, one export per matrix row (names exactly as in D-05: `ProjectMissions1280` ... `MissionDrawerOpen320`), so ids are `mission-shell--<kebab>`. Every story carries a `vw-<width>` tag (1280, 1024, 800, 680, 390, 320 as in its name) and `tab-<n>` where the matrix says (`SkipLinkFocused1280`/`SkipLinkFocused390` tab-1, `NavItemFocusVisible1280` tab-3, `LabelBubbleVisible1024` tab-2). Drawer-open and flyout-open stories set `drawerOpen`/`flyoutOpen` through args (no `play`, no timers). Content states (`ContentLoading/Empty/Error1280`) put a `sk-mission-sample` in its states inside the shell with shell status `ready`; shell-status stories set `status`. No `play` functions anywhere. Visible text in slots only.

### T032 Baselines
Build and generate inside the pinned container: `pnpm visual:update`. Read EVERY new PNG (42) and describe each briefly in the hand-off table (id, tier shown, what is drawn, defects). Check specifically: the tier assertion held for every `vw-*` story; the drawer panel is dark with a visible UA border (G-11, design-review item) and no light panel; label bubble not clipped; flyout overlays without moving content; long names wrap; status sits in normal flow at the content top. If a PNG shows a defect, fix it in the owning source file (the owning WP's file: note it as an out-of-map edit with rationale) and regenerate; never hand-edit a PNG.

### T033 Stability: 5 consecutive clean runs
On an unchanged commit run `pnpm visual` five times in a row (the CI command also uses `--repeat-each=5`): `for i in 1 2 3 4 5; do pnpm visual || exit 1; done`. Record durations. Any flake: find the unstable story (1024, 800 and 680 are the risk), fix the cause, do not loosen thresholds or retry.

### T034 CI timeouts and changelogs
`.github/workflows/ci.yml`: set the `Gate: visual` job `timeout-minutes: 10` and the proof visual matrix leg `timeout-minutes: 15`; change nothing else; keep `bash scripts/visual.sh -- --repeat-each=5`. Add entries under the existing unreleased heading of `packages/mission-ui/CHANGELOG.md` (three elements, five events, tiers, gaps) and the root `CHANGELOG.md` (one line). Put the measured durations from T033 in the hand-off for the PR.

### T035 Manifest and gap record (FR-015)
`pnpm manifest:generate` and confirm `git diff --exit-code packages/mission-ui/custom-elements.json` is clean (the surface is frozen; if it is not clean, regenerate, commit, and report which WP drifted). Record the gaps G-01 to G-15 (table from research D-08, each with proposed API, acceptance, sunset) in the `packages/mission-ui/CHANGELOG.md` entry as a "Design library gaps" subsection that references `research.md` D-08; do not file issues yourself (the orchestrator does that at PR time; say so).

### T036 Gate proof and hand-off list
`pnpm gate-proof` must exit 0 (every gate still fails with its plant). Assemble the final-PR design-review list from the hand-offs of WP01 to WP05 plus Risk 5 and write it as a table in your hand-off: UA modal border on the drawer (G-11), icon column without a tree, flyout, overlay drawer chrome, 48 px top bar, no progress bar (G-09), yellow current edge not reproducible (G-13), local icons (G-08), non-flush bordered rows in a 3.5rem column, edge-less local top bar and rail, plus the label bubble (G-12), native details folders (G-05).

## Acceptance (all runnable)

1. `pnpm typecheck && pnpm lint && pnpm lint:styles && pnpm lint:no-io && pnpm test:no-io && pnpm hygiene && pnpm test && pnpm manifest:check` exits 0.
2. `pnpm storybook:build-only` exits 0 and `node -e "const i=require('./apps/storybook/storybook-static/index.json');const n=Object.values(i.entries).filter(e=>e.type==='story'&&e.title==='Mission/Shell').length;if(n!==42)process.exit(1)"` exits 0.
3. `ls apps/storybook/tests/visual/__snapshots__/ | grep -c '^mission-shell--'` prints `42`, and `ls apps/storybook/tests/visual/__snapshots__/ | wc -l` prints `57` (42 + 6 + 5 + 4 sample).
4. `for i in 1 2 3 4 5; do pnpm visual || exit 1; done` exits 0 with `git status --short` empty afterwards.
5. `grep -n 'timeout-minutes: 10' .github/workflows/ci.yml | wc -l` is at least 1 within the visual job and `grep -n 'timeout-minutes: 15' .github/workflows/ci.yml | wc -l` is at least 1 (state the line numbers and confirm by reading the YAML that they belong to `Gate: visual` and the proof visual leg).
6. `pnpm gate-proof` exits 0.
7. Planted untracked-baseline orphan is caught: `cp apps/storybook/tests/visual/__snapshots__/mission-shell--project-missions-1280.png apps/storybook/tests/visual/__snapshots__/mission-shell--plant-orphan.png; pnpm visual; rc=$?; rm -f apps/storybook/tests/visual/__snapshots__/mission-shell--plant-orphan.png; test "$rc" -ne 0` exits 0 (the parity test rejects orphans; adjust the literal id to one that exists and say so).
8. `git status --short` is empty after the final commit.

## Design-review items (Risk 5) touched

All of them are collected here (T036); this WP is the single place the final PR list is assembled.

## Definition of Done

All acceptance commands exit 0; 42 stories and 42 baselines Read and described; 5 consecutive clean runs recorded with durations; CI timeouts set; changelogs and gap record written; hand-off lists commit hashes verified with `git cat-file -t`.

## Reviewer guidance

Open every new PNG; check tiers against widths, that no baseline of WP01-WP05 changed, no `play` function exists, the CI diff is exactly the two timeouts, and the 5-run evidence is real output, not a claim.

## Branch Strategy

Planning branch and final merge target: `feat/app-shell`. Execution happens in the lane worktree allocated by `finalize-tasks` (see `lanes.json`); depends on: WP05. Serial chain: the lane is created from the parent lane's branch, so you start with the previous WP's commits present. Start with `spec-kitty agent action implement WP06 --agent claude --mission app-shell-01M3V82X` and enter the workspace it reports. Do not switch branches in the shared checkout.

## Hard rules (every WP in this mission)

- Do not spawn sub-agents or forks; do this WP yourself.
- If any command is DENIED, stop and report; never retry it another way.
- No absolute home paths or usernames in any committed file (use `<repo>` placeholders). Run `pnpm hygiene` before committing.
- Baselines are generated ONLY inside the pinned container (`pnpm visual:update`, which fails rather than skips when podman or docker cannot start it). You must Read every new PNG and describe it in your hand-off (what is drawn, which tier, anything wrong). Never hand-edit or copy a PNG.
- Source syntax must stay compatible with the manifest analyzer's bundled TypeScript (about 5.4): no `accessor`, no `satisfies`, no 5.5+ features.
- No-I/O rules (research D-02): bare `matchMedia`, `.focus()`, `document.activeElement`, `showModal()`, `document.addEventListener` pass; `window.*` fails. Avoid identifiers named `parent`, `top`, `location`, `frames`, `opener`.
- Stylelint allow-list (research D-02): layout properties only, values `var(--sk-*)`, `0`, `auto`, `inherit`; units `%` and `fr` only; no `border`, `outline`, `transform`, `overflow-wrap`, `px`, `rem`. ESLint bans raw `<button>/<input>`, `class=`, `style=`. Visible text lives in slots.
- Manifest surface is frozen by WP01. Keep `pnpm manifest:check` green. Run `pnpm manifest:generate` and commit the result only if you changed JSDoc (`@fires`, `@slot`, `@csspart`, `@screen`) or public members; resolve any `custom-elements.json` conflict by regeneration, never by hand-merging.
- Visible text in slots never attributes (no names or labels in attributes that screen readers or visuals read as content other than the documented `label`/`heading` properties).
- Commit your work on the lane branch with a conventional message ending with the attribution line the harness gives you. Do not push. Do not run `git add -A` blindly; stage only owned files.
