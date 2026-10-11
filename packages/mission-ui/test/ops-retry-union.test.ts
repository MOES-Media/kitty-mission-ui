// T010 / FR-028: the Ops member of the retry union, keyed on `target`. The union is extended, never redeclared.
import { describe, expect, it } from 'vitest';
import { opsRetryDetail, retryDetail, type OpsPageRetryDetail, type RetryLoadDetail } from '../src/logic/index.js';

/** Exhaustive over the members: a new member without a branch here fails the typecheck. */
function describeTarget(detail: RetryLoadDetail): string {
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

  it('the earlier members still build, and the union holds all three', () => {
    const props = { mission: { missionId: 'M1' }, wpId: 'WP01' };
    const members: RetryLoadDetail[] = [retryDetail('work-package', props) as RetryLoadDetail, retryDetail('detail', props) as RetryLoadDetail, opsRetryDetail('c')];
    expect(members.map(describeTarget)).toEqual(['read WP01', 'detail of WP01', 'page after c']);
    expect(new Set(members.map((m) => m.target)).size).toBe(3);
  });
});
