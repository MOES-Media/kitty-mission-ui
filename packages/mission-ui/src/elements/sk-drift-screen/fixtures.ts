// Fixtures of the Drift screen: one report builder per fixture name of the IC-01 registry, the refusal fixtures, the host name map,
// `pairReport` and the frame the stories share. Synthetic data only: no real names, paths, usernames or e-mail addresses.
// Later work packages import from here and add nothing (a gap is a change request).
import {
  refusalMissionNotFound,
  refusalScanUnreadable,
  reportClean,
  reportCorruptJson,
  reportLongSlugMission,
  reportManyLanes,
  reportMissionUnlisted,
  reportOneSidedLane,
  reportPopulated,
  reportScoped,
  reportScopedForeign,
  reportTruncated,
  reportUnknownAuthority,
  reportUnknownKind,
  reportUnknownRemedy,
  reportUnknownSeverity,
  reportUnknownSourceCode,
} from '../../contract/fixtures.generated.js';
import { makeDriftReport } from '../../contract/bulk.js';
import type { DriftFindingKey, DriftMissionName, DriftRefusal, DriftReportView } from '../../contract/types.js';
import { findingKey } from '../../logic/index.js';
import type { LabelHooks } from '../../logic/index.js';
import { shellFrame } from '../../story-support/shell-frame.js';
import type { DriftCopyResult, DriftScreenStatus } from './sk-drift-screen.js';

/** The report fixtures by export name (17, `report1000` is the 18th and is built, not generated). */
export const DRIFT_REPORT_FIXTURES = {
  reportPopulated,
  reportClean,
  reportCorruptJson,
  reportTruncated,
  reportUnknownKind,
  reportUnknownSeverity,
  reportUnknownAuthority,
  reportUnknownRemedy,
  reportUnknownSourceCode,
  reportOneSidedLane,
  reportManyLanes,
  reportLongSlugMission,
  reportMissionUnlisted,
  reportScoped,
  reportScopedForeign,
} satisfies Record<string, DriftReportView>;
export type DriftReportFixtureName = keyof typeof DRIFT_REPORT_FIXTURES;

/** The refusal fixtures by export name (2): their `code` feeds `refusalCode`. */
export const DRIFT_REFUSAL_FIXTURES = { refusalMissionNotFound, refusalScanUnreadable } satisfies Record<string, DriftRefusal>;
export type DriftRefusalFixtureName = keyof typeof DRIFT_REFUSAL_FIXTURES;

/** The scan time of the generated reports and of the bulk report (the contract examples' own instant). */
export const driftScannedAt = '2026-10-06T09:00:00Z';
/** "Now" for the stories: two minutes after the scan. */
export const driftNow = '2026-10-06T09:02:00Z';

/** The Mission the populated report names but the host does not list (DR-13). */
export const unlistedMissionId = '01JZCB3H8J9KMNPQRSTVWXYZ01';
/** The Mission whose slug cannot break (DR-25, the long-slug story). */
export const longSlugMissionId = '01JZCB3G7H8J9KMNPQRSTVWXYZ';
/** The first Mission of the populated report: the scope of the scoped stories. */
export const scopedMissionId = '01JZCB3C4D5E6F7G8H9JKMNPQT';

/** The slug that has no break opportunity: a story option for the long-slug cases. */
export const unbreakableSlug = 'aVeryLongMissionSlugWithoutAnyHyphenOrBreakOpportunityAtAllThatKeepsGoingAndGoing01M4C93T';

