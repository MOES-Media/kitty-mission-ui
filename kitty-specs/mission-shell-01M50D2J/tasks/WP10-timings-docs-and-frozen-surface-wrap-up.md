---
work_package_id: WP10
title: Provisional proof timings, documentation and frozen-surface wrap-up
dependencies:
- WP09
requirement_refs:
- C-003
- C-008
- NFR-005
- NFR-006
- SC-004
- SC-005
- SC-006
- SC-007
- C-002
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-mission-shell-01M50D2J
base_commit: 3aa2cd02b9967d92d2e6f310fbd4b4fa69142959
created_at: '2026-10-16T19:52:54.122576+00:00'
subtasks:
- T048
- T049
- T050
- T051
- T052
history: []
agent_profile: node-norris
authoritative_surface: .github/workflows/ci.yml
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- .github/workflows/ci.yml
- packages/mission-shell/README.md
- README.md
- CHANGELOG.md
role: implementer
tags: []
tracker_refs: []
---

# WP10 — Provisional proof timings, documentation and frozen-surface wrap-up

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `node-norris`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Close the mission:
- **Timeouts:** set the provisional proof-leg matrix timeouts from the local leg times (ruling
  `01M50K4S90BX5W0M322WYH8SA1`). Values only rise, and only matrix values change.
- **Frozen surface:** run research R-17's frozen-surface check in full, and hand its output over for the PR body
  (SC-004, SC-006).
- **Docs and evidence:** document the `./shell` entry for #20 and #21, add the CHANGELOG entry, and collect the PR-body
  inputs (design review, supply chain, timings, rulings, issue acceptance) for the orchestrator.

## Context

- **Plan**:
  - IC-09 ("Provisional timing, documentation and wrap-up");
  - "Gates", with the "Plants" table and "Proof-leg timeouts";
  - "Issue #18 acceptance → requirements (R1-03)", "Design review", "Decisions" and "PR shape".
- **Research**:
  - R-15: proof-leg cost and timeouts, the projection table, and R6-09 (visual is never set from the formula alone);
  - R-16: supply chain, with no new package and no new version in the lockfile;
  - R-17: what C-003's "gate wiring" covers. This is the exact frozen surface.
- **Quickstart**: "Check the frozen surface (SC-004, SC-006; research R-17)". That command sequence is the start of
  T049. Do not trim it.
- **Contracts**:
  - `contracts/shell-api.md`: the entries, `ShellHost`, `ShellOptions`, `mountShell`, "Host prerequisites" and
    "Behaviour a host can rely on";
  - `contracts/connection-presentation.md`: the banners and the Refresh button;
  - `data-model.md`: the refresh-policy table, summarised in T050 and never restated as a new rule.
- **tasks-notes.md**: "Proof-leg timing obligations", "Out-of-map edits" (WP10 has none) and "Follow-ups outside this
  mission".
- **Dependencies**: WP09 is approved, and its lane carries every earlier WP's merged tip. WP09 delivers:
  - the final `shell-*.png` baselines;
  - the re-proofs of P-6 and P-7, with their local leg times;
  - the CP-1 files `design-review.md` and `design-review.sha256`, committed by the orchestrator.

  The earlier WPs' final reports hold the other leg times: WP02 and WP06 (unit-tests), WP05 (typecheck), WP07
  (eslint) and WP08 (storybook-build, visual). The orchestrator passes those reports to you. If one is missing,
  measure the leg yourself (T048).
- **Why this WP edits `ci.yml` at all.** No gate command changes (plan "Gates"), but the unit-tests leg gains two plants
  and two runs (P-1, P-7). Its timeout rises 30 → 32 by the formula. Every other leg's projection stays at or below its
  current value. C-003 freezes everything else in the workflow, including every job `timeout-minutes` (R-17).
- **Provisional, by ruling.** WPs never push, so no CI run exists yet. The values here come from local `heavy`
  measurements. A post-PR `(landing)` fold re-derives them from the PR's first CI run (as in #17). Record that in the
  CHANGELOG and README text, and in the hand-off.

## Ownership

- **Owned files**:
  - `.github/workflows/ci.yml`
  - `packages/mission-shell/README.md`
  - `README.md`
  - `CHANGELOG.md`
