# Research: mission-shell (#18)

Phase 0 of `/spec-kitty.plan`. Each entry is a decision with its rationale and the alternatives considered. Nothing here
reopens the spec: the three operator rulings of 2026-10-15 and the binding decisions of the #17 landing review are
inputs, not questions.

The plan forks R-12 and R-17 were ruled by the operator on 2026-10-15, option A for both. The plan-squad fix round
(`reviews/plan.squad.md`) added five more rulings, recorded as resolved decision moments:

| Decision | Topic |
|---|---|
| `01M50K4DBT2VCW6DD4JQAGEMB4` | `unavailable` on a slot with data (R-06; spec amendment to FR-005) |
| `01M50K4G2G0EA0JN3B6YGH607S` | resync after a refused stream (R-18) |
| `01M50K4K059HSWKGA56KV7KNJC` | the `./shell` entry (R-10) |
| `01M50K4NSNYD9TEQ12T4J7KVHT` | a unit-tests plant in `test/shell` (R-15) |
| `01M50K4S90BX5W0M322WYH8SA1` | provisional timeouts with a landing fold (R-15) |

The port contract is the one in `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md` on this branch:
- five connection states;
- the `resync` and `refused` kinds;
- reads never reject.

Measurements cited below come from CI run 38756980500, the last green run of the #17 landing branch: gate-step and
proof-leg durations, read from the job steps.

## R-01 Where the shell's code sits, and how it is layered

- **Decision**: three layers inside `packages/mission-shell/src`.
  1. `core/`: plain TypeScript with no Svelte and no DOM. It holds:
     - destinations and routes;
     - the displayed-resource sets;
     - the refresh policy;
     - the read scheduler (coalescing, generations, gating, page chains);
     - result-to-view mapping;
     - the link-scheme check;
     - the connection presentation;
     - the host-interface wrappers.
  2. `controller/`: one deep module, `createShellController(options)`. It holds the subscription, the connection
     listener, the current destination, the session state and the resource slots. It exposes a snapshot, a
     `subscribe(listener)` with the Svelte store contract, and a small command surface: `navigate`, `intent`,
     `refresh`, `windowRefocused`, `setClient` and `destroy`.
  3. `ui/`: Svelte 5 components that render `sk-mission-shell`, the hosted screens, the banners, the Refresh button
     and the sidebar trees from the snapshot, and bind intents. Runes live here only.
- **The layering is enforced by lint** (`plan.md` IC-07, P-8), not by the test runner:
  - `src/{core,controller,intents}/**` may not import `svelte` or `svelte/*`;
  - they may not import `@moes-media/mission-ui` at run time; type imports are allowed.

  The Node test project only makes a violation visible sooner.
- **Rationale**:
  - The controller is a deep module (charter paradigm): a small interface over the whole refresh, connection and
    intent behaviour.
  - Its tests run in Node, which is the main lever on the unit-tests proof-leg cost (R-15).
  - Runes compiled for Node lose reactivity, so runes belong in the view only.
- **Alternatives considered**:
  - A runes controller. This was rejected because every test would then need the browser.
  - One large `MissionShell.svelte`. This was rejected because it is not testable without mounting.
  - A router or state library. This was rejected because it adds a new dependency for little gain.

## R-02 Route grammar (FR-002)

- **Decision**: a route is a path-like string. `formatRoute(destination)` and `parseRoute(route, mode)` round-trip.

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

- **Decoding** (R3-02):
  - Each segment is decoded with `decodeURIComponent` inside `try`/`catch`. A decoding failure (for example a lone
    `%`) makes the route unknown.
  - A decoded artifact path must match the contract's `ArtifactPath` pattern
    (`contracts/spec-kitty/mission-status/schemas/ArtifactPath.yaml`, also `minLength` 1 and `maxLength` 512). A Node
    test reads that file and asserts the shell's copy of the pattern is identical. Tests reading files are outside
    `src/`, so outside no-io.
  - A path the pattern refuses makes the route unknown. Tested cases:
    - `%` (malformed);
    - `..%2F` (a `..` segment);
    - `%2F` (a leading slash);
    - `%00` (NUL).
  - Mission and WP ids follow the contract's patterns (a ULID; `WP` and digits). Anything else is an unknown route,
    which parses to Missions. `/projects` parses to Missions on the dashboard.
- **Round trip** (R3-03):
  - The test compares **parsed destinations** (deep equality) for every destination: `parseRoute(formatRoute(d))`
    equals `d`.
  - A non-canonical encoding (for example `%2f` for `%2F`, or an encoded space where the canonical form differs)
    parses to the same destination, and `formatRoute` gives the canonical string.
