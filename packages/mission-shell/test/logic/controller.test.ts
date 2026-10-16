import { describe, expect, it } from 'vitest';
import examplesJson from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import routesJson from '../../../../contracts/fixtures/mission-status.routes.json' with { type: 'json' };
import { createFixtureClient, setConnectionState, type ExampleTable, type FixtureClientOptions } from '../../src/client/fixture';
import { CONNECTION_STATES, type Change, type ConnectionState, type MissionStatusClient, type ReadOp } from '../../src/client/port';
import { createShellController, type ShellController, type ShellControllerOptions } from '../../src/controller/shell-controller';
import { SHELL_COPY } from '../../src/core/connection';
import { sequenceCopy } from '../support/changes';
import { createDeferredClient, type DeferredClient } from '../support/deferred-client';
import { M, O, P } from '../support/expected-recording';
import { createFakeScheduler, flushMicrotasks, type FakeScheduler } from '../support/fake-scheduler';
import { recordingClient, type RecordingClient } from '../support/recording-client';
import { ok, page, unavailable } from '../support/results';
import { createSequencedClient } from '../support/sequenced-client';

// ---- read strings of the recording notation ----
const PROJECT = 'getProject {}';
const MISSIONS = 'listMissions {}';
const OPS = 'listOpsInvocations {}';
const wp = (id: string): string => `getWorkPackage {"path":{"missionId":"${M}","wpId":"${id}"}}`;
const wpDetail = (id: string): string => `getWorkPackageDetail {"path":{"missionId":"${M}","wpId":"${id}"}}`;
const ARTIFACTS = `listArtifacts {"path":{"missionId":"${M}"}}`;
const ARTIFACT = `getArtifactContent {"path":{"missionId":"${M}"},"query":{"path":"${P}"}}`;
const DRIFT_M = `getDriftReport {"query":{"missionId":"${M}"}}`;
const DRIFT_ALL = 'getDriftReport {}';

const INITIAL_MISSIONS = [PROJECT, MISSIONS].sort();

// ---- helpers ----
interface Rig {
  fake: FakeScheduler;
  inner: MissionStatusClient;
  client: RecordingClient;
  controller: ShellController;
}

function rig(
  route: string,
  fixture: FixtureClientOptions = {},
  extra: Partial<ShellControllerOptions> = {},
): Rig {
  const fake = createFakeScheduler();
  const inner = createFixtureClient({ scheduler: fake, ...fixture });
  const client = recordingClient(inner);
  const controller = createShellController({ client, mode: 'desktop', route, scheduler: fake, ...extra });
  return { fake, inner, client, controller };
}

const sorted = (reads: string[]): string[] => [...reads].sort();

/** The kinds of change the shell's listener received, observed by wrapping the client the shell subscribes through. */
function tapChanges(inner: RecordingClient): { kinds: string[]; client: MissionStatusClient } {
  const kinds: string[] = [];
  const client: MissionStatusClient = {
    ...inner,
    subscribe: (listener, scope) => inner.subscribe((change) => {
      kinds.push(change.kind);
      listener(change);
    }, scope),
  };
  return { kinds, client };
}

/** A client that keeps delivering to a listener after it was "unsubscribed", to test the controller's own guards. */
function leakyClient(inner: DeferredClient): {
  client: MissionStatusClient;
  deliver: (change: Change) => void;
  setState: (state: ConnectionState) => void;
  reads: string[];
} {
  const reads: string[] = [];
  let listener: ((change: Change) => void) | null = null;
  let stateListener: ((state: ConnectionState) => void) | null = null;
  const wrapRead = (op: ReadOp) => (params: unknown): Promise<never> => {
    reads.push(op);
    return (inner[op] as (p: unknown) => Promise<never>)(params);
  };
  const client = {
    getProject: wrapRead('getProject'),
    listMissions: wrapRead('listMissions'),
    getMission: wrapRead('getMission'),
    getWorkPackage: wrapRead('getWorkPackage'),
    getWorkPackageDetail: wrapRead('getWorkPackageDetail'),
    listArtifacts: wrapRead('listArtifacts'),
    getArtifactContent: wrapRead('getArtifactContent'),
    getDriftReport: wrapRead('getDriftReport'),
    listOpsInvocations: wrapRead('listOpsInvocations'),
    subscribe(next: (change: Change) => void) {
      listener = next;
      return () => undefined;
    },
    connection: {
      get state() {
        return inner.connection.state;
      },
      onChange(next: (state: ConnectionState) => void) {
        stateListener = next;
        return () => undefined;
      },
    },
  } satisfies MissionStatusClient;
  return {
    client,
    reads,
    deliver: (change) => listener?.(change),
    setState: (state) => stateListener?.(state),
  };
}

const lifecycle = (missionId: string): Change => ({ kind: 'mission-lifecycle', cursor: null, data: { missionId } as never });
const transition = (missionId: string, wpId: string): Change => ({ kind: 'status-transition', cursor: null, data: { missionId, wpId } as never });
const truncated = (missionId: string): Change => ({ kind: 'log-truncated', cursor: null, data: { missionId } as never });
const RESYNC: Change = { kind: 'resync', cursor: null, reason: 'reconnected' };

const missionValue = (tag: string, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  missionId: M,
  slug: `slug-${tag}`,
  friendlyName: `Name ${tag}`,
  missionType: 'software-dev',
  workPackages: [],
  ...extra,
});

function deferredRig(
  route: string,
  initialState: ConnectionState = 'connected',
  extra: Partial<ShellControllerOptions> = {},
): { fake: FakeScheduler; deferred: DeferredClient; controller: ShellController } {
  const fake = createFakeScheduler();
  const deferred = createDeferredClient(initialState);
  const controller = createShellController({ client: deferred, mode: 'desktop', route, scheduler: fake, ...extra });
  return { fake, deferred, controller };
}

