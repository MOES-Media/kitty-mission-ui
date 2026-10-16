// A Svelte host that changes the `client` and `route` props keeps working (plan IC-06 T027 step 5): only a changed value
// reaches the controller, and the initial values are not applied twice.
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { createFixtureClient, setConnectionState } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { M, recordingHost, screenTag, settle, type Harness } from './helpers';
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
    // A client-only change takes the default route of the new project, as the mountShell handle does (ARCH-001).
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(b.reads.some((read) => read.startsWith('listMissions'))).toBe(true);
    expect(b.reads.some((read) => read.startsWith('listOpsInvocations'))).toBe(false);

    // The same values again change nothing.
    app.update({ client: b, route: '/ops' });
    flushSync();
    await settle(harness);
    expect(b.counts.subscribe).toBe(1);
  });

  it('a null client on the picker route, then a client prop: the shell leaves the picker (R2-NEW-001a)', async () => {
    const scheduler = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler }));
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { initial: { client: null, host: recordingHost(), mode: 'desktop', route: '/projects', scheduler } } }) as unknown as {
      update(patch: { client?: typeof a }): void;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-projects-screen');
    app.update({ client: a });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(a.reads.some((read) => read.startsWith('listMissions'))).toBe(true);
  });

  it('an echoing host switching project inside a Mission does not read that Mission on the new client (R2-NEW-001b)', async () => {
    const scheduler = createFakeScheduler();
    const a = recordingClient(createFixtureClient({ scheduler }));
    const b = recordingClient(createFixtureClient({ scheduler }));
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { echo: true, initial: { client: a, host: recordingHost(), mode: 'desktop', route: `/missions/${M}`, scheduler } } }) as unknown as {
      update(patch: { client?: typeof a }): void;
      currentRoute(): string | undefined;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-pipeline-screen');
    app.update({ client: b });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-missions-screen');
    expect(b.reads.some((read) => read.includes(M))).toBe(false);
    expect(app.currentRoute(), 'the echoed route prop follows').toBe('/missions');
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

  it('a changed copy prop takes effect on the shown banner (ARCH-003)', async () => {
    const scheduler = createFakeScheduler();
    const client = createFixtureClient({ scheduler });
    const target = document.createElement('div');
    document.body.append(target);
    const app = mount(PropsHost, { target, props: { initial: { client, host: recordingHost(), mode: 'desktop', route: '/missions', scheduler } } }) as unknown as {
      update(patch: { copy?: { serviceMissing?: { title: string; body: string } } | undefined }): void;
    };
    mounted.push({ app: app as never, target });
    const harness = { target, scheduler, shell: target.querySelector('sk-mission-shell') as HTMLElement } as unknown as Harness;
    await settle(harness);
    setConnectionState(client, 'degraded: service-missing');
    await settle(harness);
    const title = (): string | undefined => harness.shell.querySelector('sk-notice')?.textContent ?? undefined;
    expect(title()).toContain('Service not available');
    app.update({ copy: { serviceMissing: { title: 'Prop override', body: 'Prop body.' } } });
    flushSync();
    await settle(harness);
    expect(title()).toContain('Prop override');
    app.update({ copy: undefined });
    flushSync();
    await settle(harness);
    expect(title()).toContain('Service not available');
  });

  it('a client and a route changed in the same tick make no spurious routeChanged and no wasted read (ARCH-009)', async () => {
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
    host.calls.length = 0;
    b.take();
    app.update({ client: b, route: '/ops' });
    flushSync();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-ops-screen');
    expect(b.reads.filter((read) => read.startsWith('listMissions')), 'the default screen is never read on the new client').toEqual([]);
    expect(host.calls.filter((call) => call.member === 'routeChanged')).toEqual([]);

    // The other direction: the default screen differs from where the shell was, which announced a route nobody asked for.
    const c = recordingClient(createFixtureClient({ scheduler }));
    app.update({ client: c, route: '/missions' });
    flushSync();
    await settle(harness);
    app.update({ client: a, route: '/ops' });
    flushSync();
    await settle(harness);
    expect(host.calls.filter((call) => call.member === 'routeChanged')).toEqual([]);
  });
});
