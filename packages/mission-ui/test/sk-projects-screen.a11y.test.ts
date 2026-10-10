// Keyboard, focus and the accessibility tree of the merged Projects screen (FR-021, FR-022, FR-023, NFR-003, NFR-004, NFR-010,
// PR-26, PR-31): the documented tab order, Enter and Space, the visible focus ring, focus capture on every kind of update, the
// skip link, the real list and named buttons, no status carried by colour alone, and the forced-colours spot check.
/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { NOW, notOpenableEntries, rowErrorEntries, rowLoadingEntries, rowUnavailableEntries, threeEntries, unknownHealthEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { ENTRY_ERROR_TEXT, ENTRY_LOADING_TEXT, ENTRY_RETRY_LABEL, ENTRY_UNAVAILABLE_TEXT, OPEN_PROJECT_LABEL, SKIP_LINK_TEXT } from '../src/defaults/index.js';
import type { ProjectEntry } from '../src/project-types.js';

/** The `project` member of an entry as a spread, so an absent one stays absent (exact optional property types). */
const projectOf = (entry: ProjectEntry): Pick<ProjectEntry, 'project'> => (entry.project === undefined ? {} : { project: entry.project });

const EVENTS = ['sk-open-project', 'sk-request-open-project', 'sk-retry-load'] as const;

afterEach(async () => {
  await cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'none' }] });
  document.documentElement.removeAttribute('data-theme');
  (document.activeElement as HTMLElement | null)?.blur();
  document.documentElement.style.fontSize = '';
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

/** The screen inside the shell's picker layout with the skip link text of the screen (FR-023), as the stories frame it. */
async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(
    html`<sk-mission-shell layout="picker" flush status="ready">
      <span slot="skip-link">${SKIP_LINK_TEXT}</span>
      <sk-button slot="top-bar-actions" size="icon" variant="ghost" label="Settings">S</sk-button>
      ${screen}
    </sk-mission-shell>`,
    box,
  );
  await settle(screen);
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-button, sk-page-header, sk-pill-tag, sk-notice, sk-section-header') ?? []).map((el) => el.updateComplete));
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
const shellOf = (): HTMLElement => one(document, 'sk-mission-shell');
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const rowOf = (screen: SkProjectsScreen, key: string): HTMLElement => one(root(screen), `li[data-key="${key}"]`);

function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

/** What one tab stop is, in words: the visible text or label of the control that holds focus. */
function describeStop(stop: Element): string {
  const host = (stop.getRootNode() as ShadowRoot).host as HTMLElement | undefined;
  if (host?.closest('[data-skip-link]') != null) {
    // The words are the slotted text of the shell's `skip-link` slot, which the screen supplies.
    const slot = host.querySelector('slot');
    return `skip:${(slot?.assignedNodes({ flatten: true }) ?? []).map((node) => node.textContent ?? '').join('').trim()}`;
  }
  if (host?.localName === 'sk-action-row') return `row:${text(host.querySelector('[slot="title"]'))}`;
  if (host?.localName === 'sk-button') return `button:${host.getAttribute('label') ?? text(host)}`;
  return `other:${stop.localName}`;
}

/** Tabs from a sentinel before the shell to a sentinel after it and returns every stop between them, in order. */
async function walk(): Promise<Element[]> {
  const before = document.createElement('a');
  before.href = '#before';
  before.textContent = 'before';
  const after = document.createElement('a');
  after.href = '#after';
  after.textContent = 'after';
  document.body.prepend(before);
  document.body.append(after);
  before.focus();
  const stops: Element[] = [];
  for (let i = 0; i < 80; i += 1) {
    await userEvent.tab();
    const active = deepActive();
    if (active === null || active === after) break;
    stops.push(active);
  }
  expect(deepActive(), 'the walk reached the sentinel after the screen').toBe(after);
  return stops;
}

function collect(screen: SkProjectsScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of EVENTS) screen.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}

