// Tier outcomes (IC-10, FR-036, A-1, CP-1 option C) and large text (NFR-004). The shell owns the viewport tiers; the screen switches on its
// own cell: two columns from a content cell of 45rem (720 px), the toolbar stacked only in the shell's mobile tier at a cell of 620 px or
// less. Each outcome is asserted over the S-A6 widths and 1000 px, with a control width where it flips. The reflow helper has its control.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';

afterEach(() => {
  document.documentElement.style.removeProperty('font-size');
  document.body.replaceChildren();
});

const frames = async (n: number): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(width: number, id: PairingId = 'AV-01', height = 900): Promise<SkArtifactScreen> {
  await page.viewport(width, height);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, pairingProps(id));
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frames(3);
  return screen;
}
const q = <T extends Element>(screen: Element, selector: string): T => {
  const found = screen.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`missing ${selector}`);
  return found;
};
const tracks = (screen: Element): number => getComputedStyle(q(screen, '[data-layout]')).gridTemplateColumns.split(' ').filter((t) => t !== '').length;
const toolbar = (screen: Element): string => getComputedStyle(q(screen, '[data-region="toolbar"]')).flexDirection;

/** viewport, content cell the shell gives (null: the cell is read, not asserted), tracks, toolbar. */
const WIDTHS: [number, number, 'row' | 'stack'][] = [
  [1280, 2, 'row'],
  [1100, 2, 'row'],
  [1099, 2, 'row'],
  [1000, 2, 'row'],
  [832, 2, 'row'],
  [831, 1, 'row'],
  [801, 1, 'row'],
  [800, 1, 'row'],
  [799, 1, 'row'],
  [732, 1, 'row'],
  [720, 1, 'row'],
  [719, 1, 'row'],
  [689, 1, 'row'],
  [620, 1, 'stack'],
];

