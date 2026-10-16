import { describe, expect, expectTypeOf, it } from 'vitest';
import { createFixtureClient, type Scheduler } from '../../src/client/fixture';
import type { Change, MissionStatusClient, ConnectionState } from '../../src/client/port';
import type { ResourceKey } from '../../src/core/displayed';
import {
  COALESCE_WINDOW_MS,
  createConnectionGate,
  createReadScheduler,
  pendingView,
  type ReadOutcome,
  type ResourceSlot,
  type ShellScheduler,
  type Trigger,
} from '../../src/core/scheduler';
import { burst } from '../support/changes';
import { createDeferredClient, type DeferredClient } from '../support/deferred-client';
import { defaultApply, mountEngine, readKey } from '../support/engine-harness';
import { M } from '../support/expected-recording';
import { createFakeScheduler, flushMicrotasks, type FakeScheduler } from '../support/fake-scheduler';
import { canonicalParams, recordingClient } from '../support/recording-client';
import { ok, page, unavailable } from '../support/results';
import { createSequencedClient } from '../support/sequenced-client';

const MISSION: ResourceKey = { kind: 'mission', missionId: M };
const OTHER: ResourceKey = { kind: 'mission', missionId: '01JZAB3C4D5E6F7G8H9JKMNPQS' };
const MISSIONS: ResourceKey = { kind: 'missions' };
const BYPASS: readonly Exclude<Trigger, 'stream'>[] = ['navigation', 'resync', 'refresh', 'refocus', 'retry', 'rescan'];

interface Rig {
  fake: FakeScheduler;
  client: DeferredClient;
  applied: { key: ResourceKey; outcome: ReadOutcome }[];
  sched: ReturnType<typeof createReadScheduler>;
  /** The port calls so far, as "<op> <params>". */
  calls(): string[];
  settle<Op extends Parameters<DeferredClient['resolveNext']>[0]>(op: Op, value: unknown): Promise<void>;
}

function rig(options: { open?: () => boolean } = {}): Rig {
  const fake = createFakeScheduler();
  const client = createDeferredClient();
  const applied: Rig['applied'] = [];
  const sched = createReadScheduler({
    scheduler: fake,
    read: (key, cursor) => readKey(client, key, cursor),
    apply: (slot, outcome) => {
      applied.push({ key: outcome.key, outcome });
      defaultApply(slot, outcome);
    },
    ...(options.open ? { isOpen: options.open } : {}),
  });
  return {
    fake,
    client,
    applied,
    sched,
    calls: () => client.calls.map((call) => `${call.op} ${canonicalParams(call.params)}`),
    async settle(op, value) {
      client.resolveNext(op, ok(op, value));
      await flushMicrotasks();
    },
  };
}

const slotOf = (r: Rig, key: ResourceKey): ResourceSlot => {
  const slot = r.sched.slot(key);
  if (!slot) throw new Error('no slot');
  return slot;
};

