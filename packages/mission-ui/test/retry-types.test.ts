// Type-level assertions for the neutral `sk-retry-load` payload: this file compiles only with the union of `src/retry-types.ts`
// (the event map entry is the union of every screen's payloads), so reverting the union fails `pnpm typecheck`.
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  DetailRetryDetail,
  DriftRetryDetail,
  FoldersRetryDetail,
  OpsPageRetryDetail,
  ProjectRetryDetail,
  ProjectsRetryDetail,
  RetryLoadDetail,
  RetryLoadEventDetail,
  SkArtifactRetryDetail,
  WorkPackageRetryDetail,
} from '../src/retry-types.js';
import type { RetryLoadDetail as ReExported } from '../src/logic/wp-retry.js';
import type { SkRetryLoadDetail } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import type { SkDriftRetryLoadDetail } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import type { SkOpsRetryLoadDetail } from '../src/elements/sk-ops-screen/sk-ops-screen.js';

describe('retry-types', () => {
  it('the event map entry is the union of every screen payload', () => {
    expectTypeOf<HTMLElementEventMap['sk-retry-load']>().toEqualTypeOf<CustomEvent<RetryLoadEventDetail>>();
    expectTypeOf<RetryLoadEventDetail>().toEqualTypeOf<
      WorkPackageRetryDetail | DetailRetryDetail | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail | SkArtifactRetryDetail | DriftRetryDetail | OpsPageRetryDetail
    >();
    expectTypeOf<RetryLoadEventDetail['target']>().toEqualTypeOf<'work-package' | 'detail' | 'project' | 'projects' | 'folders' | 'content' | 'listing' | 'drift-report' | 'ops-page'>();
    const content: SkArtifactRetryDetail = { missionId: 'm', target: 'content', path: 'spec.md' };
    const listing: SkArtifactRetryDetail = { missionId: 'm', target: 'listing' };
    // @ts-expect-error a content retry names its path, a listing retry has none
    const bad: SkArtifactRetryDetail = { missionId: 'm', target: 'listing', path: 'spec.md' };
    expect([content.target, listing.target, bad.target]).toEqual(['content', 'listing', 'listing']);
  });

  it('joins the Drift member to the event union only, as the Artifact Viewer member is', () => {
    expectTypeOf<SkDriftRetryLoadDetail>().toEqualTypeOf<DriftRetryDetail>();
    expectTypeOf<DriftRetryDetail>().toEqualTypeOf<{ missionId: string | null; target: 'drift-report' }>();
    expectTypeOf<Extract<RetryLoadDetail, { target: 'drift-report' }>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<RetryLoadEventDetail, { target: 'drift-report' }>>().toEqualTypeOf<DriftRetryDetail>();
    const drift: DriftRetryDetail = { missionId: null, target: 'drift-report' };
    expect(drift.target).toBe('drift-report');
  });

  it('joins the Ops member to the event union only, as the Drift and Artifact Viewer members are', () => {
    expectTypeOf<SkOpsRetryLoadDetail>().toEqualTypeOf<OpsPageRetryDetail>();
    expectTypeOf<OpsPageRetryDetail>().toEqualTypeOf<{ target: 'ops-page'; cursor?: string }>();
    expectTypeOf<Extract<RetryLoadDetail, { target: 'ops-page' }>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<RetryLoadEventDetail, { target: 'ops-page' }>>().toEqualTypeOf<OpsPageRetryDetail>();
    const ops: OpsPageRetryDetail = { target: 'ops-page' };
    expect(ops.target).toBe('ops-page');
  });

  it('keeps #5 names as re-exports of the same types', () => {
    expectTypeOf<ReExported>().toEqualTypeOf<RetryLoadDetail>();
    expectTypeOf<SkRetryLoadDetail>().toEqualTypeOf<RetryLoadDetail>();
    expectTypeOf<RetryLoadDetail>().toEqualTypeOf<WorkPackageRetryDetail | DetailRetryDetail | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail>();
  });
});
