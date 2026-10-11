import { describe, expect, it } from 'vitest';
import { driftRetryDetail } from '../src/logic/drift-retry.js';
import { retryDetail, type DriftRetryDetail, type RetryLoadDetail } from '../src/logic/wp-retry.js';

/** Exhaustive over every member: a union member without a branch here fails the typecheck. */
function describeTarget(detail: RetryLoadDetail): string {
  switch (detail.target) {
    case 'work-package':
      return `read ${detail.wpId}`;
    case 'detail':
      return `detail of ${detail.wpId}`;
    case 'drift-report':
      return detail.missionId === null ? 'drift of the project' : `drift of ${detail.missionId}`;
    default: {
      const unreachable: never = detail;
      return unreachable;
    }
  }
}

describe('driftRetryDetail: the retry of a whole-project scan needs no Work Package', () => {
  it('builds a payload with a null scope (the null-scope case that retryDetail cannot serve)', () => {
    const detail = driftRetryDetail(null);
    expect(detail).toEqual({ missionId: null, target: 'drift-report' });
    // positive control: the shipped builder returns null for the same absent Mission
    expect(retryDetail('work-package', { mission: null })).toBeNull();
  });

  it('carries the scope Mission when scoped', () => {
    expect(driftRetryDetail('01JZCB3C4D5E6F7G8H9JKMNPQT')).toEqual({ missionId: '01JZCB3C4D5E6F7G8H9JKMNPQT', target: 'drift-report' });
  });

  it('reads an empty scope (the screen\'s default) as the whole project, never as an empty id', () => {
    expect(driftRetryDetail('')).toEqual({ missionId: null, target: 'drift-report' });
    expect(driftRetryDetail('M1')).not.toEqual({ missionId: null, target: 'drift-report' });
  });

  it('has exactly the two keys, so a host sees no stray field', () => {
    expect(Object.keys(driftRetryDetail('M1')).sort()).toEqual(['missionId', 'target']);
    expect(Object.keys(driftRetryDetail(null)).sort()).toEqual(['missionId', 'target']);
  });
});

describe('the retry union with the drift member', () => {
  it('narrows on target for all three members, and the two existing members still build', () => {
    const props = { mission: { missionId: 'M1' }, wpId: 'WP01' };
    const whole = retryDetail('work-package', props);
    const detail = retryDetail('detail', props);
    const drift: DriftRetryDetail = driftRetryDetail('M1');
    expect(whole).toEqual({ missionId: 'M1', wpId: 'WP01', target: 'work-package' });
    expect(detail).toEqual({ missionId: 'M1', wpId: 'WP01', target: 'detail' });
    expect(describeTarget(whole as RetryLoadDetail)).toBe('read WP01');
    expect(describeTarget(detail as RetryLoadDetail)).toBe('detail of WP01');
    expect(describeTarget(drift)).toBe('drift of M1');
    expect(describeTarget(driftRetryDetail(null))).toBe('drift of the project');
  });
});
