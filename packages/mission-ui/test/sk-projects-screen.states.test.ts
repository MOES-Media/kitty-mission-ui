// The states of the Projects screen (FR-011, FR-012, FR-014, FR-022, PR-12..PR-17, PR-19, NFR-010, NFR-012): per-entry
// loading, error and unavailable forms, the whole-list states (the whole-list status wins), the read-only notice, and the live
// region text equal to what is shown.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { renderListState, renderNotice } from '../src/elements/sk-projects-screen/state-parts.js';
import { NOW, rowErrorEntries, rowLoadingEntries, rowUnavailableEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import {
  ENTRY_ERROR_TEXT,
  ENTRY_LOADING_TEXT,
  ENTRY_RETRY_LABEL,
  ENTRY_UNAVAILABLE_TEXT,
  LIST_EMPTY_BODY,
  LIST_EMPTY_TITLE,
  LIST_ERROR_BODY,
  LIST_LOADING_TEXT,
  READ_ONLY_NOTICE,
  UNNAMED_PROJECT_TEXT,
  projectCountText,
} from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

/** The measured literals assume the bundled faces: wait for them, and fail loudly if one did not load (TESTS-001). */
beforeAll(async () => {
  for (const face of ['400 14px "Inter"', '600 14px "Inter"', '700 24px "Falling Sky"']) {
    const loaded = await document.fonts.load(face);
    expect(loaded.length, face).toBeGreaterThan(0);
    expect(loaded.every((font) => font.status === 'loaded'), face).toBe(true);
  }
  await document.fonts.ready;
});

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-button, sk-notice, sk-section-header') ?? []).map((el) => el.updateComplete));
  return screen;
}

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const live = (screen: SkProjectsScreen): string => text(root(screen).querySelector('[data-live]'));
const rowOf = (screen: SkProjectsScreen, key: string): HTMLElement => one(root(screen), `li[data-key="${key}"]`);
const regions = (screen: SkProjectsScreen): string[] => Array.from(root(screen).querySelectorAll('[data-region]')).map((el) => el.getAttribute('data-region') ?? '');

describe('PR-12: one row loading while the others are ready', () => {
  it('keeps name and location, draws a busy indication in that row only, and is not a control', async () => {
    const screen = await mount({ entries: rowLoadingEntries() });
    const row = rowOf(screen, 'tidal-index');
    const box = one<HTMLElement>(row, 'sk-action-row');
    expect(box.getAttribute('aria-busy')).toBe('true');
    expect(text(one(row, '[slot="title"]'))).toBe('tidal-index');
    expect(text(one(row, '[slot="supporting"]'))).toBe('~/work/tidal-index');
    expect(text(one(row, '[data-state-line]'))).toBe(ENTRY_LOADING_TEXT);
    expect(row.querySelectorAll('progress')).toHaveLength(1);
    expect(box.shadowRoot?.querySelectorAll('button')).toHaveLength(0);
    // Positive control: the ready siblings carry no busy mark and no progress.
    const sibling = rowOf(screen, 'harbor-ledger');
    expect(one<HTMLElement>(sibling, 'sk-action-row').hasAttribute('aria-busy')).toBe(false);
    expect(sibling.querySelectorAll('progress')).toHaveLength(0);
    expect(root(screen).querySelectorAll('progress')).toHaveLength(1);
  });

  it('does not announce a ready for an entry that is still loading, and announces the failed one when it changes', async () => {
    const screen = await mount({ entries: rowLoadingEntries() });
    expect(live(screen)).toBe('');
    const next = rowLoadingEntries();
    next[1] = { ...(next[1] as ProjectEntry), state: 'error' };
    screen.entries = next;
    await settle(screen);
    expect(live(screen)).toBe(`tidal-index. ${ENTRY_ERROR_TEXT}`);
    expect(live(screen)).not.toContain('Mission');
  });
});

