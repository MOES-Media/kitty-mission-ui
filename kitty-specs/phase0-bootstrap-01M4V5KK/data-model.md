# Data Model: Phase 0 bootstrap

There is no persistent storage. The entities are the shapes that cross module boundaries. Every contract shape comes from the pinned contract's schemas and is never redefined here.

## ExampleEntry (generated, `contracts/fixtures/mission-status.examples.json`)

| Field | Type | Rule |
|---|---|---|
| key | `<Schema>.<name>` | one per vendored file `examples/<Schema>.<name>.yaml` (77 at the current pin; `_index.yaml` is not an example and is excluded, as `loadExamples` in `generate.mjs` already does) |
| `schema` | string | the schema the example belongs to |
| `value` | JSON | the parsed YAML value, unchanged: no overlays, invisible characters escaped (F-21) |

**Invariant**: the set of keys and every value equal a fresh parse of the vendored YAML files, `_index.yaml` excluded. `Gate: contract` checks this, and it is the independent oracle for the stub test (F-04).

## RouteEntry (generated, `contracts/fixtures/mission-status.routes.json`)

| Field | Type | Rule |
|---|---|---|
| `operationId` | string | unique; exactly the operationIds in `openapi.yaml` (10 at the current pin: 9 reads plus `streamEvents`) |
| `method` | `"GET"` | every operation at the pin is a GET |
| `path` | string | the path template relative to the server URL (`/api/v1`), for example `/missions/{missionId}` |
| `kind` | `"read"` or `"stream"` | `stream` only for `streamEvents` |
| `responseSchema` | string or null | the schema name of the 200 response; `null` for `stream` |
| `defaultExample` | ExampleEntry key or null | taken from the reviewed `DEFAULT_EXAMPLES` map in `generate.mjs`, keyed by **operationId** (`operationId → "<Schema>.<name>"`; A6); `null` only where the map says so explicitly; generation fails on a read missing from the map, or on an entry naming an example that does not exist or is not of the route's `responseSchema`; `null` for `stream` |
| `refusals` | object `{ <schema name>: [<HTTP status>, …] }` | every `application/problem+json` response the operation declares in `openapi.yaml` (refusals are problem+json, not `application/json`; R3-01), grouped by schema with the numeric statuses that schema may carry on this operation (one schema can cover several, for example `ArtifactRefusal`; R3-02); only numbered responses count: the `default` Problem response is not a selectable refusal (A2); `{}` when none. Numbered responses that resolve to the shared `_shared/responses/Problem.yaml` count too: `getMission`, `getWorkPackage` and `streamEvents` each carry `Problem: [404]` (B4). The `stream` route therefore lists `{ Problem: [404], StreamRefusal: [400, 409] }`, which the stub's events route validates against (A5). At the current pin no vendored example has schema `Problem`, so the `Problem` keys add no selectable example |

**Invariant**: the set of `operationId`s equals the contract's set, and each route's `refusals` equals the operation's declared `application/problem+json` responses, grouped by schema. The `refusals` part is checked by the contract gate (staleness against a fresh generation) and by WP03's generator tests, which assert the full map; the FR-009 coverage test compares operationIds only (B18).

## FixtureEntry (generated, `contracts/fixtures/mission-status.fixtures.json`)

| Field | Type | Rule |
|---|---|---|
| key | fixture name | the same names as `scripts/contract/registry.mjs` `FIXTURES` |
| `schema` | string | the contract schema it validates against |
| `value` | JSON | validated against `schema` with no relaxation; invisible characters escaped |

**Invariant**: only registry entries of kind `valid` are emitted. `host` and `relaxed` entries carry non-contract fields and stay TypeScript-only.

## ChangeItem (authored, `contracts/fixtures/mission-status.changes.json`)

The file is an envelope `{ "missionId": <the one mission id of the sequence>, "items": [ChangeItem, …] }` (A4).

