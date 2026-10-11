// The skeleton of the Ops screen (IC-03b): the surface and its defaults, the four looks, the guards of both events, the one
// live region and the focus rule. The parts are stubs in this work package, so the tests call the screen's own handlers
// through a type cast (no test-only hook exists in the shipped code) and, where a stub already draws the control, click it.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_COPY, CURSOR_REFUSAL_CODE } from '../src/defaults/ops-copy.js';
import { OPS_PAGE_FIXTURES, OPS_REFUSAL_FIXTURES, opsPageOf, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { PageInfo } from '../src/contract/types.js';

interface Handlers {
  loadMore(): void;
  retryPage(): void;
}
const handlersOf = (el: SkOpsScreen): Handlers => el as unknown as Handlers;

const EVENT_NAMES = ['sk-load-more', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<OpsScreenProps> = opsProps.ready(), width = 1280): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await settle(screen);
  return screen;
}

async function update(screen: SkOpsScreen, props: Partial<OpsScreenProps>): Promise<void> {
  Object.assign(screen, props);
  await settle(screen);
}

const root = (screen: SkOpsScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const lookOf = (screen: SkOpsScreen): string | null => root(screen).querySelector('[data-look]')?.getAttribute('data-look') ?? null;
const liveText = (screen: SkOpsScreen): string => root(screen).querySelector('[role="status"]')?.textContent?.trim() ?? '';
const liveRegions = (screen: SkOpsScreen): number => root(screen).querySelectorAll('[role="status"]').length;

function listenAll(screen: SkOpsScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENT_NAMES) screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
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

const FIRST_CURSOR = OPS_PAGE_FIXTURES.opsPageFirst.pageInfo.nextPageCursor;

describe('the surface: twelve properties with their defaults and attributes', () => {
  it('has the contract defaults', () => {
    const screen = document.createElement('sk-ops-screen');
    expect(screen.status).toBe('loading');
    expect(screen.items).toEqual([]);
    expect(screen.pageInfo).toBeNull();
    expect(screen.totalCount).toBe(0);
    expect(screen.skippedCount).toBe(0);
    expect(screen.profile).toBeNull();
    expect(screen.loadingMore).toBe(false);
    expect(screen.loadMoreError).toBeNull();
    expect(screen.refusalCode).toBeNull();
    expect(screen.labels).toBeNull();
    expect(screen.errorMessage).toBe('');
  });

  it('reads the seven attributes into their properties, and reflects only status', async () => {
    const screen = document.createElement('sk-ops-screen');
    screen.setAttribute('status', 'ready');
    screen.setAttribute('loading-more', '');
    screen.setAttribute('error-message', 'text');
    screen.setAttribute('profile', 'p-1');
    screen.setAttribute('total-count', '7');
    screen.setAttribute('skipped-count', '2');
    screen.setAttribute('refusal-code', 'c-1');
    expect([screen.status, screen.loadingMore, screen.errorMessage, screen.profile, screen.totalCount, screen.skippedCount, screen.refusalCode]).toEqual([
      'ready',
      true,
      'text',
      'p-1',
      7,
      2,
      'c-1',
    ]);
    document.body.append(screen);
    screen.status = 'error';
    screen.totalCount = 9;
    screen.profile = 'p-2';
    await screen.updateComplete;
    expect(screen.getAttribute('status')).toBe('error');
    expect(screen.getAttribute('total-count')).toBe('7');
    expect(screen.getAttribute('profile')).toBe('p-1');
  });

  it('has exactly the twelve reactive properties and seven attributes at run time', () => {
    const ctor = customElements.get('sk-ops-screen') as unknown as { elementProperties: Map<string, unknown>; observedAttributes: string[] };
    expect([...ctor.elementProperties.keys()].sort()).toEqual(
      ['errorMessage', 'items', 'labels', 'loadMoreError', 'loadingMore', 'pageInfo', 'profile', 'project', 'refusalCode', 'skippedCount', 'status', 'totalCount'].sort(),
    );
    expect(ctor.elementProperties.size).toBe(12);
    expect([...ctor.observedAttributes].sort()).toEqual(['error-message', 'loading-more', 'profile', 'refusal-code', 'skipped-count', 'status', 'total-count']);
  });
});

describe('the looks: each of the four rendered once, by resolveOpsLook', () => {
  const CASES: [string, Partial<OpsScreenProps> & { status: string }, string][] = [
    ['loading', opsProps.loading(), 'loading'],
    ['error', opsProps.error('opsRefusalUnreadable'), 'error'],
    ['empty', opsProps.empty(), 'empty'],
    ['ready', opsProps.ready(), 'ready'],
    ['an unknown status collapses to empty', { ...opsProps.ready(), status: 'banana' as never }, 'empty'],
    ['ready with no rows is empty', { ...opsProps.ready(), items: [] }, 'empty'],
    ['a page of another profile is loading', opsProps.mismatchedProfile(), 'loading'],
  ];
  it('shows the look the resolver names for each case', async () => {
    let ran = 0;
    for (const [name, props, expected] of CASES) {
      const screen = await mount(props);
      expect(lookOf(screen), name).toBe(expected);
      expect(root(screen).querySelectorAll('[data-look]').length, name).toBe(1);
      screen.parentElement?.remove();
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('reads loadMoreError only in the ready look and refusalCode only in the error look', async () => {
    const erroring = await mount({ ...opsProps.error('opsRefusalUnreadable'), loadMoreError: { code: null } });
    expect(root(erroring).querySelector('[data-load-more-error]')).toBeNull();
    const readyWithError = await mount({ ...opsProps.loadMoreError(null), refusalCode: 'ops_unreadable' });
    expect(root(readyWithError).querySelector('[data-load-more-error]')).not.toBeNull();
    expect(root(readyWithError).querySelector('[data-error-code]')).toBeNull();
    const errorWithCode = await mount(opsProps.error('opsRefusalUnreadable'));
    expect(root(errorWithCode).querySelector('[data-error-code]')?.getAttribute('data-error-code')).toBe('ops_unreadable');
  });

  it('never re-sorts or counts: the rows draw in the order given, and the total is shown as given', async () => {
    const props = opsProps.ready();
    const reversed = [...props.items].reverse();
    const screen = await mount({ ...props, items: reversed, totalCount: 999 });
    const ids = [...root(screen).querySelectorAll('[data-row-id]')].map((row) => row.getAttribute('data-row-id'));
    expect(ids).toEqual(reversed.map((item) => item.invocationId));
    expect(ids.length).toBe(props.items.length);
    expect(root(screen).textContent).toContain('999');
  });
});

describe('events: exactly one, with the exact payload, and the guards', () => {
  it('sk-load-more carries the cursor of the page info', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).loadMore();
    expectOne(events, 'sk-load-more', { cursor: FIRST_CURSOR });
  });

  it('a click on the Load more control emits the same single event', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    root(screen).querySelector<HTMLElement>('[data-load-more]')?.click();
    expectOne(events, 'sk-load-more', { cursor: FIRST_CURSOR });
  });

  it('no Load more without a next page, a cursor, or while loading more (each with a positive control)', async () => {
    const cases: [string, Partial<OpsScreenProps>][] = [
      ['no next page', { pageInfo: { hasNextPage: false, nextPageCursor: FIRST_CURSOR, pageSize: 2 } satisfies PageInfo }],
      ['no cursor', { pageInfo: { hasNextPage: true, nextPageCursor: null, pageSize: 2 } satisfies PageInfo }],
      ['loading more', { loadingMore: true }],
      ['no page info', { pageInfo: null }],
      ['mismatched profile (the loading look, not ready)', opsProps.mismatchedProfile()],
    ];
    let ran = 0;
    for (const [name, over] of cases) {
      const screen = await mount({ ...opsProps.ready(), ...over });
      const events = listenAll(screen);
      handlersOf(screen).loadMore();
      expect(events, name).toHaveLength(0);
      // positive control on the same listener and the same target: a retry of a ready look with a load-more error emits
      await update(screen, { profile: opsProps.ready().profile, loadingMore: false, pageInfo: { hasNextPage: true, nextPageCursor: 'cursor-b', pageSize: 2 }, loadMoreError: { code: null } });
      handlersOf(screen).retryPage();
      expectOne(events, 'sk-retry-load', { target: 'ops-page', cursor: 'cursor-b' });
      screen.parentElement?.remove();
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('asks once per cursor, and again after the page, the page info or loadingMore changes', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    handlersOf(screen).loadMore();
    handlersOf(screen).loadMore();
    expect(events).toHaveLength(1);
    await update(screen, { loadingMore: true });
    await update(screen, { loadingMore: false });
    handlersOf(screen).loadMore();
    expect(events).toHaveLength(2);
    handlersOf(screen).loadMore();
    expect(events).toHaveLength(2);
    await update(screen, { pageInfo: { hasNextPage: true, nextPageCursor: 'cursor-c', pageSize: 2 } });
    handlersOf(screen).loadMore();
    expect(events).toHaveLength(3);
    expect(events.map((event) => event.detail)).toEqual([{ cursor: FIRST_CURSOR }, { cursor: FIRST_CURSOR }, { cursor: 'cursor-c' }]);
  });

  it('retry of the error look carries the target and no cursor', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    const events = listenAll(screen);
    handlersOf(screen).retryPage();
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
    expect(Object.keys((events[0] as CustomEvent).detail)).toEqual(['target']);
  });

  it('a click on the error retry control emits the same single event', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    const events = listenAll(screen);
    root(screen).querySelector<HTMLElement>('[data-retry]')?.click();
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
  });

  it('retry of a load-more error carries the next cursor', async () => {
    const screen = await mount(opsProps.loadMoreError(null));
    const events = listenAll(screen);
    handlersOf(screen).retryPage();
    expectOne(events, 'sk-retry-load', { target: 'ops-page', cursor: FIRST_CURSOR });
  });

  it('the refused-cursor error refreshes from the newest: no cursor', async () => {
    const screen = await mount(opsProps.refusedCursor());
    const events = listenAll(screen);
    expect(OPS_REFUSAL_FIXTURES.opsCursorRefusal.code).toBe(CURSOR_REFUSAL_CODE);
    handlersOf(screen).retryPage();
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
    expect(Object.keys((events[0] as CustomEvent).detail)).toEqual(['target']);
  });

  it('a retry with no cursor to send is inert, with a positive control', async () => {
    const screen = await mount({ ...opsProps.loadMoreError(null), pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 2 } });
    const events = listenAll(screen);
    handlersOf(screen).retryPage();
    expect(events).toHaveLength(0);
    await update(screen, { loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    handlersOf(screen).retryPage();
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
  });

  it('retry is inert in the loading, empty and plain ready looks, with a positive control', async () => {
    const screen = await mount(opsProps.loading());
    const events = listenAll(screen);
    handlersOf(screen).retryPage();
    await update(screen, opsProps.empty());
    handlersOf(screen).retryPage();
    await update(screen, opsProps.ready());
    handlersOf(screen).retryPage();
    expect(events).toHaveLength(0);
    await update(screen, opsProps.error('opsRefusalUnreadable'));
    handlersOf(screen).retryPage();
    expectOne(events, 'sk-retry-load', { target: 'ops-page' });
  });
});

describe('the one live region', () => {
  it('has exactly one polite status region in every look, and the error look carries one alert besides', async () => {
    let ran = 0;
    for (const props of [opsProps.loading(), opsProps.ready(), opsProps.empty(), opsProps.error('opsRefusalUnreadable')]) {
      const screen = await mount(props);
      expect(liveRegions(screen)).toBe(1);
      expect(root(screen).querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite');
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('is empty until the shown look changes', async () => {
    const screen = await mount(opsProps.ready());
    expect(liveText(screen)).toBe('');
    // positive control, same screen: a look change does announce
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
  });

  it('announces the loading text when the loading look is entered by status', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
  });

  it('announces the loaded count when the ready look is entered', async () => {
    const screen = await mount(opsProps.loading());
    const ready = opsProps.ready();
    await update(screen, ready);
    expect(liveText(screen)).toBe(`${ready.items.length} of ${ready.totalCount} records loaded`);
  });

  it('announces the rows a load-more added, and nothing when the shown pair is unchanged', async () => {
    const first = opsProps.ready();
    const last = opsPageOf('opsPageLast');
    const screen = await mount(first);
    await update(screen, { items: [...first.items, ...last.items], pageInfo: last.pageInfo, totalCount: first.totalCount });
    expect(last.items.length).toBe(1);
    expect(liveText(screen)).toBe('1 more record loaded');
    const seq = root(screen).querySelector('[role="status"]')?.innerHTML;
    await update(screen, { skippedCount: 4 });
    expect(root(screen).querySelector('[role="status"]')?.innerHTML).toBe(seq);
  });

  it('announces the empty heading when the empty look is entered', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.empty());
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
  });

  it('announces nothing for the error look (the alert speaks), with a positive control', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.empty());
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
    await update(screen, opsProps.error('opsRefusalUnreadable'));
    // The text of the previous announcement is kept; no new one was made for the error.
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
    expect(root(screen).querySelectorAll('sk-notice[announce="assertive"]').length).toBe(1);
  });

  it('announces nothing for a mismatched page (loading by mismatch), with a positive control for loading by status', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.mismatchedProfile());
    expect(lookOf(screen)).toBe('loading');
    expect(liveText(screen)).toBe('');
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
  });

  it('announces the load-more error sentence once, and the refusal sentence for a refused cursor', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, { loadMoreError: { code: null } });
    expect(liveText(screen)).toBe(OPS_COPY.loadMoreError);
    await update(screen, { loadMoreError: null });
    await update(screen, { loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    expect(liveText(screen)).toBe(OPS_COPY.refusedCursor);
  });

  it('re-announces a repeated text as a new node (keyed on a sequence number)', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.loading());
    const before = root(screen).querySelector('[role="status"] span');
    await update(screen, opsProps.ready());
    await update(screen, opsProps.loading());
    const after = root(screen).querySelector('[role="status"] span');
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
    expect(after).not.toBe(before);
  });

  it('follows a labels.copy hook', async () => {
    const screen = await mount(opsProps.ready());
    screen.labels = { copy: (key) => (key === 'announceLoading' ? 'Reading now' : undefined) };
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe('Reading now');
  });
});

