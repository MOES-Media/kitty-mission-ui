import { describe, expect, it } from 'vitest';
import { announcementInput, nextAnnouncement, rescanCompletion, type AnnounceInput } from '../src/logic/drift-announce.js';

const base: AnnounceInput = {
  state: 'ready',
  scannedAt: '2026-10-01T12:00:00Z',
  count: 3,
  now: '2026-10-01T12:05:00Z',
  rescanning: false,
  withheld: false,
  refusalText: null,
  copyResult: null,
};
const input = (over: Partial<AnnounceInput>): AnnounceInput => ({ ...base, ...over });

describe('nextAnnouncement: text only when the announced input changed', () => {
  it('announces the loading words for the first input when it is loading', () => {
    expect(nextAnnouncement(null, input({ state: 'loading', scannedAt: null, count: 0 }))).toBe('Loading drift scan');
  });

  it('announces the loaded report once with its count and last scan, and nothing for the same input again', () => {
    expect(nextAnnouncement(input({ state: 'loading', scannedAt: null, count: 0 }), base)).toBe('Drift scan loaded: 3 findings, last scan 5 minutes ago');
    expect(nextAnnouncement(base, { ...base })).toBeNull();
  });

  it('does not re-announce when only the clock moved (the relative text changes, the report does not)', () => {
    expect(nextAnnouncement(base, input({ now: '2026-10-01T12:06:00Z' }))).toBeNull();
    expect(nextAnnouncement(base, input({ now: null }))).toBeNull();
    // positive control: the same pair announces when the report itself changes
    expect(nextAnnouncement(base, input({ now: '2026-10-01T12:06:00Z', scannedAt: '2026-10-01T12:04:00Z' }))).toBe('Rescanned: 3 findings, last scan 2 minutes ago');
  });

  it('announces a rescan exactly once, when a later scannedAt arrives while ready', () => {
    const later = input({ scannedAt: '2026-10-01T12:04:00Z', count: 4 });
    expect(nextAnnouncement(base, later)).toBe('Rescanned: 4 findings, last scan 1 minute ago');
    expect(nextAnnouncement(later, { ...later })).toBeNull();
  });

  it('announces the rescan even when the count and the text of the report are unchanged', () => {
    const again = input({ scannedAt: '2026-10-01T12:04:00Z' });
    expect(nextAnnouncement(base, again)).toBe('Rescanned: 3 findings, last scan 1 minute ago');
  });

  it('announces nothing for a scannedAt that is not later (mismatched or late data), and a rescan of a clean report', () => {
    expect(nextAnnouncement(base, input({ scannedAt: '2026-10-01T11:00:00Z' }))).toBeNull();
    expect(nextAnnouncement(base, input({ scannedAt: 'not a date' }))).toBeNull();
    const clean = input({ state: 'empty', count: 0 });
    expect(nextAnnouncement(clean, input({ state: 'empty', count: 0, scannedAt: '2026-10-01T12:04:00Z' }))).toBe('Rescanned: 0 findings, last scan 1 minute ago');
  });

  // TESTS-002: FR-026 keys on what is shown, so the same scan time with another count is a different thing shown.
  it('announces a replaced report with the same scan time and state but another count (positive control: the same count is silent)', () => {
    expect(nextAnnouncement(base, input({ count: 4 }))).toBe('Drift scan loaded: 4 findings, last scan 5 minutes ago');
    expect(nextAnnouncement(base, input({ count: 3 }))).toBeNull();
  });

  // TESTS-008: the same instant spelled two ways is not a later scan.
  it('announces no "Rescanned" for the same instant spelled two ways (positive control: a later instant in the second spelling announces)', () => {
    expect(nextAnnouncement(base, input({ scannedAt: '2026-10-01T12:00:00+00:00' }))).toBeNull();
    expect(nextAnnouncement(base, input({ scannedAt: '2026-10-01T14:00:00+02:00' }))).toBeNull();
    expect(nextAnnouncement(base, input({ scannedAt: '2026-10-01T14:04:00+02:00' }))).toBe('Rescanned: 3 findings, last scan 1 minute ago');
  });

  it('announces a report that replaces a different state, ready or empty', () => {
    expect(nextAnnouncement(input({ state: 'loading', scannedAt: null, count: 0 }), input({ state: 'empty', count: 0 }))).toBe('Drift scan loaded: 0 findings, last scan 5 minutes ago');
    expect(nextAnnouncement(input({ state: 'error', refusalText: 'x' }), base)).toBe('Drift scan loaded: 3 findings, last scan 5 minutes ago');
  });

  it('announces the refusal in words, and announces again when the text changes while the state stays error', () => {
    const first = input({ state: 'error', scannedAt: null, count: 0, refusalText: 'The drift scan could not be loaded.' });
    expect(nextAnnouncement(base, first)).toBe('Drift scan unavailable. The drift scan could not be loaded.');
    expect(nextAnnouncement(first, { ...first })).toBeNull();
    const second = input({ ...first, refusalText: 'The scan could not read a Mission, so no report is shown.' });
    expect(nextAnnouncement(first, second)).toBe('Drift scan unavailable. The scan could not read a Mission, so no report is shown.');
  });

  it('announces the Mission not found once', () => {
    const notFound = input({ state: 'not-found', scannedAt: null, count: 0 });
    expect(nextAnnouncement(base, notFound)).toBe('Mission not found');
    expect(nextAnnouncement(notFound, { ...notFound })).toBeNull();
  });

  it('announces the copy result on a change, and not on the same value, nor when it is cleared', () => {
    expect(nextAnnouncement(base, input({ copyResult: 'copied' }))).toBe('Copied');
    expect(nextAnnouncement(base, input({ copyResult: 'manual' }))).toBe('Copy it with your keyboard: the command is selected.');
    expect(nextAnnouncement(input({ copyResult: 'copied' }), input({ copyResult: 'copied' }))).toBeNull();
    expect(nextAnnouncement(input({ copyResult: 'copied' }), input({ copyResult: null }))).toBeNull();
    expect(nextAnnouncement(input({ copyResult: 'copied' }), input({ copyResult: 'manual' }))).toBe('Copy it with your keyboard: the command is selected.');
  });

  it('announces a copy result that arrives together with a state change as the state first, never a stale copy', () => {
    expect(nextAnnouncement(input({ state: 'loading', scannedAt: null, count: 0 }), input({ copyResult: 'copied' }))).toBe('Drift scan loaded: 3 findings, last scan 5 minutes ago');
  });

  it('never announces a copy result in a state that does not show a report', () => {
    expect(nextAnnouncement(input({ state: 'error', refusalText: 'x' }), input({ state: 'error', refusalText: 'x', copyResult: 'copied' }))).toBeNull();
    // positive control: the same copy result is announced in the ready state
    expect(nextAnnouncement(input({ state: 'ready' }), input({ state: 'ready', copyResult: 'copied' }))).toBe('Copied');
  });

  it('announces a foreign count text as given (counts are printed, not computed)', () => {
    expect(nextAnnouncement(null, input({ count: 1 }))).toBe('Drift scan loaded: 1 finding, last scan 5 minutes ago');
    expect(nextAnnouncement(null, input({ count: 1000 }))).toBe('Drift scan loaded: 1000 findings, last scan 5 minutes ago');
  });

  // F-1: FR-026 announces the load with the count; a missing time only drops the last-scan clause.
  it('announces the load without the last-scan clause for a report whose time is missing, once', () => {
    expect(nextAnnouncement(null, input({ scannedAt: null }))).toBe('Drift scan loaded: 3 findings');
    expect(nextAnnouncement(input({ state: 'loading', scannedAt: null, count: 0 }), input({ scannedAt: null, count: 5 }))).toBe('Drift scan loaded: 5 findings');
    expect(nextAnnouncement(input({ scannedAt: null }), input({ scannedAt: null }))).toBeNull();
    expect(nextAnnouncement(input({ scannedAt: null }), input({ scannedAt: null, count: 4 }))).toBe('Drift scan loaded: 4 findings');
    expect(nextAnnouncement(input({ state: 'empty', scannedAt: null, count: 0 }), input({ state: 'empty', scannedAt: null, count: 0 }))).toBeNull();
    // positive control: the same input with a time announces
    expect(nextAnnouncement(null, input({ scannedAt: '2026-10-01T12:00:00Z' }))).toBe('Drift scan loaded: 3 findings, last scan 5 minutes ago');
  });
});

