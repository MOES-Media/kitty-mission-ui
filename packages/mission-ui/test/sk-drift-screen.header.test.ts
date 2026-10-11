// The header band of the Drift screen (IC-04, T025 and T030): title, subtitle, the Mission a scoped scan names, the last scan and
// Rescan with its busy rule. Real pointer and keyboard input on the real controls; every absence has a positive control and every loop
// asserts how many times it ran.
// Revert check (temporary local edit, never committed): in header-parts.ts drop `?busy=${p.rescanning}` and `aria-busy=...` from the
// Rescan button; "is a button named exactly Rescan ..." and "the Rescan button is busy while a rescan is in flight ..." fail.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, driftNow, driftScannedAt, pairReport, reportProps, scopedMissionId, stateProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { DRIFT_SUBTITLE, DRIFT_TITLE, RESCANNED_TEXT, RESCANNING_LABEL, RESCAN_LABEL } from '../src/defaults/index.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkDriftScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}

const root = (screen: SkDriftScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const header = (screen: SkDriftScreen): HTMLElement => one<HTMLElement>(root(screen), '[data-region="header"]');
const rescanOf = (screen: SkDriftScreen): HTMLElement => one<HTMLElement>(header(screen), '[data-rescan]');
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const liveText = (screen: SkDriftScreen): string => text(root(screen).querySelector('[data-live]'));
const liveSeq = (screen: SkDriftScreen): string | null => root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? null;

function listenAll(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of ['sk-rescan-drift', 'sk-select-finding', 'sk-retry-load', 'sk-open-missions']) {
    screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  }
  return seen;
}

