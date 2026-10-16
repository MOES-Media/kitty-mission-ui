---
work_package_id: WP01
title: Destinations, routes and displayed sets (with the Node test project)
dependencies:
- WP07
requirement_refs:
- FR-001
- FR-002
- FR-015
- NFR-007
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement
  this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless
  the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/src/core/routes.ts
- packages/mission-shell/src/core/displayed.ts
- packages/mission-shell/test/logic/routes.test.ts
- packages/mission-shell/test/logic/sentinel.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/vitest.config.ts
- packages/mission-shell/test/setup/**
- packages/mission-shell/src/core/routes.ts
- packages/mission-shell/src/core/displayed.ts
- packages/mission-shell/test/logic/routes.test.ts
- packages/mission-shell/test/logic/sentinel.test.ts
role: implementer
tags: []
tracker_refs: []
---

# WP01 — Destinations, routes and displayed sets (with the Node test project)

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Build the pure model of where a user can be in the shell (plan IC-01): the `Destination` union, the route grammar
with defensive decoding (`formatRoute` / `parseRoute`), and the displayed-resource sets (`ResourceKey`,
`displayedSet`, `ofMission`). Alongside it, split the shell's Vitest configuration into a Node `logic` project and the
existing Chromium `unit` project, each with a setup file that fails the run on any uncaught error (NFR-007).

## Context

- **Why first.** Every later WP stands on this one. The refresh engine (WP02, IC-02) consumes `ResourceKey`,
  `displayedSet` and `ofMission`; the controller (IC-03) consumes `parseRoute`, `formatRoute` and the canonical-route
  report for `routeChanged`; the view (IC-06) renders `href`s and re-exports `formatRoute`, `parseRoute`,
  `Destination` and `ShellMode` from `src/shell.ts`. Every Node test written later lands in `test/logic/**` and runs in
  the project created here.
- **Dependencies.** WP07 (A3): the shell lint blocks (I/O globals, markup, layering) land first, so every file written
  here is linted by them from the start (plan IC-07, "It lands first"). The base already carries #17 (port, fixture
  adapter, `Shell.svelte`, the Chromium `unit` project).
- **Read first** (authoritative; cite, do not re-derive):
  - `plan.md`: IC-01, "Testing" in Technical Context, "Shared-file ownership" (`vitest.config.ts` is owned by IC-01,
    requested by IC-03 and IC-06), "Plants" (P-1, ruling `01M50K4NSNYD9TEQ12T4J7KVHT`), Timeline risk 6.
  - `research.md`: R-01 (layering: `core/` is plain TypeScript, no Svelte, no DOM), R-02 (route grammar, decoding,
    round trip, `href`, `routeChanged`), R-03 (WP-none and Artifacts-none), R-04 (displayed resources, "of Mission M",
    "the Missions list"), R-10 (modes, the dashboard with `client: null`), R-15 (the `logic` project and its sentinel).
  - `data-model.md`: "Destination" (table and invariants), "ResourceKey and the displayed set" (both tables and the
    FS-12 footnote).
  - `contracts/shell-api.md`: the `formatRoute`, `parseRoute`, `Destination` and `ShellMode` signatures.
  - `contracts/refresh-policy.md`: the recording uses the key notation fixed here (`mission:M`, `wp:M/WP02`,
    `drift:*`, `artifact:M:P`), and its Node set-up runs in the project created here.
  - `reviews/plan.squad.md`: R1-04, R3-02, R3-03, R5-10, R5-11, FS-10, FS-12.
- **Key decisions already made** (do not reopen):
  - Routes are path-like strings; `href = '#' + route`; the shell never navigates its window (R-02).
  - Decoding failure, an id that misses its contract pattern, or an artifact path that misses `ArtifactPath` makes the
    route unknown; unknown parses to Missions (R3-02).
  - The round trip compares parsed destinations, not strings (R3-03).
  - `missions` (the Missions screen's page chain) and `mission-names` (Drift's page-1 name lookup) are different keys;
    only `missions` is "the Missions list" of the refresh policy (R1-04).
  - The `logic` project has `browser: { enabled: false }`, `environment: 'node'` and a `typeof window === 'undefined'`
    sentinel (R5-10). Both projects fail on uncaught errors and nothing swallows them (R5-11, NFR-007).

## Ownership

**Owned files** (the frontmatter is authoritative; stage only these):
- `packages/mission-shell/vitest.config.ts`
- `packages/mission-shell/test/setup/**`
- `packages/mission-shell/src/core/routes.ts`
- `packages/mission-shell/src/core/displayed.ts`
- `packages/mission-shell/test/logic/routes.test.ts`
- `packages/mission-shell/test/logic/sentinel.test.ts`

**Out-of-map edits**: none.

A change you need in a file you do not own is a **change request** in the hand-off (file, change, reason), not an
edit. In particular, `src/shell.ts` and `package.json` `exports` belong to IC-06, which re-exports this WP's route
helpers; do not create them here.

**Do not touch** (frozen surface, research R-17; plan "Constraints"):
- `packages/mission-shell/src/index.ts`, `src/testing.ts`, `src/client/**`, `src/contract/stream.ts`,
  `src/harness/**`, `src/Shell.svelte` (the port and #17 shell internals, C-003, FS-07);
- `contracts/fixtures/*` and `contracts/spec-kitty/**` (read only: T003 reads `ArtifactPath.yaml`);
- `packages/mission-ui/**` (C-002; `git diff --exit-code <base> -- packages/mission-ui` stays empty);
- gate wiring: `.github/workflows/ci.yml`, every `gates/plants/**` file, `scripts/gate-proof*`, `scripts/visual.sh`,
  `scripts/check-hygiene.mjs`, `scripts/hygiene/**`, `eslint.no-io.config.mjs`, and every package's `test` and
  `typecheck` scripts. The shell's `test` script stays `vitest run`; the new project is reached through the config,
  not through a script change.

## Subtasks

### Subtask T001: The `logic` (Node) and `unit` (Chromium) Vitest projects, setup files and sentinel

**Purpose**: give the shell a Node test project for core and controller logic (the proof-leg cost lever, plan
"Complexity Tracking", research R-15), keep the existing Chromium project for mounted tests, and make both fail on any
uncaught error (NFR-007, R5-11). WP01 creates **both** setup files now so that IC-03 and IC-06, which plan
"Shared-file ownership" lists as requesters of `vitest.config.ts`, need no edit to it.

**Steps**:
1. Restructure `packages/mission-shell/vitest.config.ts` into two named projects, keeping the Svelte plugin and
   `attachmentsDir`:
   - `unit`: the current browser block unchanged (Playwright provider, headless Chromium, `screenshotFailures: false`),
     `include: ['test/**/*.test.ts']`, `exclude` adding `test/logic/**` (keep Vitest's default excludes, for example by
     spreading `configDefaults.exclude`), `setupFiles: ['test/setup/browser.ts']`.
   - `logic`: `include: ['test/logic/**/*.test.ts']`, `environment: 'node'`, `browser: { enabled: false }` stated
     explicitly (not merely inherited), `setupFiles: ['test/setup/node.ts']`.
   - Place the browser block on the `unit` project (or make sure `logic` does not inherit an enabled browser through
     `extends: true`). Read the Vitest 4.1.11 projects documentation in `node_modules` before choosing; do not add a
     package or change a version (research R-16).