describe('PR-13, PR-14: a failed and an unavailable row keep what the host knows', () => {
  it('draws the generic sentence and a retry control whose accessible name includes the project name, for an error row', async () => {
    const screen = await mount({ entries: rowErrorEntries() });
    const row = rowOf(screen, 'tidal-index');
    expect(text(one(row, '[slot="title"]'))).toBe('tidal-index');
    expect(text(one(row, '[slot="supporting"]'))).toBe('~/work/tidal-index');
    expect(text(one(row, '[data-state-line]'))).toBe(ENTRY_ERROR_TEXT);
    const retry = one<HTMLElement>(row, 'sk-button');
    expect(retry.getAttribute('variant')).toBe('secondary');
    expect(retry.getAttribute('label')).toBe(`${ENTRY_RETRY_LABEL}, tidal-index`);
    expect(text(retry)).toBe(ENTRY_RETRY_LABEL);
    expect(page.getByRole('button', { name: `${ENTRY_RETRY_LABEL}, tidal-index` }).elements()).toHaveLength(1);
    expect(root(screen).querySelectorAll('li sk-button')).toHaveLength(1);
  });

  it('draws only the word for an unavailable row: no retry, no control, not openable', async () => {
    const screen = await mount({ entries: rowUnavailableEntries() });
    const row = rowOf(screen, 'tidal-index');
    expect(text(one(row, '[data-state-line]'))).toBe(ENTRY_UNAVAILABLE_TEXT);
    expect(row.querySelectorAll('sk-button')).toHaveLength(0);
    expect(row.querySelectorAll('progress')).toHaveLength(0);
    expect(one<HTMLElement>(row, 'sk-action-row').shadowRoot?.querySelectorAll('button')).toHaveLength(0);
    // Positive control: the same list's error variant does draw a retry.
    const failing = await mount({ entries: rowErrorEntries() });
    expect(rowOf(failing, 'tidal-index').querySelectorAll('sk-button')).toHaveLength(1);
  });

  it('shows an entry without a name by its location alone, and without both by the generic word', async () => {
    const screen = await mount({
      entries: [
        { key: 'a', location: '~/work/only-location', state: 'unavailable' },
        { key: 'b', location: '', state: 'unavailable' },
        { key: 'c', location: '~/work/named', name: 'Named', state: 'unavailable' },
      ],
    });
    expect(text(one(rowOf(screen, 'a'), '[slot="title"]'))).toBe('~/work/only-location');
    expect(rowOf(screen, 'a').querySelectorAll('[slot="supporting"]')).toHaveLength(0);
    expect(text(one(rowOf(screen, 'b'), '[slot="title"]'))).toBe(UNNAMED_PROJECT_TEXT);
    expect(rowOf(screen, 'b').querySelectorAll('[slot="supporting"]')).toHaveLength(0);
    expect(text(one(rowOf(screen, 'c'), '[slot="supporting"]'))).toBe('~/work/only-location'.replace('only-location', 'named'));
  });

  it('counts a late or mismatched project as not loaded: an entry state wins over a present project, a nameless project is an error', async () => {
    const [ready] = threeEntries() as [ProjectEntry];
    const screen = await mount({
      entries: [
        { ...ready, key: 'late', state: 'loading' },
        { key: 'none', location: '~/work/none' },
        { ...ready, key: 'blank', project: { ...(ready.project as NonNullable<ProjectEntry['project']>), name: '' } },
        ready,
      ],
    });
    expect(rowOf(screen, 'late').querySelectorAll('progress')).toHaveLength(1);
    expect(text(one(rowOf(screen, 'none'), '[data-state-line]'))).toBe(ENTRY_ERROR_TEXT);
    expect(text(one(rowOf(screen, 'blank'), '[data-state-line]'))).toBe(ENTRY_ERROR_TEXT);
    expect(rowOf(screen, ready.key).querySelectorAll('sk-pill-tag')).toHaveLength(1);
    expect(root(screen).querySelectorAll('li sk-pill-tag')).toHaveLength(1);
    // The live region names no Mission count for an entry that is not loaded.
    screen.entries = [{ ...ready, key: 'late', state: 'loading' }];
    await settle(screen);
    expect(live(screen)).toBe(projectCountText(1));
  });
});

