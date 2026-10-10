// The polite live region of the Projects screen equals what is on screen after every update (NFR-012, D-14, FR-022): loading,
// ready ("N projects"), empty, error, and per-entry transitions only for entries whose kind changed. A late or mismatched project
// counts as not loaded and never announces ready. Each case reads the visible text next to the announcement.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { NOW, rowErrorEntries, rowLoadingEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { ENTRY_ERROR_TEXT, ENTRY_LOADING_TEXT, LIST_EMPTY_TITLE, LIST_ERROR_BODY, LIST_LOADING_TEXT, projectCountText } from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

/** The `project` member of an entry as a spread, so an absent one stays absent (exact optional property types). */
const projectOf = (entry: ProjectEntry): Pick<ProjectEntry, 'project'> => (entry.project === undefined ? {} : { project: entry.project });

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkProjectsScreen> = {}): Promise<SkProjectsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  return screen;
}

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const live = (screen: SkProjectsScreen): string => text(root(screen).querySelector('[data-live]'));
/** What the person sees that the region speaks about: the toolbar count, or the panel or the error text of the state. */
const shown = (screen: SkProjectsScreen): string => text(root(screen).querySelector('[data-count]') ?? root(screen).querySelector('[data-region="state"]'));
async function update(screen: SkProjectsScreen, props: Partial<SkProjectsScreen>): Promise<void> {
  Object.assign(screen, props);
  await settle(screen);
}

describe('NFR-012: the region text equals what is on screen, state by state', () => {
  it('is empty at the first render, whatever the state', async () => {
    let ran = 0;
    for (const props of [{ status: 'loading', entries: [] }, { status: 'ready' }, { status: 'empty', entries: [] }, { status: 'error', entries: [] }] as Array<Partial<SkProjectsScreen>>) {
      const screen = await mount(props);
      expect(live(screen), String(props.status)).toBe('');
      expect(root(screen).querySelectorAll('[data-live][role="status"][aria-live="polite"]')).toHaveLength(1);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(4);
  });

  it('follows loading, ready, empty, error and loading again, each equal to the words shown', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    expect(shown(screen)).toContain(LIST_LOADING_TEXT);
    await update(screen, { status: 'ready', entries: threeEntries() });
    expect(live(screen)).toBe(projectCountText(3));
    expect(shown(screen)).toContain(projectCountText(3));
    await update(screen, { status: 'empty', entries: [] });
    expect(live(screen)).toBe(LIST_EMPTY_TITLE);
    expect(shown(screen)).toContain(LIST_EMPTY_TITLE);
    await update(screen, { status: 'error', entries: [] });
    expect(live(screen)).toBe(LIST_ERROR_BODY);
    expect(shown(screen)).toContain(LIST_ERROR_BODY);
    await update(screen, { status: 'loading' });
    expect(live(screen)).toBe(LIST_LOADING_TEXT);
    expect(shown(screen)).toContain(LIST_LOADING_TEXT);
  });

  it('says the host error message when the host gave one, and the count of one project in the singular', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    await update(screen, { status: 'error', errorMessage: 'The registry is offline' });
    expect(live(screen)).toBe('The registry is offline');
    expect(shown(screen)).toContain('The registry is offline');
    await update(screen, { status: 'ready', entries: threeEntries().slice(0, 1), errorMessage: '' });
    expect(live(screen)).toBe('1 project');
    expect(shown(screen)).toBe('1 project');
  });

  it('says nothing for an update that changes nothing on screen, and the new count when only the number of entries moves', async () => {
    const screen = await mount();
    await update(screen, { status: 'loading', entries: [] });
    await update(screen, { status: 'ready', entries: threeEntries() });
    const before = root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq');
    // Same content, new objects and a new clock: the text on screen differs only by the relative time, the region stays as it was.
    await update(screen, { entries: threeEntries(), now: '2026-10-03T09:31:00Z' });
    expect(live(screen)).toBe(projectCountText(3));
    expect(root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq')).toBe(before);
    // Positive control: a changed count is spoken.
    await update(screen, { entries: threeEntries().slice(0, 2) });
    expect(live(screen)).toBe(projectCountText(2));
    expect(shown(screen)).toBe(projectCountText(2));
  });
});