// ---- subscription lifecycle ----
describe('subscriptions (FR-007)', () => {
  it('subscribes once and listens to the connection once, per client, over mount, setClient and destroy', () => {
    const fake = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler: fake }));
    const b = recordingClient(createFixtureClient({ scheduler: fake }));
    const controller = createShellController({ client: a, mode: 'desktop', route: '/missions', scheduler: fake });
    expect(a.counts).toEqual({ subscribe: 1, unsubscribe: 0, onChange: 1, offChange: 0 });
    controller.setClient(b);
    expect(a.counts).toEqual({ subscribe: 1, unsubscribe: 1, onChange: 1, offChange: 1 });
    expect(b.counts).toEqual({ subscribe: 1, unsubscribe: 0, onChange: 1, offChange: 0 });
    controller.destroy();
    expect(b.counts).toEqual({ subscribe: 1, unsubscribe: 1, onChange: 1, offChange: 1 });
    expect(a.counts.subscribe + b.counts.subscribe).toBe(2);
  });

  it('records 0 reads and no error for a change or a state change delivered after destroy; the same change before destroy records reads', async () => {
    const fake = createFakeScheduler();
    const deferred = createDeferredClient('connected');
    const leaky = leakyClient(deferred);
    const controller = createShellController({ client: leaky.client, mode: 'desktop', route: '/pipeline-not-a-route', scheduler: fake });
    // The route is unknown and parses to Missions: project + missions are read.
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await fake.advance(200);
    leaky.reads.length = 0;
    leaky.deliver(lifecycle(M));
    expect(leaky.reads).toEqual(['listMissions']); // positive control
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await fake.advance(200);
    controller.destroy();
    leaky.reads.length = 0;
    leaky.deliver(lifecycle(M));
    leaky.deliver(RESYNC);
    leaky.setState('reconnecting');
    leaky.setState('connected');
    await fake.advance(5000);
    expect(leaky.reads).toEqual([]);
    expect(fake.pending()).toBe(0);
  });

  it('leaves a null client alone: no subscription, no reads, nothing thrown', async () => {
    const fake = createFakeScheduler();
    const controller = createShellController({ client: null, mode: 'dashboard', route: '/missions', scheduler: fake });
    await fake.advance(2000);
    expect(controller.snapshot().destination).toEqual({ screen: 'missions' });
    controller.refresh();
    controller.windowRefocused();
    controller.destroy();
  });

  it('defaults to /missions, and to /projects for a null client on the desktop', () => {
    const fake = createFakeScheduler();
    const withClient = createShellController({ client: createFixtureClient({ scheduler: fake }), mode: 'desktop', scheduler: fake });
    expect(withClient.snapshot().destination).toEqual({ screen: 'missions' });
    const bare = createShellController({ client: null, mode: 'desktop', scheduler: fake });
    expect(bare.snapshot().destination).toEqual({ screen: 'projects' });
  });
});

describe('the snapshot and the store contract', () => {
  it('calls the subscriber at once, then on every change, and stops after unsubscribe', async () => {
    const { controller, fake } = rig('/missions');
    const seen: string[] = [];
    const off = controller.subscribe((snapshot) => seen.push(snapshot.screen.screen));
    expect(seen).toEqual(['missions']);
    controller.navigate({ screen: 'ops' });
    expect(seen.at(-1)).toBe('ops');
    const count = seen.length;
    off();
    controller.navigate({ screen: 'missions' });
    await fake.advance(10);
    expect(seen.length).toBe(count);
  });

  it('passes contract values to the screens unchanged (FR-005)', async () => {
    const value = { name: 'p', missionCount: 1 };
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', value));
    const first = page('p1', null);
    deferred.resolveNext('listMissions', ok('listMissions', first));
    await flushMicrotasks();
    const screen = controller.snapshot().screen;
    if (screen.screen !== 'missions') throw new Error('expected the Missions screen');
    expect(screen.project).toBe(value);
    expect(screen.missions[0]).toBe(first.items[0]);
    expect(screen.pageInfo).toBe(first.pageInfo);
    expect(screen.status).toBe('ready');
  });

  it('shows Refresh on Artifact and Ops only', () => {
    const shown = (route: string): boolean => rig(route).controller.snapshot().showRefresh;
    expect([shown('/ops'), shown(`/missions/${M}/artifacts`), shown('/missions'), shown(`/missions/${M}`), shown('/drift')]).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
  });
});

// ---- US1-2, US6-2 ----
describe('A9: US1-2 and US6-2 at controller level', () => {
  it('US1-2: the mission head title is the friendlyName, or else the slug; Missions has no mission head', async () => {
    const { deferred, controller } = deferredRig(`/missions/${M}`);
    deferred.resolveNext('getMission', ok('getMission', missionValue('a')));
    await flushMicrotasks();
    expect(controller.snapshot().chrome.mission?.title).toBe('Name a');
    expect(controller.snapshot().chrome.mission?.id).toBe('slug-a');
    // Else the slug: a name that is absent or empty.
    deferred.emit(RESYNC);
    deferred.resolveNext('getMission', ok('getMission', missionValue('b', { friendlyName: '' })));
    await flushMicrotasks();
    expect(controller.snapshot().chrome.mission?.title).toBe('slug-b');
    controller.navigate({ screen: 'missions' });
    expect(controller.snapshot().chrome.mission).toBeNull();
  });

  it('US1-2 with the fixture: the title equals the served friendlyName', async () => {
    const { controller, fake } = rig(`/missions/${M}`);
    await flushMicrotasks();
    const served = examplesJson['MissionDetail.populated'].value as { friendlyName: string };
    expect(controller.snapshot().chrome.mission?.title).toBe(served.friendlyName);
    void fake;
  });

  it('US6-2: re-selecting the current Artifact destination reads its explicit keys once, as bypass reads, and no chrome key', async () => {
    const { controller, client } = rig(`/missions/${M}/artifacts/${encodeURIComponent(P)}`);
    await flushMicrotasks();
    client.take();
    // Still inside the 100 ms coalescing window of the initial reads: a bypass is issued anyway.
    controller.navigate({ screen: 'artifacts', missionId: M, path: P });
    expect(sorted(client.take())).toEqual(sorted([ARTIFACTS, ARTIFACT]));
  });

  it('US6-2: Ops re-selects its own data; Pipeline (no explicit key) issues none', async () => {
    const ops = rig('/ops');
    await flushMicrotasks();
    ops.client.take();
    ops.controller.navigate({ screen: 'ops' });
    expect(ops.client.take()).toEqual([OPS]);
    const pipeline = rig(`/missions/${M}`);
    await flushMicrotasks();
    pipeline.client.take();
    pipeline.controller.navigate({ screen: 'pipeline', missionId: M });
    expect(pipeline.client.take()).toEqual([]);
  });

  it('navigating between destinations reads only the new keys and keeps the chrome slot and its value', async () => {
    const { controller, client } = rig('/missions');
    await flushMicrotasks();
    client.take();
    controller.navigate({ screen: 'ops' });
    // project is displayed before and after: kept, not re-read; ops is new.
    expect(client.take()).toEqual([OPS]);
    await flushMicrotasks();
    expect(controller.snapshot().chrome.project?.name).toBe('example-project');
  });
});

