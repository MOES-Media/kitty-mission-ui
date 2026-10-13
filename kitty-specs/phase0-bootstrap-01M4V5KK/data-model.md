# Data Model: Phase 0 bootstrap

There is no persistent storage. The entities are the shapes that cross module boundaries. Every contract shape comes from the pinned contract's schemas and is never redefined here.

## RouteEntry (generated, `contracts/fixtures/mission-status.routes.json`)

| Field | Type | Rule |
|---|---|---|
| `operationId` | string | unique; exactly the operationIds in `openapi.yaml` (10 at the current pin) |
| `method` | `"GET"` | every operation at the pin is a GET |
| `path` | string | the path template relative to the server URL (`/api/v1`), for example `/missions/{missionId}` |
| `responseSchema` | string | the schema name of the 200 response (for `streamEvents`: `null`, because it is an event stream) |
| `defaultFixture` | string or null | the name of a `valid` fixture, chosen as the vendored example of `responseSchema`; `null` when no example exists |
| `kind` | `"read"` or `"stream"` | `stream` only for `streamEvents` |

**Invariant**: the set of `operationId`s equals the contract's set. This is checked by the contract gate (staleness) and by the coverage test (FR-009).

## FixtureEntry (generated, `contracts/fixtures/mission-status.fixtures.json`)

| Field | Type | Rule |
|---|---|---|
| key | fixture name | the same names as `scripts/contract/registry.mjs` `FIXTURES` |
| `schema` | string | the contract schema it validates against |
| `value` | JSON | validated against `schema` with no relaxation |

**Invariant**: only registry entries of kind `valid` are emitted. `host` and `relaxed` entries carry non-contract fields and stay TypeScript-only.

## ChangeItem (authored, `contracts/fixtures/mission-status.changes.json`)

| Field | Type | Rule |
|---|---|---|
| `event` | `"status-transition"`, `"mission-lifecycle"` or `"log-truncated"` | the three SSE event names in the contract |
| `id` | StreamCursorString or absent | present only for mission-scoped status transitions; never on `log-truncated` (contract rule) |
| `data` | object | validates against `StatusTransitionEvent`, `MissionLifecycleEvent` or `LogTruncatedEvent` |
| `delayMs` | integer ≥ 0 | pause before this item; the fixture adapter's timers are injectable |

**Invariants**:
- At least one item of each event kind (FR-011).
- One mission id across the sequence, and cursors strictly increasing among the items that carry an `id`.
- The file is static, so replay is byte-identical (NFR-004).

## ConnectionState (TypeScript, `mission-shell`)

A closed union: `'connected' | 'reconnecting' | 'degraded:service-missing' | 'degraded:contract-mismatch'`.

The fixture adapter starts in `connected`, and tests can force any state.

**Transitions**: the fixture adapter accepts any transition. Real transition rules belong to `kitty-core` (#19).

## Change (TypeScript, `mission-shell`)

`{ kind: 'status-transition' | 'mission-lifecycle' | 'log-truncated'; cursor: string | null; data: <the contract event type for that kind> }`

`kind` mirrors `event`, and `cursor` mirrors `id`.

## MissionStatusClient (TypeScript port)

See `contracts/client-port.md`.
