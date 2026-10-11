// The live region of the Ops screen (WP07, NFR-013, FR-033): one polite region announces what is SHOWN. Every row of the
// announcement table asserts the region's text AND the number of announcements made (a keyed node per announcement); every
// no-announcement case carries a positive control, a sibling change on the same screen that does announce.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { CURSOR_REFUSAL_CODE, OPS_COPY } from '../src/defaults/ops-copy.js';
import { OPS_PROFILE, opsPageOf, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

const root = (screen: SkOpsScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const region = (screen: SkOpsScreen): Element => {
  const el = root(screen).querySelector('[role="status"]');
  if (el === null) throw new Error('no live region');
  return el;
};
const liveText = (screen: SkOpsScreen): string => (region(screen).textContent ?? '').trim();

interface Watch {
  /** The announcements made since the last read: the keyed text nodes the region gained. */
  count(): number;
}

/** Counts the announcements the region makes: every announcement is a new keyed `span`, so a repeated text still counts. */
function watch(screen: SkOpsScreen): Watch {
  let added = 0;
  const observer = new MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node instanceof HTMLElement && node.tagName === 'SPAN') added += 1;
  });
  observer.observe(region(screen), { childList: true });
  return {
    count: () => {
      for (const record of observer.takeRecords()) for (const node of record.addedNodes) if (node instanceof HTMLElement && node.tagName === 'SPAN') added += 1;
      const total = added;
      added = 0;
      return total;
    },
  };
}

async function mount(props: Partial<OpsScreenProps> & Partial<Pick<SkOpsScreen, 'errorMessage' | 'labels'>>): Promise<SkOpsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await settle(screen);
  return screen;
}

async function update(screen: SkOpsScreen, props: Partial<OpsScreenProps> & Partial<Pick<SkOpsScreen, 'errorMessage' | 'labels'>>): Promise<void> {
  Object.assign(screen, props);
  await settle(screen);
}

