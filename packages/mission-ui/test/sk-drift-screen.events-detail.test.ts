// EV-3 (`sk-copy-command`) and EV-4 (`sk-open-mission`) from the real controls of the detail: Copy and the Mission link. Each
// control is activated the way a user does (a click on the library button, and Enter and Space on the focused one); the payload is
// asserted with `toEqual`. Revert check for this file: in `resolution-parts.ts` drop `@click=${p.onCopy}` and "EV-3 click" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 800);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
function one<T extends HTMLElement>(screen: SkDriftScreen, selector: string): T {
  const found = root(screen).querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
function listen(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of ['sk-copy-command', 'sk-open-mission', 'sk-select-finding', 'sk-rescan-drift', 'sk-open-missions', 'sk-retry-load'])
    screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectFlags(event: CustomEvent): void {
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
}
function expectOne(events: CustomEvent[], name: string, detail: unknown): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe(name);
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual(detail);
}
const FIRST = reportPopulated.findings[1];
const COMMAND = 'spec-kitty agent status materialize --mission sample-slug-01';

describe('EV-3 sk-copy-command from the Copy button', () => {
  it('EV-3 click: one event with the exact text, Mission id and remedy; the component never writes the clipboard', async () => {
    const screen = await mount();
    const events = listen(screen);
    const writes: string[] = [];
    const original = navigator.clipboard?.writeText?.bind(navigator.clipboard);
    if (navigator.clipboard !== undefined) navigator.clipboard.writeText = (text: string) => (writes.push(text), Promise.resolve());
    try {
      one(screen, '[data-copy]').click();
    } finally {
      if (original !== undefined) navigator.clipboard.writeText = original;
    }
    expectOne(events, 'sk-copy-command', { text: COMMAND, missionId: FIRST?.missionId, remedy: 'materialize_status' });
    expect(writes).toEqual([]);
  });

  it('EV-3 keyboard: Enter and Space on the focused Copy button each emit one event', async () => {
    const screen = await mount();
    const events = listen(screen);
    const copy = one<HTMLElement>(screen, '[data-copy]');
    copy.focus();
    await userEvent.keyboard('{Enter}');
    expect(events).toHaveLength(1);
    await userEvent.keyboard(' ');
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual(['sk-copy-command', 'sk-copy-command']);
    for (const event of events) {
      expectFlags(event);
      expect(event.detail).toEqual({ text: COMMAND, missionId: FIRST?.missionId, remedy: 'materialize_status' });
    }
  });

  it('EV-3 absent: findings with no command draw no Copy button, so no event can come; the finding with a command is the positive control', async () => {
    const cases: Array<[string, Partial<DriftScreenProps>]> = [
      ['no remedy', reportProps('reportPopulated', { select: 0 })],
      ['unknown remedy', reportProps('reportUnknownRemedy', { select: 1 })],
      ['unlisted Mission', reportProps('reportMissionUnlisted', { select: 0 })],
    ];
    for (const [name, props] of cases) {
      const screen = await mount(props);
      expect(root(screen).querySelector('[data-copy]'), name).toBeNull();
    }
    expect(cases).toHaveLength(3);
    const screen = await mount();
    expect(root(screen).querySelector('[data-copy]')).not.toBeNull();
  });
});

describe('EV-4 sk-open-mission from the Mission link in Facts', () => {
  it('EV-4 click: one event with the Mission id and the slug', async () => {
    const screen = await mount();
    const events = listen(screen);
    one(screen, '[data-mission-link]').click();
    expectOne(events, 'sk-open-mission', { missionId: FIRST?.missionId, slug: 'sample-slug-01' });
  });

  it('EV-4 keyboard: Enter and Space on the focused link each emit one event', async () => {
    const screen = await mount();
    const events = listen(screen);
    one<HTMLElement>(screen, '[data-mission-link]').focus();
    await userEvent.keyboard('{Enter}');
    expect(events).toHaveLength(1);
    await userEvent.keyboard(' ');
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.type)).toEqual(['sk-open-mission', 'sk-open-mission']);
    for (const event of events) {
      expectFlags(event);
      expect(event.detail).toEqual({ missionId: FIRST?.missionId, slug: 'sample-slug-01' });
    }
  });

  it('EV-4 absent: a Mission the host does not list has no link and shows its id; a listed Mission has the link (positive control)', async () => {
    const screen = await mount(reportProps('reportMissionUnlisted', { select: 0 }));
    expect(root(screen).querySelector('[data-mission-link]')).toBeNull();
    expect(one(screen, '[data-mission-id]').textContent?.trim()).toBe('01JZCB3H8J9KMNPQRSTVWXYZ01');
    const listed = await mount();
    expect(root(listed).querySelector('[data-mission-link]')).not.toBeNull();
    expect(root(listed).querySelector('[data-mission-id]')).toBeNull();
  });

  it('activating either control never selects a finding, rescans or retries (no other event)', async () => {
    const screen = await mount();
    const events = listen(screen);
    one(screen, '[data-copy]').click();
    one(screen, '[data-mission-link]').click();
    expect(events.map((event) => event.type)).toEqual(['sk-copy-command', 'sk-open-mission']);
  });
});

// TESTS-004: the tests above run at the two-pane tier (the stories' tier), not at the 414 px default, which is the shell's mobile tier.
describe('the tier of this file', () => {
  it('mounts at the two-pane tier: the list and the detail sit side by side (positive control: at 414 px they stack)', async () => {
    const screen = await mount({});
    const layout = root(screen).querySelector('[data-layout]') as HTMLElement;
    expect(window.innerWidth).toBe(1280);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(2);
    await page.viewport(414, 800);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(1);
  });
});
