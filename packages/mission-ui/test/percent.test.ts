import { describe, expect, it } from 'vitest';
import { formatWholePercent } from '../src/logic/percent.js';

describe('formatWholePercent: display rounding only', () => {
  it('rounds to the nearest whole percent', () => {
    const cases: Array<[number, string]> = [
      [68.4, '68'],
      [68.5, '69'],
      [10.8333, '11'],
      [17.8571, '18'],
      [41.6667, '42'],
      [65, '65'],
      [0, '0'],
      [100, '100'],
      [0.4, '0'],
    ];
    let ran = 0;
    for (const [given, shown] of cases) {
      expect(formatWholePercent(given)).toBe(shown);
      ran += 1;
    }
    expect(ran).toBe(9);
  });

  it('never prints a decimal point or a minus zero', () => {
    expect(formatWholePercent(-0.2)).toBe('0');
    expect(formatWholePercent(33.3333)).not.toContain('.');
  });

  it('shows 0 for a value that is not a finite number', () => {
    expect(formatWholePercent(Number.NaN)).toBe('0');
    expect(formatWholePercent(Number.POSITIVE_INFINITY)).toBe('0');
  });
});