describe('PR-16: the whole list loading', () => {
  it('draws one busy panel under the header, no rows, no count and no notice', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    expect(regions(screen)).toEqual(['header', 'toolbar', 'state']);
    const panel = one<HTMLElement>(root(screen), '[data-state-panel]');
    expect(panel.getAttribute('aria-busy')).toBe('true');
    expect(panel.getAttribute('data-kind')).toBe('loading');
    expect(text(panel)).toBe(LIST_LOADING_TEXT);
    expect(panel.querySelectorAll('progress')).toHaveLength(1);
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[data-count]')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[data-region="notice"]')).toHaveLength(0);
  });

  it('wins over per-entry states and entries: the whole-list status replaces the list', async () => {
    const screen = await mount({ status: 'loading', entries: rowErrorEntries() });
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
    expect(root(screen).querySelectorAll('sk-button[label]')).toHaveLength(0);
    expect(live(screen)).toBe('');
    // Positive control: the same entries as a ready list do draw their rows.
    const ready = await mount({ status: 'ready', entries: rowErrorEntries() });
    expect(root(ready).querySelectorAll('li')).toHaveLength(3);
  });
});

describe('PR-17: the whole list in error', () => {
  it('draws a danger notice with the host-neutral sentence and a retry beside it, no rows, no count, no notice', async () => {
    const screen = await mount({ status: 'error', entries: [] });
    expect(regions(screen)).toEqual(['header', 'toolbar', 'state']);
    const notice = one<HTMLElement>(root(screen), 'sk-notice[tone="danger"]');
    expect(text(notice)).toBe(LIST_ERROR_BODY);
    const retry = one<HTMLElement>(root(screen), '[data-region="state"] sk-button');
    expect(text(retry)).toBe(ENTRY_RETRY_LABEL);
    expect(retry.closest('sk-notice')).toBeNull();
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
    expect(live(screen)).toBe('');
  });

  it('shows the host error text instead of the default, and the live region says the same', async () => {
    const screen = await mount({ status: 'loading', entries: [], errorMessage: 'The host could not read the recent list.' });
    screen.status = 'error';
    await settle(screen);
    expect(text(one(root(screen), 'sk-notice'))).toBe('The host could not read the recent list.');
    expect(live(screen)).toBe('The host could not read the recent list.');
  });
});

describe('PR-15: empty', () => {
  it('draws the neutral empty form with the header as the call to action (no second button), and the notice', async () => {
    const screen = await mount({ status: 'empty', entries: [] });
    expect(regions(screen)).toEqual(['header', 'toolbar', 'state', 'notice']);
    const panel = one<HTMLElement>(root(screen), '[data-state-panel]');
    expect(panel.getAttribute('data-kind')).toBe('empty');
    expect(text(one(panel, 'h2'))).toBe(LIST_EMPTY_TITLE);
    expect(text(panel)).toContain(LIST_EMPTY_BODY);
    expect(panel.querySelectorAll('sk-button')).toHaveLength(0);
    expect(root(screen).querySelectorAll('sk-button')).toHaveLength(1);
    expect(root(screen).querySelectorAll('[data-count]')).toHaveLength(0);
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
  });

  it('collapses an unknown status to the empty form', async () => {
    const screen = await mount({ status: 'bogus' as unknown as SkProjectsScreen['status'], entries: [] });
    expect(text(one(root(screen), '[data-state-panel] h2'))).toBe(LIST_EMPTY_TITLE);
  });
});