describe('NFR-012: per-entry transitions only for entries whose kind changed', () => {
  it('speaks the one entry that went from loading to error, and not the siblings that did not change', async () => {
    const screen = await mount({ entries: rowLoadingEntries() });
    const next = rowLoadingEntries();
    next[1] = { ...(next[1] as ProjectEntry), state: 'error' };
    await update(screen, { entries: next });
    expect(live(screen)).toBe(`tidal-index. ${ENTRY_ERROR_TEXT}`);
    expect(live(screen)).not.toContain('harbor-ledger');
    expect(live(screen)).not.toContain('quartz-notes');
    // The words are on screen in that row.
    expect(text(root(screen).querySelector('li[data-key="tidal-index"] [data-state-line]'))).toBe(ENTRY_ERROR_TEXT);
  });

  it('speaks the accessible name of an entry that arrived as a row, and nothing about an entry that stays failed', async () => {
    const screen = await mount({ entries: rowErrorEntries() });
    const [first, failed, third] = rowErrorEntries() as [ProjectEntry, ProjectEntry, ProjectEntry];
    const arrived: ProjectEntry = { key: failed.key, location: failed.location, ...projectOf(threeEntries()[1] as ProjectEntry) };
    await update(screen, { entries: [first, arrived, third] });
    expect(live(screen)).toBe('meadow-sync, schema drift, 57 Missions');
    const afterArrival = root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq');
    // Positive control: an entry that stays failed through an update speaks nothing, while the one above spoke.
    const stay = await mount({ entries: rowErrorEntries() });
    await update(stay, { entries: rowErrorEntries() });
    expect(live(stay)).toBe('');
    expect(afterArrival).not.toBeNull();
  });

  it('counts a late or mismatched project as not loaded: it never announces ready or a Mission count while its state says loading', async () => {
    const [ready] = threeEntries() as [ProjectEntry];
    const late: ProjectEntry = { ...ready, state: 'loading' };
    const screen = await mount({ entries: [late] });
    expect(text(root(screen).querySelector('li[data-key="harbor-ledger"] [data-state-line]'))).toBe(ENTRY_LOADING_TEXT);
    expect(root(screen).querySelectorAll('li[data-key="harbor-ledger"] [data-side]')).toHaveLength(0);
    await update(screen, { now: '2026-10-03T09:31:00Z' });
    expect(live(screen)).toBe('');
    // The late project becomes true: only then is the row announced, by its accessible name.
    await update(screen, { entries: [{ ...ready }] });
    expect(live(screen)).toBe('harbor-ledger, healthy, 439 Missions');
  });

  it('lets the whole-list state win over entry states: loading speaks the list, never an entry', async () => {
    const screen = await mount();
    await update(screen, { status: 'loading', entries: rowErrorEntries() });
    expect(live(screen)).toBe(LIST_LOADING_TEXT);
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
    expect(live(screen)).not.toContain('tidal-index');
  });
});

describe('TESTS-002: a changed error message is announced while the state stays error', () => {
  it('announces first, then second; a re-render with the same message stays silent (control)', async () => {
    const screen = await mount({ status: 'ready' });
    await update(screen, { status: 'error', errorMessage: 'first', entries: [] });
    expect(live(screen)).toBe('first');
    expect(shown(screen)).toContain('first');
    const seq = (): string | null => root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? null;
    const before = seq();
    await update(screen, { errorMessage: 'second' });
    expect(live(screen)).toBe('second');
    expect(shown(screen)).toContain('second');
    expect(seq()).not.toBe(before);
    // Control: the same message again changes nothing, so nothing is announced.
    const afterSecond = seq();
    await update(screen, { errorMessage: 'second', now: NOW });
    expect(live(screen)).toBe('second');
    expect(seq()).toBe(afterSecond);
  });
});