2. `packages/mission-shell/test/setup/node.ts`: register `process.on('unhandledRejection', …)` and
   `process.on('uncaughtException', …)` handlers that **fail the run**: record the error and throw it from an
   `afterEach` (so the test that caused it fails with the original error), and never return silently. Do not
   install a handler that only logs. Register each handler once (guard against double registration if the file is
   evaluated per test file).
3. `packages/mission-shell/test/setup/browser.ts`: `window.addEventListener('error', …)` and
   `window.addEventListener('unhandledrejection', …)` listeners that record the event's error or reason; an `afterEach`
   throws the first recorded error and clears the list. Do not call `preventDefault()`: Vitest's own unhandled-error
   reporting must keep working too.
4. `packages/mission-shell/test/logic/sentinel.test.ts`: one test asserting `typeof window === 'undefined'` and, as
   its positive twin in the same file, `typeof process.versions.node === 'string'`. This is the R5-10 guard against
   the `logic` project silently running in the browser.
5. Confirm the existing tests (`binding`, `fixture-client`, `package`, `port-coverage`, `stream`) still run under
   `unit` with unchanged counts; record both projects' counts.
6. **Fallback** (plan Timeline risk 6, FS-10): if a Node project and a browser project cannot coexist in this config
   on Vitest 4.1.11, `logic` runs in Chromium instead, the sentinel test is **dropped** (it would fail there), and the
   hand-off reports the fallback with the error that forced it, so IC-09 re-derives the unit-tests leg time and
   timeout. Do not take the fallback without that recorded error.

