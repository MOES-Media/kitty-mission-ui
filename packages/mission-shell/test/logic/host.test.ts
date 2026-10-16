import { describe, expect, it } from 'vitest';
import type { FolderEntry, ProjectEntry } from '@moes-media/mission-ui';
import { createFixtureClient } from '../../src/client/fixture';
import type { MissionStatusClient } from '../../src/client/port';
import { createShellController, type ShellController, type ShellControllerOptions } from '../../src/controller/shell-controller';
import { SHELL_COPY } from '../../src/core/connection';
import {
  safeCopyText,
  safeListFolders,
  safeListRecentProjects,
  safeOnWindowRefocus,
  safeOpenExternalLink,
  safeOpenProject,
  safeRouteChanged,
  type ShellHost,
} from '../../src/core/host';
import { M } from '../support/expected-recording';
import { createFakeScheduler, flushMicrotasks, type FakeScheduler } from '../support/fake-scheduler';
import { recordingClient, type RecordingClient } from '../support/recording-client';

// ---- synthetic data (C-006: opaque names, no real paths) ----
const ENTRIES: ProjectEntry[] = [
  { key: 'project-a', location: 'synthetic-location-a', name: 'Alpha' },
  { key: 'project-b', location: 'synthetic-location-b', name: 'Beta' },
];
const FOLDERS: FolderEntry[] = [
  { name: 'up', location: 'folder-root', kind: 'parent', valid: false },
  { name: 'child', location: 'folder-child', kind: 'folder', valid: true },
];

interface Call {
  member: string;
  args: unknown[];
}

interface Recorder {
  host: ShellHost;
  calls: Call[];
  count(member: string): number;
  refocus: { registered: number; released: number; fire(): void };
}

/** Every member present, each pushing { member, args }. Listings resolve to the synthetic data above. */
function recordingHost(overrides: Partial<ShellHost> = {}): Recorder {
  const calls: Call[] = [];
  const refocus = { registered: 0, released: 0, listener: null as null | (() => void), fire: (): void => refocus.listener?.() };
  const host: ShellHost = {
    copyText: (text) => {
      calls.push({ member: 'copyText', args: [text] });
      return Promise.resolve('copied');
    },
    openExternalLink: (href) => void calls.push({ member: 'openExternalLink', args: [href] }),
    listRecentProjects: () => {
      calls.push({ member: 'listRecentProjects', args: [] });
      return Promise.resolve(ENTRIES);
    },
    openProject: (target) => void calls.push({ member: 'openProject', args: [target] }),
    listFolders: (location) => {
      calls.push({ member: 'listFolders', args: [location] });
      return Promise.resolve({ location: location === '' ? 'folder-root' : location, folders: FOLDERS });
    },
    onWindowRefocus: (listener) => {
      calls.push({ member: 'onWindowRefocus', args: [] });
      refocus.registered += 1;
      refocus.listener = listener;
      return () => {
        refocus.released += 1;
      };
    },
    routeChanged: (route) => void calls.push({ member: 'routeChanged', args: [route] }),
    ...overrides,
  };
  return { host, calls, count: (member) => calls.filter((call) => call.member === member).length, refocus };
}

const boom = (): never => {
  throw new Error('host failure');
};
const rejects = (): Promise<never> => Promise.reject(new Error('host failure'));

