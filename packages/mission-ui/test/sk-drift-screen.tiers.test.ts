// The three narrower tiers of the Drift screen (DR-27, DR-28, DR-29, shell-mobile, T037): side by side at 1100, the list above the
// detail with the list border dropped at 800, one column with the lane table scrolling sideways and Copy reachable at 620. Real
// geometry in the real shell at the real viewport widths; every loop asserts how often it ran.
// Revert check (temporary local edit, never committed): in `sk-drift-screen.ts` delete the `@container (max-width: 799px)` block and
// "800: the list is above the detail" fails (the two panes stay side by side).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps>, width: number): Promise<SkDriftScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  await screen.updateComplete;
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
function one<T extends HTMLElement>(screen: SkDriftScreen, selector: string): T {
  const found = root(screen).querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const box = (screen: SkDriftScreen, selector: string): DOMRect => one(screen, selector).getBoundingClientRect();
const POPULATED = reportProps('reportPopulated', { select: 1 });

/** The many-lane finding with one over-long Work Package identifier, so the table is wider than any column. */
function wideLaneProps(): Partial<DriftScreenProps> {
  const wide = reportProps('reportManyLanes', { select: 0 });
  const report = wide.report;
  const finding = report?.findings[0];
  if (report === null || finding === undefined) throw new Error('fixture');
  const longId = 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx';
  const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
  return { ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } };
}
const pageOverflow = (): number => document.documentElement.scrollWidth - document.documentElement.clientWidth;

describe('DR-27: the collapsed tier, 1100 px', () => {
  it('1100: the list and the detail stand side by side on one row, the list border is drawn', async () => {
    const screen = await mount(POPULATED, 1100);
    const list = box(screen, '[data-region="list"]');
    const detail = box(screen, '[data-region="detail"]');
    expect(list.right).toBeLessThanOrEqual(detail.left + 1);
    expect(Math.abs(list.top - detail.top)).toBeLessThanOrEqual(1);
    expect(list.width).toBe(420);
    expect(getComputedStyle(one(screen, '[data-region="list"]')).borderInlineEndWidth).toBe('1px');
    expect(screen.matches(':state(shell-mobile)')).toBe(false);
    expect(pageOverflow()).toBeLessThanOrEqual(0);
  });
});

describe('DR-28: the narrow tier, 800 px', () => {
  it('800: the list is above the detail, both span the column, the list border is dropped', async () => {
    const screen = await mount(POPULATED, 800);
    const list = box(screen, '[data-region="list"]');
    const detail = box(screen, '[data-region="detail"]');
    expect(detail.top).toBeGreaterThanOrEqual(list.bottom - 1);
    expect(Math.abs(list.left - detail.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(list.width - detail.width)).toBeLessThanOrEqual(1);
    expect(getComputedStyle(one(screen, '[data-region="list"]')).borderInlineEndWidth).toBe('0px');
    expect(pageOverflow()).toBeLessThanOrEqual(0);
  });

  it('800 is a narrow but not a mobile tier: the shell mobile state is not set (positive control: 620 sets it, below)', async () => {
    expect((await mount(POPULATED, 800)).matches(':state(shell-mobile)')).toBe(false);
    document.body.replaceChildren();
    expect((await mount(POPULATED, 620)).matches(':state(shell-mobile)')).toBe(true);
  });
});

describe('DR-29: the mobile tier, 620 px', () => {
  it('620: one column under :state(shell-mobile), the list above the detail, no border, no page overflow', async () => {
    const screen = await mount(POPULATED, 620);
    expect(screen.matches(':state(shell-mobile)')).toBe(true);
    const list = box(screen, '[data-region="list"]');
    const detail = box(screen, '[data-region="detail"]');
    expect(detail.top).toBeGreaterThanOrEqual(list.bottom - 1);
    expect(getComputedStyle(one(screen, '[data-region="list"]')).borderInlineEndWidth).toBe('0px');
    expect(pageOverflow()).toBeLessThanOrEqual(0);
  });

  it('620: a table wider than the column scrolls sideways in its own region (a labelled, focusable region); the page does not', async () => {
    const screen = await mount(wideLaneProps(), 620);
    const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(getComputedStyle(scroller).overflowX).toMatch(/auto|scroll/);
    expect(scroller.getAttribute('role')).toBe('region');
    expect(scroller.tabIndex).toBe(0);
    const before = scroller.scrollLeft;
    scroller.scrollLeft = 80;
    expect(scroller.scrollLeft).toBeGreaterThan(before);
    expect(pageOverflow()).toBeLessThanOrEqual(0);
    expect(screen.scrollWidth).toBeLessThanOrEqual(screen.clientWidth);
    // Positive control: at 1280 the same table fits, so it is no region and has no tab stop.
    document.body.replaceChildren();
    const roomy = await mount(reportProps('reportPopulated', { select: 1 }), 1280);
    expect(one<HTMLElement>(roomy, '.sk-data-table__scroller').getAttribute('role')).toBeNull();
  });

  it('620: Copy is reachable with the table scrolled sideways: inside the viewport, hit by its own centre point, and one click emits one event with the exact detail', async () => {
    const props = wideLaneProps();
    const finding = props.report?.findings[0];
    if (finding === undefined) throw new Error('fixture');
    const screen = await mount(props, 620);
    const seen: CustomEvent[] = [];
    screen.addEventListener('sk-copy-command', (event) => seen.push(event as CustomEvent));
    const copy = one<HTMLElement>(screen, '[data-copy]');
    copy.scrollIntoView({ block: 'center' });
    const resting = copy.getBoundingClientRect();
    // The table scrolls in its own region: scrolling it sideways must not move Copy.
    const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    scroller.scrollLeft = 80;
    expect(scroller.scrollLeft).toBeGreaterThan(0);
    const rect = copy.getBoundingClientRect();
    expect(rect.left).toBe(resting.left);
    expect(rect.top).toBe(resting.top);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
    expect(rect.height).toBeGreaterThanOrEqual(44);
    const hit = root(screen).elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    expect(hit === copy || copy.contains(hit)).toBe(true);
    const command = one<HTMLElement>(screen, '[data-command]').textContent?.trim() ?? '';
    expect(command.startsWith('spec-kitty ')).toBe(true);
    copy.click();
    expect(seen).toHaveLength(1);
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
    expect(seen[0]?.cancelable).toBe(false);
    expect(seen[0]?.detail).toEqual({ text: command, missionId: finding.missionId, remedy: finding.remedy });
  });
});

describe('the four tiers in turn', () => {
  it('1280, 1100, 800 and 620: the number of columns follows the container, the list stays whole, nothing overflows the page', async () => {
    const expected = new Map<number, number>([
      [1280, 2],
      [1100, 2],
      [800, 1],
      [620, 1],
    ]);
    let ran = 0;
    for (const [width, columns] of expected) {
      const screen = await mount(POPULATED, width);
      const tracks = getComputedStyle(one(screen, '[data-layout]')).gridTemplateColumns.split(' ').length;
      expect(tracks, `${width}`).toBe(columns);
      expect(root(screen).querySelectorAll('[role="option"]'), `${width}`).toHaveLength(5);
      expect(pageOverflow(), `${width}`).toBeLessThanOrEqual(0);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});
