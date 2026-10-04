import type { MissionOverviewView } from '../contract/types.js';
import { BLOCKED_ROW_BADGE, LIFECYCLE_BADGES } from '../defaults/index.js';
import { lookup } from './lookup.js';
import { laneSummary } from './summary.js';
import { resolveActivity } from './time.js';
import type { LabelHooks, LaneGroup, RowView } from './types.js';

/** One Mission row with all text already resolved. */
export function buildRowView(mission: MissionOverviewView, groups: readonly LaneGroup[], hooks: LabelHooks | null, now: string | null): RowView {
  return {
    missionId: mission.missionId,
    slug: mission.slug,
    name: mission.friendlyName,
    type: mission.missionType === null || mission.missionType.trim() === '' ? null : mission.missionType,
    topology: mission.topology,
    blockedBadge: mission.blockedCount > 0 ? BLOCKED_ROW_BADGE(mission.blockedCount) : null,
    stale: mission.stale === true,
    lifecycle: lookup(LIFECYCLE_BADGES, mission.lifecycleStatus) ?? { label: mission.lifecycleStatus, tone: 'neutral' },
    summary: laneSummary(mission.statusLaneCounts, groups, hooks),
    activity: resolveActivity(mission.lastActivityAt, now, hooks),
  };
}
