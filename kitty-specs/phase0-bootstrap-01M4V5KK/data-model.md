# Data Model: Phase 0 bootstrap

There is no persistent storage. The entities are the shapes that cross module boundaries. Every contract shape comes from the pinned contract's schemas and is never redefined here.

## ExampleEntry (generated, `contracts/fixtures/mission-status.examples.json`)

| Field | Type | Rule |
|---|---|---|
| key | `<Schema>.<name>` | one per vendored file `examples/<Schema>.<name>.yaml` (about 78 at the current pin) |
| `schema` | string | the schema the example belongs to |
| `value` | JSON | the parsed YAML value, unchanged: no overlays, invisible characters escaped (F-21) |

**Invariant**: the set of keys and every value equal a fresh parse of the vendored YAML files. `Gate: contract` checks this, and it is the independent oracle for the stub test (F-04).

## RouteEntry (generated, `contracts/fixtures/mission-status.routes.json`)

| Field | Type | Rule |
|---|---|---|
| `operationId` | string | unique; exactly the operationIds in `openapi.yaml` (10 at the current pin: 9 reads plus `streamEvents`) |
| `method` | `"GET"` | every operation at the pin is a GET |
| `path` | string | the path template relative to the server URL (`/api/v1`), for example `/missions/{missionId}` |
| `kind` | `"read"` or `"stream"` | `stream` only for `streamEvents` |
| `responseSchema` | string or null | the schema name of the 200 response; `null` for `stream` |
| `defaultExample` | ExampleEntry key or null | taken from the reviewed `DEFAULT_EXAMPLES` map in `generate.mjs`; `null` only where the map says so explicitly; generation fails on a read whose schema is missing from the map |

**Invariant**: the set of `operationId`s equals the contract's set. This is checked by the contract gate (staleness) and by the coverage test (FR-009).

## FixtureEntry (generated, `contracts/fixtures/mission-status.fixtures.json`)

| Field | Type | Rule |
|---|---|---|
| key | fixture name | the same names as `scripts/contract/registry.mjs` `FIXTURES` |
| `schema` | string | the contract schema it validates against |
| `value` | JSON | validated against `schema` with no relaxation; invisible characters escaped |

**Invariant**: only registry entries of kind `valid` are emitted. `host` and `relaxed` entries carry non-contract fields and stay TypeScript-only.

## ChangeItem (authored, `contracts/fixtures/mission-status.changes.json`)

| Field | Type | Rule |
|---|---|---|
| `event` | `"status-transition"`, `"mission-lifecycle"` or `"log-truncated"` | the three SSE event names in the contract |
| `id` | StreamCursorString or absent | present only on mission-scoped status transitions; never on `log-truncated` (contract rule) |
| `data` | object | validates against `StatusTransitionEvent`, `MissionLifecycleEvent` or `LogTruncatedEvent` |
| `delayMs` | integer ≥ 0 | pause before this item; scaled by the consumer's time scale (0 in tests) |

**Invariants**:
- At least one item of each event kind (FR-011).
- One mission id across the sequence, and cursors strictly increasing among the items that carry an `id`.
- The file is static, so replay is deterministic (NFR-004).

## ConnectionState (TypeScript, `mission-shell`)

A closed union, exactly the spec's strings:

`'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch'`

The fixture adapter starts in `connected`, and tests can force any state. Real transition rules belong to `kitty-core` (#19).

## Change (TypeScript, `mission-shell`)

A discriminated union by `kind`:
- `{ kind: 'status-transition'; cursor: string | null; data: StatusTransitionEvent }`
- `{ kind: 'mission-lifecycle'; cursor: null; data: MissionLifecycleEvent }`
- `{ kind: 'log-truncated'; cursor: null; data: LogTruncatedEvent }`

`cursor` mirrors the SSE `id:`, and it is set only on a mission-scoped subscription.

## SubscriptionScope (TypeScript, `mission-shell`)

`{ missionId?: string; cursor?: string }`. A `cursor` is valid only together with `missionId`, matching the contract's `streamCursor`/`Last-Event-ID` rule. The fixture adapter ignores `cursor` and replays from the start; resume belongs to #19.

## MissionStatusClient (TypeScript port)

See `contracts/client-port.md`.
