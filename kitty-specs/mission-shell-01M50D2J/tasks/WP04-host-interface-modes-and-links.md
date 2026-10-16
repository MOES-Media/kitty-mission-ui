---
work_package_id: WP04
title: Host interface, desktop and dashboard modes, and link safety
dependencies:
- WP03
requirement_refs:
- FR-012
- FR-013
- FR-014
- FR-015
- NFR-007
planning_base_branch: feat/mission-shell-18
merge_target_branch: feat/mission-shell-18
branch_strategy: Planning artifacts for this mission were generated on feat/mission-shell-18. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into feat/mission-shell-18 unless the human explicitly redirects the landing branch.
subtasks:
- T019
- T020
- T021
- T022
history: []
agent_profile: frontend-freddy
authoritative_surface: packages/mission-shell/
create_intent:
- packages/mission-shell/src/core/host.ts
- packages/mission-shell/src/core/links.ts
- packages/mission-shell/test/logic/host.test.ts
- packages/mission-shell/test/logic/links.test.ts
execution_mode: code_change
model: ''
owned_files:
- packages/mission-shell/src/core/host.ts
- packages/mission-shell/src/core/links.ts
- packages/mission-shell/test/logic/host.test.ts
- packages/mission-shell/test/logic/links.test.ts
role: implementer
tags: []
tracker_refs: []
---

# WP04 — Host interface, desktop and dashboard modes, and link safety

## ⚡ Do This First: Load Agent Profile

Use the `/ad-hoc-profile-load` skill to load the agent profile specified in the frontmatter, and behave according to its guidance before parsing the rest of this prompt.

- **Profile**: `frontend-freddy`
- **Role**: `implementer`
- **Agent/tool**: `claude`

If no profile is specified, run `spec-kitty agent profile list` and select the best match for this work package's `task_type` and `authoritative_surface`.

---

## Objective

Give the shell its optional host interface (`ShellHost`) with safe wrappers and defined fallbacks, the link-scheme
check for `sk-open-link`, the desktop picker and open-project dialog flows, the dashboard guard over all six picker and
dialog intents, and the `routeChanged` firing rules. Everything is plain TypeScript in `core/` plus host-facing
commands in the controller, proven in the Node `logic` project through `controller.intent`.

## Context

- **Plan**: IC-04 ("Host interface, modes and link safety"). It depends on IC-03, and IC-05 (intent table) and IC-06
  (view) build on it. The controller is extended **through its owner IC-03** (plan "Shared-file ownership":
  `src/controller/shell-controller.ts` is owned by IC-03 and requested by IC-04 and IC-06).
- **Contracts** (normative; never contradict them):
  - `contracts/shell-api.md`: the `ShellHost` interface word for word, including the `openExternalLink` and
    `routeChanged` doc comments, the "Behaviour a host can rely on" section (one `onWindowRefocus` registration,
    released on `destroy` and `setClient`; never throws).
  - `contracts/intent-map.md`: the effect of every picker and dialog row, the Dashboard column, and the "Rules"
    section (dashboard guard, link scheme, "a handler never throws", copy).
- **Data model**: `data-model.md` "ShellHost (FR-012)" (the fallback column and the invariants), "SessionState" (the
  open-project dialog items `open`, `location`, `folders`, `selected`; `copyResult`), "Destination" invariants
  (`/projects` parses to Missions on the dashboard; the null-client rules), "ShellOptions" (`host` defaults to `{}`).
- **Research**: R-10 (host interface, modes, the dashboard guard list, the dashboard with `client: null`, a change of
  client), R-02 "`routeChanged`" (R2-11), R-11 (refocus re-reads the explicit-refresh keys on Artifact and Ops only, as
  a bypass trigger), R-18 "Copy protocol" (FS-03).
- **Squad findings applied**: R2-11 / R3-04 / R4-03 (six intents, null-client dashboard, `routeChanged` timing,
  `setClient(client, route?)`), R3-05 (link negatives in the same test as the positive control; the MUST/SHOULD
  obligations copied into the docs), R5-11 (host errors become fallbacks; shell errors are never swallowed), R1-03
  (the mounted no-picker test is WP06's, not this WP's).
