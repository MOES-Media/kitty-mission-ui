// ARCH-001: setClient without a route resets to the default route of (client, mode), and a null client on the desktop
// only ever shows the picker (data-model "Destination", contracts/shell-api.md).
import { describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createShellController, type ShellController } from '../../src/controller/shell-controller';
import { formatRoute } from '../../src/core/routes';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';

const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';

function rig(route: string | undefined, client: 'fixture' | null, mode: 'desktop' | 'dashboard' = 'desktop') {
  const fake = createFakeScheduler();
  const routes: string[] = [];
  const first = client === null ? null : recordingClient(createFixtureClient({ scheduler: fake }));
  const controller = createShellController({
    client: first,
    mode,
    ...(route === undefined ? {} : { route }),
    scheduler: fake,
    host: { routeChanged: (r: string) => routes.push(r), listRecentProjects: () => Promise.resolve({ ok: true, entries: [] }) as never },
  });
  const fresh = () => recordingClient(createFixtureClient({ scheduler: fake }));
  return { controller, routes, fresh, first };
}

const shown = (controller: ShellController): string => formatRoute(controller.snapshot().destination);

describe('setClient without a route (ARCH-001a, d)', () => {
  it('from the picker, setClient(adapter) shows /missions and announces it', async () => {
    const { controller, routes, fresh } = rig('/projects', null);
    expect(shown(controller)).toBe('/projects');
    const next = fresh();
    controller.setClient(next);
    await flushMicrotasks();
    expect(shown(controller)).toBe('/missions');
    expect(routes).toEqual(['/missions']);
    expect(next.take().sort()).toEqual(['getProject {}', 'listMissions {}']);
  });

  it('project A to project B with no route does not read A\'s Mission in B', async () => {
    const { controller, routes, fresh, first } = rig(`/missions/${M}`, 'fixture');
    await flushMicrotasks();
    first?.take();
    const b = fresh();
    controller.setClient(b);
    await flushMicrotasks();
    expect(shown(controller)).toBe('/missions');
    expect(routes).toEqual(['/missions']);
    expect(b.take().some((read) => read.includes(M))).toBe(false);
  });

  it('keeps announcing nothing when the default is the screen already shown', () => {
    const { controller, routes, fresh } = rig('/missions', 'fixture');
    controller.setClient(fresh());
    expect(routes).toEqual([]);
    expect(shown(controller)).toBe('/missions');
  });

  it('with an explicit route it still shows that route', () => {
    const { controller, routes, fresh } = rig('/missions', 'fixture');
    controller.setClient(fresh(), '/ops');
    expect(shown(controller)).toBe('/ops');
    expect(routes).toEqual([]);
  });
});

describe('a null client on the desktop only shows the picker (ARCH-001b, c)', () => {
  it('inside a Mission, setClient(null) shows /projects, not a loading Mission', async () => {
    const { controller, routes } = rig(`/missions/${M}`, 'fixture');
    await flushMicrotasks();
    controller.setClient(null);
    await flushMicrotasks();
    expect(shown(controller)).toBe('/projects');
    expect(controller.snapshot().screen.screen).toBe('projects');
    expect(routes).toEqual(['/projects']);
  });

  it('setClient(null, route) coerces any route to /projects and announces the coercion', () => {
    const { controller, routes } = rig('/missions', 'fixture');
    controller.setClient(null, '/ops');
    expect(shown(controller)).toBe('/projects');
    expect(routes).toEqual(['/projects']);
  });

  it('a null client with setRoute(/ops) stays on /projects and announces /projects', () => {
    const { controller, routes } = rig('/projects', null);
    controller.setRoute('/ops');
    expect(shown(controller)).toBe('/projects');
    expect(routes).toEqual(['/projects']);
  });

  it('navigate() to another screen with a null client is coerced the same way', () => {
    const { controller, routes } = rig('/projects', null);
    controller.navigate({ screen: 'pipeline', missionId: M });
    expect(shown(controller)).toBe('/projects');
    expect(routes).toEqual(['/projects']);
  });

  it('the initial route of a null desktop controller is coerced', () => {
    const { controller, routes } = rig('/ops', null);
    expect(shown(controller)).toBe('/projects');
    expect(routes).toEqual(['/projects']);
  });

  it('an omitted route with a null client starts on /projects without announcing', () => {
    const { controller, routes } = rig(undefined, null);
    expect(shown(controller)).toBe('/projects');
    expect(routes).toEqual([]);
  });
});

describe('the dashboard keeps its null-client behaviour', () => {
  it('a null client shows the project layout in error, with no coercion and no announcement', () => {
    const { controller, routes } = rig('/missions', null, 'dashboard');
    expect(shown(controller)).toBe('/missions');
    expect(controller.snapshot().chrome.status).toBe('error');
    controller.setRoute('/ops');
    expect(shown(controller)).toBe('/ops');
    expect(routes).toEqual([]);
  });

  it('setClient(null) on the dashboard keeps the route and shows "No project is open."', () => {
    const { controller, routes } = rig('/ops', 'fixture', 'dashboard');
    controller.setClient(null);
    expect(shown(controller)).toBe('/missions');
    expect(controller.snapshot().chrome.errorMessage).toBe('No project is open.');
    expect(routes).toEqual(['/missions']);
  });
});
