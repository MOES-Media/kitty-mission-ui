import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import type { SkMissionsScreen } from '../src/elements/sk-missions-screen/sk-missions-screen.js';
import { bulkMissions, fullMoreInfo, projectOf } from '../src/elements/sk-missions-screen/fixtures.js';
import { filterButton, mount, missionItems, readyProps, resetDocument, searchInput } from './support/missions-screen-harness.js';

afterEach(resetDocument);

describe('500 Missions, 200 ms', () => {
  async function mountBulk(): Promise<{ el: SkMissionsScreen; before: HTMLLIElement[] }> {
    const missions = bulkMissions(500);
    const el = await mount({ ...readyProps(), missions, pageInfo: fullMoreInfo, project: projectOf(500) });
    const before = missionItems(el);
    expect(before.length).toBe(500);
    expect(before.filter((li) => li.hidden).length).toBe(0);
    return { el, before };
  }

  function expectSameNodes(el: SkMissionsScreen, before: HTMLLIElement[]): void {
    const after = missionItems(el);
    expect(after.length).toBe(500);
    for (const index of [0, 249, 499]) expect(after[index]).toBe(before[index]);
    let same = 0;
    for (let i = 0; i < 500; i += 1) {
      if (after[i] === before[i]) same += 1;
    }
    expect(same).toBe(500);
    const hidden = after.filter((li) => li.hidden).length;
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(500);
  }

  it('a filter press (the real button) updates the rows within 200 ms; the same li nodes survive', async () => {
    const { el, before } = await mountBulk();
    const button = filterButton(el, 'Done');
    const start = performance.now();
    button.click();
    await el.updateComplete;
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThanOrEqual(200);
    expectSameNodes(el, before);
  });

  it('a keystroke in the real search input updates the rows within 200 ms; the same li nodes survive', async () => {
    const { el, before } = await mountBulk();
    const input = searchInput(el);
    input.focus();
    // The keystroke itself travels through the browser-mode command channel (tens of milliseconds of test plumbing, not
    // screen work), so the clock runs from the input event reaching the screen to the end of its update.
    let start = 0;
    let end = 0;
    el.addEventListener('input', () => (start = performance.now()), { capture: true });
    el.addEventListener('input', () => void el.updateComplete.then(() => (end = performance.now())));
    await userEvent.keyboard('7');
    await el.updateComplete;
    const elapsed = end - start;
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThanOrEqual(start);
    expect(elapsed).toBeLessThanOrEqual(200);
    expectSameNodes(el, before);
  });
});
