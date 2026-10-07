// FR-022 through the screen (IC-08, T054 step 5): relative time from `now`, the ISO fallback, the host time hook and an
// unparsable timestamp, in the two places that print a time: the Facts row "Last transition" and the lane history.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { LABEL_LAST_TRANSITION } from '../src/defaults/index.js';
import { relativeTime } from '../src/logic/index.js';
import type { LabelHooks } from '../src/logic/index.js';
import type { WorkPackageRecordView } from '../src/contract/types.js';

afterEach(() => {
  document.body.replaceChildren();
});

type Props = Partial<WpScreenProps> & { now?: string | null; labels?: LabelHooks | null };
async function mount(props: Props = {}): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const text = (el: Element | ShadowRoot | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const root = (screen: SkWorkPackageScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;

/** The Facts value of "Last transition". */
function lastTransition(screen: SkWorkPackageScreen): string {
  const term = [...root(screen).querySelectorAll('[data-region="facts"] dt')].find((dt) => text(dt) === LABEL_LAST_TRANSITION);
  if (term === undefined) throw new Error('no Last transition row');
  return text(term.nextElementSibling);
}
/** The text of each lane-history row. */
const historyRows = (screen: SkWorkPackageScreen): string[] => [...root(screen).querySelectorAll('[data-region="history"] ol > li')].map((li) => text(li));

const base = WORK_PACKAGE_FIXTURES.wpPopulated;
const withTimes = (lastTransitionAt: string | null, at: string[]): WorkPackageRecordView =>
  ({ ...base, lastTransitionAt, history: base.history.slice(0, at.length).map((entry, i) => ({ ...entry, at: at[i] as string })) }) as WorkPackageRecordView;

describe('relative time (FR-022)', () => {
  const NOW = '2026-09-24T10:00:00Z';
  const THEN = '2026-09-24T07:00:00Z';
  const EARLIER = '2026-09-20T10:00:00Z';

  it('(a) with now set, Last transition and the history times print the relative text; two spans give two texts', async () => {
    const three = withTimes(THEN, [THEN, EARLIER]);
    const screen = await mount({ workPackage: three, now: NOW });
    expect(lastTransition(screen)).toBe(relativeTime(THEN, NOW));
    const rows = historyRows(screen);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(relativeTime(THEN, NOW));
    expect(rows[1]).toContain(relativeTime(EARLIER, NOW));
    expect(relativeTime(THEN, NOW)).not.toBe(relativeTime(EARLIER, NOW));
    expect(rows[0]).not.toContain(THEN);
    expect(rows[1]).not.toContain(relativeTime(THEN, NOW));
    // A different now moves the text (the revert check: ignoring now fails here).
    const later = await mount({ workPackage: three, now: '2026-09-30T10:00:00Z' });
    expect(lastTransition(later)).toBe(relativeTime(THEN, '2026-09-30T10:00:00Z'));
    expect(lastTransition(later)).not.toBe(lastTransition(screen));
  });

  it('(b) with now null the same places print the ISO text of the input', async () => {
    const screen = await mount({ workPackage: withTimes(THEN, [THEN, EARLIER]), now: null });
    expect(lastTransition(screen)).toBe(THEN);
    const rows = historyRows(screen);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(THEN);
    expect(rows[1]).toContain(EARLIER);
  });

  it('(c) the host time hook wins over the relative text, in both places; the lane hook is called as well (positive control)', async () => {
    const calls: Array<[string, string | null]> = [];
    const labels: LabelHooks = {
      time: (iso, now) => {
        calls.push([iso, now]);
        return `hooked ${iso.slice(0, 10)}`;
      },
      lane: (lane) => `L-${lane}`,
    };
    const screen = await mount({ workPackage: withTimes(THEN, [THEN, EARLIER]), now: NOW, labels });
    expect(lastTransition(screen)).toBe('hooked 2026-09-24');
    const rows = historyRows(screen);
    expect(rows[0]).toContain('hooked 2026-09-24');
    expect(rows[1]).toContain('hooked 2026-09-20');
    expect(rows[0]).not.toContain(relativeTime(THEN, NOW));
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls.every(([, now]) => now === NOW)).toBe(true);
    expect(rows.some((row) => row.includes('L-'))).toBe(true);
    // A hook that has no text for the value falls back to the relative text.
    const silent = await mount({ workPackage: withTimes(THEN, [THEN]), now: NOW, labels: { time: () => undefined } });
    expect(lastTransition(silent)).toBe(relativeTime(THEN, NOW));
  });

  it('(d) an unparsable timestamp prints its raw text, never undefined, NaN or empty, and the row is still drawn', async () => {
    const bad = 'not a time';
    const screen = await mount({ workPackage: withTimes(bad, [bad, THEN]), now: NOW });
    expect(lastTransition(screen)).toBe(bad);
    const rows = historyRows(screen);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain(bad);
    expect(rows[1]).toContain(relativeTime(THEN, NOW));
    for (const shown of [lastTransition(screen), ...rows]) {
      expect(shown).not.toContain('undefined');
      expect(shown).not.toContain('NaN');
      expect(shown.length).toBeGreaterThan(0);
    }
  });

  it('a null Last transition draws no row and no made-up time (paired with the dated sibling that draws it)', async () => {
    const none = await mount({ workPackage: withTimes(null, [THEN]), now: NOW });
    const dated = await mount({ workPackage: withTimes(THEN, [THEN]), now: NOW });
    expect(lastTransition(dated)).toBe(relativeTime(THEN, NOW));
    expect(() => lastTransition(none)).toThrow('no Last transition row');
    expect(text(root(none))).not.toContain('undefined');
  });
});
