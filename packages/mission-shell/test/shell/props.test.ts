// A Svelte host that changes the `client` and `route` props keeps working (plan IC-06 T027 step 5): only a changed value
// reaches the controller, and the initial values are not applied twice.
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { createFixtureClient } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { deepQueryAll, recordingHost, screenTag, settle, type Harness } from './helpers';
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
});
