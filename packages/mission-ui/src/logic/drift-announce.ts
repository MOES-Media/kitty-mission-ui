// Live-region text of the Drift screen (FR-026): a pure `nextAnnouncement(prev, next)` that returns text only when what is
// announced changed, keyed on what is shown. A clock tick, an equal input or late and mismatched data announce nothing; a
// rescan (a later `scannedAt`) and a changed refusal text announce even though the state is the same.
import {
  COPY_RESULT_TEXT,
  DRIFT_LOADING_LABEL,
  DRIFT_NOT_FOUND_HEADING,
  ERROR_ANNOUNCEMENT,
  READY_ANNOUNCEMENT,
  RESCANNED_TEXT,
  RESCAN_UNCHANGED_ANNOUNCEMENT,
  RESCANNING_ANNOUNCEMENT,
} from '../defaults/index.js';
import type { DriftReportView } from '../contract/types.js';
import { effectiveStatus, resolveDriftRefusal, type DriftScreenStatus } from './drift-report.js';
import { lookup } from './lookup.js';
import { normaliseViewState } from '../view-state.js';
import { resolveActivity } from './time.js';
import type { LabelHooks } from './types.js';

/** What is announced about, already reduced to what the screen shows. */
export interface AnnounceInput {
  state: DriftScreenStatus;
  /** The scan time of the shown report; null when no report is shown or the report has no usable time (a non-empty string only). */
  scannedAt: string | null;
  /** `findings.length` of the shown report. */
  count: number;
  now: string | null;
  /** True while a rescan is in flight (the report stays shown). */
  rescanning: boolean;
  /** True when the host says `ready` but the report cannot be shown (no report, no findings array, another Mission's finding): FR-009 announces nothing for it. */
  withheld: boolean;
  /** The words of the refusal, for the error state. */
  refusalText: string | null;
  /** The copy result shown for the pressed finding (already filtered by the screen). */
  copyResult: string | null;
}

// A report is shown in the ready and empty states, with or without a usable scan time.
const shown = (input: AnnounceInput | null): input is AnnounceInput => input !== null && (input.state === 'ready' || input.state === 'empty');

function reportLine(prev: AnnounceInput | null, next: AnnounceInput, hooks: LabelHooks | null): string | null {
  const last = next.scannedAt === null ? null : resolveActivity(next.scannedAt, next.now, hooks);
  if (!shown(prev)) return READY_ANNOUNCEMENT(next.count, last);
  if (prev.scannedAt === next.scannedAt) {
    return prev.state === next.state && prev.count === next.count ? null : READY_ANNOUNCEMENT(next.count, last);
  }
  // The time appeared or vanished: another report is shown. Two usable times: only a later one is a rescan.
  if (prev.scannedAt === null || next.scannedAt === null) return READY_ANNOUNCEMENT(next.count, last);
  const before = Date.parse(prev.scannedAt);
  const after = Date.parse(next.scannedAt);
  return Number.isNaN(before) || Number.isNaN(after) || after <= before ? null : RESCANNED_TEXT(next.count, last as string);
}

/** Rescan is drawn in every state, so the start of a rescan (the edge into `rescanning`) is announced in every state. */
const rescanEdge = (prev: AnnounceInput | null, next: AnnounceInput): string | null => (next.rescanning && prev !== null && !prev.rescanning ? RESCANNING_ANNOUNCEMENT : null);

/** The one polite line to announce when `next` replaces `prev`, or null. */
export function nextAnnouncement(prev: AnnounceInput | null, next: AnnounceInput, hooks: LabelHooks | null = null): string | null {
  switch (next.state) {
    case 'loading':
      return next.withheld || (prev?.state === next.state && !prev.withheld) ? null : DRIFT_LOADING_LABEL;
    case 'error':
      if (prev?.state === next.state && prev.refusalText === next.refusalText) return rescanEdge(prev, next);
      return ERROR_ANNOUNCEMENT(next.refusalText ?? '');
    case 'not-found':
      return prev?.state === next.state ? rescanEdge(prev, next) : DRIFT_NOT_FOUND_HEADING;
    default: {
      const line = reportLine(prev, next, hooks);
      if (line !== null) return line;
      const rescan = rescanEdge(prev, next);
      if (rescan !== null) return rescan;
      if (next.state === 'ready' && next.copyResult !== null && next.copyResult !== prev?.copyResult) {
        return lookup(COPY_RESULT_TEXT, next.copyResult) ?? null;
      }
      return null;
    }
  }
}

/** True when `next` shows what `base` showed: the same state, the same scan time and count, the same refusal words. */
const sameAsBase = (base: AnnounceInput, next: AnnounceInput): boolean =>
  base.state === next.state && sameScanTime(base.scannedAt, next.scannedAt) && base.count === next.count && base.refusalText === next.refusalText;

/** The same instant is the same scan time, however it is written (as `reportLine` reads it); text that is not a time must match as text. */
function sameScanTime(a: string | null, b: string | null): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  return !Number.isNaN(left) && !Number.isNaN(right) && left === right;
}

/**
 * The line that ends a rescan, decided against the input captured when the rescan STARTED (`base`), not against the previous
 * update, so a host that sets the report and clears `rescanning` in separate updates, in either order, gets one correct line.
 * The screen asks only when nothing but "Rescanning" was said since the start (a report line already said it, a changed state has
 * its own line) and only once the host's updates for the end have settled. Same as the start: "Rescan complete: no changes"
 * (every state). A different report that no line announced (an older scan time): the load line for what is shown.
 */
export function rescanCompletion(base: AnnounceInput | null, now: AnnounceInput | null, hooks: LabelHooks | null = null): string | null {
  if (base === null || now === null || now.rescanning) return null;
  if (sameAsBase(base, now)) return RESCAN_UNCHANGED_ANNOUNCEMENT;
  return shown(now) ? READY_ANNOUNCEMENT(now.count, now.scannedAt === null ? null : resolveActivity(now.scannedAt, now.now, hooks)) : null;
}

/** The host properties the announcement is derived from. */
interface AnnounceProps {
  status: string;
  report: DriftReportView | null;
  missionId: string;
  now: string | null;
  refusalCode: string | null;
  errorMessage: string;
  copyResult: string | null;
  labels: LabelHooks | null;
  rescanning: boolean;
}

/** What the screen shows, as the input of `nextAnnouncement`. */
export function announcementInput(props: AnnounceProps): AnnounceInput {
  const state = effectiveStatus(props.status, props.report, props.missionId);
  const showsReport = state === 'ready' || state === 'empty';
  return {
    state,
    // Only a non-empty string is a scan time: anything else must never reach the words ("last scan undefined").
    scannedAt: showsReport && props.report !== null && typeof props.report.scannedAt === 'string' && props.report.scannedAt !== '' ? props.report.scannedAt : null,
    // The clean look draws no finding, so it announces none, whatever the report holds.
    count: state === 'ready' && props.report !== null ? props.report.findings.length : 0,
    now: props.now,
    rescanning: props.rescanning,
    withheld: state === 'loading' && ['ready', 'empty'].includes(normaliseViewState(props.status)),
    refusalText: state === 'error' ? (props.errorMessage !== '' ? props.errorMessage : resolveDriftRefusal(props.refusalCode, props.labels)) : null,
    copyResult: state === 'ready' ? props.copyResult : null,
  };
}
