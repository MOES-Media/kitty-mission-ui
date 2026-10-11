// The states of the Drift screen (IC-04, T028, T029 and T030): loading, clean, error, not-found, choose-a-finding, the truncation note,
// rescanning, the foreign-finding fail-closed look and the live-region words. Real roles and real words; every absence has a positive
// control and every loop asserts how many times it ran.
// Revert check (temporary local edit, never committed): in state-parts.ts make renderChoose draw the stale sentence for every selection
// (`p.stale ?` to `true ?`); "nothing selected draws the heading only, a key that is not in the scan adds one sentence" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, refusalProps, reportProps, scopedMissionId, stateProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import {
  CHOOSE_HEADING,
  CLEAN_BODY,
  CLEAN_HEADING,
  DRIFT_LOADING_LABEL,
  DRIFT_NOT_FOUND_BODY,
  DRIFT_NOT_FOUND_HEADING,
  ERROR_ANNOUNCEMENT,
  READY_ANNOUNCEMENT,
  REFUSAL_GENERIC,
  REFUSAL_WORDS,
  STALE_SELECTION_NOTE,
  TRUNCATION_TEXT,
} from '../src/defaults/index.js';
import { reportPopulated, reportTruncated } from '../src/contract/fixtures.generated.js';

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
const stateRegion = (screen: SkDriftScreen): HTMLElement => one<HTMLElement>(root(screen), '[data-region="state"]');
const stateOf = (screen: SkDriftScreen): string => one<HTMLElement>(root(screen), '[data-root]').getAttribute('data-state') ?? '';
const liveText = (screen: SkDriftScreen): string => text(root(screen).querySelector('[data-live]'));
const liveSeq = (screen: SkDriftScreen): string | null => root(screen).querySelector('[data-live] [data-seq]')?.getAttribute('data-seq') ?? null;
function listenAll(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of ['sk-select-finding', 'sk-rescan-drift', 'sk-copy-command', 'sk-open-mission', 'sk-open-missions', 'sk-retry-load']) {
    screen.parentElement?.addEventListener(name, (event) => seen.push(event as CustomEvent));
  }
  return seen;
}

describe('loading', () => {
  it('draws a labelled progress bar, aria-busy on the region and on the screen, and no list', async () => {
    const screen = await mount(stateProps.loading());
    expect(stateOf(screen)).toBe('loading');
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('aria-busy')).toBe('true');
    const body = one<HTMLElement>(stateRegion(screen), '[data-state-body="loading"]');
    expect(body.getAttribute('aria-busy')).toBe('true');
    const bar = one<HTMLProgressElement>(body, 'progress');
    expect(text(one(body, `label[for="${bar.id}"]`))).toBe(DRIFT_LOADING_LABEL);
    expect(DRIFT_LOADING_LABEL).toBe('Loading drift scan');
    // The browser's own label association names the bar (the locator engine does not compute a name from `label for` on a progress bar).
    expect(bar.labels).toHaveLength(1);
    expect(text(bar.labels?.[0] ?? null)).toBe('Loading drift scan');
    expect(root(screen).querySelectorAll('progress')).toHaveLength(1);
    expect(root(screen).querySelectorAll('[role="listbox"]')).toHaveLength(0);
  });

  it('announces the loading label once, and nothing again for a second render of the same state', async () => {
    const screen = await mount(stateProps.loading());
    // The first render announces nothing (never on first render); a later render of the same state adds nothing.
    expect(liveSeq(screen)).toBeNull();
    screen.now = '2026-10-06T10:00:00Z';
    await settle(screen);
    expect(liveSeq(screen)).toBeNull();
    // The positive control: ready, then back to loading, announces the label.
    screen.status = 'ready';
    screen.report = reportPopulated;
    await settle(screen);
    expect(liveSeq(screen)).toBe('1');
    screen.status = 'loading';
    screen.report = null;
    await settle(screen);
    expect(liveText(screen)).toBe(DRIFT_LOADING_LABEL);
    expect(liveSeq(screen)).toBe('2');
  });
});

