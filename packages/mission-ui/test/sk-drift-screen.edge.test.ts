// The edge cases of the spec, each once, through the whole Drift screen (T041, DR-25): unknown vocabulary, an unlisted Mission, a
// foreign finding in a scoped scan, a ready screen without a usable report, a selection that is not in the scan, a host that ignores
// the select event, duplicate keys, 1000 rows, a very long command or table, Rescan pressed twice, a report replaced during a copy,
// and an unusable scan time. Every no-event case has a positive control; every loop asserts its count.
// Revert check (temporary local edit, never committed): in `sk-drift-screen.ts` make `rescanDrift` ignore `this.rescanning` and
// "Rescan pressed twice" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { bulkProps, driftFrame, reportProps, scopedMissionId, stateProps, unbreakableSlug } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';
import { reportClean, reportMissionUnlisted, reportPopulated, reportScoped } from '../src/contract/fixtures.generated.js';
import type { DriftFindingView, DriftReportView } from '../src/contract/types.js';
import { findingKey } from '../src/logic/index.js';
import { CHOOSE_HEADING, COPY_RESULT_TEXT, STALE_SELECTION_NOTE } from '../src/defaults/index.js';

afterEach(() => {
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
  return screen;
}
const root = (screen: SkDriftScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
function one<T extends HTMLElement>(screen: SkDriftScreen, selector: string): T {
  const found = root(screen).querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const text = (el: Element | null | undefined): string => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const options = (screen: SkDriftScreen): HTMLElement[] => [...root(screen).querySelectorAll<HTMLElement>('[role="option"]')];
const NAMES = ['sk-select-finding', 'sk-rescan-drift', 'sk-copy-command', 'sk-open-mission', 'sk-open-missions', 'sk-retry-load'] as const;
function listen(screen: SkDriftScreen): CustomEvent[] {
  const seen: CustomEvent[] = [];
  for (const name of NAMES) screen.addEventListener(name, (event) => seen.push(event as CustomEvent));
  return seen;
}
const withFinding = (index: number, patch: Partial<DriftFindingView>): DriftReportView => ({
  ...reportPopulated,
  findings: reportPopulated.findings.map((finding, i) => (i === index ? { ...finding, ...patch } : finding)),
});

describe('unknown vocabulary: the raw word, a neutral tone, no explanation, no command; the finding is never hidden', () => {
  it('kind, severity, authority, derived side, source code, remedy and lane word', async () => {
    const lanes = (reportPopulated.findings[1]?.laneComparison ?? []).map((row, i) => (i === 0 ? { ...row, derivedStatusLane: 'quarantined' } : row));
    const cases: Array<{ name: string; report: DriftReportView; check: (screen: SkDriftScreen) => void }> = [
      { name: 'kind', report: withFinding(1, { kind: 'a_new_kind' }), check: (s) => (expect(text(one(s, '[data-kind]'))).toBe('a_new_kind'), expect(root(s).querySelector('[data-explanation]')).toBeNull()) },
      { name: 'severity', report: withFinding(1, { severity: 'a_new_severity' }), check: (s) => (expect(text(one(s, '[data-kicker] sk-pill-tag'))).toBe('a_new_severity'), expect(one(s, '[data-kicker] sk-pill-tag').getAttribute('status')).toBe('neutral')) },
      { name: 'authority', report: withFinding(1, { authority: 'a_new_authority' }), check: (s) => expect(text(one(s, '[data-authority]'))).toBe('a_new_authority') },
      { name: 'derived side', report: withFinding(1, { derivedSide: 'a_new_side' }), check: (s) => expect(text(one(s, '[data-region="facts"]'))).toContain('a_new_side') },
      { name: 'source code', report: withFinding(1, { sourceCode: 'A_NEW_CODE' }), check: (s) => expect(text(one(s, '[data-source-code]'))).toBe('A_NEW_CODE') },
      { name: 'remedy', report: withFinding(1, { remedy: 'a_new_remedy' }), check: (s) => (expect(root(s).querySelector('[data-command]')).toBeNull(), expect(root(s).querySelector('[data-copy]')).toBeNull()) },
      { name: 'lane word', report: withFinding(1, { laneComparison: lanes }), check: (s) => expect(text(one(s, '.sk-data-table tbody'))).toContain('quarantined') },
    ];
    let ran = 0;
    for (const { name, report, check } of cases) {
      const screen = await mount({ ...reportProps('reportPopulated', { select: 1 }), report, selectedFinding: findingKey(report.findings[1] as DriftFindingView) });
      expect(options(screen), name).toHaveLength(5);
      expect(root(screen).querySelector('[data-detail="finding"]'), name).not.toBeNull();
      check(screen);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(7);
    // Positive control: the known vocabulary of the same finding has an explanation, a command and its own words.
    const known = await mount();
    expect(root(known).querySelector('[data-explanation]')).not.toBeNull();
    expect(root(known).querySelector('[data-copy]')).not.toBeNull();
  });
});

describe('a Mission missing from the name map, a foreign finding, a report that cannot be shown', () => {
  it('an unlisted Mission: its id in mono, no link, the finding stays in the list', async () => {
    const screen = await mount(reportProps('reportMissionUnlisted', { select: 0 }));
    expect(text(one(screen, '[data-mission-id]'))).toBe('01JZCB3H8J9KMNPQRSTVWXYZ01');
    expect(root(screen).querySelector('[data-mission-link]')).toBeNull();
    expect(options(screen)).toHaveLength(reportMissionUnlisted.findings.length);
    expect(options(screen).some((option) => text(option).includes('01JZCB3H8J9KMNPQRSTVWXYZ01'))).toBe(true);
  });

  it('a finding for another Mission in a scoped report: the scan is not loaded; the same scope on its own report is (positive control)', async () => {
    const foreign = await mount(reportProps('reportScopedForeign', { select: 0 }));
    expect(foreign.getAttribute('status')).toBe('ready');
    expect(one(foreign, '[data-root]').getAttribute('data-state')).toBe('loading');
    expect(options(foreign)).toHaveLength(0);
    document.body.replaceChildren();
    const own = await mount(reportProps('reportScoped', { select: 0 }));
    expect(one(own, '[data-root]').getAttribute('data-state')).toBe('ready');
    expect(options(own)).toHaveLength(reportScoped.findings.length);
    expect(scopedMissionId).not.toBe('');
  });

  it('status ready with a null report, and a report whose findings are not an array: the loading look, announcing nothing, never clean', async () => {
    const live = (s: SkDriftScreen): string => text(root(s).querySelector('[data-live]'));
    const cases: Array<[string, Partial<DriftScreenProps>]> = [
      ['null report', { report: null, selectedFinding: null }],
      ['findings not an array', { report: { scannedAt: '2026-10-06T09:00:00Z', findings: 'none' } as unknown as DriftReportView }],
    ];
    let ran = 0;
    for (const [name, props] of cases) {
      const screen = await mount(props);
      expect(one(screen, '[data-root]').getAttribute('data-state'), name).toBe('loading');
      expect(root(screen).querySelector('[data-state-body="clean"]'), name).toBeNull();
      expect(root(screen).querySelector('[data-state-body="loading"]'), name).not.toBeNull();
      expect(live(screen), name).toBe('');
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});

describe('selection', () => {
  it('a selected key that is not in the scan: nothing is marked and the detail says so (positive control: a key in the scan marks one row)', async () => {
    const screen = await mount({ selectedFinding: { missionId: 'a-mission', kind: 'a-kind', artifactPath: 'a/file' } });
    expect(options(screen).filter((option) => option.getAttribute('aria-selected') === 'true')).toHaveLength(0);
    expect(one(screen, '[data-detail="stale"]')).toBeDefined();
    expect(text(one(screen, '[data-region="detail"]'))).toContain(STALE_SELECTION_NOTE);
    expect(text(one(screen, '[data-region="detail"]'))).toContain(CHOOSE_HEADING);
    document.body.replaceChildren();
    const marked = await mount();
    expect(options(marked).filter((option) => option.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('a host that ignores sk-select-finding: one event per click, and selection and detail stay on the property', async () => {
    const screen = await mount();
    const seen = listen(screen);
    const before = text(one(screen, '[data-region="detail"]'));
    const key = screen.selectedFinding;
    options(screen)[3]?.click();
    await settle(screen);
    expect(seen).toHaveLength(1);
    expect(seen[0]?.type).toBe('sk-select-finding');
    expect(seen[0]?.bubbles).toBe(true);
    expect(seen[0]?.composed).toBe(true);
    expect(seen[0]?.cancelable).toBe(false);
    expect(seen[0]?.detail).toEqual(findingKey(reportPopulated.findings[3] as DriftFindingView));
    expect(screen.selectedFinding).toBe(key);
    expect(text(one(screen, '[data-region="detail"]'))).toBe(before);
    expect(options(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false', 'false', 'false']);
    // Positive control: a host that follows the event moves the selection.
    screen.selectedFinding = seen[0]?.detail ?? null;
    await settle(screen);
    expect(options(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['false', 'false', 'false', 'true', 'false']);
  });

  it('duplicate keys (a contract violation): the first wins for selection; the list draws every row once and keeps its nodes on a re-render', async () => {
    const first = reportPopulated.findings[1] as DriftFindingView;
    const report: DriftReportView = { ...reportPopulated, findings: [first, ...reportPopulated.findings.slice(0, 1), first, ...reportPopulated.findings.slice(2)] };
    expect(report.findings.filter((f) => f.artifactPath === first.artifactPath && f.kind === first.kind && f.missionId === first.missionId)).toHaveLength(2);
    const screen = await mount({ ...reportProps('reportPopulated', { select: 1 }), report, selectedFinding: findingKey(first) });
    expect(options(screen)).toHaveLength(6);
    expect(options(screen).map((option) => option.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false']);
    const nodes = options(screen);
    screen.report = { ...report };
    await settle(screen);
    expect(options(screen)).toHaveLength(6);
    options(screen).forEach((option, i) => expect(option, `row ${i}`).toBe(nodes[i]));
  });
});

describe('size and length', () => {
  it('1000 rows: plain DOM, one option per finding, no inner scroller, the page does not overflow', async () => {
    const screen = await mount(bulkProps({ select: 0 }));
    expect(options(screen)).toHaveLength(1000);
    expect(getComputedStyle(one(screen, '[data-region="listbox"]')).overflowY).toBe('visible');
    expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBeLessThanOrEqual(0);
  });

  it('a very long command wraps inside its field and a long lane table scrolls inside its region; neither widens the page', async () => {
    const wide = reportProps('reportManyLanes', { select: 0, slug: unbreakableSlug });
    const report = wide.report;
    const finding = report?.findings[0];
    if (report === null || finding === undefined) throw new Error('fixture');
    const lanes = finding.laneComparison.map((row, i) => (i === 0 ? { ...row, wpId: 'WP_an_unbreakable_work_package_identifier_of_seventy_characters_xx' } : row));
    const screen = await mount({ ...wide, report: { ...report, findings: [{ ...finding, laneComparison: lanes }] } }, 620);
    const command = one<HTMLElement>(screen, '[data-command]');
    expect(text(command)).toContain(unbreakableSlug);
    const field = one<HTMLElement>(screen, '[data-field]').getBoundingClientRect();
    expect(command.getBoundingClientRect().right).toBeLessThanOrEqual(field.right + 1);
    expect(command.getBoundingClientRect().height).toBeGreaterThan(parseFloat(getComputedStyle(command).lineHeight));
    const scroller = one<HTMLElement>(screen, '.sk-data-table__scroller');
    expect(scroller.scrollWidth).toBeGreaterThan(scroller.clientWidth);
    expect(document.documentElement.scrollWidth - document.documentElement.clientWidth).toBeLessThanOrEqual(0);
  });
});

describe('actions', () => {
  it('Rescan pressed twice: the second press while rescanning emits nothing; the first and a press after the scan do (positive controls)', async () => {
    const screen = await mount();
    const seen = listen(screen);
    const rescan = one<HTMLElement>(screen, '[data-rescan]');
    rescan.click();
    expect(seen).toHaveLength(1);
    screen.rescanning = true;
    await settle(screen);
    rescan.click();
    rescan.click();
    expect(seen).toHaveLength(1);
    screen.rescanning = false;
    await settle(screen);
    rescan.click();
    expect(seen).toHaveLength(2);
    for (const event of seen) {
      expect(event.type).toBe('sk-rescan-drift');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.cancelable).toBe(false);
      expect(event.detail).toEqual({ missionId: null });
    }
  });

  it('a report replaced while a copy is pending: the answer is not shown for the new report (positive control: without the replacement it is)', async () => {
    const live = (s: SkDriftScreen): string => text(root(s).querySelector('[data-live]'));
    const result = (s: SkDriftScreen): string => text(root(s).querySelector('[data-copy-result]'));
    const plain = await mount();
    one<HTMLElement>(plain, '[data-copy]').click();
    plain.copyResult = 'copied';
    await settle(plain);
    expect(result(plain)).toBe(COPY_RESULT_TEXT.copied);
    expect(live(plain)).toBe(COPY_RESULT_TEXT.copied);
    document.body.replaceChildren();
    const screen = await mount();
    one<HTMLElement>(screen, '[data-copy]').click();
    screen.report = { ...reportPopulated, scannedAt: '2026-10-06T09:09:00Z' };
    await settle(screen);
    screen.copyResult = 'copied';
    await settle(screen);
    expect(result(screen)).toBe('');
    expect(live(screen)).not.toContain(COPY_RESULT_TEXT.copied);
  });
});

describe('the detail and its rows keep their own type, and the Mission link starts at the left', () => {
  it('a list row title is 14 px bold and the detail title 18 px in the display face (the detail rule must not leak into rows)', async () => {
    const screen = await mount();
    const rows = [...root(screen).querySelectorAll<HTMLElement>('[role="option"] [data-title]')];
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const style = getComputedStyle(row);
      expect(style.fontSize).toBe('14px');
      expect(style.fontWeight).toBe('700');
    }
    const detail = getComputedStyle(one(screen, '[data-region="detail"] [data-title]'));
    expect(detail.fontSize).toBe('18px');
    expect(detail.fontFamily).not.toBe(getComputedStyle(rows[0] as HTMLElement).fontFamily);
  });

  it('a wrapped Mission link is aligned to the start, not centred (positive control: the link does wrap)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1, slug: unbreakableSlug }), 1100);
    const button = one<HTMLElement>(screen, '[data-mission-link]').shadowRoot?.querySelector('button') as HTMLElement;
    const lineHeight = parseFloat(getComputedStyle(button).lineHeight);
    expect(button.getBoundingClientRect().height).toBeGreaterThan(lineHeight * 1.5);
    expect(getComputedStyle(button).textAlign).toBe('start');
  });
});

describe('the scan time', () => {
  it('unparseable: the raw string is shown as given, the findings are drawn, nothing throws', async () => {
    const odd = await mount({ report: { ...reportPopulated, scannedAt: 'sometime last week' } });
    expect(text(one(odd, '[data-last-scan]'))).toBe('last scan sometime last week');
    expect(options(odd)).toHaveLength(5);
  });

  // BOUNDARY-004: the header's mono and muted last-scan grant (G-2) is for the header's own element; the clean state draws one too.
  it('the header\'s last-scan type does not reach the clean state\'s own last-scan line (positive control: the header\'s is mono)', async () => {
    const populated = await mount();
    const header = getComputedStyle(one(populated, '[data-region="header"] [data-last-scan]'));
    expect(header.fontFamily).toMatch(/mono/i);
    document.body.replaceChildren();
    const clean = await mount(stateProps.clean());
    const line = getComputedStyle(one(clean, '[data-state-body="clean"] [data-last-scan]'));
    expect(line.fontFamily).not.toMatch(/mono/i);
    expect(line.fontFamily).not.toBe(header.fontFamily);
  });

  it('missing: the screen draws and does not throw', async () => {
    const missing = { ...reportPopulated } as Partial<DriftReportView>;
    delete missing.scannedAt;
    const screen = await mount({ report: missing as DriftReportView });
    expect(options(screen)).toHaveLength(5);
  });

  // Spec edge case: "the raw string or no last-scan line": a missing `scannedAt` draws no line (a defect printed "last scan undefined").
  it('missing: the line never says "undefined" (the spec says the raw string or no line); an empty one draws none either', async () => {
    const missing = { ...reportPopulated } as Partial<DriftReportView>;
    delete missing.scannedAt;
    const screen = await mount({ report: missing as DriftReportView });
    expect(root(screen).querySelector('[data-last-scan]')).toBeNull();
    expect(root(screen).textContent ?? '').not.toContain('undefined');
    const empty = await mount({ report: { ...reportPopulated, scannedAt: '' } });
    expect(root(empty).querySelector('[data-last-scan]')).toBeNull();
    const clean = await mount({ ...stateProps.clean(), report: { ...reportClean, scannedAt: undefined as unknown as string } });
    expect(root(clean).querySelector('[data-last-scan]')).toBeNull();
    expect(root(clean).textContent ?? '').not.toContain('undefined');
  });
});
