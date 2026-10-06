// Review vocabulary and copy of the Work Package screen (provisional until CP-1). The verdict table is the only place
// the verdict words are written; the key `approved` also names a status lane, so it appears nowhere else.
import type { components } from '../contract/types.generated.js';
import type { StateBadge } from '../logic/types.js';

/** The badge of a review verdict: the word and its tone together. A verdict not listed shows raw (FR-023). */
export const VERDICT_BADGES: Readonly<Record<string, StateBadge>> = {
  approved: { label: 'Approved', tone: 'success' },
  changes_requested: { label: 'Changes requested', tone: 'danger' },
};

/** A cycle whose verdict is null. */
export const NO_VERDICT_TEXT = 'No verdict recorded';
/** The review panel's empty form. */
export const NO_REVIEW_TEXT = 'No review outcome recorded';
/** Says none was found on the planning surface, not that none happened. */
export const NO_CYCLES_TEXT = 'No review cycle found on the primary planning surface';

export const OVERRIDE_HEADING = 'Review override';
export const OVERRIDE_PARTIAL_NOTE = 'This override is incomplete. The merge gate stays blocked.';

/** The accessible name of an "Open review" control; the number is printed as given. */
export const OPEN_REVIEW_LABEL = (cycleNumber: number): string => `Open review, cycle ${cycleNumber}`;

/** The artifact kind of a review cycle, which the contract's `ReviewCycle` does not carry; the one home of the literal. */
export const REVIEW_CYCLE_ARTIFACT_KIND: components['schemas']['ArtifactKind'] = 'review_cycle';
