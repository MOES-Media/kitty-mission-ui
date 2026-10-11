// Landing pass (#5), DESIGN-006: `sk-retry-load` carries a union discriminated by `target`, so a later screen extends it.
import { describe, expect, it } from 'vitest';
import type { SkRetryLoadDetail } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { retryDetail } from '../src/logic/index.js';

/** Exhaustive over the members: a new member without a branch here fails the typecheck. */
function describeTarget(detail: SkRetryLoadDetail): string {
  switch (detail.target) {
    case 'work-package':
      return `read ${detail.wpId}`;
    case 'detail':
      return `detail of ${detail.wpId}`;
    case 'project':
      return `project ${detail.key}`;
    case 'projects':
      return 'projects';
    case 'folders':
      return 'folders';
    case 'ops-page':
      return 'ops page';
    default: {
      const unreachable: never = detail;
      return unreachable;
    }
  }
}

describe('DESIGN-006: the retry payload is a union keyed on target', () => {
  it('narrows on target and builds each member', () => {
    const props = { mission: { missionId: 'M1' }, wpId: 'WP01' };
    const whole = retryDetail('work-package', props);
    const detail = retryDetail('detail', props);
    expect(whole).toEqual({ missionId: 'M1', wpId: 'WP01', target: 'work-package' });
    expect(detail).toEqual({ missionId: 'M1', wpId: 'WP01', target: 'detail' });
    expect(describeTarget(whole as SkRetryLoadDetail)).toBe('read WP01');
    expect(describeTarget(detail as SkRetryLoadDetail)).toBe('detail of WP01');
  });

  it('narrows the three Projects members', () => {
    const members: SkRetryLoadDetail[] = [{ target: 'project', key: 'k1' }, { target: 'projects' }, { target: 'folders' }];
    expect(members.map(describeTarget)).toEqual(['project k1', 'projects', 'folders']);
  });
});

describe('FR-028: the Ops member extends the union and the Work Package builder ignores it', () => {
  it('describes the ops-page member and builds no Work Package payload for it', () => {
    expect(describeTarget({ target: 'ops-page' })).toBe('ops page');
    expect(describeTarget({ target: 'ops-page', cursor: 'c-2' })).toBe('ops page');
    // the Work Package builder takes any target of the union and gives null for the Ops one, with a Mission and an id present
    expect(retryDetail('ops-page', { mission: { missionId: 'M1' }, wpId: 'WP01' })).toBeNull();
    // positive control: the same props build the two earlier members
    expect(retryDetail('detail', { mission: { missionId: 'M1' }, wpId: 'WP01' })).not.toBeNull();
    expect(retryDetail('work-package', { mission: { missionId: 'M1' }, wpId: 'WP01' })).not.toBeNull();
  });
});
