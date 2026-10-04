// Fixtures of the Pipeline screen stories: the contract-derived documents (src/contract/fixtures.generated.ts), typed as the
// screen's `mission` property. Synthetic data only: no real names, paths, usernames or e-mail addresses.
import {
  detailAllComplete,
  detailAllPending,
  detailBadges,
  detailBlockers,
  detailBothInProgress,
  detailCustomGroups,
  detailImplement,
  detailLongNames,
  detailPhases3,
  detailPhases7,
  detailSubtasks,
  detailUnknownLane,
} from '../../contract/fixtures.generated.js';
import type { MissionDetailView } from '../../contract/types.js';
import type { LaneGroup } from '../../logic/types.js';
import type { ShellMission } from '../../shell-types.js';

/** PL-01: planned, claimed, in_progress, for_review and canceled work packages; implement and review in progress (DR-12). */
export const implementInProgress: MissionDetailView = detailImplement;
/** PL-02: a Mission with no work packages; every phase pending. */
export const allPending: MissionDetailView = detailAllPending;
/** PL-03: every work package done or canceled; the next action is the host's own text, shown verbatim. */
export const allComplete: MissionDetailView = detailAllComplete;
/** PL-04: one blocked work package. */
export const blockers: MissionDetailView = detailBlockers;
/** PL-07: three phases whose names the screen has never seen. */
export const threePhases: MissionDetailView = detailPhases3;
/** PL-07: seven phases whose names the screen has never seen. */
export const sevenPhases: MissionDetailView = detailPhases7;
/** PL-09: blocked, in review, canceled and not-started cards, one with an actor. */
export const badgesBoard: MissionDetailView = detailBadges;
/** PL-11: one work package in each of the nine lanes. */
export const subtaskProgress: MissionDetailView = detailSubtasks;
/** Two phases in progress at once, no next action: the current step names the first in array order. */
export const twoPhasesInProgress: MissionDetailView = detailBothInProgress;
/** An unknown lane and a null lane among the work packages. */
export const nullAndUnknownLane: MissionDetailView = detailUnknownLane;
/** The implement fixture shown with three custom columns. */
export const customGroupsMission: MissionDetailView = detailCustomGroups;
/** Long names everywhere. */
export const longNames: MissionDetailView = detailLongNames;

/** Three custom columns covering the lanes of `detailCustomGroups`. */
export const customLaneGroups: LaneGroup[] = [
  { id: 'intake', label: 'Intake', lanes: ['planned'] },
  { id: 'build', label: 'Build', lanes: ['claimed', 'in_progress'], showsProgress: true },
  { id: 'shipped', label: 'Shipped', lanes: ['for_review', 'canceled'] },
];

/**
 * The shell's `ShellMission` for a Mission, as the host builds it (D-28): the footer percentage is the contract's
 * `weightedPercentage` as given, so the shell footer and the inspector show the same figure.
 */
export function shellMissionOf(mission: MissionDetailView): ShellMission {
  return {
    title: mission.friendlyName,
    id: mission.slug,
    tags: [{ label: mission.lifecycleStatus, tone: 'neutral' }],
    backItem: { id: 'back-missions', label: 'All Missions', href: '#/missions', icon: 'back' },
    progress: { done: mission.progress.doneCount, total: mission.wpTotal, percentage: mission.progress.weightedPercentage },
  };
}