- **Out-of-map edits**: none. The `ci.yml` edit is the proof-leg matrix `timeout` values only, and only upward.
- **`ci.yml` is owned in its matrix timeouts only.** These stay byte-identical (R-17):
  - every job's `timeout-minutes`, every job id and every `needs`;
  - every `id: gate` step's `run`;
  - the matrix gate list and its `image` values, and `all.needs`.
- **Do not touch** (the frozen surface, research R-17; T049 checks it):
  - the port: `packages/mission-shell/src/client/**` (including `port.ts`), `src/contract/stream.ts`, `src/testing.ts`
    and `src/index.ts`;
  - the #17 shell internals: `src/harness/**` and `src/Shell.svelte`;
  - `contracts/fixtures/*`, `pnpm-workspace.yaml`, `Cargo.toml` and `packages/mission-ui/**`;
  - the gate wiring: `scripts/gate-proof.mjs`, `scripts/gate-proof/**`, every `gates/plants/**` file, `scripts/visual.sh`,
    `apps/storybook/playwright.config.ts` and `apps/storybook/tests/visual/**` (baselines included);
  - the no-io files (`eslint.no-io.config.mjs`, `eslint-rules/svelte.mjs`, `gates/no-io.selftest.ts`);
  - hygiene (`scripts/check-hygiene.mjs`, `scripts/hygiene/**`), and every `package.json` script;
  - every other WP's sources, tests and stories. A defect you find there is a finding in the hand-off, not an edit.
- **`kitty-specs/**`** belongs to the orchestrator, including `design-review.*`. Read it only.

### Subtask T048: Provisional proof-leg timeouts (ruling `01M50K4S90BX5W0M322WYH8SA1`)

**Purpose**: set the matrix `timeout` of each leg this mission extended. Use plan "Proof-leg timeouts" and R-15, with
local measurements standing in for the CI run that does not exist yet.

**Steps**:
0. **A6: re-measure eslint and typecheck on this lane.** WP06, WP08 and WP09 land Svelte and TS sources after WP05
   (typecheck) and WP07 (eslint) recorded their legs, so those two recordings understate the final gate step. Run
   `heavy pnpm gate-proof leg --gate eslint`, then `heavy pnpm gate-proof leg --gate typecheck`, one at a time, in the
   foreground, on this lane. Use these values, not the earlier ones, for those two legs.
