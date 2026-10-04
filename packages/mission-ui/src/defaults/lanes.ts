// Status lanes: board columns, summary words and card badges. The only place a lane value may be written.
import type { LaneGroup, StateBadge } from '../logic/types.js';

/** Five groups, in the operator's order (spec Clarifications 1). */
export const DEFAULT_LANE_GROUPS: readonly LaneGroup[] = [
  { id: 'planned', label: 'Planned', lanes: ['planned', 'blocked'] },
  { id: 'in-progress', label: 'In progress', lanes: ['claimed', 'in_progress'], showsProgress: true },
  { id: 'review', label: 'Review', lanes: ['for_review', 'in_review'] },
  { id: 'approved', label: 'Approved', lanes: ['approved'] },
  { id: 'done', label: 'Done', lanes: ['done', 'canceled'] },
];

/** The words of the row's lane summary, lowercase. */
export const LANE_LABELS: Readonly<Record<string, string>> = {
  planned: 'planned',
  claimed: 'claimed',
  in_progress: 'in progress',
  for_review: 'for review',
  in_review: 'in review',
  approved: 'approved',
  done: 'done',
  blocked: 'blocked',
  canceled: 'canceled',
};

/** The badge of a board card by lane (prototype words kept for the three it shows; DR-2). */
export const STATE_BADGES: Readonly<Record<string, StateBadge>> = {
  planned: { label: 'queued', tone: 'neutral' },
  claimed: { label: 'claimed', tone: 'info' },
  in_progress: { label: 'coding', tone: 'info' },
  for_review: { label: 'review', tone: 'recovery' },
  in_review: { label: 'reviewing', tone: 'recovery' },
  approved: { label: 'approved', tone: 'success' },
  done: { label: 'done', tone: 'success' },
  blocked: { label: 'blocked', tone: 'danger' },
  canceled: { label: 'canceled', tone: 'neutral' },
};

/** A work package with no status lane yet. */
export const NOT_STARTED_BADGE: StateBadge = { label: 'not started', tone: 'neutral' };

/** The row badge for a Mission with blocked work packages; the count is `blockedCount` as given. */
export const BLOCKED_ROW_BADGE = (count: number): StateBadge => ({ label: `${count} blocked`, tone: 'danger' });

/** Separator of the lane summary segments (a middle dot with a space either side). */
export const SUMMARY_SEPARATOR = ' · ';

/** The accessible text of a card's subtask bar; the numbers are handed over as given (it holds the word `done`, which the data-driven gate keeps in this directory). */
export const SUBTASK_PROGRESS_TEXT = (done: number, total: number): string => `Subtask progress, ${done} of ${total} done`;

/** The spoken count of a board column: the number of cards it holds, handed over as rendered. */
export const LANE_COUNT_TEXT = (count: number): string => `${count} work packages`;
