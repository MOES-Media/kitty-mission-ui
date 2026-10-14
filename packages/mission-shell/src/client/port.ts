/**
 * The `MissionStatusClient` port (contracts/client-port.md, FR-008): every read of the pinned mission-status contract, a
 * change subscription and a closed four-value connection state. The port is transport-free and performs no I/O; adapters
 * implement it (the fixture adapter here, the desktop and HTTP adapters later). Contract types come from mission-ui's
 * generated file by deep import (mission-ui has no `exports` field, C-002).
 */
import type { components, operations } from '@moes-media/mission-ui/src/contract/types.generated';

type Schemas = components['schemas'];

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

type RefusalStatus<Op extends ReadOp> = Exclude<keyof operations[Op]['responses'], 'default'>;

/** Every `application/problem+json` refusal the operation declares, the `default` Problem excluded (R3-01, A2). `status`
 *  is the refusal's own status: a schema shared by several statuses carries it in its body (R3-02). */
export type Refusal<Op extends ReadOp> = {
  [S in RefusalStatus<Op>]: operations[Op]['responses'][S] extends { content: { 'application/problem+json': infer B } }
    ? { status: number; body: B }
    : never;
}[RefusalStatus<Op>];

export type Result<Op extends ReadOp> =
  | { ok: true; value: Ok<Op> }
  | { ok: false; refusal: Refusal<Op> }
  | { ok: false; unavailable: 'service-missing' | 'contract-mismatch' | 'transport' };

export type ConnectionState = 'connected' | 'reconnecting' | 'degraded: service-missing' | 'degraded: contract-mismatch';

/** The four states as a runtime list; a type test asserts it equals `ConnectionState` exactly (B8). */
export const CONNECTION_STATES = ['connected', 'reconnecting', 'degraded: service-missing', 'degraded: contract-mismatch'] as const;

/** One change of the stream. `cursor` mirrors the SSE `id:`: a string for status-transition and mission-lifecycle on a
 *  mission-scoped subscription, null on an unscoped one, and always null for log-truncated (R2-05). */
export type Change =
  | { kind: 'status-transition'; cursor: string | null; data: Schemas['StatusTransitionEvent'] }
  | { kind: 'mission-lifecycle'; cursor: string | null; data: Schemas['MissionLifecycleEvent'] }
  | { kind: 'log-truncated'; cursor: null; data: Schemas['LogTruncatedEvent'] };

/** A `cursor` is valid only together with `missionId` (the contract's streamCursor rule). */
export interface SubscriptionScope {
  missionId?: string;
  cursor?: string;
}

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
