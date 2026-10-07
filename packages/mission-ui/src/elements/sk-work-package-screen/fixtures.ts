// Fixtures of the Work Package screen: one prop builder per contract fixture name (`contracts/contract-pin.md`), the pairing
// table as data, `pairDetail` and the host props the stories share. Synthetic data only: no real names, paths, usernames or
// e-mail addresses. Later work packages import from here and add nothing (a gap is a change request).
import {
  wpPopulated,
  wpWithPrompt,
  wpProvisional,
  wpNoEvents,
  wpActorStructured,
  wpActorHandle,
  wpActorRedacted,
  wpCanceled,
  wpCanceledSynthetic,
  wpCanceledNullReason,
  wpOverride,
  wpOverridePartial,
  wpReviewNone,
  wpApproved,
  wpChangesRequested,
  wpDone,
  wpHistoryRich,
  wpStale,
  wpFresh,
  wpNotApplicable,
  wpStalenessOmitted,
  wpFactsNull,
  wpBlocked,
  wpReady,
  wpLong,
  wpBulkHistory,
  wpUnknownLane,
  detailPopulated,
  detailNoCycles,
  detailNullWorkspace,
  detailWorkspaceNoWorktree,
  detailPlanningLane,
  detailUnknownChangeState,
  detailUnparseableCycle,
  detailSubtasksNone,
  detailSubtaskNulls,
  detailDepsNone,
  detailDepsBlocked,
  detailDepNullLane,
  detailOwnedNone,
  detailLinksPromptNull,
  detailLinksNone,
  detailRedaction,
  detailLong,
  detailUnknownLanes,
  detailOmittedProvisional,
  detailRefusalNotFound,
  detailRefusalUnreadable,
} from '../../contract/fixtures.generated.js';
import type { ReviewCycle, WorkPackageDetailRefusal, WorkPackageDetailView, WorkPackageRecordView } from '../../contract/types.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { DetailStatus, WpScreenMission, WpScreenStatus } from './sk-work-package-screen.js';

/** The Work Package fixtures by export name (27). */
export const WORK_PACKAGE_FIXTURES = {
  wpPopulated, wpWithPrompt, wpProvisional, wpNoEvents, wpActorStructured, wpActorHandle, wpActorRedacted, wpCanceled, wpCanceledSynthetic, wpCanceledNullReason, wpOverride, wpOverridePartial, wpReviewNone, wpApproved, wpChangesRequested, wpDone, wpHistoryRich, wpStale, wpFresh, wpNotApplicable, wpStalenessOmitted, wpFactsNull, wpBlocked, wpReady, wpLong, wpBulkHistory, wpUnknownLane,
} satisfies Record<string, WorkPackageRecordView>;
export type WorkPackageFixtureName = keyof typeof WORK_PACKAGE_FIXTURES;

/** The detail fixtures by export name (19). */
export const DETAIL_FIXTURES = {
  detailPopulated, detailNoCycles, detailNullWorkspace, detailWorkspaceNoWorktree, detailPlanningLane, detailUnknownChangeState, detailUnparseableCycle, detailSubtasksNone, detailSubtaskNulls, detailDepsNone, detailDepsBlocked, detailDepNullLane, detailOwnedNone, detailLinksPromptNull, detailLinksNone, detailRedaction, detailLong, detailUnknownLanes, detailOmittedProvisional,
} satisfies Record<string, WorkPackageDetailView>;
export type DetailFixtureName = keyof typeof DETAIL_FIXTURES;

/** The refusal fixtures by export name (2): their `code` feeds `detailRefusalCode`. */
export const REFUSAL_FIXTURES = { detailRefusalNotFound, detailRefusalUnreadable } satisfies Record<string, WorkPackageDetailRefusal>;
export type RefusalFixtureName = keyof typeof REFUSAL_FIXTURES;

/** The Mission the stories show a Work Package of (host data, synthetic). */
export const sampleMission: WpScreenMission = {
  missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT',
  slug: 'sample-mission-01',
  friendlyName: 'Sample mission',
  wpTotal: 6,
};

/** The props a story or a test sets on the screen. */
export interface WpScreenProps {
  status: WpScreenStatus;
  detailStatus: DetailStatus;
  detailRefusalCode: string | null;
  workPackage: WorkPackageRecordView | null;
  detail: WorkPackageDetailView | null;
  mission: WpScreenMission | null;
  wpId: string;
}

const base: WpScreenProps = {
  status: 'ready',
  detailStatus: 'ready',
  detailRefusalCode: null,
  workPackage: null,
  detail: null,
  mission: sampleMission,
  wpId: '',
};

export type CycleOption = 'first' | 'last' | 'none';

/**
 * The detail paired with a Work Package: `wpId` rewritten to the Work Package's, and with `cycles` the review cycles
 * reduced (`first` the first cycle only, `last` the last only, `none` an empty list). Nothing is mutated. A one-cycle
 * detail gives that cycle for `first` and `last`; a detail with no `reviewCycles` property keeps none.
 */
export function pairDetail(workPackage: WorkPackageRecordView, detail: WorkPackageDetailView, options: { cycles?: CycleOption } = {}): WorkPackageDetailView {
  const paired: WorkPackageDetailView = { ...detail, wpId: workPackage.wpId };
  const cycles: ReviewCycle[] | undefined = detail.reviewCycles;
  if (options.cycles === undefined || cycles === undefined) return paired;
  const kept: ReviewCycle[] =
    options.cycles === 'none' ? [] : options.cycles === 'first' ? cycles.slice(0, 1) : cycles.slice(-1);
  return { ...paired, reviewCycles: kept.map((cycle) => ({ ...cycle })) };
}

