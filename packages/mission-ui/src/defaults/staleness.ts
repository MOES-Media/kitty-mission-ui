// Staleness vocabulary and copy (provisional until CP-1). The "stale" badge is the Mission screens' STALE_BADGE
// (defaults/lifecycle.ts), imported where needed and not declared again.
import type { StalenessRole } from '../logic/wp-staleness.js';

/** How each staleness status is shown: a badge, a quiet Facts row, or nothing visible. A status not listed is a row. */
export const STALENESS_STATUS_ROLE: Readonly<Record<string, StalenessRole>> = {
  fresh: 'row',
  stale: 'badge',
  not_applicable: 'none',
};

export const STALENESS_REASON_WORDS: Readonly<Record<string, string>> = {
  planning_artifact_repo_root_shared_workspace: 'shares the repository root, no worktree to measure',
  live_claim_process: 'the claiming process is alive',
};

/** The minutes are printed as given. */
export const STALENESS_MINUTES_TEXT = (minutes: number): string => `${minutes} min since last commit`;
export const FRESH_TEXT = 'recent work';

// An own-key read, written here so that this vocabulary module imports nothing from logic/.
const reasonWords = (reason: string): string => (Object.hasOwn(STALENESS_REASON_WORDS, reason) ? (STALENESS_REASON_WORDS[reason] as string) : reason);

/** The visually hidden text of a not-applicable status; a null reason drops the clause, a foreign reason shows raw. */
export const STALENESS_NOT_APPLICABLE_TEXT = (reason: string | null): string =>
  reason === null ? 'Staleness: not applicable' : `Staleness: not applicable, ${reasonWords(reason)}`;
