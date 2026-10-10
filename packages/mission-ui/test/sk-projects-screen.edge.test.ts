// The edge cases of the specification, one test each, every one with a paired control (spec.md "Edge Cases", NFR-009, FR-004
// to FR-010, FR-013). The eleven bullets of the list are named in EDGE_CASES and counted against it at the end.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import type { SkOpenProjectDialog } from '../src/elements/sk-open-project-dialog/sk-open-project-dialog.js';
import { LOCATION, mixedFolders, validProject } from '../src/elements/sk-open-project-dialog/fixtures.js';
import { NOW, fiftyEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { ENTRY_ERROR_TEXT, JUST_NOW_TEXT, LIST_LOADING_TEXT, NO_ACTIVITY_TEXT } from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

/** The bullets of the specification's Edge Cases list, in order; each is proven by the test whose name starts with it. */
const EDGE_CASES = [
  'mission-count',
  'activity-instants',
  'now-omitted',
  'long-texts',
  'handle-like-branch',
  'repeated-key',
  'project-and-state',
  'fifty-entries',
  'whole-list-loading',
  'dialog-independent',
  'vocabulary-name',
] as const;
const covered: string[] = [];

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
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-pill-tag') ?? []).map((el) => el.updateComplete));
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
const rowOf = (screen: SkProjectsScreen, key: string): HTMLElement => one(root(screen), `li[data-key="${key}"]`);
const base = (): ProjectEntry => threeEntries()[0] as ProjectEntry;
/** One entry of the first fixture with the given project overrides. */
function entry(key: string, overrides: Record<string, unknown>, extra: Partial<ProjectEntry> = {}): ProjectEntry {
  const first = base();
  if (first.project === undefined || first.project === null) throw new Error('fixture without a project');
  return { key, location: `~/work/${key}`, project: { ...first.project, name: key, ...overrides }, ...extra } as ProjectEntry;
}
/** The side text without the decorative arrow of an openable row (a glyph, hidden from assistive technology). */
const noArrow = (value: string): string => value.replace(/ →$/, '');
const sideOf = (screen: SkProjectsScreen, key: string): string => noArrow(text(one(rowOf(screen, key), '[data-side]')));
const activityOf = (screen: SkProjectsScreen, key: string): string => noArrow(text(one(rowOf(screen, key), '[data-activity]')));

describe('Edge cases of the specification', () => {
  it('mission-count: 0, 1 and a very large count read as given, with the plural from defaults', async () => {
    const counts = [0, 1, 2, 4096, 1234567];
    const screen = await mount({ entries: counts.map((count) => entry(`count-${count}`, { missionCount: count, lastActivityAt: '2026-10-03T07:30:00Z' })) });
    const texts = counts.map((count) => sideOf(screen, `count-${count}`));
    expect(texts).toEqual(['0 Missions active 2 hours ago', '1 Mission active 2 hours ago', '2 Missions active 2 hours ago', '4096 Missions active 2 hours ago', '1234567 Missions active 2 hours ago']);
    // Paired control: the singular is only for one.
    expect(texts.filter((value) => value.startsWith('1 Mission '))).toHaveLength(1);
    covered.push('mission-count');
  });

  it('activity-instants: an offset instant is compared as an instant, the future reads "just now", unparseable text is shown as given', async () => {
    const screen = await mount({
      entries: [
        entry('offset', { lastActivityAt: '2026-10-03T10:00:00+02:00' }),
        entry('same-instant', { lastActivityAt: '2026-10-03T08:00:00Z' }),
        entry('future', { lastActivityAt: '2026-10-04T09:30:00Z' }),
        entry('unparseable', { lastActivityAt: 'sometime last week' }),
        entry('none', { lastActivityAt: null }),
      ],
    });
    expect(activityOf(screen, 'offset')).toBe(activityOf(screen, 'same-instant'));
    expect(activityOf(screen, 'offset')).toBe('active 1 hour ago');
    expect(activityOf(screen, 'future')).toBe(`active ${JUST_NOW_TEXT}`);
    expect(activityOf(screen, 'unparseable')).toBe('active sometime last week');
    // Paired control: no activity is its own words, not "active".
    expect(activityOf(screen, 'none')).toBe(NO_ACTIVITY_TEXT);
    covered.push('activity-instants');
  });

  it('now-omitted: the ISO string is shown as given, and the same entry reads relative once the host gives a clock', async () => {
    const screen = await mount({ now: null, entries: [entry('clockless', { lastActivityAt: '2026-10-03T07:30:00Z' })] });
    expect(activityOf(screen, 'clockless')).toBe('active 2026-10-03T07:30:00Z');
    screen.now = NOW;
    await settle(screen);
    expect(activityOf(screen, 'clockless')).toBe('active 2 hours ago');
    covered.push('now-omitted');
  });

  it('long-texts: a 64-character version, a 255-character branch, a very long name and location stay inside the column at every width, in full in `title`', async () => {
    const version = '1'.repeat(64);
    const branch = `topic/${'b'.repeat(249)}`;
    const name = `name-${'n'.repeat(120)}`;
    const location = `~/work/${'l'.repeat(200)}`;
    expect(branch).toHaveLength(255);
    let ran = 0;
    for (const width of [1280, 800, 360]) {
      const screen = await mount({ entries: [entry(name, { specKittyVersion: version, currentBranch: branch }, { location }), base()] }, width);
      expect(document.documentElement.scrollWidth, `${width} page`).toBeLessThanOrEqual(document.documentElement.clientWidth);
      const column = one<HTMLElement>(root(screen), '[data-narrow]').getBoundingClientRect();
      for (const box of Array.from(root(screen).querySelectorAll('sk-action-row'))) {
        const rect = box.getBoundingClientRect();
        expect(rect.left, `${width}`).toBeGreaterThanOrEqual(column.left - 1);
        expect(rect.right, `${width}`).toBeLessThanOrEqual(column.right + 1);
      }
      const row = rowOf(screen, name);
      expect(one(row, '[slot="title"]').getAttribute('title')).toBe(name);
      expect(one(row, '[slot="reference"]').getAttribute('title')).toBe(`v${version}`);
      // The location line carries the full location and the full branch as text (it wraps, it is not cut).
      expect(text(one(row, '[data-location]'))).toBe(`${location} · ${branch}`);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(3);
    // Paired control: a short row has no `title`-only text to lose, and its location line is the short one.
    const short = await mount();
    expect(text(one(rowOf(short, 'harbor-ledger'), '[data-location]'))).toBe('~/work/harbor-ledger · main');
    covered.push('long-texts');
  });

  it('handle-like-branch: a branch that looks like a handle or a path is shown as served, not parsed', async () => {
    const screen = await mount({ entries: [entry('with-handle', { currentBranch: 'topic/example' }), entry('with-at', { currentBranch: '@example/feature' })] });
    expect(text(one(rowOf(screen, 'with-handle'), '[data-location]'))).toBe('~/work/with-handle · topic/example');
    expect(text(one(rowOf(screen, 'with-at'), '[data-location]'))).toBe('~/work/with-at · @example/feature');
    // Paired control: the plain branch of the fixture reads the same way, one segment after the location.
    expect(text(one(rowOf(await mount(), 'meadow-sync'), '[data-location]'))).toBe('~/work/meadow-sync · main');
    covered.push('handle-like-branch');
  });

  it('repeated-key: every entry is drawn, and the first matching key receives the event payload as given', async () => {
    const screen = await mount({ entries: [entry('twin', { name: 'twin-first' }), entry('twin', { name: 'twin-second' }), entry('solo', {})] });
    expect(root(screen).querySelectorAll('li')).toHaveLength(3);
    expect(Array.from(root(screen).querySelectorAll('li [slot="title"]')).map(text)).toEqual(['twin-first', 'twin-second', 'solo']);
    const seen: Array<CustomEvent<{ key: string }>> = [];
    screen.addEventListener('sk-open-project', (event) => seen.push(event as CustomEvent<{ key: string }>));
    const triggers = Array.from(root(screen).querySelectorAll('sk-action-row')).map((row) => one<HTMLButtonElement>(root(row), 'button'));
    expect(triggers).toHaveLength(3);
    triggers[1]?.click();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toEqual({ key: 'twin' });
    // Paired control: a unique key gives its own payload.
    triggers[2]?.click();
    expect(seen.map((event) => event.detail)).toEqual([{ key: 'twin' }, { key: 'solo' }]);
    expect(seen).toHaveLength(2);
    for (const event of seen) {
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.cancelable).toBe(false);
    }
    covered.push('repeated-key');
  });

  it('repeated-key twin: an openable row after a loading twin, or after a not-openable twin, still opens with exactly { key: dup }', async () => {
    for (const first of [entry('dup', {}, { state: 'loading' }), entry('dup', {}, { openable: false })]) {
      const screen = await mount({ entries: [first, entry('dup', { name: 'dup-openable' })] });
      const seen: Array<CustomEvent<unknown>> = [];
      screen.addEventListener('sk-open-project', (event) => seen.push(event as CustomEvent<unknown>));
      const rows = Array.from(root(screen).querySelectorAll('sk-action-row'));
      expect(rows).toHaveLength(2);
      one<HTMLButtonElement>(root(rows[1] as HTMLElement), 'button').click();
      expect(seen.map((event) => event.detail)).toStrictEqual([{ key: 'dup' }]);
      document.body.replaceChildren();
    }
  });

  it('repeated-key retry: Retry on the second of two error rows with the key twin emits exactly { target: project, key: twin }', async () => {
    const screen = await mount({ entries: [entry('twin', {}, { state: 'error', name: 'twin-first' }), entry('twin', {}, { state: 'error', name: 'twin-second' })] });
    const seen: Array<CustomEvent<unknown>> = [];
    screen.addEventListener('sk-retry-load', (event) => seen.push(event as CustomEvent<unknown>));
    const retries = Array.from(root(screen).querySelectorAll<HTMLElement>('sk-button[slot="controls"]'));
    expect(retries).toHaveLength(2);
    one<HTMLButtonElement>(root(retries[1] as HTMLElement), 'button').click();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.detail).toStrictEqual({ target: 'project', key: 'twin' });
  });

  it('keyless error row: no Retry is drawn and the sentence is shown (control: the keyed sibling draws Retry)', async () => {
    const screen = await mount({ entries: [entry('', {}, { state: 'error', name: 'keyless' }), entry('keyed', {}, { state: 'error', name: 'keyed' })] });
    const rows = Array.from(root(screen).querySelectorAll('li'));
    expect(rows).toHaveLength(2);
    expect(text(rows[0] ?? null)).toContain(ENTRY_ERROR_TEXT);
    expect(rows[0]?.querySelectorAll('sk-button')).toHaveLength(0);
    // Control: the keyed sibling shows the same sentence and the control.
    expect(text(rows[1] ?? null)).toContain(ENTRY_ERROR_TEXT);
    expect(rows[1]?.querySelectorAll('sk-button[slot="controls"]')).toHaveLength(1);
  });

  it('project-and-state: a status other than none wins over a stale project, and the project wins only when the status is absent', async () => {
    const stale = entry('stale', { missionCount: 9 }, { state: 'error' });
    const fresh = entry('fresh', { missionCount: 9 });
    const screen = await mount({ entries: [stale, fresh] });
    expect(one(rowOf(screen, 'stale'), 'sk-action-row').getAttribute('data-row-kind')).toBe('error');
    expect(rowOf(screen, 'stale').querySelectorAll('[data-side]')).toHaveLength(0);
    expect(text(rowOf(screen, 'stale'))).not.toContain('Missions');
    expect(one(rowOf(screen, 'fresh'), 'sk-action-row').getAttribute('data-row-kind')).toBe('row');
    expect(sideOf(screen, 'fresh')).toContain('9 Missions');
    covered.push('project-and-state');
  });

  it('fifty-entries: plain DOM, no virtualization (the budget and the tab order are in the performance test)', async () => {
    const screen = await mount({ entries: fiftyEntries() });
    expect(root(screen).querySelectorAll('li')).toHaveLength(50);
    expect(root(screen).querySelectorAll('li sk-action-row')).toHaveLength(50);
    // Paired control: three entries draw three.
    expect(root(await mount()).querySelectorAll('li')).toHaveLength(3);
    covered.push('fifty-entries');
  });

  it('whole-list-loading: the whole-list state wins over entry states, which draw nothing', async () => {
    const entries = [{ ...base(), state: 'error' as const }, entry('other', {}, { state: 'loading' })];
    const screen = await mount({ status: 'loading', entries });
    expect(root(screen).querySelectorAll('li')).toHaveLength(0);
    expect(text(root(screen).querySelector('[data-region="state"]'))).toContain(LIST_LOADING_TEXT);
    expect(root(screen).querySelectorAll('[data-region="state"] sk-button')).toHaveLength(0);
    // Paired control: the same entries under a ready list draw their rows.
    screen.status = 'ready';
    await settle(screen);
    expect(root(screen).querySelectorAll('li')).toHaveLength(2);
    covered.push('whole-list-loading');
  });

  it('dialog-independent: the dialog stays open and unchanged while the list changes', async () => {
    const screen = await mount();
    const dialog = document.createElement('sk-open-project-dialog') as SkOpenProjectDialog;
    Object.assign(dialog, { open: true, location: LOCATION, folders: mixedFolders, selected: validProject.location });
    document.body.append(dialog);
    await dialog.updateComplete;
    const open = dialog.shadowRoot?.querySelector('dialog');
    expect(open?.open).toBe(true);
    const options = dialog.shadowRoot?.querySelectorAll('[role="option"]').length ?? 0;
    expect(options).toBeGreaterThan(0);
    screen.status = 'error';
    screen.entries = [];
    await settle(screen);
    screen.status = 'ready';
    screen.entries = fiftyEntries();
    await settle(screen);
    expect(dialog.open).toBe(true);
    expect(dialog.selected).toBe(validProject.location);
    expect(dialog.shadowRoot?.querySelector('dialog')?.open).toBe(true);
    expect(dialog.shadowRoot?.querySelectorAll('[role="option"]').length).toBe(options);
    // Paired control: the list really changed under it.
    expect(root(screen).querySelectorAll('li')).toHaveLength(50);
    covered.push('dialog-independent');
  });

  it('vocabulary-name: a project named like a vocabulary word shows as a name and is never read as a health value', async () => {
    const screen = await mount({ entries: [entry('healthy', { health: 'schema_drift' }), entry('schema_drift', { health: 'healthy' }), entry('plain', { health: 'healthy' })] });
    const pill = (key: string): string => text(one(rowOf(screen, key), 'sk-pill-tag'));
    expect(text(one(rowOf(screen, 'healthy'), '[slot="title"]'))).toBe('healthy');
    expect(pill('healthy')).toBe('schema drift');
    expect(text(one(rowOf(screen, 'schema_drift'), '[slot="title"]'))).toBe('schema_drift');
    expect(pill('schema_drift')).toBe('healthy');
    expect(one(rowOf(screen, 'healthy'), 'sk-pill-tag').getAttribute('status')).toBe('attention');
    expect(one(rowOf(screen, 'schema_drift'), 'sk-pill-tag').getAttribute('status')).toBe('success');
    // Paired control: an ordinary name with the same health reads the same pill.
    expect(pill('plain')).toBe('healthy');
    covered.push('vocabulary-name');
  });

  it('counts the edge cases by equality against the specification list', () => {
    expect(EDGE_CASES).toHaveLength(11);
    expect([...covered].sort()).toEqual([...EDGE_CASES].sort());
  });
});