describe('the header band: title, subtitle, last scan', () => {
  it('draws the title as the one h1 and the subtitle, in the defaults words', async () => {
    const screen = await mount();
    const h1s = root(screen).querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0] ?? null)).toBe(DRIFT_TITLE);
    expect(text(one(header(screen), '[data-subtitle]'))).toBe(DRIFT_SUBTITLE);
    expect(DRIFT_TITLE).toBe('Drift');
    expect(DRIFT_SUBTITLE).toBe('Derived state checked against the event log and git');
  });

  it('draws the header in every state, and the last scan only where a report is shown', async () => {
    const shown: Array<[string, Partial<DriftScreenProps>, boolean]> = [
      ['ready', reportProps('reportPopulated'), true],
      ['clean', stateProps.clean(), true],
      ['loading', stateProps.loading(), false],
      ['error', stateProps.error(), false],
      ['not-found', stateProps.notFound(), false],
    ];
    let ran = 0;
    for (const [name, props, withScan] of shown) {
      const screen = await mount(props);
      expect(header(screen).querySelectorAll('h1'), name).toHaveLength(1);
      expect(header(screen).querySelectorAll('[data-rescan]'), name).toHaveLength(1);
      expect(header(screen).querySelectorAll('[data-last-scan]'), name).toHaveLength(withScan ? 1 : 0);
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('the last scan is relative to `now` (two minutes after the scan), with the full instant as its title', async () => {
    const screen = await mount();
    const scan = one<HTMLElement>(header(screen), '[data-last-scan]');
    expect(text(scan)).toBe('last scan 2 minutes ago');
    expect(scan.title).toBe(driftScannedAt);
    expect(driftNow).toBe('2026-10-06T09:02:00Z');
  });

  it('with no `now` the last scan is the ISO instant as given (never a clock read); a later `now` is the positive control', async () => {
    const screen = await mount({ now: null });
    expect(text(one(header(screen), '[data-last-scan]'))).toBe(`last scan ${driftScannedAt}`);
    screen.now = '2026-10-06T11:00:00Z';
    await settle(screen);
    expect(text(one(header(screen), '[data-last-scan]'))).toBe('last scan 2 hours ago');
  });

  it('the time hook of the host wins over the relative text', async () => {
    const screen = await mount({ labels: { time: () => 'a moment ago' } });
    expect(text(one(header(screen), '[data-last-scan]'))).toBe('last scan a moment ago');
  });

  it('an unparseable scan time is shown as given and does not throw', async () => {
    const report = { ...reportPopulated, scannedAt: 'the day before yesterday' };
    const screen = await mount(pairReport(report, { select: 1 }));
    expect(text(one(header(screen), '[data-last-scan]'))).toBe('last scan the day before yesterday');
  });
});

describe('the Mission a scoped scan names', () => {
  it('a whole-project scan names no Mission; a scoped scan names it by slug (the positive control)', async () => {
    const whole = await mount();
    expect(header(whole).querySelectorAll('[data-scope]')).toHaveLength(0);
    const scoped = await mount(reportProps('reportScoped', { select: 0 }));
    const scope = one<HTMLElement>(header(scoped), '[data-scope]');
    expect(text(scope)).toBe('sample-slug-01');
    expect(text(one(header(scoped), '[data-subtitle]'))).toBe(`${DRIFT_SUBTITLE} sample-slug-01`);
  });

  it('a scoped scan of a Mission the host does not list names it by its Mission id', async () => {
    const screen = await mount({ ...reportProps('reportScoped', { select: 0 }), missions: null });
    expect(text(one(header(screen), '[data-scope]'))).toBe(scopedMissionId);
  });

  it('the scope title is the friendly name when the host gave one', async () => {
    const screen = await mount(reportProps('reportScoped', { select: 0 }));
    expect(one<HTMLElement>(header(screen), '[data-scope]').title).toBe('Sample mission one');
  });
});

describe('Rescan', () => {
  it('is a button named exactly "Rescan", and while a rescan is in flight "Rescanning" (aria-busy true)', async () => {
    const screen = await mount();
    await expect.element(page.getByRole('button', { name: 'Rescan', exact: true })).toBeInTheDocument();
    expect(text(rescanOf(screen))).toBe(RESCAN_LABEL);
    expect(rescanOf(screen).getAttribute('aria-busy')).toBe('false');
    expect(rescanOf(screen).hasAttribute('busy')).toBe(false);
    screen.rescanning = true;
    await settle(screen);
    expect(text(rescanOf(screen))).toBe(RESCANNING_LABEL);
    expect(RESCANNING_LABEL).toBe('Rescanning');
    expect(rescanOf(screen).getAttribute('aria-busy')).toBe('true');
    expect(rescanOf(screen).hasAttribute('busy')).toBe(true);
  });

  it('the Rescan button is busy while a rescan is in flight, the report stays, and the root is NOT aria-busy (A11Y-004: only the first load is)', async () => {
    const screen = await mount({ rescanning: true });
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('aria-busy')).toBe('false');
    expect(rescanOf(screen).getAttribute('aria-busy')).toBe('true');
    expect(root(screen).querySelectorAll('[role="option"]')).toHaveLength(5);
    screen.rescanning = false;
    await settle(screen);
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('aria-busy')).toBe('false');
    expect(root(screen).querySelectorAll('[role="option"]')).toHaveLength(5);
  });

  it('a click emits sk-rescan-drift once with null for the whole project and the Mission id when scoped', async () => {
    const whole = await mount();
    const wholeEvents = listenAll(whole);
    await userEvent.click(rescanOf(whole));
    expect(wholeEvents).toHaveLength(1);
    expect(wholeEvents[0]?.type).toBe('sk-rescan-drift');
    expect(wholeEvents[0]?.bubbles).toBe(true);
    expect(wholeEvents[0]?.composed).toBe(true);
    expect(wholeEvents[0]?.cancelable).toBe(false);
    expect(wholeEvents[0]?.detail).toEqual({ missionId: null });
    const scoped = await mount(reportProps('reportScoped', { select: 0 }));
    const scopedEvents = listenAll(scoped);
    await userEvent.click(rescanOf(scoped));
    expect(scopedEvents).toHaveLength(1);
    expect(scopedEvents[0]?.detail).toEqual({ missionId: scopedMissionId });
  });

  it('Enter and Space on the focused button each emit once', async () => {
    const screen = await mount();
    const events = listenAll(screen);
    let ran = 0;
    for (const key of ['{Enter}', ' ']) {
      events.length = 0;
      (one<HTMLElement>(rescanOf(screen).shadowRoot as ShadowRoot, 'button')).focus();
      await userEvent.keyboard(key);
      expect(events, key).toHaveLength(1);
      expect(events[0]?.type).toBe('sk-rescan-drift');
      expect(events[0]?.detail).toEqual({ missionId: null });
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('emits nothing while rescanning (click and Enter), and one event once the scan is over (positive control)', async () => {
    const screen = await mount({ rescanning: true });
    const events = listenAll(screen);
    await userEvent.click(rescanOf(screen));
    await userEvent.click(rescanOf(screen));
    (one<HTMLElement>(rescanOf(screen).shadowRoot as ShadowRoot, 'button')).focus();
    await userEvent.keyboard('{Enter}');
    expect(events).toHaveLength(0);
    screen.rescanning = false;
    await settle(screen);
    await userEvent.click(rescanOf(screen));
    expect(events).toHaveLength(1);
    expect(events[0]?.detail).toEqual({ missionId: null });
  });

  it('keeps the focus while the rescan starts and ends, and does not remount the button', async () => {
    const screen = await mount();
    const button = rescanOf(screen);
    (one<HTMLElement>(button.shadowRoot as ShadowRoot, 'button')).focus();
    expect(root(screen).activeElement).toBe(button);
    screen.rescanning = true;
    await settle(screen);
    expect(root(screen).activeElement).toBe(button);
    expect(rescanOf(screen)).toBe(button);
    screen.rescanning = false;
    await settle(screen);
    expect(root(screen).activeElement).toBe(button);
    expect(rescanOf(screen)).toBe(button);
  });

  it('one "Rescanning" when a rescan starts and exactly one rescanned announcement when a later scan arrives', async () => {
    const screen = await mount();
    const before = liveSeq(screen);
    expect(liveText(screen)).toBe('');
    expect(before).toBeNull();
    screen.rescanning = true;
    await settle(screen);
    expect(liveText(screen)).toBe('Rescanning');
    expect(liveSeq(screen)).toBe('1');
    const later = '2026-10-06T09:05:00Z';
    screen.report = { ...reportPopulated, scannedAt: later };
    screen.rescanning = false;
    screen.now = '2026-10-06T09:06:00Z';
    await settle(screen);
    expect(liveText(screen)).toBe(RESCANNED_TEXT(5, '1 minute ago'));
    expect(liveText(screen)).toBe('Rescanned: 5 findings, last scan 1 minute ago');
    expect(liveSeq(screen)).toBe('2');
    // A clock tick alone announces nothing more.
    screen.now = '2026-10-06T09:10:00Z';
    await settle(screen);
    expect(liveSeq(screen)).toBe('2');
    // The positive control: another later scan is announced once more.
    screen.report = { ...reportPopulated, scannedAt: '2026-10-06T09:09:00Z' };
    await settle(screen);
    expect(liveSeq(screen)).toBe('3');
    expect(liveText(screen)).toBe('Rescanned: 5 findings, last scan 1 minute ago');
  });

  it('a report with the same scan time announces no "Rescanned"; the start was said once and the end says nothing changed (tracer ruling)', async () => {
    const screen = await mount();
    screen.rescanning = true;
    await settle(screen);
    screen.rescanning = false;
    screen.report = { ...reportPopulated };
    await settle(screen);
    expect(liveSeq(screen)).toBe('2');
    expect(liveText(screen)).toBe('Rescan complete: no changes');
  });
});