describe('the host wrappers (FR-012, NFR-007)', () => {

  it('copyText: absent, throwing and rejecting hosts are manual; an answer is kept', async () => {
    expect(await safeCopyText({}, 'x')).toBe('manual');
    expect(await safeCopyText({ copyText: boom }, 'x')).toBe('manual');
    expect(await safeCopyText({ copyText: rejects }, 'x')).toBe('manual');
    expect(await safeCopyText({ copyText: () => Promise.resolve('copied') }, 'x')).toBe('copied');
    expect(await safeCopyText({ copyText: () => Promise.resolve('manual') }, 'x')).toBe('manual');
  });

  it('listRecentProjects: absent, throwing and rejecting hosts are { ok: false }', async () => {
    expect(await safeListRecentProjects({})).toEqual({ ok: false });
    expect(await safeListRecentProjects({ listRecentProjects: boom })).toEqual({ ok: false });
    expect(await safeListRecentProjects({ listRecentProjects: rejects })).toEqual({ ok: false });
    expect(await safeListRecentProjects({ listRecentProjects: () => Promise.resolve(ENTRIES) })).toEqual({ ok: true, entries: ENTRIES });
  });

  it('listFolders: absent, throwing and rejecting hosts are { ok: false }', async () => {
    expect(await safeListFolders({}, 'l')).toEqual({ ok: false });
    expect(await safeListFolders({ listFolders: boom }, 'l')).toEqual({ ok: false });
    expect(await safeListFolders({ listFolders: rejects }, 'l')).toEqual({ ok: false });
    expect(await safeListFolders({ listFolders: () => Promise.resolve({ location: 'l2', folders: FOLDERS }) }, 'l')).toEqual({
      ok: true,
      location: 'l2',
      folders: FOLDERS,
    });
  });

  it('openExternalLink, openProject and routeChanged: absent, throwing and rejecting hosts do nothing', async () => {
    const seen: unknown[] = [];
    const asyncReject = (() => Promise.reject(new Error('host failure'))) as unknown as () => void;
    for (const host of [{}, { openExternalLink: boom, openProject: boom, routeChanged: boom }]) {
      expect(safeOpenExternalLink(host, 'https://example.test')).toBeUndefined();
      expect(safeOpenProject(host, { key: 'k' })).toBeUndefined();
      expect(safeRouteChanged(host, '/missions')).toBeUndefined();
    }
    // A member that returns a rejecting promise must not become an unhandled rejection.
    safeOpenExternalLink({ openExternalLink: asyncReject }, 'https://example.test');
    safeOpenProject({ openProject: asyncReject }, { key: 'k' });
    safeRouteChanged({ routeChanged: asyncReject }, '/missions');
    await flushMicrotasks();
    safeOpenExternalLink({ openExternalLink: (href) => void seen.push(href) }, 'https://example.test');
    safeOpenProject({ openProject: (target) => void seen.push(target) }, { location: 'l' });
    safeRouteChanged({ routeChanged: (route) => void seen.push(route) }, '/ops');
    expect(seen).toEqual(['https://example.test', { location: 'l' }, '/ops']);
  });

  it('onWindowRefocus: absent or throwing is a no-op unsubscribe; a throwing unsubscribe is nothing', () => {
    expect(safeOnWindowRefocus({}, () => undefined)()).toBeUndefined();
    expect(safeOnWindowRefocus({ onWindowRefocus: boom }, () => undefined)()).toBeUndefined();
    expect(safeOnWindowRefocus({ onWindowRefocus: () => boom }, () => undefined)()).toBeUndefined();
    let released = 0;
    safeOnWindowRefocus({ onWindowRefocus: () => () => void (released += 1) }, () => undefined)();
    expect(released).toBe(1);
  });

  it('does not swallow a shell error: the listener handed to the host is not wrapped', () => {
    let registered: (() => void) | null = null;
    safeOnWindowRefocus(
      { onWindowRefocus: (listener) => ((registered = listener), () => undefined) },
      () => {
        throw new Error('shell bug');
      },
    );
    expect(() => registered?.()).toThrow('shell bug');
  });
});

// ---- controller rigs ----
interface Rig {
  fake: FakeScheduler;
  client: RecordingClient;
  controller: ShellController;
}

function rig(options: Partial<ShellControllerOptions> & { mode: 'desktop' | 'dashboard' }, client: MissionStatusClient | null | 'fixture' = 'fixture'): Rig {
  const fake = createFakeScheduler();
  const recording = recordingClient(createFixtureClient({ scheduler: fake }));
  const controller = createShellController({ scheduler: fake, client: client === 'fixture' ? recording : client, ...options });
  return { fake, client: recording, controller };
}

const settle = async (fake: FakeScheduler): Promise<void> => {
  await fake.advance(2000);
  await flushMicrotasks();
};