**Files**: `packages/mission-shell/vitest.config.ts`, `packages/mission-shell/test/setup/node.ts`,
`packages/mission-shell/test/setup/browser.ts`, `packages/mission-shell/test/logic/sentinel.test.ts`.

**Validation**:
- `heavy pnpm --filter @moes-media/mission-shell test` lists both project names in its output, with the sentinel
  passing under `logic` and the #17 tests under `unit`.
- Revert check per setup file (temporary, never committed): a throwaway test doing
  `Promise.reject(new Error('setup-probe'))` without awaiting it makes the run fail in that project; record the failing
  line, then delete the probe.
- Counts are equality: report the exact number of tests per project.

### Subtask T002: The `Destination` union, `formatRoute` and `parseRoute`

**Purpose**: one place that defines every place the shell can show and its route string (FR-001 model, FR-002,
FR-015 for `/projects` on the dashboard), following research R-02 and `data-model.md` "Destination".

**Steps**:
1. In `src/core/routes.ts` (plain TypeScript; no `svelte`, no DOM, no `@moes-media/mission-ui` runtime import, R-01),
   declare `export type ShellMode = 'desktop' | 'dashboard'` (identical to `contracts/shell-api.md`; IC-06 re-exports
   it from `src/shell.ts`, which core cannot import because it imports Svelte).
2. Declare `Destination`, discriminated by `screen`, exactly as the data-model table:
   - `{ screen: 'missions' }`, `{ screen: 'ops' }`, `{ screen: 'projects' }`;
   - `{ screen: 'drift'; missionId?: string }`;
   - `{ screen: 'pipeline'; missionId: string }`;
   - `{ screen: 'work-packages'; missionId: string; wpId?: string }`;
   - `{ screen: 'artifacts'; missionId: string; path?: string }`.
   Optional identifiers are **absent**, never `undefined` (the base tsconfig has `exactOptionalPropertyTypes`, and the
   round trip uses deep equality). Export a `LAYOUT` mapping (`project` / `mission` / `picker`) per screen for IC-06.
3. `formatRoute(destination): string` produces exactly the R-02 table: `/missions`, `/drift`, `/drift/{missionId}`,
   `/ops`, `/missions/{missionId}`, `/missions/{missionId}/work-packages[/{wpId}]`,
   `/missions/{missionId}/artifacts[/{encodeURIComponent(path)}]`, `/projects`. The artifact path is one segment, so
   its slashes encode as `%2F`.
4. `parseRoute(route, mode): Destination` (signature from `contracts/shell-api.md`):
   - split on `/`; the route must start with `/` and match one grammar row exactly. An empty segment, an extra
     segment, a trailing slash or any other shape is unknown;
   - unknown → `{ screen: 'missions' }`;
   - `/projects` → `{ screen: 'projects' }` on the desktop, `{ screen: 'missions' }` on the dashboard (FR-015);
   - decoding and id validation follow T003.
5. `routeHref(destination) = '#' + formatRoute(destination)` (R-02 `href`): navigation items and tree rows use it;
   the elements call `preventDefault()` and emit `sk-navigate`.
