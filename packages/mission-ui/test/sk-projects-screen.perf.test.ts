// NFR-006: fifty entries render, and a property change re-renders, within 200 ms (PR-25). Plain DOM, no virtualization, the
// tab order intact. The clock is `performance.now` in this test only; the shipped source reads no clock (the data-driven gate).
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { NOW, fiftyEntries, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { projectCountText } from '../src/defaults/index.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

const BUDGET_MS = 200;
const SAMPLES = 5;
/** The median of the samples, so one scheduling hiccup on a loaded machine is not the verdict (the #5 precedent). */
const median = (values: number[]): number => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
const rowElements = (screen: SkProjectsScreen): Array<HTMLElement & { updateComplete: Promise<unknown> }> =>
  Array.from(root(screen).querySelectorAll<HTMLElement & { updateComplete: Promise<unknown> }>('li sk-action-row'));

/** Waits for the screen, every library row and the next paint: what the person sees, not only the screen's own update. */
async function painted(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await Promise.all(rowElements(screen).map((row) => row.updateComplete));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mountEmpty(): Promise<SkProjectsScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: [], now: NOW });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await painted(screen);
  return screen;
}

/** A warm-up render of the same size, so the clock measures a steady render and not the first-use cost of the library elements. */
async function warmUp(screen: SkProjectsScreen): Promise<void> {
  screen.entries = fiftyEntries();
  await painted(screen);
  screen.entries = [];
  await painted(screen);
}

describe('NFR-006: fifty entries in plain DOM within the budget', () => {
  it('renders fifty entries within 200 ms and draws every one of them (no virtualization)', async () => {
    const screen = await mountEmpty();
    await warmUp(screen);
    const samples: number[] = [];
    for (let run = 0; run < SAMPLES; run += 1) {
      screen.entries = [];
      await painted(screen);
      const started = performance.now();
      screen.entries = fiftyEntries();
      await painted(screen);
      samples.push(performance.now() - started);
    }
    const elapsed = median(samples);
    expect(samples).toHaveLength(SAMPLES);
    expect(root(screen).querySelectorAll('li')).toHaveLength(50);
    expect(rowElements(screen)).toHaveLength(50);
    expect(root(screen).querySelector('[data-count]')?.textContent?.trim()).toBe(projectCountText(50));
    expect(elapsed, `median of ${SAMPLES}: rendered 50 entries in ${elapsed.toFixed(1)} ms (${samples.map((v) => v.toFixed(0)).join(', ')})`).toBeLessThanOrEqual(BUDGET_MS);
    // Positive control: the same clock fails the same ceiling for a deliberately slow render path (250 ms of work before the paint).
    screen.entries = threeEntries();
    await painted(screen);
    expect(root(screen).querySelectorAll('li')).toHaveLength(3);
    const slow = performance.now();
    screen.entries = fiftyEntries();
    for (const spin = performance.now(); performance.now() - spin < BUDGET_MS + 50; ) {
      // a deliberately slow path
    }
    await painted(screen);
    expect(performance.now() - slow, 'the slow path is over the budget').toBeGreaterThan(BUDGET_MS);
  });

  it('re-renders fifty entries within 200 ms when a property changes, for the clock and for one entry', async () => {
    const screen = await mountEmpty();
    await warmUp(screen);
    screen.entries = fiftyEntries();
    await painted(screen);
    const firstActivity = (): string => root(screen).querySelector('li [data-activity]')?.textContent?.trim() ?? '';
    const clockSamples: number[] = [];
    const clocks = ['2026-10-04T09:30:00Z', '2026-10-04T11:45:00Z', '2026-10-05T09:30:00Z', '2026-10-05T11:45:00Z', '2026-10-06T09:30:00Z'];
    const original = firstActivity();
    for (const clockValue of clocks) {
      const clock = performance.now();
      screen.now = clockValue;
      await painted(screen);
      clockSamples.push(performance.now() - clock);
    }
    // The clock really moved the text (the first and the last clock read differently from the start).
    expect(firstActivity()).not.toBe(original);
    const clockElapsed = median(clockSamples);
    expect(clockSamples).toHaveLength(SAMPLES);
    expect(clockElapsed, `median of ${SAMPLES}: clock change re-rendered 50 rows in ${clockElapsed.toFixed(1)} ms`).toBeLessThanOrEqual(BUDGET_MS);
    const oneSamples: number[] = [];
    for (let run = 0; run < SAMPLES; run += 1) {
      const entries = fiftyEntries();
      const renamed = entries[24];
      if (renamed?.project === undefined) throw new Error('fixture without a project');
      entries[24] = { ...renamed, project: { ...renamed.project, missionCount: 7 + run } };
      const one = performance.now();
      screen.entries = entries;
      await painted(screen);
      oneSamples.push(performance.now() - one);
      expect(root(screen).querySelector('li[data-key="project-25"] [data-side] span')?.textContent?.trim()).toBe(`${7 + run} Missions`);
    }
    const oneElapsed = median(oneSamples);
    expect(oneSamples).toHaveLength(SAMPLES);
    expect(oneElapsed, `median of ${SAMPLES}: entries replaced in ${oneElapsed.toFixed(1)} ms`).toBeLessThanOrEqual(BUDGET_MS);
    expect(root(screen).querySelectorAll('li')).toHaveLength(50);
  });

  it('keeps the tab order intact: every one of the fifty rows is one stop, in host order, after the header button', async () => {
    const screen = await mountEmpty();
    screen.entries = fiftyEntries();
    await painted(screen);
    const before = document.createElement('a');
    before.href = '#before';
    document.body.prepend(before);
    before.focus();
    const keys: string[] = [];
    let stopsBeforeRows = 0;
    for (let i = 0; i < 70; i += 1) {
      await userEvent.tab();
      let active: Element | null = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      const host = (active?.getRootNode() as ShadowRoot | undefined)?.host;
      if (host?.localName === 'sk-action-row') keys.push(host.closest('li')?.getAttribute('data-key') ?? '');
      else stopsBeforeRows += 1;
      if (keys.length === 50) break;
    }
    // The skip link, the shell's Settings button and the header button come first.
    expect(stopsBeforeRows).toBe(3);
    expect(keys).toEqual(fiftyEntries().map((entry) => entry.key));
    expect(keys).toHaveLength(50);
  });
});