describe('host fallbacks through the controller', () => {
  it.each([
    ['a recording host', true],
    ['an empty host', false],
  ])('copy, link, picker and dialog with %s', async (_name, present) => {
    const rec = recordingHost();
    const host: ShellHost = present ? rec.host : {};
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host }, null);
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject(present ? { screen: 'projects', status: 'ready', entries: ENTRIES } : { screen: 'projects', status: 'error', entries: [] });

    await controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject(
      present
        ? { dialog: { open: true, status: 'ready', location: 'folder-root', folders: FOLDERS } }
        : { dialog: { open: true, status: 'error' } },
    );

    await controller.intent('sk-artifact-screen', 'sk-open-link', { href: 'https://example.test/x' });
    expect(rec.count('openExternalLink')).toBe(present ? 1 : 0);

    await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 'spec-kitty status' });
    await settle(fake);
    expect(controller.snapshot().copyResult).toBe(present ? 'copied' : 'manual');
    controller.destroy();
  });

  it('turns throwing and rejecting host members into the fallbacks without an uncaught error', async () => {
    const host: ShellHost = {
      copyText: rejects,
      openExternalLink: boom,
      listRecentProjects: rejects,
      listFolders: boom,
      openProject: boom,
      onWindowRefocus: boom,
      routeChanged: boom,
    };
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host }, null);
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ status: 'error' });
    await controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    await controller.intent('sk-projects-screen', 'sk-open-project', { key: 'k' });
    await controller.intent('sk-open-project-dialog', 'sk-confirm-open-project', { location: 'l' });
    await controller.intent('sk-artifact-screen', 'sk-open-link', { href: 'https://example.test' });
    await controller.intent('sk-drift-screen', 'sk-copy-command', { text: 't' });
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ dialog: { status: 'error' } });
    expect(controller.snapshot().copyResult).toBe('manual');
    controller.navigate({ screen: 'ops' });
    controller.destroy();
  });

  it('does not swallow a shell error that follows a host answer', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/missions', host: rec.host });
    await settle(fake);
    controller.subscribe((snapshot) => {
      if (snapshot.copyResult === 'copied') throw new Error('shell bug');
    });
    await expect(controller.intent('sk-drift-screen', 'sk-copy-command', { text: 't' })).rejects.toThrow('shell bug');
    controller.destroy();
  });
});

const SIX = [
  ['sk-projects-screen', 'sk-open-project', { key: 'project-a' }, 'openProject'],
  ['sk-projects-screen', 'sk-request-open-project', {}, 'listFolders'],
  ['sk-projects-screen', 'sk-retry-load', { target: 'projects' }, 'listRecentProjects'],
  ['sk-open-project-dialog', 'sk-browse-folder', { location: 'folder-child' }, 'listFolders'],
  ['sk-open-project-dialog', 'sk-confirm-open-project', { location: 'folder-child' }, 'openProject'],
  ['sk-open-project-dialog', 'sk-retry-load', { target: 'folders' }, 'listFolders'],
] as const;

describe('the dashboard guard (FR-015)', () => {
  it.each(SIX)('%s %s: one host call on the desktop, none on the dashboard', async (tag, event, detail, member) => {
    const desktopHost = recordingHost();
    const desktop = rig({ mode: 'desktop', route: '/projects', host: desktopHost.host }, null);
    await settle(desktop.fake);
    const before = desktopHost.calls.length;
    await desktop.controller.intent(tag, event, detail);
    await settle(desktop.fake);
    expect(desktopHost.calls.slice(before).map((call) => call.member)).toEqual([member]); // positive control
    desktop.controller.destroy();

    const dashboardHost = recordingHost();
    const dashboard = rig({ mode: 'dashboard', route: '/missions', host: dashboardHost.host });
    await settle(dashboard.fake);
    const calls = dashboardHost.calls.length;
    const snapshot = dashboard.controller.snapshot();
    let emitted = 0;
    const off = dashboard.controller.subscribe(() => (emitted += 1));
    await expect(dashboard.controller.intent(tag, event, detail)).resolves.toBeUndefined();
    await settle(dashboard.fake);
    off();
    expect(dashboardHost.calls.length).toBe(calls);
    expect(dashboard.controller.snapshot()).toEqual(snapshot);
    expect(emitted).toBe(1); // only the subscribe-time call: no snapshot was emitted
    dashboard.controller.destroy();
  });

  it('keys the guard on (tag, event): the Ops retry still reads on the dashboard', async () => {
    const { controller, fake, client } = rig({ mode: 'dashboard', route: '/ops', host: recordingHost().host });
    await settle(fake);
    client.take();
    await controller.intent('sk-ops-screen', 'sk-retry-load', { target: 'ops-page' });
    await settle(fake);
    expect(client.take()).toContain('listOpsInvocations {}');
    controller.destroy();
  });

  it('a dashboard with a null client is the "No project is open." error: no reads, no host call, then recovers', async () => {
    const rec = recordingHost();
    const fake = createFakeScheduler();
    const controller = createShellController({ client: null, mode: 'dashboard', scheduler: fake, host: rec.host });
    await settle(fake);
    expect(controller.snapshot()).toMatchObject({ layout: 'project', chrome: { status: 'error', errorMessage: SHELL_COPY.noProjectOpen } });
    await controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    expect(rec.calls.map((call) => call.member)).toEqual(['onWindowRefocus']); // the refocus registration only

    const client = recordingClient(createFixtureClient({ scheduler: fake }));
    controller.setClient(client);
    await settle(fake);
    expect(client.reads.length).toBeGreaterThan(0);
    expect(controller.snapshot().chrome.status).not.toBe('error');
    controller.destroy();
  });
});