describe('nextAnnouncement: a report that is not shown, and the start of a rescan', () => {
  const loading = input({ state: 'loading', scannedAt: null, count: 0 });

  it('announces nothing when the loading look is only the stand-in for a report that cannot be shown (positive control: a real loading status announces)', () => {
    expect(nextAnnouncement(base, { ...loading, withheld: true })).toBeNull();
    expect(nextAnnouncement(base, loading)).toBe('Loading drift scan');
  });

  it('announces "Rescanning" once, on the edge into rescanning, and nothing while it continues (positive control: not rescanning stays silent)', () => {
    const rescanning = input({ rescanning: true });
    expect(nextAnnouncement(base, rescanning)).toBe('Rescanning');
    expect(nextAnnouncement(rescanning, { ...rescanning })).toBeNull();
    expect(nextAnnouncement(rescanning, input({ rescanning: true, now: '2026-10-01T12:09:00Z' }))).toBeNull();
    expect(nextAnnouncement(base, { ...base })).toBeNull();
  });

  // F-3: Rescan is drawn in every state, so the start of a rescan is announced in every state (positive control: no edge, no line).
  it('announces "Rescanning" on the edge in the error and not-found states, once', () => {
    for (const shape of [{ state: 'error', refusalText: 'x' }, { state: 'not-found' }] as const) {
      const idle = input({ ...shape, scannedAt: null, count: 0 });
      const busy = { ...idle, rescanning: true };
      expect(nextAnnouncement(idle, busy)).toBe('Rescanning');
      expect(nextAnnouncement(busy, { ...busy })).toBeNull();
      expect(nextAnnouncement(idle, { ...idle })).toBeNull();
    }
  });

  // F-3: a real loading that follows a withheld one is announced (the state is `loading` in both).
  it('announces the loading words when a real loading follows a withheld one (positive control: withheld after withheld is silent)', () => {
    expect(nextAnnouncement({ ...loading, withheld: true }, loading)).toBe('Loading drift scan');
    expect(nextAnnouncement({ ...loading, withheld: true }, { ...loading, withheld: true })).toBeNull();
    expect(nextAnnouncement(loading, loading)).toBeNull();
  });

  // The end of a rescan is decided against the input captured when it started (round 3, S-1, S-2), not against the previous update.
  it('the end of a rescan: the same report says "no changes", another says its own line, and the falling update itself says nothing', () => {
    const rescanning = input({ rescanning: true });
    expect(nextAnnouncement(rescanning, base)).toBeNull();
    expect(rescanCompletion(rescanning, base)).toBe('Rescan complete: no changes');
    expect(rescanCompletion(rescanning, { ...base })).toBe('Rescan complete: no changes');
    // positive controls: still rescanning, no base, a different report
    expect(rescanCompletion(rescanning, rescanning)).toBeNull();
    expect(rescanCompletion(null, base)).toBeNull();
    expect(rescanCompletion(rescanning, input({ count: 4 }))).toBe('Drift scan loaded: 4 findings, last scan 5 minutes ago');
    // an older scan time is a different report, not "no changes"
    expect(rescanCompletion(rescanning, input({ scannedAt: '2026-10-01T11:00:00Z' }))).toBe('Drift scan loaded: 3 findings, last scan 1 hour ago');
    expect(nextAnnouncement(rescanning, input({ scannedAt: '2026-10-01T12:04:00Z' }))).toBe('Rescanned: 3 findings, last scan 1 minute ago');
    // the error and not-found states: the same words say "no changes", other words are not "no changes"
    const failed = input({ state: 'error', scannedAt: null, count: 0, refusalText: 'words' });
    expect(rescanCompletion({ ...failed, rescanning: true }, failed)).toBe('Rescan complete: no changes');
    expect(rescanCompletion({ ...failed, rescanning: true }, { ...failed, refusalText: 'other' })).toBeNull();
    const missing = input({ state: 'not-found', scannedAt: null, count: 0 });
    expect(rescanCompletion({ ...missing, rescanning: true }, missing)).toBe('Rescan complete: no changes');
  });

  it('says the rescanned line, not "Rescanning", when the new report arrives together with the start', () => {
    expect(nextAnnouncement(base, input({ rescanning: true, scannedAt: '2026-10-01T12:04:00Z' }))).toBe('Rescanned: 3 findings, last scan 1 minute ago');
  });
});

