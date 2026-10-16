// A recording proxy over any client. Each read records "<op> <canonical params>"; subscribe and connection.onChange are
// counted, and each subscribe call's arguments are kept (WP03 asserts that no scope or cursor is ever passed).
import type { Change, ConnectionState, MissionStatusClient, ReadOp, SubscriptionScope } from '../../src/client/port';

/** JSON with recursively sorted keys and `undefined` dropped. */
export function canonicalParams(params: unknown): string {
  const canon = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canon);
    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, canon(entry)] as const);
      return Object.fromEntries(entries);
    }
    return value;
  };
  return JSON.stringify(canon(params ?? {}));
}

export interface RecordingClient extends MissionStatusClient {
  /** Every read so far, in call order. */
  readonly reads: string[];
  /** Returns the reads so far and clears the list. */
  take(): string[];
  readonly subscribeCalls: (SubscriptionScope | undefined)[];
  readonly counts: { subscribe: number; unsubscribe: number; onChange: number; offChange: number };
}

export function recordingClient(inner: MissionStatusClient): RecordingClient {
  const reads: string[] = [];
  const subscribeCalls: (SubscriptionScope | undefined)[] = [];
  const counts = { subscribe: 0, unsubscribe: 0, onChange: 0, offChange: 0 };
  const read = (op: ReadOp) => (params: unknown): Promise<never> => {
    reads.push(`${op} ${canonicalParams(params)}`);
    return (inner[op] as (params: unknown) => Promise<never>)(params);
  };
  return {
    getProject: read('getProject'),
    listMissions: read('listMissions'),
    getMission: read('getMission'),
    getWorkPackage: read('getWorkPackage'),
    getWorkPackageDetail: read('getWorkPackageDetail'),
    listArtifacts: read('listArtifacts'),
    getArtifactContent: read('getArtifactContent'),
    getDriftReport: read('getDriftReport'),
    listOpsInvocations: read('listOpsInvocations'),
    subscribe(listener: (change: Change) => void, scope?: SubscriptionScope) {
      counts.subscribe += 1;
      subscribeCalls.push(scope);
      const off = inner.subscribe(listener, scope);
      return () => {
        counts.unsubscribe += 1;
        off();
      };
    },
    connection: {
      get state(): ConnectionState {
        return inner.connection.state;
      },
      onChange(listener) {
        counts.onChange += 1;
        const off = inner.connection.onChange(listener);
        return () => {
          counts.offChange += 1;
          off();
        };
      },
    },
    reads,
    take() {
      return reads.splice(0, reads.length);
    },
    subscribeCalls,
    counts,
  };
}
