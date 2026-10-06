// Owned files (IC-06, T040): the body of the `owned-files` panel. The part is drawn alone (the rows and the all-unknown
// flag come from `filesView`) and through the screen (which owns the panel and feeds the part from `ResolvedLists`).
// Every absence test is paired with its present sibling; counts are asserted with equality.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { renderOwnedFiles } from '../src/elements/sk-work-package-screen/files-parts.js';
import { pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { PairingId, WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { CHANGE_STATE_BADGES, CHANGE_STATE_UNAVAILABLE_NOTE, GLOB_MARKER, NO_FILES_TEXT, UNKNOWN_CHANGE_STATE } from '../src/defaults/index.js';
import { filesView } from '../src/logic/index.js';
import type { ResolvedFile } from '../src/logic/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const file = (pattern: string, changeState: string | null, isGlob = false): ResolvedFile => ({ pattern, isGlob, changeState });
const CHANGED = Object.keys(CHANGE_STATE_BADGES)[0] ?? '';
const UNCHANGED = Object.keys(CHANGE_STATE_BADGES)[1] ?? '';

function draw(files: ResolvedFile[]): HTMLElement {
  const box = document.createElement('div');
  document.body.append(box);
  render(renderOwnedFiles(filesView(files)), box);
  return box;
}
const rows = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('ul > li')];
const pills = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('sk-pill-tag:not([data-glob])')];
const noteOf = (box: ParentNode): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('[data-note]')];

describe('Owned files: rows', () => {
  it('draws one row per file in input order, the glob marker on the glob only, and the change-state word as a pill with its tone', () => {
    const box = draw([file('a/b.py', CHANGED), file('c.py', UNCHANGED), file('d/*.py', CHANGED, true)]);
    const list = rows(box);
    expect(list).toHaveLength(3);
    expect(list.map((li) => li.querySelector('[data-pattern]')?.textContent)).toEqual(['a/b.py', 'c.py', 'd/*.py']);
    expect(list.map((li) => li.querySelector('[data-glob]')?.textContent ?? null)).toEqual([null, null, GLOB_MARKER]);
    expect(pills(box).map((p) => p.textContent?.trim())).toEqual([CHANGE_STATE_BADGES[CHANGED]?.label, CHANGE_STATE_BADGES[UNCHANGED]?.label, CHANGE_STATE_BADGES[CHANGED]?.label]);
    expect(pills(box).map((p) => p.getAttribute('status'))).toEqual([CHANGE_STATE_BADGES[CHANGED]?.tone, CHANGE_STATE_BADGES[UNCHANGED]?.tone, CHANGE_STATE_BADGES[CHANGED]?.tone]);
    expect(noteOf(box)).toHaveLength(0);
  });

  it('shows a brace pattern as authored and carries the full text as a tooltip', () => {
    const pattern = 'src/example/{alpha,beta}/handler.py';
    const box = draw([file(pattern, CHANGED, true)]);
    const name = box.querySelector<HTMLElement>('[data-pattern]');
    expect(name?.textContent).toBe(pattern);
    expect(name?.getAttribute('title')).toBe(pattern);
  });

  it('collapses an all-unknown list to one note and no pill, paired with a mixed list that keeps the unknown row shown (WP-25)', () => {
    const all = draw([file('a.py', UNKNOWN_CHANGE_STATE), file('b/**', UNKNOWN_CHANGE_STATE, true)]);
    expect(rows(all)).toHaveLength(2);
    expect(pills(all)).toHaveLength(0);
    expect(noteOf(all)).toHaveLength(1);
    expect(noteOf(all)[0]?.textContent).toBe(CHANGE_STATE_UNAVAILABLE_NOTE);

    const mixed = draw([file('a.py', UNKNOWN_CHANGE_STATE), file('b.py', CHANGED)]);
    expect(rows(mixed)).toHaveLength(2);
    expect(pills(mixed).map((p) => p.textContent?.trim())).toEqual([CHANGE_STATE_BADGES[UNKNOWN_CHANGE_STATE]?.label, CHANGE_STATE_BADGES[CHANGED]?.label]);
    expect(noteOf(mixed)).toHaveLength(0);
  });

  it('shows a foreign state raw and neutral among known ones, and does not collapse the list', () => {
    const box = draw([file('a.py', CHANGED), file('b.py', 'renamed'), file('c.py', UNKNOWN_CHANGE_STATE)]);
    expect(pills(box).map((p) => p.textContent?.trim())).toEqual([CHANGE_STATE_BADGES[CHANGED]?.label, 'renamed', CHANGE_STATE_BADGES[UNKNOWN_CHANGE_STATE]?.label]);
    expect(pills(box)[1]?.getAttribute('status')).toBe('neutral');
    expect(noteOf(box)).toHaveLength(0);
    expect(box.textContent).not.toContain('undefined');
  });

  it('draws no badge and no note for a null state (the bare degradation), paired with the same files carrying a state', () => {
    const bare = draw([file('a.py', null), file('b.py', null)]);
    expect(rows(bare)).toHaveLength(2);
    expect(pills(bare)).toHaveLength(0);
    expect(noteOf(bare)).toHaveLength(0);

    const stated = draw([file('a.py', CHANGED), file('b.py', CHANGED)]);
    expect(pills(stated)).toHaveLength(2);
  });

  it('draws the empty form for no files and no list, paired with a non-empty list that draws no empty form', () => {
    const none = draw([]);
    expect(none.querySelector('ul')).toBeNull();
    expect(none.textContent).toContain(NO_FILES_TEXT);

    const some = draw([file('a.py', CHANGED)]);
    expect(some.querySelectorAll('ul')).toHaveLength(1);
    expect(some.textContent).not.toContain(NO_FILES_TEXT);
  });

  it('keeps the node identity of a row that stays when the first row goes and another row changes (rows are keyed by pattern)', () => {
    const box = document.createElement('div');
    document.body.append(box);
    const first = [file('a.py', CHANGED), file('b.py', UNCHANGED), file('c.py', CHANGED)];
    render(renderOwnedFiles(filesView(first)), box);
    const before = rows(box);
    expect(before).toHaveLength(3);
    const second = [file('b.py', CHANGED), file('c.py', CHANGED)];
    render(renderOwnedFiles(filesView(second)), box);
    const after = rows(box);
    expect(after).toHaveLength(2);
    // Keyed by pattern: the rows of b.py and c.py are the same nodes as before, a positional update would reuse the first.
    expect(after[0]).toBe(before[1]);
    expect(after[1]).toBe(before[2]);
    expect(after.includes(before[0] as HTMLElement)).toBe(false);
    expect(pills(box).map((p) => p.textContent?.trim())).toEqual([CHANGE_STATE_BADGES[CHANGED]?.label, CHANGE_STATE_BADGES[CHANGED]?.label]);
  });
});

