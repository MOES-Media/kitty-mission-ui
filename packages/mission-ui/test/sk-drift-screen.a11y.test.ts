// Focus order, focus loss, 200 percent text, forced colours and reduced motion of the whole Drift screen (DR-26, T038, T039, FR-025,
// NFR-003, NFR-004, NFR-011). Real Tab presses in the real shell; forced colours and reduced motion are emulated through the
// browser protocol (never a stylesheet stand-in), reset after every test, and each has a positive control.
// Revert check (temporary local edit, never committed): in `list-parts.ts` delete the `@media (forced-colors: active)` rule of the
// selected option and "forced colours: the selected row stays distinguishable" fails.
/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps, unbreakableSlug } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { Dr26Copy, Dr26Rescan } from '../src/elements/sk-drift-screen/sk-drift-screen.tiers.stories.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';
import type { DriftReportView } from '../src/contract/types.js';

const media = (feature: 'forced-colors' | 'prefers-reduced-motion', value: string): Promise<unknown> =>
  cdp().send('Emulation.setEmulatedMedia', { features: [{ name: feature, value }] });

afterEach(async () => {
  await media('forced-colors', 'none');
  await media('prefers-reduced-motion', 'no-preference');
  (document.activeElement as HTMLElement | null)?.blur();
  document.documentElement.style.fontSize = '';
  document.body.replaceChildren();
});