- **`href`**: each navigation item and tree row gets `#` followed by the route. The elements call `preventDefault()`
  and emit `sk-navigate`, so the shell never navigates its window.
- **`routeChanged`** (R2-11):
  - It is called after every navigation the shell makes itself (an intent or the Refresh flow).
  - When the host sets a route that is not canonical, including an unknown route normalised to `/missions`, it is
    called once with the canonical route.
  - It is never called when the host sets a route that is already canonical, so no echo loop is possible.
- **Alternatives considered**: query-string routes, which are harder to read and match, and serialised JSON, which
  cannot serve as a deep link.

## R-03 The Work Packages and Artifacts navigation items with nothing selected (spec Assumptions)

- **Decision**: with no WP selected, the Work Packages item shows the Work Package screen with
  `status = 'nothing-selected'` and the WP tree in the sidebar. With no artifact selected, the Artifacts item shows the
  Artifact screen with `status = 'nothing-selected'` and the listing read.
- **This departs from the spec's assumption** (R1-05). The spec named two options: "the Mission's board through the
  Pipeline screen or the first WP". The plan picks a third, which is still within the existing screens: both screens
  define `nothing-selected`, and mission-ui's own `mission-work-package-none-selected-*` stories show this composition.
  - The departure is flagged for the operator at CP-1 (`plan.md`).
  - If the operator prefers the Pipeline board, only `displayedSet` and the WP-none row of the recording change.
- **Alternatives considered**: redirecting to the first WP, which invents a selection, and the Pipeline, which would
  mark the wrong navigation item as current.

## R-04 Displayed resources and "a resource of Mission M"

- **Decision**:
  - A displayed resource is one port read with its parameters (`ResourceKey`, `data-model.md`).
  - A resource is "of Mission M" exactly when its read parameters carry `missionId = M`.
  - The chrome reads are displayed resources: `getProject` in the project layout, and `getMission(M)` in the mission
    layout.
  - **"The Missions list"** in the refresh-policy table means the Missions screen's pages only (`missions`), never the
    Drift screen's name lookup (`mission-names`) (R1-04).
- **Rationale**: the rule is mechanical, testable, and needs no knowledge of what a response contains.

## R-05 Read scheduler: coalescing, bypass triggers, generations, stale-while-revalidate, gating, page chains

- **Generations** (R2-04):
  - One **controller-wide, monotonic** counter.
  - Every issued read takes the next number, and the slot stores the number of its latest issued read.
  - A result is applied only when its number equals the slot's latest.
  - Removing a slot discards it, so late results find no slot.
  - Test: A → B → A with a deferred read. The first A read resolves last, is dropped, and the second A read's value is
    shown.
- **Only stream changes coalesce** (R2-03). These are `status-transition`, `mission-lifecycle` and `log-truncated`:
  - A request on an idle slot issues the read at once (the leading read, which meets NFR-001) and arms a 100 ms window
    timer on the **injected scheduler**.
  - A request while the window is open, or while a read is in flight, sets `trailing`.
  - When the window timer fires: if `trailing` is set and nothing is in flight, one read is issued and a new window
    opens (R2-01). If `trailing` is set and a read is in flight, the trailing read is issued when that read settles,
    and a new window opens. Otherwise the slot is idle.
  - So a burst of five changes inside 100 ms gives exactly two reads (NFR-002). The second is issued at or after
    t = 100, and the trailing value is the one applied (R5-03).
- **Bypass triggers** (R2-03):
  - The triggers are navigation, `resync` (from the adapter, or shell-side after a refusal, R-18), Refresh, window
    refocus, retry (`sk-retry-load`, `sk-shell-retry`), and Rescan.
  - Each issues its read at once, with a new generation, even inside a window or with a read in flight. It clears
    `trailing` (the bypass read is newer) and opens a new window.
  - Load-more is not a re-read (see "Page chains"). **A cursor retry is a load-more** (FS-08): an Ops `sk-retry-load`
    with `target: 'ops-page'` and a `cursor` appends the page after that cursor and is not a bypass. A retry without a
    cursor re-reads the first page, and is a bypass.
- **Stale-while-revalidate** (R2-05):
  - A slot that holds a value keeps it, with its `ready` or `empty` view, while a re-read is in flight.
  - `loading` is shown only for a slot without a value.
  - Navigation creates fresh slots for keys that were not displayed, so a new screen shows `loading`. Keys displayed
    both before and after (chrome, or re-selecting the same destination) keep their values.
