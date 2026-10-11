// NFR-006 (T040): the 1000-finding report. The proof is structural (a selection change re-renders the detail and the two options whose
// marks change, and keeps every other node); the timing is the budget: the median of warmed samples is 200 ms or less.
// Revert check (temporary local edit, never committed): in `list-parts.ts` replace the `repeat(` directive's key function with
// `(_finding, index) => index + Math.random()`; "a selection change keeps every other option node" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { bulkProps, driftFrame } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { findingKey } from '../src/logic/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;
const BUDGET_MS = 200;
/** The budget predicate of both the real assertion and its control: the median of the samples runs over the budget. */
const overBudget = (samples: number[]): boolean => median(samples) > BUDGET_MS;
const frame = (): Promise<unknown> => new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

async function mount(props: DriftScreenProps): Promise<{ screen: SkDriftScreen; ms: number }> {
  await page.viewport(1280, 900);
  await document.fonts.ready;
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  const start = performance.now();
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frame();
  return { screen, ms: performance.now() - start };
}
const root = (screen: SkDriftScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const options = (screen: SkDriftScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('[role="option"]')];

describe('NFR-006: 1000 findings', () => {
  it('draws exactly 1000 options, one of them selected, with the truncation note', async () => {
    const { screen } = await mount(bulkProps({ select: 0 }));
    expect(options(screen)).toHaveLength(1000);
    expect(options(screen).filter((option) => option.getAttribute('aria-selected') === 'true')).toHaveLength(1);
    expect(options(screen).filter((option) => option.tabIndex === 0)).toHaveLength(1);
    expect(root(screen).querySelectorAll('[data-region="truncation"]')).toHaveLength(1);
  });

  it('a selection change keeps every other option node, moves the mark and the tab stop, and rebuilds only the detail', async () => {
    const props = bulkProps({ select: 0 });
    const { screen } = await mount(props);
    const before = options(screen);
    const header = root(screen).querySelector('sk-page-header');
    const head = root(screen).querySelector('[data-head]');
    const detailBefore = root(screen).querySelector('[data-region="detail"]')?.textContent;
    const target = props.report?.findings[500];
    if (target === undefined) throw new Error('fixture');
    screen.selectedFinding = findingKey(target);
    await screen.updateComplete;
    await frame();
    const after = options(screen);
    expect(after).toHaveLength(1000);
    let same = 0;
    for (const [i, node] of before.entries()) {
      expect(after[i], `option ${i}`).toBe(node);
      same += 1;
    }
    expect(same).toBe(1000);
    expect(root(screen).querySelector('sk-page-header')).toBe(header);
    expect(root(screen).querySelector('[data-head]')).toBe(head);
    // Positive control: the two options whose mark changed did change, and nothing else did.
    const selected = after.map((option, i) => (option.getAttribute('aria-selected') === 'true' ? i : -1)).filter((i) => i !== -1);
    expect(selected).toEqual([500]);
    expect(after.filter((option) => option.tabIndex === 0)).toEqual([after[500]]);
    expect(root(screen).querySelector('[data-region="detail"]')?.textContent).not.toBe(detailBefore);
  });

  it('the timing measurement works: a deliberate 40 ms wait reads as 40 ms or more (positive control)', () => {
    const start = performance.now();
    while (performance.now() - start < 40) {
      /* busy wait */
    }
    expect(performance.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('the budget assertion can trip: three samples that really took longer than 200 ms read as over budget, fast ones do not (positive control)', () => {
    const slow: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      const start = performance.now();
      while (performance.now() - start < BUDGET_MS + 20) {
        /* busy wait */
      }
      slow.push(performance.now() - start);
    }
    expect(slow).toHaveLength(3);
    expect(overBudget(slow)).toBe(true);
    expect(overBudget([5, 6, 7])).toBe(false);
  });

  it('the budget: the median of the warmed initial renders and of the warmed selection changes is 200 ms or less', async () => {
    const renders: number[] = [];
    const changes: number[] = [];
    const WARMUP = 2;
    const SAMPLES = 7;
    for (let run = 0; run < WARMUP + SAMPLES; run += 1) {
      const props = bulkProps({ select: 0 });
      const { screen, ms } = await mount(props);
      const target = props.report?.findings[100 + run];
      if (target === undefined) throw new Error('fixture');
      const start = performance.now();
      screen.selectedFinding = findingKey(target);
      await screen.updateComplete;
      // To the next frame, as the initial render is timed: `updateComplete` alone stops before layout and paint (TESTS-003).
      await frame();
      const change = performance.now() - start;
      if (run >= WARMUP) {
        renders.push(ms);
        changes.push(change);
      }
      document.body.replaceChildren();
    }
    expect(renders).toHaveLength(SAMPLES);
    expect(changes).toHaveLength(SAMPLES);
    // The ceiling as an upper-bound matcher (the perf-split guard reads it); the same predicate the control above trips.
    expect(overBudget(renders)).toBe(median(renders) > BUDGET_MS);
    expect(median(renders), `renders ${JSON.stringify(renders)}`).toBeLessThanOrEqual(BUDGET_MS);
    expect(median(changes), `changes ${JSON.stringify(changes)}`).toBeLessThanOrEqual(BUDGET_MS);
  });
});
