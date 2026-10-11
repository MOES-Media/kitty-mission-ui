// T042: the container-query tiers of the Ops screen (CP-1, S-O2). The facts become one column at a container width of 696 px and
// the row head and the section heading stack at 588 px; the container is the wrapper inside the screen (the page cell), not the
// host and not the viewport, so the shell's sidebar changes nothing about the rule. Measured as computed layout in the real shell
// frame (viewport first) and, for the exact boundaries, in a bare box of a given width.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { render } from 'lit';
import { html } from 'lit';
import rowParts from '../src/elements/sk-ops-screen/ops-row-parts.ts?raw';
import pageParts from '../src/elements/sk-ops-screen/ops-page-parts.ts?raw';
import stateParts from '../src/elements/sk-ops-screen/ops-state-parts.ts?raw';
import screenSource from '../src/elements/sk-ops-screen/sk-ops-screen.ts?raw';
import { shellFrame } from '../src/story-support/shell-frame.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));

async function mountShell(width: number, props: OpsScreenProps = opsProps.longPage(6)): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const box = document.createElement('div');
  document.body.append(box);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
  await screen.updateComplete;
  await frames();
  return screen;
}

/** The screen alone in a box of exactly `width` px (the cell is as wide as the box below 900 px). */
async function mountBox(width: number, props: OpsScreenProps = opsProps.longPage(6)): Promise<SkOpsScreen> {
  await page.viewport(1280, 900);
  const box = document.createElement('div');
  box.style.width = `${width}px`;
  document.body.append(box);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  box.append(screen);
  await screen.updateComplete;
  await frames();
  return screen;
}

const root = (screen: SkOpsScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const tracks = (el: Element | null): number => (el === null ? -1 : getComputedStyle(el).gridTemplateColumns.split(' ').length);
const factTracks = (screen: SkOpsScreen): number[] => [...root(screen).querySelectorAll('[data-ops-facts]')].map((dl) => tracks(dl));
const headDirections = (screen: SkOpsScreen): string[] => [...root(screen).querySelectorAll('[data-ops-head]')].map((h) => getComputedStyle(h).flexDirection);
const sectionHeader = (screen: SkOpsScreen): HTMLElement => root(screen).querySelector('sk-section-header') as HTMLElement;
/** The track count of the section heading's own grid (the library's `header` part). */
const headingTracks = (screen: SkOpsScreen): number => tracks(sectionHeader(screen).shadowRoot?.querySelector('[part="header"]') ?? null);

describe('tiers inside the shell frame', () => {
  const cases: Array<[number, number, string, number]> = [
    [1280, 2, 'row', 2],
    [1100, 2, 'row', 2],
    [801, 2, 'row', 2],
    [800, 1, 'row', 2],
    [621, 1, 'row', 2],
    [620, 1, 'column', 1],
    [390, 1, 'column', 1],
  ];
  for (const [width, columns, direction, heading] of cases) {
    it(`${width}px: ${columns} fact column(s), head ${direction}, heading grid of ${heading} track(s)`, async () => {
      const screen = await mountShell(width);
      const facts = factTracks(screen);
      expect(facts).toHaveLength(6);
      expect(facts).toEqual(Array(6).fill(columns));
      const heads = headDirections(screen);
      expect(heads).toHaveLength(6);
      expect(heads).toEqual(Array(6).fill(direction));
      expect(headingTracks(screen)).toBe(heading);
    });
  }

  it('the facts grid is the same at the 1100 collapsed edge as at 1280 and nothing overflows horizontally at any tier', async () => {
    let count = 0;
    for (const width of [1280, 1100, 800, 620, 390]) {
      const screen = await mountShell(width);
      const shell = screen.closest('sk-mission-shell') as HTMLElement;
      const cell = root(screen).querySelector('[data-ops-cell]') as HTMLElement;
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
      expect(shell.scrollWidth).toBeLessThanOrEqual(shell.clientWidth);
      expect(cell.scrollWidth).toBeLessThanOrEqual(cell.clientWidth);
      count += 1;
      document.body.replaceChildren();
    }
    expect(count).toBe(5);
  });
});

describe('the exact container boundaries (a bare box of the stated width)', () => {
  it('facts: one column at 696 px, two at 697 px', async () => {
    const at696 = await mountBox(696);
    expect(factTracks(at696)).toEqual(Array(6).fill(1));
    document.body.replaceChildren();
    const at697 = await mountBox(697);
    expect(factTracks(at697)).toEqual(Array(6).fill(2));
  });

  it('head and heading: stacked at 588 px, side by side at 589 px', async () => {
    const at588 = await mountBox(588);
    expect(headDirections(at588)).toEqual(Array(6).fill('column'));
    expect(headingTracks(at588)).toBe(1);
    document.body.replaceChildren();
    const at589 = await mountBox(589);
    expect(headDirections(at589)).toEqual(Array(6).fill('row'));
    expect(headingTracks(at589)).toBe(2);
  });

  it('the rule follows the container, not the viewport: a 1280 px viewport with a 588 px box stacks', async () => {
    const screen = await mountBox(588);
    expect(window.innerWidth).toBe(1280);
    expect(headDirections(screen)).toEqual(Array(6).fill('column'));
  });
});

describe('the thresholds follow the text size (A11Y-001): 43.5rem and 36.75rem', () => {
  const cellWidth = (screen: SkOpsScreen): number => (root(screen).querySelector('[data-ops-cell]') as HTMLElement).clientWidth;

  it('at a root font size of 200 percent the facts stack up to 1392 px and the head up to 1176 px (positive control: at 100 percent a 900 px cell keeps two columns)', async () => {
    const plain = await mountBox(900);
    expect(cellWidth(plain)).toBe(900);
    expect(factTracks(plain)).toEqual(Array(6).fill(2));
    expect(headDirections(plain)).toEqual(Array(6).fill('row'));
    document.body.replaceChildren();

    document.documentElement.style.fontSize = '200%';
    try {
      const big = await mountBox(1300);
      expect(cellWidth(big)).toBe(1300);
      expect(factTracks(big)).toEqual(Array(6).fill(1));
      expect(headDirections(big)).toEqual(Array(6).fill('row'));
      expect(headingTracks(big)).toBe(2);
      document.body.replaceChildren();

      const stacked = await mountBox(1100);
      expect(factTracks(stacked)).toEqual(Array(6).fill(1));
      expect(headDirections(stacked)).toEqual(Array(6).fill('column'));
      expect(headingTracks(stacked)).toBe(1);
      document.body.replaceChildren();

      const wide = await mountBox(1500);
      expect(factTracks(wide)).toEqual(Array(6).fill(2));
      expect(headDirections(wide)).toEqual(Array(6).fill('row'));
    } finally {
      document.documentElement.style.fontSize = '';
    }
  });
});

describe('thresholds have one source each', () => {
  const total = (needle: string): number => [rowParts, pageParts, stateParts, screenSource].reduce((sum, f) => sum + f.split(needle).length - 1, 0);
  it('43.5rem appears once and 36.75rem twice (head, heading), in the parts only, in rem so they follow the text size (A11Y-001), never in a media query', () => {
    expect(total('@container (max-width: 43.5rem)')).toBe(1);
    expect(total('@container (max-width: 36.75rem)')).toBe(2);
    // the px forms are gone (positive control: the counts above are of the rem forms)
    expect(total('@container (max-width: 696px)')).toBe(0);
    expect(total('@container (max-width: 588px)')).toBe(0);
    expect(total('@media')).toBe(0);
  });
});
