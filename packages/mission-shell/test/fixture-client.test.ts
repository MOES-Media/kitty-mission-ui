// The fixture adapter of the MissionStatusClient port (WP05, FR-011, NFR-004): reads serve the examples of
// contracts/fixtures, refusals carry their own status, subscriptions replay changes.json through an injected scheduler.
// Oracles are read from the JSON files directly (examples.json, changes.json, routes.json), never from the adapter.
import { beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import routes from '../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import examples from '../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import changes from '../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import {
  CLIENT_OPERATIONS,
  CONNECTION_STATES,
  type Change,
  type ConnectionState,
  type MissionStatusClient,
  type ReadOp,
  type SubscriptionScope,
} from '../src/client/port';
import { createFixtureClient, setConnectionState, type ChangesEnvelope, type Scheduler } from '../src/client/fixture';
import { operationCoverage } from '../src/client/coverage';

const exampleTable = examples as Record<string, { schema: string; value: unknown }>;

/** A scheduler that fires only when the test advances it. Timers fire in due-time order, then creation order. */
function fakeScheduler(): Scheduler & { advance(ms: number): void; pending(): number } {
  let now = 0;
  let next = 0;
  const timers = new Map<number, { due: number; fn: () => void }>();
  return {
    setTimeout(fn, ms) {
      const handle = next++;
      timers.set(handle, { due: now + ms, fn });
      return handle;
    },
    clearTimeout(handle) {
      timers.delete(handle as number);
    },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.due <= until).sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
        const first = due[0];
        if (!first) break;
        timers.delete(first[0]);
        now = first[1].due;
        first[1].fn();
      }
      now = until;
    },
    pending: () => timers.size,
  };
}

/** Sum of every delay in changes.json, so one advance replays the whole sequence. */
const totalDelay = changes.items.reduce((sum, item) => sum + item.delayMs, 0);

/** Calls one read of the port with parameters that satisfy its contract. */
function callRead(client: MissionStatusClient, op: ReadOp) {
  const missionId = changes.missionId;
  switch (op) {
    case 'getProject':
      return client.getProject({});
    case 'listMissions':
      return client.listMissions({});
    case 'getMission':
      return client.getMission({ path: { missionId } });
    case 'getWorkPackage':
      return client.getWorkPackage({ path: { missionId, wpId: 'WP01' } });
    case 'getWorkPackageDetail':
      return client.getWorkPackageDetail({ path: { missionId, wpId: 'WP01' } });
    case 'listArtifacts':
      return client.listArtifacts({ path: { missionId } });
    case 'getArtifactContent':
      return client.getArtifactContent({ path: { missionId }, query: { path: 'spec.md' } });
    case 'getDriftReport':
      return client.getDriftReport({});
    case 'listOpsInvocations':
      return client.listOpsInvocations({});
  }
}

const readRoutes = routes.filter((route) => route.kind === 'read');

function replay(scope?: SubscriptionScope): Change[] {
  const scheduler = fakeScheduler();
  const client = createFixtureClient({ scheduler });
  const seen: Change[] = [];
  client.subscribe((change) => seen.push(change), scope);
  scheduler.advance(totalDelay);
  return seen;
}

beforeAll(async () => {
  await page.viewport(1024, 768);
});

