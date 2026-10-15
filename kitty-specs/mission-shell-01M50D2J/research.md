# Research: mission-shell (#18)

Phase 0 of `/spec-kitty.plan`. Each entry is a decision with its rationale and the alternatives considered. Nothing here
reopens the spec: the three operator rulings of 2026-10-15 and the binding decisions of the #17 landing review are
inputs, not questions. The two genuine forks this research found are recorded as deferred decision moments and marked
in `plan.md` (R-12, R-17).

Measurements cited below come from CI run 38756980500 (the last green run of the #17 landing branch, PR #32, head
before `8c1ce10`): gate-step and proof-leg durations, read from the job steps. Local timings are not taken in this
phase (no heavy runs during planning).

## R-01 Where the shell's code sits, and how it is layered

- **Decision**: three layers inside `packages/mission-shell/src`.
  1. `core/`: plain TypeScript with no Svelte and no DOM. Destinations and routes, the displayed-resource sets, the
     refresh policy, the read scheduler (coalescing and latest-wins), result-to-view mapping, the link-scheme check,
     the connection presentation and the host-interface wrappers.
  2. `controller/`: one deep module, `createShellController(options)`. It holds the subscription, the connection
     listener, the current destination, the session state and the resource slots. It exposes a snapshot, a
     `subscribe(listener)` with the Svelte store contract, and a small command surface (`navigate`, `intent`,
     `refresh`, `windowRefocused`, `destroy`). It is still plain TypeScript.
  3. `ui/`: Svelte 5 components that render `sk-mission-shell`, the hosted screens, the banners, the Refresh button
     and the sidebar trees from the snapshot, and bind intents. Runes (`$state`, `$derived`) live here, mirroring the
     controller snapshot.
- **Rationale**:
  - The controller is a deep module (charter paradigm): a small interface over the whole refresh, connection and
    intent behaviour. Hosts and tests drive it without a DOM.
  - The refresh-policy, coalescing and connection tests can then run in Node, not in Chromium. This is the main lever
    on the unit-tests proof-leg cost (R-15).
  - Runes in a `.svelte.ts` module compiled for Node lose reactivity (the server build of Svelte has no signals), so
    putting runes in the controller would force every controller test into the browser.
- **Alternatives considered**:
  - The controller as a runes module (`.svelte.ts`). This was rejected because every test would then need the browser
    project.
  - One big `MissionShell.svelte` holding the state. This was rejected because it is not testable without mounting,
    and it is not a deep module.
  - A third-party router or state library. This was rejected because there is nothing to gain over about a hundred
    lines of route grammar, and it would mean a new dependency (NFR-006).

## R-02 Route grammar (FR-002)

- **Decision**: a route is a path-like string. The shell owns `formatRoute(destination)` and `parseRoute(route)`, and
  the two round-trip exactly.

  | Destination | Route |
  |---|---|
  | Missions | `/missions` |
  | Drift, whole project | `/drift` |
  | Drift, one Mission | `/drift/{missionId}` |
  | Ops | `/ops` |
  | Pipeline of M | `/missions/{missionId}` |
  | Work Packages of M, none selected | `/missions/{missionId}/work-packages` |
  | Work Package W of M | `/missions/{missionId}/work-packages/{wpId}` |
  | Artifacts of M, none selected | `/missions/{missionId}/artifacts` |
  | Artifact P of M | `/missions/{missionId}/artifacts/{encodeURIComponent(P)}` |
  | Projects (picker; desktop only) | `/projects` |

  - The artifact path is one percent-encoded segment, so slashes inside it never split the route.
  - Mission and WP ids are matched with the contract's patterns (a 26-character ULID; `WP` and digits). Anything else
    is an unknown route, which parses to Missions (FR-002).
  - `/projects` parses to Missions on the dashboard (no picker, FR-015).
  - The `href` of each navigation item and tree row is `#` followed by the route. The elements already call
    `preventDefault()` and emit `sk-navigate` with that `href`, so the shell never navigates its window. A dashboard
    host can use the same string as its hash.
- **Rationale**: the strings are readable, contain no host-specific prefix, and give the host deep links and back and
  forward without the shell touching `location` or `history` (C-001).
- **Alternatives considered**:
  - Query-string routes (`?view=pipeline&mission=…`). This was rejected because they are harder to read and to match.
  - Opaque serialised JSON. This was rejected because it cannot serve as a deep link.