- **The connection gate** (R2-09 superseded by FS-01 and FS-02; spec FR-011, US4-1, US4-2):
  - **Per client** (FS2-01): the gate, the "first `connected`" mark and the refused flag belong to the current
    client, and `setClient` resets all three. A client already `connected` at mount or at `setClient` counts as that
    client's first `connected` and issues the displayed set at once. A Node test runs `setClient(b)` with `b` going
    `connecting` → `connected`, and expects shell-issued reads and no `resync`.
  - **No read is issued until the client's first `connected`.** While the state is `connecting`, or a `degraded` or
    `reconnecting` state reached before that client's first `connected`, requests are recorded but not issued.
  - **A degraded state before the first `connected`** (from `connecting`, or an initial degraded state) sets the
    no-value slots of the displayed set to `error` **without issuing reads**.
  - **The first `connected`, whatever came before it, issues the current displayed set itself**, as bypass reads. It is
    not a `resync`: the port and the fixture deliver no `resync` at first contact. The fixture starts its replay at
    the first `connected` and resynchronises only a subscription that has been live.
  - Later `connected` transitions are reconnects, followed by the adapter's `resync` (or a shell-side resync while the
    stream is refused, R-18).
  - Tests cover both paths:
    - `connecting` to `connected`: no `resync`; shell-issued reads at the first `connected`;
    - `connecting` to `degraded` to `connected`: 0 reads while degraded, `error` on the no-value slots, then no
      `resync`; shell-issued reads at the first `connected`.
- **Page chains** (R2-06, R5-10). For `missions` and `ops`, which have n pages loaded:
  - A re-read issues page 1, then each next page with `pageCursor` set to the `nextPageCursor` of the page **just
    read** (re-chained, never the old cursors), up to n pages or until a page has no next cursor.
  - All reads of a chain share one generation, and the chain is applied once, atomically, when it completes.
  - A refusal or `unavailable` on page 1 is handled like any read (R-06). On a page k > 1, the pages read so far are
    applied, with `pageInfo` from the last good page.
  - A newer generation discards the chain.
  - A chain of n pages is n port calls in the recording.
  - **Load-more** reads the next page with the screen's cursor and appends it, with `loadingMore` set.
    - A stream re-read requested during a load-more is `trailing`, and re-reads n + 1 pages after the append.
    - A bypass re-read during a load-more takes a new generation, so the load-more result is discarded and the chain
      re-reads n pages.
    - A load-more arriving while a chain is in flight is queued, and is issued after the chain applies with the
      **new** last page's cursor, if that page has one.
  - Test: two loaded pages and a `mission-lifecycle` change give exactly two `listMissions` calls (no cursor, then the
    cursor from the new page 1).
- **Alternatives considered**: a pure trailing debounce, which delays every first re-read and risks NFR-001, and
  aborting earlier reads, which needs the cancellation the port has reserved but not added.

## R-06 Applying a result; `unavailable` with data; degraded states (FR-005, US4; ruling `01M50K4DBT2VCW6DD4JQAGEMB4`)

- A **refusal** is an answer and always applies: `error`, with the refusal code where the screen has a refusal
  property, and `not-found` where the screen defines it for 404.
- **`unavailable`** is a non-answer. On a slot with data, it keeps the data and the view state. On a slot without data,
  it sets `error`. This is the operator's ruling, recorded in the spec as a dated amendment to FR-005.
- **Degraded states** (R1-01 superseded by FS-01 and FS-02):
  - While a state is `degraded`, every displayed slot without a value shows `error`, **even with a read in flight**
    (FS-05). The banner carries the explanation, and the read's result applies by the table when it arrives.
  - Before the first `connected` there are no reads: a degraded state sets the no-value slots to `error`, and the
    recorded requests are issued by the first `connected` (R-05).
  - Tests:
    - `connecting` to `degraded: service-missing` (0 reads, `error`), then `connected`: no `resync`; shell-issued reads
      at the first `connected`;
    - `initialState: 'degraded: contract-mismatch'`: 0 reads at mount, `error`, then the same at the first
      `connected`;
    - after the first `connected`: navigate while `degraded`, so the new no-value slot shows `error`, not `loading`,
      while its read is in flight (FS-05).