- **Spec**: FR-012 (all members optional, each with a fallback), FR-013 (copy and links), FR-014 (desktop picker),
  FR-015 (dashboard; ruling `01M50D473W8G8W763Y116F3DE9`, option A), NFR-007 (zero uncaught errors), US5.
- **What the dependencies deliver**:
  - WP01: `parseRoute`, `formatRoute`, `Destination`, the `projects` destination (desktop only), and the `logic`
    Vitest project (Node, `browser: { enabled: false }`).
  - WP02: the read scheduler with bypass triggers, `ShellScheduler`, and `test/support/*` clients.
  - WP03: `createShellController` with `intent(...)`, `setRoute`, `setClient`, `refresh()`, `destroy()`, the
    snapshot, the copy protocol (`afterRender`), the Node setup file that fails on any uncaught error or unhandled
    rejection, and the navigation intents.
- **Who consumes this WP**: WP05 maps the picker, dialog, link and copy rows of `INTENT_TABLE` onto the commands added
  here; WP06 re-exports `ShellHost` from `src/shell.ts`, passes the view's projects and dialog state to the elements,
  and adds the mounted dashboard no-picker test.

## Ownership

**Owned files** (stage only these, plus the recorded out-of-map edit):

- `packages/mission-shell/src/core/host.ts`
- `packages/mission-shell/src/core/links.ts`
- `packages/mission-shell/test/logic/host.test.ts`
- `packages/mission-shell/test/logic/links.test.ts`

**Out-of-map edits**:

- `packages/mission-shell/src/controller/shell-controller.ts` (owned by WP03) — add the host-facing commands
  (picker/dialog flows, link and copy wiring through the wrappers, onWindowRefocus subscription, routeChanged calls)
  because the plan's IC-04 extends the controller through its owner IC-03 (plan "Shared-file ownership").

Commit it with a plain `git add` of that path and list it in the final report with the rationale above. Any other
change you need in a file you do not own is a **change request** in the final report (file, change, reason), not an
edit.

**Do not touch**:

- The frozen surface (C-003; research R-17): `src/client/port.ts` and all of `src/client/**`, `src/contract/stream.ts`,
  `src/testing.ts`, `src/index.ts`, `src/harness/**`, `src/Shell.svelte`, `contracts/fixtures/*`,
  `packages/mission-ui/**`, and the gate wiring (`ci.yml` structure, gate scripts, plant `ciCommand`s).
- `src/shell.ts` and `package.json` (WP06 adds the `ShellHost` re-export; note the request in the final report).
- `src/core/connection.ts`, `src/core/results.ts` (WP03), `src/core/routes.ts`, `src/core/displayed.ts` (WP01),
  `src/core/scheduler.ts`, `src/core/refresh-policy.ts`, `test/support/**` (WP02), `src/intents/**` (WP05),
  `src/ui/**` (WP06), `eslint.config.mjs` (WP07), `vitest.config.ts` (WP01).

## Subtasks

### Subtask T019: `ShellHost` type and safe wrappers

**Purpose**: one place that declares the host interface exactly as `contracts/shell-api.md` does, and one set of
wrappers through which every host call is made, so a host throw or rejection always becomes its fallback (FR-012,
NFR-007).

**Steps**:

1. In `src/core/host.ts`, declare `ShellHost` with the seven optional members copied from `contracts/shell-api.md`
   (`copyText`, `openExternalLink`, `listRecentProjects`, `openProject`, `listFolders`, `onWindowRefocus`,
   `routeChanged`), same names, same signatures. Import `ProjectEntry` and `FolderEntry` with `import type` from
   `@moes-media/mission-ui` (the layering block allows type imports only; plan IC-07, P-8). Do not import `svelte`.