// ---- the connection gate ----
describe('the connection gate (FS-01, FS-02), observed before the fake scheduler advances', () => {
  it("initialState 'connecting': 0 reads, then connected issues exactly the initial reads, no resync", async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'connecting', fixtures: { changes: sequenceCopy() } });
    const client = recordingClient(inner);
    const tap = tapChanges(client);
    const controller = createShellController({ client: tap.client, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    expect(client.reads).toEqual([]);
    expect(controller.snapshot().screen).toMatchObject({ status: 'loading' });
    expect(controller.snapshot().connection.condition).toBe('connecting');
    setConnectionState(inner, 'connected');
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
    expect(tap.kinds).not.toContain('resync');
    expect(controller.snapshot().connection.condition).toBeNull();
    await flushMicrotasks();
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready' });
  });

  it('connecting -> degraded: service-missing: 0 reads and every no-value slot error; then connected issues the initial reads', async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'connecting', fixtures: { changes: sequenceCopy() } });
    const client = recordingClient(inner);
    const tap = tapChanges(client);
    const controller = createShellController({ client: tap.client, mode: 'desktop', route: '/missions', scheduler: fake });
    setConnectionState(inner, 'degraded: service-missing');
    await flushMicrotasks();
    expect(client.reads).toEqual([]);
    const snapshot = controller.snapshot();
    expect(snapshot.screen).toMatchObject({ status: 'error' });
    expect(snapshot.chrome.status).toBe('error');
    expect(snapshot.connection.condition).toBe('service-missing');
    expect(snapshot.connection.copy).toEqual(SHELL_COPY.banners['service-missing']);
    setConnectionState(inner, 'connected');
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
    expect(tap.kinds).not.toContain('resync');
  });

  it("initialState 'degraded: contract-mismatch': 0 reads at mount and error; then connected issues the initial reads", async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'degraded: contract-mismatch', fixtures: { changes: sequenceCopy() } });
    const client = recordingClient(inner);
    const tap = tapChanges(client);
    const controller = createShellController({ client: tap.client, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    expect(client.reads).toEqual([]);
    expect(controller.snapshot().screen).toMatchObject({ status: 'error' });
    expect(controller.snapshot().connection.condition).toBe('contract-mismatch');
    setConnectionState(inner, 'connected');
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
    expect(tap.kinds).not.toContain('resync');
  });

  it("initialState 'connected' (positive control): the initial reads at mount", () => {
    const { client } = rig('/missions', { initialState: 'connected' });
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
  });

  it('reconnecting before the first connected issues nothing and keeps loading', async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, initialState: 'connecting' });
    const client = recordingClient(inner);
    const controller = createShellController({ client, mode: 'desktop', route: '/missions', scheduler: fake });
    setConnectionState(inner, 'reconnecting');
    await flushMicrotasks();
    expect(client.reads).toEqual([]);
    expect(controller.snapshot().screen).toMatchObject({ status: 'loading' });
  });

  it('FS2-01: setClient(b) with b connecting issues no read through b; b connected issues shell reads, no resync; a gets none', async () => {
    const fake = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler: fake, initialState: 'connected', fixtures: { changes: sequenceCopy() } }));
    const bInner = createFixtureClient({ scheduler: fake, initialState: 'connecting', fixtures: { changes: sequenceCopy() } });
    const b = recordingClient(bInner);
    const tapB = tapChanges(b);
    const controller = createShellController({ client: a, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    expect(sorted(a.take())).toEqual(INITIAL_MISSIONS); // positive control: a read at mount
    controller.setClient(tapB.client);
    await flushMicrotasks();
    expect(b.reads).toEqual([]);
    expect(a.reads).toEqual([]);
    expect(controller.snapshot().screen).toMatchObject({ status: 'loading' });
    setConnectionState(bInner, 'connected');
    expect(sorted(b.take())).toEqual(INITIAL_MISSIONS);
    expect(tapB.kinds).not.toContain('resync');
    await fake.advance(1500);
    expect(a.reads).toEqual([]);
  });

  it('FS2-01: setClient resets the refused flag; the next client gets no shell-side resync until it is refused itself', async () => {
    const fake = createFakeScheduler();
    const refusedInner = createFixtureClient({ scheduler: fake, examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    const refused = recordingClient(refusedInner);
    const controller = createShellController({ client: refused, mode: 'desktop', route: '/missions', scheduler: fake });
    await fake.advance(0);
    expect(controller.snapshot().connection.condition).toBe('live-updates-off');
    const nextInner = createFixtureClient({ scheduler: fake });
    const next = recordingClient(nextInner);
    controller.setClient(next);
    expect(controller.snapshot().connection.condition).toBeNull();
    await flushMicrotasks();
    next.take();
    setConnectionState(nextInner, 'reconnecting');
    setConnectionState(nextInner, 'connected');
    await flushMicrotasks();
    // The adapter resyncs this live subscription: the whole set once (not twice: no shell-side resync on top).
    expect(sorted(next.take())).toEqual(INITIAL_MISSIONS);
  });

  it('FS-05: after the first connected, a navigation while degraded shows error (not loading) while its read is in flight', async () => {
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await flushMicrotasks();
    deferred.setState('degraded: service-missing');
    controller.navigate({ screen: 'ops' });
    expect(deferred.calls.filter((call) => call.op === 'listOpsInvocations').length).toBe(1); // reads are normal after the first connected
    expect(controller.snapshot().screen).toMatchObject({ screen: 'ops', status: 'error' });
    // Slots with values keep them.
    expect(controller.snapshot().chrome.project?.name).toBe('p');
    deferred.resolveNext('listOpsInvocations', ok('listOpsInvocations', { ...page('o1', null), totalCount: 1, skippedCount: 0 }));
    await flushMicrotasks();
    expect(controller.snapshot().screen).toMatchObject({ screen: 'ops', status: 'ready' });
  });

  it('FS-05 control: the same navigation while connected shows loading', async () => {
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await flushMicrotasks();
    controller.navigate({ screen: 'ops' });
    expect(controller.snapshot().screen).toMatchObject({ screen: 'ops', status: 'loading' });
  });

  it('degraded after data keeps the data (reconnecting too) and shows the banner in the same update', async () => {
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await flushMicrotasks();
    deferred.setState('degraded: contract-mismatch');
    expect(controller.snapshot().connection.condition).toBe('contract-mismatch');
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready' });
    deferred.setState('reconnecting');
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready' });
  });

  it('applies the host override to the two degraded conditions', async () => {
    const copy = { serviceMissing: { title: 'T', body: 'B' } };
    const { deferred, controller } = deferredRig('/missions', 'connected', { copy });
    deferred.setState('degraded: service-missing');
    expect(controller.snapshot().connection.copy).toEqual(copy.serviceMissing);
    deferred.setState('connecting');
    expect(controller.snapshot().connection.copy).toEqual(SHELL_COPY.banners.connecting);
  });
});

