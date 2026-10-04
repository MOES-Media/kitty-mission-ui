// Hand-written aliases over the generated contract types (types.generated.ts) and the widened view types.
// The view types only ever widen: a contract object is assignable to its view type without a cast (research D-05).
import type { components } from './types.generated.js';

type Schemas = components['schemas'];

export type Project = Schemas['Project'];
export type MissionOverview = Schemas['MissionOverview'];
export type MissionOverviewPage = Schemas['MissionOverviewPage'];
export type PageInfo = Schemas['PageInfo'];
export type MissionDetail = Schemas['MissionDetail'];
export type MissionPhase = Schemas['MissionPhase'];
export type MissionProgress = Schemas['MissionProgress'];
export type WorkPackageSummary = Schemas['WorkPackageSummary'];
export type SubtaskProgress = Schemas['SubtaskProgress'];
export type LifecycleStatus = Schemas['LifecycleStatus'];
export type Topology = Schemas['Topology'];
export type StatusLane = Schemas['StatusLane'];
export type StatusLaneCounts = Schemas['StatusLaneCounts'];

/** A phase whose name the screen has never seen (FR-014). */
export type PhaseView = Omit<MissionPhase, 'name'> & { name: string };

/** A work package with an open lane value and the host-supplied actor. */
export type WorkPackageView = Omit<WorkPackageSummary, 'statusLane'> & { statusLane: string | null; actor?: string };

/** The Pipeline screen's `mission` property. */
export type MissionDetailView = Omit<MissionDetail, 'phases' | 'workPackages'> & {
  phases: PhaseView[];
  workPackages: WorkPackageView[];
};

/** A Mission overview with the host-supplied `stale` flag; absent means not stale. */
export type MissionOverviewView = MissionOverview & { stale?: boolean };

/**
 * The `satisfies` target of the host-kind page fixtures. A fixture concern only: `satisfies` rejects the excess
 * `stale` property against MissionOverviewPage (TS2353). No element type uses it.
 */
export type MissionOverviewPageView = Omit<MissionOverviewPage, 'items'> & { items: MissionOverviewView[] };
