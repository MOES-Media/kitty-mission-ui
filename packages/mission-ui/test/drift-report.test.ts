import { describe, expect, it } from 'vitest';
import { makeDriftFinding, makeDriftReport } from '../src/contract/bulk.js';
import type { DriftFindingView, DriftReportView } from '../src/contract/types.js';
import {
  agreesWithScope,
  effectiveStatus,
  headSummary,
  lastScanLine,
  resolveDriftRefusal,
  selectedIndex,
  truncationNote,
} from '../src/logic/drift-report.js';
import type { LabelHooks } from '../src/logic/types.js';

const A = '01JZ0000000000000000000AAA';
const B = '01JZ0000000000000000000BBB';
const finding = (over: Partial<DriftFindingView>): DriftFindingView => ({ ...makeDriftFinding(1), missionId: A, ...over });
const report = (findings: DriftFindingView[], truncated = false): DriftReportView => ({ scannedAt: '2026-10-01T12:00:00Z', findings, truncated });

describe('headSummary: counts from findings.length and per-severity tallies only (C-004)', () => {
  it('counts the findings and rolls severities up in first-seen order', () => {
    const r = report([finding({ severity: 'warning' }), finding({ severity: 'error' }), finding({ severity: 'warning' }), finding({ severity: 'error' }), finding({ severity: 'warning' })]);
    const head = headSummary(r, null);
    expect(head.count).toBe(5);
    expect(head.countText).toBe('5 findings');
    expect(head.tallies).toEqual([
      { severity: 'warning', word: 'warning', tone: 'attention', count: 3 },
      { severity: 'error', word: 'error', tone: 'danger', count: 2 },
    ]);
    expect(head.rollupText).toBe('3 warnings, 2 errors');
  });

  it('says 1 finding for one, and 0 findings with no roll-up for none', () => {
    expect(headSummary(report([finding({})]), null).countText).toBe('1 finding');
    const none = headSummary(report([]), null);
    expect(none.countText).toBe('0 findings');
    expect(none.rollupText).toBe('');
    expect(none.tallies).toEqual([]);
    expect(none.headBadge).toBeNull();
  });

  it('counts a kind the screen has never seen like any other, reading no kind', () => {
    const head = headSummary(report([finding({ kind: 'brand_new_kind' }), finding({ kind: 'another' })]), null);
    expect(head.count).toBe(2);
    expect(head.tallies.map((t) => t.count)).toEqual([2]);
  });

  it('has a head badge when any shown finding has a severity of the danger tone, from the defaults or the hook', () => {
    const withError = headSummary(report([finding({ severity: 'warning' }), finding({ severity: 'error' })]), null);
    expect(withError.headBadge).toEqual({ label: 'error', tone: 'danger' });
    // positive control: warnings alone have none
    expect(headSummary(report([finding({ severity: 'warning' }), finding({ severity: 'warning' })]), null).headBadge).toBeNull();
    // an unknown severity is neutral and gives no badge
    expect(headSummary(report([finding({ severity: 'notice' })]), null).headBadge).toBeNull();
    // a hook can make another severity danger
    const hooks: LabelHooks = { severity: (s) => (s === 'warning' ? { label: 'alarm', tone: 'danger' } : undefined) };
    expect(headSummary(report([finding({ severity: 'warning' })]), hooks).headBadge).toEqual({ label: 'alarm', tone: 'danger' });
  });

  it('tallies a severity named like an Object member as an ordinary key', () => {
    const head = headSummary(report([finding({ severity: '__proto__' }), finding({ severity: 'constructor' }), finding({ severity: '__proto__' })]), null);
    expect(head.tallies).toEqual([
      { severity: '__proto__', word: '__proto__', tone: 'neutral', count: 2 },
      { severity: 'constructor', word: 'constructor', tone: 'neutral', count: 1 },
    ]);
  });

  // CONTRACT-005: the plural comes from the defaults table; an unknown word, or a word of a label hook, is never pluralised.
  it('pluralises a severity from the defaults table only: unknown and hooked words are printed as given with their count', () => {
    const known = headSummary(report([finding({ severity: 'warning' }), finding({ severity: 'warning' }), finding({ severity: 'error' })]), null);
    expect(known.rollupText).toBe('2 warnings, 1 error');
    const unknown = headSummary(report([finding({ severity: 'critical' }), finding({ severity: 'critical' }), finding({ severity: 'info' }), finding({ severity: 'warning' })]), null);
    expect(unknown.rollupText).toBe('critical: 2, info: 1, 1 warning');
    const hooks: LabelHooks = { severity: (s) => (s === 'warning' ? { label: 'Warnung', tone: 'attention' } : undefined) };
    const hooked = headSummary(report([finding({ severity: 'warning' }), finding({ severity: 'warning' }), finding({ severity: 'error' })]), hooks);
    expect(hooked.rollupText).toBe('Warnung: 2, 1 error');
  });

  // CONTRACT-003 (FR-018, Q4 (a)): on a truncated report the roll-up says it covers the shown findings only.
  it('labels the roll-up as covering the shown findings when the report is truncated (positive control: a complete report has no label)', () => {
    const findings = [finding({ severity: 'warning' }), finding({ severity: 'warning' }), finding({ severity: 'error' })];
    expect(headSummary(report(findings, false), null).rollupText).toBe('2 warnings, 1 error');
    expect(headSummary(report(findings, true), null).rollupText).toBe('Among the shown findings: 2 warnings, 1 error');
    expect(headSummary(report([], true), null).rollupText).toBe('');
  });

  it('counts the bulk report by its length, with no literal cap anywhere', () => {
    const bulk = makeDriftReport(1000, true);
    const head = headSummary(bulk, null);
    expect(head.count).toBe(bulk.findings.length);
    expect(head.tallies.reduce((sum, t) => sum + t.count, 0)).toBe(1000);
    const fewer = makeDriftReport(7, true);
    expect(headSummary(fewer, null).count).toBe(7);
  });
});