describe('transitions (data-model "Read scheduling")', () => {
  it('a navigation onto a new key issues at once, goes in flight and arms the window', () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    expect(r.calls()).toHaveLength(1);
    const slot = slotOf(r, MISSION);
    expect(slot.inFlight).toBe(true);
    expect(slot.windowTimer).not.toBeNull();
    expect(COALESCE_WINDOW_MS).toBe(100);
  });

  it('a stream request inside the window, or while in flight, only sets trailing', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.request(MISSION, 'stream');
    r.sched.request(MISSION, 'stream');
    expect(r.calls()).toHaveLength(1);
    expect(slotOf(r, MISSION).trailing).toBe(true);
  });

  it('R2-01: the window timer issues the trailing read, with nothing in flight', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    await r.fake.advance(10);
    await r.settle('getMission', { v: 'first' });
    await r.fake.advance(40);
    r.sched.request(MISSION, 'stream');
    expect(r.calls()).toHaveLength(1);
    await r.fake.advance(49);
    expect(r.calls()).toHaveLength(1);
    await r.fake.advance(1);
    expect(r.fake.now()).toBe(100);
    expect(r.calls()).toHaveLength(2);
    expect(slotOf(r, MISSION).trailing).toBe(false);
    expect(slotOf(r, MISSION).windowTimer).not.toBeNull();
  });

  it('the window closing with a read still in flight issues nothing; the settle then issues the trailing read', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.request(MISSION, 'stream');
    await r.fake.advance(100);
    expect(r.calls()).toHaveLength(1);
    expect(slotOf(r, MISSION).windowTimer).toBeNull();
    await r.settle('getMission', { v: 'first' });
    expect(r.calls()).toHaveLength(2);
    expect(slotOf(r, MISSION).trailing).toBe(false);
  });

  it('a window that closes with no trailing request simply closes', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    await r.settle('getMission', { v: 'first' });
    await r.fake.advance(100);
    expect(r.calls()).toHaveLength(1);
    expect(slotOf(r, MISSION).windowTimer).toBeNull();
    expect(r.fake.pending()).toBe(0);
    r.sched.request(MISSION, 'stream');
    expect(r.calls()).toHaveLength(2);
  });

  it('a settle with the window still open leaves the trailing read to the window timer', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.request(MISSION, 'stream');
    await r.settle('getMission', { v: 'first' });
    expect(r.calls()).toHaveLength(1);
    await r.fake.advance(100);
    expect(r.calls()).toHaveLength(2);
  });

  for (const trigger of BYPASS) {
    it(`bypass: ${trigger} issues at once inside the window with a new generation and clears trailing`, async () => {
      const r = rig();
      r.sched.setDisplayed([MISSION]);
      r.sched.request(MISSION, 'stream');
      const before = slotOf(r, MISSION).latest;
      r.sched.request(MISSION, trigger);
      expect(r.calls()).toHaveLength(2);
      const slot = slotOf(r, MISSION);
      expect(slot.latest).toBeGreaterThan(before);
      expect(slot.trailing).toBe(false);
      expect(r.fake.pending()).toBe(1);
      // The in-flight result of the earlier generation is dropped; the bypass result is shown.
      await r.settle('getMission', { v: 'stale' });
      expect(r.applied).toHaveLength(0);
      await r.settle('getMission', { v: 'fresh' });
      expect(r.applied).toHaveLength(1);
      expect(slot.value).toEqual({ v: 'fresh' });
      // The window was re-armed from the bypass: no trailing read follows it.
      await r.fake.advance(100);
      expect(r.calls()).toHaveLength(2);
    });
  }

  it('a bypass re-arms the window from its own time', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    await r.fake.advance(60);
    r.sched.request(MISSION, 'refresh');
    await r.fake.advance(60);
    r.sched.request(MISSION, 'stream');
    await r.fake.advance(39);
    expect(r.calls()).toHaveLength(2);
    expect(slotOf(r, MISSION).trailing).toBe(true);
  });

  it('removing a slot clears its timer and discards it; a later result is ignored without error', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.setDisplayed([]);
    expect(r.fake.pending()).toBe(0);
    expect(r.sched.slot(MISSION)).toBeUndefined();
    await r.settle('getMission', { v: 'late' });
    expect(r.applied).toHaveLength(0);
  });

  it('a request for a key that is not displayed is ignored', () => {
    const r = rig();
    r.sched.request(MISSION, 'stream');
    expect(r.calls()).toHaveLength(0);
  });

  it('dispose clears every timer and ignores later results', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION, OTHER]);
    r.sched.dispose();
    expect(r.fake.pending()).toBe(0);
    await r.settle('getMission', { v: 'late' });
    expect(r.applied).toHaveLength(0);
    r.sched.request(MISSION, 'refresh');
    expect(r.calls()).toHaveLength(2);
  });
});