6. Document on `parseRoute` (JSDoc), for the controller (IC-03, IC-04), the **null-client rules** this pure module
   does not apply itself (`data-model.md` "Destination" invariants, R-10): with `client = null`, the only desktop
   destination is `projects`; on the dashboard the project layout shows the shell `error` "No project is open." with
   no reads and no throw. The default route is `/missions`, or `/projects` with a null client on the desktop
   (`data-model.md` "ShellOptions").
7. A well-formed Mission id that does not exist is **not** a routing concern: it parses normally, and its reads
   produce the refusal or `not-found` view (spec edge cases; IC-03). Say so in a comment.

**Files**: `packages/mission-shell/src/core/routes.ts`.

**Validation**: T005's round-trip and unknown-route tests; `pnpm --filter @moes-media/mission-shell typecheck` clean.

### Subtask T003: Defensive decoding, contract patterns and the canonical-route report

**Purpose**: a route string from a host or a deep link is untrusted input. Decoding must never throw, ids must meet
their contract patterns, and an artifact path must meet `ArtifactPath` (R3-02). The controller needs to know whether a
host route was canonical so it fires `routeChanged` once with the canonical form and never echoes (R-02, R3-03).

**Steps**:
1. Decode each segment with `decodeURIComponent` inside `try`/`catch`; a `URIError` makes the route unknown. Catch
   only around the decode call, nothing wider: a programming error elsewhere must still surface (R5-11).
2. Id patterns, copied from the contract schemas in `contracts/spec-kitty/mission-status/schemas/`:
   - `MissionId.yaml`: `^[0-9A-HJKMNP-TV-Z]{26}$` (Crockford ULID, uppercase only);
   - `WpId.yaml`: `^WP[0-9]{2,}$` with `maxLength` 64.
   A segment that misses its pattern makes the route unknown.
3. `ArtifactPath` (`contracts/spec-kitty/mission-status/schemas/ArtifactPath.yaml`): export
   `ARTIFACT_PATH_PATTERN` as the **string** copied character for character from the YAML `pattern`, plus
   `ARTIFACT_PATH_MIN_LENGTH = 1` and `ARTIFACT_PATH_MAX_LENGTH = 512`. Compile it once with `new RegExp(…, 'u')`.
   Count length in code points (`[...path].length`), as JSON Schema does, not UTF-16 units. A decoded path that fails
   the pattern or the length makes the route unknown.
4. The copy test (in T005, Node project): read `ArtifactPath.yaml` from the repository with `node:fs` and the
   existing root `yaml` package (no new dependency), and assert `pattern`, `minLength` and `maxLength` equal the
   exported constants. Tests reading files sit outside `src/`, so outside no-io (R-02). If `node:fs` types do not
   resolve under the shell's `svelte-check`, Vite's `?raw` import of the YAML is an acceptable equivalent; record
   which you used. Add the same copy assertion for the two id patterns.
5. Canonical re-encoding (R3-03): `formatRoute` always emits the canonical form (`encodeURIComponent` output, so
   uppercase hex such as `%2F`). A non-canonical input (`%2f`, or `%20` vs another encoding that decodes to the same
   path) parses to the same destination.
6. Export `normaliseRoute(route, mode): { destination: Destination; route: string; canonical: boolean }`, where
   `route = formatRoute(destination)` and `canonical` is `route === input`. An unknown route is non-canonical (its
   canonical form is `/missions`). The controller (IC-03) fires `routeChanged(route)` exactly when `canonical` is
   false for a host-set route; this module fires nothing.

**Files**: `packages/mission-shell/src/core/routes.ts`.

**Validation**: T005's negatives (`%`, `..%2F`, `%2F`, `%00`) each parse to Missions, each paired with a positive
control; the YAML copy test passes and fails when one character of the exported pattern is changed (revert check).

### Subtask T004: `ResourceKey`, `displayedSet` and `ofMission`

**Purpose**: the mechanical answer to "what does this destination read" and "is this resource of Mission M"
(research R-04), which the refresh policy (WP02) and the controller's slots (IC-03) depend on.

