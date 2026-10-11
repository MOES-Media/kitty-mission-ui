// Pure view-model of the Drift report as a whole (FR-007, FR-009, FR-019, FR-020): display counts from `findings.length`
// and per-severity tallies only (C-004). Nothing here sorts, groups or filters: the order of the findings is the contract's.
import {
  FINDINGS_COUNT_TEXT,
  LAST_SCAN_TEXT,
  DRIFT_REFUSAL_GENERIC,
  REFUSAL_WORDS,
  ROLLUP_SHOWN_TEXT,
  SEVERITY_ROLLUP_TEXT,
  SEVERITY_WORDS,
  TRUNCATION_TEXT,
} from '../defaults/index.js';
import type { DriftFindingKey, DriftFindingView, DriftReportView } from '../contract/types.js';
import { normaliseViewState } from '../view-state.js';
import { resolveSeverity, sameKey } from './drift-finding.js';
import { lookup } from './lookup.js';
import { resolveActivity } from './time.js';
import type { BadgeTone, LabelHooks, StateBadge } from './types.js';

/** The view states: the four of the charter plus the screen's own `not-found`; also what the screen draws. Unknown values collapse to `empty`, except `not-found`. */
export type DriftScreenStatus = 'loading' | 'ready' | 'empty' | 'error' | 'not-found';

/** One severity present in the report: its raw value, its word and tone, and how many shown findings carry it. */
interface SeverityTally {
  severity: string;
  word: string;
  tone: BadgeTone;
  count: number;
}

interface HeadSummary {
  count: number;
  countText: string;
  tallies: SeverityTally[];
  rollupText: string;
  /** Present when any shown finding has a severity whose tone is `danger`: the word and tone of the first such severity. */
  headBadge: StateBadge | null;
}

/** Counts are `findings.length` and per-severity tallies in first-seen order; no kind is read. */
export function headSummary(report: DriftReportView, hooks: LabelHooks | null): HeadSummary {
  const counts = new Map<string, number>();
  for (const finding of report.findings) counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
  const tallies = [...counts].map(([severity, count]) => ({ severity, ...resolveSeverity(severity, hooks), count }));
  const danger = tallies.find((tally) => tally.tone === 'danger');
  // The plural is the defaults table's, and only for a word the table owns: a hook's word or an unknown one has none.
  const parts = tallies.map((tally) => ({
    count: tally.count,
    word: tally.word,
    plural: hooks?.severity?.(tally.severity) === undefined ? (lookup(SEVERITY_WORDS, tally.severity)?.plural ?? null) : null,
  }));
  const rollup = SEVERITY_ROLLUP_TEXT(parts);
  return {
    count: report.findings.length,
    countText: FINDINGS_COUNT_TEXT(report.findings.length),
    tallies,
    rollupText: report.truncated && rollup !== '' ? ROLLUP_SHOWN_TEXT(rollup) : rollup,
    headBadge: danger === undefined ? null : { label: danger.word, tone: danger.tone },
  };
}

/** "Showing the first N findings." with N = `findings.length`, only for a truncated report. */
export function truncationNote(report: DriftReportView): string | null {
  return report.truncated ? TRUNCATION_TEXT(report.findings.length) : null;
}

/** The index of the first finding with this key, else -1 (also for a null key). */
export function selectedIndex(findings: readonly DriftFindingView[], key: DriftFindingKey | null): number {
  if (key === null) return -1;
  return findings.findIndex((finding) => sameKey(finding, key));
}

/** In a scoped scan (`missionId` non-empty) every finding must belong to that Mission; unscoped always agrees. */
export function agreesWithScope(report: DriftReportView, missionId: string): boolean {
  return missionId === '' || report.findings.every((finding) => finding.missionId === missionId);
}

/**
 * The state the screen draws. `ready` with no report, no findings array or a scope disagreement is not loaded (loading);
 * `ready` with no findings, or `empty`, is the clean look; an unknown status collapses to `empty`, except `not-found`.
 */
export function effectiveStatus(status: string, report: DriftReportView | null, missionId: string): DriftScreenStatus {
  if (status === 'not-found') return 'not-found';
  const state = normaliseViewState(status);
  if (state !== 'ready') return state;
  if (report === null || !Array.isArray(report.findings)) return 'loading';
  if (!agreesWithScope(report, missionId)) return 'loading';
  return report.findings.length === 0 ? 'empty' : 'ready';
}

/** hook, then the refusal words; a code the screen has never seen, or none, is the generic words. */
export function resolveDriftRefusal(code: string | null, hooks: LabelHooks | null): string {
  if (code === null || code === '') return DRIFT_REFUSAL_GENERIC;
  return hooks?.refusal?.(code) ?? lookup(REFUSAL_WORDS, code) ?? DRIFT_REFUSAL_GENERIC;
}

/** "last scan <relative time>": the time hook, else relative to `now`, else the ISO instant as given; empty when the scan has no time. */
export function lastScanLine(scannedAt: string | null | undefined, now: string | null, hooks: LabelHooks | null): string {
  if (typeof scannedAt !== 'string' || scannedAt === '') return '';
  return LAST_SCAN_TEXT(resolveActivity(scannedAt, now, hooks));
}
