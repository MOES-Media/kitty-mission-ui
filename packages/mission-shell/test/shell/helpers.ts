// Shared helpers of the mounted shell tests (Chromium). Mount through the public mountShell, settle through the fake
// scheduler and Svelte's tick, and look through shadow roots for the real elements.
import { tick } from 'svelte';
import { page } from 'vitest/browser';
import { createFixtureClient } from '../../src/client/fixture';
import type { MissionStatusClient } from '../../src/client/port';
import type { ShellHost } from '../../src/core/host';
import { mountShell, type MountedShell } from '../../src/ui/mount';
import type { ShellOptions } from '../../src/ui/options';
import { createFakeScheduler, flushMicrotasks, type FakeScheduler } from '../support/fake-scheduler';

/** The Mission of the fixture examples. */
export const M = '01JZAB3C4D5E6F7G8H9JKMNPQR';

export interface Harness {
  readonly target: HTMLElement;
  readonly mounted: MountedShell;
  readonly scheduler: FakeScheduler;
  readonly shell: HTMLElement;
  destroy(): void;
}

export interface MountOptions extends Partial<Omit<ShellOptions, 'scheduler'>> {
  scheduler?: FakeScheduler;
  /** The viewport the shell is mounted in; the expanded tier (1280 by 800) by default. */
  viewport?: readonly [number, number];
}

const live = new Set<Harness>();

/** One fake scheduler is shared by the shell and the fixture client. */
export function fixtureClient(scheduler: FakeScheduler, options: Parameters<typeof createFixtureClient>[0] = {}): MissionStatusClient {
  return createFixtureClient({ scheduler, ...options });
}

export async function mountAt(route: string | undefined, options: MountOptions = {}): Promise<Harness> {
  const scheduler = options.scheduler ?? createFakeScheduler();
  await page.viewport(...(options.viewport ?? [1280, 800]));
  const target = document.createElement('div');
  document.body.append(target);
  const { scheduler: _scheduler, viewport: _viewport, ...rest } = options;
  void _scheduler;
  void _viewport;
  const shellOptions: ShellOptions = {
    client: 'client' in rest ? (rest.client ?? null) : fixtureClient(scheduler),
    mode: rest.mode ?? 'desktop',
    ...(route === undefined ? {} : { route }),
    scheduler,
    ...(rest.host === undefined ? {} : { host: rest.host }),
    ...(rest.copy === undefined ? {} : { copy: rest.copy }),
    ...(rest.clock === undefined ? {} : { clock: rest.clock }),
  };
  const mounted = mountShell(target, shellOptions);
  const shell = target.querySelector('sk-mission-shell');
  if (shell === null) throw new Error('mountShell rendered no sk-mission-shell');
  const harness: Harness = {
    target,
    mounted,
    scheduler,
    shell,
    destroy() {
      mounted.destroy();
      target.remove();
      live.delete(harness);
    },
  };
  live.add(harness);
  await settle(harness);
  return harness;
}

export function destroyAll(): void {
  for (const harness of [...live]) harness.destroy();
}

/** Lets the fake scheduler's microtasks, Svelte's flush and the Lit updates of the shell and its screen all finish. */
export async function settle(harness: Harness, advanceMs = 0): Promise<void> {
  for (let round = 0; round < 3; round += 1) {
    await harness.scheduler.advance(advanceMs);
    await flushMicrotasks();
    await tick();
    for (const element of deepQueryAll(harness.target, '*')) {
      const updating = (element as { updateComplete?: Promise<unknown> }).updateComplete;
      if (updating !== undefined) await updating;
    }
    advanceMs = 0;
  }
}

/** Every element matching the selector under the root, crossing shadow roots. */
export function deepQueryAll(root: ParentNode, selector: string): Element[] {
  const found: Element[] = [...root.querySelectorAll(selector)];
  for (const element of root.querySelectorAll('*')) {
    if (element.shadowRoot !== null) found.push(...deepQueryAll(element.shadowRoot, selector));
  }
  return found;
}

/** The tag of the screen the shell hosts: its first direct child that is a `-screen` element. */
export function screenTag(shell: Element): string | null {
  return [...shell.children].find((child) => child.localName.endsWith('-screen'))?.localName ?? null;
}

export function screenElement<T extends HTMLElement>(shell: Element, tag: string): T {
  const found = [...shell.children].find((child) => child.localName === tag);
  if (found === undefined) throw new Error(`no ${tag} in the shell`);
  return found as T;
}

/** A host that records every member call. */
export interface RecordingHost extends ShellHost {
  readonly calls: { member: string; args: unknown[] }[];
  count(member: string): number;
  refocus(): void;
}

export function recordingHost(overrides: Partial<ShellHost> = {}): RecordingHost {
  const calls: { member: string; args: unknown[] }[] = [];
  const listeners = new Set<() => void>();
  const note = (member: string, args: unknown[]): void => {
    calls.push({ member, args });
  };
  const host: RecordingHost = {
    calls,
    count: (member) => calls.filter((call) => call.member === member).length,
    refocus() {
      for (const listener of [...listeners]) listener();
    },
    routeChanged(route) {
      note('routeChanged', [route]);
    },
    openProject(target) {
      note('openProject', [target]);
    },
    openExternalLink(href) {
      note('openExternalLink', [href]);
    },
    copyText(text) {
      note('copyText', [text]);
      return Promise.resolve('copied');
    },
    listRecentProjects() {
      note('listRecentProjects', []);
      return Promise.resolve([{ key: 'sample-project', location: 'Sample location', name: 'Sample Project' }]);
    },
    listFolders(location) {
      note('listFolders', [location]);
      return Promise.resolve({ location, folders: [] });
    },
    onWindowRefocus(listener) {
      note('onWindowRefocus', []);
      listeners.add(listener);
      return () => {
        note('onWindowRefocus.release', []);
        listeners.delete(listener);
      };
    },
    ...overrides,
  };
  return host;
}