describe('the reconnecting grace timer through the controller (R2-08)', () => {
  it('shows reconnecting only after 1 s, and a re-entry arms a fresh timer', async () => {
    const { deferred, controller, fake } = deferredRig('/missions');
    deferred.setState('reconnecting');
    expect(controller.snapshot().connection.condition).toBeNull();
    await fake.advance(999);
    expect(controller.snapshot().connection.condition).toBeNull();
    await fake.advance(1);
    expect(controller.snapshot().connection.condition).toBe('reconnecting');
    deferred.setState('connected');
    expect(controller.snapshot().connection.condition).toBeNull();
    deferred.setState('reconnecting');
    await fake.advance(500);
    deferred.setState('connected');
    deferred.setState('reconnecting'); // second entry at +500
    await fake.advance(500);
    expect(controller.snapshot().connection.condition).toBeNull(); // the first entry's mark
    await fake.advance(499);
    expect(controller.snapshot().connection.condition).toBeNull();
    await fake.advance(1);
    expect(controller.snapshot().connection.condition).toBe('reconnecting');
  });
});

// ---- the refused stream ----
describe('the refused stream (FR-010, R2-10)', () => {
  it('shows live-updates-off, keeps reading, and re-reads the whole set on each later connected with 0 new subscribes', async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake, examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    const client = recordingClient(inner);
    const tap = tapChanges(client);
    const controller = createShellController({ client: tap.client, mode: 'desktop', route: '/missions', scheduler: fake });
    await fake.advance(0);
    expect(tap.kinds).toEqual(['refused']);
    expect(controller.snapshot().connection.condition).toBe('live-updates-off');
    expect(controller.snapshot().connection.copy).toEqual(SHELL_COPY.banners['live-updates-off']);
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready' }); // reads still apply
    client.take();
    setConnectionState(inner, 'reconnecting');
    setConnectionState(inner, 'connected');
    await flushMicrotasks();
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
    expect(tap.kinds).toEqual(['refused']); // no adapter resync
    setConnectionState(inner, 'reconnecting');
    setConnectionState(inner, 'connected');
    await flushMicrotasks();
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS);
    expect(client.counts.subscribe).toBe(1);
  });

  it('control: a client that is not refused re-reads through the adapter resync, not the shell-side path', async () => {
    const fake = createFakeScheduler();
    const inner = createFixtureClient({ scheduler: fake });
    const client = recordingClient(inner);
    const tap = tapChanges(client);
    const controller = createShellController({ client: tap.client, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    client.take();
    setConnectionState(inner, 'reconnecting');
    setConnectionState(inner, 'connected');
    await flushMicrotasks();
    expect(tap.kinds).toEqual(['resync']);
    expect(sorted(client.take())).toEqual(INITIAL_MISSIONS); // once, not twice
    expect(controller.snapshot().connection.condition).toBeNull();
    expect(client.counts.subscribe).toBe(1);
  });
});

// ---- latest wins, now ----
describe('latest wins at controller level (FR-009)', () => {
  it('A -> B -> A: the first A read resolves last and is dropped', async () => {
    const { deferred, controller } = deferredRig(`/missions/${M}`);
    controller.navigate({ screen: 'pipeline', missionId: O });
    controller.navigate({ screen: 'pipeline', missionId: M });
    expect(deferred.calls.map((call) => call.op)).toEqual(['getMission', 'getMission', 'getMission']);
    const second = missionValue('second');
    deferred.resolveAt(1, ok('getMission', missionValue('b')));
    deferred.resolveAt(2, ok('getMission', second));
    await flushMicrotasks();
    deferred.resolveAt(0, ok('getMission', missionValue('first')));
    await flushMicrotasks();
    const screen = controller.snapshot().screen;
    if (screen.screen !== 'pipeline') throw new Error('expected Pipeline');
    expect(screen.mission).toBe(second);
  });

  it('two mission reads resolving out of order: the later-issued value is the snapshots', async () => {
    const { deferred, controller } = deferredRig(`/missions/${M}`);
    deferred.emit(RESYNC); // a bypass while the first read is in flight
    expect(deferred.calls.length).toBe(2);
    const later = missionValue('later');
    deferred.resolveAt(1, ok('getMission', later));
    await flushMicrotasks();
    deferred.resolveAt(0, ok('getMission', missionValue('earlier')));
    await flushMicrotasks();
    const screen = controller.snapshot().screen;
    if (screen.screen !== 'pipeline') throw new Error('expected Pipeline');
    expect(screen.mission).toBe(later);
  });
});

