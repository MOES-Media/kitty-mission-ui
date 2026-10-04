// Mission lifecycle: filters, badges and the Missions screen copy (provisional until CP-1, DR-5).
import type { MissionOverviewView } from '../contract/types.js';
import type { FilterDefinition, StateBadge } from '../logic/types.js';

export const FILTERS: readonly FilterDefinition[] = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'active', label: 'Active', matches: (m: MissionOverviewView) => m.lifecycleStatus === 'active' },
  { id: 'planned', label: 'Planned', matches: (m: MissionOverviewView) => m.lifecycleStatus === 'planned' },
  { id: 'done', label: 'Done', matches: (m: MissionOverviewView) => m.lifecycleStatus === 'done' },
  // A draft appears only under All, even when it is stale (operator ruling on the PR #6 landing, C-06).
  { id: 'stale', label: 'Stale', matches: (m: MissionOverviewView) => m.stale === true && m.lifecycleStatus !== 'draft' },
  { id: 'discarded', label: 'Discarded', matches: (m: MissionOverviewView) => m.lifecycleStatus === 'discarded' },
];

export const DEFAULT_FILTER: FilterDefinition = FILTERS[0] as FilterDefinition;
export const DEFAULT_FILTER_ID = 'all';

export const LIFECYCLE_BADGES: Readonly<Record<string, StateBadge>> = {
  active: { label: 'active', tone: 'success' },
  planned: { label: 'planned', tone: 'neutral' },
  done: { label: 'done', tone: 'success' },
  draft: { label: 'draft', tone: 'neutral' },
  discarded: { label: 'Discarded', tone: 'danger' },
};

export const STALE_BADGE: StateBadge = { label: 'stale', tone: 'info' };
export const NO_ACTIVITY_TEXT = 'no activity';

export const JUST_NOW_TEXT = 'just now';
export const YESTERDAY_TEXT = 'yesterday';
export type TimeUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
/** "<n> <unit>(s) ago". */
export const agoText = (count: number, unit: TimeUnit): string => `${count} ${unit}${count === 1 ? '' : 's'} ago`;

/** The result-count live region (FR-034): a count of rows shown, singular and plural. */
export const resultCountText = (count: number): string => (count === 1 ? '1 Mission shown' : `${count} Missions shown`);

export const FILTER_GROUP_LABEL = 'Mission status filter';
export const SEARCH_LABEL = 'Search Missions';
export const LOAD_MORE_TEXT = 'Load more Missions';
export const NO_MATCH_HEADING = 'No Missions match';
export const NO_MATCH_BODY = 'Try another status or clear the search text.';
export const EMPTY_HEADING = 'No Missions in this project';
export const EMPTY_BODY = 'The project contains no committed Mission records. Search and status filters are not shown because there is nothing to filter.';
export const LOADING_LABEL = 'Reading local Mission index';
export const LOADING_BODY = 'Mission records are being read from the project.';
export const ERROR_HEADING = 'Mission index unavailable';
export const ERROR_BODY = 'The Mission index could not be read. No Missions are shown.';
