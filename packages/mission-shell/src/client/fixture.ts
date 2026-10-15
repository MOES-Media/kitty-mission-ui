/**
 * The in-memory fixture adapter of the `MissionStatusClient` port (FR-011, NFR-004). Reads serve the examples of
 * contracts/fixtures (each route's `defaultExample`, or a selected one); `subscribe` replays changes.json through an
 * injectable scheduler. No I/O: the data arrives by JSON import and time only through the scheduler (C-001).
 */
import routesJson from '../../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import examplesJson from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import changesJson from '../../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import { CONNECTION_STATES, type Change, type ConnectionState, type MissionStatusClient, type ReadOp, type Result } from './port';

/** The timer pair the adapter schedules replayed changes with. */
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

/** One entry of routes.json. */
export interface RouteEntry {
  operationId: string;
  kind: string;
  responseSchema: string | null;
  defaultExample: string | null;
  refusals: Record<string, number[]>;
}

/** examples.json: example key to its schema name and value. */
export type ExampleTable = Record<string, { schema: string; value: unknown }>;

/** changes.json: the envelope of the authored change sequence (data-model ChangeItem). */
export interface ChangesEnvelope {
  missionId: string;
  items: { event: string; scopedId?: string; data: unknown; delayMs: number }[];
}

export interface FixtureClientOptions {
  /** Example key per read, instead of the route's default example. A refusal example resolves as a refusal. */
  examples?: Partial<Record<ReadOp, string>>;
  /** Replacement data sets; each defaults to the file of contracts/fixtures. */
  fixtures?: { routes?: readonly RouteEntry[]; examples?: ExampleTable; changes?: ChangesEnvelope };
  scheduler?: Scheduler;
  initialState?: ConnectionState;
}

const READ_OPS = [
  'getProject',
  'listMissions',
  'getMission',
  'getWorkPackage',
  'getWorkPackageDetail',
  'listArtifacts',
  'getArtifactContent',
  'getDriftReport',
  'listOpsInvocations',
] as const satisfies readonly ReadOp[];

const CHANGE_KINDS: readonly string[] = ['status-transition', 'mission-lifecycle', 'log-truncated'] satisfies Change['kind'][];

const defaultScheduler: Scheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** The connection controller of each client, reachable only through `setConnectionState`. */
const connections = new WeakMap<MissionStatusClient, (state: ConnectionState) => void>();

type Outcome = { ok: true; value: unknown } | { ok: false; refusal: { status: number; body: unknown } };

/** Resolves the example a read serves, or throws when the selection does not fit the operation. */
function resolveOutcome(route: RouteEntry, key: string, table: ExampleTable): Outcome {
  const example = table[key];
  if (!example) throw new Error(`fixture client: unknown example ${key} for ${route.operationId}`);
  if (example.schema === route.responseSchema) return { ok: true, value: example.value };
  const statuses = route.refusals[example.schema];
  if (!statuses) {
    throw new Error(
      `fixture client: example ${key} (schema ${example.schema}) is neither the success schema nor a refusal schema of ${route.operationId}`,
    );
  }
  const status = (example.value as { status?: unknown }).status;
  if (typeof status !== 'number' || !statuses.includes(status)) {
    throw new Error(`fixture client: example ${key} has status ${String(status)}, which ${route.operationId} does not declare for ${example.schema}`);
  }
  return { ok: false, refusal: { status, body: example.value } };
}

function toChange(item: ChangesEnvelope['items'][number], scoped: boolean): Change {
  if (!CHANGE_KINDS.includes(item.event)) throw new Error(`fixture client: unknown change event ${item.event}`);
  const kind = item.event as Change['kind'];
  const cursor = kind === 'log-truncated' || !scoped ? null : (item.scopedId ?? null);
  return { kind, cursor, data: structuredClone(item.data) } as Change;
}

/** Creates a fixture client. Each call has its own connection state and its own subscriptions. */
export function createFixtureClient(options: FixtureClientOptions = {}): MissionStatusClient {
  const routes: readonly RouteEntry[] = options.fixtures?.routes ?? routesJson;
  const table: ExampleTable = options.fixtures?.examples ?? examplesJson;
  const changes: ChangesEnvelope = options.fixtures?.changes ?? changesJson;
  const scheduler = options.scheduler ?? defaultScheduler;

  // Every read's outcome is resolved up front, so a mismatched selection throws at creation.
  const outcomes = new Map<ReadOp, Outcome>();
  for (const op of READ_OPS) {
    const route = routes.find((entry) => entry.operationId === op);
    if (!route) throw new Error(`fixture client: routes have no operation ${op}`);
    const key = options.examples?.[op] ?? route.defaultExample;
    if (key === null) throw new Error(`fixture client: ${op} has no default example`);
    outcomes.set(op, resolveOutcome(route, key, table));
  }

  const read = <Op extends ReadOp>(op: Op): Promise<Result<Op>> => {
    const outcome = outcomes.get(op) as Outcome;
    return Promise.resolve(structuredClone(outcome) as Result<Op>);
  };

  let state: ConnectionState = options.initialState ?? 'connected';
  const stateListeners = new Set<(state: ConnectionState) => void>();

  const client: MissionStatusClient = {
    getProject: () => read('getProject'),
    listMissions: () => read('listMissions'),
    getMission: () => read('getMission'),
    getWorkPackage: () => read('getWorkPackage'),
    getWorkPackageDetail: () => read('getWorkPackageDetail'),
    listArtifacts: () => read('listArtifacts'),
    getArtifactContent: () => read('getArtifactContent'),
    getDriftReport: () => read('getDriftReport'),
    listOpsInvocations: () => read('listOpsInvocations'),
    subscribe(listener, scope) {
      // The fixture replays from the start; resuming from scope.cursor belongs to the real adapters.
      const scoped = scope?.missionId !== undefined;
      let index = 0;
      let handle: unknown = null;
      let active = true;
      const scheduleNext = (): void => {
        const item = changes.items[index];
        if (!item) {
          handle = null;
          return;
        }
        handle = scheduler.setTimeout(() => {
          if (!active) return;
          index += 1;
          scheduleNext();
          listener(toChange(item, scoped));
        }, item.delayMs);
      };
      scheduleNext();
      return () => {
        active = false;
        if (handle !== null) scheduler.clearTimeout(handle);
        handle = null;
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
  };

  connections.set(client, (next) => {
    if (!CONNECTION_STATES.includes(next)) throw new Error(`fixture client: unknown connection state ${String(next)}`);
    if (next === state) return;
    state = next;
    for (const listener of [...stateListeners]) listener(next);
  });
  return client;
}

/** Test hook: forces the connection state of exactly this fixture client and notifies its listeners once per change. */
export function setConnectionState(client: MissionStatusClient, state: ConnectionState): void {
  const set = connections.get(client);
  if (!set) throw new Error('fixture client: setConnectionState needs a client made by createFixtureClient');
  set(state);
}
