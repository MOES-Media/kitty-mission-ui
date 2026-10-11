// The finding listbox (IC-04, T026 and T027): the real roles, the keyboard table (wrap, Home, End, the one-item case), selection that
// follows focus with one event per key, the roving tab stop, the order of the rows, the head and its badge, the row words, and the rows of
// a scoped scan. Real keys on the real options; every no-event case has a positive control and every loop asserts its count.
// Revert check (temporary local edit, never committed): in list-parts.ts swap the import `listboxTarget` for `nextIndex` (from
// '../../logic/index.js') and change `listboxTarget(event, from, options.length)` to `nextIndex(event.key, from, options.length)`; "a chord with Alt, Ctrl, Meta or Shift is left alone" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, pairReport, reportProps, scopedMissionId } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportPopulated } from '../src/contract/fixtures.generated.js';
import type { DriftFindingKey, DriftReportView } from '../src/contract/types.js';

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
const optionsOf = (screen: SkDriftScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('[role="option"]')];
const text = (el: Element | null): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const keyOf = (index: number): DriftFindingKey => {
  const f = reportPopulated.findings[index];
  if (f === undefined) throw new Error(`no finding ${index}`);
  return { missionId: f.missionId, kind: f.kind, artifactPath: f.artifactPath };
};
const focusedIndex = (screen: SkDriftScreen): number => optionsOf(screen).indexOf(root(screen).activeElement as HTMLElement);

function listenSelect(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  screen.parentElement?.addEventListener('sk-select-finding', (event) => seen.push(event as CustomEvent));
  return seen;
}

/** The keyboard table: [start, key, expected index] for five rows (wrap at both ends). */
const TABLE: Array<[number, string, number]> = [
  [0, '{ArrowDown}', 1],
  [4, '{ArrowDown}', 0],
  [2, '{ArrowRight}', 3],
  [4, '{ArrowRight}', 0],
  [3, '{ArrowUp}', 2],
  [0, '{ArrowUp}', 4],
  [2, '{ArrowLeft}', 1],
  [0, '{ArrowLeft}', 4],
  [3, '{Home}', 0],
  [0, '{Home}', 0],
  [1, '{End}', 4],
  [4, '{End}', 4],
];

