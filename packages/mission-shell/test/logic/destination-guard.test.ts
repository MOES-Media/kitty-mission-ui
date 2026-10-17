// CON-002: a destination built from an intent's detail is checked against the id patterns before it is shown.
import { describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createShellController } from '../../src/controller/shell-controller';
import { isValidDestination, parseRoute, formatRoute, type Destination } from '../../src/core/routes';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';

const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';
const O = '01JZAB3C4D5E6F7G8H9JKMNPQS';

function rig(route = '/missions') {
  const fake = createFakeScheduler();
  const routes: string[] = [];
  const client = recordingClient(createFixtureClient({ scheduler: fake }));
  const controller = createShellController({
    client,
    mode: 'desktop',
    route,
    scheduler: fake,
    host: { routeChanged: (r: string) => routes.push(r) },
  });
  return { controller, client, routes };
}

const PROBES: readonly (readonly [string, string, unknown])[] = [
  ['sk-missions-screen', 'sk-open-mission', { missionId: '../../etc/x' }],
  ['sk-drift-screen', 'sk-open-mission', { missionId: 'not-a-ulid' }],
  ['sk-pipeline-screen', 'sk-view-artifacts', { missionId: '../x' }],
  ['sk-work-package-screen', 'sk-open-artifact', { missionId: M, path: '../secret' }],
  ['sk-artifact-screen', 'sk-select-artifact', { missionId: M, path: 'a/../b' }],
  ['sk-artifact-screen', 'sk-select-artifact', { missionId: M, path: 'a\uD800' }],
  ['sk-pipeline-screen', 'sk-select-work-package', { missionId: M, wpId: '../WP01' }],
  ['sk-work-package-screen', 'sk-select-work-package', { missionId: M, wpId: 'wp1' }],
  ['sk-drift-screen', 'sk-retry-load', { missionId: '../../etc/x' }],
  ['sk-work-package-screen', 'sk-retry-load', { target: 'work-package', missionId: '../x', wpId: 'WP01' }],
  ['sk-work-package-screen', 'sk-retry-load', { target: 'detail', missionId: M, wpId: '..' }],
  ['sk-artifact-screen', 'sk-retry-load', { target: 'content', missionId: M, path: '../x' }],
  ['sk-artifact-screen', 'sk-retry-load', { target: 'listing', missionId: '../x' }],
];

describe('intent-built destinations are validated (CON-002)', () => {
  // The retry probes are defence in depth: a retry only reads a displayed key, so they also pass without the guard.
  it.each(PROBES)('%s / %s with %j is dropped: no routeChanged, no read, no change of screen', async (tag, event, detail) => {
    const { controller, client, routes } = rig();
    await flushMicrotasks();
    client.take();
    routes.length = 0;
    const before = controller.snapshot().destination;
    await expect(controller.intent(tag, event, detail)).resolves.toBeUndefined();
    await flushMicrotasks();
    expect(routes).toEqual([]);
    expect(client.take()).toEqual([]);
    expect(controller.snapshot().destination).toEqual(before);
  });

  const POSITIVE: readonly (readonly [string, string, unknown, string])[] = [
    ['sk-missions-screen', 'sk-open-mission', { missionId: M }, `/missions/${M}`],
    ['sk-pipeline-screen', 'sk-view-artifacts', { missionId: M }, `/missions/${M}/artifacts`],
    ['sk-pipeline-screen', 'sk-select-work-package', { missionId: M, wpId: 'WP02' }, `/missions/${M}/work-packages/WP02`],
    ['sk-artifact-screen', 'sk-select-artifact', { missionId: M, path: 'tasks/WP01.md' }, `/missions/${M}/artifacts/tasks%2FWP01.md`],
    ['sk-work-package-screen', 'sk-open-artifact', { missionId: O, path: 'spec.md' }, `/missions/${O}/artifacts/spec.md`],
  ];

  it.each(POSITIVE)('%s / %s with %j navigates and announces its canonical route', async (tag, event, detail, route) => {
    const { controller, routes } = rig();
    await controller.intent(tag, event, detail);
    expect(routes).toEqual([route]);
    expect(formatRoute(controller.snapshot().destination)).toBe(route);
  });

  it('a valid drift retry still reads; an invalid one reads nothing', async () => {
    const scoped = rig(`/drift/${M}`);
    await flushMicrotasks();
    scoped.client.take();
    await scoped.controller.intent('sk-drift-screen', 'sk-retry-load', { missionId: M });
    expect(scoped.client.take()).toEqual([`getDriftReport {"query":{"missionId":"${M}"}}`]);
    await scoped.controller.intent('sk-drift-screen', 'sk-retry-load', { missionId: '../../etc/x' });
    expect(scoped.client.take()).toEqual([]);
    const all = rig('/drift');
    await flushMicrotasks();
    all.client.take();
    await all.controller.intent('sk-drift-screen', 'sk-retry-load', {});
    expect(all.client.take()).toEqual(['getDriftReport {}']);
  });

  it('every destination the controller emits round-trips through the route grammar', async () => {
    const { controller, routes } = rig();
    for (const [tag, event, detail] of [...PROBES, ...POSITIVE.map(([t, e, d]) => [t, e, d] as const)]) await controller.intent(tag, event, detail);
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      const destination = parseRoute(route, 'desktop');
      expect(formatRoute(destination)).toBe(route);
    }
    const destination = controller.snapshot().destination;
    expect(parseRoute(formatRoute(destination), 'desktop')).toEqual(destination);
  });

  it('isValidDestination accepts what the grammar can express and refuses the rest', () => {
    const valid: Destination[] = [
      { screen: 'missions' },
      { screen: 'drift' },
      { screen: 'drift', missionId: M },
      { screen: 'work-packages', missionId: M, wpId: 'WP100' },
      { screen: 'artifacts', missionId: M, path: 'a b/c.md' },
    ];
    for (const d of valid) expect(isValidDestination(d), JSON.stringify(d)).toBe(true);
    const invalid: Destination[] = [
      { screen: 'pipeline', missionId: 'x' },
      { screen: 'drift', missionId: '' },
      { screen: 'work-packages', missionId: M, wpId: 'WP1' },
      { screen: 'artifacts', missionId: M, path: '' },
    ];
    for (const d of invalid) expect(isValidDestination(d), JSON.stringify(d)).toBe(false);
  });
});
