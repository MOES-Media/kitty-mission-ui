// Owned-file vocabulary and copy (provisional until CP-1).
import type { StateBadge } from '../logic/types.js';

/** The committed-change state of an owned file: word and tone together. A state not listed shows raw. */
export const CHANGE_STATE_BADGES: Readonly<Record<string, StateBadge>> = {
  changed: { label: 'changed', tone: 'info' },
  unchanged: { label: 'unchanged', tone: 'neutral' },
  unknown: { label: 'unknown', tone: 'neutral' },
};

/** The table key the all-unknown check reads, so the logic never writes the literal. */
export const UNKNOWN_CHANGE_STATE = 'unknown';

export const GLOB_MARKER = 'set of files';
export const CHANGE_STATE_UNAVAILABLE_NOTE = 'Change state unavailable on this host';
export const NO_FILES_TEXT = 'No owned files declared';