describe('now', () => {
  it('is the clock at apply time; advancing the fake scheduler alone does not change it', async () => {
    let time = new Date('2026-10-01T10:00:00.000Z');
    const { deferred, controller, fake } = deferredRig('/missions', 'connected', { clock: () => time });
    expect(controller.snapshot().now).toBeNull();
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    await flushMicrotasks();
    expect(controller.snapshot().now).toBe('2026-10-01T10:00:00.000Z');
    time = new Date('2026-10-01T10:05:00.000Z');
    await fake.advance(60_000);
    expect(controller.snapshot().now).toBe('2026-10-01T10:00:00.000Z'); // no ticking timers
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await flushMicrotasks();
    expect(controller.snapshot().now).toBe('2026-10-01T10:05:00.000Z');
  });
});

// ---- explicit refresh ----
describe('refresh() and windowRefocused() (FR-016)', () => {
  for (const name of ['refresh', 'windowRefocused'] as const) {
    it(`${name}: one ops chain on Ops, two reads on Artifact, 0 on Missions and Pipeline (negative paired with the positives)`, async () => {
      const ops = rig('/ops');
      await flushMicrotasks();
      ops.client.take();
      ops.controller[name]();
      expect(ops.client.take()).toEqual([OPS]);

      const artifact = rig(`/missions/${M}/artifacts/${encodeURIComponent(P)}`);
      await flushMicrotasks();
      artifact.client.take();
      artifact.controller[name]();
      expect(sorted(artifact.client.take())).toEqual(sorted([ARTIFACTS, ARTIFACT]));

      for (const route of ['/missions', `/missions/${M}`, '/drift', `/missions/${M}/work-packages`]) {
        const other = rig(route);
        await flushMicrotasks();
        other.client.take();
        other.controller[name]();
        expect(other.client.take(), route).toEqual([]);
      }
    });
  }

  it('refresh() before the first connected issues nothing', async () => {
    const fake = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler: fake, initialState: 'connecting' }));
    const controller = createShellController({ client, mode: 'desktop', route: '/ops', scheduler: fake });
    controller.refresh();
    expect(client.reads).toEqual([]);
  });
});

// ---- session state and commands ----
describe('session state (FR-006)', () => {
  it('Missions query and filter survive Missions -> Pipeline -> Missions; a fresh controller starts empty (control)', async () => {
    const { controller } = rig('/missions');
    expect(controller.snapshot().screen).toMatchObject({ query: '', filter: '' });
    controller.intent('sk-missions-screen', 'sk-search', { query: 'abc' });
    controller.intent('sk-missions-screen', 'sk-filter-change', { filter: 'active' });
    controller.intent('sk-filter-toggle-group', 'sk-filter-change', { filter: 'active' });
    controller.navigate({ screen: 'pipeline', missionId: M });
    controller.navigate({ screen: 'missions' });
    expect(controller.snapshot().screen).toMatchObject({ query: 'abc', filter: 'active' });
  });

  it('Drift selectedFinding survives Drift M -> Missions -> Drift M and is cleared for Drift *', async () => {
    const finding = { missionId: M, kind: 'lane_branch_missing', artifactPath: 'lanes.json' };
    const { controller } = rig(`/drift/${M}`);
    controller.intent('sk-drift-screen', 'sk-select-finding', finding);
    expect(controller.snapshot().screen).toMatchObject({ screen: 'drift', selectedFinding: finding });
    controller.navigate({ screen: 'missions' });
    controller.navigate({ screen: 'drift', missionId: M });
    expect(controller.snapshot().screen).toMatchObject({ selectedFinding: finding });
    controller.navigate({ screen: 'drift' });
    expect(controller.snapshot().screen).toMatchObject({ selectedFinding: null });
    controller.navigate({ screen: 'drift', missionId: M });
    expect(controller.snapshot().screen).toMatchObject({ selectedFinding: null }); // a different scope started with none
  });

  it('tree expansion is per Mission, and the drawer and flyout are shell-wide', () => {
    const { controller } = rig(`/missions/${M}/artifacts`);
    controller.intent('sk-mission-shell', 'sk-tree-toggle', { id: 'contracts', expanded: true });
    expect(controller.snapshot().session.expanded).toEqual({ contracts: true });
    controller.navigate({ screen: 'artifacts', missionId: O });
    expect(controller.snapshot().session.expanded).toEqual({});
    controller.navigate({ screen: 'artifacts', missionId: M });
    expect(controller.snapshot().session.expanded).toEqual({ contracts: true });
    controller.intent('sk-mission-shell', 'sk-tree-toggle', { id: 'contracts', expanded: false });
    expect(controller.snapshot().session.expanded).toEqual({ contracts: false });
    controller.intent('sk-mission-shell', 'sk-toggle-drawer', { open: true, reason: 'hamburger' });
    controller.intent('sk-mission-shell', 'sk-toggle-flyout', { open: true, reason: 'activate' });
    controller.navigate({ screen: 'missions' });
    expect(controller.snapshot().session).toMatchObject({ drawerOpen: true, flyoutOpen: true });
    controller.intent('sk-mission-shell', 'sk-toggle-drawer', { open: false, reason: 'close' });
    expect(controller.snapshot().session.drawerOpen).toBe(false);
  });

  it('navigation intents navigate; an unknown pair does nothing and does not throw', () => {
    const { controller } = rig('/missions');
    controller.intent('sk-missions-screen', 'sk-open-mission', { missionId: M, slug: 's' });
    expect(controller.snapshot().destination).toEqual({ screen: 'pipeline', missionId: M });
    controller.intent('sk-pipeline-screen', 'sk-select-work-package', { missionId: M, wpId: 'WP01' });
    expect(controller.snapshot().destination).toEqual({ screen: 'work-packages', missionId: M, wpId: 'WP01' });
    controller.intent('sk-mission-shell', 'sk-navigate', { id: 'x', href: '#/ops' });
    expect(controller.snapshot().destination).toEqual({ screen: 'ops' });
    const before = controller.snapshot().destination;
    controller.intent('sk-no-such', 'sk-nothing', {});
    controller.intent('sk-pipeline-screen', 'sk-view-artifacts', undefined);
    expect(controller.snapshot().destination).toEqual(before);
  });
});