describe('tier outcomes over the S-A6 widths and 1000 px', () => {
  it('chooses the columns by the cell and the toolbar by the tier, and both outcomes occur (the control widths flip each)', async () => {
    const columns = new Set<number>();
    const directions = new Set<string>();
    let ran = 0;
    for (const [width, expected, stack] of WIDTHS) {
      const screen = await mount(width);
      const cell = screen.getBoundingClientRect().width;
      expect(tracks(screen), `${width}px (cell ${cell})`).toBe(expected);
      expect(tracks(screen), `${width}px against the 720 px cell threshold`).toBe(cell >= 720 ? 2 : 1);
      expect(toolbar(screen), `${width}px toolbar`).toBe(stack === 'stack' ? 'column' : 'row');
      columns.add(tracks(screen));
      directions.add(toolbar(screen));
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(WIDTHS.length);
    expect([...columns].sort()).toEqual([1, 2]);
    expect([...directions].sort()).toEqual(['column', 'row']);
  });

  it('flips the columns across the control pair 831 to 832 px and the toolbar across 620 to 689 px (the assertions are not constant)', async () => {
    const below = tracks(await mount(831));
    document.body.replaceChildren();
    const above = tracks(await mount(832));
    expect([below, above]).toEqual([1, 2]);
    document.body.replaceChildren();
    const stacked = toolbar(await mount(620));
    document.body.replaceChildren();
    const row = toolbar(await mount(689));
    expect([stacked, row]).toEqual(['column', 'row']);
  });

  it('places the inspector first (above) in one column and to the right in two, at 1100 px, 800 px and 620 px', async () => {
    const at = async (width: number) => {
      const screen = await mount(width);
      const inspector = q<HTMLElement>(screen, '[data-region="inspector"]').getBoundingClientRect();
      const pane = q<HTMLElement>(screen, '[data-region="document-pane"]').getBoundingClientRect();
      document.body.replaceChildren();
      return { inspector, pane };
    };
    const wide = await at(1100);
    expect(wide.inspector.left).toBeGreaterThanOrEqual(wide.pane.right - 1);
    const collapsed = await at(800);
    expect(collapsed.inspector.bottom).toBeLessThanOrEqual(collapsed.pane.top + 1);
    const mobile = await at(620);
    expect(mobile.inspector.bottom).toBeLessThanOrEqual(mobile.pane.top + 1);
  });

  it('lets a table keep its own scroll box at every width, and stacks the toolbar at 620 px with tables scrolling (AV-35)', async () => {
    const screen = await mount(620, 'AV-35');
    expect(toolbar(screen)).toBe('column');
    const box = q<HTMLElement>(screen, '[data-md="table-scroll"]');
    expect(getComputedStyle(box).overflowX).toBe('auto');
    expect(box.scrollWidth).toBeGreaterThan(box.clientWidth);
    document.body.replaceChildren();
    const wide = await mount(1280, 'AV-35');
    expect(getComputedStyle(q<HTMLElement>(wide, '[data-md="table-scroll"]')).overflowX).toBe('auto');
  });
});

/** True when anything in the document is wider than the viewport (the page scrolls sideways). */
const pageOverflows = (): boolean => document.documentElement.scrollWidth > document.documentElement.clientWidth;
/** The elements of the screen, looking through shadow roots, that scroll sideways inside their own box. */
function sidewaysScrollers(screen: Element): string[] {
  const out: string[] = [];
  const visit = (node: ParentNode): void => {
    for (const el of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(el);
      if ((style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth) out.push(el.getAttribute('data-md') ?? el.getAttribute('data-scroll') ?? el.localName);
      if (el.shadowRoot !== null) visit(el.shadowRoot);
    }
  };
  if (screen.shadowRoot !== null) visit(screen.shadowRoot);
  return out;
}

describe('NFR-004: large text and reflow', () => {
  it('the overflow helper has a control: a deliberately wide child flips it', async () => {
    await page.viewport(800, 600);
    expect(pageOverflows()).toBe(false);
    const wide = document.createElement('div');
    wide.style.cssText = 'width:5000px;height:4px';
    document.body.append(wide);
    expect(pageOverflows()).toBe(true);
    wide.remove();
    expect(pageOverflows()).toBe(false);
  });

  it('at a 200% root size the page does not scroll sideways at 1100 and 720 px, and 1100 px resolves to one column', async () => {
    let ran = 0;
    for (const width of [1100, 720]) {
      document.documentElement.style.fontSize = '200%';
      const screen = await mount(width);
      expect(pageOverflows(), `${width}px at 200%`).toBe(false);
      expect(screen.scrollWidth, `${width}px screen at 200%`).toBeLessThanOrEqual(screen.clientWidth + 1);
      if (width === 1100) expect(tracks(screen), 'the resolved track count at 200% and 1100 px').toBe(1);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(2);
    // The control: the same viewport at 100% is two columns, so the single column is the effect of the text size.
    document.documentElement.style.removeProperty('font-size');
    expect(tracks(await mount(1100))).toBe(2);
  });

  /** The elements of the screen's own shadow tree whose right edge passes the screen's, outside a table scroll box (a table box clips its own table). */
  function pokingOut(screen: Element): string[] {
    const edge = screen.getBoundingClientRect().right + 1;
    const out: string[] = [];
    const visit = (node: ParentNode): void => {
      for (const el of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
        if (el.closest('[data-md="table-scroll"]') !== null) continue;
        if (el.getBoundingClientRect().right > edge) out.push(`${el.localName}[${el.getAttribute('data-region') ?? el.getAttribute('data-md') ?? ''}]`);
        if (el.shadowRoot !== null) visit(el.shadowRoot);
      }
    };
    if (screen.shadowRoot !== null) visit(screen.shadowRoot);
    return out;
  }

  // WCAG 1.4.10 means a viewport of 320 CSS px, which is a 1280 px window at 400% browser zoom: the text stays at the root size of the
  // page, and the zoom is what narrows the viewport. That is the reading asserted here. A root font size of 400% inside a 320 px viewport
  // is a different case (the rem padding of the document alone is 192 px of 320, leaving a column of 128 px): see the report.
  it('at a 320 px viewport (400% zoom of 1280 px) only tables scroll sideways inside the screen, and nothing of the screen pokes out of it', async () => {
    const screen = await mount(320, 'AV-35', 700);
    expect(screen.getBoundingClientRect().right, 'the screen fits the viewport').toBeLessThanOrEqual(320);
    const scrollers = sidewaysScrollers(screen);
    expect(scrollers, 'the table box scrolls').toContain('table-scroll');
    expect(scrollers.filter((name) => name !== 'table-scroll')).toEqual([]);
    expect(pokingOut(screen)).toEqual([]);
    expect(pageOverflows(), 'the page does not scroll sideways').toBe(false);
    // The control: a deliberately wide child inside the screen is found by the same helpers.
    const planted = document.createElement('div');
    planted.style.cssText = 'width:3000px;height:2px';
    screen.shadowRoot?.querySelector('[data-region="document-pane"]')?.append(planted);
    expect(pokingOut(screen)).toContain('div[]');
    expect(sidewaysScrollers(screen).filter((name) => name !== 'table-scroll').length).toBeGreaterThan(0);
    planted.remove();
  });
});
