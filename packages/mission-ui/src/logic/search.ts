import type { MissionOverviewView } from '../contract/types.js';
import { DEFAULT_FILTER, FILTERS } from '../defaults/index.js';

/**
 * The match rule: the status filter AND the query. The query is trimmed plain text, case-insensitive, a substring of the
 * name, slug, type or topology (no regular expression). An unknown filter id behaves as All.
 */
export function matchesMission(mission: MissionOverviewView, filterId: string, query: string): boolean {
  const filter = FILTERS.find((f) => f.id === filterId) ?? DEFAULT_FILTER;
  if (!filter.matches(mission)) return false;
  const needle = query.trim().toLowerCase();
  if (needle === '') return true;
  return [mission.friendlyName, mission.slug, mission.missionType ?? '', mission.topology].some((field) => field.toLowerCase().includes(needle));
}
