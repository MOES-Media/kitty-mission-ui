// T044: keyboard, focus and text contracts of the Ops screen (NFR-003, NFR-004, NFR-011, SC-006, EV-6, EV-8). Every control is a
// Tab stop with a visible ring and works with Enter and Space; rows contribute no stop; the stops equal the controls shown; there is
// no trap; focus, hover and scroll emit nothing (each with a positive control); the focus order of OP-29 is the story's `tab-<n>`;
// at a root font size of 200 percent nothing overflows; every state word is text in the DOM.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import { shellFrame } from '../src/story-support/shell-frame.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { CURSOR_REFUSAL_CODE, OPS_COPY } from '../src/defaults/ops-copy.js';
import { OPS_INVOCATION_FIXTURES, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';
import { Op29 } from '../src/elements/sk-ops-screen/sk-ops-screen.tiers.stories.js';

const EVENT_NAMES = ['sk-load-more', 'sk-retry-load'] as const;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.documentElement.style.fontSize = '';
  document.body.replaceChildren();
});

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));

interface Mounted {
  screen: SkOpsScreen;
  events: CustomEvent[];
  before: HTMLButtonElement;
  after: HTMLButtonElement;
}

/** The screen bare between two plain buttons (the Tab sentinels), with a listener for both events on the box. */
async function mount(props: Partial<OpsScreenProps>, width = 1280): Promise<Mounted> {
  await page.viewport(width, 900);
  const box = document.createElement('div');
  document.body.append(box);
  const events: CustomEvent[] = [];
  for (const name of EVENT_NAMES) box.addEventListener(name, (event) => events.push(event as CustomEvent));
  const before = document.createElement('button');
  before.textContent = 'before';
  const after = document.createElement('button');
  after.textContent = 'after';
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  box.append(before, screen, after);
  await screen.updateComplete;
  await frames();
  return { screen, events, before, after };
}

const root = (screen: SkOpsScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const q = (screen: SkOpsScreen, selector: string): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>(selector)];
const nameOf = (control: Element): string => control.textContent?.trim() ?? '';
const inner = (control: HTMLElement): HTMLButtonElement => control.shadowRoot?.querySelector('button') as HTMLButtonElement;
/** The controls the screen shows: its library buttons that are not disabled. */
const controls = (screen: SkOpsScreen): HTMLElement[] => q(screen, 'sk-button').filter((b) => !b.hasAttribute('disabled'));
const rowsOf = (screen: SkOpsScreen): HTMLElement[] => q(screen, 'li[data-row-id]');