describe('reads', () => {
  it('every read returns its default example', async () => {
    // A read added to routes.json fails here by name (FR-009), before any count or call (CODE-TEST-002).
    const problems = operationCoverage(Object.values(CLIENT_OPERATIONS), routes.map((route) => route.operationId));
    expect(problems, problems.join('\n')).toEqual([]);
    expect(readRoutes.length).toBeGreaterThan(0);
    const client = createFixtureClient();
    let checked = 0;
    for (const route of readRoutes) {
      const key = route.defaultExample;
      expect(key, route.operationId).toBeTypeOf('string');
      const result = await callRead(client, route.operationId as ReadOp);
      expect(result, route.operationId).toEqual({ ok: true, value: exampleTable[key as string]?.value });
      checked += 1;
    }
    expect(checked).toBe(readRoutes.length);
  });

  it('a selected success example is served instead of the default', async () => {
    const client = createFixtureClient({ examples: { getProject: 'Project.all-null' } });
    expect(await client.getProject({})).toEqual({ ok: true, value: exampleTable['Project.all-null']?.value });
    expect(exampleTable['Project.all-null']?.value).not.toEqual(exampleTable['Project.example']?.value);
  });

  it('a selected refusal resolves with the status of the example itself', async () => {
    const tooLarge = exampleTable['ArtifactRefusal.artifact-too-large'];
    const status = (tooLarge?.value as { status: number }).status;
    expect(status).toBe(413);
    const client = createFixtureClient({ examples: { getArtifactContent: 'ArtifactRefusal.artifact-too-large' } });
    const refused = await client.getArtifactContent({ path: { missionId: changes.missionId }, query: { path: 'big.md' } });
    expect(refused).toEqual({ ok: false, refusal: { status, body: tooLarge?.value } });
    // Positive control on the same operation: without a selection it succeeds.
    const served = await createFixtureClient().getArtifactContent({ path: { missionId: changes.missionId }, query: { path: 'spec.md' } });
    expect(served.ok).toBe(true);
  });

  it('a selection whose schema the operation does not declare throws', () => {
    expect(() => createFixtureClient({ examples: { getProject: 'ArtifactRefusal.not-found' } })).toThrow(
      /ArtifactRefusal\.not-found.*getProject/,
    );
    expect(() => createFixtureClient({ examples: { getMission: 'No.such-example' } })).toThrow(/No\.such-example/);
    // Positive control: a declared refusal schema for the same kind of operation is accepted.
    expect(() => createFixtureClient({ examples: { listArtifacts: 'ArtifactRefusal.not-found' } })).not.toThrow();
  });

  it('two reads return equal but independent values', async () => {
    const client = createFixtureClient();
    const first = await client.getProject({});
    const second = await client.getProject({});
    expect(first).toEqual(second);
    if (first.ok && second.ok) expect(first.value).not.toBe(second.value);
    expect(first.ok && second.ok).toBe(true);
  });
});

