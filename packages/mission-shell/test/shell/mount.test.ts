// R5-07 on the public mount surface: the subscriptions are registered and released exactly, across setClient and destroy,
// and a client that was replaced or destroyed records no further read.
import { afterEach, describe, expect, it } from 'vitest';
import { createFixtureClient, setConnectionState } from '../../src/client/fixture';
import type { ConnectionState, MissionStatusClient } from '../../src/client/port';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient, type RecordingClient } from '../support/recording-client';
import { destroyAll, mountAt, recordingHost, screenTag, settle } from './helpers';

afterEach(destroyAll);

interface Counting {
  readonly client: RecordingClient;
  readonly inner: MissionStatusClient;
  /** Delivers a connection change to this client's listeners. */
  state(next: ConnectionState): void;
}

function counting(scheduler: ReturnType<typeof createFakeScheduler>): Counting {
  const inner = createFixtureClient({ scheduler });
  return { inner, client: recordingClient(inner), state: (next) => setConnectionState(inner, next) };
}

describe('mountShell registrations and releases (R5-07)', () => {
  it('mount, setClient, destroy: one subscription, one connection listener and one refocus registration per client', async () => {
    const scheduler = createFakeScheduler();
    const a = counting(scheduler);
    const b = counting(scheduler);
    const host = recordingHost();
    const harness = await mountAt('/missions', { scheduler, client: a.client, host, mode: 'desktop' });
    expect(a.client.counts).toEqual({ subscribe: 1, unsubscribe: 0, onChange: 1, offChange: 0 });
    expect(host.count('onWindowRefocus')).toBe(1);

    harness.mounted.setClient(b.client);
    await settle(harness);
    expect(a.client.counts).toEqual({ subscribe: 1, unsubscribe: 1, onChange: 1, offChange: 1 });
    expect(b.client.counts).toEqual({ subscribe: 1, unsubscribe: 0, onChange: 1, offChange: 0 });
    expect(host.count('onWindowRefocus')).toBe(2);
    expect(host.count('onWindowRefocus.release')).toBe(1);

    harness.mounted.destroy();
    expect(a.client.counts).toEqual({ subscribe: 1, unsubscribe: 1, onChange: 1, offChange: 1 });
    expect(b.client.counts).toEqual({ subscribe: 1, unsubscribe: 1, onChange: 1, offChange: 1 });
    expect(host.count('onWindowRefocus')).toBe(2);
    expect(host.count('onWindowRefocus.release')).toBe(2);
    // A second destroy is a no-op and throws nothing.
    expect(() => harness.mounted.destroy()).not.toThrow();
    expect(b.client.counts.unsubscribe).toBe(1);
    expect(harness.target.querySelector('sk-mission-shell')).toBeNull();
  });

  it('a change delivered on the replaced client, and on the destroyed one, records zero reads', async () => {
    const scheduler = createFakeScheduler();
    const a = counting(scheduler);
    const b = counting(scheduler);
    const harness = await mountAt('/missions', { scheduler, client: a.client });
    harness.mounted.setClient(b.client);
    await settle(harness);
    a.client.take();
    b.client.take();

    // A resync-causing connection cycle on the replaced client.
    a.state('reconnecting');
    a.state('connected');
    await settle(harness, 5000);
    expect(a.client.take(), 'the replaced client records no read').toEqual([]);

    // Positive control: the same cycle on the current client does read.
    b.state('reconnecting');
    b.state('connected');
    await settle(harness, 5000);
    expect(b.client.take().length).toBeGreaterThan(0);

    harness.mounted.destroy();
    b.client.take();
    b.state('reconnecting');
    b.state('connected');
    await scheduler.advance(5000);
    expect(b.client.take(), 'the destroyed shell records no read').toEqual([]);
  });

  it('setClient(b, route) switches the route in the same step', async () => {
    const scheduler = createFakeScheduler();
    const a = counting(scheduler);
    const b = counting(scheduler);
    const host = recordingHost();
    const harness = await mountAt('/missions', { scheduler, client: a.client, host });
    host.calls.length = 0;
    harness.mounted.setClient(b.client, '/ops');
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(b.client.reads.some((read) => read.startsWith('listOpsInvocations'))).toBe(true);
    expect(b.client.reads.some((read) => read.startsWith('listMissions'))).toBe(false);
    // A canonical route set with the client is not echoed back.
    expect(host.count('routeChanged')).toBe(0);
  });

  it('setRoute shows the destination and announces only a non-canonical route', async () => {
    const host = recordingHost();
    const harness = await mountAt('/missions', { host });
    host.calls.length = 0;
    harness.mounted.setRoute('/ops');
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(host.count('routeChanged')).toBe(0);
    harness.mounted.setRoute('/nowhere');
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/missions']);
  });

  it('a window refocus on the desktop re-reads the Ops page once', async () => {
    const scheduler = createFakeScheduler();
    const a = counting(scheduler);
    const host = recordingHost();
    const harness = await mountAt('/ops', { scheduler, client: a.client, host });
    a.client.take();
    host.refocus();
    await settle(harness);
    expect(a.client.take().filter((read) => read.startsWith('listOpsInvocations')).length).toBe(1);
  });
});
