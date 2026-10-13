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
| `refusals` | object `{ <schema name>: [<HTTP status>, …] }` | every `application/problem+json` response the operation declares in `openapi.yaml` (refusals are problem+json, not `application/json`; R3-01), grouped by schema with the numeric statuses that schema may carry on this operation (one schema can cover several, for example `ArtifactRefusal`; R3-02); only numbered responses count: the `default` Problem response is not a selectable refusal (A2); `{}` when none. The `stream` route lists its numbered problem+json responses too (`StreamRefusal: [400, 409]`), which the stub's events route validates against (A5) |

**Invariant**: the set of `operationId`s equals the contract's set, and each route's `refusals` equals the operation's declared `application/problem+json` responses, grouped by schema. This is checked by the contract gate (staleness) and by the coverage test (FR-009).

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

A closed union, exactly the spec's strings:

`'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch'`

The fixture adapter starts in `connected`, and tests can force any state. Real transition rules belong to `kitty-core` (#19).

## Change (TypeScript, `mission-shell`)

A discriminated union by `kind`:
- `{ kind: 'status-transition'; cursor: string | null; data: StatusTransitionEvent }`
- `{ kind: 'mission-lifecycle'; cursor: string | null; data: MissionLifecycleEvent }`
- `{ kind: 'log-truncated'; cursor: null; data: LogTruncatedEvent }`

`cursor` mirrors the SSE `id:`. It is a string for `status-transition` and `mission-lifecycle` on a mission-scoped subscription, `null` for every kind on an unscoped subscription, and always `null` for `log-truncated` (contract `paths/events.yaml`; R2-05).

## SubscriptionScope (TypeScript, `mission-shell`)

`{ missionId?: string; cursor?: string }`. A `cursor` is valid only together with `missionId`, matching the contract's `streamCursor`/`Last-Event-ID` rule. The fixture adapter ignores `cursor` and replays from the start; resume belongs to #19.

## MissionStatusClient (TypeScript port)

See `contracts/client-port.md`.