describe('navigation (data-model "Navigation")', () => {
  it('keeps slots and values of keys displayed before and after, drops the others and issues the new ones', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION, MISSIONS]);
    await r.settle('getMission', { v: 'kept' });
    const kept = slotOf(r, MISSION);
    r.sched.setDisplayed([MISSION, OTHER]);
    expect(slotOf(r, MISSION)).toBe(kept);
    expect(kept.value).toEqual({ v: 'kept' });
    expect(r.sched.slot(MISSIONS)).toBeUndefined();
    expect(r.calls()).toEqual([
      'getMission {"path":{"missionId":"' + M + '"}}',
      'listMissions {}',
      'getMission {"path":{"missionId":"01JZAB3C4D5E6F7G8H9JKMNPQS"}}',
    ]);
    expect(slotOf(r, OTHER).value).toBeUndefined();
    // Re-selecting the current destination re-reads the keys the controller names.
    r.sched.request(MISSION, 'navigation');
    expect(r.calls()).toHaveLength(4);
  });

  it('FR-009, R2-04: A to B to A drops the first A read; the generation counter keeps rising', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    const first = slotOf(r, MISSION).latest;
    r.sched.setDisplayed([OTHER]);
    const second = slotOf(r, OTHER).latest;
    r.sched.setDisplayed([MISSION]);
    const third = slotOf(r, MISSION).latest;
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
    expect(r.calls()).toHaveLength(3);
    // The first A read settles first and is dropped (its slot was removed); the third read is shown.
    await r.settle('getMission', { v: 'A1' });
    r.client.resolveAt(2, ok('getMission', { v: 'A2' }));
    await flushMicrotasks();
    expect(slotOf(r, MISSION).value).toEqual({ v: 'A2' });
    expect(r.applied).toHaveLength(1);
  });

  it('FR-009: the first A read, settling last, finds no slot and is dropped', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.setDisplayed([OTHER]);
    r.sched.setDisplayed([MISSION]);
    r.client.resolveAt(2, ok('getMission', { v: 'A2' }));
    await flushMicrotasks();
    r.client.resolveAt(0, ok('getMission', { v: 'A1' }));
    await flushMicrotasks();
    expect(slotOf(r, MISSION).value).toEqual({ v: 'A2' });
    expect(r.applied.filter((entry) => JSON.stringify(entry.outcome).includes('A1'))).toHaveLength(0);
  });

  it('R2-04: two reads of one key settling out of order show the later-issued value', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    r.sched.request(MISSION, 'refresh');
    r.client.resolveAt(1, ok('getMission', { v: 'later' }));
    await flushMicrotasks();
    r.client.resolveAt(0, ok('getMission', { v: 'earlier' }));
    await flushMicrotasks();
    expect(slotOf(r, MISSION).value).toEqual({ v: 'later' });
  });

  it('R2-03: a resync inside an open window drops the in-flight result and shows its own', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    const before = slotOf(r, MISSION).latest;
    await r.fake.advance(30);
    r.sched.requestAll('resync');
    expect(slotOf(r, MISSION).latest).toBeGreaterThan(before);
    expect(r.calls()).toHaveLength(2);
    r.client.resolveAt(1, ok('getMission', { v: 'resync' }));
    await flushMicrotasks();
    r.client.resolveAt(0, ok('getMission', { v: 'dropped' }));
    await flushMicrotasks();
    expect(slotOf(r, MISSION).value).toEqual({ v: 'resync' });
  });
});

describe('stale-while-revalidate (R2-05)', () => {
  it('a re-read leaves value and view in place; loading only without a value', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    const slot = slotOf(r, MISSION);
    expect(slot.inFlight).toBe(true);
    expect(pendingView(slot)).toBe('loading');
    await r.settle('getMission', { v: 'one' });
    expect(slot.view).toBe('ready');
    r.sched.request(MISSION, 'refresh');
    expect(slot.inFlight).toBe(true);
    expect(slot.value).toEqual({ v: 'one' });
    expect(slot.view).toBe('ready');
    expect(pendingView(slot)).toBe('ready');
  });

  it('an unavailable re-read result reaches apply and the scheduler keeps the value', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSION]);
    await r.settle('getMission', { v: 'one' });
    r.sched.request(MISSION, 'refresh');
    r.client.resolveNext('getMission', unavailable('getMission'));
    await flushMicrotasks();
    expect(r.applied).toHaveLength(2);
    expect(slotOf(r, MISSION).latest).toBeGreaterThan(0);
  });
});