const COMMANDS: [string, (c: ShellController) => unknown, string][] = [
  ['openProject', (c) => c.openProject('project-a'), 'openProject'],
  ['requestOpenProject', (c) => c.requestOpenProject(), 'listFolders'],
  ['browseFolder', (c) => c.browseFolder('folder-child'), 'listFolders'],
  ['confirmOpenProject', (c) => c.confirmOpenProject('folder-child'), 'openProject'],
  ['retryFolders', (c) => c.retryFolders(), 'listFolders'],
  ['retryProjects', (c) => c.retryProjects(), 'listRecentProjects'],
];

describe('the picker commands guard themselves (FR-015)', () => {
  it.each(COMMANDS)('%s: one host call on the desktop, none on the dashboard', async (_name, call, member) => {
    const desktopHost = recordingHost();
    const desktop = rig({ mode: 'desktop', route: '/projects', host: desktopHost.host }, null);
    await settle(desktop.fake);
    const before = desktopHost.calls.length;
    await call(desktop.controller);
    await settle(desktop.fake);
    expect(desktopHost.calls.slice(before).map((c) => c.member)).toEqual([member]); // positive control
    desktop.controller.destroy();

    const dashboardHost = recordingHost();
    const dashboard = rig({ mode: 'dashboard', route: '/missions', host: dashboardHost.host });
    await settle(dashboard.fake);
    const calls = dashboardHost.calls.length;
    const snapshot = dashboard.controller.snapshot();
    let emitted = 0;
    const off = dashboard.controller.subscribe(() => (emitted += 1));
    await call(dashboard.controller);
    await settle(dashboard.fake);
    off();
    expect(dashboardHost.calls.length).toBe(calls);
    expect(dashboard.controller.snapshot()).toEqual(snapshot);
    expect(emitted).toBe(1);
    dashboard.controller.destroy();
  });

  it('never shows the picker on the dashboard: navigate to projects is Missions', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'dashboard', route: '/ops', host: rec.host });
    await settle(fake);
    controller.navigate({ screen: 'projects' });
    await settle(fake);
    expect(controller.snapshot()).toMatchObject({ layout: 'project', destination: { screen: 'missions' } });
    expect(rec.calls.filter((c) => c.member === 'routeChanged').map((c) => c.args[0])).toEqual(['/missions']);
    expect(rec.count('listRecentProjects')).toBe(0);
    controller.destroy();
  });

  it('calls no host member after destroy, setRoute included', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/missions', host: rec.host });
    await settle(fake);
    controller.destroy();
    const calls = rec.calls.length;
    controller.setRoute('/nonsense');
    controller.navigate({ screen: 'ops' });
    controller.refresh();
    await settle(fake);
    expect(rec.calls.length).toBe(calls);
  });
});