describe('retries by named target (bypass reads of exactly that key)', () => {
  const cases: readonly {
    name: string;
    route: string;
    intent: [string, string, unknown];
    expected: string[];
  }[] = [
    { name: 'work-package', route: `/missions/${M}/work-packages/WP01`, intent: ['sk-work-package-screen', 'sk-retry-load', { target: 'work-package', missionId: M, wpId: 'WP01' }], expected: [wp('WP01')] },
    { name: 'detail', route: `/missions/${M}/work-packages/WP01`, intent: ['sk-work-package-screen', 'sk-retry-load', { target: 'detail', missionId: M, wpId: 'WP01' }], expected: [wpDetail('WP01')] },
    { name: 'content', route: `/missions/${M}/artifacts/${encodeURIComponent(P)}`, intent: ['sk-artifact-screen', 'sk-retry-load', { target: 'content', missionId: M, path: P }], expected: [ARTIFACT] },
    { name: 'listing', route: `/missions/${M}/artifacts/${encodeURIComponent(P)}`, intent: ['sk-artifact-screen', 'sk-retry-load', { target: 'listing', missionId: M }], expected: [ARTIFACTS] },
    { name: 'drift-report M', route: `/drift/${M}`, intent: ['sk-drift-screen', 'sk-retry-load', { target: 'drift-report', missionId: M }], expected: [DRIFT_M] },
    { name: 'drift-report *', route: '/drift', intent: ['sk-drift-screen', 'sk-retry-load', { target: 'drift-report', missionId: null }], expected: [DRIFT_ALL] },
    { name: 'ops-page without a cursor', route: '/ops', intent: ['sk-ops-screen', 'sk-retry-load', { target: 'ops-page' }], expected: [OPS] },
  ];

  for (const { name, route, intent, expected } of cases) {
    it(`${name}: one read of that key and none of any other`, async () => {
      const { controller, client } = rig(route);
      await flushMicrotasks();
      client.take();
      controller.intent(...intent);
      expect(client.take()).toEqual(expected);
    });
  }

  it('covers seven retry cases', () => {
    expect(cases.length).toBe(7);
  });

  it('a retry of a key that is not displayed reads nothing', async () => {
    const { controller, client } = rig('/missions');
    await flushMicrotasks();
    client.take();
    controller.intent('sk-work-package-screen', 'sk-retry-load', { target: 'work-package', missionId: M, wpId: 'WP01' });
    expect(client.take()).toEqual([]);
  });

  it('sk-shell-retry re-reads only the chrome keys in error', async () => {
    const client = recordingClient(
      createSequencedClient({
        getProject: [unavailable('getProject'), ok('getProject', { name: 'p' })],
        listMissions: [ok('listMissions', page('p1', null))],
      }),
    );
    const fake = createFakeScheduler();
    const controller = createShellController({ client, mode: 'desktop', route: '/missions', scheduler: fake });
    await flushMicrotasks();
    expect(controller.snapshot().chrome.status).toBe('error');
    client.take();
    controller.intent('sk-mission-shell', 'sk-shell-retry', {});
    expect(client.take()).toEqual([PROJECT]); // not listMissions, which is not in error
    await flushMicrotasks();
    expect(controller.snapshot().chrome.status).toBe('ready');
    controller.intent('sk-mission-shell', 'sk-shell-retry', {});
    expect(client.take()).toEqual([]); // nothing in error
  });
});