describe('the connection gate', () => {
  it('while closed the scheduler issues nothing; navigation creates and drops slots only', () => {
    let open = false;
    const r = rig({ open: () => open });
    r.sched.setDisplayed([MISSION, MISSIONS]);
    r.sched.request(MISSION, 'stream');
    r.sched.request(MISSION, 'refresh');
    expect(r.calls()).toHaveLength(0);
    expect(r.sched.slot(MISSION)).toBeDefined();
    r.sched.setDisplayed([MISSION]);
    expect(r.sched.slot(MISSIONS)).toBeUndefined();
    open = true;
    r.sched.requestAll('navigation');
    expect(r.calls()).toHaveLength(1);
  });

  it('F2: a trailing read is not issued by the window timer or a settle once the gate has closed', async () => {
    let open = true;
    const r = rig({ open: () => open });
    r.sched.setDisplayed([MISSION]);
    r.sched.request(MISSION, 'stream');
    open = false;
    await r.fake.advance(100);
    expect(r.calls()).toHaveLength(1);
    await r.settle('getMission', { v: 'x' });
    expect(r.calls()).toHaveLength(1);
  });

  it('observe reports none, none, degraded-before-first, first-connected for connecting, reconnecting, degraded, connected', () => {
    const gate = createConnectionGate('connecting');
    expect(gate.isOpen()).toBe(false);
    expect(
      (['connecting', 'reconnecting', 'degraded: service-missing', 'connected'] satisfies ConnectionState[]).map((state) => gate.observe(state)),
    ).toEqual(['none', 'none', 'degraded-before-first', 'first-connected']);
    expect(gate.isOpen()).toBe(true);
  });

  it('a later connected after reconnecting is reconnected, a repeated one is none', () => {
    const gate = createConnectionGate('connecting');
    gate.observe('connected');
    expect(gate.observe('reconnecting')).toBe('none');
    expect(gate.observe('degraded: contract-mismatch')).toBe('none');
    expect(gate.observe('connected')).toBe('reconnected');
    expect(gate.observe('connected')).toBe('none');
  });

  it('an initial connected is open, reports first-connected as its initial observation, and needs no observe', () => {
    const gate = createConnectionGate('connected');
    expect(gate.isOpen()).toBe(true);
    expect(gate.initial()).toBe('first-connected');
  });

  it('F1: after an initial connected, reconnecting then connected is reconnected', () => {
    const gate = createConnectionGate('connected');
    expect(gate.observe('reconnecting')).toBe('none');
    expect(gate.observe('connected')).toBe('reconnected');
  });

  it('F1: after reset onto a connected client, reconnecting then connected is reconnected', () => {
    const gate = createConnectionGate('connecting');
    gate.observe('connected');
    expect(gate.reset('connected')).toBe('first-connected');
    expect(gate.observe('reconnecting')).toBe('none');
    expect(gate.observe('connected')).toBe('reconnected');
  });

  it('an initial degraded state is degraded-before-first until the first connected', () => {
    const gate = createConnectionGate('degraded: contract-mismatch');
    expect(gate.isOpen()).toBe(false);
    expect(gate.initial()).toBe('degraded-before-first');
    expect(gate.observe('connected')).toBe('first-connected');
  });

  it('FS2-01: reset closes the gate and forgets the mark; the next connected is first-connected, not reconnected', () => {
    const gate = createConnectionGate('connecting');
    gate.observe('connected');
    expect(gate.isOpen()).toBe(true);
    gate.reset('connecting');
    expect(gate.isOpen()).toBe(false);
    expect(gate.observe('connected')).toBe('first-connected');
  });

  it('FS2-01: reset onto a connected client reports first-connected at once', () => {
    const gate = createConnectionGate('connecting');
    gate.observe('connected');
    expect(gate.reset('connected')).toBe('first-connected');
    expect(gate.isOpen()).toBe(true);
    expect(gate.initial()).toBe('first-connected');
  });
});

