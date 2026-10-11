// T010 / FR-028: the Ops member of the `sk-retry-load` payload, keyed on `target`. It joins the event union
// (`RetryLoadEventDetail` in `src/retry-types.ts`) only, as the Artifact Viewer and Drift members do; `RetryLoadDetail` (the
// Work Package and Projects payload) stays exact. The union is extended, never redeclared.
import { describe, expect, expectTypeOf, it } from 'vitest';
import { opsRetryDetail, retryDetail } from '../src/logic/index.js';
import type { OpsPageRetryDetail, RetryLoadDetail, RetryLoadEventDetail } from '../src/retry-types.js';
import type { SkOpsRetryLoadDetail } from '../src/elements/sk-ops-screen/sk-ops-screen.js';

type Described = Extract<RetryLoadEventDetail, { target: 'work-package' | 'detail' | 'ops-page' }>;

/** Exhaustive over the three members it takes: a member without a branch here fails the typecheck. */
function describeTarget(detail: Described): string {
  switch (detail.target) {
    case 'work-package':
      return `read ${detail.wpId}`;
    case 'detail':
      return `detail of ${detail.wpId}`;
    case 'ops-page':
      return detail.cursor === undefined ? 'first page' : `page after ${detail.cursor}`;
    default: {
      const unreachable: never = detail;
      return unreachable;
    }
  }
}

describe('the ops-page member of the retry union', () => {
  it('joins the event union only: RetryLoadDetail holds no Ops member, and the screen payload is the member', () => {
    expectTypeOf<SkOpsRetryLoadDetail>().toEqualTypeOf<OpsPageRetryDetail>();
    expectTypeOf<Extract<RetryLoadDetail, { target: 'ops-page' }>>().toEqualTypeOf<never>();
    expectTypeOf<Extract<RetryLoadEventDetail, { target: 'ops-page' }>>().toEqualTypeOf<OpsPageRetryDetail>();
    // @ts-expect-error the Ops member is not part of RetryLoadDetail
    const notWp: RetryLoadDetail = { target: 'ops-page' };
    expect(notWp.target).toBe('ops-page');
  });

  it('narrows on target and carries no Mission or Work Package id', () => {
    const first: OpsPageRetryDetail = { target: 'ops-page' };
    expect(describeTarget(first)).toBe('first page');
    expect(Object.keys(first)).toEqual(['target']);
    // @ts-expect-error the member has no missionId
    const withMission: OpsPageRetryDetail = { target: 'ops-page', missionId: 'M1' };
    expect(withMission.target).toBe('ops-page');
    // @ts-expect-error the member has no wpId
    const withWp: OpsPageRetryDetail = { target: 'ops-page', wpId: 'WP01' };
    expect(withWp.target).toBe('ops-page');
  });

  it('the cursor is optional and typed as a string', () => {
    const more: OpsPageRetryDetail = { target: 'ops-page', cursor: 'c-2' };
    expect(describeTarget(more)).toBe('page after c-2');
    // @ts-expect-error the cursor is a string
    const bad: OpsPageRetryDetail = { target: 'ops-page', cursor: 7 };
    expect(bad.target).toBe('ops-page');
  });

  it('opsRetryDetail builds the first-page member without a cursor key, and the load-more member with one', () => {
    expect(opsRetryDetail(null)).toEqual({ target: 'ops-page' });
    expect('cursor' in opsRetryDetail(null)).toBe(false);
    expect(opsRetryDetail('c-2')).toEqual({ target: 'ops-page', cursor: 'c-2' });
    expect(opsRetryDetail(undefined)).toEqual({ target: 'ops-page' });
    // an empty cursor is a cursor the screen never invents; the builder does not reinterpret it
    expect(opsRetryDetail('')).toEqual({ target: 'ops-page', cursor: '' });
  });

  it('the earlier members still build, and the event union holds all three', () => {
    const props = { mission: { missionId: 'M1' }, wpId: 'WP01' };
    const members: Described[] = [retryDetail('work-package', props) as Described, retryDetail('detail', props) as Described, opsRetryDetail('c')];
    expect(members.map(describeTarget)).toEqual(['read WP01', 'detail of WP01', 'page after c']);
    expect(new Set(members.map((m) => m.target)).size).toBe(3);
  });
});
