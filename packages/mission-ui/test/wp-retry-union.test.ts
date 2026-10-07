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
});