describe('the listbox roles and the order of the rows', () => {
  it('is a listbox with its own name from the defaults, holding one option per finding, in the report order', async () => {
    const screen = await mount();
    const listbox = one<HTMLElement>(root(screen), '[role="listbox"]');
    expect(listbox.getAttribute('aria-label')).toBe('Drift findings');
    expect(listbox.hasAttribute('aria-labelledby')).toBe(false);
    await expect.element(page.getByRole('listbox', { name: 'Drift findings', exact: true })).toBeInTheDocument();
    const options = optionsOf(screen);
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.parentElement)).toEqual([listbox, listbox, listbox, listbox, listbox]);
    expect(options.map((option) => text(option.querySelector('[data-title]')))).toEqual(reportPopulated.findings.map((finding) => finding.summary));
    expect(options.every((option) => option.tagName === 'BUTTON' && option.getAttribute('type') === 'button')).toBe(true);
  });

  it('draws a deliberately unsorted report in the order it was given (the reverse is the positive control)', async () => {
    const reversed: DriftReportView = { ...reportPopulated, findings: [...reportPopulated.findings].reverse() };
    const screen = await mount(pairReport(reversed, { select: 'none' }));
    const titles = optionsOf(screen).map((option) => text(option.querySelector('[data-title]')));
    expect(titles).toHaveLength(5);
    expect(titles).toEqual(reversed.findings.map((finding) => finding.summary));
    expect(titles).not.toEqual(reportPopulated.findings.map((finding) => finding.summary));
  });

  it('draws every row once for a duplicate key (a contract violation), none dropped', async () => {
    const first = reportPopulated.findings[0];
    if (first === undefined) throw new Error('no finding');
    const report: DriftReportView = { ...reportPopulated, findings: [first, first, ...reportPopulated.findings.slice(1)] };
    const screen = await mount(pairReport(report, { select: 0 }));
    expect(optionsOf(screen)).toHaveLength(6);
    expect(optionsOf(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false']);
  });

  it('exposes each option under its visible text in reading order: the summary, the Mission slug, the severity word', async () => {
    const screen = await mount();
    const expected = [
      'An expected lane or Mission branch has no local branch. sample-slug-01 warning',
      'The status snapshot disagrees with the event log. sample-slug-01 error',
      'The status snapshot differs from the event log only in provenance fields. sample-slug-02 warning',
      'The status snapshot differs from the event log and every work package is done. sample-mission-03 warning',
      'One of the status snapshot and the event log is missing. sample-mission-04 warning',
    ];
    expect(optionsOf(screen).map((option) => text(option))).toEqual(expected);
    let named = 0;
    for (const name of expected) {
      await expect.element(page.getByRole('option', { name, exact: true })).toBeInTheDocument();
      named += 1;
    }
    expect(named).toBe(5);
  });

  it('a Mission the host does not list is shown by its Mission id; a Mission with a slug by the slug', async () => {
    const screen = await mount(reportProps('reportMissionUnlisted', { select: 0 }));
    const [option] = optionsOf(screen);
    expect(text(option?.querySelector('[data-mission]') ?? null)).toBe('01JZCB3H8J9KMNPQRSTVWXYZ01');
    const listed = await mount(reportProps('reportPopulated', { select: 0 }));
    expect(text(optionsOf(listed)[0]?.querySelector('[data-mission]') ?? null)).toBe('sample-slug-01');
  });

  it('a scoped scan drops the Mission column; the whole-project scan of the same findings keeps it (positive control)', async () => {
    const scoped = await mount(reportProps('reportScoped', { select: 0 }));
    expect(optionsOf(scoped)).toHaveLength(3);
    expect(root(scoped).querySelectorAll('[data-mission]')).toHaveLength(0);
    const whole = await mount({ ...reportProps('reportScoped', { select: 0 }), missionId: '' });
    expect(optionsOf(whole)).toHaveLength(3);
    expect(root(whole).querySelectorAll('[data-mission]')).toHaveLength(3);
    expect(scopedMissionId).toBe('01JZCB3C4D5E6F7G8H9JKMNPQT');
  });

  it('shows a foreign severity as its raw word in the neutral tone; the known severities keep their tones', async () => {
    const screen = await mount(reportProps('reportUnknownSeverity', { select: 'none' }));
    const pills = [...root(screen).querySelectorAll('[role="option"] sk-pill-tag')];
    expect(pills.map((pill) => [text(pill), pill.getAttribute('status')])).toEqual([
      ['warning', 'attention'],
      ['error', 'danger'],
      ['info', 'neutral'],
      ['warning', 'attention'],
      ['warning', 'attention'],
    ]);
  });
});

describe('the head: count, roll-up and badge', () => {
  it('draws the count and, because a finding is an error, the danger badge with the severity word', async () => {
    const screen = await mount();
    const head = one<HTMLElement>(root(screen), '[data-head]');
    expect(text(one(head, '[data-count]'))).toBe('5 findings');
    const badge = one(head, '[data-head-badge]');
    expect(text(badge)).toBe('error');
    expect(badge.getAttribute('status')).toBe('danger');
    expect(text(one(head, '[data-rollup]'))).toBe('4 warnings, 1 error');
  });

  it('draws no badge when no shown finding has a danger-tone severity (positive control: the populated report has one)', async () => {
    const warnings = reportPopulated.findings.filter((finding) => finding.severity === 'warning');
    expect(warnings).toHaveLength(4);
    const screen = await mount(pairReport({ ...reportPopulated, findings: warnings }, { select: 0 }));
    const head = one<HTMLElement>(root(screen), '[data-head]');
    expect(head.querySelectorAll('[data-head-badge]')).toHaveLength(0);
    expect(text(one(head, '[data-count]'))).toBe('4 findings');
    expect(text(one(head, '[data-rollup]'))).toBe('4 warnings');
    const withError = await mount();
    expect(withError.shadowRoot?.querySelectorAll('[data-head-badge]')).toHaveLength(1);
  });

  it('a truncated report labels its roll-up as covering the shown findings; a complete one does not (FR-018)', async () => {
    const complete = await mount();
    expect(text(one(root(complete), '[data-rollup]'))).toBe('4 warnings, 1 error');
    document.body.replaceChildren();
    const truncated = await mount(pairReport({ ...reportPopulated, truncated: true }, { select: 0 }));
    expect(text(one(root(truncated), '[data-rollup]'))).toBe('Among the shown findings: 4 warnings, 1 error');
    expect(text(one(root(truncated), '[data-count]'))).toBe('5 findings');
  });

  it('a finding with an empty summary is titled by its kind word in the row, as in the detail (positive control: a summary is shown as given)', async () => {
    const [first, second] = reportPopulated.findings;
    if (first === undefined || second === undefined) throw new Error('no finding');
    const screen = await mount(pairReport({ ...reportPopulated, findings: [{ ...first, summary: '' }, second] }, { select: 0 }));
    const titles = [...root(screen).querySelectorAll('[role="option"] [data-title]')].map((title) => text(title));
    expect(titles).toEqual(['Lane branch missing', second.summary]);
    expect(text(one(root(screen), '[data-region="detail"] [data-title]'))).toBe('Lane branch missing');
  });

  it('one finding reads "1 finding"', async () => {
    const [first] = reportPopulated.findings;
    if (first === undefined) throw new Error('no finding');
    const screen = await mount(pairReport({ ...reportPopulated, findings: [first] }, { select: 0 }));
    expect(text(one(root(screen), '[data-count]'))).toBe('1 finding');
  });
});

