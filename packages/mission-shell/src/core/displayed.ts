// What a destination reads (plan IC-01, research R-04, data-model "ResourceKey and the displayed set"). Plain
// TypeScript: no Svelte, no DOM.
import type { Destination } from './routes';

/**
 * One read of the port, with its parameters.
 *
 * `missions` is the Missions screen's page chain (`listMissions` pages 1..n) and IS "the Missions list" of the refresh
 * policy. `mission-names` is Drift's `listMissions({})` page-1 lookup and NEVER is (R1-04). Port reads:
 * `project` getProject; `mission` getMission; `wp` getWorkPackage; `wp-detail` getWorkPackageDetail; `artifacts`
 * listArtifacts; `artifact` getArtifactContent; `drift` getDriftReport (no `missionId` for the whole project); `ops`
 * listOpsInvocations pages 1..n.
 */
export type ResourceKey =
  | { readonly kind: 'project' }
  | { readonly kind: 'missions' }
  | { readonly kind: 'mission-names' }
  | { readonly kind: 'mission'; readonly missionId: string }
  | { readonly kind: 'wp'; readonly missionId: string; readonly wpId: string }
  | { readonly kind: 'wp-detail'; readonly missionId: string; readonly wpId: string }
  | { readonly kind: 'artifacts'; readonly missionId: string }
  | { readonly kind: 'artifact'; readonly missionId: string; readonly path: string }
  | { readonly kind: 'drift'; readonly missionId?: string }
  | { readonly kind: 'ops' };

/** The notation of the data model and of the refresh-policy recording; slots are keyed by it. */
export function keyString(key: ResourceKey): string {
  switch (key.kind) {
    case 'project':
    case 'missions':
    case 'mission-names':
    case 'ops':
      return key.kind;
    case 'mission':
    case 'artifacts':
      return `${key.kind}:${key.missionId}`;
    case 'wp':
    case 'wp-detail':
      return `${key.kind}:${key.missionId}/${key.wpId}`;
    case 'artifact':
      return `artifact:${key.missionId}:${key.path}`;
    case 'drift':
      return `drift:${key.missionId ?? '*'}`;
  }
}

export interface DisplayedSet {
  readonly policy: readonly ResourceKey[];
  readonly explicit: readonly ResourceKey[];
}

/**
 * The keys a destination displays, in the two columns of the data model.
 *
 * FS-12: the `policy` column names only what the two status changes (`status-transition`, `mission-lifecycle`) choose
 * from. `log-truncated` (M) re-reads every displayed key of M, explicit ones included (`drift:M`, `artifacts:M`,
 * `artifact:M:P`). `resync` re-reads every displayed key of both columns. Which policy-column key a given change
 * re-reads is decided by the refresh policy, not here (a status change never re-reads `project`, for example).
 * `explicit` is the destination's own data, refreshed on demand (FR-016).
 */
export function displayedSet(destination: Destination): DisplayedSet {
  switch (destination.screen) {
    case 'missions':
      return { policy: [{ kind: 'project' }, { kind: 'missions' }], explicit: [] };
    case 'drift':
      return {
        policy: [{ kind: 'project' }],
        explicit: [
          destination.missionId === undefined ? { kind: 'drift' } : { kind: 'drift', missionId: destination.missionId },
          { kind: 'mission-names' },
        ],
      };
    case 'ops':
      return { policy: [{ kind: 'project' }], explicit: [{ kind: 'ops' }] };
    case 'pipeline':
      return { policy: [{ kind: 'mission', missionId: destination.missionId }], explicit: [] };
    case 'work-packages': {
      const { missionId, wpId } = destination;
      const mission: ResourceKey = { kind: 'mission', missionId };
      return {
        policy:
          wpId === undefined
            ? [mission]
            : [mission, { kind: 'wp', missionId, wpId }, { kind: 'wp-detail', missionId, wpId }],
        explicit: [],
      };
    }
    case 'artifacts': {
      const { missionId, path } = destination;
      const listing: ResourceKey = { kind: 'artifacts', missionId };
      return {
        policy: [{ kind: 'mission', missionId }],
        explicit: path === undefined ? [listing] : [listing, { kind: 'artifact', missionId, path }],
      };
    }
    case 'projects':
      return { policy: [], explicit: [] };
  }
}

/** Both columns of `displayedSet`, policy first. */
export function displayedKeys(destination: Destination): readonly ResourceKey[] {
  const { policy, explicit } = displayedSet(destination);
  return [...policy, ...explicit];
}

/** True exactly when the key's read parameters carry `missionId === M` (`drift:*` and the unscoped keys do not). */
export function ofMission(key: ResourceKey, missionId: string): boolean {
  switch (key.kind) {
    case 'project':
    case 'missions':
    case 'mission-names':
    case 'ops':
      return false;
    case 'drift':
      return key.missionId === missionId;
    default:
      return key.missionId === missionId;
  }
}
