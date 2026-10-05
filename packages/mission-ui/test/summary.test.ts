import { describe, expect, it } from 'vitest';
import { DEFAULT_LANE_GROUPS, SUMMARY_SEPARATOR } from '../src/defaults/index.js';
import { laneSummary } from '../src/logic/summary.js';
import type { LaneGroup } from '../src/logic/types.js';

const zero = {
  planned: 0, claimed: 0, in_progress: 0, for_review: 0, in_review: 0, approved: 0, done: 0, blocked: 0, canceled: 0,
};
const sep = SUMMARY_SEPARATOR;

describe('laneSummary', () => {
  it('has the one-space-padded separator the prototype shows', () => {
    expect(sep.length).toBe(3);
    expect(sep.trim().length).toBe(1);
  });

  it('writes the two prototype strings: columns in reverse order, lowercase words', () => {
    expect(laneSummary({ ...zero, done: 2, in_review: 1, in_progress: 1 }, DEFAULT_LANE_GROUPS, null)).toBe(['2 done', '1 in review', '1 in progress'].join(sep));
    expect(laneSummary({ ...zero, done: 2, planned: 2 }, DEFAULT_LANE_GROUPS, null)).toBe(['2 done', '2 planned'].join(sep));
  });

  it('keeps claimed and in progress as separate segments, and shows lanes the prototype never shows', () => {
    const text = laneSummary({ ...zero, claimed: 1, in_progress: 3, approved: 4, canceled: 5, for_review: 6 }, DEFAULT_LANE_GROUPS, null);
    expect(text).toBe(['5 canceled', '4 approved', '6 for review', '1 claimed', '3 in progress'].join(sep));
  });

  it('orders lanes inside a group as the group declares them', () => {
    expect(laneSummary({ ...zero, planned: 1, blocked: 2 }, DEFAULT_LANE_GROUPS, null)).toBe(['1 planned', '2 blocked'].join(sep));
    expect(laneSummary({ ...zero, done: 1, canceled: 2 }, DEFAULT_LANE_GROUPS, null)).toBe(['1 done', '2 canceled'].join(sep));
  });

  it('is empty when every count is zero or the counts are empty', () => {
    expect(laneSummary(zero, DEFAULT_LANE_GROUPS, null)).toBe('');
    expect(laneSummary({}, DEFAULT_LANE_GROUPS, null)).toBe('');
    expect(laneSummary({ ...zero, done: 1 }, DEFAULT_LANE_GROUPS, null)).toBe('1 done');
  });

  it('appends a non-zero lane no group holds, with the raw lane as its label, in key order', () => {
    expect(laneSummary({ ...zero, done: 1, on_hold: 2, awaiting: 3 }, DEFAULT_LANE_GROUPS, null)).toBe(['1 done', '2 on_hold', '3 awaiting'].join(sep));
    expect(laneSummary({ on_hold: 0 }, DEFAULT_LANE_GROUPS, null)).toBe('');
  });

  it('a label hook beats the default word; a hook that returns undefined does not', () => {
    const counts = { ...zero, done: 2, planned: 1 };
    expect(laneSummary(counts, DEFAULT_LANE_GROUPS, { lane: (l) => `<${l}>` })).toBe(['2 <done>', '1 <planned>'].join(sep));
    expect(laneSummary(counts, DEFAULT_LANE_GROUPS, { lane: () => undefined })).toBe(['2 done', '1 planned'].join(sep));
  });

  it('a non-zero lane no group holds asks the lane hook, then shows the raw lane (D-03)', () => {
    const counts = { ...zero, done: 1, on_hold: 2, awaiting: 3 };
    const hooks = { lane: (lane: string) => (lane === 'on_hold' ? 'on hold' : undefined) };
    expect(laneSummary(counts, DEFAULT_LANE_GROUPS, hooks)).toBe(['1 done', '2 on hold', '3 awaiting'].join(sep));
  });

  it('custom groups: reverse group order and an unplaced lane appended', () => {
    const groups: LaneGroup[] = [
      { id: 'g1', label: 'One', lanes: ['todo'] },
      { id: 'g2', label: 'Two', lanes: ['doing', 'shipped'] },
    ];
    expect(laneSummary({ todo: 1, doing: 2, shipped: 3, odd: 4 }, groups, null)).toBe(['2 doing', '3 shipped', '1 todo', '4 odd'].join(sep));
  });

  it('a lane listed by two groups is written once', () => {
    const groups: LaneGroup[] = [
      { id: 'a', label: 'A', lanes: ['x'] },
      { id: 'b', label: 'B', lanes: ['x'] },
    ];
    expect(laneSummary({ x: 2 }, groups, null)).toBe('2 x');
  });

  it('a lane listed by two groups is ordered by the group that holds its cards on the board, the first one (C-08)', () => {
    const groups: LaneGroup[] = [
      { id: 'a', label: 'A', lanes: ['blocked', 'planned'] },
      { id: 'b', label: 'B', lanes: ['done'] },
      { id: 'z', label: 'Z', lanes: ['blocked'] },
    ];
    // The board puts blocked cards in column A (first group wins), so the reverse walk meets it with A, the last segment group.
    expect(laneSummary({ blocked: 2, planned: 1, done: 3 }, groups, null)).toBe(['3 done', '2 blocked', '1 planned'].join(sep));
  });

  it('with no groups every non-zero count is appended raw', () => {
    expect(laneSummary({ ...zero, done: 1 }, [], null)).toBe('1 done');
  });

  it('does not add counts together: the segment count equals the non-zero lane count', () => {
    const counts = { ...zero, planned: 1, claimed: 1, in_progress: 1, for_review: 1, in_review: 1, approved: 1, done: 1, blocked: 1, canceled: 1 };
    expect(laneSummary(counts, DEFAULT_LANE_GROUPS, null).split(sep).length).toBe(9);
  });
});
