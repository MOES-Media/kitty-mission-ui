# Contract: `MissionStatusClient` port (`@moes-media/mission-shell`)

The port is transport-free: it does no I/O itself. Implementations in this mission: `createFixtureClient()`. Later implementations: the Tauri adapter (#20) and the HTTP adapter (#21).

The contract types come from mission-ui's generated file by deep import. mission-ui has no `exports` field, so the path resolves without any change to mission-ui (C-002, SC-005).

```ts
import type { components, operations } from '@moes-media/mission-ui/src/contract/types.generated';

type Schemas = components['schemas'];
type ReadOp = 'getProject' | 'listMissions' | 'getMission' | 'getWorkPackage' | 'getWorkPackageDetail'
            | 'listArtifacts' | 'getArtifactContent' | 'getDriftReport' | 'listOpsInvocations';

/** Path and query parameters of an operation, exactly as the contract declares them. */
type Params<Op extends ReadOp> =
  (operations[Op]['parameters'] extends { path: infer P } ? P : {}) &
  (operations[Op]['parameters'] extends { query?: infer Q } ? { query?: Q } : {});

type Ok<Op extends ReadOp> = operations[Op]['responses'][200]['content']['application/json'];

/** Every non-200 JSON response the contract declares for the operation (its refusal schemas). */
type Refusal<Op extends ReadOp> = Exclude<
  { [S in keyof operations[Op]['responses']]: operations[Op]['responses'][S] extends { content: { 'application/json': infer B } } ? { status: S; body: B } : never }[keyof operations[Op]['responses']],
  { status: 200 }>;

export type Result<Op extends ReadOp> =
  | { ok: true; value: Ok<Op> }
  | { ok: false; refusal: Refusal<Op> }
  | { ok: false; unavailable: 'service-missing' | 'contract-mismatch' | 'transport' };

export type ConnectionState =
  | 'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch';

export type Change =
  | { kind: 'status-transition'; cursor: string | null; data: Schemas['StatusTransitionEvent'] }
  | { kind: 'mission-lifecycle'; cursor: string | null; data: Schemas['MissionLifecycleEvent'] }
  | { kind: 'log-truncated'; cursor: null; data: Schemas['LogTruncatedEvent'] };

export interface SubscriptionScope { missionId?: string; cursor?: string }
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

## Rules

- `CLIENT_OPERATIONS` covers exactly the interface's methods (enforced by type), and its values equal the set of `routes.json` operationIds. The coverage test fails and names the read when either side is missing one (FR-008, FR-009).
- The coverage test also asserts that the fixture adapter's own methods are exactly the keys of `CLIENT_OPERATIONS`.
- A unit-tests plant deletes one entry together with its interface method, and the coverage test must fail.
- The connection state is a closed set of exactly the four spec strings.
- The port imports no I/O API (the no-io gate covers it).