/** A Work-Package-only story: the bare lists, no detail (`detail` null). */
export function workPackageProps(name: WorkPackageFixtureName): WpScreenProps {
  const workPackage = WORK_PACKAGE_FIXTURES[name];
  return { ...base, workPackage, wpId: workPackage.wpId };
}

/** The pairing table: story row id to the Work Package, the detail and the cycles option (`contracts/contract-pin.md`, "Pairing"). */
export const PAIRINGS = {
  'WP-01': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-02': { workPackage: 'wpReviewNone', detail: 'detailNoCycles' },
  'WP-03': { workPackage: 'wpApproved', detail: 'detailPopulated', cycles: 'last' },
  'WP-04': { workPackage: 'wpChangesRequested', detail: 'detailPopulated', cycles: 'first' },
  'WP-10': { workPackage: 'wpNoEvents', detail: 'detailSubtasksNone', cycles: 'none' },
  'WP-11': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-12': { workPackage: 'wpPopulated', detail: 'detailSubtaskNulls', cycles: 'none' },
  'WP-13': { workPackage: 'wpBlocked', detail: 'detailDepsBlocked', cycles: 'none' },
  'WP-14': { workPackage: 'wpReady', detail: 'detailPopulated', cycles: 'none' },
  'WP-15': { workPackage: 'wpPopulated', detail: 'detailDepsNone', cycles: 'none' },
  'WP-16': { workPackage: 'wpPopulated', detail: 'detailDepNullLane', cycles: 'none' },
  'WP-25': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-26': { workPackage: 'wpPopulated', detail: 'detailUnknownChangeState', cycles: 'none' },
  'WP-27': { workPackage: 'wpPopulated', detail: 'detailOwnedNone', cycles: 'none' },
  'WP-28': { workPackage: 'wpApproved', detail: 'detailPopulated' },
  'WP-29': { workPackage: 'wpApproved', detail: 'detailNoCycles' },
  'WP-30': { workPackage: 'wpPopulated', detail: 'detailUnparseableCycle' },
  'WP-31': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-32': { workPackage: 'wpPopulated', detail: 'detailWorkspaceNoWorktree', cycles: 'none' },
  'WP-33a': { workPackage: 'wpPopulated', detail: 'detailPlanningLane', cycles: 'none' },
  'WP-33b': { workPackage: 'wpPopulated', detail: 'detailNullWorkspace', cycles: 'none' },
  'WP-34': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-35a': { workPackage: 'wpPopulated', detail: 'detailLinksPromptNull', cycles: 'none' },
  'WP-35b': { workPackage: 'wpPopulated', detail: 'detailUnparseableCycle' },
  'WP-35c': { workPackage: 'wpPopulated', detail: 'detailLinksNone', cycles: 'none' },
  'WP-44': { workPackage: 'wpLong', detail: 'detailLong', cycles: 'none' },
  'WP-45': { workPackage: 'wpUnknownLane', detail: 'detailUnknownLanes', cycles: 'none' },
  'WP-46': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-47': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-48': { workPackage: 'wpPopulated', detail: 'detailPopulated', cycles: 'none' },
  'WP-49': { workPackage: 'wpApproved', detail: 'detailPopulated' },
  'WP-50': { workPackage: 'wpPopulated', detail: 'detailRedaction', cycles: 'none' },
} as const satisfies Record<string, { workPackage: WorkPackageFixtureName; detail: DetailFixtureName; cycles?: CycleOption }>;
export type PairingId = keyof typeof PAIRINGS;

/** The props of a paired story: the pairing table is the only source of a pair, so no builder invents one. */
export function pairingProps(id: PairingId): WpScreenProps {
  const row: { workPackage: WorkPackageFixtureName; detail: DetailFixtureName; cycles?: CycleOption } = PAIRINGS[id];
  const workPackage = WORK_PACKAGE_FIXTURES[row.workPackage];
  const detail = pairDetail(workPackage, DETAIL_FIXTURES[row.detail], row.cycles === undefined ? {} : { cycles: row.cycles });
  return { ...base, workPackage, detail, wpId: workPackage.wpId };
}

/** A refused detail (WP-36a, WP-36b): `wpPopulated` with its bare lists, the notice's status and the refusal's `code`. */
export function refusalProps(name: RefusalFixtureName): WpScreenProps {
  const workPackage = WORK_PACKAGE_FIXTURES.wpPopulated;
  const refusal = REFUSAL_FIXTURES[name];
  return {
    ...base,
    detailStatus: refusal.status === 404 ? 'not-found' : 'error',
    detailRefusalCode: refusal.code,
    workPackage,
    wpId: workPackage.wpId,
  };
}

/** A detail that is still loading (WP-37): `wpPopulated`, the busy indicator in place of the detail-only regions. */
export function detailLoadingProps(): WpScreenProps {
  const workPackage = WORK_PACKAGE_FIXTURES.wpPopulated;
  return { ...base, detailStatus: 'loading', workPackage, wpId: workPackage.wpId };
}

/** The whole-screen states that take no fixture (WP-39 to WP-43). */
export const stateProps = {
  loading: (): WpScreenProps => ({ ...base, status: 'loading', wpId: 'WP04' }),
  empty: (): WpScreenProps => ({ ...base, status: 'empty' }),
  error: (): WpScreenProps => ({ ...base, status: 'error' }),
  notFound: (): WpScreenProps => ({ ...base, status: 'not-found', wpId: 'WP09' }),
  nothingSelected: (): WpScreenProps => ({ ...base, status: 'nothing-selected' }),
};

/** The frame every story sits in: the mission shell with the Work Packages item marked and `flush`. */
export function workPackageFrame(content: Parameters<typeof shellFrame>[0]): ReturnType<typeof shellFrame> {
  return shellFrame(content, { layout: 'mission', current: 'nav-work-packages', flush: true });
}
