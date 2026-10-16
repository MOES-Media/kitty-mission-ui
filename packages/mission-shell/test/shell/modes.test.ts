// FR-014, FR-015, R1-03 on real elements: the desktop picker with no client, and the mounted dashboard, which has no entry
// point to the picker at all (no footer item, no rail item, no screen, no dialog), looked for through every shadow root.
import { afterEach, describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createFakeScheduler } from '../support/fake-scheduler';
import { recordingClient } from '../support/recording-client';
import { M, deepQueryAll, destroyAll, mountAt, recordingHost, screenElement, screenTag, settle, type Harness } from './helpers';

afterEach(destroyAll);

const fire = (element: Element, event: string, detail: unknown): void => {
  element.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }));
};

const labelsOf = (harness: Harness): string[] =>
  deepQueryAll(harness.target, 'sk-shell-nav-item').map((item) => (item as unknown as { label: string }).label);

describe('the desktop picker with no client (FR-014)', () => {
  it('shows the picker layout filled from the host, and each picker intent reaches the host once', async () => {
    const host = recordingHost();
    const harness = await mountAt(undefined, { client: null, host, mode: 'desktop' });
    expect(harness.shell.getAttribute('layout')).toBe('picker');
    expect(screenTag(harness.shell)).toBe('sk-projects-screen');
    const screen = screenElement<HTMLElement & { entries: { key: string }[]; status: string }>(harness.shell, 'sk-projects-screen');
    expect(screen.status).toBe('ready');
    expect(screen.entries.map((entry) => entry.key)).toEqual(['sample-project']);
    expect(host.count('listRecentProjects')).toBe(1);

    host.calls.length = 0;
    fire(screen, 'sk-request-open-project', null);
    await settle(harness);
    expect(host.count('listFolders')).toBe(1);

    const dialog = deepQueryAll(harness.target, 'sk-open-project-dialog')[0] as Element;
    host.calls.length = 0;
    fire(dialog, 'sk-browse-folder', { location: 'sample-folder' });
    await settle(harness);
    expect(host.calls.filter((call) => call.member === 'listFolders').map((call) => call.args)).toEqual([['sample-folder']]);
    host.calls.length = 0;
    fire(dialog, 'sk-confirm-open-project', { location: 'sample-folder' });
    await settle(harness);
    expect(host.calls.filter((call) => call.member === 'openProject').map((call) => call.args)).toEqual([[{ location: 'sample-folder' }]]);
  });

  it('positive control: a desktop with a client has the "All projects" footer item and the Projects rail item', async () => {
    const harness = await mountAt('/missions');
    expect((harness.shell as unknown as { footerItem: { label: string } | null }).footerItem?.label).toBe('All projects');
    expect(labelsOf(harness)).toContain('All projects');
    const mission = await mountAt(`/missions/${M}`);
    expect((mission.shell as unknown as { railItems: { id: string }[] }).railItems.map((item) => item.id)).toContain('rail-projects');
  });
});

describe('the mounted dashboard has no picker entry point (FR-015, R1-03)', () => {
  const DASHBOARD: readonly [string, string][] = [
    ['with a client on Missions', '/missions'],
    ['with a client on the Pipeline (rail)', `/missions/${M}`],
    ['asked for /projects', '/projects'],
  ];
  for (const [name, route] of DASHBOARD) {
    it(`modes: dashboard ${name}`, async () => {
      const host = recordingHost();
      const harness = await mountAt(route, { host, mode: 'dashboard' });
      const shell = harness.shell as unknown as { footerItem: unknown; railItems: { id: string; label: string }[]; navItems: { label: string }[] };
      expect(shell.footerItem).toBeNull();
      expect(shell.railItems.map((item) => item.id)).not.toContain('rail-projects');
      expect(labelsOf(harness)).not.toContain('All projects');
      expect(labelsOf(harness)).not.toContain('Projects');
      expect(deepQueryAll(harness.target, 'sk-projects-screen').length).toBe(0);
      expect(deepQueryAll(harness.target, 'sk-open-project-dialog').length).toBe(0);
      expect(screenTag(harness.shell)).not.toBe('sk-projects-screen');
      // A reached /projects lands on Missions.
      if (route === '/projects') expect(screenTag(harness.shell)).toBe('sk-missions-screen');
      expect(host.count('listRecentProjects')).toBe(0);
    });
  }

  it('modes: dashboard with no client shows "No project is open." and makes no read and arms no timer', async () => {
    const host = recordingHost();
    const harness = await mountAt('/missions', { client: null, host, mode: 'dashboard' });
    await settle(harness, 10_000);
    expect(harness.shell.getAttribute('status')).toBe('error');
    expect((harness.shell as unknown as { errorMessage: string }).errorMessage).toBe('No project is open.');
    expect(deepQueryAll(harness.target, 'sk-projects-screen').length).toBe(0);
    expect(deepQueryAll(harness.target, 'sk-open-project-dialog').length).toBe(0);
    expect((harness.shell as unknown as { footerItem: unknown }).footerItem).toBeNull();
    expect(host.count('listRecentProjects')).toBe(0);
    expect(harness.scheduler.pending(), 'no read, retry or grace timer is armed').toBe(0);
    // Positive control: the same mount given a client reads at once, so the check above can see a read.
    const scheduler = createFakeScheduler();
    const watcher = recordingClient(createFixtureClient({ scheduler }));
    const control = await mountAt('/missions', { scheduler, client: watcher, mode: 'dashboard' });
    expect(watcher.reads.length).toBeGreaterThan(0);
    expect(control.shell.getAttribute('status')).not.toBe('error');
  });
});