describe('load-more and Rescan', () => {
  const opsPage = (tag: string, next: string | null): ReturnType<typeof page> & { totalCount: number; skippedCount: number } => ({
    ...page(tag, next),
    totalCount: 9,
    skippedCount: 0,
  });

  it('Missions load-more appends one page with loadingMore true during the read and false after', async () => {
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', 'c2')));
    await flushMicrotasks();
    controller.intent('sk-missions-screen', 'sk-load-more', { cursor: 'c2' });
    expect(controller.snapshot().screen).toMatchObject({ loadingMore: true });
    expect(deferred.calls.at(-1)?.params).toEqual({ query: { pageCursor: 'c2' } });
    deferred.resolveNext('listMissions', ok('listMissions', page('p2', null)));
    await flushMicrotasks();
    const screen = controller.snapshot().screen;
    if (screen.screen !== 'missions') throw new Error('expected Missions');
    expect(screen.loadingMore).toBe(false);
    expect(screen.missions).toEqual(['p1', 'p2']);
    expect(screen.pageInfo).toMatchObject({ hasNextPage: false });
  });

  it('a refused load-more cursor drops the pages and re-reads page 1', async () => {
    const { deferred, controller } = deferredRig('/missions');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', 'c2')));
    await flushMicrotasks();
    controller.intent('sk-missions-screen', 'sk-load-more', { cursor: 'c2' });
    deferred.resolveNext('listMissions', { ok: false, refusal: { status: 400, body: { code: 'invalid_page_cursor' } } } as never);
    await flushMicrotasks();
    const restart = deferred.calls.at(-1);
    expect(restart?.op).toBe('listMissions');
    expect(restart?.params).toEqual({});
    deferred.resolveNext('listMissions', ok('listMissions', page('fresh', null)));
    await flushMicrotasks();
    const screen = controller.snapshot().screen;
    if (screen.screen !== 'missions') throw new Error('expected Missions');
    expect(screen.missions).toEqual(['fresh']);
  });

  it('an Ops load-more failure keeps the items and sets loadMoreError; a later success clears it', async () => {
    const { deferred, controller } = deferredRig('/ops');
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listOpsInvocations', ok('listOpsInvocations', opsPage('o1', 'c2')));
    await flushMicrotasks();
    controller.intent('sk-ops-screen', 'sk-load-more', { cursor: 'c2' });
    deferred.resolveNext('listOpsInvocations', unavailable('listOpsInvocations'));
    await flushMicrotasks();
    let screen = controller.snapshot().screen;
    if (screen.screen !== 'ops') throw new Error('expected Ops');
    expect(screen.items).toEqual(['o1']);
    expect(screen.loadMoreError).toEqual({ code: null });
    expect(screen.loadingMore).toBe(false);
    expect(screen.status).toBe('ready');
    // A cursor retry is a load-more: it appends.
    controller.intent('sk-ops-screen', 'sk-retry-load', { target: 'ops-page', cursor: 'c2' });
    deferred.resolveNext('listOpsInvocations', ok('listOpsInvocations', opsPage('o2', null)));
    await flushMicrotasks();
    screen = controller.snapshot().screen;
    if (screen.screen !== 'ops') throw new Error('expected Ops');
    expect(screen.items).toEqual(['o1', 'o2']);
    expect(screen.loadMoreError).toBeNull();
    expect(screen.totalCount).toBe(9);
  });

  it('a cursor retry during the page-1 read is queued, not a bypass: the in-flight result still applies', async () => {
    const { deferred, controller } = deferredRig('/ops');
    controller.intent('sk-ops-screen', 'sk-retry-load', { target: 'ops-page', cursor: 'c2' });
    expect(deferred.calls.filter((call) => call.op === 'listOpsInvocations').length).toBe(1);
    deferred.resolveNext('listOpsInvocations', ok('listOpsInvocations', opsPage('o1', 'c2')));
    await flushMicrotasks();
    // The first read's value applied, and the queued load-more was issued with the new last cursor.
    expect(deferred.calls.at(-1)?.params).toEqual({ query: { pageCursor: 'c2' } });
    let screen = controller.snapshot().screen;
    if (screen.screen !== 'ops') throw new Error('expected Ops');
    expect(screen.items).toEqual(['o1']);
    deferred.resolveNext('listOpsInvocations', ok('listOpsInvocations', opsPage('o2', null)));
    await flushMicrotasks();
    screen = controller.snapshot().screen;
    if (screen.screen !== 'ops') throw new Error('expected Ops');
    expect(screen.items).toEqual(['o1', 'o2']);
  });

  it('control: a retry without a cursor is a bypass and supersedes the in-flight page-1 read', async () => {
    const { deferred, controller } = deferredRig('/ops');
    controller.intent('sk-ops-screen', 'sk-retry-load', { target: 'ops-page' });
    expect(deferred.calls.filter((call) => call.op === 'listOpsInvocations').length).toBe(2);
    deferred.resolveAt(deferred.calls.findIndex((call) => call.op === 'listOpsInvocations'), ok('listOpsInvocations', opsPage('stale', null)));
    await flushMicrotasks();
    expect(controller.snapshot().screen).toMatchObject({ screen: 'ops', status: 'loading' });
  });

  it('Rescan: rescanning is true while the read is unsettled, the old report stays, then the new one applies', async () => {
    const { deferred, controller } = deferredRig(`/drift/${M}`);
    const first = { scannedAt: 't1', findings: [{}], truncated: false };
    deferred.resolveNext('getDriftReport', ok('getDriftReport', first));
    deferred.resolveNext('getProject', ok('getProject', { name: 'p' }));
    deferred.resolveNext('listMissions', ok('listMissions', page('p1', null)));
    await flushMicrotasks();
    const read = (): { report: unknown; rescanning: boolean; status: string } => {
      const screen = controller.snapshot().screen;
      if (screen.screen !== 'drift') throw new Error('expected Drift');
      return screen;
    };
    expect(read()).toMatchObject({ rescanning: false, status: 'ready' });
    controller.intent('sk-drift-screen', 'sk-rescan-drift', { missionId: M });
    expect(read().rescanning).toBe(true);
    expect(read().report).toBe(first);
    expect(read().status).toBe('ready');
    const second = { scannedAt: 't2', findings: [{}], truncated: false };
    deferred.resolveNext('getDriftReport', ok('getDriftReport', second));
    await flushMicrotasks();
    expect(read().rescanning).toBe(false);
    expect(read().report).toBe(second);
  });
});