describe('PR-19: the read-only notice', () => {
  it('draws the info notice with the defaults copy in every state that shows rows or the empty form, and in no other', async () => {
    const shown: Record<string, boolean> = {};
    for (const status of ['ready', 'empty', 'loading', 'error'] as const) {
      const screen = await mount({ status, entries: status === 'ready' ? threeEntries() : [] });
      const notices = root(screen).querySelectorAll('[data-region="notice"]');
      shown[status] = notices.length === 1;
      if (notices.length === 1) {
        const notice = one<HTMLElement>(notices[0] as Element, 'sk-notice');
        expect(notice.getAttribute('tone')).toBe('info');
        expect(text(notice)).toBe(READ_ONLY_NOTICE);
      }
      document.body.replaceChildren();
    }
    expect(shown).toEqual({ ready: true, empty: true, loading: false, error: false });
  });

  it('is the one place that says the view is read-only, and the screen draws no write control', async () => {
    const screen = await mount();
    expect(root(screen).querySelectorAll('input, select, textarea')).toHaveLength(0);
    expect(root(screen).querySelectorAll('sk-form-input')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[data-region="notice"] sk-button')).toHaveLength(0);
  });
});

describe('the live region equals what is shown (NFR-012)', () => {
  it('announces the words of each whole-list state after the change, and the count for ready', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    expect(live(screen)).toBe('');
    const expected: Array<[SkProjectsScreen['status'], ProjectEntry[], string]> = [
      ['ready', threeEntries(), projectCountText(3)],
      ['empty', [], LIST_EMPTY_TITLE],
      ['loading', [], LIST_LOADING_TEXT],
      ['error', [], LIST_ERROR_BODY],
    ];
    let ran = 0;
    for (const [status, entries, words] of expected) {
      screen.entries = entries;
      screen.status = status;
      await settle(screen);
      expect(live(screen), status).toBe(words);
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('the parts called directly', () => {
  it('renderListState draws each of the three forms and renderNotice the notice; the retry reaches its handler', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let retries = 0;
    const ctx = { errorMessage: '', onRetry: () => (retries += 1) };
    render(renderListState('error', ctx), host);
    const retry = one<HTMLElement & { updateComplete: Promise<unknown> }>(host, 'sk-button');
    await retry.updateComplete;
    retry.click();
    expect(retries).toBe(1);
    render(renderListState('loading', ctx), host);
    expect(host.querySelectorAll('progress')).toHaveLength(1);
    render(renderListState('empty', ctx), host);
    expect(text(one(host, 'h2'))).toBe(LIST_EMPTY_TITLE);
    render(renderNotice(), host);
    expect(text(one(host, 'sk-notice'))).toBe(READ_ONLY_NOTICE);
  });
});

describe('WP06 ruling: #4\'s progress family and panel heading', () => {
  it('draws the loading bars with the library progress classes (the adopted sheet styles them), in the panel and in a loading row', async () => {
    const whole = await mount({ status: 'loading', entries: [] });
    const bar = one<HTMLProgressElement>(root(whole), '[data-state-panel] progress.sk-progress__bar');
    expect(bar.hasAttribute('value')).toBe(false);
    expect(getComputedStyle(bar).height).toBe('4px');
    expect(one<HTMLLabelElement>(root(whole), 'label.sk-progress__label').htmlFor).toBe(bar.id);
    expect(text(one(root(whole), 'label.sk-progress__label'))).toBe(LIST_LOADING_TEXT);
    document.body.replaceChildren();
    const rowed = await mount({ entries: rowLoadingEntries() });
    const rowBar = one<HTMLProgressElement>(rowOf(rowed, 'tidal-index'), 'progress.sk-progress__bar');
    expect(getComputedStyle(rowBar).height).toBe('4px');
    expect(one<HTMLLabelElement>(rowOf(rowed, 'tidal-index'), 'label').htmlFor).toBe(rowBar.id);
    expect(root(rowed).querySelectorAll('progress:not(.sk-progress__bar)')).toHaveLength(0);
  });

  it('draws the empty panel heading at 18px, #4\'s heading size', async () => {
    const screen = await mount({ status: 'empty', entries: [] });
    expect(getComputedStyle(one<HTMLElement>(root(screen), '[data-state-panel] h2')).fontSize).toBe('18px');
  });
});