describe('FR-033: the announcement table, text and count', () => {
  it('the first render announces nothing (the region is empty), whatever the look', async () => {
    let ran = 0;
    for (const props of [opsProps.loading(), opsProps.ready(), opsProps.empty(), opsProps.error('opsRefusalUnreadable'), opsProps.mismatchedProfile()]) {
      const screen = await mount(props);
      expect(liveText(screen)).toBe('');
      expect(region(screen).children.length).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('loading entered by status: "Loading invocation records", once', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
    expect(w.count()).toBe(1);
  });

  it('ready entered: "{loaded} of {total} records loaded", once', async () => {
    const screen = await mount(opsProps.loading());
    const w = watch(screen);
    const ready = opsProps.ready();
    await update(screen, ready);
    expect(liveText(screen)).toBe(`${ready.items.length} of ${ready.totalCount} records loaded`);
    expect(w.count()).toBe(1);
  });

  it('ready entered with one record: the singular form "1 of 1 record loaded"', async () => {
    const screen = await mount(opsProps.loading());
    const w = watch(screen);
    const one = opsPageOf('opsPageLast');
    expect(one.items.length).toBe(1);
    await update(screen, { ...one, totalCount: 1 });
    expect(liveText(screen)).toBe('1 of 1 record loaded');
    expect(w.count()).toBe(1);
  });

  it('rows added by a load-more: "{n} more records loaded", once, and the singular "1 more record loaded"', async () => {
    const first = opsProps.longPage(6);
    const more = opsProps.longPage(10);
    const screen = await mount({ ...first, totalCount: 249 });
    const w = watch(screen);
    await update(screen, { items: more.items, totalCount: 249 });
    expect(liveText(screen)).toBe('4 more records loaded');
    expect(w.count()).toBe(1);
    const next = opsProps.longPage(11);
    await update(screen, { items: next.items });
    expect(liveText(screen)).toBe('1 more record loaded');
    expect(w.count()).toBe(1);
  });

  it('empty entered: the empty heading, once', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, opsProps.empty());
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
    expect(w.count()).toBe(1);
  });

  it('ready with zero rows entered (OP-37) announces the empty heading, once', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, { ...opsProps.empty(), status: 'ready' });
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
    expect(w.count()).toBe(1);
  });

  it('a load-more error appearing: its sentence, once; the refused cursor has its own sentence', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, { loadMoreError: { code: null } });
    expect(liveText(screen)).toBe(OPS_COPY.loadMoreError);
    expect(w.count()).toBe(1);
    await update(screen, { loadMoreError: null });
    expect(w.count()).toBe(0);
    await update(screen, { loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    expect(liveText(screen)).toBe(OPS_COPY.refusedCursor);
    expect(w.count()).toBe(1);
  });

  it('the error look announces nothing in the region (the alert speaks), with a positive control', async () => {
    const screen = await mount(opsProps.loading());
    const w = watch(screen);
    await update(screen, opsProps.error('opsRefusalUnreadable'));
    expect(w.count()).toBe(0);
    expect(liveText(screen)).toBe('');
    // the alert is the only announcer of the error: exactly one assertive notice, the region carries no error text
    expect(root(screen).querySelectorAll('sk-notice[announce="assertive"]').length).toBe(1);
    expect(liveText(screen)).not.toContain(OPS_COPY.errorHeading);
    // positive control, same screen and watcher: the next look change announces
    await update(screen, opsProps.empty());
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
  });

  it('a retry that moves the error look to loading announces the loading text once', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    const w = watch(screen);
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
    expect(w.count()).toBe(1);
  });

  it('a mismatched page announces nothing, with a positive control', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, opsProps.mismatchedProfile());
    expect(root(screen).querySelector('[data-look]')?.getAttribute('data-look')).toBe('loading');
    expect(liveText(screen)).toBe('');
    expect(w.count()).toBe(0);
    // a sibling change on the same screen: loading by status announces
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
    expect(w.count()).toBe(1);
  });

  it('a late page that agrees with the filter is announced once', async () => {
    const base = opsProps.ready();
    const profile = base.items[0]?.profileId ?? '';
    const agreeing = base.items.filter((item) => item.profileId === profile);
    expect(agreeing.length).toBeGreaterThan(0);
    expect(agreeing.length).toBeLessThan(base.items.length);
    expect(base.totalCount).toBeGreaterThan(1);
    const screen = await mount({ ...base, profile });
    const w = watch(screen);
    expect(root(screen).querySelector('[data-look]')?.getAttribute('data-look')).toBe('loading');
    expect(w.count()).toBe(0);
    await update(screen, { items: agreeing });
    expect(root(screen).querySelector('[data-look]')?.getAttribute('data-look')).toBe('ready');
    expect(liveText(screen)).toBe(`${agreeing.length} of ${base.totalCount} records loaded`);
    expect(w.count()).toBe(1);
    // and not again for the same shown pair
    await update(screen, { items: [...agreeing] });
    expect(w.count()).toBe(0);
  });

  it('the same shown pair re-rendered announces nothing, with a positive control for each', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    const same: (Partial<OpsScreenProps> & { errorMessage?: string })[] = [
      { skippedCount: 4 },
      { totalCount: 500 },
      { items: [...opsProps.ready().items] },
      { pageInfo: { ...(opsProps.ready().pageInfo as NonNullable<OpsScreenProps['pageInfo']>) } },
      { refusalCode: 'ignored-in-ready' },
      { errorMessage: 'ignored in ready' },
    ];
    let ran = 0;
    for (const props of same) {
      await update(screen, props);
      expect(w.count(), JSON.stringify(Object.keys(props))).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(6);
    expect(liveText(screen)).toBe('');
    // positive control: a change of the rows shown announces
    await update(screen, { items: opsProps.ready().items.slice(0, 1) });
    expect(w.count()).toBe(1);
  });

  it('the same empty look re-rendered announces nothing (positive control: leaving and re-entering announces again)', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, opsProps.empty());
    const w = watch(screen);
    for (const props of [{ skippedCount: 2 }, { profile: OPS_PROFILE }, { profile: null }, { status: 'banana' as never }, { status: 'empty' as const }]) {
      await update(screen, props);
      expect(w.count(), JSON.stringify(props)).toBe(0);
    }
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
    await update(screen, opsProps.ready());
    expect(w.count()).toBe(1);
    await update(screen, opsProps.empty());
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
  });

  it('a repeated text is a new announcement (keyed), not a silent repeat', async () => {
    const screen = await mount(opsProps.ready());
    const w = watch(screen);
    await update(screen, opsProps.loading());
    await update(screen, opsProps.ready());
    await update(screen, opsProps.loading());
    expect(w.count()).toBe(3);
    expect(liveText(screen)).toBe(OPS_COPY.announceLoading);
  });

  it('the region is one polite status region in every look, never an alert', async () => {
    let ran = 0;
    for (const props of [opsProps.loading(), opsProps.ready(), opsProps.empty(), opsProps.error('opsRefusalUnreadable')]) {
      const screen = await mount(props);
      expect(root(screen).querySelectorAll('[role="status"]').length).toBe(1);
      expect(region(screen).getAttribute('aria-live')).toBe('polite');
      expect(region(screen).getAttribute('role')).toBe('status');
      expect(root(screen).querySelectorAll('[aria-live="assertive"]').length).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('follows labels.copy for each announcement text', async () => {
    const copy = (key: string): string | undefined =>
      ({ announceLoading: 'L!', emptyHeading: 'E!', loadMoreError: 'M!' })[key];
    const screen = await mount({ ...opsProps.ready(), labels: { copy } });
    await update(screen, opsProps.loading());
    expect(liveText(screen)).toBe('L!');
    await update(screen, opsProps.empty());
    expect(liveText(screen)).toBe('E!');
    await update(screen, opsProps.ready());
    await update(screen, { loadMoreError: { code: null } });
    expect(liveText(screen)).toBe('M!');
  });
});

describe('FR-033, WP07 fix round 1: the markup of the empty look is the same however it is reached', () => {
  it('empty by status, then ready with zero items: the identical empty look announces nothing again (positive control: leaving and returning announces)', async () => {
    const screen = await mount(opsProps.empty());
    const w = watch(screen);
    await update(screen, { ...opsProps.empty(), status: 'ready' });
    expect(root(screen).querySelector('[data-look]')?.getAttribute('data-look')).toBe('empty');
    expect(w.count()).toBe(0);
    expect(liveText(screen)).toBe('');
    // and back: the same look again, still silent
    await update(screen, opsProps.empty());
    expect(w.count()).toBe(0);
    // positive control: leaving the empty look and entering it announces once
    await update(screen, opsProps.ready());
    expect(w.count()).toBe(1);
    await update(screen, { ...opsProps.empty(), status: 'ready' });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe(OPS_COPY.emptyHeading);
  });

  it('a load-more error that goes straight from a null code to the refused cursor announces exactly once, with the refused-cursor sentence', async () => {
    const screen = await mount(opsProps.ready());
    await update(screen, { loadMoreError: { code: null } });
    const w = watch(screen);
    await update(screen, { loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    expect(liveText(screen)).toBe(OPS_COPY.refusedCursor);
    expect(w.count()).toBe(1);
    // positive control: the reverse direction announces its own sentence once
    await update(screen, { loadMoreError: { code: null } });
    expect(liveText(screen)).toBe(OPS_COPY.loadMoreError);
    expect(w.count()).toBe(1);
  });
});

describe('A11Y-003: Load more announces that it started (operator ruling)', () => {
  it('"Loading more records" once when Load more starts, then "N more records loaded" when the page arrives, in that order', async () => {
    const first = opsProps.longPage(6);
    const more = opsProps.longPage(10);
    const screen = await mount({ ...first, totalCount: 249 });
    const w = watch(screen);
    const heard: string[] = [];
    await update(screen, { loadingMore: true });
    heard.push(liveText(screen));
    expect(w.count()).toBe(1);
    // the same busy state re-rendered by an unrelated change is not announced again
    await update(screen, { totalCount: 250 });
    expect(w.count()).toBe(0);
    await update(screen, { items: more.items, pageInfo: more.pageInfo, loadingMore: false });
    heard.push(liveText(screen));
    expect(w.count()).toBe(1);
    expect(heard).toEqual([OPS_COPY.announceLoadingMore, '4 more records loaded']);
    expect(OPS_COPY.announceLoadingMore).toBe('Loading more records');
  });

  it('the busy state ending without new rows (a failed request, no error shown) announces nothing', async () => {
    const screen = await mount({ ...opsProps.longPage(6), totalCount: 249 });
    await update(screen, { loadingMore: true });
    const w = watch(screen);
    await update(screen, { loadingMore: false });
    expect(w.count()).toBe(0);
    // positive control: starting again announces
    await update(screen, { loadingMore: true });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe(OPS_COPY.announceLoadingMore);
  });

  it('a retry that clears the load-more error and goes busy announces "Loading more records" once', async () => {
    const screen = await mount({ ...opsProps.longPage(6), totalCount: 249, loadMoreError: { code: null } });
    const w = watch(screen);
    await update(screen, { loadMoreError: null, loadingMore: true });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe(OPS_COPY.announceLoadingMore);
  });

  it('only the ready look announces it (positive control: the ready look does)', async () => {
    const screen = await mount(opsProps.loading());
    const w = watch(screen);
    await update(screen, { loadingMore: true });
    expect(w.count()).toBe(0);
    expect(liveText(screen)).toBe('');
    const ready = await mount({ ...opsProps.longPage(6), totalCount: 249 });
    const w2 = watch(ready);
    await update(ready, { loadingMore: true });
    expect(w2.count()).toBe(1);
  });

  it('follows labels.copy', async () => {
    const screen = await mount({ ...opsProps.longPage(6), totalCount: 249, labels: { copy: (k) => (k === 'announceLoadingMore' ? 'Fetching' : undefined) } });
    await update(screen, { loadingMore: true });
    expect(liveText(screen)).toBe('Fetching');
  });
});

describe('A11Y-007: a different page with the same row count is announced', () => {
  const renamed = (props: OpsScreenProps): OpsScreenProps['items'] => props.items.map((item, index) => ({ ...item, invocationId: `${item.invocationId}-refreshed-${index}` }));

  it('Refresh from the newest: other rows, same count, the load-more error cleared, announces the loaded text once', async () => {
    const base = { ...opsProps.longPage(6), totalCount: 249 };
    const screen = await mount({ ...base, loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    const w = watch(screen);
    await update(screen, { items: renamed(base), pageInfo: { ...(base.pageInfo as NonNullable<OpsScreenProps['pageInfo']>), nextPageCursor: 'c-fresh' }, loadMoreError: null });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe('6 of 249 records loaded');
  });

  it('the key is the first item id: other rows with the same cursor announce (positive control: copies of the same rows do not)', async () => {
    const base = { ...opsProps.longPage(6), totalCount: 249 };
    const screen = await mount(base);
    const w = watch(screen);
    await update(screen, { items: base.items.map((item) => structuredClone(item)) });
    expect(w.count()).toBe(0);
    await update(screen, { items: renamed(base) });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe('6 of 249 records loaded');
  });

  it('the key is also the cursor: the same rows with another next-page cursor announce (positive control: an equal cursor does not)', async () => {
    const base = { ...opsProps.longPage(6), totalCount: 249 };
    const info = base.pageInfo as NonNullable<OpsScreenProps['pageInfo']>;
    const screen = await mount(base);
    const w = watch(screen);
    await update(screen, { pageInfo: { ...info } });
    expect(w.count()).toBe(0);
    await update(screen, { pageInfo: { ...info, nextPageCursor: 'c-other' } });
    expect(w.count()).toBe(1);
    expect(liveText(screen)).toBe('6 of 249 records loaded');
  });

  it('a longer list that replaces the first rows is not announced as rows "added"', async () => {
    const base = { ...opsProps.longPage(6), totalCount: 249 };
    const screen = await mount(base);
    await update(screen, { items: renamed(opsProps.longPage(9)), pageInfo: { ...(base.pageInfo as NonNullable<OpsScreenProps['pageInfo']>), nextPageCursor: 'c-fresh' } });
    expect(liveText(screen)).toBe('9 of 249 records loaded');
  });
});

describe('TESTS-001: a load-more error is announced once, not on every later update while it is shown', () => {
  for (const code of [null, CURSOR_REFUSAL_CODE]) {
    it(`error code ${String(code)}: unrelated updates while it stays shown announce nothing (positive control: it announced when it appeared)`, async () => {
      const screen = await mount({ ...opsProps.ready(), loadMoreError: null });
      const w = watch(screen);
      await update(screen, { loadMoreError: { code } });
      expect(w.count()).toBe(1);
      const sentence = liveText(screen);
      expect(sentence).toBe(code === null ? OPS_COPY.loadMoreError : OPS_COPY.refusedCursor);
      const info = opsProps.ready().pageInfo as NonNullable<OpsScreenProps['pageInfo']>;
      const same: Partial<OpsScreenProps>[] = [
        { totalCount: 500 },
        { skippedCount: 3 },
        { items: [...opsProps.ready().items] },
        { pageInfo: { ...info } },
        { loadMoreError: { code } },
        { totalCount: 249 },
      ];
      let ran = 0;
      for (const props of same) {
        await update(screen, props);
        expect(w.count(), JSON.stringify(Object.keys(props))).toBe(0);
        ran += 1;
      }
      await update(screen, { labels: { copy: () => undefined } });
      expect(w.count()).toBe(0);
      expect(ran).toBe(6);
      expect(liveText(screen)).toBe(sentence);
    });
  }
});