describe('clean', () => {
  it('says "No drift found" with the last scan, and never claims that everything is consistent', async () => {
    const screen = await mount(stateProps.clean());
    expect(stateOf(screen)).toBe('empty');
    const body = one<HTMLElement>(stateRegion(screen), '[data-state-body="clean"]');
    expect(text(one(body, 'h2'))).toBe(CLEAN_HEADING);
    expect(CLEAN_HEADING).toBe('No drift found');
    expect(text(one(body, '.sk-empty-state__body'))).toBe(CLEAN_BODY);
    expect(text(one(body, '[data-last-scan]'))).toBe('last scan 2 minutes ago');
    expect(text(body).toLowerCase()).not.toContain('consistent');
    expect(text(one(root(screen), '[data-root]')).toLowerCase()).not.toContain('consistent');
    expect(root(screen).querySelectorAll('[role="listbox"]')).toHaveLength(0);
  });

  it('a status of "empty" and a "ready" report without findings look the same; announces the count and last scan', async () => {
    const empty = await mount({ ...stateProps.clean(), status: 'empty' });
    expect(text(stateRegion(empty))).toBe(text(stateRegion(await mount(stateProps.clean()))));
    const screen = await mount(stateProps.loading());
    screen.status = 'ready';
    screen.report = stateProps.clean().report;
    await settle(screen);
    expect(liveText(screen)).toBe(READY_ANNOUNCEMENT(0, '2 minutes ago'));
    expect(liveText(screen)).toBe('Drift scan loaded: 0 findings, last scan 2 minutes ago');
  });
});

