import { describe, expect, it } from 'vitest';
import { DEFAULT_LANE_GROUPS, NOT_STARTED_BADGE, STATE_BADGES } from '../src/defaults/index.js';
import type { WorkPackageView } from '../src/contract/types.js';
import { placeWorkPackages } from '../src/logic/placement.js';
import type { LaneGroup, StateBadge } from '../src/logic/types.js';

function wp(id: string, lane: string | null): WorkPackageView {
  return {
    wpId: id,
    title: `Title ${id}`,
    phaseLabel: null,
    statusLane: lane,
    dependencies: [],
    readiness: { satisfied: true, unsatisfied: [] },
    readyToStart: true,
    subtaskProgress: { done: 0, total: 0 },
    lastTransitionAt: null,
  };
}

const BOARD = 'Board label';
const ids = (cols: ReturnType<typeof placeWorkPackages>): string[][] => cols.map((c) => c.cards.map((card) => card.wp.wpId));

describe('placeWorkPackages with the default groups', () => {
  const lanes = DEFAULT_LANE_GROUPS.flatMap((g) => g.lanes);

  it('has five groups holding the nine lanes, none twice', () => {
    expect(DEFAULT_LANE_GROUPS.length).toBe(5);
    expect(lanes.length).toBe(9);
    expect(new Set(lanes).size).toBe(9);
  });

  it('places a work package of every default lane in the column that holds the lane, in group order', () => {
    const wps = lanes.map((lane, i) => wp(`W${i}`, lane));
    const cols = placeWorkPackages(wps, DEFAULT_LANE_GROUPS, null, BOARD);
    expect(cols.length).toBe(5);
    expect(cols.map((c) => c.group)).toEqual([...DEFAULT_LANE_GROUPS]);
    let placed = 0;
    for (const col of cols) {
      expect(col.cards.map((c) => c.wp.statusLane)).toEqual(col.group.lanes);
      placed += col.cards.length;
    }
    expect(placed).toBe(9);
  });

  it('gives each card the default badge of its lane', () => {
    const cols = placeWorkPackages(lanes.map((lane, i) => wp(`W${i}`, lane)), DEFAULT_LANE_GROUPS, null, BOARD);
    let ran = 0;
    for (const col of cols) {
      for (const card of col.cards) {
        expect(card.badge).toBe(STATE_BADGES[card.wp.statusLane ?? '']);
        ran += 1;
      }
    }
    expect(ran).toBe(9);
  });

  it('puts a null lane in the first column with the not-started badge', () => {
    const cols = placeWorkPackages([wp('W1', null)], DEFAULT_LANE_GROUPS, null, BOARD);
    expect(ids(cols)).toEqual([['W1'], [], [], [], []]);
    expect(cols[0]?.cards[0]?.badge).toBe(NOT_STARTED_BADGE);
  });

  it('puts an unknown lane in the first column with its raw value in a neutral badge', () => {
    const cols = placeWorkPackages([wp('W1', 'on_hold')], DEFAULT_LANE_GROUPS, null, BOARD);
    expect(ids(cols)).toEqual([['W1'], [], [], [], []]);
    expect(cols[0]?.cards[0]?.badge).toEqual({ label: 'on_hold', tone: 'neutral' });
  });

  it('keeps input order within a column and never drops a work package', () => {
    const wps = [wp('W5', 'done'), wp('W1', 'canceled'), wp('W3', 'done'), wp('W2', null), wp('W4', 'zzz'), wp('W9', 'blocked')];
    const cols = placeWorkPackages(wps, DEFAULT_LANE_GROUPS, null, BOARD);
    expect(ids(cols)).toEqual([['W2', 'W4', 'W9'], [], [], [], ['W5', 'W1', 'W3']]);
    expect(cols.reduce((n, c) => n + c.cards.length, 0)).toBe(6);
  });

  it('returns five empty columns for no work packages', () => {
    const cols = placeWorkPackages([], DEFAULT_LANE_GROUPS, null, BOARD);
    expect(ids(cols)).toEqual([[], [], [], [], []]);
  });
});