- A refused load-more cursor (400 `PageCursorRefusal`) drops the loaded pages and reads page 1 again.
- **Refusal coverage** (R5-08). The tests enumerate every refusal schema and status from `routes.json`:

  | Operation | Refusal schema: statuses |
  |---|---|
  | `getArtifactContent` | `ArtifactRefusal`: 400, 404, 413, 415, 422, 500 |
  | `getDriftReport` | `DriftRefusal`: 404, 500 |
  | `getMission`, `getWorkPackage` | `Problem`: 404 |
  | `getWorkPackageDetail` | `WorkPackageDetailRefusal`: 404, 500 |
  | `listArtifacts` | `ArtifactRefusal`: 404, 500 |
  | `listMissions` | `PageCursorRefusal`: 400 |
  | `listOpsInvocations` | `OpsRefusal`: 500; `PageCursorRefusal`: 400 |
  | `getProject` | none |

  - No vendored example has schema `Problem`. The tests inject one, `Problem.test-not-found` with `status: 404`,
    through `fixtures.examples` and select it with `examples: { getMission: 'Problem.test-not-found' }`. This is an
    additive use of existing options (C-003).
  - Out-of-order and sequenced results use two test-local clients in `test/support/`:
    - `createDeferredClient()`: every read returns a promise that the test resolves or settles;
    - `createSequencedClient(queues)`: one queue of `Result`s per operation.

## R-07 How a Svelte shell gets into the existing Storybook and visual gate (FR-018, C-002, SC-006)

- **Decision**:
  - The stories are `packages/mission-shell/src/stories/*.stories.ts`, written for the existing
    `@storybook/web-components-vite` framework.
  - Each `render` mounts `MissionShell.svelte` with Svelte's `mount()` and returns its root `sk-mission-shell`
    element.
  - Every story's mount is unmounted in a `beforeEach` cleanup (R4-07), so no instance outlives its story.
  - `apps/storybook/.storybook/main.ts` gains a second `stories` glob,
    `../../../packages/mission-shell/src/**/*.stories.ts`, and the plugin
    `svelte({ configFile: false, preprocess: vitePreprocess() })`. The explicit `configFile: false` stops a stray
    `svelte.config.js` being picked up (R3-06).
  - `apps/storybook/package.json` declares `@moes-media/mission-shell` (`workspace:*`), `svelte` 5.57.1 and
    `@sveltejs/vite-plugin-svelte` 6.2.4 (R-16).
- **Constraint from the harness**: the story's first element must be a registered custom element that reflects the
  `tier` of a `vw-*` story. `sk-mission-shell` does both, so `MissionShell.svelte` has exactly one root element.
- **Mount technique**, proven first in an IC-08a spike, in order of preference:
  - (a) mount into a detached container and return `container.firstElementChild`;
  - (b) mount into a `DocumentFragment` and return the fragment;
  - (c) a story-only wrapper element that mirrors `tier`.
- **Alternatives considered**:
  - A second Storybook with the Svelte framework. This was rejected: new dependencies and a second visual run.
  - Stories in mission-ui. This was rejected because it breaks C-002.
  - Stories under `apps/storybook/src`. This was rejected because they would escape the `packages/*/src` scans.

## R-08 Story data, connection states and timers in stories

- **Decision**: the stories import `createFixtureClient` from `../testing`, the package's own test entry, by relative
  path.
  - The ESLint boundary block's patterns (`**/client/fixture`, `**/fixture`, `**/harness/**` and the fixture JSON) do
    not match that path, so **no boundary exemption is added** (R4-07). The boundary block is unchanged.
  - A story-local `storyClient({ state, startConnected })` wraps the fixture client:
    - `connection` reports `state`. With `startConnected`, used by the stories "with data", it first reports
      `connected` (the shell reads nothing before the first `connected`, FS-01).
    - **Settling** (FS2-04): `storyClient` tracks every read promise it hands out and exposes `whenSettled()`. The
      switch from `connected` to `state` happens on the microtask after the last tracked read settles.
    - Reads always delegate to the fixture. The former `reads: 'unavailable'` option is dropped (FS2-03): no story
      needs it, because the contract-mismatch story issues no reads.
  - The fixture is created with `fixtures: { changes: { missionId: <the sequence id>, items: [] } }`, so nothing
    replays during a story (R2-12).
  - The `refused` story selects `examples: { streamEvents: 'StreamRefusal.content-mismatch' }`.
  - An immediate scheduler satisfies the reconnecting grace, and a fixed clock keeps relative times stable.
- The fixture's `setConnectionState` stays internal (C-003).

## R-09 Intent coverage check (FR-004, SC-001, FR-017)