| Field | Type | Rule |
|---|---|---|
| `event` | `"status-transition"`, `"mission-lifecycle"` or `"log-truncated"` | the three SSE event names in the contract |
| `scopedId` | StreamCursorString or absent | the cursor (`id:` line) the item carries on a **mission-scoped** stream: present on `status-transition` and `mission-lifecycle` items, never on `log-truncated` (contract rule). On an unscoped stream no item is sent with an `id:` line, whatever this field says (R2-05) |
| `data` | object | validates against `StatusTransitionEvent`, `MissionLifecycleEvent` or `LogTruncatedEvent` |
| `delayMs` | integer ≥ 0 | pause before this item; scaled by the consumer's time scale (0 in tests) |

**Invariants**:
- At least one item of each event kind (FR-011).
- One mission id across the sequence (the envelope's `missionId`), and `scopedId` offsets strictly increasing among the items that carry one.
- The file is static, so replay is deterministic (NFR-004).

## ConnectionState (TypeScript, `mission-shell`)

A closed union: the four strings of FR-008 plus `connecting`, the initial state before first contact (SO-DES-003):

`'connecting' | 'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch'`

The port also exports `CONNECTION_STATES`, the same five strings as a `const` tuple, and a type test proves the union and the tuple are equal both ways (B8, D10).

A real adapter starts in `connecting`. The fixture adapter starts in `connected` by default (a documented test convenience), and tests can force any state. The mapping of transport events to states is the adapter's (see "Ownership" below).

## Change (TypeScript, `mission-shell`)

A discriminated union by `kind`:
- `{ kind: 'status-transition'; cursor: string | null; data: StatusTransitionEvent }`
- `{ kind: 'mission-lifecycle'; cursor: string | null; data: MissionLifecycleEvent }`
- `{ kind: 'log-truncated'; cursor: null; data: LogTruncatedEvent }`
- `{ kind: 'refused'; cursor: null; refusal: Refusal<'streamEvents'> }`: the stream's refusal channel; ends the subscription
- `{ kind: 'resync'; cursor: null; reason: 'reconnected' }`: delivered after each reconnect, before any further event; means "refetch everything" (SO-DES-002; `contracts/client-port.md`, "Subscription lifecycle")

`cursor` mirrors the SSE `id:`. It is a string for `status-transition` and `mission-lifecycle` on a mission-scoped subscription, `null` for every kind on an unscoped subscription, and always `null` for `log-truncated` (contract `paths/events.yaml`; R2-05).

## SubscriptionScope (TypeScript, `mission-shell`)

A discriminated union (`packages/mission-shell/src/client/port.ts`): `{ missionId: string; cursor?: string } | { missionId?: undefined; cursor?: undefined }`. A `cursor` is valid only together with a `missionId`, matching the contract's `streamCursor`/`Last-Event-ID` rule, so a cursor without a `missionId` is a type error (CODE-BOUNDARY-002). An empty `missionId` is no mission: with a cursor it type-checks, but the subscription is refused at run time with 400 `cursor_without_mission`. The fixture adapter ignores `cursor` and replays from the start (a replay needs no stored position). `cursor` is the text form of the contract's `streamCursor` parameter (`toStreamCursorString`); resume is the adapters' job (see "Ownership").

## Ownership (SO-DES-001)

Who owns what behind the port, so #18 to #21 build against it without changing it (SC-004):

| Owner | Owns |
|---|---|
| The shell (`mission-shell`, #18 and #19) | refresh policy: what to refetch and when, including its reaction to `resync` and `log-truncated`, and how it shows each `ConnectionState` |
| An adapter (fixture, Tauri #20, HTTP #21) | transport, reconnect, backoff, cursor bookkeeping (the last cursor delivered, dropped after `log-truncated`) and the mapping of transport events to `ConnectionState` |
| `kitty-core` | supervision of the service, discovery, the digest check and the raw `Change` relay |

This replaces the earlier statement that resume belongs to #19. Resume is the adapters' (the stored cursor), the decision
to refetch is the shell's, and `kitty-core` relays raw changes without interpreting them.

## MissionStatusClient (TypeScript port)

See `contracts/client-port.md`.
