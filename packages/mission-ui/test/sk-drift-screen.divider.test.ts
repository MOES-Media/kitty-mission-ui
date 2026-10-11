// SR-1 (Storybook review 2026-10-11): in the two-pane tier the divider (the list pane's inline-end border) runs to the bottom of
// the shell's content cell, however short the content; with tall content it runs the full content height and the cell scrolls as a whole.
// Real geometry in the real shell. Revert check (temporary local edit, never committed): remove `flex-grow: 1` from the host in
// `sk-drift-screen.ts` and "short content" fails (the list ends above the cell's bottom).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, pairReport, bulkProps, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps>, width: number, height: number): Promise<{ screen: SkDriftScreen; cell: HTMLElement }> {
  await page.viewport(width, height);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const host = document.createElement('div');
  document.body.append(host);
  render(driftFrame(html`${screen}`), host);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  await screen.updateComplete;
  const shell = document.querySelector('sk-mission-shell');
  if (shell === null) throw new Error('no shell');
  shell.style.blockSize = '100vh';
  await screen.updateComplete;
  const cell = shell.shadowRoot?.querySelector<HTMLElement>('[data-content]') ?? null;
  if (cell === null) throw new Error('no content cell');
  return { screen, cell };
}
function one(screen: SkDriftScreen, selector: string): HTMLElement {
  const found = screen.shadowRoot?.querySelector<HTMLElement>(selector) ?? null;
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}

function shortProps(): Partial<DriftScreenProps> {
  const full = reportProps('reportPopulated', { select: 0 });
  const report = full.report;
  const first = report?.findings[0];
  if (report === null || first === undefined) throw new Error('fixture');
  return pairReport({ ...report, findings: [first] }, { select: 0 });
}

describe('SR-1: the pane divider reaches the bottom of the content cell', () => {
  it('short content, 1280x800: the list ends at the cell bottom and carries the divider', async () => {
    const { screen, cell } = await mount(shortProps(), 1280, 800);
    const list = one(screen, '[data-region="list"]');
    const detail = one(screen, '[data-region="detail"]');
    const layout = one(screen, '[data-layout]');
    expect(cell.scrollHeight).toBeLessThanOrEqual(cell.clientHeight + 1);
    expect(Math.abs(list.getBoundingClientRect().bottom - cell.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.getBoundingClientRect().bottom - cell.getBoundingClientRect().bottom)).toBeLessThanOrEqual(1);
    expect(detail.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(getComputedStyle(list).borderInlineEndWidth).toBe('1px');
    expect(getComputedStyle(list).borderInlineEndStyle).toBe('solid');
  });

  it('tall content, 1280x800: the divider spans the full content and the cell scrolls as a whole', async () => {
    const { screen, cell } = await mount(bulkProps({ select: 0 }), 1280, 800);
    const list = one(screen, '[data-region="list"]').getBoundingClientRect();
    const layout = one(screen, '[data-layout]').getBoundingClientRect();
    expect(cell.scrollHeight).toBeGreaterThan(cell.clientHeight + 50);
    expect(Math.abs(list.bottom - layout.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(list.bottom - (cell.getBoundingClientRect().top - cell.scrollTop + cell.scrollHeight))).toBeLessThanOrEqual(1);
    expect(getComputedStyle(one(screen, '[data-region="list"]')).overflowY).toBe('visible');
    expect(getComputedStyle(one(screen, '[data-region="detail"]')).overflowY).toBe('visible');
  });

  it('one column, 800x2400: no divider, the panes stack without spare height between them', async () => {
    const { screen } = await mount(shortProps(), 800, 2400);
    expect(getComputedStyle(one(screen, '[data-region="list"]')).borderInlineEndWidth).toBe('0px');
    // The spare height is not shared out between the stacked panes: the list ends where its own rows end.
    const list = one(screen, '[data-region="list"]').getBoundingClientRect();
    const listbox = one(screen, '[data-region="listbox"]').getBoundingClientRect();
    expect(list.bottom - listbox.bottom).toBeLessThanOrEqual(1);
  });

  // TESTS-006: 620 px is inside the shell's mobile tier AND below the 800 px container threshold; the case pins the one-column form there.
  it('one column, 620x2400: no divider, the panes stack without spare height between them (the shell-mobile tier)', async () => {
    const { screen } = await mount(shortProps(), 620, 2400);
    const layout = one(screen, '[data-layout]');
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(1);
    expect(getComputedStyle(layout).alignContent).toBe('start');
    expect(getComputedStyle(one(screen, '[data-region="list"]')).borderInlineEndWidth).toBe('0px');
    const list = one(screen, '[data-region="list"]').getBoundingClientRect();
    const listbox = one(screen, '[data-region="listbox"]').getBoundingClientRect();
    expect(list.bottom - listbox.bottom).toBeLessThanOrEqual(1);
  });
});

describe('the detail blocks stack at the start of a tall cell (TESTS-005)', () => {
  // Without `align-content: start` on the detail, its grid rows share the spare height of the stretched cell and the blocks spread down the pane.
  it('1280x1600: the blocks are one gap apart and the last one ends well above the cell bottom (positive control: the cell is taller than the detail)', async () => {
    const { screen, cell } = await mount(reportProps('reportPopulated', { select: 1 }), 1280, 1600);
    const detail = one(screen, '[data-region="detail"]');
    const gap = Number.parseFloat(getComputedStyle(detail).rowGap);
    expect(gap).toBeGreaterThan(0);
    const blocks = [...detail.children] as HTMLElement[];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    const spare = cell.getBoundingClientRect().bottom - blocks[blocks.length - 1]!.getBoundingClientRect().bottom;
    expect(spare, 'the cell is much taller than the detail').toBeGreaterThan(300);
    let pairs = 0;
    for (let i = 1; i < blocks.length; i += 1) {
      const between = blocks[i]!.getBoundingClientRect().top - blocks[i - 1]!.getBoundingClientRect().bottom;
      expect(Math.abs(between - gap), `block ${i}`).toBeLessThanOrEqual(1);
      pairs += 1;
    }
    expect(pairs).toBe(blocks.length - 1);
  });
});