describe('selection marker and the roving tab stop', () => {
  it('marks exactly the option of selectedFinding, and the same option is the one tab stop', async () => {
    const screen = await mount();
    const options = optionsOf(screen);
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false']);
    expect(options.map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1', '-1']);
  });

  it('with nothing selected, nothing is marked and the first option is the tab stop; a key that is not in the scan marks nothing either', async () => {
    const none = await mount(reportProps('reportPopulated', { select: 'none' }));
    expect(optionsOf(none).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'false', 'false']);
    expect(optionsOf(none).map((option) => option.getAttribute('tabindex'))).toEqual(['0', '-1', '-1', '-1', '-1']);
    const stale = await mount({ ...reportProps('reportPopulated', { select: 'none' }), selectedFinding: { missionId: 'x', kind: 'y', artifactPath: 'z' } });
    expect(optionsOf(stale).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'false', 'false']);
    expect(optionsOf(stale).filter((option) => option.getAttribute('tabindex') === '0')).toHaveLength(1);
  });

  it('a host that ignores the event: after keys moved focus away, the tab stop is still the selected option once the list updates', async () => {
    const screen = await mount();
    const options = optionsOf(screen);
    options[1]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(focusedIndex(screen)).toBe(2);
    // The host ignored the event: selection did not move. Focus leaves the list; the next update re-syncs the stop.
    (document.activeElement as HTMLElement | null)?.blur();
    screen.now = '2026-10-06T09:03:00Z';
    await settle(screen);
    expect(optionsOf(screen).map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '0', '-1', '-1', '-1']);
    expect(optionsOf(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false']);
  });

  it('follows the host: selecting another finding moves the marker and the tab stop together, and the option nodes are the same nodes', async () => {
    const screen = await mount();
    const before = optionsOf(screen);
    screen.selectedFinding = keyOf(3);
    await settle(screen);
    const after = optionsOf(screen);
    expect(after).toHaveLength(5);
    expect(after.every((option, index) => option === before[index])).toBe(true);
    expect(after.map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'true', 'false']);
    expect(after.map((option) => option.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1', '0', '-1']);
  });
});

describe('the keyboard table (DR-17): wrap, Home, End, one event per key, selection follows focus', () => {
  it('moves focus and emits once with the key of the target, for every row of the table', async () => {
    let ran = 0;
    for (const [start, key, target] of TABLE) {
      const screen = await mount(reportProps('reportPopulated', { select: start }));
      const events = listenSelect(screen);
      optionsOf(screen)[start]?.focus();
      await userEvent.keyboard(key);
      expect(focusedIndex(screen), `${key} from ${start}`).toBe(target);
      expect(events, `${key} from ${start}`).toHaveLength(target === start ? 0 : 1);
      if (target !== start) {
        const [event] = events as [CustomEvent];
        expect(event.type).toBe('sk-select-finding');
        expect(event.bubbles).toBe(true);
        expect(event.composed).toBe(true);
        expect(event.cancelable).toBe(false);
        expect(event.detail).toEqual(keyOf(target));
      }
      ran += 1;
    }
    expect(ran).toBe(TABLE.length);
    expect(TABLE).toHaveLength(12);
  });

  it('walks the whole list with ArrowDown and back to the start: six presses, six events, in order', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 0 }));
    const events = listenSelect(screen);
    optionsOf(screen)[0]?.focus();
    for (let press = 0; press < 5; press += 1) await userEvent.keyboard('{ArrowDown}');
    expect(events.map((event) => event.detail)).toEqual([keyOf(1), keyOf(2), keyOf(3), keyOf(4), keyOf(0)]);
    expect(events).toHaveLength(5);
    expect(focusedIndex(screen)).toBe(0);
  });

  it('a host that ignores the events keeps the selection on the property while focus moves', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 0 }));
    const events = listenSelect(screen);
    optionsOf(screen)[0]?.focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    expect(events).toHaveLength(2);
    expect(focusedIndex(screen)).toBe(2);
    expect(screen.selectedFinding).toEqual(keyOf(0));
    expect(optionsOf(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false']);
  });

  it('with one item every handled key stays put: nothing is emitted for the item that is selected, one event for the one that is not', async () => {
    const [first] = reportPopulated.findings;
    if (first === undefined) throw new Error('no finding');
    const single: DriftReportView = { ...reportPopulated, findings: [first] };
    let ran = 0;
    for (const key of ['{ArrowDown}', '{ArrowUp}', '{ArrowLeft}', '{ArrowRight}', '{Home}', '{End}']) {
      const selected = await mount(pairReport(single, { select: 0 }));
      const events = listenSelect(selected);
      optionsOf(selected)[0]?.focus();
      await userEvent.keyboard(key);
      expect(focusedIndex(selected), key).toBe(0);
      expect(events, key).toHaveLength(0);
      const unselected = await mount(pairReport(single, { select: 'none' }));
      const more = listenSelect(unselected);
      optionsOf(unselected)[0]?.focus();
      await userEvent.keyboard(key);
      expect(focusedIndex(unselected), key).toBe(0);
      expect(more, key).toHaveLength(1);
      expect(more[0]?.detail).toEqual({ missionId: first.missionId, kind: first.kind, artifactPath: first.artifactPath });
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('a chord with Alt, Ctrl, Meta or Shift is left alone: no focus move, no event, the default is not prevented', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const events = listenSelect(screen);
    const start = optionsOf(screen)[1] as HTMLElement;
    start.focus();
    let ran = 0;
    for (const chord of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }, { shiftKey: true }]) {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true, ...chord });
      start.dispatchEvent(event);
      expect(event.defaultPrevented, JSON.stringify(chord)).toBe(false);
      expect(focusedIndex(screen)).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(events).toHaveLength(0);
    // The positive control: the same key without a modifier moves, emits once and prevents the default.
    const plain = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true });
    start.dispatchEvent(plain);
    expect(plain.defaultPrevented).toBe(true);
    expect(focusedIndex(screen)).toBe(2);
    expect(events).toHaveLength(1);
  });

  it('keys the table does not know (letters, Tab, Escape, PageDown) are not handled; Enter and Space stay with the button', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const events = listenSelect(screen);
    const start = optionsOf(screen)[1] as HTMLElement;
    start.focus();
    let ran = 0;
    for (const key of ['a', 'Escape', 'PageDown', 'PageUp', ' ', 'Enter']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
      start.dispatchEvent(event);
      expect(event.defaultPrevented, key).toBe(false);
      expect(focusedIndex(screen), key).toBe(1);
      ran += 1;
    }
    expect(ran).toBe(6);
    expect(events).toHaveLength(0);
    // The positive control: a handled key on the same option.
    start.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true, composed: true, cancelable: true }));
    expect(events).toHaveLength(1);
  });

  it('a key pressed with focus elsewhere in the list region (not on an option) does nothing', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const events = listenSelect(screen);
    const listbox = one<HTMLElement>(root(screen), '[role="listbox"]');
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true });
    listbox.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(events).toHaveLength(0);
    optionsOf(screen)[1]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, composed: true, cancelable: true }));
    expect(events).toHaveLength(1);
  });
});
