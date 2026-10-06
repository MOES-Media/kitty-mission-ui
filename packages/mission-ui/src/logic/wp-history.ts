import type { HistoryEntryView } from '../contract/types.js';
import { joinHandles } from './wp-actor.js';
import { resolveLaneLabel } from './labels.js';
import { resolveActivity } from './time.js';
import { resolveVerdict } from './wp-review.js';
import type { LabelHooks, StateBadge } from './types.js';

/** One lane transition, all text resolved. */
export interface HistoryItem {
  eventId: string;
  /** The lane the Work Package left, in words; null for a first transition. */
  fromLabel: string | null;
  toLabel: string;
  /** The time hook, else relative to `now`, else the ISO text as given. */
  timeText: string;
  actor: string | null;
  forced: boolean;
  reason: string | null;
  verdict: StateBadge | null;
  /** True for the LAST entry of the array, by position and not by value. */
  current: boolean;
}

/** Array order, no sorting, no filtering. */
export function historyView(history: HistoryEntryView[], hooks: LabelHooks | null, now: string | null): HistoryItem[] {
  const last = history.length - 1;
  return history.map((e, i) => ({
    eventId: e.eventId,
    fromLabel: e.fromStatusLane === null ? null : resolveLaneLabel(e.fromStatusLane, hooks),
    toLabel: resolveLaneLabel(e.toStatusLane, hooks),
    timeText: resolveActivity(e.at, now, hooks),
    actor: joinHandles(e.actor),
    forced: e.force,
    reason: e.reason,
    verdict: e.reviewVerdict === null ? null : resolveVerdict(e.reviewVerdict),
    current: i === last,
  }));
}