describe('announcementInput: what the screen shows becomes the input', () => {
  const report = { scannedAt: '2026-10-01T12:00:00Z', findings: [], truncated: false };
  const make = { status: 'ready', report: { ...report, findings: [{}, {}] as never }, missionId: '', now: null, refusalCode: null, errorMessage: '', copyResult: null, labels: null, rescanning: false };

  it('counts findings.length and carries the scan time when ready', () => {
    expect(announcementInput(make)).toEqual({ state: 'ready', scannedAt: report.scannedAt, count: 2, now: null, rescanning: false, withheld: false, refusalText: null, copyResult: null });
  });

  it('is loading for a scoped report with a foreign finding, announcing nothing for the report (positive control: unscoped is ready)', () => {
    const foreign = { ...make, missionId: 'M1', report: { ...report, findings: [{ missionId: 'OTHER' }] as never } };
    expect(announcementInput(foreign).state).toBe('loading');
    expect(announcementInput({ ...foreign, missionId: '' }).state).toBe('ready');
  });

  it('the clean look announces the count it shows, none, even when the report holds findings (positive control: ready counts them)', () => {
    const five = { ...report, findings: [{}, {}, {}, {}, {}] as never };
    expect(announcementInput({ ...make, status: 'empty', report: five })).toMatchObject({ state: 'empty', count: 0 });
    expect(announcementInput({ ...make, status: 'ready', report: { ...report, findings: [] } })).toMatchObject({ state: 'empty', count: 0 });
    expect(announcementInput({ ...make, status: 'ready', report: five })).toMatchObject({ state: 'ready', count: 5 });
  });

  it("an empty status with another Mission's report in a scoped screen is loading and withheld, like ready", () => {
    const foreign = { ...make, status: 'empty', missionId: 'M1', report: { ...report, findings: [{ missionId: 'OTHER' }] as never } };
    expect(announcementInput(foreign)).toMatchObject({ state: 'loading', withheld: true, count: 0 });
    expect(announcementInput({ ...foreign, missionId: '' })).toMatchObject({ state: 'empty', withheld: false });
  });

  it('a scan time that is not a non-empty string is null, so no half sentence can be built from it (positive control: a string stays)', () => {
    const withTime = (scannedAt: unknown) => announcementInput({ ...make, report: { ...report, scannedAt, findings: [{}] as never } as never });
    expect(withTime(undefined).scannedAt).toBeNull();
    expect(withTime('').scannedAt).toBeNull();
    expect(withTime(7).scannedAt).toBeNull();
    expect(withTime('2026-10-01T12:00:00Z').scannedAt).toBe('2026-10-01T12:00:00Z');
  });

  it('is withheld when the host says ready but the report cannot be shown (positive control: a real loading status, and a shown report, are not)', () => {
    const foreign = { ...make, missionId: 'M1', report: { ...report, findings: [{ missionId: 'OTHER' }] as never } };
    expect(announcementInput(foreign).withheld).toBe(true);
    expect(announcementInput({ ...make, report: null }).withheld).toBe(true);
    expect(announcementInput({ ...make, status: 'loading', report: null }).withheld).toBe(false);
    expect(announcementInput(make).withheld).toBe(false);
  });

  it('carries the rescanning flag', () => {
    expect(announcementInput({ ...make, rescanning: true }).rescanning).toBe(true);
    expect(announcementInput(make).rescanning).toBe(false);
  });

  it('puts the host error message before the refusal words, and the refusal words before the generic', () => {
    const base2 = { ...make, status: 'error', report: null };
    expect(announcementInput({ ...base2, errorMessage: 'Host says no' }).refusalText).toBe('Host says no');
    expect(announcementInput({ ...base2, refusalCode: 'drift_scan_unreadable' }).refusalText).toBe('The scan could not read a Mission, so no report is shown.');
    expect(announcementInput(base2).refusalText).toBe('The drift scan could not be loaded.');
  });

  it('drops the copy result outside a shown report', () => {
    expect(announcementInput({ ...make, copyResult: 'manual' }).copyResult).toBe('manual');
    expect(announcementInput({ ...make, status: 'error', report: null, copyResult: 'manual' }).copyResult).toBeNull();
  });
});