2. Copy the `openExternalLink` doc comment **verbatim** from `contracts/shell-api.md` (R3-05). It carries the
   `sk-artifact-screen` `sk-open-link` obligations: the host MUST re-validate the scheme (case-insensitively) before
   acting, MUST NOT navigate its own window or webview to it, and SHOULD show the destination to the user before
   opening it. Copy the `onWindowRefocus` and `routeChanged` doc comments verbatim as well.
3. Do not redeclare `ShellMode`. Import it from where WP01 declared it (the `parseRoute(route, mode)` module). If WP01
   did not export it, raise a change request rather than declaring a second copy.
4. Write one wrapper per member. Each wrapper takes the host (default `{}`), calls the member only if it exists, and
   catches **only the host call itself**: a synchronous throw, or the rejection of the promise the member returned.
   - `safeCopyText(host, text): Promise<'copied' | 'manual'>`: absent, throw or reject → `'manual'`.
   - `safeOpenExternalLink(host, href): void`: absent, throw → nothing.
   - `safeOpenProject(host, target): void`: absent, throw → nothing.
   - `safeRouteChanged(host, route): void`: absent, throw → nothing.
   - `safeListRecentProjects(host)`: resolves to a discriminated result, `{ ok: true, entries }` or `{ ok: false }`;
     absent, throw or reject → `{ ok: false }` (the Projects screen goes to `error`, per data-model "ShellHost").
   - `safeListFolders(host, location)`: `{ ok: true, location, folders }` or `{ ok: false }`; absent, throw or reject →
     `{ ok: false }` (the dialog goes to `error`).
   - `safeOnWindowRefocus(host, listener): () => void`: absent or throw → a no-op unsubscribe (no refocus refresh). The
     returned unsubscribe is itself wrapped, so a throwing host unsubscribe on release becomes nothing.
5. **Shell errors are never swallowed** (R5-11; data-model invariant). The `try`/`catch` and `.catch` wrap only the
   host member's call or its promise. The shell's continuation (applying an answer, emitting a snapshot) runs outside
   the catch, so a shell bug still surfaces as an uncaught error and fails the harness. In particular the listener the
   shell passes to `onWindowRefocus` is **not** wrapped: if the host invokes it and shell code throws, that is a shell
   error.
6. The wrappers return plain values (no `throw`, no unhandled promise). Each `async` wrapper is awaited or its result
   chained by the caller, never left floating.

**Files**: `packages/mission-shell/src/core/host.ts`.

**Validation**:

- `pnpm --filter @moes-media/mission-shell typecheck` is clean; `ShellHost` is structurally identical to the
  contract's block (a reviewer diffs the member list and the doc comments).
- `pnpm lint` passes the layering block for `src/core/**` (no runtime mission-ui import, no `svelte`).
- Unit tests for each wrapper are in T022 (host absent, member absent, member throws, member rejects, member answers).

### Subtask T020: Link-scheme check (`links.ts`)

