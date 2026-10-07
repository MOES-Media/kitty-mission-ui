// EV-7 (IC-07, T050): Retry emits `sk-retry-load` exactly once with `{ missionId, wpId, target }`: `work-package` from the
// whole-screen error state, `detail` from a refused detail (error and not-found). Real clicks and real keys on the real
// controls; every no-event case carries its positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { REFUSAL_FIXTURES, pairingProps, refusalProps, sampleMission, stateProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { DETAIL_RETRY_LABEL } from '../src/defaults/index.js';

const EVENT_NAMES = ['sk-select-work-package', 'sk-open-mission', 'sk-open-artifact', 'sk-retry-load'] as const;

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
const retryControl = (screen: SkWorkPackageScreen): HTMLElement => {
  const found = [...(screen.shadowRoot?.querySelectorAll<HTMLElement>('sk-button') ?? [])].find((b) => (b.textContent ?? '').trim() === DETAIL_RETRY_LABEL);
  if (found === undefined) throw new Error('no Retry control');
  return found;
};
function listenAll(screen: SkWorkPackageScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
function expectOne(events: CustomEvent[], wpId: string, target: string): void {
  expect(events).toHaveLength(1);
  const [event] = events as [CustomEvent];
  expect(event.type).toBe('sk-retry-load');
  expect(event.bubbles).toBe(true);
  expect(event.composed).toBe(true);
  expect(event.cancelable).toBe(false);
  expect(event.detail).toEqual({ missionId: sampleMission.missionId, wpId, target });
}

describe('EV-7: sk-retry-load', () => {
  it('the whole-screen error state emits once with target work-package (pointer)', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    const events = listenAll(screen);
    await userEvent.click(retryControl(screen));
    expectOne(events, 'WP04', 'work-package');
  });

  it('Enter and Space on the focused Retry each emit once', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    const events = listenAll(screen);
    const control = retryControl(screen);
    let visited = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      control.focus();
      expect(screen.shadowRoot?.activeElement).toBe(control);
      await userEvent.keyboard(key);
      expectOne(events, 'WP04', 'work-package');
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('a refused detail (error and not-found) emits once with target detail and the Work Package id', async () => {
    let visited = 0;
    for (const name of Object.keys(REFUSAL_FIXTURES) as (keyof typeof REFUSAL_FIXTURES)[]) {
      const props = refusalProps(name);
      const screen = await mount(props);
      const events = listenAll(screen);
      await userEvent.click(retryControl(screen));
      expectOne(events, props.workPackage?.wpId ?? '?', 'detail');
      visited += 1;
    }
    expect(visited).toBe(2);
  });

  it('a loading detail has no Retry; a refused one has exactly one (the paired DOM check)', async () => {
    const loading = await mount({ ...pairingProps('WP-01'), detailStatus: 'loading' });
    expect([...(loading.shadowRoot?.querySelectorAll('sk-button') ?? [])].filter((b) => (b.textContent ?? '').trim() === DETAIL_RETRY_LABEL)).toHaveLength(0);
    const refused = await mount(refusalProps('detailRefusalUnreadable'));
    expect([...(refused.shadowRoot?.querySelectorAll('sk-button') ?? [])].filter((b) => (b.textContent ?? '').trim() === DETAIL_RETRY_LABEL)).toHaveLength(1);
  });

  it('is inert with no Mission: the control is disabled, a click emits nothing, and the same listener hears it once a Mission is set', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04', mission: null });
    const events = listenAll(screen);
    expect(retryControl(screen).hasAttribute('disabled')).toBe(true);
    retryControl(screen).click();
    expect(events).toHaveLength(0);
    screen.mission = sampleMission;
    await screen.updateComplete;
    expect(retryControl(screen).hasAttribute('disabled')).toBe(false);
    await userEvent.click(retryControl(screen));
    expectOne(events, 'WP04', 'work-package');
  });

  it('is inert with no id anywhere: nothing is emitted, and an id restores the emit', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: '', workPackage: null, detail: null });
    const events = listenAll(screen);
    expect(retryControl(screen).hasAttribute('disabled')).toBe(true);
    retryControl(screen).click();
    expect(events).toHaveLength(0);
    screen.wpId = 'WP02';
    await screen.updateComplete;
    await userEvent.click(retryControl(screen));
    expectOne(events, 'WP02', 'work-package');
  });

  it('a click beside the control emits nothing (the listener is live: the control itself then emits)', async () => {
    const screen = await mount({ ...stateProps.error(), wpId: 'WP04' });
    const events = listenAll(screen);
    await userEvent.click(screen.shadowRoot?.querySelector('sk-notice') as HTMLElement);
    expect(events).toHaveLength(0);
    await userEvent.click(retryControl(screen));
    expectOne(events, 'WP04', 'work-package');
  });
});
