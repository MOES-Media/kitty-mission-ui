import { describe, expect, it } from 'vitest';
import { formatArtifactSize } from '../src/logic/artifact-size.js';

describe('formatArtifactSize: the one display rule', () => {
  const rows: Array<[number, string]> = [
    [0, '0 B'],
    [1, '1 B'],
    [1023, '1023 B'],
    [1024, '1 KiB'],
    [1030, '1 KiB'],
    [1100, '1.1 KiB'],
    [1536, '1.5 KiB'],
    [4210, '4.1 KiB'],
    [262144, '256 KiB'],
    [300000, '293 KiB'],
    [1048575, '1 MiB'],
    [1048576, '1 MiB'],
    [2359296, '2.3 MiB'],
    [5242880, '5 MiB'],
  ];
  for (const [bytes, want] of rows) {
    it(`${bytes} bytes is ${want}`, () => {
      expect(formatArtifactSize(bytes)).toBe(want);
    });
  }

  it('has the declared number of rows', () => {
    expect(rows.length).toBe(14);
  });

  it('returns a negative or non-finite number as its own text', () => {
    expect(formatArtifactSize(-1)).toBe('-1');
    expect(formatArtifactSize(Number.NaN)).toBe('NaN');
    expect(formatArtifactSize(Number.POSITIVE_INFINITY)).toBe('Infinity');
    expect(formatArtifactSize(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
  });

  it('lets the size hook win, falls back when it says nothing, and gives it the raw number', () => {
    const seen: number[] = [];
    const hooks = {
      size: (bytes: number) => {
        seen.push(bytes);
        return bytes === 7 ? 'seven' : undefined;
      },
    };
    expect(formatArtifactSize(7, hooks)).toBe('seven');
    expect(formatArtifactSize(2048, hooks)).toBe('2 KiB');
    expect(formatArtifactSize(7, null)).toBe('7 B');
    expect(formatArtifactSize(7, {})).toBe('7 B');
    expect(seen).toEqual([7, 2048]);
  });
});

// Deliberate revert (D-34 rule 4): drop the promotion to the next unit in formatArtifactSize; "1048575 bytes is 1 MiB" fails.
