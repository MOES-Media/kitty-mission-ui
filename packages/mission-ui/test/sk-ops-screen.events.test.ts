// The events of the Ops screen's paging controls (WP06): EV-1 and EV-2 (sk-load-more), EV-4 and EV-5 (sk-retry-load from a
// load-more error and from a refused cursor). The controls are clicked in the shadow tree; every no-event case carries a
// positive control (the same listener receives an event when a sibling action that does emit is performed). EV-3 (the
// first-page error retry) belongs to the state parts and is proven there.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { CURSOR_REFUSAL_CODE } from '../src/defaults/ops-copy.js';
import { OPS_PAGE_FIXTURES, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { PageInfo } from '../src/contract/types.js';

const EVENT_NAMES = ['sk-load-more', 'sk-retry-load'] as const;
const CURSOR = OPS_PAGE_FIXTURES.opsPageFirst.pageInfo.nextPageCursor as string;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

interface Mounted {
  screen: SkOpsScreen;
  events: CustomEvent[];
}

async function mount(props: Partial<OpsScreenProps> = opsProps.ready()): Promise<Mounted> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  const events: CustomEvent[] = [];
  for (const name of EVENT_NAMES) box.addEventListener(name, (event) => events.push(event as CustomEvent));
  box.append(screen);
  await settle(screen);
  return { screen, events };
}

async function update(screen: SkOpsScreen, props: Partial<OpsScreenProps>): Promise<void> {
  Object.assign(screen, props);
  await settle(screen);
}

const control = (screen: SkOpsScreen, selector: string): HTMLElement => {
  const found = screen.shadowRoot?.querySelector<HTMLElement>(selector);
  if (found === null || found === undefined) throw new Error(`no ${selector}`);
  return found;
};

