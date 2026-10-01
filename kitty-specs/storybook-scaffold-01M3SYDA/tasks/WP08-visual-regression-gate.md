---
work_package_id: WP08
title: Visual regression gate with pinned container and baselines
dependencies:
- WP03
- WP04
requirement_refs:
- FR-010
- NFR-003
planning_base_branch: feat/storybook-scaffold
merge_target_branch: feat/storybook-scaffold
branch_strategy: Planning artifacts for this mission were generated on feat/storybook-scaffold. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/storybook-scaffold unless the human explicitly redirects the landing branch.
subtasks:
- T033
- T034
- T035
- T036
- T037
history:
- at: '2026-09-30T00:00:00Z'
  actor: tasks-phase
  action: Work package generated from plan.md concern map
agent_profile: frontend-freddy
authoritative_surface: apps/storybook/tests/visual/
create_intent:
- apps/storybook/playwright.config.ts
- apps/storybook/tests/visual/stories.visual.spec.ts
- scripts/visual.sh
- gates/plants/visual/plant.json
- gates/plants/visual/sk-mission-sample.ts.plant
execution_mode: code_change
owned_files:
- apps/storybook/playwright.config.ts
- apps/storybook/tests/visual/**
- scripts/visual.sh
- gates/plants/visual/**
role: implementer
tags: []
tracker_refs: []
---
# Work Package Prompt: WP08 - Visual regression gate with pinned container and baselines

## ⚡ Do This First: Load Agent Profile

Before reading anything else, load your assigned profile with `/ad-hoc-profile-load frontend-freddy` (role: implementer). Follow its boundaries for the whole WP.

## Objective

Deliver the `visual` gate: one Playwright screenshot test per story against the built Storybook, baselines produced only inside the digest-pinned Playwright container, a wrapper that fails rather than skips, and the visual plant.

## Context

Read `research.md` R5 (whole), R9 container notes, `contracts/ci-gates.md` (visual row, container Node note), `spec.md` FR-010, NFR-003, plan IC-06 and hard requirement 1. `visual:run`, `visual`, `visual:update` scripts exist (WP01). The PNG chunk/1:1 rules are enforced by hygiene (WP07); this WP must still produce conforming files.

## Branch Strategy

- Planning/base branch: `feat/storybook-scaffold`. Completed changes merge into `feat/storybook-scaffold` (the mission PR into `main` is opened later by the orchestrator, not by this WP).
- Execution worktrees are allocated per computed lane from `lanes.json`; enter the workspace that `spec-kitty agent action implement WP08 --agent claude` resolves. Do not create branches or switch branches by hand.
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

### T033 Pin verification (plan hard requirement 1)
BEFORE first use of the image run `skopeo inspect --raw docker://mcr.microsoft.com/playwright:v1.62.1-noble | sha256sum` and record that it equals `dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`. If it differs, HALT and report; never swap silently. Image reference used everywhere: `mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`.

### T034 playwright.config.ts and the per-story spec
Serve the built `storybook-static` with a static server (per R5); `stories.visual.spec.ts` reads `index.json`, generates one `toHaveScreenshot` test per story id of the Sample stories (test count equals the story count and is >= 4; fail if fewer), fixed viewport, animations disabled, reduced motion, deterministic fonts. `visual:run` = plain `playwright test` so extra args such as `--repeat-each=5` pass through. Snapshots under `apps/storybook/tests/visual/__snapshots__/` named by story id.

### T035 scripts/visual.sh
Inside the pinned image (detected by env or a marker): run `visual:run` after asserting `node -v` is `v24.18.1` or `v22.22.2`. Outside: locate podman or docker, `run --rm` the pinned image with the repo mounted read-write, then the same script inside. If neither runtime can start, EXIT NON-ZERO with a clear message (never skip, never pass). `visual:update` passes `--update-snapshots`. No absolute host paths printed or written.

### T036 Baselines (container only)
Generate baselines with `pnpm visual:update` in the pinned container only. Verify each PNG has only `IHDR`/`IDAT`/`IEND` (+`PLTE`/`tRNS`) chunks (strip others if Playwright adds any; use a tiny check script run inline, not committed, or rely on WP07's check if merged) and that baselines map 1:1 to stories. Run `pnpm visual -- --repeat-each=5` (or `visual:run -- --repeat-each=5` in the container): 0 failures, 5 consecutive times (NFR-003).

### T037 plant layout (binding)
The overlay `gates/plants/visual/sk-mission-sample.ts.plant` replaces the real element file `packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts` (changing `var(--sk-space-4)` to `var(--sk-space-8)` on the grid wrapper); restore with `git checkout -- <file>`. Planted command: `pnpm storybook:build-only && bash scripts/visual.sh` (NOT `pnpm visual`, because `build-storybook` needs WP07's scan script, which is absent in this lane). The unique token: the Playwright failure line naming the snapshot, `mission-sample--ready`, which is absent from a passing run; record that choice. Original description:
`gates/plants/visual/plant.json`: overlay changes the `--sk-space-*` token in the element grid gap to a measurably different one (ready story, >= 2 children); `command: pnpm build-storybook && pnpm visual:run` executed in the container via `bash scripts/visual.sh`; `expectFailPattern` is a unique token emitted on diff failure (for example a custom Playwright reporter line `plant-visual-diff` or the snapshot name `mission-sample--ready`; it must be absent from the clean run - choose and record which).

## Definition of Done (objective, command-verifiable)

- [ ] Hand-off records the literal output of `skopeo inspect --raw docker://mcr.microsoft.com/playwright:v1.62.1-noble | sha256sum` and it equals `dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e` (`[ "$(skopeo inspect --raw docker://mcr.microsoft.com/playwright:v1.62.1-noble | sha256sum | cut -d' ' -f1)" = dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e ] && echo DIGEST-OK`).
- [ ] Clean run: `pnpm storybook:build-only && bash scripts/visual.sh -- --repeat-each=5; echo exit=$?` prints `exit=0` (5 consecutive clean repeats, NFR-003).
- [ ] `test "$(ls apps/storybook/tests/visual/__snapshots__/**/*.png apps/storybook/tests/visual/__snapshots__/*.png 2>/dev/null | wc -l)" -ge 4` succeeds, and that count equals `pnpm --filter @spec-kitty/storybook-app exec playwright test --list | grep -c mission-sample`.
- [ ] PNG chunk check, full and runnable (prints `N files; bad chunks: []`, exit 0):
```
python3 - <<'PY'
import glob,struct,sys
ok={b'IHDR',b'IDAT',b'IEND',b'PLTE',b'tRNS'}
bad=[]
files=sorted(glob.glob('apps/storybook/tests/visual/__snapshots__/**/*.png',recursive=True))
assert files,'no baselines'
for f in files:
    d=open(f,'rb').read()
    assert d[:8]==bytes([137,80,78,71,13,10,26,10]),f
    i=8
    while i<len(d):
        n=struct.unpack('>I',d[i:i+4])[0]
        t=d[i+4:i+8]
        if t not in ok: bad.append((f,t))
        i+=12+n