describe('the desktop picker flows (FR-014)', () => {
  it('opens a project by key and by location, and browses with the folder as selected', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host: rec.host }, null);
    await settle(fake);
    await controller.intent('sk-projects-screen', 'sk-open-project', { key: 'project-b' });
    expect(rec.calls.at(-1)).toEqual({ member: 'openProject', args: [{ key: 'project-b' }] });
    await controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    await settle(fake);
    expect(rec.calls.at(-1)).toEqual({ member: 'listFolders', args: [''] });
    await controller.intent('sk-open-project-dialog', 'sk-browse-folder', { location: 'folder-child' });
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ dialog: { open: true, selected: 'folder-child', location: 'folder-child', status: 'ready' } });
    await controller.intent('sk-open-project-dialog', 'sk-confirm-open-project', { location: 'folder-child' });
    expect(rec.calls.at(-1)).toEqual({ member: 'openProject', args: [{ location: 'folder-child' }] });
    await controller.intent('sk-open-project-dialog', 'sk-retry-load', { target: 'folders' });
    expect(rec.calls.at(-1)).toEqual({ member: 'listFolders', args: ['folder-child'] });
    controller.destroy();
  });

  it('shows an empty Projects screen for no entries, and re-lists on retry', async () => {
    let entries: ProjectEntry[] = [];
    const rec = recordingHost({ listRecentProjects: () => Promise.resolve(entries) });
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host: rec.host }, null);
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ status: 'empty', entries: [] });
    entries = ENTRIES;
    await controller.intent('sk-projects-screen', 'sk-retry-load', { target: 'project' });
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready', entries: ENTRIES });
    controller.destroy();
  });

  it('drops a stale folder listing: a slow answer never overwrites a newer one', async () => {
    const pending: ((value: { location: string; folders: FolderEntry[] }) => void)[] = [];
    const rec = recordingHost({ listFolders: () => new Promise((resolve) => void pending.push(resolve)) });
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host: rec.host }, null);
    await settle(fake);
    void controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    void controller.intent('sk-open-project-dialog', 'sk-browse-folder', { location: 'newer' });
    expect(pending).toHaveLength(2);
    pending[1]?.({ location: 'newer', folders: FOLDERS });
    await settle(fake);
    pending[0]?.({ location: 'older', folders: [] });
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ dialog: { location: 'newer', folders: FOLDERS } });
    controller.destroy();
  });

  it('drops a listing that arrives after the shell left the picker', async () => {
    const pending: ((entries: ProjectEntry[]) => void)[] = [];
    const rec = recordingHost({ listRecentProjects: () => new Promise((resolve) => void pending.push(resolve)) });
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host: rec.host }, null);
    expect(pending).toHaveLength(1);
    controller.setRoute('/ops');
    pending[0]?.(ENTRIES); // the first, now stale, answer
    await settle(fake);
    controller.setRoute('/projects'); // enters again: a second listing, still pending
    expect(pending).toHaveLength(2);
    expect(controller.snapshot().screen).toMatchObject({ status: 'loading', entries: [] });
    pending[1]?.([]);
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ status: 'empty', entries: [] });
    controller.destroy();
  });
});

describe('A4: now follows host results', () => {
  it('is set at creation and moves when the project listing and a folder listing are applied', async () => {
    let time = new Date('2026-10-01T10:00:00.000Z');
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/projects', host: rec.host, clock: () => time }, null);
    expect(controller.snapshot().now).toBe('2026-10-01T10:00:00.000Z');
    time = new Date('2026-10-01T10:07:00.000Z');
    await settle(fake);
    expect(controller.snapshot().screen).toMatchObject({ status: 'ready' });
    expect(controller.snapshot().now).toBe('2026-10-01T10:07:00.000Z');
    time = new Date('2026-10-01T10:09:00.000Z');
    void controller.intent('sk-projects-screen', 'sk-request-open-project', {});
    await settle(fake);
    expect(controller.snapshot().now).toBe('2026-10-01T10:09:00.000Z');
    controller.destroy();
  });
});