- **Decision**: a type-level check, judged by `svelte-check` in `Gate: typecheck`.
  - `scripts/typings.mjs` additionally emits, into the generated `elements.d.ts`:
    - `MissionUiIntents`, a map `{ [tag]: { [event]: Detail } }` read from the manifest, where each detail type is the
      one the generator already uses for the `on<event>` handlers (R4-05);
    - `MissionUiTag` = `keyof MissionUiIntents`.
  - `INTENT_TABLE` in `src/intents/table.ts`:
    - entries have the type `(controller, detail: MissionUiIntents[T][E]) => void`, or `{ via: H }`;
    - `H` must be a hosting tag that declares the same event with a detail type assignable both ways.
  - **The check type** (R5-02):

    ```ts
    type Declared = { [T in HostedTag]: `${T} ${keyof MissionUiIntents[T] & string}` }[HostedTag];
    type Mapped = { [T in keyof typeof INTENT_TABLE]: `${T} ${keyof (typeof INTENT_TABLE)[T] & string}` }[keyof typeof INTENT_TABLE];
    const unmapped: [Exclude<Declared, Mapped>] extends [never] ? true : Exclude<Declared, Mapped> = true;
    const unknownIntent: [Exclude<Mapped, Declared>] extends [never] ? true : Exclude<Mapped, Declared> = true;
    ```

    - A missing pair makes `true` not assignable to the literal `'sk-drift-screen sk-copy-command'`. svelte-check
      prints that literal, so the error names the intent.
    - The table is written with one entry per line, so the plant's anchor `'sk-copy-command':` is unique.
  - `HostedTag` = `Exclude<MissionUiTag, 'sk-mission-sample'>` (excluded by name, FR-004).
  - Nested pattern elements are `{ via: … }` entries. The binding layer listens only on hosting elements, so each
    intent is handled exactly once.
  - The browser **intent sweep is driven from `INTENT_TABLE`**: one case per `(tag, event)` pair, 40 in all (R5-10).
- **Counts** (R1-07): 40 pairs and **23 distinct intent names** (verified against `custom-elements.json`).
- **Rationale**: a typecheck plant costs about 0.27 min per run, against about 2 min for a unit-tests run.

## R-10 Host interface, modes, entries and prerequisites (FR-012 to FR-015)

- **Entries** (ruling `01M50K4K059HSWKGA56KV7KNJC`, R4-01):
  - `.` stays port-only and unchanged.
  - A new, additive `./shell` export (`src/shell.ts`) carries `MissionShell`, `mountShell`, `ShellHost`,
    `ShellOptions`, `ShellMode`, `ShellScheduler`, `formatRoute`, `parseRoute` and `Destination`.
  - `./testing` is unchanged.
  - `test/package.test.ts` is updated to expect the three entries exactly.
- **`MissionShell` props**: `client` (a client or `null`), `host` (a `ShellHost`), `mode` (`'desktop'` or
  `'dashboard'`, required), `route`, and optional `scheduler`, `clock` and `copy`.
- **`mountShell(target, options)`** returns `{ setRoute(route), setClient(client, route?), destroy() }`.
  `setClient(client, route?)` switches the project and, optionally, the route in one step (R2-11).
- **`ShellHost` members** are all optional. Each call goes through a wrapper that catches a throw or a rejection and
  applies the fallback (NFR-007).
  - **`openExternalLink`** carries `sk-artifact-screen`'s obligations in its documentation (R3-05). The host MUST
    re-validate the scheme case-insensitively before acting, MUST NOT navigate its window or webview to the link, and
    SHOULD show the destination before opening it.
- **The dashboard guard** (R2-11, R3-04, R4-03): in `mode: 'dashboard'`, every picker and dialog intent is ignored,
  with no host call, no state change and nothing thrown:
  - `sk-open-project`;
  - `sk-request-open-project`;
  - the Projects `sk-retry-load`;
  - `sk-browse-folder`;
  - `sk-confirm-open-project`;
  - the dialog `sk-retry-load`.

  This is tested through `controller.intent` in Node. The positive control: the same recording host in desktop mode
  gets exactly one call per intent.
- **The dashboard with `client: null`**:
  - This is not a picker state: the project layout with the shell `status: 'error'` and the copy "No project is open."
  - It makes no reads and never throws.
  - A later `setClient` recovers.
- **A change of client** releases the old subscription, connection listener and refocus listener, drops every slot,
  and subscribes the new client (SO-DES-013, FR-007).
- **Host prerequisites** (R4-02), documented in the README and `contracts/shell-api.md`:
  - `@spec-kitty/tokens` CSS loaded, with its fonts resolvable;
  - `document.documentElement` carrying `data-theme`;
  - a bundler that compiles Svelte for the `./shell` entry (Vite with `@sveltejs/vite-plugin-svelte`, as in this
    repository).

  The `sk-*` library elements are registered through mission-ui: its element modules import `@spec-kitty/elements`,
  and the shell imports `@moes-media/mission-ui` at top level. So the shell **relies on that registration**, declares
  no direct `@spec-kitty/elements` dependency, and documents the reliance.
- **Alternatives considered**: inferring the mode from host members, which makes FR-015's positive control
  impossible, and native actions on the port, which breaks C-003.

## R-11 Explicit refresh, Refresh button and visibility (FR-016, operator ruling 01M50D491TSVP2DCY0HF9F940W)

