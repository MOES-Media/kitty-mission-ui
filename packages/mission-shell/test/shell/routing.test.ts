// FR-001 on real elements (plan IC-06, plant P-7's file): every destination mounts its own screen, layout and current item.
// The screen assertion carries the failure-only token of plant P-7; no test title contains it.
import { afterEach, describe, expect, it } from 'vitest';
import examples from '../../../../contracts/fixtures/mission-status.examples.json' with { type: 'json' };
import type { Destination } from '../../src/core/routes';
import { formatRoute } from '../../src/core/routes';
import { createFixtureClient } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { M, deepQueryAll, destroyAll, mountAt, recordingHost, screenElement, screenTag, settle, type Harness } from './helpers';

afterEach(destroyAll);

/** Activates a navigation item with a real click on its link. */
async function selectNavItem(harness: Harness, id: string): Promise<void> {
  const item = deepQueryAll(harness.target, 'sk-shell-nav-item').find((candidate) => (candidate as unknown as { itemId: string }).itemId === id);
  const anchor = item?.shadowRoot ? (deepQueryAll(item.shadowRoot, 'a')[0] as HTMLAnchorElement | undefined) : undefined;
  expect(anchor, `the ${id} navigation item renders a link`).toBeDefined();
  anchor?.click();
  await settle(harness);
}

interface Case {
  readonly destination: Destination;
  readonly tag: string;
  readonly layout: string;
  readonly current: string;
  readonly railCurrent: string;
}

const CASES: readonly Case[] = [
  { destination: { screen: 'missions' }, tag: 'sk-missions-screen', layout: 'project', current: 'nav-missions', railCurrent: '' },
  { destination: { screen: 'drift' }, tag: 'sk-drift-screen', layout: 'project', current: 'nav-drift', railCurrent: '' },
  { destination: { screen: 'ops' }, tag: 'sk-ops-screen', layout: 'project', current: 'nav-ops', railCurrent: '' },
  { destination: { screen: 'pipeline', missionId: M }, tag: 'sk-pipeline-screen', layout: 'mission', current: 'nav-pipeline', railCurrent: 'rail-missions' },
  { destination: { screen: 'work-packages', missionId: M }, tag: 'sk-work-package-screen', layout: 'mission', current: 'nav-work-packages', railCurrent: 'rail-missions' },
  { destination: { screen: 'artifacts', missionId: M }, tag: 'sk-artifact-screen', layout: 'mission', current: 'nav-artifacts', railCurrent: 'rail-missions' },
  { destination: { screen: 'projects' }, tag: 'sk-projects-screen', layout: 'picker', current: '', railCurrent: '' },
];

