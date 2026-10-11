// EV-3 of the Ops screen (WP07, FR-028): the first-page retry emits `sk-retry-load` with `{ target: 'ops-page' }` and nothing else.
// The load-more retries (EV-4, EV-5) are covered in sk-ops-screen.events.test.ts. Every no-event case carries a positive control on
// the same listener and the same target.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<OpsScreenProps>): Promise<{ screen: SkOpsScreen; events: CustomEvent[] }> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  const events: CustomEvent[] = [];
  for (const name of ['sk-retry-load', 'sk-load-more']) box.addEventListener(name, (event) => events.push(event as CustomEvent));
  await settle(screen);
  return { screen, events };
}

const root = (screen: SkOpsScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const retry = (screen: SkOpsScreen): HTMLElement | null => root(screen).querySelector<HTMLElement>('[data-look="error"] [data-retry]');
const click = (el: HTMLElement | null): void => {
  if (el === null) throw new Error('no control');
  el.click();
};

describe('EV-3: sk-retry-load from the error look', () => {
  it('emits exactly once with { target: "ops-page" }, bubbling and composed, not cancelable', async () => {
    const { screen, events } = await mount(opsProps.error('opsRefusalUnreadable'));
    click(retry(screen));
    expect(events).toHaveLength(1);
    const [event] = events as [CustomEvent];
    expect(event.type).toBe('sk-retry-load');
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(event.detail).toEqual({ target: 'ops-page' });
    // toEqual ignores undefined members: the payload has no cursor key at all
    expect(Object.keys(event.detail as object)).toEqual(['target']);
  });

  it('carries no cursor even when the page info still holds one', async () => {
    const props = { ...opsProps.error('opsRefusalUnreadable'), pageInfo: opsProps.ready().pageInfo };
    expect(props.pageInfo?.nextPageCursor).not.toBeNull();
    const { screen, events } = await mount(props);
    click(retry(screen));
    expect(events).toHaveLength(1);
    expect(Object.keys(events[0]?.detail as object)).toEqual(['target']);
  });

  it('emits once per activation, for a click, Enter and Space', async () => {
    const { screen, events } = await mount(opsProps.error('opsRefusalUnreadable'));
    click(retry(screen));
    expect(events).toHaveLength(1);
    const control = retry(screen) as HTMLElement;
    control.focus();
    expect(root(screen).activeElement).toBe(control);
    await userEvent.keyboard('{Enter}');
    expect(events).toHaveLength(2);
    await userEvent.keyboard(' ');
    expect(events).toHaveLength(3);
    for (const event of events) expect(event.detail).toEqual({ target: 'ops-page' });
  });

  it('emits for every refusal code, the unknown and the null one included', async () => {
    let ran = 0;
    for (const code of ['ops_unreadable', 'something_new', null, '']) {
      const { screen, events } = await mount({ ...opsProps.error('opsRefusalUnreadable'), refusalCode: code });
      click(retry(screen));
      expect(events, String(code)).toHaveLength(1);
      expect(events[0]?.detail).toEqual({ target: 'ops-page' });
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('a click on the notice itself emits nothing (positive control: the retry control emits)', async () => {
    const { screen, events } = await mount(opsProps.error('opsRefusalUnreadable'));
    (root(screen).querySelector('[data-look="error"] sk-notice') as HTMLElement).click();
    (root(screen).querySelector('[data-look="error"] h2') as HTMLElement).click();
    expect(events).toHaveLength(0);
    click(retry(screen));
    expect(events).toHaveLength(1);
  });
});

describe('EV-3: no retry outside the error look', () => {
  it('the loading, empty and zero-ready looks draw no retry control, so nothing can be emitted (positive control: error)', async () => {
    const cases: [string, Partial<OpsScreenProps>][] = [
      ['loading', opsProps.loading()],
      ['loading by mismatch', opsProps.mismatchedProfile()],
      ['empty', opsProps.empty()],
      ['empty with skipped', opsProps.emptySkipped()],
      ['zero ready', { ...opsProps.empty(), status: 'ready' }],
    ];
    let ran = 0;
    for (const [name, props] of cases) {
      const { screen, events } = await mount(props);
      expect(root(screen).querySelectorAll('[data-retry]').length, name).toBe(0);
      expect(events, name).toHaveLength(0);
      ran += 1;
    }
    expect(ran).toBe(5);
    const { screen, events } = await mount(opsProps.error('opsRefusalUnreadable'));
    expect(root(screen).querySelectorAll('[data-retry]').length).toBe(1);
    click(retry(screen));
    expect(events).toHaveLength(1);
  });

  it('the screen handler is inert outside the error look (positive control: the same handler in the error look emits)', async () => {
    const { screen, events } = await mount(opsProps.empty());
    (screen as unknown as { retryPage(): void }).retryPage();
    expect(events).toHaveLength(0);
    screen.status = 'error';
    await settle(screen);
    (screen as unknown as { retryPage(): void }).retryPage();
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ target: 'ops-page' });
  });

  it('a load-more error is ignored in the error look: the first-page retry still carries no cursor', async () => {
    const { screen, events } = await mount({ ...opsProps.error('opsRefusalUnreadable'), loadMoreError: { code: null }, pageInfo: opsProps.ready().pageInfo });
    click(retry(screen));
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ target: 'ops-page' });
    expect(Object.keys(events[0]?.detail as object)).toEqual(['target']);
  });
});