- **Decision**:
  - The Refresh button is `<sk-button variant="ghost" size="sm">` in `top-bar-actions`, only on the Artifact and Ops
    destinations.
  - `controller.refresh()`, and `host.onWindowRefocus` on those two destinations, re-read the destination's own
    explicit-refresh keys once. These are bypass triggers (R-05).
  - Drift keeps its Rescan.
  - Chrome keys are not re-read by a refresh.
- **Design review**: the button and the banners are not in the prototype, so they carry the design-review flag (R-14).

## R-12 Visual proof of the banner (FR-017, FR-018) (RULED: A)

- **Ruling** (decision `01M50HMCBJMREJ5XJASGE29X73`, resolved): the single visual plant moves from `sk-mission-sample`
  to the reconnecting-banner story. The visual leg keeps two runs.
- **The plant is a guaranteed visible change** (R5-12, R6-01). The anchored edit changes the reconnecting entry of the
  tone table in `src/ui/ConnectionBanner.svelte` from `tone: 'attention'` to `tone: 'danger'`. The table is one line
  per state:

  ```
  reconnecting: { tone: 'attention', announce: 'polite' },
  ```

  - The token is `shell-connection-banners--reconnecting-1280-diff.png`.
  - IC-08a proves the plant once locally (`heavy pnpm gate-proof leg --gate visual`, in the foreground) before
    hand-off. It cannot be proven before the file exists.
- **Facts behind the ruling**:
  - `Gate: visual` measured 17.10 min.
  - Its leg ran 37.43 min for two runs, against a timeout of 60.
  - Eleven stories add about 0.6 min per run.

## R-13 C-001 and C-005 enforcement in the shell (in scope by the R-17 ruling)

- **Facts**: the no-io gate bans `location` and bare `window`, but not `history`, `navigator`, `open` or the other
  globals below. Raw controls are banned only inside Lit templates. C-001 keeps no-io unchanged.
- **Decision** (R4-06, R3-01): one ESLint block for `packages/mission-shell/src/**` in `eslint.config.mjs`, with
  failure-only messages.
  - `no-restricted-globals`: `history`, `navigator`, `open`, `postMessage`, `print`, `alert`, `confirm`, `prompt`.
    Each message reads `shell-io: <name> is forbidden in the shell; go through the host interface (C-001)`.
  - `no-restricted-properties`: `document.execCommand` and `document.location`, with `shell-io:` messages.
  - `svelte/no-restricted-html-elements`, with one message: `shell-markup: raw controls and resource-loading elements
    are forbidden in shell markup; use the sk-* elements (C-001, C-005)`. It covers:
    - raw controls: `button`, `input`, `select`, `textarea`;
    - links and forms: `a`, `form`;
    - embedding: `iframe`, `object`, `embed`;
    - resource loading: `img`, `link`;
    - media: `audio`, `video`, `source`.
- **The layering block** (R4-04): a sibling block for `src/{core,controller,intents}/**` repeats the boundary block's
  three patterns from one shared constant, and adds:
  - `svelte` and `svelte/*`;
  - `@moes-media/mission-ui` and `@moes-media/mission-ui/*`, with `allowTypeImports: true`;
  - the message `shell-layering: core, controller and intents import neither svelte nor the mission-ui runtime`.

  A sibling block is needed because a later block replaces `no-restricted-imports` options for the files it matches.
- **Plants**:

  | Plant | Proves | Token |
  |---|---|---|
  | P-3 | raw `<button>` | `shell-markup: raw controls` |
  | P-4 | `navigator.clipboard.writeText` | `shell-io: navigator is forbidden` |
  | P-8 | `import { tick } from 'svelte'` in `src/core` | `shell-layering:` |

## R-14 Design review of the banners and the Refresh button (FR-018, SC-007)

- **Decision**: checkpoint **CP-1**, owned by the orchestrator, with the work split around it (R6-04).
  1. **IC-08a** writes the stories, proves the mount technique and P-6, and commits candidate baselines produced in the
     pinned image only (`heavy pnpm visual:update`).
  2. **At CP-1** the operator sees:
     - the eleven candidate PNGs;
     - the copy of `contracts/connection-presentation.md`;
     - the R-03 departure (no-selection screens).
  3. **The record.** The orchestrator commits on `feat/mission-shell-18`:
     - `kitty-specs/mission-shell-01M50D2J/design-review.md`, a dated `CP-1 confirmed` entry with any amendments;
     - `kitty-specs/mission-shell-01M50D2J/design-review.sha256`, in `sha256sum` format, with paths relative to the
       repository root, one line per approved baseline (R5-05).
  4. **IC-08b** applies any amendment. It may edit the IC-06 files (`src/ui/**`) and the IC-03 files
     (`src/core/connection.ts`, copy constants) for that purpose. It then regenerates the baselines, re-proves P-6,
     and asks the orchestrator to update both records.
  5. **Checks**:
     - IC-08b's reviewer, IC-09 and the pre-merge squad run `sha256sum -c` on `design-review.sha256`.
     - They also check that the set of `shell-*.png` files equals the set listed.
     - Any rebase or commit that touches a `shell-*.png` after CP-1 **reopens CP-1**.
  6. The PR body carries the "Design review" section (SC-007).