describe('the refocus subscription (R-11)', () => {
  it('registers once, re-reads on Ops only, releases on setClient and destroy', async () => {
    const rec = recordingHost();
    const { controller, fake, client } = rig({ mode: 'desktop', route: '/ops', host: rec.host });
    await settle(fake);
    expect(rec.refocus.registered).toBe(1);
    client.take();
    rec.refocus.fire();
    await settle(fake);
    expect(client.take()).toEqual(['listOpsInvocations {}']);

    controller.navigate({ screen: 'missions' });
    await settle(fake);
    client.take();
    rec.refocus.fire();
    await settle(fake);
    expect(client.take()).toEqual([]);

    controller.navigate({ screen: 'artifacts', missionId: M });
    await settle(fake);
    client.take();
    rec.refocus.fire();
    await settle(fake);
    expect(client.take().length).toBeGreaterThan(0); // Artifact re-reads its explicit-refresh keys

    controller.setClient(client);
    expect(rec.refocus).toMatchObject({ registered: 2, released: 1 });
    controller.destroy();
    expect(rec.refocus).toMatchObject({ registered: 2, released: 2 });
  });

  it('a host without the member gets no refocus refresh, while one with it does', async () => {
    const withMember = recordingHost();
    const a = rig({ mode: 'desktop', route: '/ops', host: withMember.host });
    await settle(a.fake);
    a.client.take();
    withMember.refocus.fire();
    await settle(a.fake);
    expect(a.client.take()).toEqual(['listOpsInvocations {}']); // positive control
    a.controller.destroy();

    const b = rig({ mode: 'desktop', route: '/ops', host: {} });
    await settle(b.fake);
    b.client.take();
    await settle(b.fake);
    expect(b.client.take()).toEqual([]);
    b.controller.destroy();
  });
});

describe('routeChanged (R-02, R2-11)', () => {
  const route = (path: string): string => `/missions/${M}/artifacts/${path}`;

  it('fires once after a navigation intent, with the state already updated', async () => {
    const seen: unknown[] = [];
    let controller: ShellController | null = null;
    const rec = recordingHost({
      routeChanged: (r) => void seen.push([r, controller?.snapshot().destination]),
    });
    const made = rig({ mode: 'desktop', route: '/missions', host: rec.host });
    controller = made.controller;
    await settle(made.fake);
    expect(seen).toEqual([]);
    await controller.intent('sk-mission-shell', 'sk-navigate', { href: '#/ops' });
    expect(seen).toEqual([['/ops', { screen: 'ops' }]]);
    await controller.intent('sk-missions-screen', 'sk-open-mission', { missionId: M });
    expect(seen.map((entry) => (entry as [string])[0])).toEqual(['/ops', `/missions/${M}`]);
    controller.destroy();
  });

  it('fires once after the Refresh flow on a destination that refreshes', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/ops', host: rec.host });
    await settle(fake);
    controller.refresh();
    expect(rec.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/ops']);
    controller.destroy();
  });

  it('never fires for a canonical host route, and not on repeat', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/missions', host: rec.host });
    controller.setRoute('/ops');
    controller.setRoute('/ops');
    controller.setRoute(route('docs%2Fa.md'));
    controller.setClient(null, '/projects');
    await settle(fake);
    expect(rec.count('routeChanged')).toBe(0);
    controller.destroy();
  });

  it.each([
    ['a non-canonical encoding', route('docs%2fa.md'), route('docs%2Fa.md')],
    ['an unknown route', '/nonsense', '/missions'],
    ['a trailing slash', '/ops/', '/missions'],
  ])('fires once with the canonical form for %s, then not again', async (_name, hostRoute, canonical) => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'desktop', route: '/missions', host: rec.host });
    controller.setRoute(hostRoute);
    expect(rec.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual([canonical]);
    controller.setRoute(canonical); // the host echoes the canonical form back
    await settle(fake);
    expect(rec.count('routeChanged')).toBe(1);
    controller.destroy();
  });

  it('fires for a non-canonical initial route and for setClient(client, route)', async () => {
    const rec = recordingHost();
    const { controller, fake, client } = rig({ mode: 'desktop', route: '/nonsense', host: rec.host });
    await settle(fake);
    expect(rec.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/missions']);
    controller.setClient(client, '/also-nonsense');
    expect(rec.count('routeChanged')).toBe(2);
    controller.destroy();
  });

  it('normalises /projects to /missions on the dashboard, once', async () => {
    const rec = recordingHost();
    const { controller, fake } = rig({ mode: 'dashboard', route: '/ops', host: rec.host });
    controller.setRoute('/projects');
    await settle(fake);
    expect(rec.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/missions']);
    const initial = recordingHost();
    createShellController({ client: null, mode: 'dashboard', route: '/projects', host: initial.host, scheduler: fake }).destroy();
    expect(initial.calls.filter((call) => call.member === 'routeChanged').map((call) => call.args[0])).toEqual(['/missions']);
    controller.destroy();
  });
});