// ---- copy ----
describe('the copy protocol (R2-07, FS-03)', () => {
  it('runs emit(null), afterRender, copyText, emit(answer) in that order, for two consecutive copies', async () => {
    const log: string[] = [];
    const host = {
      copyText: (text: string): Promise<'copied' | 'manual'> => {
        log.push('copyText');
        void text;
        return Promise.resolve('copied');
      },
    };
    const { controller, fake } = rig('/drift', {}, {
      host,
      afterRender: () => {
        log.push('afterRender');
        return Promise.resolve();
      },
    });
    await flushMicrotasks();
    await fake.advance(0);
    let tracking = false;
    controller.subscribe((snapshot) => {
      if (tracking) log.push(`emit:${snapshot.copyResult}`);
    });
    tracking = true;
    await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'a', missionId: M, remedy: 'r' });
    await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'b', missionId: M, remedy: 'r' });
    expect(log).toEqual([
      'emit:null',
      'afterRender',
      'copyText',
      'emit:copied',
      'emit:null',
      'afterRender',
      'copyText',
      'emit:copied',
    ]);
  });

  it('yields manual for an absent, a throwing and a rejecting host; copied is the positive control', async () => {
    const hosts = {
      absent: {},
      throwing: {
        copyText: (): Promise<'copied' | 'manual'> => {
          throw new Error('host broke');
        },
      },
      rejecting: { copyText: (): Promise<'copied' | 'manual'> => Promise.reject(new Error('host rejected')) },
      copied: { copyText: (): Promise<'copied' | 'manual'> => Promise.resolve('copied') },
    };
    const results: Record<string, unknown> = {};
    for (const [name, host] of Object.entries(hosts)) {
      const { controller } = rig('/drift', {}, { host });
      await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'x', missionId: M, remedy: 'r' });
      results[name] = controller.snapshot().copyResult;
    }
    expect(results).toEqual({ absent: 'manual', throwing: 'manual', rejecting: 'manual', copied: 'copied' });
  });

  it('does not apply a late answer after the destination changed, and navigation resets copyResult', async () => {
    let release: (answer: 'copied' | 'manual') => void = () => undefined;
    const host = { copyText: (): Promise<'copied' | 'manual'> => new Promise((resolve) => (release = resolve)) };
    const { controller } = rig('/drift', {}, { host });
    const pending = controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'x', missionId: M, remedy: 'r' });
    await flushMicrotasks();
    controller.navigate({ screen: 'missions' });
    release('copied');
    await pending;
    expect(controller.snapshot().copyResult).toBeNull();
    // Control: staying put applies the answer.
    const { controller: stay } = rig('/drift', {}, { host: { copyText: () => Promise.resolve('copied') } });
    await stay.intent('sk-drift-screen', 'sk-copy-command', { text: 'x', missionId: M, remedy: 'r' });
    expect(stay.snapshot().copyResult).toBe('copied');
  });

  it('navigation resets a held copyResult to null', async () => {
    const { controller } = rig('/drift', {}, { host: { copyText: () => Promise.resolve('copied') } });
    await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'x', missionId: M, remedy: 'r' });
    expect(controller.snapshot().copyResult).toBe('copied');
    controller.navigate({ screen: 'missions' });
    expect(controller.snapshot().copyResult).toBeNull();
  });
});

// ---- A8 ----
describe('A8, C-004: subscribe arguments only', () => {
  it('passes no SubscriptionScope to any subscribe call over mount, every change kind, a resync, setClient and destroy', async () => {
    const fake = createFakeScheduler();
    const refusedInner = createFixtureClient({ scheduler: fake, examples: { streamEvents: 'StreamRefusal.content-mismatch' } });
    const aInner = createFixtureClient({ scheduler: fake, fixtures: { changes: sequenceCopy() } });
    const a = recordingClient(aInner);
    const b = recordingClient(refusedInner);
    const controller = createShellController({ client: a, mode: 'desktop', route: '/missions', scheduler: fake });
    await fake.advance(1250); // all five changes: lifecycle, transitions, truncation
    setConnectionState(aInner, 'reconnecting');
    setConnectionState(aInner, 'connected'); // resync
    await flushMicrotasks();
    controller.setClient(b);
    await fake.advance(10); // refused
    setConnectionState(refusedInner, 'reconnecting');
    setConnectionState(refusedInner, 'connected');
    await flushMicrotasks();
    controller.destroy();
    const calls = [...a.subscribeCalls, ...b.subscribeCalls];
    expect(calls.length).toBe(2);
    expect(calls.every((scope) => scope === undefined)).toBe(true);
  });

  it('positive control: the recording client does record the scope of a direct call', () => {
    const client = recordingClient(createFixtureClient());
    client.subscribe(() => undefined, { missionId: M });
    expect(client.subscribeCalls).toEqual([{ missionId: M }]);
  });
});

// ---- NFR-007 ----
describe('NFR-007, SC-003: nothing throws', () => {
  const examples = examplesJson as unknown as ExampleTable;
  interface RouteEntry {
    operationId: string;
    refusals: Record<string, number[]>;
  }
  const routes = routesJson as unknown as RouteEntry[];

  it('drives every connection state, every refusal example of the reads and every change kind through a mounted controller', async () => {
    let driven = 0;
    const destinations = [
      '/missions',
      `/drift/${M}`,
      '/ops',
      `/missions/${M}`,
      `/missions/${M}/work-packages/WP01`,
      `/missions/${M}/artifacts/${encodeURIComponent(P)}`,
    ];
    // Every refusal example of every read.
    const problem = { schema: 'Problem', value: { type: 'about:blank', title: 'x', status: 404 } };
    for (const route of routes.filter((entry) => entry.operationId !== 'streamEvents')) {
      for (const [schema, statuses] of Object.entries(route.refusals)) {
        for (const status of statuses) {
          const key =
            schema === 'Problem'
              ? 'Problem.test-not-found'
              : Object.keys(examples).find((candidate) => examples[candidate]?.schema === schema && (examples[candidate]?.value as { status?: number }).status === status);
          if (!key) throw new Error(`no example ${schema} ${status}`);
          const fake = createFakeScheduler();
          const client = createFixtureClient({
            scheduler: fake,
            fixtures: { examples: { ...examples, 'Problem.test-not-found': problem } },
            examples: { [route.operationId as ReadOp]: key },
          });
          for (const destination of destinations) {
            const controller = createShellController({ client, mode: 'desktop', route: destination, scheduler: fake });
            await flushMicrotasks();
            controller.snapshot();
            controller.destroy();
          }
          driven += 1;
        }
      }
    }
    expect(driven).toBe(17);

    // Every connection state and every change kind.
    let states = 0;
    for (const state of CONNECTION_STATES) {
      const fake = createFakeScheduler();
      const inner = createFixtureClient({ scheduler: fake, fixtures: { changes: sequenceCopy() } });
      const controller = createShellController({ client: inner, mode: 'desktop', route: '/missions', scheduler: fake });
      setConnectionState(inner, state);
      await fake.advance(1500);
      controller.snapshot();
      controller.destroy();
      states += 1;
    }
    expect(states).toBe(5);
    const { deferred, controller, fake } = deferredRig('/missions');
    for (const change of [lifecycle(M), transition(M, 'WP01'), truncated(M), RESYNC, { kind: 'refused', cursor: null, refusal: { status: 400, body: {} } } as never as Change]) {
      deferred.emit(change);
    }
    await fake.advance(1000);
    controller.destroy();
    expect(deferred.calls.length).toBeGreaterThan(0);
  });
});