## R-03 The Work Packages and Artifacts navigation items with nothing selected (spec Assumptions)

- **Decision**: with no WP selected, the Work Packages item shows the Work Package screen with
  `status = 'nothing-selected'` and the WP tree in the sidebar. With no artifact selected, the Artifacts item shows the
  Artifact screen with `status = 'nothing-selected'` and the listing read.
- **Rationale**: both screens already define `nothing-selected` (`WpScreenStatus`, `ArtifactStatus`). mission-ui's own
  shell stories (`mission-work-package-none-selected-*`) show exactly this composition. No screen changes (C-002).
- **Alternatives considered**:
  - Redirecting to the first WP. This was rejected because it invents a selection and adds a read the user did not ask
    for.
  - Showing the Pipeline. This was rejected because the navigation item would then mark the wrong current item.

## R-04 Displayed resources and "a resource of Mission M" (refresh policy)

- **Decision**:
  - A displayed resource is one port read with its parameters, keyed as in `data-model.md` (`ResourceKey`).
  - **A resource is "of Mission M" exactly when its read parameters carry `missionId = M`.** So the unscoped drift
    report and the Missions list are not resources of any Mission, and the Drift report scoped to M is.
  - The shell's chrome reads are displayed resources too: `getProject` in the project layout, and `getMission(M)` in
    the mission layout.
- **Rationale**: the spec's table says "every displayed resource of M" for `log-truncated`. A rule over parameters is
  mechanical and testable, and it needs no knowledge of what a response contains.
- **Alternatives considered**: inspecting response bodies for Mission ids. This was rejected because it is
  non-deterministic and couples the policy to schemas.

## R-05 Read scheduling: coalescing, latest-wins and connection gating (FR-008, FR-009, NFR-001, NFR-002)

