/**
 * The `MissionStatusClient` port (contracts/client-port.md, FR-008): every read of the pinned mission-status contract, a
 * change subscription and a closed five-value connection state. The port is transport-free and performs no I/O; adapters
 * implement it (the fixture adapter here, the desktop and HTTP adapters later). Contract types come from mission-ui's
 * generated file by deep import (mission-ui has no `exports` field, C-002); the provisional stream schemas are reached
 * through the aliases of ../contract/stream (contract gate C7).
 */
import type { operations } from '@moes-media/mission-ui/src/contract/types.generated';
import type { LifecycleEvent, StatusChangeEvent, TruncationEvent } from '../contract/stream';

/** The nine read operations of the contract. `streamEvents` is reached through `subscribe`. */
export type ReadOp =
  | 'getProject'
  | 'listMissions'
  | 'getMission'
  | 'getWorkPackage'
  | 'getWorkPackageDetail'
  | 'listArtifacts'
  | 'getArtifactContent'
  | 'getDriftReport'
  | 'listOpsInvocations';

/** Path and query parameters of an operation, exactly as generated, so a required query stays required (R3-05). */
export type Params<Op extends ReadOp> = operations[Op]['parameters'];

/** The `200` `application/json` body of a read. */
export type Ok<Op extends ReadOp> = operations[Op]['responses'][200]['content']['application/json'];

/** The operations that can refuse: the nine reads and the event stream (`subscribe`). */
export type RefusingOp = ReadOp | 'streamEvents';

type RefusalStatus<Op extends RefusingOp> = Exclude<keyof operations[Op]['responses'], 'default'>;

/** Every `application/problem+json` refusal the operation declares, the `default` Problem excluded (R3-01, A2). `status`
 *  is the refusal's own status: a schema shared by several statuses carries it in its body (R3-02). */
export type Refusal<Op extends RefusingOp> = {
  [S in RefusalStatus<Op>]: operations[Op]['responses'][S] extends { content: { 'application/problem+json': infer B } }
    ? { status: number; body: B }
    : never;
}[RefusalStatus<Op>];

export type Result<Op extends ReadOp> =
  | { ok: true; value: Ok<Op> }
  | { ok: false; refusal: Refusal<Op> }
  | { ok: false; unavailable: 'service-missing' | 'contract-mismatch' | 'transport' };

/** The connection of an adapter. `connecting` is the initial state, before first contact (SO-DES-003): an adapter that has
 *  not yet reached its service is neither `connected` nor `reconnecting`, and a shell must not show "reconnecting" on
 *  start-up. The other four are the states of FR-008. */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'degraded: service-missing'
  | 'degraded: contract-mismatch';

/** The states as a runtime list; a type test asserts it equals `ConnectionState` exactly (B8). */
export const CONNECTION_STATES = ['connecting', 'connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const;

/** One change of the stream. `cursor` mirrors the SSE `id:`: a string for status-transition and mission-lifecycle on a
 *  mission-scoped subscription, null on an unscoped one, and always null for log-truncated (R2-05).
 *
 *  `refused` is the refusal channel of the stream: the contract refuses a stream request before any event (400 and 409
 *  StreamRefusal, 404 Problem for an unknown Mission). A refused subscription delivers exactly one `refused` change, in the
 *  `{ status, body }` shape of a read's `Result` refusal, and nothing after it. It is a kind of `Change`, not a second
 *  callback, so one listener sees everything the stream can say and an exhaustive switch over `kind` cannot forget it. */
export type Change =
  | { kind: 'status-transition'; cursor: string | null; data: StatusChangeEvent }
  | { kind: 'mission-lifecycle'; cursor: string | null; data: LifecycleEvent }
  | { kind: 'log-truncated'; cursor: null; data: TruncationEvent }
  | { kind: 'refused'; cursor: null; refusal: Refusal<'streamEvents'> };

/** The kinds of `Change` as a runtime list; a type test asserts it equals `Change['kind']` exactly. */
export const CHANGE_KINDS = ['status-transition', 'mission-lifecycle', 'log-truncated', 'refused'] as const;

/** The scope of a subscription. A `cursor` is valid only together with `missionId` (the contract refuses a cursor without
 *  one as 400 `cursor_without_mission`), so a cursor without a `missionId` key is a type error: either a Mission,
 *  optionally with a cursor to resume after, or neither. An empty `missionId` is no Mission, as the stub reads
 *  `?missionId=`; with a cursor it type-checks but the subscription is refused at run time. */
export type SubscriptionScope = { missionId: string; cursor?: string } | { missionId?: undefined; cursor?: undefined };

export interface MissionStatusClient {
  getProject(params: Params<'getProject'>): Promise<Result<'getProject'>>;
  listMissions(params: Params<'listMissions'>): Promise<Result<'listMissions'>>;
  getMission(params: Params<'getMission'>): Promise<Result<'getMission'>>;
  getWorkPackage(params: Params<'getWorkPackage'>): Promise<Result<'getWorkPackage'>>;
  getWorkPackageDetail(params: Params<'getWorkPackageDetail'>): Promise<Result<'getWorkPackageDetail'>>;
  listArtifacts(params: Params<'listArtifacts'>): Promise<Result<'listArtifacts'>>;
  getArtifactContent(params: Params<'getArtifactContent'>): Promise<Result<'getArtifactContent'>>;
  getDriftReport(params: Params<'getDriftReport'>): Promise<Result<'getDriftReport'>>;
  listOpsInvocations(params: Params<'listOpsInvocations'>): Promise<Result<'listOpsInvocations'>>;
  /** streamEvents. Returns the unsubscribe function. */
  subscribe(listener: (change: Change) => void, scope?: SubscriptionScope): () => void;
  readonly connection: { readonly state: ConnectionState; onChange(listener: (state: ConnectionState) => void): () => void };
}

type ClientMethod = Exclude<keyof MissionStatusClient, 'connection'>;

/** Port method to operationId. The mapped type makes a missing or extra key a type error (F-03). */
export const CLIENT_OPERATIONS = {
  getProject: 'getProject',
  listMissions: 'listMissions',
  getMission: 'getMission',
  getWorkPackage: 'getWorkPackage',
  getWorkPackageDetail: 'getWorkPackageDetail',
  listArtifacts: 'listArtifacts',
  getArtifactContent: 'getArtifactContent',
  getDriftReport: 'getDriftReport',
  listOpsInvocations: 'listOpsInvocations',
  subscribe: 'streamEvents',
} as const satisfies { readonly [K in ClientMethod]: string };