describe('the engine over the fixture client', () => {
  const unwrap = (changes: ReturnType<typeof burst>, initialState: ConnectionState = 'connected') => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState, fixtures: { changes } });
    return { fake, inner };
  };

  /** The fixture client with getMission answered from a queue, so each read has its own value. */
  const withMissions = (inner: MissionStatusClient, queue: unknown[]): MissionStatusClient => ({
    ...inner,
    getMission: () => Promise.resolve(ok('getMission', queue.shift())),
    connection: inner.connection,
  });

  it('NFR-002: a burst from mount costs exactly 2 mission reads, the second at t >= 100, its value applied last', async () => {
    const { fake, inner } = unwrap(burst([0, 10, 10, 10, 10]));
    const queue = ['initial', 'trailing', 'extra'];
    const client = recordingClient(withMissions(inner, queue));
    const applied: unknown[] = [];
    const times: number[] = [];
    const original = client.getMission.bind(client);
    client.getMission = (params) => {
      times.push(fake.now());
      return original(params);
    };
    mountEngine({
      client,
      destination: { screen: 'pipeline', missionId: M },
      scheduler: fake,
      apply: (slot, outcome) => {
        defaultApply(slot, outcome);
        applied.push(slot.value);
      },
    });
    await flushMicrotasks();
    await fake.advance(500);
    expect(client.reads.filter((read) => read.startsWith('getMission'))).toHaveLength(2);
    expect(times[1]).toBeGreaterThanOrEqual(100);
    expect(applied.at(-1)).toEqual('trailing');
  });

  it('NFR-002: a burst starting at t = 250 also costs exactly 2 reads, at 250 and at >= 350', async () => {
    const { fake, inner } = unwrap(burst([250, 10, 10, 10, 10]));
    const client = recordingClient(withMissions(inner, ['initial', 'leading', 'trailing', 'extra']));
    const times: number[] = [];
    const original = client.getMission.bind(client);
    client.getMission = (params) => {
      times.push(fake.now());
      return original(params);
    };
    mountEngine({ client, destination: { screen: 'pipeline', missionId: M }, scheduler: fake });
    await flushMicrotasks();
    client.take();
    times.length = 0;
    await fake.advance(600);
    expect(client.take()).toHaveLength(2);
    expect(times[0]).toBe(250);
    expect(times[1]).toBeGreaterThanOrEqual(350);
  });

  it('NFR-001: with an immediately resolving client the re-read is issued and applied at the delivery tick', async () => {
    const { fake, inner } = unwrap(burst([250]));
    const client = recordingClient(withMissions(inner, ['initial', 'changed']));
    const engine = mountEngine({ client, destination: { screen: 'pipeline', missionId: M }, scheduler: fake });
    await flushMicrotasks();
    expect(engine.scheduler.slot(MISSION)?.value).toEqual('initial');
    await fake.advance(250);
    expect(fake.now()).toBe(250);
    expect(engine.scheduler.slot(MISSION)?.value).toEqual('changed');
  });

  it('NFR-001: a deferred read resolved at t = 120 is applied at t = 120, under 150', async () => {
    const fake = createFakeScheduler();
    const client = createDeferredClient();
    const engine = mountEngine({ client, destination: { screen: 'pipeline', missionId: M }, scheduler: fake });
    client.resolveNext('getMission', ok('getMission', 'initial'));
    await flushMicrotasks();
    await fake.advance(100);
    const delivered = fake.now();
    client.emit({ kind: 'mission-lifecycle', cursor: null, data: { missionId: M } as never } satisfies Change);
    expect(client.calls).toHaveLength(2);
    await fake.advance(20);
    client.resolveNext('getMission', ok('getMission', 'changed'));
    await flushMicrotasks();
    expect(fake.now()).toBe(120);
    expect(fake.now() - delivered).toBeLessThan(150);
    expect(engine.scheduler.slot(MISSION)?.value).toEqual('changed');
  });

  describe('gating paths (FS-01, FS-02): no resync; shell-issued reads at the first connected, seen before the scheduler advances', () => {
    const setup = (initialState: ConnectionState) => {
      const fake = createFakeScheduler();
      const inner = createFixtureClient({ scheduler: fake, initialState });
      const client = recordingClient(inner);
      const engine = mountEngine({ client, destination: { screen: 'missions' }, scheduler: fake });
      return { fake, inner, client, engine };
    };
    const INITIAL = ['getProject {}', 'listMissions {}'];

    it('connecting: 0 reads, then connected issues exactly the destination reads', async () => {
      const { fake, inner, client, engine } = setup('connecting');
      expect(client.reads).toEqual([]);
      const { setConnectionState } = await import('../../src/client/fixture');
      setConnectionState(inner, 'connected');
      expect([...client.reads].sort()).toEqual([...INITIAL].sort());
      await flushMicrotasks();
      expect(engine.changes.filter((change) => change.kind === 'resync')).toEqual([]);
      await fake.advance(0);
      expect(client.reads).toHaveLength(INITIAL.length);
    });

    it('connecting, degraded: service-missing, connected: 0 reads until connected', async () => {
      const { inner, client, engine } = setup('connecting');
      const { setConnectionState } = await import('../../src/client/fixture');
      setConnectionState(inner, 'degraded: service-missing');
      expect(client.reads).toEqual([]);
      setConnectionState(inner, 'connected');
      expect([...client.reads].sort()).toEqual([...INITIAL].sort());
      expect(engine.changes.filter((change) => change.kind === 'resync')).toEqual([]);
    });

    it('initial degraded: contract-mismatch: 0 reads at mount, then connected issues the destination reads', async () => {
      const { inner, client, engine } = setup('degraded: contract-mismatch');
      expect(client.reads).toEqual([]);
      const { setConnectionState } = await import('../../src/client/fixture');
      setConnectionState(inner, 'connected');
      expect([...client.reads].sort()).toEqual([...INITIAL].sort());
      expect(engine.changes.filter((change) => change.kind === 'resync')).toEqual([]);
    });

    it('an initial connected reads at mount', () => {
      const { client } = setup('connected');
      expect([...client.reads].sort()).toEqual([...INITIAL].sort());
    });
  });
});

