// The non-ready looks of the Ops screen (WP07, T039): header and source notice in EVERY look (OP-36, FR-003), the loading, empty
// and error looks (OP-19..OP-23, OP-37), the empty wordings by precedence (CP-1), the refusal sentences and the focus targets.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { OPS_COPY, OPS_VOCABULARY } from '../src/defaults/ops-copy.js';
import { buildOpsRow } from '../src/logic/index.js';
import { OPS_PROFILE, opsPageOf, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import { project as contractProject } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkOpsScreen): Promise<void> {
  await screen.updateComplete;
  // two frames: the focus move of the screen waits for one frame after its update completes
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<OpsScreenProps>, extra: Partial<SkOpsScreen> = {}): Promise<SkOpsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props, extra);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await settle(screen);
  return screen;
}

const root = (screen: SkOpsScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const q = (screen: SkOpsScreen, selector: string): Element | null => root(screen).querySelector(selector);
const qa = (screen: SkOpsScreen, selector: string): number => root(screen).querySelectorAll(selector).length;
const textOf = (screen: SkOpsScreen, selector: string): string => (q(screen, selector)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const lookOf = (screen: SkOpsScreen): string | null => q(screen, '[data-look]')?.getAttribute('data-look') ?? null;

const SUPPORTING = `${contractProject.name} · ${OPS_COPY.headerSupportingTail}`;

/** Every non-ready look, with the arguments that reach it; `ready` is the positive control of each absence. */
const NON_READY: [string, Partial<OpsScreenProps>, string][] = [
  ['loading', opsProps.loading(), 'loading'],
  ['loading, a page of another profile (OP-35)', opsProps.mismatchedProfile(), 'loading'],
  ['empty', opsProps.empty(), 'empty'],
  ['empty with skipped records', opsProps.emptySkipped(), 'empty'],
  ['empty with a profile', opsProps.emptyProfile(), 'empty'],
  ['ready with zero items (OP-37)', { ...opsProps.ready(), items: [], totalCount: 0 }, 'empty'],
  ['an unknown status', { ...opsProps.ready(), status: 'banana' as never }, 'empty'],
  ['error', opsProps.error('opsRefusalUnreadable'), 'error'],
];

describe('FR-003, OP-36: the header and the source notice stay in every look', () => {
  it('draws the eyebrow, the title, the project line, the badge and the notice in each non-ready look', async () => {
    let ran = 0;
    for (const [name, props, look] of NON_READY) {
      const screen = await mount(props);
      expect(lookOf(screen), name).toBe(look);
      expect(qa(screen, 'sk-page-header'), name).toBe(1);
      expect(textOf(screen, 'sk-page-header [slot="eyebrow"]'), name).toBe(OPS_COPY.headerEyebrow);
      expect(textOf(screen, 'sk-page-header h1[slot="title"]'), name).toBe(OPS_COPY.headerTitle);
      expect(textOf(screen, 'sk-page-header [slot="supporting"]'), name).toBe(SUPPORTING);
      expect(textOf(screen, 'sk-page-header [data-read-only]'), name).toBe(OPS_COPY.headerBadge);
      expect(textOf(screen, 'sk-notice[data-source-notice]'), name).toBe(OPS_COPY.sourceNotice);
      expect(qa(screen, 'h1'), name).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(8);
    // positive control: the ready look draws the same header and notice
    const ready = await mount(opsProps.ready());
    expect(lookOf(ready)).toBe('ready');
    expect(textOf(ready, 'sk-page-header [slot="supporting"]')).toBe(SUPPORTING);
    expect(textOf(ready, 'sk-notice[data-source-notice]')).toBe(OPS_COPY.sourceNotice);
  });

  it('draws the project line only when a project is given, in every look (paired)', async () => {
    let ran = 0;
    for (const [name, props] of [...NON_READY, ['ready', opsProps.ready(), 'ready'] as [string, Partial<OpsScreenProps>, string]]) {
      const without = await mount({ ...props, project: null });
      expect(qa(without, 'sk-page-header [slot="supporting"]'), `${name} without a project`).toBe(0);
      expect(qa(without, 'sk-page-header h1'), name).toBe(1);
      const withProject = await mount(props);
      expect(qa(withProject, 'sk-page-header [slot="supporting"]'), `${name} with a project`).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(9);
  });

  it('follows the header copy hook in a non-ready look as it does in the ready look', async () => {
    const labels = { copy: (key: string): string | undefined => (key === 'headerTitle' ? 'Records' : undefined) };
    const loading = await mount(opsProps.loading(), { labels });
    expect(textOf(loading, 'h1')).toBe('Records');
    const ready = await mount(opsProps.ready(), { labels });
    expect(textOf(ready, 'h1')).toBe('Records');
  });

  it('replaces only the list region: no section heading, count, profile fact, rows or paging control outside the ready look', async () => {
    const SELECTORS = ['[data-ops-section]', '[data-count]', '[data-profile-fact]', '[data-row-id]', '[data-load-more]', '[data-skipped-note]', '[data-load-more-error]', 'ul'];
    let ran = 0;
    for (const [name, props] of NON_READY) {
      const screen = await mount({ ...props, loadMoreError: { code: null }, skippedCount: 3 });
      for (const selector of SELECTORS) {
        expect(qa(screen, selector), `${name}: ${selector}`).toBe(0);
        ran += 1;
      }
    }
    expect(ran).toBe(NON_READY.length * SELECTORS.length);
    // positive control: every one of those is drawn by a ready look that carries them (the load-more error replaces Load more)
    const base = opsProps.ready();
    const profile = base.items[0]?.profileId ?? null;
    const items = base.items.filter((item) => item.profileId === profile);
    const withMore = await mount({ ...base, items, profile, skippedCount: 3 });
    const withError = await mount({ ...base, items, profile, skippedCount: 3, loadMoreError: { code: null } });
    expect(lookOf(withMore)).toBe('ready');
    expect(lookOf(withError)).toBe('ready');
    // one filtered item: each selector is drawn exactly as often as listed below (Load more and its error replace each other)
    expect(items.length).toBe(1);
    const DRAWN: Record<string, [number, number]> = {
      '[data-ops-section]': [1, 1],
      '[data-count]': [1, 1],
      '[data-profile-fact]': [1, 1],
      '[data-row-id]': [1, 1],
      '[data-load-more]': [1, 0],
      '[data-skipped-note]': [1, 1],
      '[data-load-more-error]': [0, 1],
      ul: [1, 1],
    };
    expect(Object.keys(DRAWN)).toEqual(SELECTORS);
    for (const selector of SELECTORS) {
      expect([qa(withMore, selector), qa(withError, selector)], `ready: ${selector}`).toEqual(DRAWN[selector]);
    }
  });
});

describe('OP-22: the loading look', () => {
  it('shows the labelled indeterminate progress and the sentence, busy, with a focusable heading', async () => {
    const screen = await mount(opsProps.loading());
    expect(q(screen, '[data-look="loading"] [aria-busy="true"]')).not.toBeNull();
    expect(qa(screen, 'progress')).toBe(1);
    expect(q(screen, 'progress')?.hasAttribute('value')).toBe(false);
    expect(textOf(screen, '[data-look="loading"]')).toContain(OPS_COPY.loadingLabel);
    expect(textOf(screen, '[data-look="loading"]')).toContain(OPS_COPY.loadingBody);
    expect(q(screen, '[data-look="loading"] [data-focus-target]')?.getAttribute('tabindex')).toBe('-1');
    expect(q(screen, '[data-look="loading"] [data-focus-target]')?.getAttribute('role')).toBe('heading');
    expect(qa(screen, '[data-focus-target]')).toBe(1);
  });

  it('is busy only while loading (paired with empty, error and ready)', async () => {
    let ran = 0;
    for (const props of [opsProps.empty(), opsProps.error('opsRefusalUnreadable'), opsProps.ready()]) {
      const screen = await mount(props);
      expect(qa(screen, '[aria-busy="true"]'), String(props.status)).toBe(0);
      expect(qa(screen, 'progress')).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(3);
    // positive control: the loading look is busy, with its one progress
    const loading = await mount(opsProps.loading());
    expect(qa(loading, '[aria-busy="true"]')).toBe(1);
    expect(qa(loading, 'progress')).toBe(1);
  });

  it('a mismatched page is the loading look and draws no row of it', async () => {
    const props = opsProps.mismatchedProfile();
    expect(props.items.length).toBeGreaterThan(0);
    const screen = await mount(props);
    expect(lookOf(screen)).toBe('loading');
    expect(qa(screen, '[aria-busy="true"]')).toBe(1);
    expect(qa(screen, '[data-row-id]')).toBe(0);
    expect(qa(screen, '[data-profile-fact]')).toBe(0);
  });
});

describe('OP-19..OP-21, OP-37: the empty look', () => {
  it('OP-19: the heading and the plain sentence, no list and no badge', async () => {
    const screen = await mount(opsProps.empty());
    expect(textOf(screen, '[data-look="empty"] h2')).toBe(OPS_COPY.emptyHeading);
    expect(textOf(screen, '[data-look="empty"]')).toContain(OPS_COPY.emptyBody);
    expect(q(screen, '[data-look="empty"] h2')?.getAttribute('tabindex')).toBe('-1');
    expect(qa(screen, '[data-focus-target]')).toBe(1);
    expect(qa(screen, 'code')).toBe(0);
  });

  it('OP-20: skipped records are named, in the "in this project" wording, after the plain sentence', async () => {
    const props = opsProps.emptySkipped();
    expect(props.skippedCount).toBeGreaterThan(0);
    const screen = await mount(props);
    const body = textOf(screen, '[data-look="empty"]');
    expect(body).toContain(`${OPS_COPY.emptyBody} ${props.skippedCount} records in this project could not be read and are not shown.`);
    expect(qa(screen, '[data-empty-skipped]')).toBe(0);
    // positive control: the same look without skipped records carries no count
    const clean = await mount({ ...props, skippedCount: 0 });
    expect(textOf(clean, '[data-look="empty"]')).not.toContain('could not be read');
  });

  it('OP-21: a profile makes the headline the profile wording and names the profile in mono', async () => {
    const screen = await mount(opsProps.emptyProfile());
    const body = textOf(screen, '[data-look="empty"]');
    expect(body).toContain(OPS_COPY.emptyProfile);
    expect(body).not.toContain(OPS_COPY.emptyBody);
    expect(textOf(screen, 'code[data-empty-profile]')).toBe(OPS_PROFILE);
    expect(qa(screen, 'code')).toBe(1);
    // positive control: no profile gives the plain wording and no code
    const plain = await mount(opsProps.empty());
    expect(textOf(plain, '[data-look="empty"]')).toContain(OPS_COPY.emptyBody);
    expect(qa(plain, 'code')).toBe(0);
  });

  it('CP-1: a profile and skipped records show both, the count never hidden', async () => {
    const screen = await mount({ ...opsProps.emptyProfile(), skippedCount: 4 });
    const body = textOf(screen, '[data-look="empty"]');
    expect(body).toContain(OPS_COPY.emptyProfile);
    expect(body).toContain('4 records in this project could not be read and are not shown.');
  });

  it('CONTRACT-002: a profile and skipped records are two proper sentences, the profile code between them (OP-21a)', async () => {
    const screen = await mount({ ...opsProps.emptyProfile(), skippedCount: 4 });
    const card = q(screen, '[data-look="empty"] .sk-empty-state');
    expect([...(card?.children ?? [])].map((child) => child.tagName.toLowerCase())).toEqual(['h2', 'p', 'code', 'p']);
    expect(textOf(screen, '[data-look="empty"] .sk-empty-state > p:nth-of-type(1)')).toBe('No records for this profile.');
    expect(textOf(screen, '[data-look="empty"] code[data-empty-profile]')).toBe(OPS_PROFILE);
    expect(textOf(screen, '[data-look="empty"] p[data-empty-skipped]')).toBe('4 records in this project could not be read and are not shown.');
    expect(textOf(screen, '[data-look="empty"] .sk-empty-state')).toBe(`${OPS_COPY.emptyHeading} No records for this profile. ${OPS_PROFILE} 4 records in this project could not be read and are not shown.`);
    // positive control: one skipped record takes the singular sentence
    const one = await mount({ ...opsProps.emptyProfile(), skippedCount: 1 });
    expect(textOf(one, '[data-look="empty"] p[data-empty-skipped]')).toBe('1 record in this project could not be read and is not shown.');
  });

  it('OP-37: ready with zero items equals the empty look, to the markup', async () => {
    const empty = await mount(opsProps.empty());
    const zero = await mount({ ...opsProps.empty(), status: 'ready' });
    expect(lookOf(zero)).toBe('empty');
    const inner = (screen: SkOpsScreen): string => q(screen, '[data-look]')?.innerHTML ?? '';
    expect(inner(zero)).toBe(inner(empty));
    expect(inner(zero).length).toBeGreaterThan(0);
  });

  it('an unknown status collapses to the empty look (positive control: loading is not empty)', async () => {
    const unknown = await mount({ ...opsProps.empty(), status: 'banana' as never });
    expect(lookOf(unknown)).toBe('empty');
    expect(textOf(unknown, '[data-look="empty"] h2')).toBe(OPS_COPY.emptyHeading);
    const loading = await mount({ ...opsProps.empty(), status: 'loading' });
    expect(lookOf(loading)).toBe('loading');
  });

  it('follows the copy hook', async () => {
    const screen = await mount(opsProps.empty(), { labels: { copy: (key) => (key === 'emptyHeading' ? 'Nothing here' : undefined) } });
    expect(textOf(screen, '[data-look="empty"] h2')).toBe('Nothing here');
  });
});

describe('OP-23, FR-027: the error look', () => {
  it('shows one assertive danger notice with the heading, the sentence and a retry', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    expect(qa(screen, 'sk-notice[tone="danger"]')).toBe(1);
    const notice = q(screen, 'sk-notice[tone="danger"]') as HTMLElement & { updateComplete: Promise<unknown> };
    expect(notice.getAttribute('announce')).toBe('assertive');
    await notice.updateComplete;
    expect(notice.shadowRoot?.querySelectorAll('[role="alert"]').length).toBe(1);
    expect(textOf(screen, '[data-look="error"] h2')).toBe(OPS_COPY.errorHeading);
    expect(textOf(screen, '[data-look="error"]')).toContain(OPS_COPY.errorBody);
    expect(textOf(screen, '[data-look="error"] [data-retry]')).toBe(OPS_COPY.retryLabel);
    expect(OPS_COPY.errorBody).toContain('No invocation rows are shown');
    expect(qa(screen, '[data-row-id]')).toBe(0);
    expect(qa(screen, '[data-focus-target]')).toBe(1);
  });

  it('unknown and null refusal codes show the generic body, never undefined (paired with the known code)', async () => {
    const cases: [string, string | null][] = [['known', 'ops_unreadable'], ['unknown', 'some_new_code'], ['null', null], ['empty string', ''], ['the cursor code', 'invalid_page_cursor']];
    let ran = 0;
    for (const [name, code] of cases) {
      const screen = await mount({ ...opsProps.error('opsRefusalUnreadable'), refusalCode: code });
      const body = textOf(screen, '[data-look="error"]');
      expect(body, name).toContain(OPS_COPY.errorBody);
      expect(body, name).not.toContain('undefined');
      expect(body, name).not.toContain('null');
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('the refusal sentence follows a copy hook for the generic key, and errorMessage overrides it (paired)', async () => {
    const hook = { copy: (key: string): string | undefined => (key === 'errorBody' ? 'Reworded body' : undefined) };
    const worded = await mount(opsProps.error('opsRefusalUnreadable'), { labels: hook });
    expect(textOf(worded, '[data-look="error"]')).toContain('Reworded body');
    const overridden = await mount(opsProps.error('opsRefusalUnreadable'), { labels: hook, errorMessage: 'Host says no' });
    expect(textOf(overridden, '[data-look="error"]')).toContain('Host says no');
    expect(textOf(overridden, '[data-look="error"]')).not.toContain('Reworded body');
    const empty = await mount(opsProps.error('opsRefusalUnreadable'), { errorMessage: '' });
    expect(textOf(empty, '[data-look="error"]')).toContain(OPS_COPY.errorBody);
  });

  it('a foreign error message renders as text, never as markup', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'), { errorMessage: '<img src=x onerror=alert(1)>' });
    expect(textOf(screen, '[data-look="error"]')).toContain('<img src=x onerror=alert(1)>');
    expect(qa(screen, 'img')).toBe(0);
  });

  it('names no path or file format in any default sentence of the non-ready looks (OQ-6)', () => {
    const KEYS = ['loadingLabel', 'loadingBody', 'emptyHeading', 'emptyBody', 'emptyProfile', 'errorHeading', 'errorBody', 'sourceNotice'] as const;
    let ran = 0;
    for (const key of KEYS) {
      expect(OPS_COPY[key], key).not.toMatch(/[/\\]|\.jsonl|\.yaml|\.json|kitty-ops|Kitty Desktop/);
      ran += 1;
    }
    expect(ran).toBe(8);
  });
});

describe('contract rulings (NFR-012)', () => {
  it('R-A: a null-actor Op is served in items and drawn as a row; its view carries the quiet word', async () => {
    const { opsActorNull } = await import('../src/contract/fixtures.generated.js');
    const base = opsProps.ready();
    const screen = await mount({ ...base, items: [opsActorNull], pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 }, totalCount: 1 });
    expect(lookOf(screen)).toBe('ready');
    expect(qa(screen, '[data-row-id]')).toBe(1);
    expect(q(screen, '[data-row-id]')?.getAttribute('data-row-id')).toBe(opsActorNull.invocationId);
    // The row part is a stub in this lane (the row work package draws the facts); the screen draws each row from this view.
    const actor = buildOpsRow(opsActorNull, OPS_VOCABULARY, null).facts.find((fact) => fact.term === OPS_COPY.termActor);
    expect(actor?.value).toBe(OPS_COPY.quietActor);
    expect(actor?.kind).toBe('quiet');
  });

  it('R-C: a page with skipped records shows the note and none of the skipped records exist in the DOM', async () => {
    const props = { ...opsProps.ready(), skippedCount: 3 };
    const screen = await mount(props);
    expect(textOf(screen, '[data-skipped-note]')).toContain('3 records in this project could not be read and are not shown.');
    expect(qa(screen, '[data-row-id]')).toBe(props.items.length);
    // the rows are exactly the items served: skipped records have no id here to find
    const ids = [...root(screen).querySelectorAll('[data-row-id]')].map((row) => row.getAttribute('data-row-id'));
    expect(ids).toEqual(props.items.map((item) => item.invocationId));
    // positive control: none skipped, no note
    const clean = await mount({ ...props, skippedCount: 0 });
    expect(qa(clean, '[data-skipped-note]')).toBe(0);
  });
});

describe('FR-034, D-09: focus moves to a heading only when the focused control is removed', () => {
  const retry = (screen: SkOpsScreen): HTMLElement | null => root(screen).querySelector<HTMLElement>('[data-look="error"] [data-retry]');
  const active = (screen: SkOpsScreen): Element | null => root(screen).activeElement;
  const heading = (screen: SkOpsScreen): Element | null => q(screen, '[data-focus-target]');
  async function updateAndSettle(screen: SkOpsScreen, props: Partial<OpsScreenProps>): Promise<void> {
    Object.assign(screen, props);
    await settle(screen);
  }
  const lastPageOf = (first: OpsScreenProps): Partial<OpsScreenProps> => {
    const last = opsPageOf('opsPageLast');
    return { items: [...first.items, ...last.items], pageInfo: last.pageInfo };
  };

  it('the last page removes the focused Load more: focus lands on the section heading', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    const control = q(screen, '[data-load-more]') as HTMLElement;
    control.focus();
    expect(active(screen)).toBe(control);
    await updateAndSettle(screen, lastPageOf(first));
    expect(qa(screen, '[data-load-more]')).toBe(0);
    expect(active(screen)).toBe(heading(screen));
    expect(heading(screen)?.tagName).toBe('H2');
    expect(heading(screen)?.textContent?.trim()).toBe(OPS_COPY.sectionHeading);
  });

  it('negative direction: Load more kept (busy, or more rows with a next page) keeps focus on it, the heading is not taken', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    const control = q(screen, '[data-load-more]') as HTMLElement;
    control.focus();
    await updateAndSettle(screen, { loadingMore: true });
    expect(q(screen, '[data-load-more]')).toBe(control);
    expect(active(screen)).toBe(control);
    await updateAndSettle(screen, { loadingMore: false, items: [...first.items, ...opsProps.longPage(2).items.slice(0, 1).map((item) => ({ ...item, invocationId: 'extra-row-1' }))] });
    expect(qa(screen, '[data-load-more]')).toBe(1);
    expect(active(screen)).not.toBe(heading(screen));
    expect(active(screen)?.hasAttribute('data-load-more')).toBe(true);
  });

  it('negative direction: an unrelated update keeps focus on the retry of a load-more error', async () => {
    const screen = await mount(opsProps.loadMoreError(null));
    const control = q(screen, '[data-load-more-error] + [data-retry]') as HTMLElement;
    control.focus();
    expect(active(screen)).toBe(control);
    await updateAndSettle(screen, { skippedCount: 2, totalCount: 300 });
    expect(active(screen)).toBe(control);
  });

  it('a state replacing the list moves focus to that state heading (empty, loading, error), each paired with a kept-control case', async () => {
    const targets: [string, Partial<OpsScreenProps>, string][] = [
      ['empty', opsProps.empty(), 'empty'],
      ['loading', opsProps.loading(), 'loading'],
      ['error', opsProps.error('opsRefusalUnreadable'), 'error'],
    ];
    let ran = 0;
    for (const [name, props, look] of targets) {
      const screen = await mount(opsProps.ready());
      (q(screen, '[data-load-more]') as HTMLElement).focus();
      await updateAndSettle(screen, props);
      expect(lookOf(screen), name).toBe(look);
      expect(active(screen), name).toBe(heading(screen));
      expect(heading(screen)?.closest(`[data-look="${look}"]`), name).not.toBeNull();
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('retry removed by a state change: focus moves to the new heading (error to loading, error to ready)', async () => {
    const first = opsProps.ready();
    let ran = 0;
    for (const [props, look] of [[opsProps.loading(), 'loading'], [first, 'ready']] as [Partial<OpsScreenProps>, string][]) {
      const screen = await mount(opsProps.error('opsRefusalUnreadable'));
      (retry(screen) as HTMLElement).focus();
      expect(active(screen)).toBe(retry(screen));
      await updateAndSettle(screen, props);
      expect(lookOf(screen)).toBe(look);
      expect(active(screen)).toBe(heading(screen));
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('does not move focus when it was elsewhere on the page (negative control: inside the screen it moves)', async () => {
    const first = opsProps.ready();
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.append(outside);
    const screen = await mount(first);
    outside.focus();
    expect(document.activeElement).toBe(outside);
    await updateAndSettle(screen, lastPageOf(first));
    expect(document.activeElement).toBe(outside);
    expect(active(screen)).toBeNull();
    // positive control on a fresh screen: the same update with the control focused moves focus to the heading
    const other = await mount(first);
    (q(other, '[data-load-more]') as HTMLElement).focus();
    await updateAndSettle(other, lastPageOf(first));
    expect(active(other)).toBe(heading(other));
  });

  it('does not take focus back when the user moved it away after the control was removed (the frame guard)', async () => {
    const first = opsProps.ready();
    const outside = document.createElement('button');
    document.body.append(outside);
    const screen = await mount(first);
    (q(screen, '[data-load-more]') as HTMLElement).focus();
    Object.assign(screen, lastPageOf(first));
    await screen.updateComplete;
    outside.focus();
    await settle(screen);
    expect(document.activeElement).toBe(outside);
    expect(active(screen)).toBeNull();
  });

  it('does not take focus when nothing was focused (the body), with a positive control', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    expect(document.activeElement).toBe(document.body);
    await updateAndSettle(screen, lastPageOf(first));
    expect(active(screen)).toBeNull();
    expect(document.activeElement).toBe(document.body);
    await updateAndSettle(screen, opsProps.ready());
    (q(screen, '[data-load-more]') as HTMLElement).focus();
    await updateAndSettle(screen, lastPageOf(first));
    expect(active(screen)).toBe(heading(screen));
  });

  it('rows are never focus targets: no row carries a tabindex', async () => {
    const screen = await mount(opsProps.ready());
    expect(qa(screen, '[data-row-id]')).toBe(opsProps.ready().items.length);
    expect(qa(screen, '[data-row-id][tabindex], [data-row-id] [tabindex]')).toBe(0);
  });

  it('error look order: the heading, then the retry (Tab reaches Retry once, with the ring), then the end', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    (heading(screen) as HTMLElement).focus();
    expect(active(screen)).toBe(heading(screen));
    await userEvent.tab();
    const control = retry(screen) as HTMLElement;
    expect(active(screen)).toBe(control);
    expect(control.shadowRoot?.querySelector('button')?.matches(':focus-visible')).toBe(true);
    expect(qa(screen, '[data-look="error"] sk-button')).toBe(1);
  });

  it('ready look with a load-more error: the heading, then the retry action in document order', async () => {
    const screen = await mount(opsProps.loadMoreError(null));
    (heading(screen) as HTMLElement).focus();
    await userEvent.tab();
    expect(active(screen)).toBe(q(screen, '[data-load-more-error] + [data-retry]'));
  });

  it('ready look with Load more: the heading, then Load more', async () => {
    const screen = await mount(opsProps.ready());
    (heading(screen) as HTMLElement).focus();
    await userEvent.tab();
    expect(active(screen)).toBe(q(screen, '[data-load-more]'));
  });
});

describe('FR-034, D-09 (WP07 fix round 1): the connected-control guard', () => {
  const active = (screen: SkOpsScreen): Element | null => root(screen).activeElement;
  const heading = (screen: SkOpsScreen): Element | null => q(screen, '[data-focus-target]');

  it('a focused control that is still connected is not replaced by the heading: blurred to the body before the frame, focus stays on the body', async () => {
    const screen = await mount(opsProps.ready());
    const control = q(screen, '[data-load-more]') as HTMLElement;
    control.focus();
    expect(active(screen)).toBe(control);
    screen.loadingMore = true;
    await screen.updateComplete;
    expect(control.isConnected).toBe(true);
    control.blur();
    expect(active(screen)).toBeNull();
    await settle(screen);
    expect(control.isConnected).toBe(true);
    expect(document.activeElement).toBe(document.body);
    expect(active(screen)).toBeNull();
    expect(active(screen)).not.toBe(heading(screen));
  });

  it('positive control: a control that was REMOVED does hand focus to the heading', async () => {
    const first = opsProps.ready();
    const screen = await mount(first);
    const control = q(screen, '[data-load-more]') as HTMLElement;
    control.focus();
    const last = opsPageOf('opsPageLast');
    Object.assign(screen, { items: [...first.items, ...last.items], pageInfo: last.pageInfo });
    await settle(screen);
    expect(control.isConnected).toBe(false);
    expect(active(screen)).toBe(heading(screen));
  });
});
