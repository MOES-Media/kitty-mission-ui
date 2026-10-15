/**
 * The in-memory fixture adapter of the `MissionStatusClient` port (FR-011, NFR-004). Reads serve the examples of
 * contracts/fixtures (each route's `defaultExample`, or a selected one); `subscribe` replays changes.json through an
 * injectable scheduler. No I/O: the data arrives by JSON import and time only through the scheduler (C-001).
 */
import routesJson from '../../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import examplesJson from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import changesJson from '../../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import {
  CONNECTION_STATES,
  type Change,
  type ConnectionState,
  type MissionStatusClient,
  type ReadOp,
  type Refusal,
  type Result,
} from './port';

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
  /** Example key per read, instead of the route's default example. A refusal example resolves as a refusal. For
   *  `streamEvents` (whose route has no default) a refusal example refuses every subscription with one `refused` change,
   *  as the stub serves it on `/events` under `X-Kitty-Stub-Example`. */
  examples?: Partial<Record<ReadOp | 'streamEvents', string>>;
  /** Replacement data sets; each defaults to the file of contracts/fixtures. */
  fixtures?: { routes?: readonly RouteEntry[]; examples?: ExampleTable; changes?: ChangesEnvelope };
  scheduler?: Scheduler;
  /** The starting connection state. Default `connected`, unlike a real adapter (which starts in `connecting`): the fixture
   *  is for tests, which mostly want a live connection, and pass `connecting` to test the start-up. */
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

/** The change kinds an item of changes.json may carry: every kind but `refused`, which is a response, not an event. */
const EVENT_KINDS: readonly string[] = ['status-transition', 'mission-lifecycle', 'log-truncated'] satisfies Exclude<Change['kind'], 'refused'>[];

