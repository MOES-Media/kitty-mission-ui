// EV-4 (WP05): the Mission crumb of the ready header emits `sk-open-mission` once with the Mission id and slug. Driven through
// the real screen: the crumb is WP04's renderer, drawn by `renderHeader`, wired to the screen's own dispatch method.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps> = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

function crumbOf(screen: SkWorkPackageScreen): HTMLElement {
  const crumb = screen.shadowRoot?.querySelector<HTMLElement>('[data-region="header"] nav li > sk-button');
  if (crumb === null || crumb === undefined) throw new Error('no crumb');
  return crumb;
}

/** Every event of the screen's surface, collected on a wrapper around it, plus every sk-* event the wrapper sees. */
function listenAll(screen: SkWorkPackageScreen): { events: CustomEvent[]; names: string[] } {
  const events: CustomEvent[] = [];
  const names: string[] = [];
  const wrapper = screen.parentElement as HTMLElement;
  for (const name of EVENT_NAMES) wrapper.addEventListener(name, (event) => events.push(event as CustomEvent));
  const all = ['sk-open-mission', 'sk-select-work-package', 'sk-open-artifact', 'sk-retry-load', 'sk-click', 'sk-activate', 'sk-press'];
  for (const name of all) wrapper.addEventListener(name, () => names.push(name));
  return { events, names };
}

function expectOne(events: CustomEvent[]): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-open-mission');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, slug: sampleMission.slug });
}

describe('EV-4: the Mission crumb emits sk-open-mission', () => {
  it('a click emits exactly one event with the Mission id and slug, and nothing else', async () => {
    const screen = await mount();
    const { events, names } = listenAll(screen);
    // positive control for the listeners' reach: an unrelated click inside the header emits nothing
    await userEvent.click(screen.shadowRoot?.querySelector('[data-region="header"] h1') as HTMLElement);
    expect(events).toHaveLength(0);
    await userEvent.click(crumbOf(screen));
    expectOne(events);
    expect(names).toEqual(['sk-open-mission']);
  });

  it('the control is the library sk-button, ghost variant, inside the crumb list item (not an anchor, not a raw button)', async () => {
    const screen = await mount();
    const crumb = crumbOf(screen);
    expect(crumb.tagName).toBe('SK-BUTTON');
    expect(crumb.getAttribute('variant')).toBe('ghost');
    expect(crumb.parentElement?.tagName).toBe('LI');
    expect(crumb.parentElement?.classList.contains('sk-breadcrumbs__item')).toBe(true);
    expect(screen.shadowRoot?.querySelectorAll('[data-region="header"] a, [data-region="header"] button')).toHaveLength(0);
  });

  it('Enter and Space on the focused control each emit once; another key emits nothing (positive control in the same test)', async () => {
    const screen = await mount();
    const { events } = listenAll(screen);
    crumbOf(screen).focus();
    await userEvent.keyboard('{Tab}');
    expect(events).toHaveLength(0);
    crumbOf(screen).focus();
    await userEvent.keyboard('{Escape}');
    expect(events).toHaveLength(0);
    crumbOf(screen).focus();
    await userEvent.keyboard('{Enter}');
    expectOne(events);
    events.length = 0;
    crumbOf(screen).focus();
    await userEvent.keyboard(' ');
    expectOne(events);
  });

  it('with no Mission the crumb is inert and emits nothing; the same listener hears it once a Mission is set', async () => {
    const screen = await mount({ mission: null });
    const { events } = listenAll(screen);
    const inert = crumbOf(screen);
    expect(inert.hasAttribute('disabled')).toBe(true);
    inert.click();
    inert.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(events).toHaveLength(0);
    screen.mission = sampleMission;
    await screen.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(crumbOf(screen).hasAttribute('disabled')).toBe(false);
    await userEvent.click(crumbOf(screen));
    expectOne(events);
  });
});
