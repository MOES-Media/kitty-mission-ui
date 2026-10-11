// Type-level assertions for the neutral `sk-retry-load` payload: this file compiles only with the union of `src/retry-types.ts`
// (the event map entry is the union of every screen's payloads), so reverting the union fails `pnpm typecheck`.
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  DetailRetryDetail,
  FoldersRetryDetail,
  ProjectRetryDetail,
  ProjectsRetryDetail,
  RetryLoadDetail,
  RetryLoadEventDetail,
  SkArtifactRetryDetail,
  WorkPackageRetryDetail,
} from '../src/retry-types.js';
import type { RetryLoadDetail as ReExported } from '../src/logic/wp-retry.js';
import type { SkRetryLoadDetail } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';

describe('retry-types', () => {
  it('the event map entry is the union of every screen payload', () => {
    expectTypeOf<HTMLElementEventMap['sk-retry-load']>().toEqualTypeOf<CustomEvent<RetryLoadEventDetail>>();
    expectTypeOf<RetryLoadEventDetail>().toEqualTypeOf<
      WorkPackageRetryDetail | DetailRetryDetail | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail | SkArtifactRetryDetail
    >();
    expectTypeOf<RetryLoadEventDetail['target']>().toEqualTypeOf<'work-package' | 'detail' | 'project' | 'projects' | 'folders' | 'content' | 'listing'>();
    const content: SkArtifactRetryDetail = { missionId: 'm', target: 'content', path: 'spec.md' };
    const listing: SkArtifactRetryDetail = { missionId: 'm', target: 'listing' };
    // @ts-expect-error a content retry names its path, a listing retry has none
    const bad: SkArtifactRetryDetail = { missionId: 'm', target: 'listing', path: 'spec.md' };
    expect([content.target, listing.target, bad.target]).toEqual(['content', 'listing', 'listing']);
  });

  it('keeps #5 names as re-exports of the same types', () => {
    expectTypeOf<ReExported>().toEqualTypeOf<RetryLoadDetail>();
    expectTypeOf<SkRetryLoadDetail>().toEqualTypeOf<RetryLoadDetail>();
    expectTypeOf<RetryLoadDetail>().toEqualTypeOf<WorkPackageRetryDetail | DetailRetryDetail | ProjectRetryDetail | ProjectsRetryDetail | FoldersRetryDetail>();
  });
});