1. Collect the recorded local leg times from the earlier WPs' final reports, one per leg:

   | Leg | Plants after (plan "Plants") | Runs (1 + plants) | Recorded by |
   |---|---|---|---|
   | unit-tests | 10 (8 + P-1 + P-7) | 11 | WP06 (after P-7); WP09 if it re-proved P-7 later |
   | typecheck | 5 (4 + P-2) | 6 | WP05 |
   | eslint | 12 (9 + P-3, P-4, P-8) | 13 | WP07 |
   | storybook-build | 2 (1 + P-5) | 3 | WP08 |
   | visual | 1 (P-6, moved) | 2 | WP09 (the last re-proof) |

   Use the latest leg time for each gate, taken on the tree that lands (after WP09's amendments). For example, a WP02
   unit-tests time taken before P-7 existed is stale.
2. **Where a leg time is missing or stale**, measure it on this lane yourself:
   - `heavy pnpm gate-proof leg --gate <gate>`, in the foreground, one leg at a time;
   - record the `gate-proof: <gate> proven (clean 0, planted N, T ms)` line verbatim.

   Do **not** re-run visual (about 37 min) unless WP09's report has no visual leg time. Its timeout is held at 60
   either way (step 5).
3. **Derive the gate step** for each leg as the leg's `durationMs` ÷ its runs, in minutes, to two decimals. Where a WP
   recorded a clean `ciCommand` time, use that and say so. Label every value **local proxy**.
4. **Apply the formula**: timeout = (1 + plants in the leg) × gate step + 2, rounded up to whole minutes, **never below
   the current value**. Projection (R-15):
   - unit-tests (1 + 10) × about 2.7 + 2 = 31.7 → **30 → 32**;
   - typecheck 4.1 → 6, unchanged;
   - eslint 7.85 → 8, unchanged; it rises only if the step exceeds 0.46;
   - storybook-build 2.9 → 8, unchanged.

   If a measured value computes higher than the projection, use the computed value; that is still a matrix-only rise
   (plan "Timeline risks" 5).
5. **Visual is held at 60.** Record its formula value (about 37), but do not apply it. The timeout is never set from
   the formula alone, and it is never lowered (R6-09).
6. **Gate-budget check (NFR-005)**:
   - the unit-tests gate step stays within the 8-minute job budget;
   - the visual gate step stays within the 28-minute job budget.

   Over budget is a **BLOCKED** report to the orchestrator. Never raise a job `timeout-minutes`, which is frozen.
7. Edit only the `timeout:` lines under `jobs.proof-leg.strategy.matrix.include` in `.github/workflows/ci.yml`. Today
   that is one line, unit-tests `timeout: 30` → `timeout: 32`.
8. Update the timeout paragraph of root `README.md` ("Visual baselines" section; T051). Give the #18 values as
   **provisional**, from local measurements, re-derived by the `(landing)` fold from the PR's first CI run.

**Files**: `.github/workflows/ci.yml` (matrix `timeout` values), `README.md` (the timeout paragraph, in T051).

**Validation**:
- This prints only `timeout:` lines, at the matrix indentation:
  `git diff -U0 "$base" -- .github/workflows/ci.yml | grep -E '^[-+] '`
- This is empty:
  `git diff -U0 "$base" -- .github/workflows/ci.yml | grep -E '^[-+] ' | grep -vE '^[-+] {12}timeout: [0-9]+$'`
- The T049 parse comparison prints `matrix unit-tests: 30 -> 32` (or the measured value) and nothing lowered.
- The hand-off has a timings table with these columns: leg, plants, runs, leg ms (source WP), gate step, formula,
  timeout (old → new).

### Subtask T049: Frozen-surface check (SC-004, SC-006; research R-17)

**Purpose**: show that the PR changes 0 lines of the frozen port and bootstrap surface (C-003), and that mission-ui is
byte-unchanged. This is a **one-off command sequence** whose output goes into the PR body. Do **not** commit a new
script: that would add a gate (C-003). Run everything from the lane worktree root, after
`git rev-parse --show-toplevel` confirms it.

**Steps**:
1. **The base and the #17 guard** (R-17, R1-06, R6-06):
   ```bash
   base="$(git merge-base HEAD main)"; export base; echo "base=$base"
   git merge-base --is-ancestor 39a51a6 "$base" && echo "base contains #17 (39a51a6)"
   ```
2. **The file diffs**: the quickstart list verbatim, plus `Cargo.toml`. C-008 puts Rust work out of scope, so
   byte-identity is the strict form of the `[workspace]` table comparison, and needs no TOML parser:
   ```bash
   git diff --exit-code --stat "$base" -- \
     packages/mission-shell/src/index.ts packages/mission-shell/src/testing.ts packages/mission-shell/src/client \
     packages/mission-shell/src/contract/stream.ts packages/mission-shell/src/harness packages/mission-shell/src/Shell.svelte \
     pnpm-workspace.yaml contracts/fixtures packages/mission-ui \
     scripts/gate-proof.mjs scripts/gate-proof scripts/visual.sh \
     apps/storybook/playwright.config.ts apps/storybook/tests/visual ':(exclude)apps/storybook/tests/visual/__snapshots__' \
     eslint.no-io.config.mjs eslint-rules/svelte.mjs gates/no-io.selftest.ts \
     scripts/check-hygiene.mjs scripts/hygiene Cargo.toml \
     && echo "frozen files: 0 changes"
   ```
3. **The baselines** (R5-01): no baseline is modified, deleted or renamed, and only `shell-*.png` files are added:
   ```bash
   git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/ && echo "baselines: MDR none"
   git diff --name-only --diff-filter=A "$base" -- apps/storybook/tests/visual/__snapshots__/ | grep -v '/shell-[^/]*\.png$' ; test $? -eq 1 && echo "added: shell-*.png only"
   ```
4. **The CP-1 record** (SC-007), with set equality:
   ```bash
   d=kitty-specs/mission-shell-01M50D2J
   grep -q 'CP-1 confirmed' "$d/design-review.md" && echo "CP-1 confirmed entry present"
   sha256sum -c "$d/design-review.sha256"
   diff <(git ls-files 'apps/storybook/tests/visual/__snapshots__/shell-*.png' | sort) \
        <(awk '{sub(/^\*/, "", $2); print $2}' "$d/design-review.sha256" | grep '/shell-[^/]*\.png$' | sort) \
     && echo "shell-*.png set equals the approved set ($(git ls-files 'apps/storybook/tests/visual/__snapshots__/shell-*.png' | wc -l))"
   ```
   The count is 11 (`contracts/stories.md`, "Catalogue"). Any other count is a finding.
5. **The parse comparison** (quickstart, "Then IC-09 compares"). Run it from the repository root, so that `yaml`
   (a root devDependency) resolves. `head` defaults to `HEAD`; the reviewer swaps the refs for the negative control.
   ```bash
   node --input-type=module <<'EOF'
   import { execFileSync } from 'node:child_process';
   import { parse } from 'yaml';
   const base = process.env.base, head = process.env.head ?? 'HEAD';
   const show = (ref, p) => execFileSync('git', ['show', `${ref}:${p}`], { encoding: 'utf8' });
   const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
   const problems = [];
   // ci.yml: job ids, needs (all.needs included), timeout-minutes exact, id: gate runs, matrix gates and images
   const B = parse(show(base, '.github/workflows/ci.yml')), H = parse(show(head, '.github/workflows/ci.yml'));
   const inc = (w) => w.jobs['proof-leg'].strategy.matrix.include;
   if (!eq(Object.keys(B.jobs), Object.keys(H.jobs))) problems.push('ci.yml: job ids differ');
   for (const id of Object.keys(B.jobs)) {
     const b = B.jobs[id], h = H.jobs[id] ?? {};
     for (const k of ['needs', 'timeout-minutes']) if (!eq(b[k], h[k])) problems.push(`ci.yml: ${id}.${k} differs`);
     const gate = (j) => (j.steps ?? []).filter((s) => s.id === 'gate').map((s) => s.run);
     if (!eq(gate(b), gate(h))) problems.push(`ci.yml: ${id} 'id: gate' run differs`);
   }
   const bi = inc(B), hi = inc(H);
   if (!eq(bi.map((x) => [x.gate, x.image]), hi.map((x) => [x.gate, x.image]))) problems.push('ci.yml: matrix gates or images differ');
   bi.forEach((x, i) => {
     const t = hi[i]?.timeout;
     if (!(t >= x.timeout)) problems.push(`ci.yml: matrix ${x.gate} timeout lowered (${x.timeout} -> ${t})`);
     else if (t !== x.timeout) console.log(`matrix ${x.gate}: ${x.timeout} -> ${t}`);
   });
   const masked = structuredClone(H);
   inc(masked).forEach((x, i) => { if (bi[i]) x.timeout = bi[i].timeout; });
   if (!eq(B, masked)) problems.push('ci.yml: a change outside the matrix timeout values');
   // plants: ciCommand and prepare unchanged; every base plant retained (gate, overlay targets, token) except the moved visual one
   const ls = (ref) => execFileSync('git', ['ls-tree', '--name-only', `${ref}:gates/plants`], { encoding: 'utf8' }).trim().split('\n');
   const plants = (ref, g) => [].concat(JSON.parse(show(ref, `gates/plants/${g}/plant.json`)));
   const key = (p) => JSON.stringify([p.gate, (p.overlays ?? []).map((o) => o.target).sort(), p.expectFailPattern]);
   const bind = (p) => JSON.stringify([p.ciCommand, p.prepare ?? null]);
   const MOVED = 'mission-sample--ready-diff.png';
   const EXPECT = { 'unit-tests': 10, typecheck: 5, eslint: 12, 'storybook-build': 2, visual: 1 };
   if (!eq(ls(base), ls(head))) problems.push('plants: the set of plant gates differs');
   for (const g of ls(base)) {
     const bp = plants(base, g), hp = plants(head, g);
     const want = new Set(bp.map(bind)), have = new Set(hp.map(key));
     for (const p of hp) if (!want.has(bind(p))) problems.push(`plants: ${g} ciCommand or prepare changed (${p.expectFailPattern})`);
     for (const p of bp) if (!(g === 'visual' && p.expectFailPattern === MOVED) && !have.has(key(p))) problems.push(`plants: base plant dropped: ${key(p)}`);
     if (hp.length !== (EXPECT[g] ?? bp.length)) problems.push(`plants: ${g} has ${hp.length}, expected ${EXPECT[g] ?? bp.length}`);
     console.log(`plants ${g}: ${bp.length} -> ${hp.length}`);
   }
   // gate scripts: the root list of R-17, every package's test and typecheck, apps/storybook's scripts
   const ROOT = ['typecheck', 'lint', 'lint:styles', 'lint:no-io', 'test:no-io', 'lint:data-driven', 'test:data-driven',
     'manifest:check', 'hygiene', 'test:scripts', 'test:terminology', 'test', 'build-storybook', 'storybook:build-only',
     'visual', 'contract:check', 'test:contract'];
   const scripts = (ref, p) => JSON.parse(show(ref, p)).scripts ?? {};
   for (const s of ROOT) if (scripts(base, 'package.json')[s] !== scripts(head, 'package.json')[s]) problems.push(`scripts: root ${s} differs`);
   const pkgs = execFileSync('git', ['ls-tree', '-r', '--name-only', base, '--', 'packages', 'apps'], { encoding: 'utf8' })
     .split('\n').filter((p) => /^(packages|apps)\/[^/]+\/package\.json$/.test(p));
   for (const p of pkgs) {
     const b = scripts(base, p), h = scripts(head, p);
     const bad = p === 'apps/storybook/package.json' ? !eq(b, h) : ['test', 'typecheck'].some((k) => b[k] !== h[k]);
     if (bad) problems.push(`scripts: ${p} differs`);
   }
   console.log(`scripts: ${ROOT.length} root, ${pkgs.length} package files compared`);
   if (problems.length) { console.log(problems.join('\n')); process.exit(1); }
   console.log('frozen-surface parse comparison: OK');
   EOF
   ```
   Expected: `matrix unit-tests: 30 -> 32` (or the measured value); plant counts `unit-tests: 8 -> 10`,
   `typecheck: 4 -> 5`, `eslint: 9 -> 12`, `storybook-build: 1 -> 2` and `visual: 1 -> 1`; every other gate is
   unchanged; `3 package files compared`; then the OK line. The script reads
   both trees with `git show`, so commit before running it. Uncommitted edits are invisible to it.
6. Capture the whole sequence (steps 1 to 5) with its output, verbatim, as the **frozen-surface output** for the hand-off
   (T052). Any non-zero exit is a finding to report. Do not paper over it.

**Files**: none (read-only checks).

**Validation**: every step prints its success line. Step 5 exits 0 and prints the expected deltas, which shows it read
the mission's changes and is not vacuous. The negative control is in "Reviewer Guidance".

### Subtask T050: `packages/mission-shell/README.md`, the shell

**Purpose**: the package README is what #20 and #21 read to mount the shell (SC-005). It documents the `./shell` entry
from `contracts/shell-api.md`, without restating rules that live in the contracts.

**Steps**:
1. Leave the #17 sections **as written**: "The port: `MissionStatusClient`", "The fixture adapter" and "Binding the
   screens". Update only the intro paragraph. "Real routing and layout arrive in `#18`" becomes a sentence saying #18
   delivers the shell on `./shell`. Also give the test commands: `logic` (Node, browser disabled) and `unit` (Chromium)
   (quickstart "Commands").
2. Add a section **"The shell: `@moes-media/mission-shell/shell`"**, after the intro and before the port section, with
   these subsections:
   - **Entries.** `.` stays port-only, `./testing` is unchanged (the fixture adapter), and `./shell` is new (ruling
     `01M50K4K059HSWKGA56KV7KNJC`). `test/package.test.ts` pins exactly these three.
   - **Host prerequisites**, from shell-api "Host prerequisites":
     - the `@spec-kitty/tokens` CSS and fonts;
     - `data-theme` on `document.documentElement`;
     - a Svelte-capable bundler, for example Vite with `@sveltejs/vite-plugin-svelte`;
     - no host action for the `sk-*` elements.
   - **Mounting.** Use the quickstart's `mountShell(target, options)` example, and list `setRoute`, `setClient(client,
     route?)` and `destroy`. Mention `<MissionShell {client} {mode} {route} {host} />` for Svelte hosts. Then list
     `ShellOptions` (`client`, `host`, `mode`, `route`, `scheduler`, `clock`, `copy`), one line each, from the
     contract.
   - **Routes.** Give R-02's destination → route table, the "unknown route parses to Missions" rule, and the
     `/projects` dashboard rule. Describe `routeChanged`: called after the shell's own navigation, called once with
     the canonical route for a non-canonical host route, and never echoed.
   - **Refresh policy (summary).** The shell reads only through the port and keeps one unscoped subscription. Changes
     re-read only the displayed resources they affect, coalesced per 100 ms window. `resync` re-reads the displayed
     set. The Refresh button appears only on Artifact and Ops (FR-016). Point to `data-model.md` and
     `contracts/refresh-policy.md` in `kitty-specs/mission-shell-01M50D2J/` for the table. Do not copy it.
   - **Connection presentation.** Give the five conditions with their titles and tones from
     `contracts/connection-presentation.md`, **as confirmed or amended at CP-1** (check `design-review.md`). Include
     the 1 s reconnecting grace, and the `copy` override of the two degraded bodies.
   - **Host interface obligations.** Give every `ShellHost` member and its fallback when absent or throwing (NFR-007).
     Copy `openExternalLink`'s obligations verbatim from the contract: the host **MUST** re-validate the scheme
     (case-insensitively), **MUST NOT** navigate its own window or webview, and **SHOULD** show the destination
     first. Dashboard mode never shows desktop-only actions (FR-015).
   - **What a host can rely on**, from shell-api "Behaviour a host can rely on":
     - no I/O;
     - exactly one subscription, one connection listener and one refocus listener, all released on `destroy` and
       `setClient`;
     - never throws;
     - the out-of-scope list (C-008).
3. Use repository-relative paths and the domain language ("Mission", "Work Package"). Keep the banned synonym of
   "mission" out (the terminology gate scans docs).

**Files**: `packages/mission-shell/README.md`.

**Validation**:
- `git diff "$base" -- packages/mission-shell/README.md` shows the #17 port, fixture and binding sections unchanged.
- Every API name in the new section exists in `src/shell.ts` (check each with `grep`). A name that is documented but
  not exported is a defect.
- `pnpm hygiene` and `pnpm test:terminology` are green.

### Subtask T051: Root `README.md` and `CHANGELOG.md`

**Purpose**: the repository-level record of #18: where the shell sits, what the gates now cover, and the provisional
timeouts.

**Steps**:
1. **`README.md`, "Host workspace" → "Layout"**: the `packages/mission-shell` line names the shell (`./shell`), and
   points to the package README.
2. **`README.md`, "Gates" table**: rows exist, so update their "What it checks" text only. Leave the gate ids and local
   commands exactly as they are (C-003):
   - `Gate: unit-tests`: the mission-shell part gains the `logic` project (Node: routes, the refresh engine, the
     controller, host wrappers) and the Chromium shell tests (mounted routing, banners, bindings);
   - `Gate: typecheck`: the intent coverage check types (SC-001);
   - `Gate: eslint`: the shell I/O-globals, markup and layering blocks (IC-07);
   - `Gate: storybook-build` and `Gate: visual`: the story and baseline counts. Count them from the built
     `index.json` or the tree; do not copy a number. Expect 330 + 11 = 341.
3. **`README.md`, "Visual baselines"**: add the #18 sentence on the timeouts (T048, step 8). Leave the #17 numbers as
   history.
4. **`CHANGELOG.md`, "Unreleased" → "Added"**: one entry for `#18`, written like #17's. It says what was missing
   before and what a host can now do, then lists:
   - the `./shell` entry, `mountShell` and `MissionShell`, with `.` port-only;
   - the routes and destinations;
   - the refresh engine (displayed-set re-reads, coalescing, stale-while-revalidate);
   - the five banners and the Refresh button, approved at CP-1;
   - the host interface with its link-safety obligations, and the two modes;
   - the intent table and its type-level coverage check;
   - the shell lint blocks;
   - eleven stories with baselines, the moved visual plant, and seven new plants;
   - no new dependency version (R-16);
   - the provisional unit-tests proof timeout (30 → 32, pending the `(landing)` fold).
