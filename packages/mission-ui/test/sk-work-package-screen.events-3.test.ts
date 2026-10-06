// EV-3 (IC-07, T050): "Return to Pipeline" emits `sk-open-mission` exactly once with `{ missionId, slug }`, the same event as
// the crumb; the screen never emits an `sk-open-pipeline`. Real clicks and keys; every no-event case has its positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { sampleMission, stateProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { RETURN_TO_PIPELINE_LABEL } from '../src/defaults/index.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load', 'sk-open-pipeline'];

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps>): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const buttonNamed = (screen: SkWorkPackageScreen, name: string): HTMLElement => {
  const found = [...(screen.shadowRoot?.querySelectorAll<HTMLElement>('sk-button') ?? [])].find((b) => (b.textContent ?? '').trim() === name);
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
};
function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectOpen(events: CustomEvent[]): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-open-mission');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, slug: sampleMission.slug });
}

describe('EV-3: Return to Pipeline', () => {
  it('emits sk-open-mission once with the Mission id and slug (pointer)', async () => {
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    await userEvent.click(buttonNamed(screen, RETURN_TO_PIPELINE_LABEL));
    expectOpen(events);
  });

  it('Enter and Space on the focused control each emit once', async () => {
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    const control = buttonNamed(screen, RETURN_TO_PIPELINE_LABEL);
    let visited = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      control.focus();
      expect(screen.shadowRoot?.activeElement).toBe(control);
      await userEvent.keyboard(key);
      expectOpen(events);
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('is the same event as the crumb: the crumb emits the identical type and payload, and no sk-open-pipeline is ever seen', async () => {
    const screen = await mount(stateProps.notFound());
    const events = listenAll(screen);
    await userEvent.click(buttonNamed(screen, sampleMission.name));
    expectOpen(events);
    events.length = 0;
    await userEvent.click(buttonNamed(screen, RETURN_TO_PIPELINE_LABEL));
    expectOpen(events);
    const unnamed = await mount(stateProps.notFound());
    const more = listenAll(unnamed);
    await userEvent.click(buttonNamed(unnamed, RETURN_TO_PIPELINE_LABEL));
    expect(more.map((e) => e.type)).toEqual(['sk-open-mission']);
  });

  it('draws no Return control in any other state (DOM absence), paired with the not-found state that draws one', async () => {
    expect(buttonNamed(await mount(stateProps.notFound()), RETURN_TO_PIPELINE_LABEL)).not.toBeNull();
    let ran = 0;
    for (const props of [stateProps.loading(), stateProps.error(), stateProps.empty(), stateProps.nothingSelected()]) {
      const screen = await mount(props);
      expect(screen.shadowRoot?.textContent, props.status).not.toContain(RETURN_TO_PIPELINE_LABEL);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('is inert with no Mission: disabled, emits nothing, and the same listener hears it once a Mission is set', async () => {
    const screen = await mount({ ...stateProps.notFound(), mission: null });
    const events = listenAll(screen);
    const control = buttonNamed(screen, RETURN_TO_PIPELINE_LABEL);
    expect(control.hasAttribute('disabled')).toBe(true);
    control.click();
    expect(events).toHaveLength(0);
    screen.mission = sampleMission;
    await screen.updateComplete;
    await userEvent.click(buttonNamed(screen, RETURN_TO_PIPELINE_LABEL));
    expectOpen(events);
  });
});