/** The shared example of the stream's 400 `cursor_without_mission` refusal. */
const CURSOR_WITHOUT_MISSION = 'StreamRefusal.cursor-without-mission';

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
  if (!EVENT_KINDS.includes(item.event)) throw new Error(`fixture client: unknown change event ${item.event}`);
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

  // The stream's route has no success example, so a selection can only be one of its declared refusals.
  const streamRoute = routes.find((entry) => entry.operationId === 'streamEvents');
  if (!streamRoute) throw new Error('fixture client: routes have no operation streamEvents');
  const streamKey = options.examples?.streamEvents ?? streamRoute.defaultExample;
  const streamOutcome = streamKey === null ? null : resolveOutcome(streamRoute, streamKey, table);
  if (streamOutcome?.ok) throw new Error(`fixture client: example ${String(streamKey)} is not a refusal of streamEvents`);
  const streamRefusal = streamOutcome === null ? null : (streamOutcome.refusal as Refusal<'streamEvents'>);

  // A cursor sent without a missionId: the refusal the contract (and the upstream service) answers, from the shared
  // examples, resolved only when a JavaScript caller makes that request (the type forbids it).
  const cursorWithoutMission = (): Refusal<'streamEvents'> => {
    const outcome = resolveOutcome(streamRoute, CURSOR_WITHOUT_MISSION, table);
    if (outcome.ok) throw new Error(`fixture client: example ${CURSOR_WITHOUT_MISSION} is not a refusal of streamEvents`);
    return outcome.refusal as Refusal<'streamEvents'>;
  };

  const read = <Op extends ReadOp>(op: Op): Promise<Result<Op>> => {
    const outcome = outcomes.get(op) as Outcome;
    return Promise.resolve(structuredClone(outcome) as Result<Op>);
  };

  let state: ConnectionState = options.initialState ?? 'connected';
  /** The open, non-refused subscriptions, which the connection drives: they pause, start and resynchronise with it. */
  const subscriptions = new Set<(next: ConnectionState) => void>();
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
      // The fixture replays from the start; resuming from scope.cursor belongs to the real adapters. Only a non-empty
      // missionId scopes the stream, as the stub reads `?missionId=`; the same test decides whether a cursor has a Mission.
      const missionId: unknown = scope?.missionId;
      const cursor: unknown = scope?.cursor;
      const scoped = typeof missionId === 'string' && missionId !== '';
      const orphanCursor = !scoped && typeof cursor === 'string' && cursor !== '';
      let index = 0;
      let handle: unknown = null;
      let active = true;
      const refuse = (refusal: Refusal<'streamEvents'>): void => {
        handle = scheduler.setTimeout(() => {
          handle = null;
          if (active) listener({ kind: 'refused', cursor: null, refusal: structuredClone(refusal) });
        }, 0);
      };
      // `pending` and `generation` keep the replay to one timer even when a scheduler runs its callback at once or a
      // listener changes the connection while it is being called.
      let pending = false;
      let generation = 0;
      const cancel = (): void => {
        generation += 1;
        pending = false;
        if (handle !== null) scheduler.clearTimeout(handle);
        handle = null;
      };
      const scheduleNext = (): void => {
        const item = changes.items[index];
        // Changes flow only while the connection is up; a reconnect schedules the next one again (see `reconnected`).
        if (!item || !active || pending || state !== 'connected') return;
        pending = true;
        const mine = ++generation;
        const timer = scheduler.setTimeout(() => {
          if (mine !== generation) return;
          pending = false;
          handle = null;
          if (!active) return;
          index += 1;
          // Deliver first, schedule the next change after: a scheduler that runs its callback at once (a test's, say) would
          // otherwise deliver the next change before this one. A listener that unsubscribes stops the replay.
          try {
            listener(toChange(item, scoped));
          } finally {
            if (active) scheduleNext();
          }
        }, item.delayMs);
        if (mine === generation && pending) handle = timer;
      };
      // Set once the replay has started while connected: only a subscription that was live can be resynchronised.
      let live = false;
      const start = (): void => {
        live = true;
        scheduleNext();
      };
      // The connection drives the replay: it pauses while the connection is down (`index` stays the last change delivered),
      // starts at first contact, and on a return to `connected` delivers one `resync` before the replay continues.
      const connectionChanged = (next: ConnectionState): void => {
        if (!active) return;
        if (next !== 'connected') cancel();
        else if (!live) start(); // first contact: nothing to resynchronise
        else {
          try {
            listener({ kind: 'resync', cursor: null, reason: 'reconnected' });
          } finally {
            if (active) scheduleNext();
          }
        }
      };
      // A selected refusal wins, as the stub serves a selected example whatever the query; otherwise the cursor rule. A
      // refusal is delivered whatever the connection state and ends the subscription: it is never resynchronised.
      if (streamRefusal) refuse(streamRefusal);
      else if (orphanCursor) refuse(cursorWithoutMission());
      else {
        subscriptions.add(connectionChanged);
        if (state === 'connected') start();
      }
      return () => {
        active = false;
        subscriptions.delete(connectionChanged);
        cancel();
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
    // Every listener runs even when an earlier one throws; the errors are rethrown together afterwards, so one faulty
    // listener neither hides the state change from the others nor leaves a subscription un-resynchronised.
    const errors: unknown[] = [];
    const run = (call: () => void): void => {
      try {
        call();
      } catch (error) {
        errors.push(error);
      }
    };
    for (const listener of [...stateListeners]) run(() => listener(next));
    // The subscriptions follow the connection after its own listeners have heard it.
    for (const follow of [...subscriptions]) run(() => follow(next));
    if (errors.length > 0) throw new AggregateError(errors, `fixture client: ${errors.length} listener(s) threw while the connection became ${next}`);
  });
  return client;
}

/** Test hook: forces the connection state of exactly this fixture client and notifies its listeners once per change. */
export function setConnectionState(client: MissionStatusClient, state: ConnectionState): void {
  const set = connections.get(client);
  if (!set) throw new Error('fixture client: setConnectionState needs a client made by createFixtureClient');
  set(state);
}