5. No local paths, usernames or tooling-ledger ids. Use issue numbers in backticks, as the existing entries do.

**Files**: `README.md`, `CHANGELOG.md`.

**Validation**:
- `git diff "$base" -- README.md` touches only the lines above. The gate ids and commands in the table are unchanged.
- `pnpm hygiene`, `pnpm test:scripts` and `pnpm test:terminology` are green.

### Subtask T052: PR-body inputs (orchestrator hand-off)

**Purpose**: the PR body is the orchestrator's (plan "PR shape"). WPs never push or open PRs. This subtask collects
every input into the final report, ready to paste. Write nothing under `kitty-specs/`.

**Steps**: put these sections in the final report, in this order:
1. **Frozen-surface output**: T049 steps 1 to 5, the commands and their output verbatim, with the base SHA.
   - Also paste `git diff "$base" -- gates/markdown-lint.selftest.ts` verbatim: the one granted line of WP07 (A4,
     plan "Decisions"). Its `--numstat` must be `1	1`.
2. **Design review** (SC-007): the `design-review.md` content copied verbatim (the dated `CP-1 confirmed` entry and
   any amendments), plus the `sha256sum -c` output and the set-equality line.
3. **Supply chain** (R-16, NFR-006): the R-16 table, with the evidence below.
   - Evidence: `git diff "$base" -- pnpm-lock.yaml` touches only the `apps/storybook:` importer.
   - Evidence: a `yaml` parse shows the lockfile's `packages` and `snapshots` key sets are equal at the base and at
     `HEAD`, and `allowBuilds` is unchanged. Use the same `node --input-type=module` pattern, and print the key
     counts.
   - Name the three declared dependencies with their versions and publish dates: `@moes-media/mission-shell`
     `workspace:*`, `svelte` 5.57.1, and `@sveltejs/vite-plugin-svelte` 6.2.4.
