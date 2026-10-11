// The readable floor of a table cell (exception E-23, WP13 extension): a many-column markdown table scrolls in its own box instead of
// shrinking every column to its min-content width and wrapping a long cell into a tall row. The control is an ordinary narrow table, which
// must still fit the pane at 620 px with nothing to scroll. The box keeps scrolling (no `nowrap`).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';

afterEach(() => document.body.replaceChildren());

const frames = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
const markdown = (text: string): ArtifactContentView => ({
  path: 'plan.md', kind: 'plan', mediaType: 'text/markdown', encoding: 'utf-8', sizeBytes: text.length, redacted: false, content: text,
});
async function mount(text: string, width: number): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-03'), content: markdown(text) });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frames();
  return screen;
}
const box = (screen: Element): HTMLElement => {
  const found = screen.shadowRoot?.querySelector<HTMLElement>('[data-md="table-scroll"]');
  if (found === null || found === undefined) throw new Error('missing table box');
  return found;
};

const THREE = '| Id | Name | Status |\n|---|---|---|\n| R-01 | Load the listing | done |\n| R-02 | Open a document | in progress |\n';
const FOUR = '| Id | Name | Owner | Status |\n|---|---|---|---|\n| R-01 | Load the listing | team-a | done |\n| R-02 | Open a document | team-b | in progress |\n';
/**
 * A row of N text lines: N line boxes plus the cell padding and borders, ALL read from the computed style of a cell of the rendered
 * table (the line height and the spacing follow the font stack, so a literal pixel count drifts from one machine to the next).
 */
const px = (value: string): number => (value === 'normal' || value === '' ? 0 : parseFloat(value));
const cellSpacing = (cell: Element): number => {
  const style = getComputedStyle(cell);
  return px(style.paddingTop) + px(style.paddingBottom) + px(style.borderTopWidth) + px(style.borderBottomWidth);
};
const rowCeiling = (scroll: HTMLElement, lines: number): number => {
  const cell = scroll.querySelector('tbody td');
  if (cell === null) throw new Error('missing table cell');
  const lineHeight = px(getComputedStyle(cell).lineHeight) || px(getComputedStyle(cell).fontSize) * 1.2;
  return Math.ceil(lines * lineHeight + cellSpacing(cell)) + 1;
};
/** The nine-column table of the real plan fixture (AV-03), as the story shows it. */
const PLAN = (pairingProps('AV-03').content as ArtifactContentView).content;

const rowHeights = (scroll: HTMLElement): number[] => Array.from(scroll.querySelectorAll('tbody tr')).map((row) => Math.round(row.getBoundingClientRect().height));

describe('the table cells size to their content (E-23 extension)', () => {
  it('the real nine-column plan table fits at 1640px with the inspector, with rows of at most 3 lines', async () => {
    const screen = await mount(PLAN, 1640);
    const scroll = box(screen);
    const heights = rowHeights(scroll);
    // The title says "with the inspector": it is there, drawn, and has a width (the pane is narrower for it).
    const inspector = screen.shadowRoot?.querySelector<HTMLElement>('[data-region="inspector"]');
    expect(inspector, 'the inspector is rendered').not.toBeNull();
    expect(inspector?.getBoundingClientRect().width ?? 0, 'the inspector has a width').toBeGreaterThan(0);
    expect(scroll.scrollWidth, `scrollWidth ${scroll.scrollWidth} clientWidth ${scroll.clientWidth}; rows ${heights.join(', ')}`).toBeLessThanOrEqual(scroll.clientWidth);
    for (const height of heights) expect(height, `row heights ${heights.join(', ')}`).toBeLessThanOrEqual(rowCeiling(scroll, 3));
  });
  for (const width of [1280, 620]) {
    it(`at ${width}px the same table may scroll inside its own box, with rows of at most 4 lines`, async () => {
      const screen = await mount(PLAN, width);
      const scroll = box(screen);
      const heights = rowHeights(scroll);
      expect(getComputedStyle(scroll).overflowX).toBe('auto');
      if (width === 620) expect(scroll.scrollWidth, 'scrolls in its box at 620').toBeGreaterThan(scroll.clientWidth);
      for (const height of heights) expect(height, `row heights ${heights.join(', ')} (scrollWidth ${scroll.scrollWidth} of ${scroll.clientWidth})`).toBeLessThanOrEqual(rowCeiling(scroll, 4));
      expect(getComputedStyle(scroll.querySelector('td')!).whiteSpace).not.toBe('nowrap');
    });
  }
  it('a header cell never breaks mid-word', async () => {
    const screen = await mount(PLAN, 620);
    for (const th of Array.from(box(screen).querySelectorAll('th'))) {
      const lineHeight = px(getComputedStyle(th).lineHeight) || px(getComputedStyle(th).fontSize) * 1.2;
      expect(th.getBoundingClientRect().height, th.textContent ?? '').toBeLessThan(2 * lineHeight + cellSpacing(th));
    }
  });
  for (const [name, table] of [['three', THREE], ['four', FOUR]] as const) {
    it(`control: an ordinary ${name}-column table fits the pane at 620px and does not overflow`, async () => {
      const screen = await mount(table, 620);
      const scroll = box(screen);
      expect(scroll.scrollWidth, `scrollWidth ${scroll.scrollWidth} clientWidth ${scroll.clientWidth}`).toBeLessThanOrEqual(scroll.clientWidth);
      expect(scroll.hasAttribute('tabindex')).toBe(false);
    });
  }
});

// The document uses the whole content area (operator Storybook review, 2026-10-08): no reading column on the article.
describe('the article fills the content area', () => {
  it('a paragraph is at most 68ch wide even when the article is wider (control: a probe of 68ch, and the article is wider than it)', async () => {
    const text = `${'word '.repeat(400)}\n`;
    const screen = await mount(text, 1600);
    const article = screen.shadowRoot!.querySelector<HTMLElement>('article[data-scroll="article"]')!;
    const paragraph = article.querySelectorAll('p')[1] as HTMLElement;
    const probe = document.createElement('div');
    probe.style.cssText = `width:68ch;font:${getComputedStyle(paragraph).font};position:absolute;visibility:hidden`;
    article.append(probe);
    const measure = probe.getBoundingClientRect().width;
    probe.remove();
    expect(article.clientWidth).toBeGreaterThan(measure + 100);
    expect(paragraph.getBoundingClientRect().width).toBeLessThanOrEqual(measure + 1);
    expect(paragraph.getBoundingClientRect().width).toBeGreaterThan(measure - 40);
  });
});
