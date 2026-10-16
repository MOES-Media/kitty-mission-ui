# @moes-media/mission-shell

The shared Svelte 5 layer between the mission-ui screens and a host (Kitty Desktop, Kitty Dashboard). It mounts the
screens, hands them their data and reacts to their `sk-*` intents. It reads data only through a transport-free port and
performs **no I/O**: no fetch, XHR, EventSource, WebSocket, Tauri API, storage, `location` or bare `window`. The adapters
that do I/O live under `apps/*` and `crates/*`. The no-io gate covers `src/**/*.{ts,svelte}`.

Not to be confused with the `sk-mission-shell` element of mission-ui, which is the screens' layout chrome.

Phase 0 (issue `#17`) delivers the port, an in-memory fixture adapter, the generated element typings and the permanent
binding check. Issue `#18` delivers the shell itself, on the `./shell` entry: routing, layout, the refresh policy and the
connection banners.

```bash
pnpm --filter @moes-media/mission-shell typecheck   # svelte-check, including the intent coverage check types
pnpm --filter @moes-media/mission-shell test        # both Vitest projects: logic and unit
```

The test run has two projects. `logic` runs in Node with the browser disabled (routes, the refresh engine, the
controller and the host wrappers). `unit` runs in Chromium (the mounted shell: routing, banners and bindings). Run the
browser project through `heavy` on a shared machine.

## The shell: `@moes-media/mission-shell/shell`

A host mounts the shell with one `MissionStatusClient` and a small host interface. The host needs no other change to
the shell's surface. The full contract is `kitty-specs/mission-shell-01M50D2J/contracts/shell-api.md`.

### Entries

| Entry | Contents |
|---|---|
| `.` | The port only: `MissionStatusClient` and its types, `CLIENT_OPERATIONS`, `CONNECTION_STATES`, `CHANGE_KINDS`, `READ_OPS`, `toStreamCursorString`. Unchanged. |
| `./testing` | The in-memory fixture adapter. Unchanged. |
| `./shell` | New. `mountShell`, `MissionShell`, `formatRoute`, `parseRoute` and the types `Destination`, `ShellMode`, `ShellHost`, `ShellScheduler`, `ShellCopyOverrides` and `ShellOptions`. |

`test/package.test.ts` pins exactly these three entries.

### Host prerequisites

- Load the `@spec-kitty/tokens` CSS, and make sure its fonts resolve.
- Set `data-theme` on `document.documentElement`.
- Use a bundler that compiles Svelte for the `./shell` entry, for example Vite with `@sveltejs/vite-plugin-svelte`.
- Do nothing for the `sk-*` elements. The shell imports `@moes-media/mission-ui`, which registers them.

### Mounting

```ts
import { mountShell } from '@moes-media/mission-shell/shell';

const shell = mountShell(document.querySelector('#app')!, {
  client: myAdapter,
  mode: 'dashboard',
  route: currentHashRoute(),
  host: {
    openExternalLink: (href) => { /* re-validate the scheme, never navigate the window, show the destination first */ },
    copyText: async (text) => 'copied',
    onWindowRefocus: (listener) => { /* add a visibility or focus listener */ return () => {}; },
    routeChanged: (route) => { /* push to the host's history */ },
  },
});
```

`mountShell` returns four methods:

- `setRoute(route)` shows a route. Call it on back and forward.
- `setClient(client, route?)` switches project. It releases the old subscriptions, drops the loaded data and subscribes
  the new client. It keeps the session's drawer and flyout state, and can set the route in the same step.
- `setCopy(copy)` replaces the host's banner copy overrides (`ShellOptions.copy`) and the banner updates on the next
  render. The overrides are replaced as a whole, not merged: `setCopy({ serviceMissing })` drops an earlier
  `contractMismatch` override, and `setCopy({})` restores the defaults. It does nothing after `destroy`.
- `destroy()` releases everything.

A Svelte host can render `<MissionShell {client} {mode} {route} {host} />` from the same entry.

`ShellOptions`:

- `client`: the project's client, or `null`. On the desktop, `null` shows the project picker. On the dashboard, `null`
  shows the project layout with the error "No project is open.", and makes no reads.
- `host`: the optional host interface (see below).
- `mode`: `'desktop'` or `'dashboard'`. The brand follows the mode: "kitty desktop" or "kitty dashboard".
- `route`: the starting route.
- `scheduler`: a `setTimeout` and `clearTimeout` pair. The shell uses it for the 100 ms coalescing window and the 1 s
  reconnecting grace. Tests pass a fake one.