const NAMES: Readonly<Record<string, DriftMissionName>> = {
  '01JZCB3C4D5E6F7G8H9JKMNPQT': { missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT', slug: 'sample-slug-01', friendlyName: 'Sample mission one' },
  '01JZCB3D4E5F6G7H8J9KMNPQRS': { missionId: '01JZCB3D4E5F6G7H8J9KMNPQRS', slug: 'sample-slug-02', friendlyName: 'Sample mission two' },
  '01JZCB3E5F6G7H8J9KMNPQRSTV': { missionId: '01JZCB3E5F6G7H8J9KMNPQRSTV', slug: 'sample-mission-03', friendlyName: 'Sample mission three' },
  '01JZCB3F6G7H8J9KMNPQRSTVWX': { missionId: '01JZCB3F6G7H8J9KMNPQRSTVWX', slug: 'sample-mission-04', friendlyName: 'Sample mission four' },
  '01JZCB3G7H8J9KMNPQRSTVWXYZ': { missionId: '01JZCB3G7H8J9KMNPQRSTVWXYZ', slug: 'a-very-long-mission-slug-that-an-operator-might-really-have-chosen-01M4C93TDRIFT', friendlyName: 'A Mission with a very long name that an operator might really have chosen' },
  '01JZCB3J9KMNPQRSTVWXYZ0123': { missionId: '01JZCB3J9KMNPQRSTVWXYZ0123', slug: 'sample-mission-foreign', friendlyName: 'Sample foreign mission' },
};

export interface PairOptions {
  /** The index of the selected finding (default 0); `'none'` leaves the selection null. */
  select?: number | 'none';
  /** `listed` (default): every Mission of the report has a name, except the unlisted one; `none`: the host lists nothing (`missions` null). */
  names?: 'listed' | 'none';
  /** Replaces the slug of every listed Mission (the unbreakable-slug stories). */
  slug?: string;
  missionId?: string;
  rescanning?: boolean;
  copyResult?: DriftCopyResult | null;
  now?: string | null;
  labels?: LabelHooks | null;
}

/** The props a story or a test sets on the screen. */
export interface DriftScreenProps {
  status: DriftScreenStatus;
  report: DriftReportView | null;
  selectedFinding: DriftFindingKey | null;
  missionId: string;
  missions: Readonly<Record<string, DriftMissionName>> | null;
  rescanning: boolean;
  copyResult: DriftCopyResult | null;
  refusalCode: string | null;
  now: string | null;
  labels: LabelHooks | null;
  errorMessage: string;
}

const base: DriftScreenProps = {
  status: 'ready',
  report: null,
  selectedFinding: null,
  missionId: '',
  missions: null,
  rescanning: false,
  copyResult: null,
  refusalCode: null,
  now: driftNow,
  labels: null,
  errorMessage: '',
};

/** The name map for a report: the sample names, a generated name for any other Mission, and none for the unlisted one. */
function namesFor(report: DriftReportView, slug: string | undefined): Record<string, DriftMissionName> {
  const names: Record<string, DriftMissionName> = {};
  let n = 0;
  for (const finding of report.findings) {
    const id = finding.missionId;
    if (id === unlistedMissionId || Object.hasOwn(names, id)) continue;
    n += 1;
    const known = Object.hasOwn(NAMES, id) ? NAMES[id] : undefined;
    const entry: DriftMissionName = known ?? { missionId: id, slug: `bulk-mission-${n}`, friendlyName: `Bulk mission ${n}` };
    names[id] = slug === undefined ? entry : { ...entry, slug };
  }
  return names;
}

/**
 * A report paired with the host data that goes with it: the selected finding (index, default the first), the name map and the
 * scope. Nothing is mutated. This is the only place a report meets a name map, so no story invents a pair.
 */
export function pairReport(report: DriftReportView, options: PairOptions = {}): DriftScreenProps {
  const select = options.select ?? 0;
  const selected = select === 'none' ? undefined : report.findings[select];
  return {
    ...base,
    status: 'ready',
    report,
    selectedFinding: selected === undefined ? null : findingKey(selected),
    missionId: options.missionId ?? '',
    missions: options.names === 'none' ? null : namesFor(report, options.slug),
    rescanning: options.rescanning ?? false,
    copyResult: options.copyResult ?? null,
    now: options.now === undefined ? driftNow : options.now,
    labels: options.labels ?? null,
  };
}

/** One builder per report fixture name: the paired props with the fixture's own scope (`reportScoped` is scoped to its Mission). */
export function reportProps(name: DriftReportFixtureName, options: PairOptions = {}): DriftScreenProps {
  const scoped = name === 'reportScoped' || name === 'reportScopedForeign';
  return pairReport(DRIFT_REPORT_FIXTURES[name], { ...(scoped ? { missionId: scopedMissionId } : {}), ...options });
}

/** The 1000-finding report (`truncated` true), built on demand: it is too large for the registry. */
export function report1000(): DriftReportView {
  return makeDriftReport(1000, true);
}

/** The 1000-finding story: paired like any other report. */
export function bulkProps(options: PairOptions = {}): DriftScreenProps {
  return pairReport(report1000(), options);
}

/** A refused scan (DR-22, DR-23, DR-31): the status and the refusal's `code`. */
export function refusalProps(name: DriftRefusalFixtureName): DriftScreenProps {
  const refusal = DRIFT_REFUSAL_FIXTURES[name];
  return { ...base, status: refusal.status === 404 ? 'not-found' : 'error', refusalCode: refusal.code };
}

/** The whole-screen states that take no report (DR-20, DR-18 with `reportClean`, DR-31). */
export const stateProps = {
  loading: (): DriftScreenProps => ({ ...base, status: 'loading' }),
  empty: (): DriftScreenProps => ({ ...base, status: 'empty' }),
  clean: (): DriftScreenProps => ({ ...base, report: reportClean, now: driftNow }),
  error: (): DriftScreenProps => ({ ...base, status: 'error' }),
  unknownRefusal: (): DriftScreenProps => ({ ...base, status: 'error', refusalCode: 'a_code_the_screen_has_never_seen' }),
  notFound: (): DriftScreenProps => ({ ...base, status: 'not-found', missionId: scopedMissionId }),
};

/** The frame every story sits in: the project shell with the Drift item marked and `flush`. */
export function driftFrame(content: Parameters<typeof shellFrame>[0]): ReturnType<typeof shellFrame> {
  return shellFrame(content, { layout: 'project', current: 'nav-drift', flush: true });
}