4. **Timings**: T048's table (local proxy). State that the values are provisional, and that a post-PR `(landing)`
   fold re-derives them from the PR's first CI run (ruling `01M50K4S90BX5W0M322WYH8SA1`). Include the NFR-005
   budget lines.
5. **Rulings**: the seven rows of plan "Decisions", by decision id, topic and ruling.
6. **Issue acceptance**: plan's "Issue #18 acceptance → requirements" table. Add a "shown by" column naming the test
   file, plant (P-n) or story that proves each row. A row that nothing shows is a finding.
7. **Exceptions**: none. **No stories boundary exemption exists** (R4-07, plan "Charter Check"). The ESLint boundary
   block is unchanged.
8. **SC-005**: deferred, not failed. It is checked at the #20 and #21 plan reviews: those hosts mount the shell with
   only their adapter and host interface, and make 0 changes to `contracts/shell-api.md`'s surface.
9. **Out-of-map edits across the mission**: the tasks-notes table, confirmed against `git diff --name-only "$base"`.
   List any changed file that no WP owns and no row covers, as a finding.
10. **Follow-ups**: from tasks-notes ("Follow-ups outside this mission"). The SO-DES-017 gate-proof cost
    architecture is still open, and this mission adds two unit-tests runs. File nothing.

**Files**: none (the final report).