**Purpose**: decide whether an `sk-open-link` `href` may reach the host (FR-013, contracts/intent-map.md "The link
scheme"). The check is exact; the host still re-validates (T019 doc comment).

**Steps**:

1. In `src/core/links.ts`, export one pure function, for example `isAllowedExternalHref(href: string): boolean`.
2. The rule, with no deviation:
   - match `/^([a-z][a-z0-9+.-]*):/i` against `href` **at position 0**;
   - **no trimming**, no normalising, no URL parsing: a leading space or tab means no match;
   - no match → `false`;
   - lower-case the captured scheme and compare it **for equality** with `http`, `https` or `mailto`. No prefix match
     (`httpx` is refused), no `startsWith`.
3. Keep the allowed schemes in one `as const` array (`['http', 'https', 'mailto']`) so the test can name them.
4. Wire it in the controller (out-of-map edit, T021 step 8): the `sk-artifact-screen` `sk-open-link` handler calls
   `safeOpenExternalLink(host, detail.href)` only when the check passes; otherwise it does nothing (no state change, no
   throw). The `href` passed to the host is `detail.href` unchanged (not the lower-cased form). Same behaviour on the
   desktop and the dashboard (intent-map "Dashboard" column: same).
5. Tests in `test/logic/links.test.ts` (T022 covers the structure): **one** `it(...)` drives the controller through
   `controller.intent('sk-artifact-screen', 'sk-open-link', { href })` with a recording host and asserts:
   - positive control: `https://example.test/x` → exactly one `openExternalLink` call, with that `href`;
   - also passing: `HTTPS://example.test/x`, `http://example.test`, `mailto:noreply@example.test` (each exactly one
     more call);
   - every negative → zero further calls: `httpx://example.test`, `javascript:alert(1)`, `JaVaScRiPt:alert(1)`,
     `data:text/html,x`, `file:///etc/hosts`, `vbscript:msgbox(1)`, `' https://example.test'` (leading space),
     `'\thttps://example.test'` (leading tab), `//evil.example`, `relative/path.md`, and `''` (empty).
   - Count with deltas after each case, so the positive control proves the recording host is wired in the same test
     (R3-05, non-vacuity).
6. A second, pure test may table-test `isAllowedExternalHref` over the same list; it does not replace the controller
   test.

**Files**: `packages/mission-shell/src/core/links.ts`, `packages/mission-shell/test/logic/links.test.ts`, the
controller (out-of-map).

**Validation**:

- The single controller test contains the positive control and every negative named in `contracts/intent-map.md`.
- Mutating the regex to drop the `^` anchor, or adding `.trim()`, makes the leading-space or leading-tab case fail
  (check this locally once by hand; do not commit the mutation).
- The `links.ts` module has no imports beyond types.

### Subtask T021: Desktop picker flows, the dashboard guard, refocus and `routeChanged`

**Purpose**: the host-facing commands of the controller: the desktop Projects screen and open-project dialog (FR-014),
the dashboard guard (FR-015, R2-11), the null-client dashboard, the refocus subscription (R-11) and the `routeChanged`
rules (R-02). All of this is the out-of-map edit to `src/controller/shell-controller.ts`; keep each flow small and call
the T019 wrappers for every host call.

**Steps**:

1. **Picker state** in the snapshot (session state, desktop only): Projects `status` (`loading`, `ready`, `empty`,
   `error`) and `entries: ProjectEntry[]`; dialog `open`, `location`, `folders: FolderEntry[]`, `selected`, `status`
   (data-model "SessionState"). Use the element property names of `sk-projects-screen` and `sk-open-project-dialog`
   so WP06 can pass them through unchanged. For which of `location` and `selected` a browse answer sets, follow the
   property docs in `packages/mission-ui/src/elements/sk-open-project-dialog/sk-open-project-dialog.ts` (`selected` is
   controlled by the host); do not change the element.
2. **Entering the Projects destination** on the desktop (mount with `client: null` routes to `/projects`; a desktop
   with a client may also navigate there): set Projects `loading`, call `safeListRecentProjects` once, then `ready` /
   `empty` with the entries, or `error` on `{ ok: false }`.
3. **Intents** (contracts/intent-map.md rows), on the desktop:
   - `sk-projects-screen` `sk-open-project` → `safeOpenProject(host, { key: detail.key })`;
   - `sk-projects-screen` `sk-request-open-project` → dialog `open = true`, `status = 'loading'`,
     `safeListFolders(host, '')` for the start location; apply `location` and `folders`, or `error`;
   - `sk-projects-screen` `sk-retry-load` (`'projects'` or `'project'`) → re-call `safeListRecentProjects` (the host owns
     per-entry reads);
   - `sk-open-project-dialog` `sk-browse-folder` → `safeListFolders(host, detail.location)`; pass the answer to the
     dialog, or `error`;
   - `sk-open-project-dialog` `sk-confirm-open-project` → `safeOpenProject(host, { location: detail.location })`;
   - `sk-open-project-dialog` `sk-retry-load` (`'folders'`) → re-call `safeListFolders` with the current location.
   A listing answer that arrives after the shell left the picker, or after a newer listing was issued, is dropped (use
   a per-listing counter; a stale answer never overwrites a newer one). Opening a project is the host's job: it calls
   `setClient` afterwards; the shell does not navigate on `openProject`.
4. **The dashboard guard** (FR-015, R2-11, R3-04, R4-03): one early return at the top of the intent dispatch for the
   six picker and dialog intents in `mode: 'dashboard'`: `sk-open-project`, `sk-request-open-project`, the Projects
   `sk-retry-load`, `sk-browse-folder`, `sk-confirm-open-project`, and the dialog `sk-retry-load`. No host call, no
   state change (no snapshot emitted), nothing thrown. Key the guard on `(tag, event)` so the other screens'
   `sk-retry-load` pairs are not caught by it. The mode is the `mode` option, never inferred from host members (R-10
   "Alternatives considered").
5. **Dashboard with `client: null`** (R-10; data-model "Destination"): the project layout with the shell
   `status: 'error'` and the copy "No project is open.". No port reads (there is no client), no host listing call, no
   throw. If WP03 already holds this copy in its shell copy table, reuse it; otherwise add it next to the controller's
   other shell copy and say so in the final report. A later `setClient(client, route?)` recovers into the normal
   project flow. On the dashboard `/projects` parses to Missions (WP01), so the picker is never reached.
6. **Refocus** (R-11): at mount and at each `setClient`, register exactly one listener through
   `safeOnWindowRefocus(host, listener)`; release it on `destroy` and before re-registering on `setClient`
   (contracts/shell-api.md "Subscriptions"). The listener re-reads the destination's own explicit-refresh keys once,
   as a bypass trigger, only on the Artifact and Ops destinations (the same path as `controller.refresh()`); on other
   destinations it does nothing. A host without the member gets no refocus refresh.
7. **`routeChanged`** (R-02, R2-11), through `safeRouteChanged`:
   - after every navigation the shell makes itself (a navigation intent such as `sk-navigate` or `sk-open-mission`,
     or the Refresh flow), with the canonical route `formatRoute(destination)`, after the state is updated;
   - when the host sets a route (`setRoute`, `setClient(client, route)`, or the initial `route` option) that is not
     canonical, including an unknown route normalised to `/missions` and `/projects` on the dashboard, **once** with the
     canonical form;
   - **never** for a host-set route that is already canonical, so no echo loop is possible.
   Canonical means `formatRoute(parseRoute(route, mode)) === route`.
8. **Copy and link wiring**: route WP03's `sk-copy-command` handler through `safeCopyText`, keeping WP03's protocol
   order unchanged (R-18, FS-03: `copyResult = null`, emit, await `afterRender`, await the host, set the answer). Route
   `sk-open-link` through `isAllowedExternalHref` and `safeOpenExternalLink` (T020). Both are "same" on the dashboard.
9. Keep the controller free of Svelte and of I/O globals (P-8, IC-07 lint block).

**Files**: `packages/mission-shell/src/controller/shell-controller.ts` (out-of-map), using
`packages/mission-shell/src/core/host.ts` and `packages/mission-shell/src/core/links.ts`.

**Validation**:

- WP03's existing `test/logic/controller.test.ts` still passes unchanged (do not edit it; it is WP03's).
- Each flow above has a case in T022.
- `pnpm lint` and the typecheck are clean.

