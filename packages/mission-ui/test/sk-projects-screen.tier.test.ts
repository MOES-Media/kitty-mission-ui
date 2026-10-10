// The tiers of the Projects screen, measured (FR-020, PR-27, PR-28, PR-29, DP-22, DP-25, DP-27): the geometry of the header, the
// rows and the side block at each width, and the flip points of CP-1 (the header at 800, the rows at 620), never the class names.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { NOW, longEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
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

async function mount(width: number, entries: ProjectEntry[] = threeEntries()): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries, now: NOW });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-action-row, sk-button, sk-page-header, sk-pill-tag') ?? []).map((el) => el.updateComplete));
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

/** The geometry that decides each tier, read from the rendered boxes. */
function measure(screen: SkProjectsScreen) {
  const scope = root(screen);
  const header = one<HTMLElement>(scope, '[data-region="header"]');
  const copy = one<HTMLElement>(header, 'sk-page-header').getBoundingClientRect();
  const button = one<HTMLElement>(header, 'sk-button').getBoundingClientRect();
  const row = one<HTMLElement>(scope, 'li sk-action-row');
  const title = one<HTMLElement>(row, '[slot="title"]').getBoundingClientRect();
  const location = one<HTMLElement>(row, '[slot="supporting"]').getBoundingClientRect();
  const side = one<HTMLElement>(row, '[data-side]').getBoundingClientRect();
  const rowBox = row.getBoundingClientRect();
  const content = one<HTMLElement>(scope, '[data-content]');
  const narrow = one<HTMLElement>(scope, '[data-narrow]').getBoundingClientRect();
  return {
    headerDirection: getComputedStyle(header).flexDirection,
    contentPadding: getComputedStyle(content).paddingLeft,
    copy,
    button,
    title,
    location,
    side,
    rowBox,
    narrow,
    pageScroll: document.documentElement.scrollWidth,
    pageClient: document.documentElement.clientWidth,
  };
}

describe('PR-27: about 1100px, the rows keep two columns and the header stays on one line', () => {
  it('puts the side block to the right of the title and level with the location, with the header button beside the copy', async () => {
    const m = measure(await mount(1100));
    expect(m.headerDirection).toBe('row');
    expect(m.button.left).toBeGreaterThanOrEqual(m.copy.right - 1);
    expect(m.side.left).toBeGreaterThan(m.location.right - 1);
    expect(m.side.top).toBeLessThan(m.location.bottom);
    expect(m.rowBox.height).toBeCloseTo(89.4, 0);
    expect(m.narrow.width).toBe(900);
    expect(m.pageScroll).toBeLessThanOrEqual(m.pageClient);
  });

  it('has no sidebar to collapse: the picker shell draws no navigation, at 1280, 1100, 800 and 620', async () => {
    let ran = 0;
    for (const width of [1280, 1100, 800, 620]) {
      await mount(width);
      const shell = one<HTMLElement>(document, 'sk-mission-shell');
      expect(root(shell).querySelectorAll('sk-context-sidebar, sk-personal-rail, nav'), `${width}`).toHaveLength(0);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(4);
  });
});

describe('PR-28: about 800px, the header stacks and the content padding reduces', () => {
  it('puts the button under the copy at 800 and beside it at 801, with 16px against 24px padding', async () => {
    const stacked = measure(await mount(800));
    expect(stacked.headerDirection).toBe('column');
    expect(stacked.button.top).toBeGreaterThanOrEqual(stacked.copy.bottom - 1);
    expect(stacked.button.left).toBeLessThan(stacked.copy.left + 2);
    expect(stacked.contentPadding).toBe('16px');
    expect(stacked.narrow.width).toBe(768);
    // The rows keep two columns at 800 (the flip of the rows is at 620).
    expect(stacked.side.left).toBeGreaterThan(stacked.location.right - 1);
    document.body.replaceChildren();
    const wide = measure(await mount(801));
    expect(wide.headerDirection).toBe('row');
    expect(wide.button.left).toBeGreaterThanOrEqual(wide.copy.right - 1);
    expect(wide.contentPadding).toBe('24px');
  });
});

describe('PR-29: about 620px and below, each row is one column and the side block starts at the start', () => {
  it('drops the side block under the location, aligned to the start, at 620 and below, and keeps two columns at 621', async () => {
    let narrowRuns = 0;
    for (const width of [620, 480, 360]) {
      const m = measure(await mount(width));
      expect(m.side.top, `${width}`).toBeGreaterThanOrEqual(m.location.bottom - 1);
      expect(Math.abs(m.side.left - m.title.left), `${width} aligned to the start`).toBeLessThan(1);
      expect(m.pageScroll, `${width} no horizontal overflow`).toBeLessThanOrEqual(m.pageClient);
      narrowRuns += 1;
      document.body.replaceChildren();
    }
    expect(narrowRuns).toBe(3);
    const wide = measure(await mount(621));
    expect(wide.side.left).toBeGreaterThan(wide.location.right - 1);
    expect(wide.side.top).toBeLessThan(wide.location.bottom);
    expect(wide.side.left).toBeGreaterThan(wide.title.left + 100);
  });

  it('matches the prototype row at 620: 588px wide, 155.4px high, the pill 24.4px high', async () => {
    const screen = await mount(620);
    const m = measure(screen);
    expect(m.rowBox.width).toBe(588);
    expect(m.rowBox.height).toBeCloseTo(155.4, 0);
    const pill = one<HTMLElement>(root(one<HTMLElement>(screen.shadowRoot as ShadowRoot, 'sk-pill-tag')), '[part="tag"]').getBoundingClientRect();
    expect(pill.height).toBeCloseTo(24.4, 1);
    expect(pill.width).toBeCloseTo(68.4, 1);
  });

  it('keeps the header button its own size: not full width at 620 (DP-27), with a 44px minimum height', async () => {
    const m = measure(await mount(620));
    expect(m.headerDirection).toBe('column');
    expect(m.button.width).toBeLessThan(m.narrow.width / 2);
    expect(m.button.height).toBeGreaterThanOrEqual(44);
    // Positive control: the same measure at 800 gives the same width, so the button is not stretched by the tier.
    document.body.replaceChildren();
    const at800 = measure(await mount(800));
    expect(at800.button.width).toBeCloseTo(m.button.width, 0);
  });

  it('holds long texts inside the column at every tier: no page overflow and no row wider than its column', async () => {
    let ran = 0;
    for (const width of [1280, 1100, 800, 620, 360]) {
      const screen = await mount(width, longEntries());
      const m = measure(screen);
      expect(m.pageScroll, `${width}`).toBeLessThanOrEqual(m.pageClient);
      for (const row of Array.from(root(screen).querySelectorAll('sk-action-row'))) expect(row.getBoundingClientRect().width, `${width}`).toBeLessThanOrEqual(m.narrow.width);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(5);
  });
});