**Validation**: every section above is present and none is empty. The acceptance table has a "shown by" entry on every
row.

## Plants

None. This WP adds no gate behaviour. Its `ci.yml` edit changes timeout values only, which the T049 parse comparison
proves. The mission's plants (P-1 to P-8) were proven by WP02, WP05, WP06, WP07, WP08 and WP09, and T048 reuses their
recorded leg times.

## Exit checks

- [ ] T048: every extended leg has a leg time (recorded or measured with `heavy pnpm gate-proof leg --gate <gate>`,
      in the foreground, one at a time), a gate step and a formula value. The applied timeouts never fall below the
      current values, and visual is held at 60.
- [ ] The `ci.yml` diff against `$base` is only `timeout:` lines at the matrix indentation (T048 validation).
- [ ] T049 runs green end to end:
  - [ ] the #17 ancestor guard;
  - [ ] the frozen file diff, including `Cargo.toml`;
  - [ ] the baseline `--diff-filter=MDR` diff, and the added-files check;
  - [ ] the `CP-1 confirmed` entry, `sha256sum -c` and set equality (11 files);
  - [ ] the parse comparison, which exits 0 and prints the expected deltas.
  - [ ] The output is captured verbatim for the PR body.
- [ ] `pnpm hygiene`, `pnpm test:scripts` and `pnpm test:terminology` are green. No local path, username or
      tooling-ledger id is in any tracked file.
