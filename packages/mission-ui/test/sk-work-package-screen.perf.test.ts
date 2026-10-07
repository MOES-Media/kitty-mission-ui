// NFR-006, structurally (IC-08, T055): a property change that alters ONE history entry and ONE subtask lane re-renders those two
// rows only. The proof is node identity of every other row and the exact counts; the timing is a coarse guard, never the criterion.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

const props = (): WpScreenProps => ({
  ...pairingProps('WP-44'),
  workPackage: { ...WORK_PACKAGE_FIXTURES.wpLong, history: WORK_PACKAGE_FIXTURES.wpBulkHistory.history },
});

async function mount(p: WpScreenProps): Promise<{ screen: SkWorkPackageScreen; ms: number }> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, p);
  const box = document.createElement('div');
  document.body.append(box);
  const start = performance.now();
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  return { screen, ms: performance.now() - start };
}
const root = (screen: SkWorkPackageScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const rows = (screen: SkWorkPackageScreen, selector: string): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>(selector)];
const SUBTASKS = '[data-region="subtasks"] ul > li';
const HISTORY = '[data-region="history"] ol > li';
const FILES = '[data-region="owned-files"] ul > li';
const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;

describe('NFR-006: 40 subtasks, 60 history entries and 100 files', () => {
  it('draws exactly 40, 60 and 100 rows (equality)', async () => {
    const { screen } = await mount(props());
    expect(rows(screen, SUBTASKS)).toHaveLength(40);
    expect(rows(screen, HISTORY)).toHaveLength(60);
    expect(rows(screen, FILES)).toHaveLength(100);
  });

  it('altering ONE history entry and ONE subtask lane re-renders those two rows and keeps every other row node', async () => {
    const p = props();
    const { screen } = await mount(p);
    const before = { subtasks: rows(screen, SUBTASKS), history: rows(screen, HISTORY), files: rows(screen, FILES) };
    const texts = { subtasks: before.subtasks.map((r) => r.textContent), history: before.history.map((r) => r.textContent) };
    const historyAt = 30;
    const subtaskAt = 10;
    const wp = p.workPackage;
    const detail = p.detail;
    if (wp === null || detail === null) throw new Error('fixture gap');
    const history = wp.history.map((entry, i) => (i === historyAt ? { ...entry, toStatusLane: 'blocked' } : entry));
    const subtasks = detail.subtasks.map((s, i) => (i === subtaskAt ? { ...s, statusLane: s.statusLane === 'done' ? 'planned' : 'done' } : s));
    screen.workPackage = { ...wp, history };
    screen.detail = { ...detail, subtasks };
    await screen.updateComplete;
    const after = { subtasks: rows(screen, SUBTASKS), history: rows(screen, HISTORY), files: rows(screen, FILES) };
    // Counts are exact after the change as well.
    expect([after.subtasks.length, after.history.length, after.files.length]).toEqual([40, 60, 100]);
    // (1) Positive control: both altered rows changed their text.
    expect(after.history[historyAt]?.textContent).not.toBe(texts.history[historyAt]);
    expect(after.subtasks[subtaskAt]?.textContent).not.toBe(texts.subtasks[subtaskAt]);
    // (2) Every OTHER row is the same node object, and its text is unchanged.
    let same = 0;
    for (const [i, node] of before.history.entries()) {
      if (i === historyAt) continue;
      expect(after.history[i], `history ${i}`).toBe(node);
      same += 1;
    }
    for (const [i, node] of before.subtasks.entries()) {
      if (i === subtaskAt) continue;
      expect(after.subtasks[i], `subtask ${i}`).toBe(node);
      same += 1;
    }
    for (const [i, node] of before.files.entries()) {
      expect(after.files[i], `file ${i}`).toBe(node);
      same += 1;
    }
    expect(same).toBe(59 + 39 + 100);
  });

  it('an insertion at the front keeps the later rows as the same nodes (the lists are keyed, not positional)', async () => {
    const p = props();
    const { screen } = await mount(p);
    const wp = p.workPackage;
    if (wp === null) throw new Error('fixture gap');
    const first = rows(screen, HISTORY)[0] as HTMLElement;
    const second = rows(screen, HISTORY)[1] as HTMLElement;
    const added = { ...(wp.history[0] as (typeof wp.history)[number]), eventId: 'inserted-at-the-front' };
    screen.workPackage = { ...wp, history: [added, ...wp.history] };
    await screen.updateComplete;
    const after = rows(screen, HISTORY);
    expect(after).toHaveLength(61);
    expect(after[1]).toBe(first);
    expect(after[2]).toBe(second);
  });

  it('a coarse guard: the median initial render and re-render are each 200 ms or less (not the criterion)', async () => {
    const renders: number[] = [];
    const rerenders: number[] = [];
    for (let run = 0; run < 5; run += 1) {
      const p = props();
      const { screen, ms } = await mount(p);
      renders.push(ms);
      const wp = p.workPackage;
      if (wp === null) throw new Error('fixture gap');
      const start = performance.now();
      screen.workPackage = { ...wp, history: wp.history.map((e, i) => (i === 5 ? { ...e, toStatusLane: 'blocked' } : e)) };
      await screen.updateComplete;
      rerenders.push(performance.now() - start);
      document.body.replaceChildren();
    }
    expect(renders).toHaveLength(5);
    expect(rerenders).toHaveLength(5);
    expect(median(renders)).toBeLessThanOrEqual(200);
    expect(median(rerenders)).toBeLessThanOrEqual(200);
  });
});
