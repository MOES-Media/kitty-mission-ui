---
affected_files: []
cycle_number: 1
mission_slug: mission-shell-01M50D2J
reproduction_command:
reviewed_at: '2026-10-16T14:07:51Z'
reviewer_agent: claude
wp_id: WP04
---

# WP04 review feedback, cycle 1

Reviewer: reviewer-renata (claude). Commit reviewed: `65681a7`.

Verdict: **changes requested**. Two small, must-fix findings. Everything else passed: the link check, the wrappers,
the six intent-level dashboard cases, the refocus subscription, the stale-listing counters and the gates. Evidence is
at the end.

## Must fix

### F1 (Medium): the dashboard guard covers `intent()` only, and the public commands contradict their own doc comment

`ShellController` declares the picker commands under the comment
`// Desktop picker commands (FR-014); a dashboard controller ignores them.` That comment is false. A probe on a
`mode: 'dashboard'` controller with a recording host got these results:

- `controller.openProject('k')`, `requestOpenProject()`, `browseFolder('a')`, `confirmOpenProject('a')`,
  `retryFolders()` and `retryProjects()` each reached the host. The calls were
  `openProject, listFolders, listFolders, openProject, listFolders, listRecentProjects`.
- `controller.navigate({ screen: 'projects' })` on the dashboard put the snapshot in `layout: 'picker'` with
  `screen: 'projects'`, and it fired `routeChanged('/projects')`, a route that cannot exist on the dashboard.

Today no production path reaches these, because WP06 binds through `intent()`. WP05, however, is about to rewrite
`intent()` so that it dispatches from `INTENT_TABLE`, and its handlers call this same command surface
(`IntentCommands`). The guard and its documented guarantee should not depend on WP05 keeping one early return in
place.

Fix, keeping a single source of truth:

- Add one predicate, for example `const pickerAllowed = mode === 'desktop'`.
- Make each of the six picker and dialog commands return early when it is false, with no host call, no state change
  and no emit.
- Make `show()` and `navigate()` refuse or normalise a `projects` destination on the dashboard. The simplest fix is to
  map it to Missions, the same way `parseRoute` does.

The `DASHBOARD_IGNORED` early return in `intent()` can stay as the dispatch-level guard, or it can be removed once the
commands guard themselves. Either way, the comment must become true.

Add a Node test: on the dashboard, each direct command makes zero host calls and leaves the snapshot unchanged, with
the desktop positive control already in `host.test.ts`. Also check that a dashboard `navigate({ screen: 'projects' })`
never produces the picker layout.

### F2 (Low-Medium): `setRoute` after `destroy()` still calls `host.routeChanged`

`applyHostRoute` has no `destroyed` check. `show()` returns early, but
`if (!normalised.canonical) safeRouteChanged(...)` still runs. A probe of `destroy()` followed by
`setRoute('/nonsense')` recorded `routeChanged /missions` after the refocus release.

A destroyed shell must not call into its host, since the host may already have torn down its history listener. Add
`if (destroyed) return;` at the top of `applyHostRoute`, and add a one-line test.

## Should fix (non-blocking)

- **F3 (Low):** the refocus test covers Ops (one re-read) and Missions (none), but not Artifact. Add an Artifact case
  so that "Artifact and Ops only" is proven in both directions.
- **F4 (Low):** `gets no refocus refresh from a host without the member` never triggers anything, so it cannot fail.
  As written, it is vacuous. Drop it, since the wrapper test already covers an absent member, or rename it to state
  what it actually checks.
- **F5 (Low, note):** `safeListRecentProjects` and `safeListFolders` validate the container shape (an array, or a
  string `location` plus an array) but not the elements. Anything the host puts in the array goes straight to the
  elements. This is acceptable under the typed contract. Record it as a known limit, or add a cheap element check.

## Scope ruling (for the PR record)

- `src/controller/snapshot.ts` (picker state) and the deletion of `src/controller/host-seam.ts` were not recorded as
  out-of-map edits. Both fall under WP03's `src/controller/**` glob.