describe('page chains (R2-06, R5-10, FS-08)', () => {
  const pageCursorOf = (cursor: string): string => `listMissions {"query":{"pageCursor":"${cursor}"}}`;

  /** A Missions chain with two loaded pages (a1 -> a2), read through the deferred client. */
  async function twoPages(): Promise<Rig> {
    const r = rig();
    r.sched.setDisplayed([MISSIONS]);
    await r.settle('listMissions', page('a1', 'c1'));
    r.sched.loadMore(MISSIONS, 'c1');
    await r.settle('listMissions', page('a2', 'c2'));
    await r.fake.advance(100);
    r.applied.length = 0;
    return r;
  }

  it('re-reads two loaded pages as page 1 then the cursor of the new page 1, and applies them together once', async () => {
    const r = await twoPages();
    expect(r.sched.pages(MISSIONS)).toBe(2);
    r.sched.request(MISSIONS, 'stream');
    expect(r.calls().slice(2)).toEqual(['listMissions {}']);
    await r.settle('listMissions', page('b1', 'd1'));
    expect(r.applied).toHaveLength(0);
    expect(r.calls().slice(2)).toEqual(['listMissions {}', pageCursorOf('d1')]);
    await r.settle('listMissions', page('b2', 'd2'));
    expect(r.applied).toHaveLength(1);
    const outcome = r.applied[0]?.outcome;
    expect(outcome).toMatchObject({ kind: 'chain', pages: [{ tag: 'b1' }, { tag: 'b2' }] });
  });

  it('stops early when a page has no next cursor', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    await r.settle('listMissions', page('b1', null));
    expect(r.calls().slice(2)).toEqual(['listMissions {}']);
    expect(r.applied).toHaveLength(1);
    expect(r.sched.pages(MISSIONS)).toBe(1);
  });

  it('applies the pages read so far when page 2 fails', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    await r.settle('listMissions', page('b1', 'd1'));
    r.client.resolveNext('listMissions', unavailable('listMissions'));
    await flushMicrotasks();
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0]?.outcome).toMatchObject({ kind: 'chain', pages: [{ tag: 'b1' }], failed: { ok: false, unavailable: 'transport' } });
  });

  it('applies a page 1 failure like any single read', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    r.client.resolveNext('listMissions', unavailable('listMissions'));
    await flushMicrotasks();
    expect(r.applied[0]?.outcome).toMatchObject({ kind: 'result', result: { ok: false } });
  });

  it('a superseded chain issues no further page and applies nothing', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    r.sched.request(MISSIONS, 'refresh');
    expect(r.calls().slice(2)).toEqual(['listMissions {}', 'listMissions {}']);
    await r.settle('listMissions', page('old', 'x'));
    expect(r.calls()).toHaveLength(4);
    expect(r.applied).toHaveLength(0);
  });

  it('load-more appends one page and carries loadingMore meanwhile', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSIONS]);
    await r.settle('listMissions', page('a1', 'c1'));
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
    r.sched.loadMore(MISSIONS, 'c1');
    expect(r.sched.loadingMore(MISSIONS)).toBe(true);
    expect(r.calls()[1]).toBe(pageCursorOf('c1'));
    await r.settle('listMissions', page('a2', null));
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
    expect(r.sched.pages(MISSIONS)).toBe(2);
    expect(r.applied.at(-1)?.outcome).toMatchObject({ kind: 'append', value: { tag: 'a2' } });
  });

  it('a failed load-more is reported as a failed append and keeps the page count', async () => {
    const r = rig();
    r.sched.setDisplayed([MISSIONS]);
    await r.settle('listMissions', page('a1', 'c1'));
    r.sched.loadMore(MISSIONS, 'c1');
    r.client.resolveNext('listMissions', unavailable('listMissions'));
    await flushMicrotasks();
    expect(r.applied.at(-1)?.outcome).toMatchObject({ kind: 'append-failed' });
    expect(r.sched.pages(MISSIONS)).toBe(1);
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
  });

  it('a stream request during a load-more re-reads n + 1 pages after the append', async () => {
    const r = await twoPages();
    r.sched.loadMore(MISSIONS, 'c2');
    r.sched.request(MISSIONS, 'stream');
    expect(slotOf(r, MISSIONS).trailing).toBe(true);
    await r.settle('listMissions', page('a3', 'c3'));
    expect(r.sched.pages(MISSIONS)).toBe(3);
    await r.fake.advance(100);
    const chain = r.calls().slice(3);
    expect(chain).toEqual(['listMissions {}']);
    await r.settle('listMissions', page('b1', 'd1'));
    await r.settle('listMissions', page('b2', 'd2'));
    await r.settle('listMissions', page('b3', null));
    expect(r.calls().slice(3)).toEqual(['listMissions {}', pageCursorOf('d1'), pageCursorOf('d2')]);
    expect(r.applied.at(-1)?.outcome).toMatchObject({ kind: 'chain', pages: [{ tag: 'b1' }, { tag: 'b2' }, { tag: 'b3' }] });
  });

  it('a bypass during a load-more discards the append and re-reads n pages', async () => {
    const r = await twoPages();
    r.sched.loadMore(MISSIONS, 'c2');
    r.sched.request(MISSIONS, 'refresh');
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
    await r.settle('listMissions', page('a3', 'c3'));
    expect(r.applied).toHaveLength(0);
    expect(r.sched.pages(MISSIONS)).toBe(2);
    await r.settle('listMissions', page('b1', 'd1'));
    await r.settle('listMissions', page('b2', null));
    expect(r.applied.at(-1)?.outcome).toMatchObject({ kind: 'chain', pages: [{ tag: 'b1' }, { tag: 'b2' }] });
  });

  it('a load-more during a chain is queued and issued with the new last cursor', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    r.sched.loadMore(MISSIONS, 'c2');
    expect(r.calls()).toHaveLength(3);
    await r.settle('listMissions', page('b1', 'd1'));
    await r.settle('listMissions', page('b2', 'd2'));
    expect(r.calls().slice(2)).toEqual(['listMissions {}', pageCursorOf('d1'), pageCursorOf('d2')]);
    expect(r.sched.loadingMore(MISSIONS)).toBe(true);
    await r.settle('listMissions', page('b3', null));
    expect(r.sched.pages(MISSIONS)).toBe(3);
  });

  it('a load-more queued behind a chain is dropped when the new last page has no next cursor', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    r.sched.loadMore(MISSIONS, 'c2');
    await r.settle('listMissions', page('b1', 'd1'));
    await r.settle('listMissions', page('b2', null));
    expect(r.calls()).toHaveLength(4);
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
  });

  it('FS-08: a retry with a cursor is a load-more; it does not supersede an in-flight chain', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'stream');
    const generation = slotOf(r, MISSIONS).latest;
    r.sched.request(MISSIONS, 'retry', 'c2');
    expect(slotOf(r, MISSIONS).latest).toBe(generation);
    await r.settle('listMissions', page('b1', null));
    expect(r.applied).toHaveLength(1);
    expect(r.applied[0]?.outcome.kind).toBe('chain');
  });

  it('FS-08: an idle retry with a cursor appends one page; without a cursor it re-reads as a bypass', async () => {
    const r = await twoPages();
    r.sched.request(MISSIONS, 'retry', 'c2');
    expect(r.calls().at(-1)).toBe(pageCursorOf('c2'));
    await r.settle('listMissions', page('a3', null));
    expect(r.applied.at(-1)?.outcome.kind).toBe('append');
    r.sched.request(MISSIONS, 'retry');
    expect(r.calls().at(-1)).toBe('listMissions {}');
    expect(r.sched.loadingMore(MISSIONS)).toBe(false);
  });

  it('dropping the loaded pages re-reads page 1 as a bypass with n reset to 1', async () => {
    const r = await twoPages();
    r.sched.restartFromFirstPage(MISSIONS);
    expect(r.sched.pages(MISSIONS)).toBe(1);
    expect(r.calls().at(-1)).toBe('listMissions {}');
    await r.settle('listMissions', page('b1', 'd1'));
    expect(r.calls()).toHaveLength(3);
    expect(r.applied.at(-1)?.outcome).toMatchObject({ kind: 'chain', pages: [{ tag: 'b1' }] });
  });
});

describe('the sequenced client (support)', () => {
  it('answers in order and throws synchronously when a queue is exhausted', async () => {
    const client = createSequencedClient({ getProject: [ok('getProject', 1)] });
    await expect(client.getProject({})).resolves.toEqual({ ok: true, value: 1 });
    expect(() => client.getProject({})).toThrow('sequenced client: getProject queue exhausted');
  });
});

describe('ShellScheduler (R4-08)', () => {
  it('is mutually assignable with the fixture Scheduler', () => {
    expectTypeOf<ShellScheduler>().toEqualTypeOf<Scheduler>();
    const shell: ShellScheduler = createFakeScheduler();
    const fixture: Scheduler = shell;
    const back: ShellScheduler = fixture;
    expect(back).toBe(shell);
  });

  it('non-vacuity: an object missing clearTimeout is not a ShellScheduler', () => {
    // @ts-expect-error clearTimeout is missing
    const incomplete: ShellScheduler = { setTimeout: () => 0 };
    expect(incomplete).toBeDefined();
  });
});
