// Compile-time assertions for the Drift view types (`pnpm typecheck` is the test; the cases run as no-ops). A contract value is
// assignable to its view type without a cast, and the view type accepts a vocabulary word the closed enum lacks. They live here and
// not in `src/`, so nothing the package ships holds a type check (pre-merge squad BOUNDARY-012).
import { describe, expectTypeOf, it } from 'vitest';
import type { DriftFinding, DriftFindingKey, DriftFindingView, DriftMissionName, DriftReport, DriftReportView, MissionHead } from '../src/contract/types.js';

describe('the Drift view types', () => {
  it('a contract finding and a contract report are views without a cast', () => {
    expectTypeOf<DriftFinding>().toExtend<DriftFindingView>();
    expectTypeOf<DriftReport>().toExtend<DriftReportView>();
  });

  it('every vocabulary field is an open string; remedy and the two lane words stay nullable', () => {
    expectTypeOf<DriftFindingView['kind']>().toEqualTypeOf<string>();
    expectTypeOf<DriftFindingView['severity']>().toEqualTypeOf<string>();
    expectTypeOf<DriftFindingView['authority']>().toEqualTypeOf<string>();
    expectTypeOf<DriftFindingView['derivedSide']>().toEqualTypeOf<string>();
    expectTypeOf<DriftFindingView['remedy']>().toEqualTypeOf<string | null>();
    expectTypeOf<DriftFindingView['sourceCode']>().toEqualTypeOf<string | null>();
    expectTypeOf<DriftFindingView['laneComparison'][number]['persistedStatusLane']>().toEqualTypeOf<string | null>();
    expectTypeOf<DriftFindingView['laneComparison'][number]['derivedStatusLane']>().toEqualTypeOf<string | null>();
    // the view accepts words the closed enum lacks
    expectTypeOf<{ kind: 'a_kind_not_in_the_enum' }['kind']>().toExtend<DriftFindingView['kind']>();
    expectTypeOf<DriftFinding['kind']>().not.toEqualTypeOf<string>();
  });

  it('nothing else is widened: the identity fields keep their contract types', () => {
    expectTypeOf<Pick<DriftFinding, 'missionId' | 'kind' | 'artifactPath'>>().toExtend<DriftFindingKey>();
    expectTypeOf<DriftFindingKey['missionId']>().toEqualTypeOf<DriftFinding['missionId']>();
    expectTypeOf<DriftReportView['scannedAt']>().toEqualTypeOf<DriftReport['scannedAt']>();
    expectTypeOf<DriftReportView['truncated']>().toEqualTypeOf<boolean>();
    expectTypeOf<DriftFindingView['missionId']>().toEqualTypeOf<DriftFinding['missionId']>();
    expectTypeOf<Pick<MissionHead, 'missionId' | 'slug' | 'friendlyName'>>().toExtend<DriftMissionName>();
    // a number is not a date-time string, 'yes' is not a boolean, a number is not a Mission id
    expectTypeOf<{ scannedAt: number; findings: DriftFindingView[]; truncated: boolean }>().not.toExtend<DriftReportView>();
    expectTypeOf<{ scannedAt: string; findings: DriftFindingView[]; truncated: 'yes' }>().not.toExtend<DriftReportView>();
    expectTypeOf<{ missionId: number }>().not.toExtend<Pick<DriftFindingView, 'missionId'>>();
  });
});