- [ ] `pnpm lint` is green. The hygiene workflow checks still pass over the edited `ci.yml`: action pins, permissions,
      checkout credentials and safe triggers. No new action, and no new workflow file.
- [ ] `git diff --name-only "$base" -- .github` lists only `.github/workflows/ci.yml`.
- [ ] `git diff --name-only HEAD~N..HEAD` over this WP's commits lists only the four owned files.
- [ ] The final report has all ten T052 sections.
- [ ] Each subtask is marked: `spec-kitty agent tasks mark-status T048 --status done` (and T049, T050, T051, T052).
- [ ] Every `heavy` command ran in the foreground, nothing is left running, and nothing was pushed, opened or commented.

## Definition of Done

- **Timeouts**:
  - The unit-tests proof leg is raised to its formula value (projected 32), and every other extended leg is at or
    above its current value.
  - Visual is held at 60, with its formula value recorded.
  - Everything is labelled provisional, pending the `(landing)` fold.
  - No job `timeout-minutes`, job id, `needs`, `id: gate` command, matrix gate, image or `all.needs` changed.
- **Frozen surface**: T049's sequence is green, and its output is in the hand-off. It covers SC-004 (0 changes to the
  C-003 surface against the #17 merge) and SC-006 (mission-ui byte-unchanged; the gates and plants retained).