## R-15 Proof-leg cost (SO-DES-017) and timeouts (rulings `01M50K4NSNYD9TEQ12T4J7KVHT`, `01M50K4S90BX5W0M322WYH8SA1`)

- **Decision**:
  - **Unit-tests** gets two new plants: P-1 (the refresh policy, Node project) and P-7 (the mounted-shell routing,
    `test/shell`, by the operator's ruling).
  - Intent coverage is the typecheck plant P-2.
  - The lint rules are eslint plants P-3, P-4 and P-8.
  - The Storybook glob is the storybook-build plant P-5.
  - The visual plant is moved, as P-6.
  - The `logic` project runs with `browser: { enabled: false }` and `environment: 'node'`, and carries a sentinel test
    asserting `typeof window === 'undefined'` (R5-10).
- **Projected impact.** The formula is (1 + plants) × the measured gate step + 2, never lowered.

  | Leg | Today: plants / runs / measured leg | Measured gate step | After: plants / runs | Projected gate step | Projected leg | Formula | Timeout |
  |---|---|---|---|---|---|---|---|
  | unit-tests | 8 / 9 / 13.82 min | 2.15 | 10 / 11 | about 2.7 | about 22.5 | (1+10) × 2.7 + 2 = 31.7 | **32** (provisional) |
  | typecheck | 4 / 5 / 1.17 | 0.27 | 5 / 6 | about 0.35 | about 1.6 | 4.1 | 6 (unchanged) |
  | eslint | 9 / 10 / 2.88 | 0.37 | 12 / 13 | about 0.45 | about 4.2 | 7.85 | 8 (unchanged; raised if the step exceeds 0.46) |
  | storybook-build | 1 / 2 / 0.27 | 0.20 | 2 / 3 | about 0.3 | about 0.9 | 2.9 | 8 (unchanged) |
  | visual | 1 / 2 / 37.43 | 17.10 | 1 / 2 | about 17.7 | about 39 | 37.4 | 60 (unchanged) |

- **How the timeouts are set** (ruling `01M50K4S90BX5W0M322WYH8SA1`, the #17 precedent):
  - IC-09 sets **provisional** timeouts from local `gate-proof` measurements (run under `heavy`).
  - A post-PR `(landing)` fold re-derives them from the PR's first CI run.
  - **The visual timeout is never set from the formula alone** (R6-09). It stays at 60 because the rule never lowers a
    timeout; the formula value (about 37) is recorded, not applied.
- **Alternatives considered**: a plant per behaviour, about 12 min more on the leg, and running everything in Chromium,
  about 5 min more.

## R-16 Supply chain (DIRECTIVE_051, NFR-006)

- **Decision**: no new package and no new version enters `pnpm-lock.yaml`.
  - `apps/storybook/package.json` declares, all already locked:
    - `@moes-media/mission-shell` (`workspace:*`);
    - `svelte` 5.57.1: exact; published 2026-09-18; no install scripts;
    - `@sveltejs/vite-plugin-svelte` 6.2.4: exact; published 2026-01-09; no install scripts.
  - `packages/mission-shell/package.json` changes only its `exports` (R-10).
  - The `packages:` section of the lockfile is unchanged, and so is `allowBuilds`.
- **Controls**:

  | Control | Result |
  |---|---|
  | exact pin | yes |
  | age of 14 days or more | yes |
  | install scripts | none |
  | registry | unchanged |
  | new transitive packages | none |

- **Adversarial evidence**: no security-impacting dependency decision is made, so the dependency challenge is not
  triggered. The plan squad covered this entry.

## R-17 What C-003's "gate wiring" covers (RULED: A)

- **Ruling** (decision `01M50HMK3E7A4XA93PZMZ9KBT8`, resolved): "gate wiring" is the gate set and how each gate is
  bound. The frozen surface, extended by the plan squad (R5-04, R6-02):
  - **`.github/workflows/ci.yml`**:
    - the job ids, `needs`, and each `id: gate` step's `run`;
    - the proof-matrix gate list and each `include` `image`, and `all.needs`;
    - **every job's `timeout-minutes`, exactly**.

    Proof-leg matrix `timeout` values may **only rise**.
  - **Plants**: every plant's `ciCommand` and `prepare`. Every base plant except the ruled visual one is retained,
    compared by gate, overlay targets and token.
  - **Gate-proof**: `scripts/gate-proof.mjs` and `scripts/gate-proof/**`.
  - **The visual harness**: `scripts/visual.sh`, `apps/storybook/playwright.config.ts` and
    `apps/storybook/tests/visual/**` except `__snapshots__/` (see below).
  - **The port and #17 shell internals** (FS-07): `packages/mission-shell/src/index.ts`, `src/testing.ts`,
    `src/client/**`, `src/contract/stream.ts`, `src/harness/**` and `src/Shell.svelte`.
  - **no-io**: `eslint.no-io.config.mjs`, `eslint-rules/svelte.mjs` and `gates/no-io.selftest.ts`.
  - **Hygiene**: `scripts/check-hygiene.mjs` and `scripts/hygiene/**`.
  - **Scripts**:
    - the root gate scripts: `typecheck`, `lint`, `lint:styles`, `lint:no-io`, `test:no-io`, `lint:data-driven`,
      `test:data-driven`, `manifest:check`, `hygiene`, `test:scripts`, `test:terminology`, `test`, `build-storybook`,
      `storybook:build-only`, `visual`, `contract:check`, `test:contract`;
    - every package's `test` and `typecheck` scripts;
    - `apps/storybook`'s `scripts`.
  - **Baselines** (R5-01): `git diff --exit-code --diff-filter=MDR "$base" -- apps/storybook/tests/visual/__snapshots__/`.
    No baseline is modified, deleted or renamed. Only `shell-*.png` files may be added.
  - **The base** is `git merge-base HEAD main`, which contains #17 (R1-06, R6-06). PR #32 was squash-merged as
    `39a51a6`, and IC-09 keeps the guard `git merge-base --is-ancestor 39a51a6 "$base"`.

  Rule content, plants, story globs, package test projects and formula-derived matrix timeouts may change.

## R-18 Smaller decisions

- **Drift Mission names**: from the first page of `listMissions` (`mission-names`), read with the drift report.
- **Mission head**:
  - `title` is `friendlyName`, or else `slug`; `id` is `slug`;
  - one tag, `missionType`, with tone `neutral`;
  - no `progress`, because deriving it would hard-code lane words;
  - the back item goes to Missions.
- **Project head**: the eyebrow is shell copy and the name is `Project.name`.
- **Trees**:
  - the WP tree has one leaf per `MissionDetail.workPackages[]`, with `meta` as the contract lane word, passed
    through;
  - the artifacts tree has folders from the paths, with expansion as session state.
- **`now`**: from the injected clock, set when a result is applied. There are no ticking timers.
- **`getWorkPackage`**: read without `includePrompt`.
- **After `log-truncated`** (R2-13): the shell's subscription is unscoped, so it needs no resubscribe. The adapter
  drops a stored cursor only for scoped subscriptions, and the unscoped stream carries on.
- **Refused stream** (ruling `01M50K4G2G0EA0JN3B6YGH607S`, R2-10):
  - The "live updates are off" notice stays until remount.
  - The shell never opens a new subscription.
  - While live updates are off, **every `connected` that is not the first ever is treated as a shell-side `resync`**,
    which re-reads the displayed set as a bypass trigger. A refused subscription receives no adapter `resync`, so
    reconnects would otherwise leave stale data.
- **Copy protocol** (R2-07, FS-03):
  - The controller takes an injected flush hook, `afterRender: () => Promise<void>`. The view (`ui/`) supplies one
    that awaits Svelte's `tick()`. The default, used in Node, is `() => Promise.resolve()`. So the controller never
    imports Svelte, and the layering of P-8 holds.
  - On `sk-copy-command`, the controller sets `copyResult = null`, emits the snapshot, **awaits `afterRender`**, then
    awaits `host.copyText`, and finally sets the answer.
  - So two consecutive `copied` answers each reach the screen as a change. This is tested in Chromium; in Node, the
    order of the calls is asserted.
- **The reconnecting grace timer** (R2-08):
  - Entering `reconnecting` updates the state first, then arms a 1 s timer on the injected scheduler.
  - Every exit clears it, and a re-entry arms a fresh one.
  - Test: `reconnecting`, then 0.5 s `connected`, then `reconnecting`. The banner appears only 1 s after the second
    entry.
- **Banner copy**: shell defaults. A host overrides the degraded explanations through `copy`.
- **Desktop-only intents on the dashboard**: R-10.