describe('placeWorkPackages with other groups', () => {
  it('a lane listed by two groups belongs to the first', () => {
    const groups: LaneGroup[] = [
      { id: 'a', label: 'A', lanes: ['x'] },
      { id: 'b', label: 'B', lanes: ['x', 'y'] },
    ];
    const cols = placeWorkPackages([wp('W1', 'x'), wp('W2', 'y')], groups, null, BOARD);
    expect(ids(cols)).toEqual([['W1'], ['W2']]);
  });

  it('custom groups with custom lanes, an unplaced lane in the first group', () => {
    const groups: LaneGroup[] = [
      { id: 'g1', label: 'Todo', lanes: ['todo'] },
      { id: 'g2', label: 'Doing', lanes: ['doing'] },
      { id: 'g3', label: 'Shipped', lanes: ['shipped'] },
    ];
    const cols = placeWorkPackages([wp('W1', 'shipped'), wp('W2', 'doing'), wp('W3', 'mystery'), wp('W4', 'todo')], groups, null, BOARD);
    expect(cols.map((c) => c.group.label)).toEqual(['Todo', 'Doing', 'Shipped']);
    expect(ids(cols)).toEqual([['W3', 'W4'], ['W2'], ['W1']]);
    expect(cols[0]?.cards[0]?.badge).toEqual({ label: 'mystery', tone: 'neutral' });
  });

  it('empty groups give one synthetic column titled by the board label, holding every work package', () => {
    const wps = [wp('W1', 'done'), wp('W2', null), wp('W3', 'weird'), wp('W4', 'blocked')];
    const cols = placeWorkPackages(wps, [], null, BOARD);
    expect(cols.length).toBe(1);
    expect(cols[0]?.group.label).toBe(BOARD);
    expect(ids(cols)).toEqual([['W1', 'W2', 'W3', 'W4']]);
    // a known lane keeps its default badge in the synthetic column
    expect(cols[0]?.cards[0]?.badge).toBe(STATE_BADGES['done']);
    expect(cols[0]?.cards[1]?.badge).toBe(NOT_STARTED_BADGE);
    expect(cols[0]?.cards[2]?.badge).toEqual({ label: 'weird', tone: 'neutral' });
  });

  it('empty groups and no work packages give one empty column', () => {
    const cols = placeWorkPackages([], [], null, BOARD);
    expect(ids(cols)).toEqual([[]]);
  });

  it('the state hook decides the badge of a placed card (positive control: without it the default shows)', () => {
    const mark: StateBadge = { label: 'custom', tone: 'attention' };
    const hooked = placeWorkPackages([wp('W1', 'done')], DEFAULT_LANE_GROUPS, { state: () => mark }, BOARD);
    expect(hooked[4]?.cards[0]?.badge).toBe(mark);
    const plain = placeWorkPackages([wp('W1', 'done')], DEFAULT_LANE_GROUPS, null, BOARD);
    expect(plain[4]?.cards[0]?.badge).toBe(STATE_BADGES['done']);
  });

  it('a lane no group holds shows its raw value in a neutral badge and never asks the state hook (F-02)', () => {
    const mark: StateBadge = { label: 'custom', tone: 'attention' };
    let asked = 0;
    const hooks = {
      state: () => {
        asked += 1;
        return mark;
      },
    };
    const cols = placeWorkPackages([wp('W1', 'mystery')], DEFAULT_LANE_GROUPS, hooks, BOARD);
    expect(cols[0]?.cards[0]?.badge).toEqual({ label: 'mystery', tone: 'neutral' });
    expect(asked).toBe(0);
    // positive control: a held lane does ask it
    expect(placeWorkPackages([wp('W2', 'done')], DEFAULT_LANE_GROUPS, hooks, BOARD)[4]?.cards[0]?.badge).toBe(mark);
    expect(asked).toBe(1);
  });

  it('does not mutate its inputs', () => {
    const groups: LaneGroup[] = [{ id: 'a', label: 'A', lanes: ['x'] }];
    const wps = [wp('W1', 'x')];
    const before = JSON.stringify([groups, wps]);
    placeWorkPackages(wps, groups, null, BOARD);
    expect(JSON.stringify([groups, wps])).toBe(before);
  });
});