describe('subscriptions', () => {
  it('a scoped subscription yields every change with the R2-05 cursors', () => {
    const seen = replay({ missionId: changes.missionId });
    expect(seen.length).toBe(changes.items.length);
    let checked = 0;
    changes.items.forEach((item, index) => {
      const change = seen[index];
      expect(change?.kind).toBe(item.event);
      expect(change && change.kind !== 'refused' && change.kind !== 'resync' ? change.data : undefined).toEqual(item.data);
      const scopedId = (item as { scopedId?: string }).scopedId;
      expect(change?.cursor).toBe(item.event === 'log-truncated' ? null : scopedId);
      checked += 1;
    });
    expect(checked).toBe(changes.items.length);
    // Positive control: at least the scoped kinds carry a string cursor.
    expect(seen.filter((change) => typeof change.cursor === 'string').length).toBe(
      changes.items.filter((item) => item.event !== 'log-truncated').length,
    );
    expect(seen.filter((change) => change.kind === 'log-truncated').length).toBe(1);
  });

  it('a log-truncated change has a null cursor even when its item carries a scopedId', () => {
    const truncated = changes.items.find((item) => item.event === 'log-truncated');
    const transition = changes.items.find((item) => item.event === 'status-transition');
    expect([truncated?.event, transition?.event]).toEqual(['log-truncated', 'status-transition']);
    const envelope = {
      missionId: changes.missionId,
      items: [
        { ...transition, scopedId: '1:a', delayMs: 0 },
        { ...truncated, scopedId: '2:b', delayMs: 0 },
      ],
    } as ChangesEnvelope;
    const scheduler = fakeScheduler();
    const seen: Change[] = [];
    createFixtureClient({ scheduler, fixtures: { changes: envelope } }).subscribe((change) => seen.push(change), {
      missionId: changes.missionId,
    });
    scheduler.advance(0);
    expect(seen.map((change) => [change.kind, change.cursor])).toEqual([
      ['status-transition', '1:a'],
      ['log-truncated', null],
    ]);
  });

  it('an unscoped subscription yields every change with a null cursor', () => {
    const seen = replay();
    expect(seen.length).toBe(changes.items.length);
    expect(seen.map((change) => change.cursor)).toEqual(changes.items.map(() => null));
    expect(seen.map((change) => change.kind)).toEqual(changes.items.map((item) => item.event));
  });

  it('an empty missionId is unscoped, as the stub reads ?missionId= (CODE-CONTRACT-001)', () => {
    const empty = replay({ missionId: '' });
    expect(empty).toEqual(replay());
    expect(empty.map((change) => change.cursor)).toEqual(changes.items.map(() => null));
    // Positive control: a non-empty missionId is scoped and carries string cursors.
    expect(replay({ missionId: changes.missionId }).some((change) => typeof change.cursor === 'string')).toBe(true);
  });

  it('follows the delays of changes.json', () => {
    const scheduler = fakeScheduler();
    const seen: Change[] = [];
    createFixtureClient({ scheduler }).subscribe((change) => seen.push(change));
    const firstDelay = changes.items[0]?.delayMs ?? -1;
    const secondDelay = changes.items[1]?.delayMs ?? -1;
    expect([firstDelay, secondDelay]).toEqual([0, 250]);
    scheduler.advance(0);
    expect(seen.length).toBe(1);
    scheduler.advance(secondDelay - 1);
    expect(seen.length).toBe(1);
    scheduler.advance(1);
    expect(seen.length).toBe(2);
  });

  it('unsubscribe stops further changes and cancels the pending timer', () => {
    const scheduler = fakeScheduler();
    const seen: Change[] = [];
    const unsubscribe = createFixtureClient({ scheduler }).subscribe((change) => seen.push(change));
    scheduler.advance(0);
    expect(seen.length).toBe(1);
    expect(scheduler.pending()).toBe(1);
    unsubscribe();
    expect(scheduler.pending()).toBe(0);
    scheduler.advance(totalDelay);
    expect(seen.length).toBe(1);
  });

  it('delivers in order under a synchronous scheduler: a change is heard before the next one is scheduled (SO-CORR-005)', () => {
    const synchronous: Scheduler = {
      setTimeout(fn) {
        fn();
        return 0;
      },
      clearTimeout() {},
    };
    const seen: Change[] = [];
    createFixtureClient({ scheduler: synchronous }).subscribe((change) => seen.push(change), { missionId: changes.missionId });
    expect(seen.map((change) => change.kind)).toEqual(changes.items.map((item) => item.event));
    expect(seen.map((change) => change.cursor)).toEqual(
      changes.items.map((item) => (item.event === 'log-truncated' ? null : ((item as { scopedId?: string }).scopedId ?? null))),
    );
  });

  it('under a synchronous scheduler, a listener that unsubscribes on its first change hears nothing after it', () => {
    // The first timer is held so subscribe can return the unsubscribe function; every later timer fires at once.
    let held: (() => void) | null = null;
    const scheduler: Scheduler = {
      setTimeout(fn) {
        if (held === null) held = fn;
        else fn();
        return 0;
      },
      clearTimeout() {},
    };
    const seen: Change[] = [];
    const stop = createFixtureClient({ scheduler }).subscribe((change) => {
      seen.push(change);
      stop();
    });
    (held as (() => void) | null)?.();
    expect(seen.length).toBe(1);
  });

  it('replays deterministically: ten full runs serialise identically', () => {
    const runs: string[] = [];
    for (let run = 0; run < 10; run += 1) {
      runs.push(JSON.stringify({ scoped: replay({ missionId: changes.missionId }), unscoped: replay() }));
    }
    expect(runs.length).toBe(10);
    expect(new Set(runs).size).toBe(1);
    expect(JSON.parse(runs[0] as string).scoped.length).toBe(changes.items.length);
  });
});

/** Subscribes a fresh client made with `options`, replays the whole sequence and returns what the listener heard. */
function heardWith(options: Parameters<typeof createFixtureClient>[0], scope?: SubscriptionScope): { seen: Change[]; pending: number } {
  const scheduler = fakeScheduler();
  const seen: Change[] = [];
  createFixtureClient({ ...options, scheduler }).subscribe((change) => seen.push(change), scope);
  scheduler.advance(totalDelay);
  return { seen, pending: scheduler.pending() };
}

