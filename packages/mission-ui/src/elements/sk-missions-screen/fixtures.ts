// Synthetic data for the Missions screen stories and tests: composed from the contract fixtures (no real project, path or
// person). The page fixtures are the contract's examples plus the host `stale` flag where a state needs it.
import { makeMissionPage } from '../../contract/bulk.js';
import {
  pageExhausted,
  pageFirst,
  pageFull,
  pageLong,
  pageLongNames,
  pageMixed,
  project as contractProject,
} from '../../contract/fixtures.generated.js';
import type { MissionOverviewView, PageInfo, Project } from '../../contract/types.js';

/** The host clock for relative times: after every activity instant of the example pages (the long list is the newest). */
export const NOW = '2026-09-30T14:00:00Z';

/** The branch the host passes for the header. */
export const BRANCH = 'main';

/** The Missions screen's project: the contract example, three Missions. */
export const project: Project = contractProject;

/** A project whose count matches the long list and the one-Mission cases. */
export const projectOf = (missionCount: number): Project => ({ ...contractProject, missionCount });

/** A last page: no next page, no cursor. */
export const lastPageInfo = (pageSize: number): PageInfo => ({ hasNextPage: false, nextPageCursor: null, pageSize });

/** MS-01: the mixed page without draft and discarded Missions, on its last page (the prototype has no Load more row). */
export const mixedMissions: MissionOverviewView[] = pageMixed.items;
export const mixedPageInfo: PageInfo = lastPageInfo(mixedMissions.length);

/** MS-02, MS-02a: the full page with a draft and a discarded Mission, on its last page. */
export const fullMissions: MissionOverviewView[] = pageFull.items;
export const fullPageInfo: PageInfo = lastPageInfo(fullMissions.length);

/** A page with more to load: the contract's first-page example. */
export const firstMissions: MissionOverviewView[] = pageFirst.items;
export const firstPageInfo: PageInfo = pageFirst.pageInfo;

/** The full page with more pages behind it (MS-03 with a next page, MS-07). */
export const fullMoreInfo: PageInfo = pageFull.pageInfo;

/** MS-07 long list: forty Missions with a next page. */
export const longMissions: MissionOverviewView[] = pageLong.items;
export const longPageInfo: PageInfo = pageLong.pageInfo;

/** The long-names page (one Mission with unbreakable name and slug). */
export const longNameMissions: MissionOverviewView[] = pageLongNames.items;
export const longNamePageInfo: PageInfo = pageLongNames.pageInfo;

/** An exhausted page: no items, no next page. */
export const exhaustedMissions: MissionOverviewView[] = pageExhausted.items;

/** Five hundred Missions for NFR-006. `hasNextPage` true so the Load more row is present too. */
export const bulkMissions = (count: number): MissionOverviewView[] => makeMissionPage(count, true).items;

/** Two Missions with the same display name, told apart by slug and id (EV-1). */
export const duplicateNames: MissionOverviewView[] = [
  { ...(pageMixed.items[0] as MissionOverviewView), friendlyName: 'Shared name' },
  { ...(pageMixed.items[5] as MissionOverviewView), friendlyName: 'Shared name' },
];

/** The error copy a host may pass (host-neutral, no path). */
export const hostErrorMessage = 'The Mission index could not be read from the project.';
