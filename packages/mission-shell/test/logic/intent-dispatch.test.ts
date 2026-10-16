import { describe, expect, it } from 'vitest';
import { createFixtureClient } from '../../src/client/fixture';
import { createShellController } from '../../src/controller/shell-controller';
import type { ShellHost } from '../../src/core/host';
import { createFakeScheduler, flushMicrotasks } from '../support/fake-scheduler';

const INHERITED = ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'isPrototypeOf', 'call', 'name'];
const PROBES: readonly (readonly [string, string])[] = [
  ['constructor', 'call'],
  ['constructor', 'name'],
  ['__proto__', 'hasOwnProperty'],
  ['toString', 'call'],
  ['sk-mission-shell', 'constructor'],
  ...INHERITED.flatMap((n) => [[n, 'sk-navigate'], ['sk-mission-shell', n], [n, n]] as const),
  // A nested tag whose event is inherited: its entry, and so any `via` target, must not be found.
  ['sk-shell-tree', 'constructor'],
  ['sk-shell-tree', '__proto__'],
];

function rig() {
  const calls: string[] = [];
  const record = (name: string) => (): undefined => void calls.push(name);
  const host: ShellHost = {
    openExternalLink: record('openExternalLink'),
    openProject: record('openProject'),
    routeChanged: record('routeChanged'),
    copyText: () => (calls.push('copyText'), Promise.resolve('copied' as never)),
    listFolders: () => (calls.push('listFolders'), Promise.resolve({ location: '', folders: [] }) as never),
    listRecentProjects: () => (calls.push('listRecentProjects'), Promise.resolve([]) as never),
  } as unknown as ShellHost;
  const fake = createFakeScheduler();
  const controller = createShellController({ client: createFixtureClient({ scheduler: fake }), mode: 'desktop', route: '/missions', scheduler: fake, host });
  return { controller, calls };
}

describe('intent dispatch ignores names inherited from Object.prototype', () => {
  it.each(PROBES)('%s / %s does not throw and changes nothing', async (tag, event) => {
    const { controller, calls } = rig();
    await flushMicrotasks();
    const before = JSON.stringify(controller.snapshot());
    const callsBefore = calls.length;
    await expect(Promise.resolve().then(() => controller.intent(tag, event, { href: '#/ops', open: true }))).resolves.toBeUndefined();
    await flushMicrotasks();
    expect(calls.length).toBe(callsBefore);
    expect(JSON.stringify(controller.snapshot())).toBe(before);
  });

  it('positive control: a real pair dispatches exactly once', async () => {
    const { controller, calls } = rig();
    await flushMicrotasks();
    const before = calls.length;
    await controller.intent('sk-artifact-screen', 'sk-open-link', { href: 'https://example.test/x' });
    expect(calls.slice(before)).toEqual(['openExternalLink']);
    await controller.intent('sk-mission-shell', 'sk-navigate', { href: '#/ops' });
    expect(controller.snapshot().destination).toEqual({ screen: 'ops' });
  });
});