- **Decision**: one `ResourceSlot` per displayed resource key, with a leading read and one trailing read per window.
  - A re-read request on an idle slot issues the read at once (the leading read, which meets NFR-001's 100 ms) and
    opens a 100 ms window.
  - A request arriving while the window is open, or while a read is in flight, sets `trailing`.
  - When both the window has closed and the in-flight read has settled, a pending `trailing` issues exactly one more
    read and opens a new window.
  - So a burst of five changes inside 100 ms yields at most two reads (NFR-002).
  - Every issued read takes the slot's next generation number. A result is applied only when its generation equals the
    slot's latest issued generation (FR-009). Removing a slot (the resource is no longer displayed) bumps the
    generation, so a late result is dropped, with no read and no error (edge case "unsubscribe on unmount").
  - While the connection state is `connecting`, no read is issued. The current destination's reads are issued at the
    first `connected` (US4-1, US4-2).
  - Navigation is not coalesced away. It always issues the destination's reads, and these open the window like any
    leading read.
- **Rationale**: this is the smallest scheduler that meets both NFRs. It is deterministic under an injected
  scheduler, and its states are easy to enumerate in a test.
- **Alternatives considered**:
  - A pure trailing debounce. This was rejected because it delays every first re-read by the window and risks NFR-001.
  - Aborting the earlier read. This was rejected because the port's cancellation is reserved and not yet available
    (`client-port.md`, "Read error contract"), and latest-wins gives the same visible result.

## R-06 `unavailable` and refusals on a resource that already has data (FR-005, US4-3 to US4-5)

- **Decision**:
  - A **refusal** is an answer. It always applies: the view state becomes `error`, with the refusal code where the
    screen has a refusal property.
  - **`unavailable`** is a non-answer. On a slot with data, it keeps the data and the view state. On a slot without
    data, it sets `error`. The banner carries the explanation (edge case "the state changes to degraded while a read is
    in flight").
  - The refused load-more cursor (400 `invalid_page_cursor`) drops the loaded pages and reads the first page again
    (edge case).
- **Rationale**: this is exactly the spec's "screens with data keep it, screens without data show `error`", and it
  holds for every non-`connected` state without a per-state branch.
- **Alternatives considered**: flipping to `error` on every `unavailable`. This was rejected because it contradicts
  US4-3 to US4-5.

## R-07 How a Svelte shell gets into the existing Storybook and visual gate (FR-018, C-002, SC-006)

- **Decision**:
  - The stories are `packages/mission-shell/src/stories/*.stories.ts`, written for the **existing**
    `@storybook/web-components-vite` framework.
  - Each story's `render` mounts `MissionShell.svelte` with Svelte's own `mount()` and returns the resulting
    `sk-mission-shell` element.
  - `apps/storybook/.storybook/main.ts` gains:
    - a second `stories` glob, `../../../packages/mission-shell/src/**/*.stories.ts`;
    - the `svelte()` plugin of `@sveltejs/vite-plugin-svelte` in `viteFinal`, with `vitePreprocess` passed inline,
      because the Storybook root does not see the shell's `svelte.config.js`.
  - `apps/storybook/package.json` declares `@moes-media/mission-shell` (`workspace:*`), `svelte` 5.57.1 and
    `@sveltejs/vite-plugin-svelte` 6.2.4 (R-16).
- **Constraint from the harness** (`apps/storybook/tests/visual/stories.visual.spec.ts`):
  - The story's first element (`#storybook-root > *:first-child > *:first-child`) must be a registered custom element.
  - A `vw-*` story's element must reflect the `tier` that matches the viewport.
  - `sk-mission-shell` does both: it derives `tier` from the window width and reflects it. So `MissionShell.svelte`
    has exactly one root element, `<sk-mission-shell>`, and the story returns that element.
- **Mount technique, in order of preference.** The WP proves its choice first, as a spike.
  - (a) Mount into a detached container and return `container.firstElementChild`. Svelte references its nodes, not
    their parent, so moving the single root keeps every binding live. The `{#if}` anchors sit inside the root because
    it is the only root.
  - (b) Mount into a `DocumentFragment` and return the fragment. The renderer appends its children, so the
    `sk-mission-shell` element becomes the first element child. Svelte's text anchor is not an element and is skipped
    by `*:first-child`.
  - (c) A story-only wrapper custom element that mounts the shell in `connectedCallback` and mirrors the inner `tier`.
    This is the last resort, because it puts a layer between the harness and the real root.
- **Rationale**:
  - mission-ui stays byte-unchanged (SC-006).
  - Storybook's framework and the visual harness stay unchanged.
  - No new package versions are needed (R-16).
  - The stories run through the same baseline, settle and anti-vacuity checks as every screen.
- **Alternatives considered**:
  - A second Storybook with `@storybook/svelte-vite`. This was rejected: it means new dependencies, a second build, a
    second visual run, and a change to the visual gate's wiring.
  - Stories in `packages/mission-ui`. This was rejected because it breaks C-002 and SC-006.
  - Stories under `apps/storybook/src`. This was rejected because they would be outside the no-io, data-driven and
    terminology scans that cover `packages/*/src`.

## R-08 Story data, connection states and timers in stories

- **Decision**: each story builds its own client from `createFixtureClient()` (the `./testing` entry), wrapped in a
  story-local object whose `connection` is a fixed state. The fixture's internal `setConnectionState` hook stays
  internal: the `./testing` exports are unchanged (C-003 allows only additive fixture options, and none is needed).
  - Reads resolve without a scheduler delay. The banner's 1 s grace is satisfied through an injected scheduler that
    fires at once (`ShellOptions.scheduler`), so no story waits on a real timer.
  - The ESLint boundary block that keeps production sources away from the fixture adapter
    (`packages/mission-shell/src/**`, with exemptions for `testing.ts`, `client/fixture.ts` and `harness/**`) gains
    `**/*.stories.ts` as an exemption. Stories are not production sources, so this narrows nothing. The existing
    boundary plant (`plant-shell-boundary.ts`) still proves the rule on a production file.
- **Rationale**: the stories are deterministic with no port change, and with no new export from `./testing`.
- **Alternatives considered**: exporting `setConnectionState` from `./testing`. This was rejected because the #17
  README states that it stays internal, and the stories do not need it.

## R-09 Intent coverage check: which gate, and how it reads the manifest (FR-004, SC-001, FR-017)

- **Decision**: a **type-level** check, judged by `svelte-check` in `Gate: typecheck`.
  - `scripts/typings.mjs` additionally emits, into the generated `src/generated/elements.d.ts`:
    - `MissionUiTag`, the union of every element tag in `custom-elements.json`;
    - `MissionUiIntents`, a map from each tag to the union of its declared event names.
  - Both come straight from the manifest. The existing `manifest:check` (`typings.mjs --check`) keeps the file
    current, and the existing manifest plant already proves staleness.
  - `src/intents/table.ts` declares `INTENT_TABLE`, typed so that a missing `(tag, event)` pair is a compile error
    that carries a failure-only marker type, `{ unmappedIntent: '<tag> <event>' }`. So the svelte-check output names
    the intent (FR-004).
  - The hosted elements are every tag in `MissionUiTag` except `sk-mission-sample`, which is excluded by name together
    with its `sk-mission-retry` (FR-004).
  - A new element or event in mission-ui therefore fails the check until the shell maps it (edge case).
- **Nested pattern elements.** `sk-filter-toggle-group`, `sk-shell-nav-item`, `sk-shell-tree` and
  `sk-work-package-board` emit composed, bubbling events that also leave their hosting screen or the `sk-mission-shell`
  element. Their table entries are `{ via: '<hosting tag>' }`. The binding layer listens only on hosting elements (the
  screens, the open-project dialog and `sk-mission-shell`), so every intent is handled exactly once. A browser test
  dispatches each `via` intent from the nested element and asserts exactly one handler call.
- **Rationale**: a typecheck plant costs one `svelte-check` run (about 0.27 min) against about 1.5 to 2.4 min for a
  unit-tests run. The check reads the manifest through a generated file whose freshness is already gated.
- **Alternatives considered**:
  - A runtime unit test reading `custom-elements.json`. This was rejected: same strength, one more unit-tests plant
    (R-15).
  - A Node script in `Gate: manifest`. This was rejected because it would have to parse the TypeScript table.

## R-10 Host interface, modes and fallbacks (FR-012 to FR-015)

- **Decision**: `MissionShell` takes `client` (a `MissionStatusClient` or `null`), `host` (a `ShellHost`, all members
  optional), `mode` (`'desktop' | 'dashboard'`, required), and `route`. It also takes optional `scheduler`, `clock` and
  `copy`. `ShellHost` members:
  - `copyText(text)`, which resolves `'copied'` or `'manual'`;
  - `openExternalLink(href)`;
  - `listRecentProjects()`, which resolves `ProjectEntry[]`;
  - `openProject(target)`, where `target` is `{ key }` or `{ location }`;
  - `listFolders(location)`, which resolves `{ location, folders }`;
  - `onWindowRefocus(listener)`, which returns an unsubscribe function;
  - `routeChanged(route)`.
  - Every call goes through a wrapper that catches a throw or a rejection and applies the fallback: copy yields
    `manual`, a listing yields the dialog or screen `error`, and the others do nothing (NFR-007).
  - `mode` is explicit, not inferred from which members exist. FR-015's positive control mounts the **same** recording
    host in both modes and expects host calls only on the desktop.
  - A change of `client` is treated as a new project: the view is keyed on the client, so the old subscription and
    connection listener are released, every slot is dropped, and the new client is subscribed (SO-DES-013, FR-007).
- **Rationale**:
  - Hosts supply only what they can, and the port is untouched (C-003).
  - Remounting on a client change keeps the "one client per project" rule inside the shell, as well as in the host.
- **Alternatives considered**:
  - Inferring the mode from host members. This was rejected because FR-015's positive control would then be
    impossible.
  - Putting copy and link actions on the port. This was rejected because it breaks C-003.

## R-11 Explicit refresh, Refresh button and visibility (FR-016, operator ruling 01M50D491TSVP2DCY0HF9F940W)

- **Decision**:
  - The Refresh button is `<sk-button variant="ghost" size="sm">` in the `top-bar-actions` slot. It is rendered only
    when the destination is Artifact or Ops (both "nothing selected" and selected states count for Artifacts).
  - Pressing it calls `controller.refresh()`, which re-reads that destination's own explicit-refresh resources once:
    the Artifact listing and content, or the loaded Ops pages.
  - `host.onWindowRefocus` triggers the same refresh on those two destinations only.
  - Drift's own Rescan stays its trigger (`sk-rescan-drift`), with `rescanning` set and the old report kept.
- **Rationale**: this is exactly the ruling. Chrome resources are not "the destination's data", so a refresh re-reads
  neither the project head nor the Mission head ("none of others", FR-016).
- **Design review**: the button and the banners are not in the prototype, so they carry the design-review flag (R-14).

## R-12 Visual proof of the banner (FR-017, FR-018): one plant moved, or a second plant? (OPERATOR FORK)

- **Facts**:
  - `Gate: visual` measured 17.10 min (gate step, `--repeat-each=5`, 330 baselines).
  - Its proof leg ran 37.43 min for two runs (clean and one plant, each preceded by `pnpm storybook:build-only`), with
    a timeout of 60.
  - The visual leg is already the longest job, so it sets the pull request's CI wall-clock time.
  - Eleven new stories add about 0.6 min to a visual run (11 × 5 shots at about 0.62 s each).
- **Options**:
  - **A (recommended): move the single visual plant to a banner story.**
    - The existing plant changes a gap token in `sk-mission-sample`. It is replaced by a plant that changes the
      appearance of the reconnecting banner (an anchored edit in `ui/ConnectionBanner.svelte`), with the token
      `shell-connection-banners--reconnecting-1280-diff.png`.
    - The leg stays at two runs (about 39 min).
    - The gate's failure path is still proven, now on the shell's own stories, which also proves those stories are
      really compared.
    - Cost: the mission-ui-side visual plant is retired. Every mission-ui baseline is still compared by the same
      harness on every run.
  - **B: add a second visual plant.**
    - The leg grows to three runs, about 57 min, against a timeout of 60. The formula
      `(1 + 2) × 17.7 + 2 = 55.1` stays under the current value, so the timeout stays at 60, with about 3 min of
      headroom.
    - The pull request's CI wall-clock time grows by about 19 min on every push.
  - **C: no visual plant for the banner.** A unit test asserts that the banner is in the story's DOM. This deviates
    from FR-018 ("a planted change to a banner's appearance must fail the visual gate") and needs a spec amendment.
- **Status**: deferred to the operator (decision moment in `plan.md`). The plan proceeds on A.

## R-13 C-001 and C-005 enforcement gaps in the shell, and the C-003 "gate wiring" scope (OPERATOR FORK, R-17)

- **Facts**:
  - The no-io gate bans `location` and bare `window`. It does not ban `history` or `navigator.clipboard`, which C-001
    names explicitly.
  - The main ESLint config bans raw `<button>`, `<input>`, `<select>` and `<textarea>` only inside Lit `html`
    templates, not in Svelte markup, so C-005 is unenforced for the shell.
  - C-001 says the no-io gate keeps covering the shell "unchanged", so the fix does not go into no-io.
- **Decision (pending R-17)**: one ESLint block for `packages/mission-shell/src/**` in `eslint.config.mjs`, with
  failure-only messages:
  - `svelte/no-restricted-html-elements` for `button`, `input`, `select` and `textarea`, with the message
    `shell-markup: raw <button>, <input>, <select> and <textarea> are forbidden in shell markup; use the sk-* elements (C-005)`;
  - `no-restricted-properties` for `navigator.clipboard` and for `history` as an object, with the message
    `shell-io: … is forbidden in the shell; go through the host interface (C-001)`.
  - Two eslint plants prove them (`plan.md`, Gates).
- **Rationale**: this enforces the spec's own constraints mechanically, at about 0.3 min of eslint proof time per
  plant, without touching the no-io gate.
- **Alternatives considered**: review-only enforcement. This was rejected because the charter makes "elements over
  CSS" a review failure, and a mechanical check is cheaper than a rejected WP.

## R-14 Design review of the banners and the Refresh button (FR-018, SC-007; operator ruling 01M50D4B5MVFZEQNG9XV20BK6K)

- **Decision**: checkpoint **CP-1**. It is owned by the orchestrator and is not a work package. It follows the
  precedent of the missions-and-pipeline, drift and projects missions.
  1. The stories WP renders every story and produces candidate baselines inside the pinned image only
     (`pnpm visual:update` through `scripts/visual.sh`, wrapped as `heavy` locally). It commits the stories, and the
     candidate PNGs on its lane.
  2. At CP-1, the orchestrator shows the operator the candidate PNGs of the eleven shell stories and the default copy
     of `contracts/connection-presentation.md`:
     - the five banner states;
     - the six layout compositions, with and without Refresh;
     - the dashboard composition without the picker entries.
  3. The operator confirms or amends. The orchestrator records a dated `CP-1 confirmed` entry in
     `kitty-specs/mission-shell-01M50D2J/design-review.md`, naming each approved baseline file and its sha256 and any
     amended copy.
  4. An amendment goes back to the stories WP. The baselines are regenerated, and the entry is updated to name the
     new hashes.
  5. The WP's reviewer checks every committed baseline hash against the entry. A mismatch is a REJECT.
  6. The pull request body carries a "Design review" section listing the eleven baselines with the flag "not in the
     prototype: approved at CP-1 on <date>" (SC-007).
- **Rationale**: approval is recorded once, against exact bytes, before merge. No reviewer has to judge appearance
  without the operator.

## R-15 Proof-leg cost (SO-DES-017) and NFR-002 timeouts

- **Decision**:
  - The mission adds **one** unit-tests plant (the refresh policy).
  - The intent coverage check is a typecheck plant (R-09).
  - The ESLint rules are eslint plants (R-13).
  - The Storybook glob gets a storybook-build plant.
  - The visual plant follows R-12.
  - The controller and core tests run in a Node project of the shell's Vitest config, so a unit-tests run grows by
    seconds for them. Only the Svelte binding tests (routing on real screens, intents, banners, Refresh, picker) run in
    Chromium.
- **Projected impact**:

  | Leg | Today: plants / runs / measured leg | Measured gate step | After: plants / runs | Projected gate step | Projected leg | Timeout by formula | Timeout set |
  |---|---|---|---|---|---|---|---|
  | unit-tests | 8 / 9 / 13.82 min | 2.15 min | 9 / 10 | about 2.7 min | about 20 min | (1+9) × 2.7 + 2 = 29 | 30 (unchanged; raised only if the measured gate step exceeds 2.8 min) |
  | typecheck | 4 / 5 / 1.17 | 0.27 | 5 / 6 | about 0.35 | about 1.6 | (1+5) × 0.35 + 2 = 4.1 | 6 (unchanged) |
  | eslint | 9 / 10 / 2.88 | 0.37 | 11 / 12 | about 0.45 | about 3.6 | (1+11) × 0.45 + 2 = 7.4 | 8 (unchanged; raised if the measured gate step exceeds 0.5) |
  | storybook-build | 1 / 2 / 0.27 | 0.20 | 2 / 3 | about 0.3 | about 0.9 | (1+2) × 0.3 + 2 = 2.9 | 8 (unchanged) |
  | visual (R-12 A) | 1 / 2 / 37.43 | 17.10 | 1 / 2 | about 17.7 | about 39 | (1+1) × 17.7 + 2 = 37.4 | 60 (unchanged) |
  | visual (R-12 B) | 1 / 2 / 37.43 | 17.10 | 2 / 3 | about 17.7 | about 57 | (1+2) × 17.7 + 2 = 55.1 | 60 (unchanged; 3 min headroom) |

  - The final values are re-derived from the mission PR's first CI run, by the formula, and never lowered below the
    current value.
  - The unit-tests gate stays inside its 8-minute job budget, and visual inside 28 (NFR-005).
- **Alternatives considered**:
  - A unit-tests plant per new behaviour (latest-wins, coalescing, intents, banners), about 5 to 6 plants. This was
    rejected because it adds about 12 min to the leg for proofs that the one refresh-policy plant and the existing
    binding plants already give: the gate runs both test projects and fails on a red test.
  - Running everything in Chromium. This was rejected because it puts about 0.5 min more on each of ten leg runs.

## R-16 Supply chain (DIRECTIVE_051, NFR-006)

- **Decision**: **no new package and no new version** enters `pnpm-lock.yaml`.
  - The only manifest change is `apps/storybook/package.json`, which declares three packages already locked:
    - `@moes-media/mission-shell`, `workspace:*` (a workspace link, nothing fetched);
    - `svelte` 5.57.1: exact pin, already locked for `packages/mission-shell`; published 2026-09-18 (27 days before
      this plan, 14 or more required); no `preinstall`, `install`, `postinstall` or `prepare` script;
    - `@sveltejs/vite-plugin-svelte` 6.2.4: exact pin, already a root devDependency; published 2026-01-09; no install
      scripts.
  - The lockfile changes only the `apps/storybook` importer entry. A reviewer checks that the `packages:` section of
    `pnpm-lock.yaml` is unchanged.
  - `allowBuilds` (esbuild, rs-module-lexer) is unchanged.
- **Controls**:

  | Control | Result |
  |---|---|
  | exact pin | yes |
  | age of 14 days or more | yes, with the dates above |
  | install scripts | none |
  | registry | npmjs for both; `@spec-kitty/*` scope unchanged |
  | lockfile integrity | the frozen install in CI is unchanged |
  | new transitive packages | none |

- **Adversarial evidence**: no security-impacting dependency decision is made (no new version), so the adversarial
  squad challenge for dependencies is not triggered. The charter's post-plan squad runs anyway and covers this entry.

## R-17 What C-003's "gate wiring" covers (OPERATOR FORK)

- **Problem**: C-003 and SC-004 freeze "the gate wiring" without defining it. This plan changes five gate-adjacent
  things, and needs to know which are inside the freeze:
  1. ESLint rule content (R-13);
  2. the Storybook `stories` glob and the Svelte plugin (R-07);
  3. a second Vitest project in the shell (R-15);
  4. plants (R-12, R-15);
  5. possibly a proof-leg timeout in `ci.yml`, if a measured gate step exceeds the projection (R-15).
- **Options**:
  - **A (recommended)**: "gate wiring" means the set of gates and how each is bound. The frozen surface is:
    - in `.github/workflows/ci.yml`: the job ids, `needs`, each `id: gate` step command, the proof-leg matrix gate
      list and images, and `all.needs`;
    - each plant's `ciCommand`;
    - `scripts/gate-proof.mjs` and `scripts/gate-proof/**`;
    - the gate scripts in the root `package.json`: `typecheck`, `lint`, `lint:styles`, `lint:no-io`, `test:no-io`,
      `lint:data-driven`, `test:data-driven`, `manifest:check`, `hygiene`, `test:scripts`, `test:terminology`,
      `test`, `build-storybook`, `visual`, `contract:check`, `test:contract`.

    Rule content, plants, story globs, test-project configs inside a package, and formula-derived proof-leg timeouts
    may change. SC-004's diff check is written against exactly that list (`plan.md`, IC-09).
  - **B (strict)**: every file a gate reads is frozen. The ESLint hardening (R-13) and any timeout raise are dropped.
    The Storybook glob change, without which FR-018 cannot be met, becomes a spec conflict that stops the mission.
  - **C**: as A, but a timeout raise in `ci.yml` stops and goes back to the operator.
- **Status**: deferred to the operator (decision moment in `plan.md`). The plan proceeds on A.

## R-18 Smaller decisions

- **Drift Mission names.** A `DriftFinding` carries only `missionId`. The Drift screen's `missions` map is filled from
  the first page of `listMissions`, read with the drift report and refreshed with it. A Mission beyond the first page
  shows the screen's own id fallback. Reading every page was rejected: the number of reads is unbounded, and the
  contract has no lookup by id list.
- **Mission head** (`ShellMission`):
  - `title` is `friendlyName`, or else `slug`. `id` is `slug`. There is one tag, `missionType`, with tone `neutral`.
  - `progress` is omitted: deriving "done" would hard-code lane words, which the data-driven gate forbids.
  - The back item goes to Missions.
- **Project head** (`ShellProject`): `eyebrow` is shell copy, `name` is `Project.name`, and `detail` is omitted.
- **WP tree** (sidebar of Work Packages): one leaf per `MissionDetail.workPackages[]`. `prefix` is `wpId`, `label` is
  the title, and `meta` is the contract lane word, passed through and never mapped.
- **Artifacts tree**: folders built from the listing paths. Expansion is session state (`sk-tree-toggle`).
- **`now`**: set from the injected clock when a result is applied and at mount. There is no ticking timer.
- **`getWorkPackage`** is read without `includePrompt`: no screen renders the prompt body.
- **Refused stream**: the "live updates are off" notice stays until the shell is remounted. There is no automatic
  resubscription, which would loop on a deterministic refusal. Reads continue (FR-010).
- **Banner copy**: shell defaults in `contracts/connection-presentation.md`. A host overrides the two degraded
  explanations through the optional `copy` option (spec Assumptions: where it lives is a plan decision). It is not part
  of `ShellHost`, which holds only actions.
- **Desktop-only intents on the dashboard**: the three named in FR-015 are no-ops. The dashboard's navigation also
  omits the "All projects" footer item and the pinned Projects rail item, so no control leads to the picker.