describe('routing on real screens (FR-001)', () => {
  for (const { destination, tag, layout, current, railCurrent } of CASES) {
    it(`routing: ${destination.screen}`, async () => {
      const harness = await mountAt(formatRoute(destination), { host: recordingHost() });
      const { shell } = harness;
      expect(shell.children.length).toBeGreaterThan(0);
      expect(harness.target.children.length, 'one root element').toBe(1);
      expect(harness.target.firstElementChild?.localName).toBe('sk-mission-shell');
      const screenTagMounted = screenTag(shell);
      expect(screenTagMounted, `mounted screen mismatch on ${destination.screen}`).toBe(tag);
      expect(shell.getAttribute('layout')).toBe(layout);
      expect((shell as unknown as { current: string }).current).toBe(current);
      expect((shell as unknown as { railCurrent: string }).railCurrent).toBe(railCurrent);
    });
  }

  it('routing: the object properties of the shell arrive as properties (an array, not an attribute)', async () => {
    const harness = await mountAt(formatRoute({ screen: 'pipeline', missionId: M }));
    const shell = harness.shell as unknown as { navItems: unknown; railItems: unknown; mission: { title: string } | null };
    expect(Array.isArray(shell.navItems)).toBe(true);
    expect((shell.navItems as unknown[]).length).toBe(3);
    expect(Array.isArray(shell.railItems)).toBe(true);
    expect(harness.shell.hasAttribute('navItems')).toBe(false);
    expect(harness.shell.hasAttribute('navitems')).toBe(false);
  });

  it('routing: every navigation item and tree row carries a hash href of its canonical route', async () => {
    const harness = await mountAt(formatRoute({ screen: 'work-packages', missionId: M, wpId: 'WP04' }));
    const shell = harness.shell as unknown as { navItems: { href: string }[]; railItems: { href: string }[] };
    expect(shell.navItems.map((item) => item.href)).toEqual([`#/missions/${M}`, `#/missions/${M}/work-packages`, `#/missions/${M}/artifacts`]);
    expect(shell.railItems.map((item) => item.href)).toEqual(['#/missions', '#/drift', '#/ops', '#/projects']);
    const tree = deepQueryAll(harness.target, 'sk-shell-tree')[0] as unknown as { items: { id: string; href: string; meta?: string }[]; current: string };
    const served = (examples['MissionDetail.populated'].value as { workPackages: { wpId: string }[] }).workPackages.map((wp) => wp.wpId);
    expect(served.length).toBeGreaterThan(1);
    expect(tree.items.map((leaf) => leaf.href)).toEqual(served.map((id) => `#/missions/${M}/work-packages/${id}`));
    expect(tree.current).toBe('WP04');
    // The lane word is passed through from the Mission detail (positive control: at least one row carries it).
    expect(tree.items.filter((leaf) => typeof leaf.meta === 'string' && leaf.meta !== '').length).toBeGreaterThan(0);
  });

  it('routing: no selection shows nothing-selected on Work Packages and on Artifacts (R-03)', async () => {
    const workPackages = await mountAt(formatRoute({ screen: 'work-packages', missionId: M }));
    expect(screenElement<HTMLElement & { status: string }>(workPackages.shell, 'sk-work-package-screen').status).toBe('nothing-selected');
    const artifacts = await mountAt(formatRoute({ screen: 'artifacts', missionId: M }));
    expect(screenElement<HTMLElement & { status: string }>(artifacts.shell, 'sk-artifact-screen').status).toBe('nothing-selected');
    // Positive control: with a selection the status is a data status.
    const selected = await mountAt(formatRoute({ screen: 'work-packages', missionId: M, wpId: 'WP04' }));
    expect(screenElement<HTMLElement & { status: string }>(selected.shell, 'sk-work-package-screen').status).not.toBe('nothing-selected');
  });

  it('routing: a real sk-navigate from a navigation item shows the destination and announces the canonical route', async () => {
    const host = recordingHost();
    const harness = await mountAt('/missions', { host });
    const item = deepQueryAll(harness.target, 'sk-shell-nav-item').find((candidate) => (candidate as unknown as { itemId: string }).itemId === 'nav-drift');
    expect(item, 'the Drift navigation item').toBeDefined();
    const anchor = item?.shadowRoot ? (deepQueryAll(item.shadowRoot, 'a')[0] as HTMLAnchorElement | undefined) : undefined;
    expect(anchor, 'the item renders a link').toBeDefined();
    anchor?.click();
    await settle(harness);
    expect(screenTag(harness.shell)).toBe('sk-drift-screen');
    expect((harness.shell as unknown as { current: string }).current).toBe('nav-drift');
    expect(host.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/drift']);
  });
});

describe('the Mission head and the re-selection reads (A9)', () => {
  it('routing: Pipeline of M shows the served friendlyName in the shell mission head', async () => {
    const harness = await mountAt(formatRoute({ screen: 'pipeline', missionId: M }));
    const served = examples['MissionDetail.populated'].value as { friendlyName?: string | null; slug: string };
    const title = (harness.shell as unknown as { mission: { title: string } | null }).mission?.title;
    expect(served.friendlyName ?? served.slug).toBeTruthy();
    expect(title).toBe(served.friendlyName ?? served.slug);
  });

  it('routing: re-selecting Ops reads Ops once, and re-selecting Pipeline reads nothing (US6-2)', async () => {
    const scheduler = createFakeScheduler();
    const client = recordingClient(createFixtureClient({ scheduler }));
    const ops = await mountAt('/ops', { scheduler, client });
    client.take();
    await selectNavItem(ops, 'nav-ops');
    expect(client.take().filter((read) => read.startsWith('listOpsInvocations')).length).toBe(1);
    const scheduler2 = createFakeScheduler();
    const client2 = recordingClient(createFixtureClient({ scheduler: scheduler2 }));
    const pipeline = await mountAt(`/missions/${M}`, { scheduler: scheduler2, client: client2 });
    client2.take();
    await selectNavItem(pipeline, 'nav-pipeline');
    expect(client2.take()).toEqual([]);
  });
});
