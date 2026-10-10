// Hand-written aliases over the generated contract types (types.generated.ts) and the widened view types.
// The view types only ever widen: a contract object is assignable to its view type without a cast (research D-05).
import type { components } from './types.generated.js';

type Schemas = components['schemas'];

export type Project = Schemas['Project'];

/** A project whose provisional `health` is an open string: a value outside the enum must survive (mission-ui#9). */
export type ProjectView = Omit<Project, 'health'> & { health: string };
export type MissionHead = Schemas['MissionHead'];
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

// The Work Package detail screen reads these contract types (1.1); the aliases only name them.
export type WorkPackage = Schemas['WorkPackage'];
export type WorkPackageDetail = Schemas['WorkPackageDetail'];
export type WorkPackageDetailRefusal = Schemas['WorkPackageDetailRefusal'];
export type WorkPackageDetailRefusalCode = Schemas['WorkPackageDetailRefusalCode'];
export type Subtask = Schemas['Subtask'];
export type DependencyRef = Schemas['DependencyRef'];
export type ReviewCycle = Schemas['ReviewCycle'];
export type Workspace = Schemas['Workspace'];
export type OwnedFile = Schemas['OwnedFile'];
export type ChangeState = Schemas['ChangeState'];
export type ReviewVerdict = Schemas['ReviewVerdict'];
export type Review = Schemas['Review'];
export type ReviewResult = Schemas['ReviewResult'];
export type ReviewOverride = Schemas['ReviewOverride'];
export type Staleness = Schemas['Staleness'];
export type Cancellation = Schemas['Cancellation'];
export type HistoryEntry = Schemas['HistoryEntry'];
export type Actor = Schemas['Actor'];
export type Assignment = Schemas['Assignment'];
export type Authored = Schemas['Authored'];
export type Readiness = Schemas['Readiness'];
export type ArtifactReference = Schemas['ArtifactReference'];
export type ArtifactReferences = Schemas['ArtifactReferences'];

// The Artifact Viewer screen reads these contract types (1.1); the aliases only name them.
export type ArtifactListing = Schemas['ArtifactListing'];
export type ArtifactEntry = Schemas['ArtifactEntry'];
export type ArtifactContent = Schemas['ArtifactContent'];
export type ArtifactKind = Schemas['ArtifactKind'];
export type ArtifactRefusal = Schemas['ArtifactRefusal'];
export type ArtifactRefusalCode = Schemas['ArtifactRefusalCode'];

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

// ---- The Work Package detail screen's widened types. Each is a SUPERTYPE of its contract type, so a generated fixture
// is accepted as the view type without a cast. A lane word the screen has never seen must survive (the contract enum
// is closed); `staleness`, `reviewCycles` and `workspace` are provisional and a host may omit the property.

/** A history entry whose lanes are open strings. */
export type HistoryEntryView = Omit<HistoryEntry, 'fromStatusLane' | 'toStatusLane'> & {
  fromStatusLane: string | null;
  toStatusLane: string;
};

/** The full Work Package with an open lane, an open subtask map and an omittable provisional `staleness`. */
export type WorkPackageRecordView = Omit<WorkPackage, 'statusLane' | 'subtasks' | 'history' | 'staleness'> & {
  statusLane: string | null;
  subtasks: Record<string, string>;
  history: HistoryEntryView[];
  staleness?: Staleness | null;
};

/** A subtask of the detail with an open lane. */
export type SubtaskView = Omit<Subtask, 'statusLane'> & { statusLane: string | null };

/** A dependency of the detail with an open lane. */
export type DependencyRefView = Omit<DependencyRef, 'statusLane'> & { statusLane: string | null };

/** The Work Package detail with open lanes and omittable provisional parts. */
export type WorkPackageDetailView = Omit<WorkPackageDetail, 'subtasks' | 'dependencies' | 'reviewCycles' | 'workspace'> & {
  subtasks: SubtaskView[];
  dependencies: DependencyRefView[];
  reviewCycles?: ReviewCycle[];
  workspace?: Workspace;
};

// ---- The Artifact Viewer's widened types. Each is a SUPERTYPE of its contract type, so a generated fixture is accepted
// as the view type without a cast. The kind vocabulary and the refusal codes are provisional upstream: a kind or a code
// the screen has never seen must survive (the contract enums are closed).

/** A listing entry whose kind is an open string. */
export type ArtifactEntryView = Omit<ArtifactEntry, 'kind'> & { kind: string };

/** A listing whose entries carry open kinds. */
export type ArtifactListingView = Omit<ArtifactListing, 'entries'> & { entries: ArtifactEntryView[] };

/** The content of one artifact with an open kind. */
export type ArtifactContentView = Omit<ArtifactContent, 'kind'> & { kind: string };

/** A refusal whose code is an open string (the `satisfies` target of the unknown-code fixture). */
export type ArtifactRefusalView = Omit<ArtifactRefusal, 'code'> & { code: string };