- **Docs**:
  - The package README documents `./shell` (entries, prerequisites, mounting, routes, refresh summary, connection
    presentation, host obligations with the MUST and SHOULD wording) and keeps the #17 sections as written.
  - The root README's layout, gates rows and timeout paragraph are updated.
  - The CHANGELOG has the #18 entry.
- **Evidence**: the hand-off carries every PR-body input of T052. That includes the verbatim design-review section
  (SC-007), the supply-chain evidence (NFR-006), the rulings, the acceptance table with proofs, the no-exemption note
  and the SC-005 deferral.

## Risks

- **Stale leg times.** A time taken before WP09's amendments, or before P-7 existed, understates the leg. Use the
  latest, or re-measure (T048 step 2).
- **Lowering by accident.** A local machine faster than the CI runner can compute a value below the current one. The
  rule never lowers a timeout. The parse comparison fails on any drop.
- **Formula on visual.** The formula gives about 37 against today's 60. Applying it would break R6-09.
- **A "small" extra `ci.yml` edit.** Indentation, a comment or a reordered key all break C-003. The masked deep-equality
  and the `-U0` grep catch these.
- **Unparsed refs.** The parse script reads committed trees only. Run it after committing, or it checks the previous
  commit.
- **Docs drift from the contract.** Copy API names and obligations from `contracts/shell-api.md` and the exported
  `src/shell.ts`; never paraphrase MUST or SHOULD. Banner copy follows CP-1's outcome, not the pre-CP-1 contract text,
  where they differ.
- **Committing the check.** A script under `scripts/` or `gates/` would extend the gate set (C-003). Keep the sequence
  in the hand-off only.
- **CP-1 reopened.** If the lane's history touches `shell-*.png` after WP09, CP-1 reopens (plan IC-08b). Stop and
  report; do not re-hash.

## Reviewer Guidance

- **Re-run T049 yourself** on the lane tip (plan "PR shape": the reviewer repeats it), and compare it with the
  hand-off's output line by line.
- **Non-vacuity of the parse comparison**:
  - **Positive control**: the run prints `matrix unit-tests: 30 -> 32` and the plant deltas (unit-tests 8 → 10,
    typecheck 4 → 5, eslint 9 → 12, storybook-build 1 → 2). So it reads both trees.
  - **Negative control**: swap the refs. `head="$base" base=HEAD node --input-type=module <<'EOF' …` must exit 1 and
    report at least the lowered matrix timeout, and the dropped plants P-1, P-2, P-3, P-4, P-5, P-7 and P-8.
  - **Mutation check**: on a scratch commit that you then discard, change one job `timeout-minutes`. Confirm the
    script names it. Never leave the commit in the lane.
- **Re-derive two timeouts** from the recorded leg times, for example unit-tests and eslint, and check the rounding and
  the never-lower rule. Confirm visual is 60 and that its formula value is recorded.
- **`ci.yml` diff**: `git diff -U0 "$base" -- .github/workflows/ci.yml` shows only `timeout:` lines inside the matrix.
- **Docs**:
  - Spot-check five API names in the package README against `src/shell.ts`.
  - Confirm the `openExternalLink` MUST, MUST NOT and SHOULD wording matches `contracts/shell-api.md`.
  - Confirm the #17 sections are byte-unchanged.
  - Confirm the banner copy matches the CP-1 outcome.
- **Evidence**:
  - The acceptance table's "shown by" entries name real tests or plants.
  - The design-review section is verbatim.
  - The supply-chain lockfile key-set comparison was actually run, with its key counts.
  - The SC-005 line says "deferred", not "passed".
- **Ownership**: this WP's commits touch only the four owned files, and nothing under `kitty-specs/`.

## Implementation command

`spec-kitty agent action implement WP10 --agent claude`