**Steps**:
1. In `src/core/displayed.ts`, declare `ResourceKey` as a discriminated union by `kind`, carrying the read parameters:
   `project`; `missions`; `mission-names`; `mission` (`missionId`); `wp` and `wp-detail` (`missionId`, `wpId`);
   `artifacts` (`missionId`); `artifact` (`missionId`, `path`); `drift` (`missionId` or absent for the whole
   project); `ops`. Each kind's port read is the `data-model.md` table ("Port read" column).
2. `keyString(key): string` gives exactly the data-model notation: `project`, `missions`, `mission-names`,
   `mission:{M}`, `wp:{M}/{W}`, `wp-detail:{M}/{W}`, `artifacts:{M}`, `artifact:{M}:{P}`, `drift:{M}` or `drift:*`,
   `ops`. The controller keys slots by it, and WP02's recording and P-1 token (`refresh-policy mismatch on missions`)
   use this notation, so do not invent a variant.
3. Keep `missions` and `mission-names` distinct, with a doc comment: `missions` is the Missions screen's page chain
   and **is** "the Missions list" of the refresh policy; `mission-names` is Drift's `listMissions({})` page-1 lookup
   and **never** is (R1-04).
4. `displayedSet(destination): { policy: readonly ResourceKey[]; explicit: readonly ResourceKey[] }`, the two columns
   of the `data-model.md` table, row for row, in that order:
   - Missions: policy `project`, `missions`; explicit none.
   - Drift (scope S): policy `project`; explicit `drift:{S}`, `mission-names`.
   - Ops: policy `project`; explicit `ops`.
   - Pipeline M: policy `mission:{M}`; explicit none.
   - Work Packages M, W: policy `mission:{M}`, `wp:{M}/{W}`, `wp-detail:{M}/{W}`; explicit none.
   - Work Packages M, none: policy `mission:{M}`; explicit none (R-03).
   - Artifacts M, P: policy `mission:{M}`; explicit `artifacts:{M}`, `artifact:{M}:{P}`.
   - Artifacts M, none: policy `mission:{M}`; explicit `artifacts:{M}` (R-03).
   - Projects: both empty (host data).
   Also export `displayedKeys(destination)`, the union of both columns. Put the **FS-12 footnote** on the function as
   documentation: the policy column names only the two status changes; `log-truncated` (M) re-reads every displayed
   key of M, explicit ones included; `resync` re-reads every displayed key of both columns. Which policy-column key a
   given change re-reads is decided by the refresh policy (WP02; for example a status change never re-reads
   `project`), not here.
5. `ofMission(key, missionId): boolean`: true exactly when the key's read parameters carry `missionId === M`
   (`mission`, `wp`, `wp-detail`, `artifacts`, `artifact`, and `drift` with that scope); false for `project`,
   `missions`, `mission-names`, `ops` and `drift:*` (R-04).

**Files**: `packages/mission-shell/src/core/displayed.ts`.

**Validation**: T005's displayed-set and `ofMission` tests; typecheck clean.

### Subtask T005: Route and displayed-set tests (Node project)

**Purpose**: prove FR-002's round trip and unknown-route rule, R3-02's negatives, FR-015's dashboard `/projects`, and
the displayed sets, in the `logic` project.

**Steps** (all in `packages/mission-shell/test/logic/routes.test.ts`; ids are a valid ULID `M` such as
`01JZAB3C4D5E6F7G8H9JKMNPQR` (the `contracts/refresh-policy.md` Mission), another valid ULID `O`, and paths that
`ArtifactPath` accepts, including its own examples `tasks/WP01-example.md`, `spec.md` and `notes/with space.md`):
1. **Round trip over parsed destinations** (R3-03): a literal list with at least one destination per data-model row
   (every `screen`, both Drift forms, both Work Packages forms, both Artifacts forms, nested and spaced paths). For
   each, `parseRoute(formatRoute(d), 'desktop')` deep-equals `d`. Assert the loop ran exactly N times (equality, the
   length of the literal list), and that the list covers every `screen` value (a set comparison against a literal of
   the seven screens).