/** The stops Tab visits inside the screen, in order, starting from the sentinel before it; the loop ends when the sentinel after takes focus. */
async function tabThrough(m: Mounted): Promise<HTMLElement[]> {
  m.before.focus();
  const stops: HTMLElement[] = [];
  let leftAfter = false;
  for (let i = 0; i < 40; i += 1) {
    await userEvent.tab();
    if (document.activeElement === m.after) {
      leftAfter = true;
      break;
    }
    expect(document.activeElement, 'focus stays in the screen until it leaves').toBe(m.screen);
    const active = root(m.screen).activeElement as HTMLElement;
    stops.push(active);
    expect(inner(active).matches(':focus-visible'), `${nameOf(active)} has a focus ring`).toBe(true);
    const outline = getComputedStyle(inner(active));
    expect(outline.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
  }
  expect(leftAfter, 'Tab leaves the screen after the last stop (no trap)').toBe(true);
  return stops;
}

interface LookCase {
  name: string;
  props: () => Partial<OpsScreenProps>;
  stops: string[];
  rows: number;
}

const LOOKS: LookCase[] = [
  { name: 'ready, a next page', props: () => opsProps.longPage(6), stops: [OPS_COPY.loadMore], rows: 6 },
  { name: 'ready, a load-more error', props: () => ({ ...opsProps.longPage(6), loadMoreError: { code: null } }), stops: [OPS_COPY.retryLabel], rows: 6 },
  { name: 'ready, a refused cursor', props: () => ({ ...opsProps.longPage(6), loadMoreError: { code: CURSOR_REFUSAL_CODE } }), stops: [OPS_COPY.refreshAction], rows: 6 },
  { name: 'first page failed', props: () => opsProps.error('opsRefusalUnreadable'), stops: [OPS_COPY.retryLabel], rows: 0 },
  { name: 'loading', props: () => opsProps.loading(), stops: [], rows: 0 },
  { name: 'empty', props: () => opsProps.empty(), stops: [], rows: 0 },
  { name: 'last page', props: () => ({ ...opsProps.lastPage() }), stops: [], rows: opsProps.lastPage().items.length },
];

describe('tab stops equal the controls shown (NFR-003)', () => {
  it('every look: the stops are exactly its controls, in order, with a ring; rows are no stop; no trap', async () => {
    let ran = 0;
    for (const look of LOOKS) {
      const m = await mount(look.props());
      const stops = await tabThrough(m);
      expect(stops.map(nameOf), look.name).toEqual(look.stops);
      expect(controls(m.screen).length, look.name).toBe(look.stops.length);
      expect(rowsOf(m.screen).length, look.name).toBe(look.rows);
      // A row (and everything inside a row) is no stop.
      expect(stops.some((s) => s.closest('li[data-row-id]') !== null), look.name).toBe(false);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(7);
  });

  it('the heading that takes focus is scripted only (tabindex -1): a stop-less look still has a focus target (positive control)', async () => {
    const m = await mount(opsProps.empty());
    const target = root(m.screen).querySelector<HTMLElement>('[data-focus-target]') as HTMLElement;
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect((await tabThrough(m)).length).toBe(0);
    target.focus();
    expect(root(m.screen).activeElement).toBe(target);
  });

  it('Shift+Tab walks back out through the same stop', async () => {
    const m = await mount(opsProps.longPage(6));
    const stops = await tabThrough(m);
    expect(stops).toHaveLength(1);
    expect(document.activeElement).toBe(m.after);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.screen);
    expect(root(m.screen).activeElement).toBe(stops[0]);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(m.before);
  });

  it('the focus order of OP-29 is the story: its Tab count lands on Load more after the shell stops', async () => {
    const tags = (Op29 as { tags?: string[] }).tags ?? [];
    const tabTag = tags.filter((t) => /^tab-\d+$/.test(t));
    expect(tabTag).toHaveLength(1);
    const tabs = Number((tabTag[0] as string).slice(4));
    await page.viewport(1280, 800);
    const box = document.createElement('div');
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    Object.assign(screen, Op29.args);
    render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
    await screen.updateComplete;
    await frames();
    const first = document.createElement('button');
    document.body.prepend(first);
    first.focus();
    let landedAt = 0;
    for (let i = 1; i <= 60; i += 1) {
      await userEvent.tab();
      if (document.activeElement?.closest('sk-ops-screen') === screen || document.activeElement === screen) {
        landedAt = i;
        break;
      }
    }
    expect(landedAt).toBe(tabs);
    expect(nameOf(root(screen).activeElement as HTMLElement)).toBe(OPS_COPY.loadMore);
  });
});

describe('keyboard activation', () => {
  it('Load more: Enter emits one sk-load-more, Space (a fresh mount) emits one', async () => {
    let ran = 0;
    for (const key of ['{Enter}', ' '] as const) {
      const m = await mount(opsProps.longPage(6));
      const cursor = (opsProps.longPage(6).pageInfo as { nextPageCursor: string }).nextPageCursor;
      await tabThrough(m);
      await userEvent.tab({ shift: true });
      expect(nameOf(root(m.screen).activeElement as HTMLElement)).toBe(OPS_COPY.loadMore);
      await userEvent.keyboard(key);
      await m.screen.updateComplete;
      expect(m.events).toHaveLength(1);
      const event = m.events[0] as CustomEvent;
      expect([event.type, event.bubbles, event.composed, event.cancelable]).toEqual(['sk-load-more', true, true, false]);
      expect(event.detail).toEqual({ cursor });
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('Retry (load-more error), Refresh (refused cursor) and the first-page retry: Enter and Space each emit one sk-retry-load', async () => {
    const cases: Array<[string, Partial<OpsScreenProps>, unknown]> = [
      ['load-more error', { ...opsProps.longPage(6), loadMoreError: { code: null } }, 'cursor'],
      ['refused cursor', { ...opsProps.longPage(6), loadMoreError: { code: CURSOR_REFUSAL_CODE } }, 'ops-page-only'],
      ['first page', opsProps.error('opsRefusalUnreadable'), 'ops-page-only'],
    ];
    let ran = 0;
    for (const [name, props, shape] of cases) {
      for (const key of ['{Enter}', ' '] as const) {
        const m = await mount(props);
        const cursor = (opsProps.longPage(6).pageInfo as { nextPageCursor: string }).nextPageCursor;
        await tabThrough(m);
        await userEvent.tab({ shift: true });
        await userEvent.keyboard(key);
        await m.screen.updateComplete;
        expect(m.events, `${name} ${key}`).toHaveLength(1);
        const event = m.events[0] as CustomEvent;
        expect([event.type, event.bubbles, event.composed, event.cancelable], `${name} ${key}`).toEqual(['sk-retry-load', true, true, false]);
        expect(event.detail, `${name} ${key}`).toEqual(shape === 'cursor' ? { target: 'ops-page', cursor } : { target: 'ops-page' });
        document.body.replaceChildren();
        ran += 1;
      }
    }
    expect(ran).toBe(6);
  });
});

describe('EV-6 and EV-8: focus, hover and scroll emit nothing', () => {
  it('focusing the heading, hovering a row and the controls, and scrolling emit nothing; activating Load more emits one (positive control)', async () => {
    const m = await mount(opsProps.longPage(6));
    (root(m.screen).querySelector('[data-focus-target]') as HTMLElement).focus();
    for (const row of rowsOf(m.screen)) await userEvent.hover(row);
    expect(rowsOf(m.screen)).toHaveLength(6);
    await userEvent.hover(controls(m.screen)[0] as HTMLElement);
    window.scrollTo(0, 400);
    await frames();
    await userEvent.tab({ shift: true });
    expect(m.events).toHaveLength(0);
    // Positive control: the same listener on the same box receives the event of an activation.
    controls(m.screen)[0]?.click();
    await m.screen.updateComplete;
    expect(m.events).toHaveLength(1);
  });
});

describe('200 percent text (NFR-004)', () => {
  const overflows = (screen: SkOpsScreen): { doc: number; shell: number; cell: number } => {
    const shell = screen.closest('sk-mission-shell') as HTMLElement;
    const cell = root(screen).querySelector('[data-ops-cell]') as HTMLElement;
    return {
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      shell: shell.scrollWidth - shell.clientWidth,
      cell: cell.scrollWidth - cell.clientWidth,
    };
  };
  async function mountFramed(width: number): Promise<SkOpsScreen> {
    await page.viewport(width, 900);
    const box = document.createElement('div');
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    Object.assign(screen, opsProps.longPage(6));
    render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
    document.documentElement.style.fontSize = '200%';
    await screen.updateComplete;
    await frames();
    return screen;
  }

  it('the measurement works: a deliberately wide element overflows the cell (positive control)', async () => {
    const screen = await mountFramed(1100);
    expect(overflows(screen).cell).toBeLessThanOrEqual(0);
    const wide = document.createElement('div');
    wide.style.width = '4000px';
    wide.style.height = '4px';
    (root(screen).querySelector('[data-ops-cell]') as HTMLElement).append(wide);
    expect(overflows(screen).cell).toBeGreaterThan(0);
  });

  it('at a root font size of 200 percent, 1100 px and 720 px: no horizontal overflow of the content area', async () => {
    let ran = 0;
    for (const width of [1100, 720]) {
      const screen = await mountFramed(width);
      expect(Number.parseFloat(getComputedStyle(document.documentElement).fontSize), `${width}`).toBe(32);
      const o = overflows(screen);
      expect(o.cell, `${width} cell`).toBeLessThanOrEqual(0);
      expect(o.shell, `${width} shell`).toBeLessThanOrEqual(0);
      expect(o.doc, `${width} document`).toBeLessThanOrEqual(0);
      expect(rowsOf(screen)).toHaveLength(6);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('200 percent text hides nothing (A11Y-001, A11Y-002, WCAG 1.4.4)', () => {
  // Every fixture row, with its real-length texts (the 512-character evidence, the 128-character profile, the long action), at a root
  // font size of 200 percent. A text cell is truncated when its content is wider than its box (`scrollWidth > clientWidth`).
  const WIDTHS = [1280, 800, 620, 390];
  const rowsProps = (): Partial<OpsScreenProps> => ({
    ...opsProps.ready(),
    items: Object.values(OPS_INVOCATION_FIXTURES),
    totalCount: Object.values(OPS_INVOCATION_FIXTURES).length,
    pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 },
  });
  async function mountAt(width: number, fontSize: string): Promise<SkOpsScreen> {
    await page.viewport(width, 900);
    const box = document.createElement('div');
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    Object.assign(screen, rowsProps());
    render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
    document.documentElement.style.fontSize = fontSize;
    await screen.updateComplete;
    await frames();
    return screen;
  }
  const cut = (el: Element): boolean => el.scrollWidth > el.clientWidth;
  /** The text cells of every row: terms, values, the id, the evidence labels and the part of every status badge. */
  const textCells = (screen: SkOpsScreen): Element[] => {
    const cells: Element[] = [];
    for (const row of q(screen, 'li[data-row-id]')) {
      cells.push(...row.querySelectorAll('dt, dd, [data-ops-id], [data-ops-evidence-class], [data-ops-changed]'));
      for (const badge of row.querySelectorAll('sk-pill-tag[data-ops-badge]')) {
        const tag = badge.shadowRoot?.querySelector('[part="tag"]');
        if (tag) cells.push(tag);
      }
    }
    return cells;
  };

  it('the measurement works: a forced one-line, clipped cell is detected as truncated, a wrapping one is not (positive control)', async () => {
    const screen = await mountAt(800, '100%');
    const probe = document.createElement('div');
    probe.style.cssText = 'width:120px;overflow:hidden;white-space:nowrap';
    probe.textContent = 'a long sentence of many short words that cannot fit on one line';
    document.body.append(probe);
    expect(cut(probe)).toBe(true);
    probe.style.whiteSpace = 'normal';
    expect(cut(probe)).toBe(false);
    expect(textCells(screen).length).toBeGreaterThan(Object.values(OPS_INVOCATION_FIXTURES).length * 10);
  });

  it('at 200 percent no text cell of any fixture row is truncated at 1280, 800, 620 and 390 px', async () => {
    let ran = 0;
    const cutCells: string[] = [];
    for (const width of WIDTHS) {
      const screen = await mountAt(width, '200%');
      expect(Number.parseFloat(getComputedStyle(document.documentElement).fontSize), `${width}`).toBe(32);
      const rows = q(screen, 'li[data-row-id]');
      expect(rows).toHaveLength(Object.values(OPS_INVOCATION_FIXTURES).length);
      const cells = textCells(screen);
      expect(cells.length, `${width} cells`).toBeGreaterThan(rows.length * 10);
      for (const cell of cells) if (cut(cell)) cutCells.push(`${width}: ${cell.tagName.toLowerCase()} ${(cell.textContent ?? '').trim().slice(0, 30)}`);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(cutCells).toEqual([]);
  });

  it('a status badge keeps its whole word at 200 percent: its part is as wide as its word, in every row, at 800 px', async () => {
    const screen = await mountAt(800, '200%');
    const badges = q(screen, 'li[data-row-id] sk-pill-tag[data-ops-badge]');
    expect(badges).toHaveLength(Object.values(OPS_INVOCATION_FIXTURES).length);
    for (const badge of badges) {
      const tag = badge.shadowRoot?.querySelector('[part="tag"]') as HTMLElement;
      expect(tag.scrollWidth, badge.textContent ?? '').toBeLessThanOrEqual(tag.clientWidth);
      const word = badge.querySelector('bdi') as HTMLElement;
      expect(tag.clientWidth, `${badge.textContent ?? ''} is at least as wide as its word`).toBeGreaterThanOrEqual(word.getBoundingClientRect().width);
    }
  });
});

describe('200 percent text hides nothing in the section header and the page pills (A11Y-001, F-2)', () => {
  const WIDTHS = [1280, 800, 620, 390];
  const PROFILES = ['architect-alphonso', 'architect-alphonso-longer', 'x'.repeat(128)];
  async function mountProfile(width: number, profile: string): Promise<SkOpsScreen> {
    await page.viewport(width, 900);
    const box = document.createElement('div');
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    const base = opsProps.longPage(6);
    Object.assign(screen, { ...base, items: base.items.map((item) => ({ ...item, profileId: profile })), profile });
    render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
    document.documentElement.style.fontSize = '200%';
    await screen.updateComplete;
    await frames();
    return screen;
  }
  /** The header texts: the heading, the eyebrow, the profile fact, the page pills (their parts) and the notice. */
  const headerCells = (screen: SkOpsScreen): Element[] => {
    const cells: Element[] = q(screen, 'h1, h2, [data-section-eyebrow], [data-profile-fact], [data-source-notice], [data-count], [data-read-only]');
    for (const pill of q(screen, 'sk-pill-tag')) {
      const tag = pill.shadowRoot?.querySelector('[part="tag"]');
      if (tag) cells.push(tag);
    }
    return cells;
  };

  it('at 200 percent no header text or page pill is truncated at 1280, 800, 620 and 390 px, for a short, a 25-character and a 128-character profile', async () => {
    let ran = 0;
    const cutCells: string[] = [];
    for (const profile of PROFILES) {
      for (const width of WIDTHS) {
        const screen = await mountProfile(width, profile);
        const cells = headerCells(screen);
        expect(q(screen, '[data-profile-fact]'), `${width}`).toHaveLength(1);
        expect(cells.length, `${width} cells`).toBeGreaterThanOrEqual(9);
        for (const cell of cells) {
          if (cell.scrollWidth > cell.clientWidth) cutCells.push(`${profile.length}@${width}: ${cell.tagName.toLowerCase()} ${(cell.textContent ?? '').trim().slice(0, 30)}`);
        }
        document.body.replaceChildren();
        ran += 1;
      }
    }
    expect(ran).toBe(12);
    expect(cutCells).toEqual([]);
  });
});

describe('a long unknown outcome never overflows the row or the page (F-1, Ops G-7)', () => {
  const LONG_OUTCOME = 'paused-'.concat('w'.repeat(133));
  async function mountLong(width: number, fontSize: string): Promise<SkOpsScreen> {
    await page.viewport(width, 900);
    const box = document.createElement('div');
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    const item = { ...structuredClone(OPS_INVOCATION_FIXTURES.opsUnknownOutcome), outcome: LONG_OUTCOME };
    Object.assign(screen, { ...opsProps.ready(), items: [item], totalCount: 1, pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 } });
    render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
    document.documentElement.style.fontSize = fontSize;
    await screen.updateComplete;
    await frames();
    return screen;
  }

  it('at 1280, 800 and 390 px (and 800 px at 200 percent) the badge stays inside the row and the page does not scroll', async () => {
    let ran = 0;
    for (const [width, size] of [[1280, '100%'], [800, '100%'], [390, '100%'], [800, '200%']] as const) {
      const screen = await mountLong(width, size);
      const row = rowsOf(screen)[0] as HTMLElement;
      const badge = row.querySelector('sk-pill-tag[data-ops-badge]') as HTMLElement;
      expect(badge.textContent, `${width}`).toContain(LONG_OUTCOME);
      expect(row.scrollWidth, `${width}@${size} row`).toBeLessThanOrEqual(row.clientWidth);
      expect(badge.getBoundingClientRect().right, `${width}@${size} badge edge`).toBeLessThanOrEqual(row.getBoundingClientRect().right + 0.5);
      // R2-1: the record id keeps a readable line (it is not squeezed to nothing by the badge), and the head does not overflow.
      const head = row.querySelector('[data-ops-head]') as HTMLElement;
      const id = head.querySelector('[data-ops-id]') as HTMLElement;
      const idStyle = getComputedStyle(id);
      expect(id.getBoundingClientRect().width, `${width}@${size} id width`).toBeGreaterThanOrEqual(Number.parseFloat(idStyle.fontSize) * 8);
      expect(id.getBoundingClientRect().height, `${width}@${size} id lines`).toBeLessThan(Number.parseFloat(idStyle.lineHeight) * 2.5);
      expect(head.scrollWidth, `${width}@${size} head`).toBeLessThanOrEqual(head.clientWidth);
      expect(document.documentElement.scrollWidth, `${width}@${size} page`).toBeLessThanOrEqual(document.documentElement.clientWidth);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('a status badge never shrinks (A11Y-001)', () => {
  it('beside a very long id in a head that is not stacked, the badge keeps its whole word (the id gives way)', async () => {
    await page.viewport(1280, 900);
    const box = document.createElement('div');
    box.style.width = '800px';
    document.body.append(box);
    const screen = document.createElement('sk-ops-screen');
    const long = { ...structuredClone(OPS_INVOCATION_FIXTURES.opsAbandoned), invocationId: 'record-'.concat('x'.repeat(400)) };
    Object.assign(screen, { ...opsProps.ready(), items: [long], totalCount: 1, pageInfo: { hasNextPage: false, nextPageCursor: null, pageSize: 50 } });
    box.append(screen);
    await screen.updateComplete;
    await frames();
    const head = root(screen).querySelector('[data-ops-head]') as HTMLElement;
    expect(getComputedStyle(head).flexDirection).toBe('row');
    const badge = head.querySelector('sk-pill-tag') as HTMLElement;
    const tag = badge.shadowRoot?.querySelector('[part="tag"]') as HTMLElement;
    const word = badge.querySelector('bdi') as HTMLElement;
    expect(word.textContent).toBe('abandoned');
    expect(tag.scrollWidth).toBeLessThanOrEqual(tag.clientWidth);
    expect(tag.clientWidth).toBeGreaterThanOrEqual(word.getBoundingClientRect().width);
    // the id wrapped inside the row instead
    const id = head.querySelector('[data-ops-id]') as HTMLElement;
    expect(id.getBoundingClientRect().height).toBeGreaterThan(Number.parseFloat(getComputedStyle(id).lineHeight) * 1.5);
    expect(head.scrollWidth).toBeLessThanOrEqual(head.clientWidth);
  });
});

describe('text is never colour-only (NFR-011, SC-006)', () => {
  const FIXTURE_NAMES = Object.keys(OPS_INVOCATION_FIXTURES);

  it('every state word is visible text of its row: outcome, status, closer, mode, evidence class, redaction', async () => {
    const items = Object.values(OPS_INVOCATION_FIXTURES);
    expect(items).toHaveLength(FIXTURE_NAMES.length);
    const m = await mount({ ...opsProps.ready(), items, skippedCount: 3 });
    const rows = rowsOf(m.screen);
    expect(rows).toHaveLength(29);
    const shown = rows.map((r) => r.innerText).join('\n');
    const words = ['done', 'failed', 'abandoned', 'open', 'sweep', 'advisory', 'query', 'task execution', 'mission step', 'path', 'address', 'text', OPS_COPY.redactedWord, OPS_COPY.quietEvidenceClosed, OPS_COPY.quietActor];
    let seen = 0;
    for (const word of words) {
      expect(shown, word).toContain(word);
      seen += 1;
    }
    expect(seen).toBe(15);
    // The badge of every row is text in the row, not only a tone.
    const badges = rows.map((r) => (r.querySelector('sk-pill-tag[data-ops-badge]') as HTMLElement).innerText.trim());
    expect(badges).toHaveLength(29);
    expect(badges.every((b) => b !== '')).toBe(true);
    // The skipped note is text.
    expect((root(m.screen).querySelector('[data-skipped-note]') as HTMLElement).innerText).toContain('3');
  });

  it('the error and the refusals are text: the heading, the body, the load-more error and the refused-cursor sentences', async () => {
    const error = await mount(opsProps.error('opsRefusalUnreadable'));
    expect((root(error.screen).querySelector('[data-error-code]') as HTMLElement).innerText).toContain(OPS_COPY.errorHeading);
    document.body.replaceChildren();
    const more = await mount({ ...opsProps.longPage(6), loadMoreError: { code: null } });
    expect((root(more.screen).querySelector('[data-load-more-error]') as HTMLElement).innerText).toContain(OPS_COPY.loadMoreError);
    document.body.replaceChildren();
    const refused = await mount({ ...opsProps.longPage(6), loadMoreError: { code: CURSOR_REFUSAL_CODE } });
    expect((root(refused.screen).querySelector('[data-load-more-error]') as HTMLElement).innerText).toContain(OPS_COPY.refusedCursor);
  });
});

describe('the accessibility tree of the non-ready looks (the WP07 review question)', () => {
  it('loading: ONE level-2 heading named exactly the label (the progress bar adds nothing to the name), the bar is a progressbar, focus lands on the heading', async () => {
    const m = await mount(opsProps.loading());
    const heading = page.getByRole('heading', { level: 2, name: OPS_COPY.loadingLabel, exact: true });
    await expect.element(heading).toBeInTheDocument();
    expect(page.getByRole('heading', { level: 2 }).elements()).toHaveLength(1);
    expect(page.getByRole('progressbar').elements()).toHaveLength(1);
    const node = heading.element() as HTMLElement;
    expect(node.matches('[data-focus-target]')).toBe(true);
    expect(root(m.screen).querySelectorAll('[data-focus-target]')).toHaveLength(1);
    // The heading is the only heading of the look besides the page title; the profile fact is drawn by no non-ready look.
    expect(root(m.screen).querySelectorAll('[data-profile-fact]')).toHaveLength(0);
  });

  it('empty and error: one level-2 heading each, the heading text is its accessible name', async () => {
    const empty = await mount(opsProps.empty());
    expect(page.getByRole('heading', { level: 2, name: OPS_COPY.emptyHeading, exact: true }).elements()).toHaveLength(1);
    expect(root(empty.screen).querySelectorAll('[data-profile-fact]')).toHaveLength(0);
    document.body.replaceChildren();
    const error = await mount(opsProps.error('opsRefusalUnreadable'));
    expect(page.getByRole('heading', { level: 2, name: OPS_COPY.errorHeading, exact: true }).elements()).toHaveLength(1);
    expect(root(error.screen).querySelectorAll('[data-profile-fact]')).toHaveLength(0);
    document.body.replaceChildren();
    // Positive control: the ready look under a profile does draw the profile fact.
    const rows = opsProps.longPage(6);
    const same = rows.items.map((item) => ({ ...item, profileId: 'architect-alphonso' }));
    const ready = await mount({ ...rows, items: same, profile: 'architect-alphonso' });
    expect(root(ready.screen).querySelectorAll('[data-profile-fact]')).toHaveLength(1);
  });
});