### Subtask T022: Node tests through `controller.intent`

**Purpose**: prove FR-012 to FR-015 and NFR-007 in the `logic` project, with positive controls that make every
"zero calls" assertion meaningful.

**Steps**:

1. In `test/logic/host.test.ts`, build a test-local **recording host**: every member present, each pushing
   `{ member, args }` to a `calls` array; listings resolve to small synthetic entries (`ProjectEntry`, `FolderEntry`
   values with synthetic names only, no real paths or usernames; C-006). Keep it in the test file; `test/support/**`
   belongs to WP02. Use the fixture client (`createFixtureClient`) and the fake scheduler from WP02's support files.
2. **Wrappers** (per member): host `{}` (member absent), member throws synchronously, member rejects, member answers.
   Assert the fallback (`'manual'`; `{ ok: false }` for the listings; nothing for the others; a no-op unsubscribe for
   refocus) and that no error escapes. One extra case: a member that answers normally but the shell continuation
   throws is **not** swallowed (assert with `expect(...).rejects` or `toThrow` on the wrapper's caller, so this stays a
   handled assertion and does not trip the harness).
3. **Fallbacks through the controller**: with the recording host and with an empty host `{}`, drive
   `sk-copy-command` (`'copied'` vs `'manual'`), `sk-open-link` with an `https:` href (one call vs none), entering
   `/projects` on the desktop (`ready` with entries vs Projects `error`), `sk-request-open-project` (dialog folders vs
   dialog `error`).