2. **Literal route strings**: `formatRoute` of each list entry equals a literal route written in the test (the R-02
   table), so the oracle is independent of the code under test.
3. **Non-canonical encoding**: `/missions/M/artifacts/notes%2fwith%20space.md` (lowercase hex) parses to the same
   destination as the canonical form; `normaliseRoute` reports `canonical: false` and the canonical route. Positive
   twin: the canonical string reports `canonical: true`.
4. **Unknown routes** → `{ screen: 'missions' }`, each with `normaliseRoute(…).canonical === false` and route
   `/missions`: `''`, `'/'`, `'/nope'`, `'/missions/'`, `'/missions/M/extra'`, a lowercase ULID, a 25-character id,
   `WP1`, `wp01`, an extra segment after an artifact path.
5. **Decoding negatives** (R3-02), each as `/missions/M/artifacts/<segment>`: `%` (malformed decode), `..%2F` (a `..`
   segment), `%2F` (leading slash), `%00` (NUL). Each parses to Missions. Positive control on the same route shape:
   `tasks%2FWP01-example.md` parses to the Artifacts destination. Add a 513-code-point path (unknown) and a 512 one
   (accepted).
6. **Dashboard `/projects`** (FR-015): `parseRoute('/projects', 'dashboard')` is Missions; positive control:
   `parseRoute('/projects', 'desktop')` is Projects.
7. **`routeHref`**: equals `'#' + formatRoute(d)` for two destinations, against literal strings.
8. **YAML copy** (T003): the pattern and lengths read from `ArtifactPath.yaml` (and the id patterns from
   `MissionId.yaml`, `WpId.yaml`) equal the exported constants.
9. **Displayed sets**: for each of the nine `data-model.md` rows, `displayedSet(d)` mapped through `keyString` equals a
   literal `{ policy: [...], explicit: [...] }`, including **WP-none** (`mission:M` only) and **Artifacts-none**
   (`mission:M` / `artifacts:M`). Assert the row loop ran exactly nine times.
10. **`missions` vs `mission-names`**: Missions displays `missions` and not `mission-names`; Drift displays
    `mission-names` and not `missions` (each absence paired with the presence on the other destination).
11. **`ofMission`**: for M, true for every M-scoped kind including `drift:M`; false for `drift:*`, `project`,
    `missions`, `mission-names`, `ops`, and for `mission:O` (positive and negative on the same kinds).

**Files**: `packages/mission-shell/test/logic/routes.test.ts`.

