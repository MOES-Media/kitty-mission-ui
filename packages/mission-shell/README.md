# @moes-media/mission-shell

The shared Svelte 5 layer between the mission-ui screens and a host (Kitty Desktop, Kitty Dashboard). It mounts the
screens, hands them their data and reacts to their `sk-*` intents. It reads data only through a transport-free port and
performs **no I/O**: no fetch, XHR, EventSource, WebSocket, Tauri API, storage, `location` or bare `window`. The adapters
that do I/O live under `apps/*` and `crates/*`. The no-io gate covers `src/**/*.{ts,svelte}`.

Not to be confused with the `sk-mission-shell` element of mission-ui, which is the screens' layout chrome.

Phase 0 (issue `#17`) delivers the port, an in-memory fixture adapter, the generated element typings and the permanent
binding check. Real routing and layout arrive in `#18`.

```bash
pnpm --filter @moes-media/mission-shell typecheck   # svelte-check, warnings fail
pnpm --filter @moes-media/mission-shell test        # Vitest browser mode (Chromium)
```

## The port: `MissionStatusClient`

`src/client/port.ts`, exported from the package entry (`@moes-media/mission-shell`). Its design is `kitty-specs/phase0-bootstrap-01M4V5KK/contracts/client-port.md`.

- One method per read of the pinned contract: `getProject`, `listMissions`, `getMission`, `getWorkPackage`,
  `getWorkPackageDetail`, `listArtifacts`, `getArtifactContent`, `getDriftReport` and `listOpsInvocations`. Each takes the
  operation's path and query parameters exactly as the generated contract types declare them (`Params<Op>`), so a
  required query parameter stays required.
- Each read resolves to a `Result<Op>`: `{ ok: true, value }`, `{ ok: false, refusal: { status, body } }` for a
  refusal the contract declares (`application/problem+json`; the body's own `status` is the authority), or
  `{ ok: false, unavailable: 'service-missing' | 'contract-mismatch' | 'transport' }`.
- `subscribe(listener, scope?)` is the change stream (`streamEvents`) and returns an unsubscribe function. A `Change`
  has a `kind` (`status-transition`, `mission-lifecycle` or `log-truncated`), a `cursor` and the contract's event `data`.
  The fourth kind, `refused`, is the stream's refusal channel: a refused subscription delivers exactly one
  `{ kind: 'refused', cursor: null, refusal: { status, body } }` and nothing after it. `Refusal<'streamEvents'>` is derived
  from the contract: 400 and 409 `StreamRefusal`, 404 `Problem`. The kinds are listed at run time as `CHANGE_KINDS`.
- `connection.state` is one of exactly four `ConnectionState` values, also listed at run time as `CONNECTION_STATES`:
  `connected`, `reconnecting`, `degraded: service-missing` and `degraded: contract-mismatch` (with a space after the
  colon). `connection.onChange(listener)` returns an unsubscribe function.
- `CLIENT_OPERATIONS` maps each method to its operationId. A mapped type with `satisfies` makes a missing or extra key a
  type error, and `test/port-coverage.test.ts` fails, naming the read, when the table and the contract's routes differ.

**The cursor rule.** `SubscriptionScope` is `{ missionId, cursor? }` or `{}`: a `cursor` without a `missionId` does not
type-check, because the contract refuses it (400 `cursor_without_mission`), and the fixture adapter refuses it the same
way when a JavaScript caller sends one. On a subscription scoped to a Mission (a non-empty `scope.missionId`; an empty one is unscoped, as the stub reads
`?missionId=`), status transitions and lifecycle events carry a string cursor. On an unscoped subscription every cursor is `null`, and a log-truncated marker always has a `null`
cursor. A log-truncated marker is its own kind, never a status change.

The contract types come from mission-ui's generated `src/contract/types.generated.ts` by deep import, so mission-ui
needs no `exports` change.

## The fixture adapter: `createFixtureClient(options?)`

Imported from its own entry, `@moes-media/mission-shell/testing` (`src/testing.ts`), together with its option types
(`FixtureClientOptions`, `Scheduler`, `RouteEntry`, `ExampleTable`, `ChangesEnvelope`). The `exports` map of
`package.json` names exactly two entries, `.` and `./testing`, so the production entry never pulls in the fixture JSON and
no deep import reaches the package's internals.

An in-memory `MissionStatusClient` over the shared files in `contracts/fixtures/` (imported as JSON, which is not I/O).
Every read resolves to its route's default example; `subscribe` replays `mission-status.changes.json` in order.

| Option | Default | Effect |
|---|---|---|
| `examples` | each route's `defaultExample` | an example key (`<Schema>.<name>`) per read, and for `streamEvents`. A refusal example resolves as a refusal with its own status (for `streamEvents`, every subscription receives one `refused` change); a schema the operation does not declare throws when the client is created. |
| `fixtures` | the files of `contracts/fixtures/` | replacement `routes`, `examples` or `changes` data, for tests |
| `scheduler` | the global `setTimeout` and `clearTimeout` | the timer pair that spaces replayed changes by their `delayMs`; inject a fake one for deterministic tests |
| `initialState` | `connected` | the starting connection state |

Reads return independent copies. Replay always starts at the first change (resuming from `scope.cursor` belongs to the
real adapters) and is identical on every run. The test hook `setConnectionState` is internal to the package's tests (they
import it from `src/client/fixture.ts` by relative path) and is exported from neither entry.

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

The generated file is linted like every other source by the three ESLint configurations. Exception E-46, which ignored it
by exact path, was withdrawn on 2026-10-15 because its sunset was met: the generator's output is lint-clean under all three.