describe('stream refusals', () => {
  const streamRoute = routes.find((route) => route.operationId === 'streamEvents');

  it('the route of the oracle declares 400 and 409 StreamRefusal and 404 Problem', () => {
    expect(streamRoute?.refusals).toEqual({ Problem: [404], StreamRefusal: [400, 409] });
  });

  for (const key of ['StreamRefusal.cursor-without-mission', 'StreamRefusal.misaligned', 'StreamRefusal.content-mismatch', 'StreamRefusal.out-of-range']) {
    it(`a selected ${key} is the one and only change, with its own status`, () => {
      const example = exampleTable[key];
      const status = (example?.value as { status: number }).status;
      expect([400, 409]).toContain(status);
      const { seen, pending } = heardWith({ examples: { streamEvents: key } }, { missionId: changes.missionId });
      expect(seen).toEqual([{ kind: 'refused', cursor: null, refusal: { status, body: example?.value } }]);
      expect(pending).toBe(0);
    });
  }

  it('a selected 404 Problem refuses the stream with status 404', () => {
    const notFound = { type: 'about:blank', title: 'The Mission was not found', status: 404, code: 'mission_not_found' };
    const table = { ...exampleTable, 'Problem.unknown-mission': { schema: 'Problem', value: notFound } };
    const { seen } = heardWith({ examples: { streamEvents: 'Problem.unknown-mission' }, fixtures: { examples: table } }, { missionId: changes.missionId });
    expect(seen).toEqual([{ kind: 'refused', cursor: null, refusal: { status: 404, body: notFound } }]);
  });

  it('each refusal status reaches the listener: 400, 404 and 409', () => {
    const notFound = { type: 'about:blank', title: 'The Mission was not found', status: 404 };
    const table = { ...exampleTable, 'Problem.unknown-mission': { schema: 'Problem', value: notFound } };
    const statuses = ['StreamRefusal.cursor-without-mission', 'Problem.unknown-mission', 'StreamRefusal.content-mismatch'].map((key) => {
      const { seen } = heardWith({ examples: { streamEvents: key }, fixtures: { examples: table } });
      const only = seen[0];
      return seen.length === 1 && only?.kind === 'refused' ? only.refusal.status : -1;
    });
    expect(statuses).toEqual([400, 404, 409]);
  });

  it('the refusal arrives through the scheduler, never during subscribe, and unsubscribe cancels it', () => {
    const scheduler = fakeScheduler();
    const seen: Change[] = [];
    const client = createFixtureClient({ scheduler, examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    const unsubscribe = client.subscribe((change) => seen.push(change));
    expect(seen).toEqual([]);
    expect(scheduler.pending()).toBe(1);
    unsubscribe();
    expect(scheduler.pending()).toBe(0);
    scheduler.advance(totalDelay);
    expect(seen).toEqual([]);
  });

  it('a selection that is not a declared stream refusal throws at creation', () => {
    // An event example is a stream item, never a response; a read's refusal schema is not one of the stream's.
    expect(() => createFixtureClient({ examples: { streamEvents: 'StatusTransitionEvent.first' } })).toThrow(/streamEvents/);
    expect(() => createFixtureClient({ examples: { streamEvents: 'ArtifactRefusal.not-found' } })).toThrow(/ArtifactRefusal\.not-found.*streamEvents/);
    const teapot = { ...exampleTable, 'Problem.teapot': { schema: 'Problem', value: { title: 'Teapot', status: 418 } } };
    expect(() => createFixtureClient({ examples: { streamEvents: 'Problem.teapot' }, fixtures: { examples: teapot } })).toThrow(/status 418/);
    // Positive control: a declared stream refusal is accepted.
    expect(() => createFixtureClient({ examples: { streamEvents: 'StreamRefusal.negative' } })).not.toThrow();
  });

  it('a cursor without a missionId is refused with 400 cursor_without_mission, as upstream does (JS callers)', () => {
    const example = exampleTable['StreamRefusal.cursor-without-mission'];
    expect((example?.value as { code: string }).code).toBe('cursor_without_mission');
    const expected = [{ kind: 'refused', cursor: null, refusal: { status: 400, body: example?.value } }];
    // A JavaScript caller can pass what the type forbids; an empty missionId is no Mission (CODE-CONTRACT-001).
    for (const scope of [{ cursor: '1:a' }, { missionId: '', cursor: '1:a' }, { missionId: undefined, cursor: '1:a' }]) {
      const { seen, pending } = heardWith({}, scope as unknown as SubscriptionScope);
      expect(seen, JSON.stringify(scope)).toEqual(expected);
      expect(pending).toBe(0);
    }
    // Positive control: the same cursor with a missionId replays the scoped sequence.
    const { seen } = heardWith({}, { missionId: changes.missionId, cursor: '1:a' });
    expect(seen.length).toBe(changes.items.length);
    expect(seen.filter((change) => change.kind === 'refused')).toEqual([]);
  });

  it('without a selection the stream is not refused', () => {
    const { seen } = heardWith({}, { missionId: changes.missionId });
    expect(seen.length).toBe(changes.items.length);
    expect(seen.filter((change) => change.kind === 'refused')).toEqual([]);
  });
});

describe('connection state', () => {
  it('starts connected (a documented test convenience), or in the initial state given, connecting included', () => {
    expect(createFixtureClient().connection.state).toBe('connected');
    expect(createFixtureClient({ initialState: 'connecting' }).connection.state).toBe('connecting');
    expect(createFixtureClient({ initialState: 'reconnecting' }).connection.state).toBe('reconnecting');
  });

  it('notifies exactly once per change, for each of the five states', () => {
    const client = createFixtureClient({ initialState: 'degraded: contract-mismatch' });
    const heard: ConnectionState[] = [];
    const stop = client.connection.onChange((state) => heard.push(state));
    let assigned = 0;
    for (const state of CONNECTION_STATES) {
      setConnectionState(client, state);
      expect(client.connection.state).toBe(state);
      assigned += 1;
    }
    expect(assigned).toBe(5);
    expect(heard).toEqual([...CONNECTION_STATES]);
    // Setting the current state again is not a change.
    setConnectionState(client, 'degraded: contract-mismatch');
    expect(heard.length).toBe(5);
    stop();
    setConnectionState(client, 'connected');
    expect(heard.length).toBe(5);
    expect(client.connection.state).toBe('connected');
  });

  it('setting one client leaves another unchanged', () => {
    const first = createFixtureClient();
    const second = createFixtureClient();
    const heardFirst: ConnectionState[] = [];
    const heardSecond: ConnectionState[] = [];
    first.connection.onChange((state) => heardFirst.push(state));
    second.connection.onChange((state) => heardSecond.push(state));
    setConnectionState(first, 'degraded: service-missing');
    expect(first.connection.state).toBe('degraded: service-missing');
    expect(second.connection.state).toBe('connected');
    expect(heardFirst).toEqual(['degraded: service-missing']);
    expect(heardSecond).toEqual([]);
  });
});

describe('resync (SO-DES-002)', () => {
  const RESYNC: Change = { kind: 'resync', cursor: null, reason: 'reconnected' };
  const kinds = changes.items.map((item) => item.event);
  const scope: SubscriptionScope = { missionId: changes.missionId };

  /** A client with one open subscription; `log` records the state changes and the changes in the order they happen. */
  function open(subscription?: SubscriptionScope, options: Parameters<typeof createFixtureClient>[0] = {}) {
    const scheduler = fakeScheduler();
    const client = createFixtureClient({ ...options, scheduler });
    const log: string[] = [];
    const seen: Change[] = [];
    client.connection.onChange((state) => log.push(`state:${state}`));
    const stop = client.subscribe((change) => {
      seen.push(change);
      log.push(change.kind);
    }, subscription);
    return { client, scheduler, log, seen, stop };
  }

  it('is delivered when the connection returns from reconnecting to connected, before any later change', () => {
    const { client, scheduler, log, seen } = open(scope);
    scheduler.advance(0);
    expect(log).toEqual([kinds[0]]);
    setConnectionState(client, 'reconnecting');
    scheduler.advance(totalDelay);
    expect(seen.length).toBe(1); // nothing flows while the connection is down
    setConnectionState(client, 'connected');
    expect(seen[1]).toEqual(RESYNC);
    scheduler.advance(totalDelay);
    // The state change is heard first, then the resync, then the rest of the sequence in order, none twice.
    expect(log).toEqual([kinds[0], 'state:reconnecting', 'state:connected', 'resync', ...kinds.slice(1)]);
    expect(seen.filter((change) => change.kind === 'resync').length).toBe(1);
  });

  it('is delivered on an unscoped subscription too, and after a degraded state', () => {
    const unscoped = open();
    unscoped.scheduler.advance(0);
    setConnectionState(unscoped.client, 'degraded: service-missing');
    setConnectionState(unscoped.client, 'connected');
    expect(unscoped.seen.map((change) => change.kind)).toEqual([kinds[0], 'resync']);
    expect(unscoped.seen[1]).toEqual(RESYNC);
  });

  it('is delivered once per reconnect', () => {
    const { client, scheduler, seen } = open(scope);
    for (let round = 0; round < 3; round += 1) {
      setConnectionState(client, 'reconnecting');
      setConnectionState(client, 'connected');
    }
    expect(seen.map((change) => change.kind)).toEqual(['resync', 'resync', 'resync']);
    scheduler.advance(totalDelay);
    expect(seen.slice(3).map((change) => change.kind)).toEqual(kinds);
  });

  it('is also delivered after the replay has finished, to a subscription that is still open', () => {
    const { client, scheduler, seen } = open(scope);
    scheduler.advance(totalDelay);
    expect(seen.length).toBe(changes.items.length);
    setConnectionState(client, 'reconnecting');
    setConnectionState(client, 'connected');
    expect(seen.at(-1)).toEqual(RESYNC);
  });

  it('is not delivered at first contact, on leaving connected, or to a subscription that has ended', () => {
    const starting = open(scope, { initialState: 'connecting' });
    starting.scheduler.advance(totalDelay);
    expect(starting.seen).toEqual([]); // events wait for the connection
    setConnectionState(starting.client, 'connected');
    starting.scheduler.advance(totalDelay);
    expect(starting.seen.map((change) => change.kind)).toEqual(kinds); // first contact is not a reconnect

    const leaving = open(scope);
    setConnectionState(leaving.client, 'reconnecting');
    expect(leaving.seen).toEqual([]);

    const ended = open(scope);
    ended.stop();
    setConnectionState(ended.client, 'reconnecting');
    setConnectionState(ended.client, 'connected');
    ended.scheduler.advance(totalDelay);
    expect(ended.seen).toEqual([]);
    expect(ended.scheduler.pending()).toBe(0);
  });

  it('is not delivered to a refused subscription, which ends with its one refusal', () => {
    const { client, scheduler, seen } = open(scope, { examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    scheduler.advance(0);
    setConnectionState(client, 'reconnecting');
    setConnectionState(client, 'connected');
    scheduler.advance(totalDelay);
    expect(seen.map((change) => change.kind)).toEqual(['refused']);
  });

  it('reaches every open subscription of the client, and no other client', () => {
    const scheduler = fakeScheduler();
    const client = createFixtureClient({ scheduler });
    const other = createFixtureClient({ scheduler });
    const a: Change[] = [];
    const b: Change[] = [];
    const c: Change[] = [];
    client.subscribe((change) => a.push(change));
    client.subscribe((change) => b.push(change), scope);
    other.subscribe((change) => c.push(change));
    setConnectionState(client, 'reconnecting');
    setConnectionState(client, 'connected');
    expect([a, b, c].map((seen) => seen.map((change) => change.kind))).toEqual([['resync'], ['resync'], []]);
  });

  it('survives a listener that changes the connection while a change is being delivered', () => {
    const scheduler = fakeScheduler();
    const client = createFixtureClient({ scheduler });
    const kindsHeard: string[] = [];
    client.subscribe((change) => {
      kindsHeard.push(change.kind);
      if (kindsHeard.length === 1) {
        setConnectionState(client, 'reconnecting');
        setConnectionState(client, 'connected');
      }
    });
    scheduler.advance(totalDelay);
    expect(kindsHeard).toEqual([kinds[0], 'resync', ...kinds.slice(1)]);
  });
});
