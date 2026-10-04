import { describe, expect, it } from 'vitest';
import { DEFAULT_PHASE_LABELS, LANE_LABELS, NOT_STARTED_BADGE, STATE_BADGES } from '../src/defaults/index.js';
import { resolveLaneLabel, resolvePhaseLabel, resolveStateBadge } from '../src/logic/labels.js';
import type { LabelHooks, StateBadge } from '../src/logic/types.js';

const MARK: StateBadge = { label: 'hooked', tone: 'attention' };

describe('resolvePhaseLabel', () => {
  it('the hook wins over the default', () => {
    const hooks: LabelHooks = { phase: (name) => `hook:${name}` };
    for (const name of Object.keys(DEFAULT_PHASE_LABELS)) expect(resolvePhaseLabel(name, hooks)).toBe(`hook:${name}`);
  });

  it('falls through to the default when the hook returns undefined or there is no hook', () => {
    const silent: LabelHooks = { phase: () => undefined };
    const names = Object.keys(DEFAULT_PHASE_LABELS);
    expect(names.length).toBe(5);
    for (const name of names) {
      const want = DEFAULT_PHASE_LABELS[name];
      expect(resolvePhaseLabel(name, silent)).toBe(want);
      expect(resolvePhaseLabel(name, null)).toBe(want);
      expect(resolvePhaseLabel(name, {})).toBe(want);
    }
  });

  it('falls back to the raw name for a name nobody knows, and for prototype names', () => {
    let ran = 0;
    for (const name of ['discover', 'constructor', '__proto__', 'toString']) {
      expect(resolvePhaseLabel(name, null), name).toBe(name);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('an empty string from the hook is a label, not a miss', () => {
    expect(resolvePhaseLabel('discover', { phase: () => '' })).toBe('');
  });
});

describe('resolveLaneLabel', () => {
  it('hook, then default, then raw', () => {
    const lanes = Object.keys(LANE_LABELS);
    expect(lanes.length).toBe(9);
    for (const lane of lanes) {
      expect(resolveLaneLabel(lane, { lane: () => 'x' }), lane).toBe('x');
      expect(resolveLaneLabel(lane, null), lane).toBe(LANE_LABELS[lane]);
    }
    expect(resolveLaneLabel('todo', null)).toBe('todo');
    expect(resolveLaneLabel('constructor', { lane: () => undefined })).toBe('constructor');
  });
});

describe('resolveStateBadge', () => {
  it('a null lane is the not-started badge, whatever the hooks say', () => {
    expect(resolveStateBadge(null, null)).toBe(NOT_STARTED_BADGE);
    expect(resolveStateBadge(null, { state: () => MARK })).toBe(NOT_STARTED_BADGE);
  });

  it('the hook wins for a known lane', () => {
    const lanes = Object.keys(STATE_BADGES);
    expect(lanes.length).toBe(9);
    for (const lane of lanes) expect(resolveStateBadge(lane, { state: () => MARK }), lane).toBe(MARK);
  });

  it('falls through to the default table when the hook returns undefined or there is no hook', () => {
    for (const lane of Object.keys(STATE_BADGES)) {
      expect(resolveStateBadge(lane, null)).toBe(STATE_BADGES[lane]);
      expect(resolveStateBadge(lane, { state: () => undefined })).toBe(STATE_BADGES[lane]);
    }
  });

  it('an unknown lane shows the raw value in a neutral badge, also for prototype names', () => {
    let ran = 0;
    for (const lane of ['on_hold', 'constructor', '__proto__']) {
      expect(resolveStateBadge(lane, null), lane).toEqual({ label: lane, tone: 'neutral' });
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(resolveStateBadge('on_hold', { state: () => MARK })).toBe(MARK);
  });

  it('keeps the distinct badges the board needs (blocked, reviewing, canceled, not started)', () => {
    const labels = [STATE_BADGES['blocked']?.label, STATE_BADGES['in_review']?.label, STATE_BADGES['canceled']?.label, NOT_STARTED_BADGE.label];
    expect(new Set(labels).size).toBe(4);
  });
});
