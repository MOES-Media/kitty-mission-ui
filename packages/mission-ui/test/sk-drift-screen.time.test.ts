// FR-022 through the Drift screen (T040): the last scan is relative to `now`, the ISO text when `now` is null, the host time hook
// wins, and an unparseable or missing scan time never throws. Checked in the header, in the clean state and in the live region.
// Revert check (temporary local edit, never committed): in `logic/time.ts` make `resolveActivity` ignore `now` (return `iso`) and
// "with now set the last scan prints the relative text" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps, stateProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportClean, reportPopulated } from '../src/contract/fixtures.generated.js';
import { READY_ANNOUNCEMENT } from '../src/defaults/index.js';
import { relativeTime } from '../src/logic/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const SCAN = '2026-10-06T09:00:00Z';

async function mount(props: Partial<DriftScreenProps> = {}): Promise<SkDriftScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, { ...reportProps('reportPopulated', { select: 1 }), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const root = (screen: SkDriftScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const text = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const lastScan = (screen: SkDriftScreen): string | null => {
  const el = root(screen).querySelector('[data-last-scan]');
  return el === null ? null : text(el);
};

describe('the last scan line (FR-022)', () => {
  it('with now set the last scan prints the relative text, and a later now moves it', async () => {
    const screen = await mount({ now: '2026-10-06T09:02:00Z' });
    expect(lastScan(screen)).toBe('last scan 2 minutes ago');
    expect(relativeTime(SCAN, '2026-10-06T09:02:00Z')).toBe('2 minutes ago');
    screen.now = '2026-10-06T12:00:00Z';
    await screen.updateComplete;
    expect(lastScan(screen)).toBe('last scan 3 hours ago');
    screen.now = '2026-10-06T09:00:30Z';
    await screen.updateComplete;
    expect(lastScan(screen)).toBe('last scan just now');
  });

  it('with now null the ISO text of the input is shown, and it is also the title in both cases', async () => {
    const screen = await mount({ now: null });
    expect(lastScan(screen)).toBe(`last scan ${SCAN}`);
    expect(root(screen).querySelector('[data-last-scan]')?.getAttribute('title')).toBe(SCAN);
    screen.now = '2026-10-06T09:02:00Z';
    await screen.updateComplete;
    expect(lastScan(screen)).not.toContain(SCAN);
    expect(root(screen).querySelector('[data-last-scan]')?.getAttribute('title')).toBe(SCAN);
  });

  it('the host time hook wins over the relative text and is asked with the instant and now (positive control: without it the relative text shows)', async () => {
    const calls: Array<[string, string | null]> = [];
    const screen = await mount({
      now: '2026-10-06T09:02:00Z',
      labels: {
        time: (iso, now) => {
          calls.push([iso, now]);
          return 'a moment ago';
        },
      },
    });
    expect(lastScan(screen)).toBe('last scan a moment ago');
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(([iso, now]) => iso === SCAN && now === '2026-10-06T09:02:00Z')).toBe(true);
    screen.labels = null;
    await screen.updateComplete;
    expect(lastScan(screen)).toBe('last scan 2 minutes ago');
  });

  it('an unparseable scan time is shown as given; no throw, in the header and the clean state', async () => {
    const odd = 'the day before yesterday';
    const ready = await mount({ report: { ...reportPopulated, scannedAt: odd } });
    expect(lastScan(ready)).toBe(`last scan ${odd}`);
    document.body.replaceChildren();
    const clean = await mount({ ...stateProps.clean(), report: { ...reportClean, scannedAt: odd } });
    expect(lastScan(clean)).toBe(`last scan ${odd}`);
    expect(root(clean).querySelectorAll('[data-last-scan]')).toHaveLength(2);
  });

  it('no report, no last scan line (loading); the same report once loaded shows it (positive control)', async () => {
    const loading = await mount(stateProps.loading());
    expect(lastScan(loading)).toBeNull();
    loading.status = 'ready';
    loading.report = reportPopulated;
    await loading.updateComplete;
    expect(lastScan(loading)).toBe('last scan 2 minutes ago');
  });

  it('the clean state prints the same line as the header, from the same now', async () => {
    const screen = await mount(stateProps.clean());
    const lines = [...root(screen).querySelectorAll('[data-last-scan]')].map(text);
    expect(lines).toEqual(['last scan 2 minutes ago', 'last scan 2 minutes ago']);
  });

  it('the live region speaks the same relative time as the header', async () => {
    const screen = await mount({ status: 'loading', report: null, selectedFinding: null });
    screen.status = 'ready';
    screen.report = reportPopulated;
    await screen.updateComplete;
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    expect(text(root(screen).querySelector('[data-live]'))).toBe(READY_ANNOUNCEMENT(5, '2 minutes ago'));
  });
});
