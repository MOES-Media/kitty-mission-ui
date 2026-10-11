// T045 (NFR-006, SC-007): the cost of a long list. 200 rows render, and re-render on a property change, in 200 ms or less; 1,000
// rows accumulated across five pages render in 500 ms or less. The clock is read by this TEST (the screen reads none); the ceilings
// are asserted and the measured values are recorded in the test output. Every count is asserted with equality.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import { shellFrame } from '../src/story-support/shell-frame.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { opsAccumulated, opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

const CEILING_200_MS = 200;
const CEILING_1000_MS = 500;

afterEach(() => {
  document.body.replaceChildren();
});

const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
const rowsOf = (screen: SkOpsScreen): HTMLElement[] => [...(screen.shadowRoot as ShadowRoot).querySelectorAll<HTMLElement>('li[data-row-id]')];
const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;

/** Mounts the screen in the shell frame with `props` and returns the milliseconds from the first render call to `updateComplete`. */
async function renderMs(props: OpsScreenProps): Promise<{ screen: SkOpsScreen; ms: number }> {
  await page.viewport(1280, 900);
  const box = document.createElement('div');
  document.body.append(box);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const start = performance.now();
  render(shellFrame(html`${screen}`, { flush: true, current: 'nav-ops' }), box);
  await screen.updateComplete;
  return { screen, ms: performance.now() - start };
}

describe('NFR-006: 200 rows', () => {
  it('renders exactly 200 rows in 200 ms or less (median of 5 mounts)', async () => {
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const { screen, ms } = await renderMs(opsProps.longPage(200));
      expect(rowsOf(screen)).toHaveLength(200);
      samples.push(ms);
      document.body.replaceChildren();
    }
    expect(samples).toHaveLength(5);
    const measured = median(samples);
    console.info(`ops-perf: 200 rows first render median ${measured.toFixed(1)} ms (samples ${samples.map((s) => s.toFixed(1)).join(', ')}; ceiling ${CEILING_200_MS})`);
    expect(measured).toBeLessThanOrEqual(CEILING_200_MS);
  });

  it('re-renders 200 rows on a property change in 200 ms or less, keeping every row node when only the count changes', async () => {
    const { screen } = await renderMs(opsProps.longPage(200));
    const before = rowsOf(screen);
    expect(before).toHaveLength(200);
    const samples: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const start = performance.now();
      screen.totalCount = 1000 + i;
      await screen.updateComplete;
      samples.push(performance.now() - start);
    }
    expect(samples).toHaveLength(5);
    const after = rowsOf(screen);
    expect(after).toHaveLength(200);
    let same = 0;
    for (const [i, node] of before.entries()) if (after[i] === node) same += 1;
    expect(same).toBe(200);
    const measured = median(samples);
    console.info(`ops-perf: 200 rows property change median ${measured.toFixed(1)} ms (samples ${samples.map((s) => s.toFixed(1)).join(', ')}; ceiling ${CEILING_200_MS})`);
    expect(measured).toBeLessThanOrEqual(CEILING_200_MS);
    // Positive control: the change was drawn (the count badge carries the new total).
    expect((screen.shadowRoot as ShadowRoot).querySelector('[data-count]')?.textContent).toContain('1004');
  });
});

describe('NFR-006: 1,000 rows across pages', () => {
  it('draws exactly 1,000 rows in 500 ms or less as one accumulation, and the fifth page appended in 500 ms or less', async () => {
    const { screen, ms } = await renderMs(opsAccumulated(5));
    expect(rowsOf(screen)).toHaveLength(1000);
    console.info(`ops-perf: 1000 rows first render ${ms.toFixed(1)} ms (ceiling ${CEILING_1000_MS})`);
    expect(ms).toBeLessThanOrEqual(CEILING_1000_MS);

    // Pages arriving one by one: the ceiling holds for the last append (800 rows shown, then 1,000).
    document.body.replaceChildren();
    const all = opsAccumulated(5);
    const paged = await renderMs({ ...all, items: all.items.slice(0, 800) });
    expect(rowsOf(paged.screen)).toHaveLength(800);
    const start = performance.now();
    paged.screen.items = all.items;
    paged.screen.pageInfo = all.pageInfo;
    await paged.screen.updateComplete;
    const append = performance.now() - start;
    await frames();
    expect(rowsOf(paged.screen)).toHaveLength(1000);
    console.info(`ops-perf: 800 -> 1000 rows append ${append.toFixed(1)} ms (ceiling ${CEILING_1000_MS})`);
    expect(append).toBeLessThanOrEqual(CEILING_1000_MS);
  });
});