describe('error and not-found', () => {
  it('error names the refusal in words and draws Retry beside the notice, which is not a live region', async () => {
    const screen = await mount(refusalProps('refusalScanUnreadable'));
    expect(stateOf(screen)).toBe('error');
    const body = one<HTMLElement>(stateRegion(screen), '[data-state-body="error"]');
    const notice = one<HTMLElement>(body, 'sk-notice');
    expect(text(notice)).toBe(REFUSAL_WORDS['drift_scan_unreadable']);
    expect(text(notice)).toBe('The scan could not read a Mission, so no report is shown.');
    expect(notice.getAttribute('tone')).toBe('danger');
    expect(notice.getAttribute('announce')).toBe('off');
    expect(notice.parentElement).toBe(body);
    expect(one(body, '[data-retry]').parentElement).toBe(body);
    expect(text(one(body, '[data-retry]'))).toBe('Try again');
    expect(root(screen).querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[role="listbox"]')).toHaveLength(0);
  });

  it('an unknown refusal code, no code and a 400 draw the generic words; a known code is the positive control', async () => {
    let ran = 0;
    for (const props of [stateProps.unknownRefusal(), stateProps.error(), { ...stateProps.error(), refusalCode: '' }, { ...stateProps.error(), refusalCode: 'constructor' }]) {
      const screen = await mount(props);
      expect(text(one(stateRegion(screen), 'sk-notice'))).toBe(REFUSAL_GENERIC);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(REFUSAL_GENERIC).toBe('The drift scan could not be loaded.');
    const known = await mount(refusalProps('refusalScanUnreadable'));
    expect(text(one(stateRegion(known), 'sk-notice'))).not.toBe(REFUSAL_GENERIC);
  });

  it('the host error text and the refusal hook win over the table, in that order', async () => {
    const hooked = await mount({ ...refusalProps('refusalScanUnreadable'), labels: { refusal: () => 'The host says no.' } });
    expect(text(one(stateRegion(hooked), 'sk-notice'))).toBe('The host says no.');
    const worded = await mount({ ...refusalProps('refusalScanUnreadable'), labels: { refusal: () => 'The host says no.' }, errorMessage: 'The host wrote this.' });
    expect(text(one(stateRegion(worded), 'sk-notice'))).toBe('The host wrote this.');
  });

  it('announces a changed refusal text although the state is still error, and nothing for the same text', async () => {
    const screen = await mount(refusalProps('refusalScanUnreadable'));
    expect(liveSeq(screen)).toBeNull();
    screen.errorMessage = 'The first words.';
    await settle(screen);
    expect(liveText(screen)).toBe(ERROR_ANNOUNCEMENT('The first words.'));
    expect(liveSeq(screen)).toBe('1');
    screen.errorMessage = 'The first words.';
    screen.now = '2026-10-06T10:00:00Z';
    await settle(screen);
    expect(liveSeq(screen)).toBe('1');
    screen.errorMessage = 'Other words.';
    await settle(screen);
    expect(liveText(screen)).toBe('Drift scan unavailable. Other words.');
    expect(liveSeq(screen)).toBe('2');
  });

  it('not-found says the Mission was not found and offers "Return to Missions"; it draws no list and no Retry', async () => {
    const screen = await mount(stateProps.notFound());
    expect(stateOf(screen)).toBe('not-found');
    const body = one<HTMLElement>(stateRegion(screen), '[data-state-body="not-found"]');
    expect(text(one(body, 'h2'))).toBe(DRIFT_NOT_FOUND_HEADING);
    expect(DRIFT_NOT_FOUND_HEADING).toBe('Mission not found');
    expect(text(one(body, '.sk-empty-state__body'))).toBe(DRIFT_NOT_FOUND_BODY);
    expect(text(one(body, '[data-return]'))).toBe('Return to Missions');
    expect(root(screen).querySelectorAll('[data-retry], [role="listbox"]')).toHaveLength(0);
    await expect.element(page.getByRole('button', { name: 'Return to Missions', exact: true })).toBeInTheDocument();
  });

  it('announces "Mission not found" once when the screen arrives in that state', async () => {
    const screen = await mount(reportProps('reportPopulated'));
    screen.status = 'not-found';
    await settle(screen);
    expect(liveText(screen)).toBe(DRIFT_NOT_FOUND_HEADING);
    expect(liveSeq(screen)).toBe('1');
    screen.now = '2026-10-06T10:00:00Z';
    await settle(screen);
    expect(liveSeq(screen)).toBe('1');
  });
});

describe('choose a finding (DR-30)', () => {
  it('nothing selected draws the heading only, a key that is not in the scan adds one sentence; neither emits an event', async () => {
    const none = await mount(reportProps('reportPopulated', { select: 'none' }));
    const noneEvents = listenAll(none);
    const noneBody = one<HTMLElement>(root(none), '[data-detail="choose"] [data-state-body="choose"]');
    expect(text(one(noneBody, 'h2'))).toBe(CHOOSE_HEADING);
    expect(noneBody.querySelectorAll('.sk-empty-state__body')).toHaveLength(0);
    const stale = await mount({ ...reportProps('reportPopulated', { select: 'none' }), selectedFinding: { missionId: 'm', kind: 'k', artifactPath: 'p' } });
    const staleEvents = listenAll(stale);
    const staleBody = one<HTMLElement>(root(stale), '[data-detail="stale"] [data-state-body="choose"]');
    expect(text(one(staleBody, 'h2'))).toBe(CHOOSE_HEADING);
    expect(text(one(staleBody, '.sk-empty-state__body'))).toBe(STALE_SELECTION_NOTE);
    expect(CHOOSE_HEADING).toBe('Choose a finding');
    expect(STALE_SELECTION_NOTE).toBe('The selected finding is not in this scan.');
    await settle(none);
    await settle(stale);
    expect(noneEvents).toHaveLength(0);
    expect(staleEvents).toHaveLength(0);
    // The positive control: a click on a row of the same list emits.
    await userEvent.click(optionsOf(none)[0] as HTMLElement);
    expect(noneEvents.map((event) => event.type)).toEqual(['sk-select-finding']);
  });
});

describe('the truncation note (DR-19)', () => {
  it('states that the first N findings are shown, with N the number of findings, and no total or cap literal', async () => {
    const screen = await mount(reportProps('reportTruncated', { select: 0 }));
    const note = one<HTMLElement>(root(screen), '[data-region="truncation"] sk-notice');
    expect(reportTruncated.findings).toHaveLength(2);
    expect(text(note)).toBe(TRUNCATION_TEXT(2));
    expect(text(note)).toBe('Showing the first 2 findings.');
    expect(text(note)).not.toContain('1000');
    expect(note.getAttribute('announce')).toBe('off');
    expect(root(screen).querySelectorAll('[data-region="truncation"]')).toHaveLength(1);
  });

  it('the 1000-finding report says 1000 only because it holds 1000, and a report that is not truncated draws no note (positive control above)', async () => {
    const base = reportProps('reportPopulated', { select: 0 });
    const screen = await mount({ ...base, report: { ...reportPopulated, truncated: true } });
    expect(text(one(root(screen), '[data-region="truncation"] sk-notice'))).toBe('Showing the first 5 findings.');
    const plain = await mount(base);
    expect(plain.shadowRoot?.querySelectorAll('[data-region="truncation"]')).toHaveLength(0);
  });

  it('the note sits between the head and the listbox, outside the listbox', async () => {
    const screen = await mount(reportProps('reportTruncated', { select: 0 }));
    const regions = [...root(screen).querySelectorAll('[data-region="list"] > [data-region]')].map((el) => el.getAttribute('data-region'));
    expect(regions).toEqual(['head', 'truncation', 'listbox']);
    expect(one(root(screen), '[role="listbox"]').querySelectorAll('sk-notice')).toHaveLength(0);
  });
});

describe('rescanning (DR-21): the report is kept, nothing is remounted', () => {
  it('the same list, option and Rescan nodes stand before, during and after a rescan, and the new report keeps them', async () => {
    const screen = await mount();
    const listbox = one<HTMLElement>(root(screen), '[role="listbox"]');
    const options = optionsOf(screen);
    const rescan = one<HTMLElement>(root(screen), '[data-rescan]');
    expect(options).toHaveLength(5);
    screen.rescanning = true;
    await settle(screen);
    expect(one(root(screen), '[role="listbox"]')).toBe(listbox);
    expect(optionsOf(screen).every((option, index) => option === options[index])).toBe(true);
    expect(optionsOf(screen)).toHaveLength(5);
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('aria-busy')).toBe('false');
    expect(one<HTMLElement>(root(screen), '[data-rescan]').getAttribute('aria-busy')).toBe('true');
    screen.report = { ...reportPopulated, scannedAt: '2026-10-06T09:05:00Z', findings: [...reportPopulated.findings] };
    screen.rescanning = false;
    await settle(screen);
    expect(one(root(screen), '[role="listbox"]')).toBe(listbox);
    expect(optionsOf(screen).every((option, index) => option === options[index])).toBe(true);
    expect(optionsOf(screen)).toHaveLength(5);
    expect(one(root(screen), '[data-rescan]')).toBe(rescan);
    expect(one<HTMLElement>(root(screen), '[data-root]').getAttribute('aria-busy')).toBe('false');
  });

  it('a rescan keeps a focused option focused', async () => {
    const screen = await mount();
    const option = optionsOf(screen)[1] as HTMLElement;
    option.focus();
    screen.rescanning = true;
    await settle(screen);
    expect(root(screen).activeElement).toBe(option);
    screen.rescanning = false;
    await settle(screen);
    expect(root(screen).activeElement).toBe(option);
  });
});

describe('the foreign-finding fail-closed look (FR-009)', () => {
  it('a scoped scan holding a finding of another Mission is not loaded: the loading look, no list, nothing announced for it', async () => {
    const screen = await mount(reportProps('reportScopedForeign', { select: 0 }));
    expect(stateOf(screen)).toBe('loading');
    expect(root(screen).querySelectorAll('[role="listbox"], [role="option"]')).toHaveLength(0);
    expect(root(screen).querySelectorAll('[data-last-scan]')).toHaveLength(0);
    expect(liveSeq(screen)).toBeNull();
    screen.now = '2026-10-06T10:00:00Z';
    await settle(screen);
    expect(liveSeq(screen)).toBeNull();
    // The positive control: the scoped report of that Mission alone is drawn.
    const own = await mount(reportProps('reportScoped', { select: 0 }));
    expect(stateOf(own)).toBe('ready');
    expect(optionsOf(own)).toHaveLength(3);
    expect(scopedMissionId).toBe(own.missionId);
  });

  it('a ready status with no report, or with findings that are not an array, is the loading look, never the clean one', async () => {
    let ran = 0;
    for (const report of [null, { scannedAt: reportPopulated.scannedAt, truncated: false, findings: null }]) {
      const screen = await mount({ status: 'ready', report: report as never, selectedFinding: null });
      expect(stateOf(screen)).toBe('loading');
      expect(text(stateRegion(screen)).toLowerCase()).not.toContain('no drift');
      ran += 1;
    }
    expect(ran).toBe(2);
    const clean = await mount(stateProps.clean());
    expect(stateOf(clean)).toBe('empty');
  });

  it('a finding of an unknown kind is shown, never hidden: a row with its summary as the title (the known-kind report has the same rows)', async () => {
    const screen = await mount(reportProps('reportUnknownKind', { select: 'none' }));
    const rows = optionsOf(screen);
    expect(rows).toHaveLength(5);
    expect(text(rows[0]?.querySelector('[data-title]') ?? null)).toBe('An expected lane or Mission branch has no local branch.');
    const known = await mount(reportProps('reportPopulated', { select: 'none' }));
    expect(optionsOf(known)).toHaveLength(5);
  });
});
