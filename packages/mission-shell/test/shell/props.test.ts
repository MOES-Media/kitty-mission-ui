// A Svelte host that changes the `client` and `route` props keeps working (plan IC-06 T027 step 5): only a changed value
// reaches the controller, and the initial values are not applied twice.
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { createFixtureClient } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { M, deepQueryAll, recordingHost, screenTag, settle, type Harness } from './helpers';
import PropsHost from './PropsHost.svelte';

const mounted: { app: ReturnType<typeof mount>; target: HTMLElement }[] = [];
afterEach(() => {
  for (const { app, target } of mounted.splice(0)) {
    void unmount(app);
    target.remove();
  }
});

describe('MissionShell used as a Svelte component', () => {
  it('forwards a changed route and a changed client once, and nothing on mount', async () => {
    const scheduler = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler }));
    const b = recordingClient(createFixtureClient({ scheduler }));
    const host = recordingHost();
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { initial: { client: a, host, mode: 'desktop', route: '/missions', scheduler } } }) as unknown as {
      update(patch: { client?: typeof a; route?: string }): void;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    expect(a.counts.subscribe, 'the initial client is taken once').toBe(1);
    expect(host.count('routeChanged'), 'a canonical initial route is not announced').toBe(0);

    app.update({ route: '/ops' });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(host.count('routeChanged'), 'a canonical host route is not echoed').toBe(0);

    app.update({ client: b });
    flushSync();
    await settle(harness);
    expect(a.counts.unsubscribe).toBe(1);
    expect(b.counts.subscribe).toBe(1);
    expect(deepQueryAll(target, 'sk-ops-screen').length).toBe(1);
    expect(b.reads.some((read) => read.startsWith('listOpsInvocations'))).toBe(true);

    // The same values again change nothing.
    app.update({ client: b, route: '/ops' });
    flushSync();
    await settle(harness);
    expect(b.counts.subscribe).toBe(1);
  });

  it('a host that echoes routeChanged into its route prop does not double-read Ops or Artifacts (B1)', async () => {
    const scheduler = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler }));
    const host = recordingHost();
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { echo: true, initial: { client, host, mode: 'desktop', route: '/missions', scheduler } } }) as unknown as {
      currentRoute(): string | undefined;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);

    const navigate = async (href: string): Promise<string[]> => {
      client.take();
      harness.shell.dispatchEvent(new CustomEvent('sk-navigate', { detail: { id: 'x', href }, bubbles: true, composed: true }));
      flushSync();
      await settle(harness);
      await settle(harness, 1000);
      return client.take();
    };
    const count = (reads: string[], op: string): number => reads.filter((read) => read.startsWith(`${op} `)).length;

    const ops = await navigate('#/ops');
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(app.currentRoute(), 'the echoed route prop is in sync').toBe('/ops');
    expect(count(ops, 'listOpsInvocations'), 'Ops is read once, not again by the echo').toBe(1);

    const artifacts = await navigate(`#/missions/${M}/artifacts`);
    expect(screenTag(harness.shell)).toBe('sk-artifact-screen');
    expect(app.currentRoute()).toBe(`/missions/${M}/artifacts`);
    expect(count(artifacts, 'listArtifacts'), 'Artifacts is read once').toBe(1);
    expect(host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/ops', `/missions/${M}/artifacts`]);
  });

  it('a non-canonical host route that normalises to the current screen is announced once, canonically (cycle 2)', async () => {
    const scheduler = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler }));
    const host = recordingHost();
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { initial: { client, host, mode: 'desktop', route: '/missions', scheduler } } }) as unknown as {
      update(patch: { route?: string }): void;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    host.calls.length = 0;
    app.update({ route: '/nowhere' });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/missions']);
  });

  it('a client and a route changed in the same tick read the new screen on the new client only (N6)', async () => {
    const scheduler = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler }));
    const b = recordingClient(createFixtureClient({ scheduler }));
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { initial: { client: a, host: recordingHost(), mode: 'desktop', route: '/missions', scheduler } } }) as unknown as {
      update(patch: { client?: typeof a; route?: string }): void;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    a.take();
    app.update({ client: b, route: '/ops' });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(a.take(), 'the old client reads nothing').toEqual([]);
    expect(b.reads.filter((read) => read.startsWith('listOpsInvocations ')).length).toBe(1);
  });
});