describe('Owned files: through the screen', () => {
  async function mount(id: PairingId): Promise<SkWorkPackageScreen> {
    await page.viewport(1280, 900);
    const screen = document.createElement('sk-work-package-screen');
    Object.assign(screen, pairingProps(id) satisfies WpScreenProps);
    const box = document.createElement('div');
    document.body.append(box);
    render(workPackageFrame(html`${screen}`), box);
    await screen.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    return screen;
  }
  const body = (screen: SkWorkPackageScreen): HTMLElement => {
    const region = screen.shadowRoot?.querySelector<HTMLElement>('[data-region="owned-files"]');
    if (region === null || region === undefined) throw new Error('no owned-files region');
    return region;
  };

  it('WP-25: three rows, the glob marked, each with its state word; WP-26: one note and no pill; WP-27: the empty form', async () => {
    const mixed = body(await mount('WP-25'));
    expect(rows(mixed)).toHaveLength(3);
    expect(pills(mixed)).toHaveLength(3);
    expect(mixed.querySelectorAll('[data-glob]')).toHaveLength(1);
    document.body.replaceChildren();

    const unknown = body(await mount('WP-26'));
    expect(rows(unknown)).toHaveLength(3);
    expect(pills(unknown)).toHaveLength(0);
    expect(noteOf(unknown)).toHaveLength(1);
    document.body.replaceChildren();

    const none = body(await mount('WP-27'));
    expect(rows(none)).toHaveLength(0);
    expect(none.textContent).toContain(NO_FILES_TEXT);
  });

  it('reads the resolved list only: with a detail the detail pattern is shown, not the bare one (positive control: the bare form without a detail)', async () => {
    const withDetail = await mount('WP-25');
    const props = pairingProps('WP-25');
    const bareOnly = document.createElement('sk-work-package-screen');
    Object.assign(bareOnly, { ...props, detail: null });
    const box = document.createElement('div');
    document.body.append(box);
    render(workPackageFrame(html`${bareOnly}`), box);
    await bareOnly.updateComplete;
    // The bare list carries the same patterns but no state: no pill at all (the detail form has three).
    expect(pills(body(withDetail))).toHaveLength(3);
    expect(pills(body(bareOnly))).toHaveLength(0);
    expect(rows(body(bareOnly))).toHaveLength(3);
  });
});

describe('Owned files: keyed rows (TESTS-002)', () => {
  it('keeps the node of every row that stays when a row is inserted in front', () => {
    const box = document.createElement('div');
    document.body.append(box);
    render(renderOwnedFiles(filesView([file('b.py', CHANGED), file('c.py', CHANGED)])), box);
    const before = rows(box);
    render(renderOwnedFiles(filesView([file('a.py', CHANGED), file('b.py', CHANGED), file('c.py', CHANGED)])), box);
    const after = rows(box);
    expect(after).toHaveLength(3);
    expect(after[1]).toBe(before[0]);
    expect(after[2]).toBe(before[1]);
    expect(before.includes(after[0] as HTMLElement)).toBe(false);
  });

  it('draws a duplicated pattern once per entry, in input order (pinning the current output)', () => {
    const box = draw([file('a.py', CHANGED), file('a.py', UNCHANGED), file('b.py', CHANGED)]);
    expect(rows(box).map((row) => row.querySelector('[data-pattern]')?.getAttribute('title'))).toEqual(['a.py', 'a.py', 'b.py']);
  });
});
