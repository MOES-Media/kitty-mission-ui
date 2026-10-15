# Contract: `MissionStatusClient` port (`@moes-media/mission-shell`)

The port is transport-free: it does no I/O itself. Implementations in this mission: `createFixtureClient()`. Later implementations: the Tauri adapter (#20) and the HTTP adapter (#21).

The contract types come from mission-ui's generated file by deep import. mission-ui has no `exports` field, so the path resolves without any change to mission-ui (C-002, SC-005).

```ts
import type { components, operations } from '@moes-media/mission-ui/src/contract/types.generated';

type Schemas = components['schemas'];
type ReadOp = 'getProject' | 'listMissions' | 'getMission' | 'getWorkPackage' | 'getWorkPackageDetail'
            | 'listArtifacts' | 'getArtifactContent' | 'getDriftReport' | 'listOpsInvocations';

/** Path and query parameters of an operation, exactly as the contract declares them: the generated
 *  `operations[Op]['parameters']` used as is, so a required query (getArtifactContent's `query.path`)
 *  stays required and an optional one stays optional (R3-05). */
type Params<Op extends ReadOp> = operations[Op]['parameters'];

type Ok<Op extends ReadOp> = operations[Op]['responses'][200]['content']['application/json'];

/** Every refusal the contract declares for the operation. Refusals are `application/problem+json`
 *  (successes are `application/json`), so the refusal body is read from that media type (R3-01).
 *  `status` is a number: a schema shared by several statuses (for example ArtifactRefusal) carries
 *  its own `status` field, which is the authority (R3-02). The `default` Problem response is excluded,
 *  as in `routes.json` (A2, C2). */
type RefusingOp = ReadOp | 'streamEvents';
type Refusal<Op extends RefusingOp> = {
  [S in Exclude<keyof operations[Op]['responses'], 'default'>]: operations[Op]['responses'][S] extends { content: { 'application/problem+json': infer B } } ? { status: number; body: B } : never
}[Exclude<keyof operations[Op]['responses'], 'default'>];

export type Result<Op extends ReadOp> =
  | { ok: true; value: Ok<Op> }
  | { ok: false; refusal: Refusal<Op> }
  | { ok: false; unavailable: 'service-missing' | 'contract-mismatch' | 'transport' };

export type ConnectionState =
  | 'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch';

/** The four states as a runtime list; a type test asserts it equals `ConnectionState` exactly (B8, C14). */
export const CONNECTION_STATES = ['connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const;

export type Change =
  | { kind: 'status-transition'; cursor: string | null; data: Schemas['StatusTransitionEvent'] }
  | { kind: 'mission-lifecycle'; cursor: string | null; data: Schemas['MissionLifecycleEvent'] }
  | { kind: 'log-truncated'; cursor: null; data: Schemas['LogTruncatedEvent'] }
  | { kind: 'refused'; cursor: null; refusal: Refusal<'streamEvents'> };

/** The kinds as a runtime list; a type test asserts it equals `Change['kind']` exactly. */
export const CHANGE_KINDS = ['status-transition', 'mission-lifecycle', 'log-truncated', 'refused'] as const;

/** A cursor is valid only with a missionId; a cursor without a missionId key is a type error (pre-merge R1,
 *  CODE-BOUNDARY-002), and an empty missionId with a cursor is refused at run time. The contract refuses that request
 *  as 400 `cursor_without_mission`. */
export type SubscriptionScope = { missionId: string; cursor?: string } | { missionId?: undefined; cursor?: undefined };
// cursor: string on a mission-scoped subscription for status-transition and mission-lifecycle;
// null on an unscoped subscription, and always null for log-truncated (contract paths/events.yaml).

export interface MissionStatusClient {
  getProject(params: Params<'getProject'>): Promise<Result<'getProject'>>;
  listMissions(params: Params<'listMissions'>): Promise<Result<'listMissions'>>;
  getMission(params: Params<'getMission'>): Promise<Result<'getMission'>>;
  getWorkPackage(params: Params<'getWorkPackage'>): Promise<Result<'getWorkPackage'>>;       // includes query.includePrompt
  getWorkPackageDetail(params: Params<'getWorkPackageDetail'>): Promise<Result<'getWorkPackageDetail'>>;
  listArtifacts(params: Params<'listArtifacts'>): Promise<Result<'listArtifacts'>>;
  getArtifactContent(params: Params<'getArtifactContent'>): Promise<Result<'getArtifactContent'>>;
  getDriftReport(params: Params<'getDriftReport'>): Promise<Result<'getDriftReport'>>;
  listOpsInvocations(params: Params<'listOpsInvocations'>): Promise<Result<'listOpsInvocations'>>;
  subscribe(listener: (change: Change) => void, scope?: SubscriptionScope): () => void;      // streamEvents
  readonly connection: { readonly state: ConnectionState; onChange(listener: (s: ConnectionState) => void): () => void };
}

/** Port method -> operationId. The mapped type makes a missing or extra key a type error (F-03). */
export const CLIENT_OPERATIONS = {
  getProject: 'getProject', listMissions: 'listMissions', getMission: 'getMission',
  getWorkPackage: 'getWorkPackage', getWorkPackageDetail: 'getWorkPackageDetail',
  listArtifacts: 'listArtifacts', getArtifactContent: 'getArtifactContent',
  getDriftReport: 'getDriftReport', listOpsInvocations: 'listOpsInvocations',
  subscribe: 'streamEvents',
} as const satisfies { readonly [K in Exclude<keyof MissionStatusClient, 'connection'>]: string };
```

The helper types above are the design. The WP adjusts their spelling to whatever openapi-typescript 7.13.0 actually generates (for example, the response key may be a numeric or a string literal), without changing the port's surface.

## The stream's refusal channel (pre-merge R1, CODE-BOUNDARY-001)

`streamEvents` declares three refusals, all answered before any event is sent: 400 `StreamRefusal` (for example
`cursor_without_mission`), 404 `Problem` (an unknown Mission) and 409 `StreamRefusal` (for example `content_mismatch`).
`Refusal<'streamEvents'>` derives them from the generated `operations['streamEvents']['responses']`, exactly as for a read;
nothing is hand-written.

A refused subscription delivers exactly one change `{ kind: 'refused', cursor: null, refusal: { status, body } }` to the
subscription's listener, and nothing after it. The choice of a `Change` kind over a separate `onRefusal` callback:

- It reuses the port's existing refusal shape: `refusal: { status, body }` is the same object a read's `Result` carries in
  `{ ok: false, refusal }`, so a consumer handles a refused read and a refused stream with the same code.
- One listener sees everything the stream can say. An optional callback can be left out silently; a `Change` kind cannot,
  because a `switch` over `kind` with an exhaustive `never` default fails to type-check when `refused` is not handled
  (a type test asserts this).
- `subscribe`'s signature does not change, so the Tauri (#20) and HTTP (#21) adapters, and the shell in #18 and #19,
  implement or consume the refusal with no port change (SC-004).

`cursor` is always `null` on a refusal: no event was sent, so there is nothing to resume from.

The fixture adapter refuses when `options.examples.streamEvents` selects one of the route's refusal examples (as the stub
serves it on `/events` under `X-Kitty-Stub-Example`); a selection that is not a declared refusal of `streamEvents` throws
when the client is created. The refusal is delivered through the scheduler, never during `subscribe`, and unsubscribing
first cancels it.

A JavaScript caller can still send a cursor without a missionId, which the type forbids. The fixture adapter then refuses
the subscription as the upstream service does: one `refused` change with 400 and the shared example
`StreamRefusal.cursor-without-mission`. A selected refusal example takes precedence, as the stub serves a selected example
whatever the query. The stub differs here: it provides no conditional refusals (`stub-http.md`, "Not provided"), so
`/api/v1/events?streamCursor=…` without a `missionId` streams unscoped with 200. Tests that compare the fixture adapter
with the stub must not rely on this case.

## Rules

- `CLIENT_OPERATIONS` covers exactly the interface's methods (enforced by type), and its values equal the set of `routes.json` operationIds. The coverage test fails and names the read when either side is missing one (FR-008, FR-009).
- The coverage test also asserts that the fixture adapter's own methods are exactly the keys of `CLIENT_OPERATIONS`.
- A unit-tests plant deletes one entry together with its interface method, and the coverage test must fail.
- The connection state is a closed set of exactly the four spec strings.
- The port imports no I/O API (the no-io gate covers it).