describe('truncationNote: N is findings.length', () => {
  it('prints the length of the shown list when truncated, whatever it is', () => {
    expect(truncationNote(makeDriftReport(1000, true))).toBe('Showing the first 1000 findings.');
    expect(truncationNote(makeDriftReport(3, true))).toBe('Showing the first 3 findings.');
  });

  it('prints nothing when the report is not truncated (positive control: the same report truncated prints)', () => {
    expect(truncationNote(makeDriftReport(3, false))).toBeNull();
    expect(truncationNote(makeDriftReport(3, true))).not.toBeNull();
  });
});

describe('the order is the contract\'s: no function here sorts, groups or filters', () => {
  it('leaves an unsorted report as it is and selects by key in that order', () => {
    const f1 = finding({ missionId: B, artifactPath: 'z.json' });
    const f2 = finding({ missionId: A, artifactPath: 'a.json' });
    const f3 = finding({ missionId: A, kind: 'lane_branch_missing', artifactPath: 'lanes.json' });
    const r = report([f1, f2, f3]);
    const before = JSON.stringify(r);
    headSummary(r, null);
    truncationNote(r);
    expect(selectedIndex(r.findings, { missionId: A, kind: f3.kind, artifactPath: 'lanes.json' })).toBe(2);
    expect(selectedIndex(r.findings, { missionId: B, kind: f1.kind, artifactPath: 'z.json' })).toBe(0);
    expect(JSON.stringify(r)).toBe(before);
    expect(r.findings).toEqual([f1, f2, f3]);
  });

  it('finds no index for a null or unmatched key, and the first of two equal keys', () => {
    const f = finding({});
    expect(selectedIndex([f], null)).toBe(-1);
    expect(selectedIndex([f], { missionId: A, kind: f.kind, artifactPath: 'other.json' })).toBe(-1);
    expect(selectedIndex([f, f], { missionId: A, kind: f.kind, artifactPath: f.artifactPath })).toBe(0);
    expect(selectedIndex([], { missionId: A, kind: f.kind, artifactPath: f.artifactPath })).toBe(-1);
  });
});

describe('agreesWithScope and effectiveStatus (DR-24, FR-009)', () => {
  it('agrees when unscoped, or when every finding belongs to the scope', () => {
    const mixed = report([finding({ missionId: A }), finding({ missionId: B })]);
    expect(agreesWithScope(mixed, '')).toBe(true);
    expect(agreesWithScope(mixed, A)).toBe(false);
    expect(agreesWithScope(report([finding({ missionId: A })]), A)).toBe(true);
    expect(agreesWithScope(report([]), A)).toBe(true);
  });

  it('treats a scoped report with a foreign finding as not loaded, and the same report unscoped as ready', () => {
    const mixed = report([finding({ missionId: A }), finding({ missionId: B })]);
    expect(effectiveStatus('ready', mixed, A)).toBe('loading');
    expect(effectiveStatus('ready', mixed, '')).toBe('ready');
    expect(effectiveStatus('ready', report([finding({ missionId: A })]), A)).toBe('ready');
  });

  it('is loading for ready with no report or no findings array, and empty for ready with none', () => {
    expect(effectiveStatus('ready', null, '')).toBe('loading');
    expect(effectiveStatus('ready', { scannedAt: 'x', truncated: false } as unknown as DriftReportView, '')).toBe('loading');
    expect(effectiveStatus('ready', report([]), '')).toBe('empty');
    expect(effectiveStatus('empty', report([finding({})]), '')).toBe('empty');
    expect(effectiveStatus('ready', report([finding({})]), '')).toBe('ready');
  });

  it('passes loading, error and not-found through, and collapses an unknown status to empty', () => {
    expect(effectiveStatus('loading', report([finding({})]), '')).toBe('loading');
    expect(effectiveStatus('error', null, '')).toBe('error');
    expect(effectiveStatus('not-found', null, '')).toBe('not-found');
    expect(effectiveStatus('mystery', null, '')).toBe('empty');
    expect(effectiveStatus('ready', report([finding({})]), '')).not.toBe('empty');
  });
});

describe('resolveDriftRefusal and lastScanLine', () => {
  it('words the unreadable scan, and every other or absent code as the generic words', () => {
    expect(resolveDriftRefusal('drift_scan_unreadable', null)).toBe('The scan could not read a Mission, so no report is shown.');
    let ran = 0;
    for (const code of [null, '', 'mission_not_found', 'something_new', 'constructor']) {
      expect(resolveDriftRefusal(code, null), String(code)).toBe('The drift scan could not be loaded.');
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('takes the refusal hook over the table', () => {
    const hooks: LabelHooks = { refusal: (code) => (code === 'drift_scan_unreadable' ? 'Custom words' : undefined) };
    expect(resolveDriftRefusal('drift_scan_unreadable', hooks)).toBe('Custom words');
    expect(resolveDriftRefusal('something_new', hooks)).toBe('The drift scan could not be loaded.');
  });

  it('writes the last scan relative to now, the ISO instant without it, and through the time hook', () => {
    expect(lastScanLine('2026-10-01T12:00:00Z', '2026-10-01T12:05:00Z', null)).toBe('last scan 5 minutes ago');
    expect(lastScanLine('2026-10-01T12:00:00Z', null, null)).toBe('last scan 2026-10-01T12:00:00Z');
    expect(lastScanLine('2026-10-01T12:00:00Z', null, { time: () => 'noon' })).toBe('last scan noon');
  });
});
