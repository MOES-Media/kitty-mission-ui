// CON-001: a lone UTF-16 surrogate in an artifact path must never reach encodeURIComponent, which throws URIError.
import { describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createShellController } from '../../src/controller/shell-controller';
import { formatRoute, normaliseRoute, parseRoute } from '../../src/core/routes';
import { treesOf } from '../../src/ui/navigation';
import { createDeferredClient } from '../support/deferred-client';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';
import { ok } from '../support/results';

const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';
const BAD = 'a\uD800';
const BAD_ROUTE = `/missions/${M}/artifacts/${BAD}`;
const GOOD_PAIR = 'smile-\u{1F600}.md';

describe('lone surrogates in artifact paths (CON-001)', () => {
  it('parseRoute treats a lone surrogate as an unknown route (Missions) and never throws', () => {
    for (const bad of ['a\uD800', '\uDC00', 'x\uDBFFy', 'ab\uDC00\uD800']) {
      const route = `/missions/${M}/artifacts/${bad}`;
      expect(() => parseRoute(route, 'desktop')).not.toThrow();
      expect(parseRoute(route, 'desktop')).toEqual({ screen: 'missions' });
      expect(() => normaliseRoute(route, 'desktop')).not.toThrow();
      expect(normaliseRoute(route, 'desktop')).toEqual({ destination: { screen: 'missions' }, route: '/missions', canonical: false });
    }
  });

  it('keeps a well-formed surrogate pair valid and round-tripping', () => {
    const destination = { screen: 'artifacts', missionId: M, path: GOOD_PAIR } as const;
    expect(parseRoute(formatRoute(destination), 'desktop')).toEqual(destination);
  });

  it('createShellController, setRoute and setClient with such a route stay no-throw and show Missions', () => {
    const fake = createFakeScheduler();
    const routes: string[] = [];
    const host = { routeChanged: (route: string) => routes.push(route) };
    const client = () => createFixtureClient({ scheduler: fake });
    expect(() => createShellController({ client: client(), mode: 'desktop', route: BAD_ROUTE, scheduler: fake, host })).not.toThrow();
    const controller = createShellController({ client: client(), mode: 'desktop', route: BAD_ROUTE, scheduler: fake, host });
    expect(controller.snapshot().destination).toEqual({ screen: 'missions' });
    expect(routes).toEqual(['/missions', '/missions']);

    controller.setRoute('/ops');
    expect(() => controller.setRoute(BAD_ROUTE)).not.toThrow();
    expect(controller.snapshot().destination).toEqual({ screen: 'missions' });

    controller.setRoute('/ops');
    // setClient detaches before it attaches: a throw in between would leave the shell without a client.
    expect(() => controller.setClient(client(), BAD_ROUTE)).not.toThrow();
    expect(controller.snapshot().destination).toEqual({ screen: 'missions' });
    expect(controller.snapshot().connection.state).not.toBeNull();
  });

  it('treesOf skips a listing entry whose path has a lone surrogate and keeps the others', async () => {
    const fake = createFakeScheduler();
    const deferred = createDeferredClient('connected');
    const controller = createShellController({ client: deferred, mode: 'desktop', route: `/missions/${M}/artifacts`, scheduler: fake });
    const entry = (path: string) => ({ path, kind: 'other', sizeBytes: 1, modifiedAt: '2026-09-22T11:05:00Z', readable: true });
    deferred.resolveNext('listArtifacts', ok('listArtifacts', { missionId: M, entries: [entry('spec.md'), entry(BAD), entry(`dir/${BAD}`), entry(GOOD_PAIR)] }));
    await flushMicrotasks();
    const trees = (() => treesOf(controller.snapshot()))();
    const ids: string[] = [];
    const walk = (nodes: readonly { id: string; children?: readonly unknown[] }[]): void => {
      for (const node of nodes) {
        ids.push(node.id);
        walk((node.children ?? []) as never);
      }
    };
    walk(trees[0]?.items ?? []);
    expect(ids).toEqual(['spec.md', GOOD_PAIR]);
  });
});