async function press(screen: SkOpsScreen, selector: string): Promise<void> {
  control(screen, selector).click();
  await settle(screen);
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

const moreAfter = (cursor: string): PageInfo => ({ hasNextPage: true, nextPageCursor: cursor, pageSize: 50 });

describe('EV-1: sk-load-more', () => {
  it('emits exactly once with { cursor } on activation', async () => {
    const { screen, events } = await mount();
    await press(screen, '[data-load-more]');
    expectOne(events, 'sk-load-more', { cursor: CURSOR });
    expect(Object.keys((events[0] as CustomEvent).detail as object)).toEqual(['cursor']);
  });

  it('emits nothing on a second activation for the same cursor, and again after loadingMore, items or pageInfo changes', async () => {
    const { screen, events } = await mount();
    await press(screen, '[data-load-more]');
    await press(screen, '[data-load-more]');
    await press(screen, '[data-load-more]');
    expect(events).toHaveLength(1);
    // The host answers by moving loadingMore: the same cursor may be asked for again.
    await update(screen, { loadingMore: true });
    await update(screen, { loadingMore: false });
    await press(screen, '[data-load-more]');
    expect(events).toHaveLength(2);
    // The host replaces the items: asked again.
    await update(screen, { items: [...screen.items] });
    await press(screen, '[data-load-more]');
    expect(events).toHaveLength(3);
    // The host replaces pageInfo with a new cursor: the new cursor is sent.
    await update(screen, { pageInfo: moreAfter('bmV4dC1jdXJzb3I') });
    await press(screen, '[data-load-more]');
    expect(events).toHaveLength(4);
    expect((events[3] as CustomEvent).detail).toEqual({ cursor: 'bmV4dC1jdXJzb3I' });
    expect((events[1] as CustomEvent).detail).toEqual({ cursor: CURSOR });
    expect((events[2] as CustomEvent).detail).toEqual({ cursor: CURSOR });
  });
});

describe('EV-2: no sk-load-more', () => {
  it('emits nothing while loadingMore (positive control: it emits once the host is done)', async () => {
    const { screen, events } = await mount(opsProps.loadingMore());
    await press(screen, '[data-load-more]');
    await press(screen, '[data-load-more]');
    expect(events).toHaveLength(0);
    await update(screen, { loadingMore: false });
    await press(screen, '[data-load-more]');
    expectOne(events, 'sk-load-more', { cursor: CURSOR });
  });

  it('draws no control, so emits nothing, on the last page and with no cursor (positive control: a page with a cursor emits)', async () => {
    const last = await mount(opsProps.lastPage());
    expect(last.screen.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
    const noCursor = await mount({ ...opsProps.ready(), pageInfo: { hasNextPage: true, nextPageCursor: null, pageSize: 50 } });
    expect(noCursor.screen.shadowRoot?.querySelectorAll('[data-load-more]')).toHaveLength(0);
    expect(last.events).toHaveLength(0);
    expect(noCursor.events).toHaveLength(0);
    const control1 = await mount(opsProps.ready());
    await press(control1.screen, '[data-load-more]');
    expectOne(control1.events, 'sk-load-more', { cursor: CURSOR });
  });

  it('emits nothing through the screen handler when the control was removed by a state change after it was drawn', async () => {
    const { screen, events } = await mount();
    const stale = control(screen, '[data-load-more]');
    await update(screen, { pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 } });
    stale.click();
    await settle(screen);
    expect(events).toHaveLength(0);
    await update(screen, { pageInfo: moreAfter(CURSOR) });
    await press(screen, '[data-load-more]');
    expectOne(events, 'sk-load-more', { cursor: CURSOR });
  });
});

describe('EV-4: sk-retry-load after a load-more error', () => {
  it('emits { target, cursor } with the cursor that failed, exactly once', async () => {
    const codes = [null, 'something_else'];
    let ran = 0;
    for (const code of codes) {
      const { screen, events } = await mount(opsProps.loadMoreError(code));
      await press(screen, '[data-retry]');
      expectOne(events, 'sk-retry-load', { target: 'ops-page', cursor: CURSOR });
      expect(Object.keys((events[0] as CustomEvent).detail as object).sort()).toEqual(['cursor', 'target']);
      ran += 1;
    }
    expect(ran).toBe(codes.length);
  });

  it('is inert with no cursor to send: nothing is emitted (positive control: with the cursor it emits)', async () => {
    const inert = await mount({ ...opsProps.loadMoreError(null), pageInfo: { hasNextPage: true, nextPageCursor: null, pageSize: 50 } });
    const retry = control(inert.screen, '[data-retry]');
    expect(retry.hasAttribute('disabled')).toBe(true);
    await press(inert.screen, '[data-retry]');
    expect(inert.events).toHaveLength(0);
    const live = await mount(opsProps.loadMoreError(null));
    await press(live.screen, '[data-retry]');
    expectOne(live.events, 'sk-retry-load', { target: 'ops-page', cursor: CURSOR });
  });
});

describe('EV-5: sk-retry-load after a refused cursor', () => {
  it('emits { target } with NO cursor key, exactly once', async () => {
    const { screen, events } = await mount(opsProps.refusedCursor());
    expect(screen.loadMoreError?.code).toBe(CURSOR_REFUSAL_CODE);
    await press(screen, '[data-retry]');
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
    const detail = (events[0] as CustomEvent).detail as object;
    expect(Object.keys(detail)).toEqual(['target']);
    expect('cursor' in detail).toBe(false);
  });

  it('sends no cursor even when pageInfo holds one (positive control: another code in the same state sends it)', async () => {
    const refused = await mount(opsProps.refusedCursor());
    expect(refused.screen.pageInfo?.nextPageCursor).toBe(CURSOR);
    await press(refused.screen, '[data-retry]');
    expectOne(refused.events, 'sk-retry-load', { target: 'ops-page' });
    const other = await mount(opsProps.loadMoreError('other'));
    await press(other.screen, '[data-retry]');
    expectOne(other.events, 'sk-retry-load', { target: 'ops-page', cursor: CURSOR });
  });
});

describe('the page controls never dispatch from the parts', () => {
  it('a click on Load more reaches the screen once and no other event is emitted', async () => {
    const { screen, events } = await mount();
    await press(screen, '[data-load-more]');
    expect(events.map((event) => event.type)).toEqual(['sk-load-more']);
  });
});
