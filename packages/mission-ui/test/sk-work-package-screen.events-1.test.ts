// EV-1 (IC-06, T045): activating a dependency-chain node emits `sk-select-work-package` exactly once with the DEPENDENCY's
// id. Real pointer and keyboard input on the real nodes; every no-event case carries its positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-13'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

const nodesOf = (screen: SkWorkPackageScreen): HTMLElement[] => [
  ...(screen.shadowRoot?.querySelectorAll<HTMLElement>('[data-region="dependency-chain"] sk-button') ?? []),
];

/** Every event of the screen's surface, seen on the wrapper around it. */
function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

function expectOne(events: CustomEvent[], wpId: string): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-select-work-package');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, wpId });
}

describe('EV-1: dependency-chain node activation', () => {
  const dependencyIds = DETAIL_FIXTURES.detailDepsBlocked.dependencies.map((d) => d.wpId);

  it('a pointer click on each node emits once with that dependency id (not the Work Package id)', async () => {
    const screen = await mount();
    const nodes = nodesOf(screen);
    expect(dependencyIds).toHaveLength(2);
    expect(nodes).toHaveLength(2);
    const events = listenAll(screen);
    let visited = 0;
    for (const [index, node] of nodes.entries()) {
      events.length = 0;
      await userEvent.click(node);
      expectOne(events, dependencyIds[index] ?? '?');
      expect(events[0]?.detail.wpId).not.toBe(pairingProps('WP-13').workPackage?.wpId);
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('Enter and Space on a focused node each emit once with that dependency id', async () => {
    const screen = await mount();
    const nodes = nodesOf(screen);
    expect(nodes).toHaveLength(2);
    const events = listenAll(screen);
    let visited = 0;
    for (const key of ['{Enter}', ' ']) {
      for (const [index, node] of nodes.entries()) {
        events.length = 0;
        node.focus();
        expect(screen.shadowRoot?.activeElement).toBe(node);
        await userEvent.keyboard(key);
        expectOne(events, dependencyIds[index] ?? '?');
        visited += 1;
      }
    }
    expect(visited).toBe(4);
  });

  it('hovering a node emits nothing, and the same listener hears the click that follows (positive control)', async () => {
    const screen = await mount();
    const [first] = nodesOf(screen);
    const events = listenAll(screen);
    await userEvent.hover(first as HTMLElement);
    expect(events).toHaveLength(0);
    await userEvent.click(first as HTMLElement);
    expectOne(events, dependencyIds[0] ?? '?');
  });

  it('is inert with no Mission: a click on a disabled node emits nothing; the same listener hears it once the Mission is set', async () => {
    const screen = await mount({ mission: null });
    const events = listenAll(screen);
    const nodes = nodesOf(screen);
    expect(nodes).toHaveLength(2);
    expect(nodes.every((node) => node.hasAttribute('disabled'))).toBe(true);
    nodes.forEach((node) => node.click());
    expect(events).toHaveLength(0);

    screen.mission = sampleMission;
    await screen.updateComplete;
    expect(nodesOf(screen).some((node) => node.hasAttribute('disabled'))).toBe(false);
    events.length = 0;
    (nodesOf(screen)[0] as HTMLElement).click();
    expectOne(events, dependencyIds[0] ?? '?');
  });

  it('emits no other sk-* event while a node is activated', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    await userEvent.click(nodesOf(screen)[1] as HTMLElement);
    expect(events.map((event) => event.type)).toEqual(['sk-select-work-package']);
  });
});
