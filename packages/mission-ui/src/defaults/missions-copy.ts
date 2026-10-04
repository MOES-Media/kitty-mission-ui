// Missions screen copy that is not vocabulary (provisional until CP-1), the counterpart of pipeline-copy.ts.
import { SUMMARY_SEPARATOR } from './lanes.js';
import { SEARCH_LABEL } from './lifecycle.js';
import { MISSIONS_CRUMB } from './pipeline-copy.js';

export const HEADER_EYEBROW = 'Project';
/** The page title and the Pipeline's breadcrumb to it are the same word. */
export const HEADER_TITLE = MISSIONS_CRUMB;
/** Separator of the header's supporting line: the same middle dot as the lane summary. */
export const HEADER_SEPARATOR = SUMMARY_SEPARATOR;
export const SEARCH_PLACEHOLDER = `${SEARCH_LABEL}…`;

/** "<n> Mission(s)" for the header; the count is the contract's `missionCount`, equality only. */
export const missionCountText = (count: number): string => (count === 1 ? '1 Mission' : `${count} Missions`);
