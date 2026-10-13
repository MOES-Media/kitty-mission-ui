# Contract: `MissionStatusClient` port (`@moes-media/mission-shell`)

The port is transport-free: it does no I/O itself. Implementations in this mission: `createFixtureClient()`. Later implementations: the Tauri adapter (#20) and the HTTP adapter (#21).

```ts
import type { components } from '@moes-media/mission-ui/contract'; // the existing generated contract types

export type ConnectionState =
  | 'connected' | 'reconnecting' | 'degraded:service-missing' | 'degraded:contract-mismatch';

export interface Change { kind: 'status-transition' | 'mission-lifecycle' | 'log-truncated'; cursor: string | null; data: unknown /* narrowed per kind */ }

export interface MissionStatusClient {
  getProject(): Promise<Result<'getProject'>>;
  listMissions(query?: Query<'listMissions'>): Promise<Result<'listMissions'>>;
  getMission(missionId: string): Promise<Result<'getMission'>>;
  getWorkPackage(missionId: string, wpId: string): Promise<Result<'getWorkPackage'>>;
  getWorkPackageDetail(missionId: string, wpId: string): Promise<Result<'getWorkPackageDetail'>>;
  listArtifacts(missionId: string): Promise<Result<'listArtifacts'>>;
  getArtifactContent(missionId: string, query: Query<'getArtifactContent'>): Promise<Result<'getArtifactContent'>>;
  getDriftReport(query?: Query<'getDriftReport'>): Promise<Result<'getDriftReport'>>;
  listOpsInvocations(query?: Query<'listOpsInvocations'>): Promise<Result<'listOpsInvocations'>>;
  subscribe(listener: (change: Change) => void, scope?: { missionId: string }): () => void; // streamEvents
  readonly connection: { readonly state: ConnectionState; onChange(listener: (s: ConnectionState) => void): () => void };
}

/** Runtime table: port method -> contract operationId. The coverage test compares it with routes.json. */
export const CLIENT_OPERATIONS: Readonly<Record<string, string>>; // e.g. { getProject: 'getProject', …, subscribe: 'streamEvents' }
```

`Result<Op>` is a discriminated union: `{ ok: true; value: <200 schema> }` or `{ ok: false; refusal: <the contract's refusal schema for that operation, where one exists> }`. The exact helper types are finalised in the implementation, from the generated `paths`/`operations` types.

**Rules**:
- Every `kind: "read"` route has exactly one method, and `streamEvents` maps to `subscribe` (FR-008, FR-009).
- The connection state is a closed set of 4.
- The port imports no I/O API (the no-io gate covers it).