**Validation**: all green under `logic`; one deliberate revert (for example make `parseRoute` accept lowercase ids,
or drop `artifacts:{M}` from Artifacts-none) produces a named failing test; record its failing line, then restore.
Test titles must not contain `refresh-policy mismatch on` (P-1's token, which must stay failure-only).

## Plants

None owned. The `logic` project's non-vacuity is proven by **P-1** (WP02, `gates/plants/unit-tests/plant.json`):
removing `missions` from the `mission-lifecycle` row of `REFRESH_POLICY` fails a test in `test/logic/` with
`refresh-policy mismatch on missions`, which can only happen if this WP's `logic` project runs under the unchanged
`pnpm test` (plan "Plants", ruling `01M50K4NSNYD9TEQ12T4J7KVHT`). Until WP02 lands, the sentinel and the route tests in
the run's output are this WP's evidence.

## Exit checks

Run from the lane worktree root, one at a time, in the foreground.
- [ ] `pnpm --filter @moes-media/mission-shell typecheck` exits 0.
- [ ] `pnpm lint` exits 0.
- [ ] `heavy pnpm --filter @moes-media/mission-shell test` exits 0, with **both** `logic` and `unit` in the output,
      the sentinel passing under `logic`, and the per-project test counts recorded (equality, not "at least").
- [ ] `pnpm hygiene` and `pnpm test:terminology` exit 0: no local paths or usernames in tracked files, and the banned
      synonym for "mission" appears nowhere.
- [ ] `git diff --exit-code <base> -- packages/mission-ui packages/mission-shell/src/index.ts
      packages/mission-shell/src/testing.ts packages/mission-shell/src/client packages/mission-shell/src/contract/stream.ts
      packages/mission-shell/src/harness packages/mission-shell/src/Shell.svelte packages/mission-shell/package.json`
      is empty.
- [ ] No plant to prove: no `gate-proof` leg is run by this WP, so no leg time is recorded (P-1's leg is WP02's).
- [ ] If the T001 fallback was taken, the hand-off says so, with the error, for IC-09.
- [ ] Each subtask recorded: `spec-kitty agent tasks mark-status T001 --status done` (and T002 to T005).

## Definition of Done

- `vitest.config.ts` has the `logic` project (Node, `browser: { enabled: false }`, `test/logic/**`) and the `unit`
  project (Chromium, excluding `test/logic/**`), each wired to its setup file; both setup files fail the run on
  uncaught errors and unhandled rejections, and neither swallows them.
- The sentinel test asserts `typeof window === 'undefined'` and passes (or the documented fallback was taken and
  reported).
- `src/core/routes.ts` exports `ShellMode`, `Destination`, `formatRoute`, `parseRoute`, `normaliseRoute`, `routeHref`,
  the layout mapping and the contract pattern constants; decoding never throws; unknown routes parse to Missions;
  `/projects` is Missions on the dashboard.
- `src/core/displayed.ts` exports `ResourceKey`, `keyString`, `displayedSet`, `displayedKeys` and `ofMission`, matching
  `data-model.md` row for row, with the FS-12 footnote documented.
- `core/` imports no `svelte`, no DOM global and no mission-ui runtime.
- Every test above is green, with literal oracles, equality counts and paired positive controls.
- Commits are local only; no push, no pull request.

## Risks

- **Vitest project coexistence** (Timeline risk 6, FS-10): a browser block inherited through `extends: true` can make
  `logic` run in Chromium; the sentinel catches this. The fallback is allowed only with the recorded error.
- **Regex dialect**: the `ArtifactPath` pattern uses lookaheads, `\x0B`, ` ` and `[\s\S]`; compile it with the
  `u` flag and test the YAML's own examples so a dialect mismatch fails loudly.
- **Length units**: JSON Schema lengths are code points; a UTF-16 `.length` check would refuse valid astral paths
  near 512.
- **Over-broad `catch`**: a `try` around more than `decodeURIComponent` would hide shell programming errors (R5-11).
- **Policy column naming**: the first displayed-set column is the set the refresh policy chooses from, not the set
  every status change re-reads (FS-12). Do not encode refresh rules here; WP02 owns them.
- **Setup file double registration**: `process.on` per test file can stack handlers; guard it.

## Reviewer Guidance

- **Config non-vacuity**: run the shell tests and confirm both project names appear, the sentinel passes under
  `logic`, and the #17 tests still pass under `unit` with unchanged counts. Check `logic` sets
  `browser: { enabled: false }` explicitly.
- **Setup files**: re-run one revert check (an unawaited rejected promise) per project and see the run fail; confirm no
  `preventDefault()` and no log-only handler.
- **Round trip**: it compares parsed destinations (deep equality), covers all seven screens, asserts its loop count,
  and the route strings are literals, not computed by `formatRoute`.
- **Negatives**: `%`, `..%2F`, `%2F`, `%00` each parse to Missions, next to the `tasks%2FWP01-example.md` positive
  control; the 512 and 513 length pair exists.
- **Contract copy**: the YAML test reads the contract file itself (an independent oracle), and editing one character
  of the exported pattern makes it fail.
- **Displayed sets**: nine rows match `data-model.md` exactly, including WP-none and Artifacts-none; `missions` and
  `mission-names` are distinct; `keyString` uses the data-model notation.
- **Layering**: `src/core/routes.ts` and `src/core/displayed.ts` import nothing from `svelte` or mission-ui at run
  time and use no DOM global.
- **Frozen surface**: the diff touches only the owned files.
- **Token hygiene**: no test title contains `refresh-policy mismatch on`.

## Implementation command

`spec-kitty agent action implement WP01 --agent claude`