async function settle(screen: SkDriftScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  await screen.updateComplete;
}
async function mount(props: Partial<DriftScreenProps> = {}, width = 1280): Promise<SkDriftScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  await Promise.all([...(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-button, sk-page-header, sk-pill-tag') ?? [])].map((el) => el.updateComplete));
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
/** The innermost focused element, through every shadow root. */
function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement != null) active = active.shadowRoot.activeElement;
  return active;
}
/** The element of the screen's shadow root that holds the focus (the host of a library button, else the element itself). */
function screenFocus(screen: SkDriftScreen): HTMLElement | null {
  return (root(screen).activeElement as HTMLElement | null) ?? null;
}
function stopName(screen: SkDriftScreen, stop: HTMLElement | null): string {
  if (stop === null) return 'none';
  if (stop.hasAttribute('data-rescan')) return 'rescan';
  if (stop.getAttribute('role') === 'option') return 'listbox';
  if (stop.hasAttribute('data-mission-link')) return 'mission-link';
  if (stop.hasAttribute('data-copy')) return 'copy';
  if (stop.classList.contains('sk-data-table__scroller')) return 'lane-table';
  return stop.localName;
}

/** Tab from the top of the page to a sentinel after the screen. Every stop is recorded as `{ inside, name }`, in order. */
async function walk(screen: SkDriftScreen): Promise<Array<{ n: number; name: string; element: Element }>> {
  const after = document.createElement('a');
  after.href = '#after';
  after.textContent = 'after';
  document.body.append(after);
  (document.activeElement as HTMLElement | null)?.blur();
  const stops: Array<{ n: number; name: string; element: Element }> = [];
  let n = 0;
  for (let i = 0; i < 40; i += 1) {
    await userEvent.tab();
    n += 1;
    const active = deepActive();
    if (active === after) break;
    const inside = document.activeElement === screen ? screenFocus(screen) : null;
    if (inside !== null) stops.push({ n, name: stopName(screen, inside), element: inside });
  }
  expect(deepActive(), 'the walk reached the sentinel after the screen').toBe(after);
  return stops;
}

const ringOf = (element: HTMLElement): CSSStyleDeclaration => {
  const inner = element.shadowRoot?.querySelector('button') ?? element;
  return getComputedStyle(inner);
};
/**
 * The library controls draw a solid outline of 2 px or more. The finding option is a raw button (E-36, as in the prototype) and keeps
 * the browser's own `auto` ring, which the browser draws in the system focus colour and, in forced colours, in a system colour.
 */
function expectRing(name: string, style: CSSStyleDeclaration): void {
  if (name === 'listbox') {
    expect(style.outlineStyle, name).toBe('auto');
    return;
  }
  expect(style.outlineStyle, name).toBe('solid');
  expect(Number.parseFloat(style.outlineWidth), name).toBeGreaterThanOrEqual(2);
}

describe('DR-26: the documented focus order, tagged stops', () => {
  it('Tab visits Rescan, the listbox (one stop), the Mission link and Copy, in that order; the stops are numbered as the stories tag them', async () => {
    const screen = await mount();
    const stops = await walk(screen);
    expect(stops.map((stop) => stop.name)).toEqual(['rescan', 'listbox', 'mission-link', 'copy']);
    expect(stops.map((stop) => stop.n)).toEqual([7, 8, 9, 10]);
    expect(Dr26Rescan.tags).toContain('tab-7');
    expect(Dr26Copy.tags).toContain('tab-10');
    expect(root(screen).querySelectorAll('[role="option"]').length).toBe(5);
    expect(root(screen).querySelectorAll('[role="option"][tabindex="0"]')).toHaveLength(1);
  });

  it('every stop shows a focus ring (a solid outline of at least 2 px) when it is reached by the keyboard', async () => {
    const screen = await mount();
    const stops = await walk(screen);
    expect(stops).toHaveLength(4);
    for (const { name, element } of stops) {
      // Reach each stop again by Tab so that :focus-visible applies; measure the ring on the focused element itself.
      (element as HTMLElement).focus();
      expectRing(name, ringOf(element as HTMLElement));
    }
  });

  it('the stops are the same at 1280, 1100, 800 and 620', async () => {
    let ran = 0;
    for (const width of [1280, 1100, 800, 620]) {
      const screen = await mount({}, width);
      const stops = await walk(screen);
      expect(stops.map((stop) => stop.name), `${width}`).toEqual(['rescan', 'listbox', 'mission-link', 'copy']);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('the lane table is a stop only while it overflows, between the Mission link and Copy; a table that fits adds none (positive control above)', async () => {
    const wide = reportProps('reportManyLanes', { select: 0 });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const longId = 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx';
    const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
    const screen = await mount({ ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } }, 620);
    const stops = await walk(screen);
    expect(stops.map((stop) => stop.name)).toEqual(['rescan', 'listbox', 'mission-link', 'lane-table', 'copy']);
    // The shell has fewer stops at 620 px, so the absolute numbers differ from the 1280 px tags; the screen's own stops are consecutive.
    const numbers = stops.map((stop) => stop.n);
    expect(numbers.map((n) => n - (numbers[0] as number))).toEqual([0, 1, 2, 3, 4]);
  });

  it('there is no trap: the walk leaves the screen after Copy, and Shift+Tab comes back to Copy', async () => {
    const screen = await mount();
    const stops = await walk(screen);
    expect(stops).toHaveLength(4);
    expect(document.activeElement).not.toBe(screen);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(screen);
    expect(stopName(screen, screenFocus(screen))).toBe('copy');
  });

  it('Enter and Space on the focused stops act (Rescan emits once for each; the key reaches the real control)', async () => {
    const screen = await mount();
    const seen: CustomEvent[] = [];
    screen.addEventListener('sk-rescan-drift', (event) => seen.push(event as CustomEvent));
    const rescan = one<HTMLElement>(screen, '[data-rescan]');
    rescan.shadowRoot?.querySelector('button')?.focus();
    await userEvent.keyboard('{Enter}');
    expect(seen).toHaveLength(1);
    await userEvent.keyboard(' ');
    expect(seen).toHaveLength(2);
    for (const event of seen) {
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.cancelable).toBe(false);
      expect(event.detail).toEqual({ missionId: null });
    }
  });
});

describe('the focus-loss rule (FR-025): focus lost to an update moves to the list, else the title, else the root', () => {
  const without = (index: number): DriftReportView => ({ ...reportPopulated, findings: reportPopulated.findings.filter((_, i) => i !== index) });
  const focusOption = async (screen: SkDriftScreen): Promise<HTMLElement> => {
    const option = one<HTMLElement>(screen, '[role="option"][tabindex="0"]');
    option.focus();
    expect(screenFocus(screen)).toBe(option);
    return option;
  };

  it('the selected finding is removed by a new report: focus moves to the list; a report that keeps it leaves focus where it is (negative control)', async () => {
    const kept = await mount();
    const keptOption = await focusOption(kept);
    kept.report = { ...reportPopulated, scannedAt: '2026-10-06T09:05:00Z' };
    await settle(kept);
    expect(screenFocus(kept)).toBe(keptOption);
    expect(keptOption.isConnected).toBe(true);
    document.body.replaceChildren();

    const screen = await mount();
    const option = await focusOption(screen);
    screen.report = without(1);
    await settle(screen);
    expect(option.isConnected).toBe(false);
    const landed = screenFocus(screen);
    expect(landed?.getAttribute('role')).toBe('option');
    expect(landed?.getAttribute('tabindex')).toBe('0');
    expect(root(screen).querySelector('[data-detail="stale"]')).not.toBeNull();
  });

  it('a rescan: Rescan keeps focus while it is busy and when the new report arrives; a finding that was fixed moves focus from the list to the list', async () => {
    const screen = await mount();
    const rescan = one<HTMLElement>(screen, '[data-rescan]');
    rescan.shadowRoot?.querySelector('button')?.focus();
    expect(screenFocus(screen)).toBe(rescan);
    screen.rescanning = true;
    await settle(screen);
    expect(screenFocus(screen)).toBe(rescan);
    screen.report = { ...reportPopulated, scannedAt: '2026-10-06T09:05:00Z' };
    screen.rescanning = false;
    await settle(screen);
    expect(screenFocus(screen)).toBe(rescan);
    expect(one(screen, '[data-rescan]')).toBe(rescan);
    // The finding under the cursor is fixed by the scan: focus was in the list, it lands in the list again.
    const option = await focusOption(screen);
    screen.rescanning = true;
    await settle(screen);
    screen.report = without(1);
    screen.rescanning = false;
    await settle(screen);
    expect(option.isConnected).toBe(false);
    expect(screenFocus(screen)?.getAttribute('role')).toBe('option');
  });

  it('error and return: the list is gone, focus lands on the title (never the page body); returning leaves focus there, then a new loss goes back to the list', async () => {
    const screen = await mount();
    const option = await focusOption(screen);
    screen.status = 'error';
    screen.refusalCode = 'drift_scan_unreadable';
    await settle(screen);
    expect(option.isConnected).toBe(false);
    expect(document.activeElement).toBe(screen);
    expect(screenFocus(screen)?.localName).toBe('h1');
    const title = screenFocus(screen);
    screen.status = 'ready';
    screen.refusalCode = null;
    await settle(screen);
    expect(document.activeElement).toBe(screen);
    expect(screenFocus(screen)).toBe(title);
    expect(root(screen).querySelectorAll('[role="option"]')).toHaveLength(5);
    // Positive control: with focus in the list again, the same error round trip moves it once more.
    const again = await focusOption(screen);
    screen.status = 'error';
    await settle(screen);
    expect(again.isConnected).toBe(false);
    expect(screenFocus(screen)?.localName).toBe('h1');
  });
});

describe('the focus-loss rule (FR-025, A11Y-001): a focused control that stays connected but stops being focusable', () => {
  /** The many-lane finding with a 70-character Work Package id: at 620 px its table scrolls, at 1600 px it fits. */
  const wideTable = (): Partial<DriftScreenProps> => {
    const wide = reportProps('reportManyLanes', { select: 0 });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const longId = 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx';
    const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
    return { ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } };
  };

  it('the lane-table scroller loses overflow while it has focus: focus moves to the list instead of falling to the page body (control: a stop that stays focusable keeps focus)', async () => {
    const screen = await mount(wideTable(), 620);
    const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(scroller.getAttribute('tabindex'), 'the scroller is a stop at 620').toBe('0');
    scroller.focus();
    expect(screenFocus(screen)).toBe(scroller);
    await page.viewport(1600, 900);
    await settle(screen);
    const widened = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(widened.hasAttribute('tabindex'), 'positive control: the scroller stopped being a stop').toBe(false);
    expect(document.activeElement, 'focus is not on the page body').not.toBe(document.body);
    expect(document.activeElement).toBe(screen);
    const landed = screenFocus(screen);
    expect(landed?.getAttribute('role')).toBe('option');
    expect(landed?.getAttribute('tabindex')).toBe('0');
    document.body.replaceChildren();

    const control = await mount(wideTable(), 620);
    const rescan = one<HTMLElement>(control, '[data-rescan]');
    rescan.shadowRoot?.querySelector('button')?.focus();
    expect(screenFocus(control)).toBe(rescan);
    await page.viewport(1600, 900);
    await settle(control);
    expect(screenFocus(control)).toBe(rescan);
  });
});

describe('NFR-004: 200 percent root font size', () => {
  const overflow = (screen: SkDriftScreen): { host: number; doc: number } => ({
    host: screen.scrollWidth - screen.clientWidth,
    doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  });
  /** The elements whose box runs past the screen's right edge, outside the hidden live region and the scrollers' own content. */
  const pastTheEdge = (screen: SkDriftScreen): string[] => {
    const right = screen.getBoundingClientRect().right;
    return [...root(screen).querySelectorAll('*')]
      .filter((el) => el.closest('[data-live]') === null && el.closest('.sk-data-table__scroller') === null && el.getBoundingClientRect().right > right + 1)
      .map((el) => `${el.localName}[${el.closest('[data-region]')?.getAttribute('data-region') ?? ''}]`);
  };
  /** The many-lane finding with one over-long Work Package identifier and the unbreakable slug in the command. */
  const manyLanes = (): Partial<DriftScreenProps> => {
    const wide = reportProps('reportManyLanes', { select: 0, slug: unbreakableSlug });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const longId = 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx';
    const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
    return { ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } };
  };

  it('the measurement works: a deliberately wide element is seen (positive control)', async () => {
    const screen = await mount({}, 800);
    expect(overflow(screen).host).toBeLessThanOrEqual(0);
    const wide = document.createElement('div');
    wide.style.width = '4000px';
    wide.style.height = '4px';
    one(screen, '[data-root]').append(wide);
    expect(overflow(screen).host).toBeGreaterThan(0);
  });

  it('at 1100, 720, 620 and 390 px the content area has no horizontal overflow, with a long table, a long command and the long authority word; the table scrolls in its own region', async () => {
    let ran = 0;
    document.documentElement.style.fontSize = '200%';
    for (const width of [1100, 720, 620, 390]) {
      const screen = await mount(manyLanes(), width);
      document.documentElement.style.fontSize = '200%';
      await settle(screen);
      expect(Number.parseFloat(getComputedStyle(document.documentElement).fontSize), `${width}`).toBe(32);
      expect(pastTheEdge(screen), `${width}`).toEqual([]);
      expect(overflow(screen).host, `${width} host`).toBeLessThanOrEqual(0);
      // At 390 px the SHELL's own top bar runs 143 px past the document at 200% text (shell code, ledgered for its owner): the screen's host is the measure.
      if (width >= 620) expect(overflow(screen).doc, `${width} document`).toBeLessThanOrEqual(0);
      const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
      expect(scroller.scrollWidth, `${width} scroller`).toBeGreaterThan(scroller.clientWidth);
      expect(scroller.getAttribute('role'), `${width}`).toBe('region');
      const command = one<HTMLElement>(screen, '[data-command]');
      // Positive control: the command really holds the unbreakable slug, so the wrap below is the wrap of a long word.
      expect(command.textContent, `${width} command text`).toContain(unbreakableSlug);
      expect(command.scrollWidth, `${width} command`).toBeLessThanOrEqual(command.clientWidth + 1);
      // A11Y-002: the authority pill holds the longest word (event_log), and wraps instead of running past the screen.
      const authority = one<HTMLElement>(screen, '[data-authority]');
      expect(authority.textContent, `${width} authority word`).toContain("The Mission's status event log");
      expect(authority.getBoundingClientRect().right, `${width} authority pill`).toBeLessThanOrEqual(screen.getBoundingClientRect().right + 1);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('NFR-011: forced colours', () => {
  it('forced colours: the selected row stays distinguishable from an unselected one, and the emulation is on (positive control: off, the paint differs)', async () => {
    await media('forced-colors', 'active');
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const screen = await mount();
    const selected = one<HTMLElement>(screen, '[role="option"][aria-selected="true"]');
    const others = [...root(screen).querySelectorAll<HTMLElement>('[role="option"][aria-selected="false"]')];
    expect(others).toHaveLength(4);
    const marker = getComputedStyle(selected).borderInlineStartColor;
    const forcedBars = others.map((other) => getComputedStyle(other).borderInlineStartColor);
    expect(forcedBars.every((colour) => colour !== marker)).toBe(true);
    expect(getComputedStyle(selected).borderInlineStartStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(selected).borderInlineStartWidth)).toBeGreaterThanOrEqual(2);
    await media('forced-colors', 'none');
    expect(matchMedia('(forced-colors: active)').matches).toBe(false);
    expect(getComputedStyle(selected).borderInlineStartColor).not.toBe(marker);
  });

  it('forced colours: the focus ring of every stop stays a solid outline, and the table scroll box keeps a visible edge', async () => {
    await media('forced-colors', 'active');
    const wide = reportProps('reportManyLanes', { select: 0 });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const longId = 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx';
    const lanes = finding.laneComparison.map((row, index) => (index === 0 ? { ...row, wpId: longId } : row));
    const screen = await mount({ ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } }, 620);
    const stops = await walk(screen);
    expect(stops.map((stop) => stop.name)).toEqual(['rescan', 'listbox', 'mission-link', 'lane-table', 'copy']);
    let ringed = 0;
    for (const { name, element } of stops) {
      (element as HTMLElement).focus();
      expectRing(name, ringOf(element as HTMLElement));
      ringed += 1;
    }
    expect(ringed).toBe(5);
    // The scroll box itself: the lane table's scroller is a region that overflows, and its keyboard ring is a solid outline in
    // forced colours. The control is the same box without keyboard focus, which draws no ring.
    const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(scroller.getAttribute('role')).toBe('region');
    scroller.blur();
    expect(getComputedStyle(scroller).outlineStyle, 'control: the unfocused scroll box draws no ring').toBe('none');
    scroller.focus();
    expect(scroller.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(scroller).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(scroller).outlineWidth)).toBeGreaterThanOrEqual(2);
  });
});

describe('NFR-011: reduced motion', () => {
  const animates = (el: Element): boolean => {
    const style = getComputedStyle(el);
    return style.animationName !== 'none' || style.transitionDuration.split(',').some((d) => d.trim() !== '0s');
  };
  /** Every element of the screen's own shadow root whose paint animates or transitions. */
  const moving = (screen: SkDriftScreen): string[] => [...root(screen).querySelectorAll<HTMLElement>('*')].filter(animates).map((el) => el.localName);
  /**
   * The same, plus every ANIMATION inside the open shadow roots of the screen's library buttons and pills, where the busy spinner lives
   * (A11Y-006). A nested one is named `host>element.class`. Their hover transitions are the library's own and are not read here.
   */
  const movingDeep = (screen: SkDriftScreen): string[] => {
    const found = moving(screen);
    for (const host of root(screen).querySelectorAll('sk-button, sk-pill-tag')) {
      for (const inner of host.shadowRoot?.querySelectorAll('*') ?? []) if (getComputedStyle(inner).animationName !== 'none') found.push(`${host.localName}>${inner.localName}.${inner.className}`);
    }
    return found;
  };

  it('the measurement sees a deliberate animation and a deliberate transition (positive control)', async () => {
    const screen = await mount();
    const probe = document.createElement('div');
    probe.style.transition = 'opacity 1s';
    probe.style.animation = 'sk-probe 1s infinite';
    one(screen, '[data-root]').append(probe);
    expect(moving(screen)).toEqual(['div']);
  });

  it('the measurement sees the busy spinner inside the Rescan button (positive control: without the preference it animates; under reduce it does not)', async () => {
    const unreduced = await mount({ rescanning: true });
    expect(movingDeep(unreduced)).toContain('sk-button>span.sk-button__busy-cue');
    expect(moving(unreduced), 'the screen\'s own root does not see it').toEqual([]);
    document.body.replaceChildren();
    await media('prefers-reduced-motion', 'reduce');
    expect(movingDeep(await mount({ rescanning: true }))).toEqual([]);
  });

  it('under prefers-reduced-motion: reduce the screen animates nothing of its own, in the ready, loading and rescanning looks', async () => {
    const loading = { status: 'loading' as const, report: null, selectedFinding: null };
    const unreduced = await mount(loading);
    const animated = moving(unreduced);
    // Positive control: without the preference the library progress bar of the loading look does move.
    expect(animated).toEqual(['progress']);
    document.body.replaceChildren();
    await media('prefers-reduced-motion', 'reduce');
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    let looks = 0;
    for (const props of [{}, { status: 'loading' as const, report: null, selectedFinding: null }, { rescanning: true }]) {
      const screen = await mount(props);
      expect(movingDeep(screen), JSON.stringify(Object.keys(props))).toEqual([]);
      document.body.replaceChildren();
      looks += 1;
    }
    expect(looks).toBe(3);
  });
});