describe('the focus rule', () => {
  const focusedTag = (screen: SkOpsScreen): string | null => root(screen).activeElement?.tagName.toLowerCase() ?? null;

  it('moves focus to the section heading when the focused Load more control is removed (the last page arrives)', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    const control = root(screen).querySelector<HTMLElement>('[data-load-more]');
    control?.focus();
    expect(root(screen).activeElement).toBe(control);
    const last = opsPageOf('opsPageLast');
    await update(screen, { items: [...first.items, ...last.items], pageInfo: last.pageInfo });
    await settle(screen);
    expect(root(screen).querySelector('[data-load-more]')).toBeNull();
    const heading = root(screen).querySelector<HTMLElement>('[data-focus-target]');
    expect(heading?.getAttribute('tabindex')).toBe('-1');
    expect(root(screen).activeElement).toBe(heading);
    expect(focusedTag(screen)).toBe('h2');
  });

  it('moves focus to the state heading when a state replaces the list', async () => {
    const screen = await mount(opsProps.ready());
    root(screen).querySelector<HTMLElement>('[data-load-more]')?.focus();
    await update(screen, opsProps.empty());
    await settle(screen);
    expect(lookOf(screen)).toBe('empty');
    expect(root(screen).activeElement).toBe(root(screen).querySelector('[data-focus-target]'));
  });

  it('leaves focus alone while the focused control stays (positive control: it is still the Load more control)', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    const control = root(screen).querySelector<HTMLElement>('[data-load-more]');
    control?.focus();
    await update(screen, { loadingMore: true });
    await settle(screen);
    expect(root(screen).activeElement).toBe(control);
  });

  it('does not take focus when nothing in the screen had it', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.empty());
    await settle(screen);
    expect(root(screen).activeElement).toBeNull();
    // positive control, same screen: with a control focused, the same look change does move focus
    await update(screen, opsProps.ready());
    root(screen).querySelector<HTMLElement>('[data-load-more]')?.focus();
    expect(root(screen).activeElement).not.toBeNull();
    await update(screen, opsProps.empty());
    await settle(screen);
    expect(root(screen).activeElement).toBe(root(screen).querySelector('[data-focus-target]'));
  });
});

describe('profile and counts reach the screen as given', () => {
  it('shows the profile fact only when a profile is given, and the skipped note only when records were skipped', async () => {
    const plain = await mount({ ...opsProps.ready(), skippedCount: 0 });
    expect(root(plain).querySelector('[data-profile-fact]')).toBeNull();
    const [one] = opsProps.ready().items;
    if (one === undefined) throw new Error('no fixture row');
    const profiled = await mount({ ...opsProps.ready(), items: [one], profile: one.profileId });
    expect(root(profiled).querySelector('[data-profile-fact]')).not.toBeNull();
    const skipped = await mount({ ...opsProps.ready(), skippedCount: 2 });
    expect(root(skipped).querySelector('[data-skipped-note]')?.textContent).toContain('2 records');
    expect(root(skipped).querySelector('[data-skipped-note]')).not.toBeNull();
    expect(root(plain).querySelector('[data-skipped-note]')).toBeNull();
  });
});