- `clock`: returns the current `Date`. The shell uses it for relative times, for example in the picker.
- `copy`: overrides for the two degraded banners (`serviceMissing`, `contractMismatch`), each a `{ title, body }`.
  A Svelte host that changes the `copy` prop gets the same effect as `setCopy`; a prop that becomes `undefined`
  restores the defaults.

### Routes

`formatRoute(destination)` and `parseRoute(route, mode)` round-trip. A route that does not parse becomes Missions.

| Destination | Route |
|---|---|
| Missions | `/missions` |
| Drift, whole project | `/drift` |
| Drift, one Mission | `/drift/{missionId}` |
| Ops | `/ops` |
| Pipeline of a Mission | `/missions/{missionId}` |
| Work Packages of a Mission, none selected | `/missions/{missionId}/work-packages` |
| Work Package | `/missions/{missionId}/work-packages/{wpId}` |
| Artifacts of a Mission, none selected | `/missions/{missionId}/artifacts` |
| Artifact | `/missions/{missionId}/artifacts/{encodeURIComponent(path)}` |
| Projects (desktop only) | `/projects` |

On the dashboard, `/projects` parses to Missions.

`routeChanged(route)` runs after each navigation the shell makes itself. When the host sets a route that is not
canonical, it runs once with the canonical route. It never runs for a host-set route that is already canonical, so a
host cannot create an echo loop.

### Refresh policy (summary)

The shell reads only through the port, and keeps one unscoped subscription. A change re-reads only the displayed
resources it affects, coalesced in 100 ms windows. A `resync` re-reads everything on display. Data stays on screen while
a re-read runs. The Refresh button appears only on Artifact and Ops. The full table is
`kitty-specs/mission-shell-01M50D2J/data-model.md`, with the rules in `contracts/refresh-policy.md` in the same folder.

### Connection presentation

The shell shows at most one banner above the screen, as an `sk-notice`. These are the conditions, as confirmed at the
design review (CP-1):

| Condition | Tone | Title |
|---|---|---|
| connecting | info | Connecting |
| reconnecting | attention | Reconnecting |
| degraded: service-missing | danger | Service not available |
| degraded: contract-mismatch | danger | Incompatible service |
| the change stream was refused | neutral | Live updates are off |

- Reconnecting shows only after 1 s. A shorter drop shows nothing.
- While a degraded banner is shown, the shell hides its own chrome error and Retry. The banner explains the cause.
- A degraded banner says "Data that was already loaded stays visible." only when data is on screen. With nothing
  loaded, the body is the first sentence alone.
- A host can replace the two degraded titles and bodies through `copy`, or later through `setCopy`. The shell shows an
  override as given: the loaded-data rule above applies to the default text only, and an override is the host's own
  wording, shown in both cases. Removing an override brings the default and its rule back.

### Host interface

Every `ShellHost` member is optional. A member that is absent, throws or rejects falls back as follows, and the shell
never throws because of it.

| Member | Fallback |
|---|---|
| `copyText(text)` | The copy reports `manual` |
| `openExternalLink(href)` | Nothing opens |
| `listRecentProjects()` | The picker shows its error state |
| `openProject(target)` | Nothing happens |
| `listFolders(location)` | The folder dialog shows its error state |
| `onWindowRefocus(listener)` | No refresh on refocus |
| `routeChanged(route)` | Nothing happens |

`openExternalLink(href)` has obligations. The shell has already checked that the scheme is exactly http, https or
mailto (case-insensitive). The href is still untrusted document content. The host **MUST** re-validate the scheme
(case-insensitively) before acting, **MUST NOT** navigate its own window or webview to it, and **SHOULD** show the
destination to the user before opening it.

The dashboard never shows desktop-only actions. A picker or dialog intent does nothing there.

### What a host can rely on

- The shell does no I/O. It calls only the port, the `ShellHost` members and the scheduler.
- The shell makes exactly one unscoped `client.subscribe`, one `client.connection.onChange` and, when the member exists,
  one `host.onWindowRefocus`. It releases all three on `destroy` and on `setClient`.
- After a refused stream, the shell does not subscribe again before a client change. Each later reconnect is a
  shell-side resync.
- The shell never throws because of a host member.
- Adapters (`#20`, `#21`), `kitty-core` (`#19`) and any write path are out of scope.