describe('PR-26: the tab order, with no more stops than controls shown', () => {
  it('walks the skip link, the shell controls, the header button and one stop per openable row, in that order', async () => {
    const screen = await mount();
    const stops = await walk();
    expect(stops.map(describeStop)).toEqual([
      `skip:${SKIP_LINK_TEXT}`,
      'button:Settings',
      `button:${OPEN_PROJECT_LABEL}`,
      'row:harbor-ledger',
      'row:meadow-sync',
      'row:quartz-notes',
    ]);
    expect(new Set(stops).size).toBe(6);
    // Positive control: the count follows the controls drawn, so the walk is not a constant (plain rows add no stop).
    expect(screen.entries).toHaveLength(3);
    document.body.replaceChildren();
    const plain = await mount({ entries: notOpenableEntries() });
    expect(plain.entries).toHaveLength(2);
    expect((await walk()).map(describeStop)).toEqual([`skip:${SKIP_LINK_TEXT}`, 'button:Settings', `button:${OPEN_PROJECT_LABEL}`, 'row:openable']);
  });

  it('adds the retry control of a failed row after that row and draws no stop for a loading or unavailable row', async () => {
    await mount({ entries: rowErrorEntries() });
    expect((await walk()).map(describeStop)).toEqual([
      `skip:${SKIP_LINK_TEXT}`,
      'button:Settings',
      `button:${OPEN_PROJECT_LABEL}`,
      'row:harbor-ledger',
      `button:${ENTRY_RETRY_LABEL}, tidal-index`,
      'row:quartz-notes',
    ]);
    document.body.replaceChildren();
    await mount({ entries: rowLoadingEntries() });
    const loading = (await walk()).map(describeStop);
    expect(loading).toEqual([`skip:${SKIP_LINK_TEXT}`, 'button:Settings', `button:${OPEN_PROJECT_LABEL}`, 'row:harbor-ledger', 'row:quartz-notes']);
    document.body.replaceChildren();
    await mount({ entries: rowUnavailableEntries() });
    expect((await walk()).map(describeStop)).toEqual(loading);
  });

  it('puts the retry of the failed list and the header button in the order of the page, and no row stop', async () => {
    await mount({ status: 'error', entries: [] });
    const stops = (await walk()).map(describeStop);
    expect(stops).toEqual([`skip:${SKIP_LINK_TEXT}`, 'button:Settings', `button:${OPEN_PROJECT_LABEL}`, expect.stringMatching(/^button:/)]);
    expect(stops).toHaveLength(4);
  });

  it('activates the header button and a row with Enter and with Space, one event each', async () => {
    const screen = await mount();
    const seen = collect(screen);
    const stops = await walk();
    const header = stops[2] as Element;
    const row = stops[3] as Element;
    expect(describeStop(header)).toBe(`button:${OPEN_PROJECT_LABEL}`);
    (header as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(seen.map((event) => event.type)).toEqual(['sk-request-open-project', 'sk-request-open-project']);
    (row as HTMLElement).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(seen.map((event) => event.type)).toEqual(['sk-request-open-project', 'sk-request-open-project', 'sk-open-project', 'sk-open-project']);
    expect(seen.map((event) => event.detail)).toEqual([null, null, { key: 'harbor-ledger' }, { key: 'harbor-ledger' }]);
    expect(seen).toHaveLength(4);
    for (const event of seen) {
      expect(event.bubbles, event.type).toBe(true);
      expect(event.composed, event.type).toBe(true);
      expect(event.cancelable, event.type).toBe(false);
    }
  });

  it('shows a focus ring on the keyboard-focused header button and row, and none on the same controls unfocused', async () => {
    await mount();
    const stops = await walk();
    let ran = 0;
    for (const index of [2, 3]) {
      const stop = stops[index] as HTMLElement;
      stop.focus();
      const focused = getComputedStyle(stop);
      expect(focused.outlineStyle, describeStop(stop)).not.toBe('none');
      expect(parseFloat(focused.outlineWidth), describeStop(stop)).toBeGreaterThanOrEqual(2);
      stop.blur();
      expect(getComputedStyle(stop).outlineStyle, `${describeStop(stop)} unfocused`).toBe('none');
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('PR-26 and FR-023: the skip link and the main landmark', () => {
  it('is the first tab stop, reads "Skip to Projects" and moves focus to the content, which is the shell main landmark', async () => {
    const screen = await mount();
    const stops = await walk();
    const first = stops[0] as HTMLElement;
    expect(describeStop(first)).toBe('skip:Skip to Projects');
    first.focus();
    await userEvent.keyboard('{Enter}');
    const shellRoot = root(shellOf());
    expect(shellRoot.activeElement).toBe(one(shellRoot, '[data-focus-target]'));
    // The screen is the content of exactly one main landmark.
    expect(shellRoot.querySelectorAll('main')).toHaveLength(1);
    expect(screen.assignedSlot?.closest('main')).toBe(one(shellRoot, 'main'));
    // Positive control: another text in the slot changes the words, so the words are the slot's, not constants of the shell.
    expect(text(one(shellOf(), '[slot="skip-link"]'))).toBe(SKIP_LINK_TEXT);
  });
});

describe('FR-021: focus capture on every update', () => {
  const headingOf = (screen: SkProjectsScreen): Element => one(root(screen), 'h1');
  async function focusedAfter(screen: SkProjectsScreen, update: () => void): Promise<Element | null> {
    update();
    await settle(screen);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return deepActive();
  }
  async function focusRow(screen: SkProjectsScreen, key: string): Promise<HTMLElement> {
    const trigger = one<HTMLElement>(one<HTMLElement>(rowOf(screen, key), 'sk-action-row').shadowRoot as ShadowRoot, 'button');
    trigger.focus();
    expect(deepActive()).toBe(trigger);
    return trigger;
  }

  it('loading to ready: a focus on the header button stays (nothing was detached)', async () => {
    const screen = await mount({ status: 'loading', entries: [] });
    const button = one<HTMLElement>(root(one<HTMLElement>(root(screen), '[data-region="header"] sk-button')), 'button');
    button.focus();
    expect(deepActive()).toBe(button);
    const after = await focusedAfter(screen, () => Object.assign(screen, { status: 'ready', entries: threeEntries() }));
    expect(after).toBe(button);
  });

  it('ready to error: focus on a row control moves to the heading, because the row is gone', async () => {
    const screen = await mount();
    await focusRow(screen, 'harbor-ledger');
    const after = await focusedAfter(screen, () => Object.assign(screen, { status: 'error', entries: [] }));
    expect(after).toBe(headingOf(screen));
  });

  it('entries replaced: focus on a row whose key is gone moves to the heading; one whose key stays keeps its focus', async () => {
    const screen = await mount();
    const trigger = await focusRow(screen, 'meadow-sync');
    const kept = await focusedAfter(screen, () => (screen.entries = [...threeEntries()]));
    expect(kept).toBe(trigger);
    const moved = await focusedAfter(screen, () => (screen.entries = threeEntries().filter((entry) => entry.key !== 'meadow-sync')));
    expect(moved).toBe(headingOf(screen));
  });

  it('a focused retry whose entry becomes ready: focus moves to the heading (the retry is gone), and a retry that stays keeps focus', async () => {
    const screen = await mount({ entries: rowErrorEntries() });
    const retry = one<HTMLElement>(root(one<HTMLElement>(rowOf(screen, 'tidal-index'), 'sk-button')), 'button');
    retry.focus();
    expect(deepActive()).toBe(retry);
    const still = await focusedAfter(screen, () => (screen.entries = rowErrorEntries()));
    expect(still).toBe(retry);
    const ready = threeEntries();
    const failed = rowErrorEntries()[1] as ProjectEntry;
    const recovered: ProjectEntry[] = [ready[0] as ProjectEntry, { key: failed.key, location: failed.location, ...projectOf(ready[1] as ProjectEntry) }, ready[2] as ProjectEntry];
    const after = await focusedAfter(screen, () => (screen.entries = recovered));
    expect(after).toBe(headingOf(screen));
  });
});

describe('FR-022, NFR-010: the accessibility tree', () => {
  it('draws one real list with one item per entry, and the row controls are buttons named by their visible text', async () => {
    const screen = await mount();
    expect(page.getByRole('list').elements()).toHaveLength(1);
    expect(page.getByRole('listitem').elements()).toHaveLength(3);
    expect(root(screen).querySelectorAll('ul[data-region="list"]')).toHaveLength(1);
    const names = [
      'harbor-ledger v3.2.6rc4 healthy 439 Missions active 2 hours ago ~/work/harbor-ledger · main',
      'meadow-sync v3.2.5 schema drift 57 Missions active yesterday ~/work/meadow-sync · main',
      'quartz-notes v3.2.6rc4 healthy 12 Missions active 6 days ago ~/work/quartz-notes · trunk · local only',
    ];
    let ran = 0;
    for (const name of names) {
      expect(page.getByRole('button', { name, exact: true }).elements(), name).toHaveLength(1);
      ran += 1;
    }
    expect(ran).toBe(3);
    // Positive control: a name that is not the computed one finds nothing.
    expect(page.getByRole('button', { name: 'harbor-ledger', exact: true }).elements()).toHaveLength(0);
  });

  it('puts the health, the count and the state in WORDS for every row, never in colour alone', async () => {
    const cases: Array<[string, ProjectEntry[], RegExp[]]> = [
      ['healthy and schema drift', threeEntries(), [/healthy/, /schema drift/, /\d+ Missions?/]],
      ['a health value outside the table', unknownHealthEntries(), [/quartz-notes v4\.0\.0 unheard_of_health /]],
      ['a failed row', rowErrorEntries(), [new RegExp(ENTRY_ERROR_TEXT)]],
      ['a loading row', rowLoadingEntries(), [new RegExp(ENTRY_LOADING_TEXT)]],
      ['an unavailable row', rowUnavailableEntries(), [new RegExp(ENTRY_UNAVAILABLE_TEXT)]],
    ];
    let ran = 0;
    for (const [label, entries, patterns] of cases) {
      const screen = await mount({ entries });
      const content = text(root(screen).querySelector('[data-region="list"]'));
      for (const pattern of patterns) expect(content, `${label} ${pattern}`).toMatch(pattern);
      // Every health pill and every state line is a word, and the pill is not an empty colour swatch.
      for (const pill of Array.from(root(screen).querySelectorAll('sk-pill-tag'))) expect(text(pill).length, label).toBeGreaterThan(0);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(5);
  });

  it('names the unknown health by its raw value, as a word', async () => {
    const screen = await mount({ entries: unknownHealthEntries() });
    const pill = one(root(screen), 'sk-pill-tag');
    const raw = (unknownHealthEntries()[0] as ProjectEntry).project?.health;
    expect(raw).toBeTypeOf('string');
    expect(text(pill)).toBe(raw);
    expect(pill.getAttribute('status')).toBe('neutral');
  });
});

describe('PR-31: forced colours and the light theme', () => {
  const emulate = (value: 'active' | 'none'): Promise<unknown> => cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value }] });
  const pillTags = (screen: SkProjectsScreen): HTMLElement[] => Array.from(root(screen).querySelectorAll('sk-pill-tag')).map((pill) => one<HTMLElement>(root(pill), '[part="tag"]'));
  const surface = (): string => getComputedStyle(document.documentElement).getPropertyValue('--sk-surface-page');

  it('under forced-colors: active the badges keep their words and a border, and the focused control keeps a solid ring', async () => {
    await emulate('active');
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const screen = await mount();
    expect(Array.from(root(screen).querySelectorAll('sk-pill-tag')).map(text)).toEqual(['healthy', 'schema drift', 'healthy']);
    const tags = pillTags(screen);
    expect(tags).toHaveLength(3);
    for (const tag of tags) {
      const style = getComputedStyle(tag);
      expect(style.borderTopStyle).toBe('solid');
      expect(parseFloat(style.borderTopWidth)).toBeGreaterThanOrEqual(1);
    }
    const forcedBackground = getComputedStyle(tags[0] as HTMLElement).backgroundColor;
    const stops = await walk();
    const row = stops[3] as HTMLElement;
    row.focus();
    const ring = getComputedStyle(row);
    expect(ring.outlineStyle).toBe('solid');
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
    row.blur();
    expect(getComputedStyle(row).outlineStyle).toBe('none');
    // Positive control: without the emulation the page reports no forced colours and the same pill is painted differently.
    await emulate('none');
    expect(matchMedia('(forced-colors: active)').matches).toBe(false);
    expect(getComputedStyle(tags[0] as HTMLElement).backgroundColor).not.toBe(forcedBackground);
  });

  it('in the light theme the badges keep their words and borders and the focus ring is visible, and the page differs from the dark one', async () => {
    document.documentElement.setAttribute('data-theme', 'dark');
    await mount();
    const darkSurface = surface();
    document.body.replaceChildren();
    document.documentElement.setAttribute('data-theme', 'light');
    const screen = await mount();
    expect(surface()).not.toBe(darkSurface);
    expect(Array.from(root(screen).querySelectorAll('sk-pill-tag')).map(text)).toEqual(['healthy', 'schema drift', 'healthy']);
    const tags = pillTags(screen);
    expect(tags).toHaveLength(3);
    for (const tag of tags) {
      expect(getComputedStyle(tag).borderTopStyle).toBe('solid');
      expect(parseFloat(getComputedStyle(tag).borderTopWidth)).toBeGreaterThanOrEqual(1);
    }
    const stops = await walk();
    (stops[3] as HTMLElement).focus();
    expect(getComputedStyle(stops[3] as HTMLElement).outlineStyle).toBe('solid');
  });
});

describe('NFR-004: 200 percent text', () => {
  for (const width of [1100, 720]) {
    it(`has no horizontal overflow at ${width}px with the root font size at 200 percent`, async () => {
      const screen = await mount({}, width);
      document.documentElement.style.fontSize = '200%';
      await settle(screen);
      expect(parseFloat(getComputedStyle(document.documentElement).fontSize)).toBe(32);
      const column = one<HTMLElement>(root(screen), '[data-narrow]');
      expect(column.scrollWidth).toBeLessThanOrEqual(column.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      // Positive control: the text really grew (the first row is taller than at 100 percent, where it measures 89.4px).
      expect(one<HTMLElement>(root(screen), 'sk-action-row').getBoundingClientRect().height).toBeGreaterThan(100);
    });
  }
});