print(len(files),'files; bad chunks:',bad)
sys.exit(1 if bad else 0)
PY
```
- [ ] No-runtime check, literal: `env PATH=/nonexistent /bin/bash scripts/visual.sh; echo exit=$?` prints a non-zero exit and no line containing `PASS` (run it with `/bin/bash` by absolute path because PATH is emptied; if `scripts/visual.sh` is invoked inside the image this case is skipped and documented).
- [ ] Plant toggle, literal: `O=$(mktemp); pnpm storybook:build-only >/dev/null 2>&1; cp gates/plants/visual/sk-mission-sample.ts.plant packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; pnpm storybook:build-only >/dev/null 2>&1; if bash scripts/visual.sh >"$O" 2>&1; then echo UNEXPECTED-PASS; fi; grep -q mission-sample--ready "$O" && echo PLANT-CAUGHT; git checkout -- packages/mission-ui/src/elements/sk-mission-sample/sk-mission-sample.ts; pnpm storybook:build-only >/dev/null 2>&1; bash scripts/visual.sh; echo clean-exit=$?` prints `PLANT-CAUGHT` and `clean-exit=0`; the token is absent from a clean run (`bash scripts/visual.sh 2>&1 | grep -c 'mission-sample--ready.*(failed|differ|mismatch)'` prints 0).
- [ ] `grep -rn '/home/\|/Users/' scripts/visual.sh apps/storybook/playwright.config.ts apps/storybook/tests --include='*.sh' --include='*.ts'` prints nothing.
- [ ] The `scan` step of `build-storybook` is NOT exercised here; it is verified in WP07 and WP09.

Also required: `git status --short` is clean after your final commit; every commit is verified with `git cat-file -t <hash>`; the hand-off note lists commands run and their results.

## Risks

Baselines made on a host instead of the container (reject: regenerate); image Node 24 vs repo Node 22 (assert either as specified); font rendering drift; Playwright version coupled to the image tag; GDK/Wayland not relevant in-container.

## Reviewer Guidance

Re-run the five repeats; check the digest line; verify the script cannot pass without a container runtime. A reviewer must re-run the acceptance commands above; 'looks good' is not an approval.

## Implementation command

`spec-kitty agent action implement WP08 --agent claude` (depends on WP03, WP04; the lane base is computed from lanes.json)