- T021 step 1 of the WP04 prompt itself requires the picker state in the snapshot.
- `host-seam.ts` says in its own header that "WP04 replaces `ControllerHost` and `copyViaHost` ... in this one spot".
- WP04 runs serially after WP03, so there is no conflict.
- Ruling: a recording slip, not a breach. Record all three files (`shell-controller.ts`, `snapshot.ts` and
  `host-seam.ts`) as out-of-map edits in the final report. Nothing needs to be reverted.
- WP03's tests (`controller.test.ts`, `controller-recording.test.ts`, `results.test.ts`, `connection.test.ts`) are not
  in the WP commit, and they pass.

## Evidence (what passed)

- **Link check.**
  - The regex is `/^([a-z][a-z0-9+.-]*):/i` with no trim, and the scheme is compared by lower-cased equality against
    an `as const` allow-list.
  - A scratch fuzz test (deleted afterwards) refused all 45 negatives. They included `JaVaScRiPt:`, leading
    space/tab/CR/LF/NUL/NBSP/BOM, fullwidth and Cyrillic look-alikes, a zero-width joiner,
    `javascript&colon;`/`&#58;`, `//evil`, `\\evil`, `/\evil`, relative paths, `#x`, `?x`, the empty string, `data:`,
    `file:`, `vbscript:`, `blob:`, `httpx:` and `http+s:`, plus non-string `href` details.
  - It accepted `HTTPS:`, `HtTp:` and `MAILTO:`, and passed the href to the host byte-for-byte.
  - A refused link made 0 host calls of any member in both modes, and also after `destroy`.
- **MUST/SHOULD docs.** `ShellHost` matches the contract block member for member. The `openExternalLink`,
  `onWindowRefocus` and `routeChanged` doc comments are verbatim.
- **Wrappers.**
  - The catch covers only the host call. The continuation runs outside it, and nothing is logged.
  - Probes found no unhandled rejection or uncaught error for any of these: a throwing `then` getter, a thenable that
    rejects, an async member returning a rejected promise from a `void` member, a throwing member getter, a non-array
    or non-object answer, a non-function unsubscribe, or a throwing unsubscribe.
- **Dashboard via `intent()`.** All 6 intents were ignored with 0 calls, an unchanged snapshot and no emit. Each case
  has a desktop positive control of exactly one call. The guard is keyed on `(tag, event)`, and the Ops
  `sk-retry-load` still reads on the dashboard. A null-client dashboard is the `project` layout with the error
  "No project is open.", and `setClient` recovers.
- **`routeChanged`.**
  - It fires after `sk-navigate` and `sk-open-mission`, once the state is updated.
  - It fires once with the canonical form for a non-canonical `setRoute`, initial route or `setClient(client, route)`,
    including `/projects` on the dashboard.
  - It fires 0 times for canonical routes, and 0 times when the host echoes the route back.
  - Deviation 3 (`refresh()` fires `routeChanged`) is accepted. R-02 says "after every navigation the shell makes
    itself (an intent or the Refresh flow)", and a host echo of that canonical route fires nothing, so it cannot
    ping-pong.
- **Refocus.** One registration per attach, released on `setClient` and on `destroy`, confirmed by registered and
  released counts.
- **Stale listings.** Both the projects and the folders listings use per-listing counters, which are bumped by
  `leavePicker` and `resetSession`. Probes confirmed that a late answer arriving after `setClient`, after a route
  change or behind a newer browse is dropped.
- **Gates.**
  - `heavy pnpm --filter @moes-media/mission-shell test`: 318 passed in 15 files.
  - `pnpm lint`, `pnpm lint:no-io`, `pnpm typecheck` (0 errors and 0 warnings) and `pnpm hygiene` (0 findings) are
    all clean.
- **Reverts.**
  - Removing the `DASHBOARD_IGNORED` early return made the 6 dashboard-guard cases and the null-client case fail by
    name, while the desktop controls still held.
  - `SCHEME.exec(href.trim())` made 3 link tests fail by name.
