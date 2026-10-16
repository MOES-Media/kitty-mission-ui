// A client whose every read returns a promise the test settles, with a settable connection state and a captured stream
// listener, for the latest-wins and latency tests.
import type { Change, ConnectionState, MissionStatusClient, ReadOp, Result } from '../../src/client/port';

export interface DeferredCall {
  readonly index: number;
  readonly op: ReadOp;
  readonly params: unknown;
  settled: boolean;
}

export interface DeferredClient extends MissionStatusClient {
  readonly calls: readonly DeferredCall[];
  /** Settles the earliest unsettled call of `op`. */
  resolveNext<Op extends ReadOp>(op: Op, result: Result<Op>): void;
  /** Settles the call with this index (its position in `calls`). */
  resolveAt<Op extends ReadOp>(index: number, result: Result<Op>): void;
  setState(state: ConnectionState): void;
  emit(change: Change): void;
}

const READS: readonly ReadOp[] = [
  'getProject',
  'listMissions',
  'getMission',
  'getWorkPackage',
  'getWorkPackageDetail',
  'listArtifacts',
  'getArtifactContent',
  'getDriftReport',
  'listOpsInvocations',
];

export function createDeferredClient(initialState: ConnectionState = 'connected'): DeferredClient {
  const calls: DeferredCall[] = [];
  const resolvers: ((result: unknown) => void)[] = [];
  const listeners = new Set<(change: Change) => void>();
  const stateListeners = new Set<(state: ConnectionState) => void>();
  let state = initialState;

  const reads = Object.fromEntries(
    READS.map((op) => [
      op,
      (params: unknown) => {
        const index = calls.length;
        calls.push({ index, op, params, settled: false });
        return new Promise((resolve) => {
          resolvers[index] = resolve;
        });
      },
    ]),
  ) as unknown as Pick<MissionStatusClient, ReadOp>;

  const settle = (index: number, result: unknown): void => {
    const call = calls[index];
    const resolve = resolvers[index];
    if (!call || !resolve || call.settled) throw new Error(`deferred client: no unsettled call ${index}`);
    call.settled = true;
    resolve(result);
  };

  return {
    ...reads,
    calls,
    resolveNext(op, result) {
      const call = calls.find((candidate) => candidate.op === op && !candidate.settled);
      if (!call) throw new Error(`deferred client: no unsettled ${op} call`);
      settle(call.index, result);
    },
    resolveAt(index, result) {
      settle(index, result);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    connection: {
      get state() {
        return state;
      },
      onChange(listener) {
        stateListeners.add(listener);
        return () => {
          stateListeners.delete(listener);
        };
      },
    },
    setState(next) {
      state = next;
      for (const listener of [...stateListeners]) listener(next);
    },
    emit(change) {
      for (const listener of [...listeners]) listener(change);
    },
  } satisfies DeferredClient;
}