4. **Dashboard guard with the SAME recording host** (R2-11): one `it.each` over the six `(tag, event, detail)` triples.
   - Desktop (positive control): the controller in `mode: 'desktop'`; take the call count before the intent, send it,
     settle the promises, and assert **exactly one** new host call of the expected member (`openProject` for open and
     confirm; `listRecentProjects` for the Projects retry; `listFolders` for request-open, browse and the dialog
     retry).
   - Dashboard: the same recording host instance type, `mode: 'dashboard'`, the same triple → **zero** new calls, the
     snapshot unchanged (deep-equal before and after), and nothing thrown.
5. **Null-client dashboard**: `mode: 'dashboard'`, `client: null` → the snapshot shows the shell `error` with "No
   project is open.", zero host calls, nothing thrown; then `setClient(fixtureClient)` recovers (reads issued once the
   client is `connected`, per WP03's gate).
6. **Refocus**: exactly one `onWindowRefocus` registration at mount; released on `destroy`; released and
   re-registered once on `setClient`; invoking the listener on Ops issues one re-read of `ops` and on Missions issues
   none (count reads on a recording or sequenced client from WP02's support).
7. **`routeChanged` rules**: a navigation intent → exactly one call with the canonical route; `setRoute` with a
   canonical route → zero calls; `setRoute` with a non-canonical encoding (for example `%2f` in an artifact path) →
   exactly one call with the canonical form; an unknown route → one call with `/missions`; `/projects` on the
   dashboard → one call with `/missions`; repeating the same canonical `setRoute` → still zero (no echo).
8. **Links**: `test/logic/links.test.ts` per T020 step 5 (one test with the positive control and every negative).
9. Every test runs under WP01's `test/setup/node.ts`, which fails on uncaught errors and unhandled rejections (NFR-007). Do not add
   a global `process.on('unhandledRejection')` handler of your own.

**Files**: `packages/mission-shell/test/logic/host.test.ts`, `packages/mission-shell/test/logic/links.test.ts`.

**Validation**:

- `heavy pnpm --filter @moes-media/mission-shell test` is green, and the run lists both files under the `logic`
  project.
- Temporarily removing the dashboard guard makes the six dashboard cases fail while the desktop cases keep passing
  (check once locally, do not commit).

## Plants

None owned. The `logic` project is proven by P-1 (WP02, `refresh-policy mismatch on missions`); the new checks here
carry in-test positive controls inside that proven project (research R-15).

## Exit checks

- [ ] `pnpm --filter @moes-media/mission-shell typecheck` (the shell's part of `pnpm typecheck`) is clean.
- [ ] `pnpm lint` is clean (the shell I/O block and the layering block cover `core/` and `controller/`).
- [ ] `pnpm lint:no-io` is clean.
- [ ] `heavy pnpm --filter @moes-media/mission-shell test` is green (foreground, one at a time); the `logic` project
      runs `host.test.ts` and `links.test.ts`.
- [ ] Hygiene: no local paths or usernames in any tracked file this WP touches (`pnpm hygiene`).
- [ ] No file outside the owned files and the one recorded out-of-map edit is changed
      (`git diff --name-only` against the WP base).
- [ ] The frozen surface is untouched (research R-17 paths, C-003).
- [ ] The out-of-map edit to `src/controller/shell-controller.ts` is recorded in the final report, with its rationale.
- [ ] The final report notes the request to WP06 to re-export `ShellHost` from `src/shell.ts`.
- [ ] Each subtask marked: `spec-kitty agent tasks mark-status T019 --status done` (and T020, T021, T022).

## Definition of Done

- `ShellHost` matches `contracts/shell-api.md` member for member, with the `openExternalLink` MUST/SHOULD doc comment
  copied verbatim (R3-05).
- Every host call goes through a wrapper; a throw or rejection becomes the data-model fallback; shell errors are not
  caught by the wrappers (R5-11).
- `isAllowedExternalHref` implements the exact regex, position-0, no-trim, lower-case equality rule; one controller
  test holds the `https:` positive control and all eleven negatives.
- Desktop: the Projects screen and the open-project dialog are filled from the host, open and confirm reach
  `openProject`, the retries re-call the listings.
- Dashboard: all six picker and dialog intents do nothing (no host call, no state change, no throw), proven with the
  same recording host whose desktop run makes exactly one call per intent; `client: null` is the "No project is open."
  error with no reads.
- One refocus registration per client, released on `setClient` and `destroy`.
- `routeChanged` fires after the shell's own navigations and once for a non-canonical host route, never as an echo.
- Typecheck, lint and the shell tests are green; no plant added or changed.

## Risks

- **Over-wide catch**: wrapping the whole handler in `try`/`catch` would hide shell bugs and break NFR-007's intent.
  Catch only the host member's call and its promise.
- **Guard too broad**: `sk-retry-load` is also declared by the WP, Artifact, Drift and Ops screens. Key the guard on the
  tag as well as the event, or those retries break on the dashboard.
- **Vacuous zeros**: a dashboard or link negative that asserts zero calls without the desktop or `https:` positive
  control in the same run proves nothing. Keep the controls in the same test.
- **`routeChanged` echo**: firing on a canonical host-set route creates a loop with hosts that call `setRoute` from
  their history listener. Compare against the canonical form before firing.
- **Stale listings**: a slow `listFolders` answer overwriting a newer browse; drop answers by counter.
- **WP03 API drift**: the controller's exact `intent` signature and snapshot shape are WP03's. Follow what WP03 built;
  if a needed hook is missing, add it in the out-of-map edit without changing WP03's existing behaviour, and note it.
- **Floating promises**: an un-awaited wrapper promise that later rejects would fail the harness. Await or chain every
  async wrapper.

## Reviewer Guidance

- Diff `ShellHost` against the `contracts/shell-api.md` block: seven optional members, same signatures, doc comments
  verbatim (especially `openExternalLink`).
- Read each wrapper: the `catch` covers only the host call or its promise; the continuation is outside it.
- `links.ts`: the regex is `/^([a-z][a-z0-9+.-]*):/i`, applied with no trim; comparison is equality on the lower-cased
  capture. Confirm the one controller test contains the `https:` positive control (exactly one call) and every negative
  of `contracts/intent-map.md`: `httpx:`, `javascript:`, `JaVaScRiPt:`, `data:`, `file:`, `vbscript:`, leading space,
  leading tab, `//evil.example`, a relative path, the empty string.
- Dashboard guard: six triples, keyed on `(tag, event)`; the test uses the same recording host for the desktop positive
  control (exactly one call per intent) and the dashboard (zero calls, snapshot unchanged). Optionally remove the guard
  locally and confirm the dashboard cases fail.
- Null-client dashboard: error copy "No project is open.", zero reads, zero host calls, no throw.
- `routeChanged`: canonical host route → zero calls; non-canonical → exactly one; own navigation → exactly one.
- Refocus: one registration per client; released on `setClient` and `destroy`; re-reads only on Artifact and Ops.
- The out-of-map edit is limited to `src/controller/shell-controller.ts` and recorded; WP03's tests are unedited.
- No Svelte import in `core/` or `controller/`; no I/O global; no real paths or usernames in test data.

## Implementation command

`spec-kitty agent action implement WP04 --agent claude`