## The port: `MissionStatusClient`

`src/client/port.ts`, exported from the package entry (`@moes-media/mission-shell`). Its design is `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md`.

- One method per read of the pinned contract: `getProject`, `listMissions`, `getMission`, `getWorkPackage`,
  `getWorkPackageDetail`, `listArtifacts`, `getArtifactContent`, `getDriftReport` and `listOpsInvocations`. Each takes the
  operation's path and query parameters exactly as the generated contract types declare them (`Params<Op>`), so a
  required query parameter stays required.
- Each read resolves to a `Result<Op>`: `{ ok: true, value }`, `{ ok: false, refusal: { status, body } }` for a
  refusal the contract declares (`application/problem+json`; the body's own `status` is the authority), or
  `{ ok: false, unavailable: 'service-missing' | 'contract-mismatch' | 'transport' }`. **A read never rejects.** An
  undeclared status, the `default` Problem, a timeout or an IPC error is `unavailable: 'transport'`. Cancellation is
  reserved as an optional second parameter `{ signal?: AbortSignal }` whose abort rejects with an `AbortError`.
  `READ_OPS` lists the nine reads, derived from `CLIENT_OPERATIONS`.
- `subscribe(listener, scope?)` is the change stream (`streamEvents`) and returns an unsubscribe function. A `Change`
  has a `kind` (`status-transition`, `mission-lifecycle` or `log-truncated`), a `cursor` and the contract's event `data`.
  The kind `resync`, `{ kind: 'resync', cursor: null, reason: 'reconnected' }`, is delivered after each reconnect, before
  any further change, and means "refetch everything"; it does not end the subscription. The kind `refused`, is the stream's refusal channel: a refused subscription delivers exactly one
  `{ kind: 'refused', cursor: null, refusal: { status, body } }` and nothing after it. `Refusal<'streamEvents'>` is derived
  from the contract: 400 and 409 `StreamRefusal`, 404 `Problem`. The kinds are listed at run time as `CHANGE_KINDS`.
- `connection.state` is one of exactly five `ConnectionState` values, also listed at run time as `CONNECTION_STATES`:
  `connecting` (the initial state, before first contact), `connected`, `reconnecting`, `degraded: service-missing` and
  `degraded: contract-mismatch` (with a space after the colon). `connection.onChange(listener)` returns an unsubscribe function.
- `CLIENT_OPERATIONS` maps each method to its operationId. A mapped type with `satisfies` makes a missing or extra key a
  type error, and `test/port-coverage.test.ts` fails, naming the read, when the table and the contract's routes differ.

**The cursor rule.** `SubscriptionScope` is `{ missionId, cursor? }` or `{}`: a `cursor` without a `missionId` does not
type-check, because the contract refuses it (400 `cursor_without_mission`), and the fixture adapter refuses it the same
way when a JavaScript caller sends one. On a subscription scoped to a Mission (a non-empty `scope.missionId`; an empty one is unscoped, as the stub reads
`?missionId=`), status transitions and lifecycle events carry a string cursor. On an unscoped subscription every cursor is `null`, and a log-truncated marker always has a `null`
cursor. A log-truncated marker is its own kind, never a status change.

`toStreamCursorString(cursor)` turns the `streamCursor` object of an event's data into the text form that `Change.cursor`,
`SubscriptionScope.cursor` and the contract's `streamCursor` parameter carry (`offset:invariant`). It is the one place the
shell knows that form, exported from the entry and defined in `src/contract/stream.ts`, where a type test pins the
`streamEvents` query to exactly `missionId` and `streamCursor`.

**Lifecycle and ownership.** Subscriptions survive state changes; a scoped one resumes from the last cursor it delivered;
after `log-truncated` the adapter drops its cursor and the consumer re-subscribes from the Mission detail; `refused` may
arrive at the start or after any reconnect and ends the subscription; `resync` follows each reconnect. The shell owns the
refresh policy, adapters own transport, reconnect, backoff, cursor bookkeeping and the state mapping, and `kitty-core` owns
supervision, discovery, the digest check and the raw relay. Both are written out in
`kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md` and `data-model.md`.

The contract types come from mission-ui's generated `src/contract/types.generated.ts` by deep import, so mission-ui
needs no `exports` change.

## The fixture adapter: `createFixtureClient(options?)`

Imported from its own entry, `@moes-media/mission-shell/testing` (`src/testing.ts`), together with its option types
(`FixtureClientOptions`, `Scheduler`, `RouteEntry`, `ExampleTable`, `ChangesEnvelope`). The `exports` map of
`package.json` names exactly three entries, `.`, `./testing` and `./shell`, so the production entry never pulls in the
fixture JSON and no deep import reaches the package's internals.

An in-memory `MissionStatusClient` over the shared files in `contracts/fixtures/` (imported as JSON, which is not I/O).
Every read resolves to its route's default example; `subscribe` replays `mission-status.changes.json` in order.

| Option | Default | Effect |
|---|---|---|
| `examples` | each route's `defaultExample` | an example key (`<Schema>.<name>`) per read, and for `streamEvents`. A refusal example resolves as a refusal with its own status (for `streamEvents`, every subscription receives one `refused` change); a schema the operation does not declare throws when the client is created. |
| `fixtures` | the files of `contracts/fixtures/` | replacement `routes`, `examples` or `changes` data, for tests |
| `scheduler` | the global `setTimeout` and `clearTimeout` | the timer pair that spaces replayed changes by their `delayMs`; inject a fake one for deterministic tests |
| `initialState` | `connected` | the starting connection state. A real adapter starts in `connecting`; the fixture defaults to `connected` because most tests want a live connection, and passes `connecting` to test start-up |

Reads return independent copies, and never reject: a value that cannot be copied resolves as `unavailable: 'transport'`.
Replay always starts at the first change (resuming from `scope.cursor` belongs to the real adapters) and is identical on
every run. A change is delivered before the next one is scheduled, so a scheduler that fires at once keeps the order, and a
listener that unsubscribes stops the replay.

The test hook `setConnectionState` is internal to the package's tests (they import it from `src/client/fixture.ts` by
relative path) and is exported from neither entry. It drives the subscriptions of that client:

- While the state is not `connected` the replay pauses where it is (the replay index is the stored cursor), and a
  subscription opened then starts at the first `connected`.
- A return to `connected` from any other state delivers one `resync` to every open subscription, scoped or not, after the
  state listeners have heard the change and before the replay continues. The first contact (`connecting` to `connected`) is
  not a reconnect and gets none, and a refused or unsubscribed subscription gets none.
- Every listener runs even when one throws; the errors are rethrown afterwards as one `AggregateError`.

Production sources of the shell cannot import `client/fixture`, `harness/**` or the fixture JSON: an ESLint block bans
them (only the adapter, `testing.ts` and the harness may), so the fixture data never reaches the `.` entry.

## Binding the screens

`src/harness/BindingHarness.svelte` mounts the real `sk-missions-screen` exactly as the shell will, and
`test/binding.test.ts` is the permanent check that keeps the binding working (it runs in `Gate: unit-tests` on every pull
request). Shell code follows the same rules:

1. **Register first.** Import `@moes-media/mission-ui` for its side effect at the top level of the module that mounts a
   screen, so every element is defined before Svelte creates it. Mounted before registration, Svelte still sets objects
   as properties, but it sets a primitive as an attribute: `loadingMore` becomes the attribute `loadingmore`, which Lit
   does not observe, so the screen never sees it. The check therefore passes the non-default primitive
   `loadingMore={true}` and asserts both that the property is `true` and that no stray attribute exists, as well as that
   the list arrives as an array.
2. **Bind intents with `onsk-…` attributes.** Bind each event as `onsk-open-mission={handler}`: the generated typings
   type each one with its event's detail, and `svelte-check` rejects an unknown or renamed event name and a handler of
   the wrong type. (This was decided when the typings were built: svelte-check flags both, so no separate `intents`
   action is generated.) The check reads every event the screen declares in `custom-elements.json` and requires each to
   reach the handler with its detail; one is triggered through real UI.
3. **Use the generated typings.** `src/generated/elements.d.ts` declares every mission-ui element's public properties
   and one `on<event>` handler per declared event, so a renamed property or event fails the type check. It is generated
   from `packages/mission-ui/custom-elements.json` by `scripts/typings.mjs`; never edit it. After a mission-ui manifest
   change run `node scripts/typings.mjs`, then `pnpm manifest:check`, which fails when the file is stale.

`pnpm manifest:generate` regenerates the manifest and then this file. The generated file is linted like every other source by the three ESLint configurations. Exception E-46, which ignored it
by exact path, was withdrawn on 2026-10-15 because its sunset was met: the generator's output is lint-clean under all three.
