import { describe, expect, it } from 'vitest';
import {
  BLOCKED_ROW_BADGE,
  CURRENT_STEP_PREFIX,
  DEFAULT_FILTER,
  DEFAULT_FILTER_ID,
  DEFAULT_LANE_GROUPS,
  DEFAULT_PHASE_LABELS,
  DEFAULT_PHASE_STATE,
  FILTERS,
  LANE_LABELS,
  LIFECYCLE_BADGES,
  NOT_STARTED_BADGE,
  NO_ACTIVITY_TEXT,
  NO_STEP_TEXT,
  PHASE_GLYPH,
  PHASE_IS_CURRENT,
  PHASE_STATE,
  PHASE_STATUS_TEXT,
  PHASE_TONE,
  STALE_BADGE,
  STATE_BADGES,
  LANE_COUNT_TEXT,
  SUMMARY_SEPARATOR,
  resultCountText,
  type PhaseState,
} from '../src/defaults/index.js';
import * as copy from '../src/defaults/index.js';

const STATES: PhaseState[] = Object.values(PHASE_STATE);
const LANES = ['planned', 'claimed', 'in_progress', 'for_review', 'in_review', 'approved', 'done', 'blocked', 'canceled'];

describe('defaults/lanes', () => {
  it('the five default groups, in the operator order, hold the nine lanes', () => {
    expect(DEFAULT_LANE_GROUPS.map((g) => g.id)).toEqual(['planned', 'in-progress', 'review', 'approved', 'done']);
    expect(DEFAULT_LANE_GROUPS.map((g) => g.label)).toEqual(['Planned', 'In progress', 'Review', 'Approved', 'Done']);
    expect(DEFAULT_LANE_GROUPS.map((g) => g.lanes)).toEqual([
      ['planned', 'blocked'],
      ['claimed', 'in_progress'],
      ['for_review', 'in_review'],
      ['approved'],
      ['done', 'canceled'],
    ]);
  });

  it('every lane has a summary word and a card badge, lowercase words as the prototype writes them', () => {
    expect(Object.keys(LANE_LABELS).sort()).toEqual([...LANES].sort());
    expect(Object.keys(STATE_BADGES).sort()).toEqual([...LANES].sort());
    expect(LANE_LABELS['in_progress']).toBe('in progress');
    expect(LANE_LABELS['for_review']).toBe('for review');
    for (const lane of LANES) {
      expect(LANE_LABELS[lane], lane).toBe(LANE_LABELS[lane]?.toLowerCase());
      expect(STATE_BADGES[lane]?.label.length, lane).toBeGreaterThan(0);
    }
  });

  it('the spoken lane count is singular for one and plural otherwise, pinned as literals (C-03, D-07)', () => {
    expect(LANE_COUNT_TEXT(0)).toBe('0 Work Packages');
    expect(LANE_COUNT_TEXT(1)).toBe('1 Work Package');
    expect(LANE_COUNT_TEXT(2)).toBe('2 Work Packages');
    expect(LANE_COUNT_TEXT(11)).toBe('11 Work Packages');
  });

  it('the card words of the prototype are kept', () => {
    expect(STATE_BADGES['planned']).toEqual({ label: 'queued', tone: 'neutral' });
    expect(STATE_BADGES['in_progress']).toEqual({ label: 'coding', tone: 'info' });
    expect(STATE_BADGES['for_review']).toEqual({ label: 'review', tone: 'recovery' });
    expect(STATE_BADGES['blocked']).toEqual({ label: 'blocked', tone: 'danger' });
  });

  it('not started, and the row blocked badge, carry the count as given', () => {
    expect(NOT_STARTED_BADGE).toEqual({ label: 'not started', tone: 'neutral' });
    expect(BLOCKED_ROW_BADGE(2)).toEqual({ label: '2 blocked', tone: 'danger' });
    expect(BLOCKED_ROW_BADGE(11)).toEqual({ label: '11 blocked', tone: 'danger' });
  });

  it('the summary separator is one character with a space either side', () => {
    expect(SUMMARY_SEPARATOR).toBe(' · ');
  });
});

describe('defaults/phases', () => {
  it('the five phase labels', () => {
    expect(DEFAULT_PHASE_LABELS).toEqual({ specify: 'Specify', plan: 'Plan', tasks: 'Tasks', implement: 'Implement', review: 'Review' });
  });

  it('three statuses map to three states, and the default state is the pending one', () => {
    expect(Object.keys(PHASE_STATE).sort()).toEqual(['complete', 'in_progress', 'pending']);
    expect(new Set(STATES).size).toBe(3);
    expect(PHASE_STATE['pending']).toBe(DEFAULT_PHASE_STATE);
  });

  it('every PhaseState has a non-empty entry in the status text, tone and is-current tables, and a glyph entry', () => {
    let ran = 0;
    for (const state of STATES) {
      expect(PHASE_STATUS_TEXT[state].length, state).toBeGreaterThan(0);
      expect(PHASE_TONE[state].length, state).toBeGreaterThan(0);
      expect(typeof PHASE_IS_CURRENT[state], state).toBe('boolean');
      expect(typeof PHASE_GLYPH[state], state).toBe('string');
      ran += 1;
    }
    expect(ran).toBe(3);
    expect(new Set(STATES.map((s) => PHASE_STATUS_TEXT[s])).size).toBe(3);
  });

  it('exactly one state is current; tones are success, info and neutral; glyphs are a check mark, a bullet and nothing', () => {
    expect(STATES.filter((s) => PHASE_IS_CURRENT[s]).length).toBe(1);
    expect(STATES.map((s) => PHASE_TONE[s]).sort()).toEqual(['info', 'neutral', 'success']);
    expect(STATES.map((s) => PHASE_GLYPH[s]).sort()).toEqual(['', '•', '✓'].sort());
  });

  it('the step texts', () => {
    expect(NO_STEP_TEXT).toBe('No step in progress');
    expect(CURRENT_STEP_PREFIX).toBe('Current step: ');
  });
});

describe('defaults/lifecycle', () => {
  it('six filters: All, Active, Planned, Done, Stale, Discarded', () => {
    expect(FILTERS.map((f) => f.id)).toEqual(['all', 'active', 'planned', 'done', 'stale', 'discarded']);
    expect(FILTERS.map((f) => f.label)).toEqual(['All', 'Active', 'Planned', 'Done', 'Stale', 'Discarded']);
    expect(DEFAULT_FILTER_ID).toBe('all');
    expect(DEFAULT_FILTER).toBe(FILTERS[0]);
  });

  it('the five lifecycle badges; discarded is written Discarded and never abandoned', () => {
    expect(Object.keys(LIFECYCLE_BADGES).sort()).toEqual(['active', 'discarded', 'done', 'draft', 'planned']);
    expect(LIFECYCLE_BADGES['discarded']).toEqual({ label: 'Discarded', tone: 'danger' });
    expect(STALE_BADGE).toEqual({ label: 'stale', tone: 'info' });
    expect(NO_ACTIVITY_TEXT).toBe('no activity');
    const everything = JSON.stringify([LIFECYCLE_BADGES, STATE_BADGES, FILTERS.map((f) => f.label), DEFAULT_PHASE_LABELS, copy.PIPELINE_TITLE]).toLowerCase();
    expect(everything.includes('abandon')).toBe(false);
  });

  it('the result-count phrase has a singular and a plural', () => {
    expect(resultCountText(1)).toBe('1 Mission shown');
    expect(resultCountText(0)).toBe('0 Missions shown');
    expect(resultCountText(7)).toBe('7 Missions shown');
  });

  it('every copy string is non-empty text, and none of the word "feature"', () => {
    const strings = Object.entries(copy).filter(([, v]) => typeof v === 'string') as Array<[string, string]>;
    expect(strings.length).toBeGreaterThanOrEqual(25);
    for (const [name, value] of strings) {
      expect(value.length, name).toBeGreaterThan(0);
      expect(/feature/i.test(value), name).toBe(false);
    }
  });
});

describe('defaults/pipeline-copy', () => {
  it('the screen copy of the prototype', () => {
    expect(copy.PIPELINE_TITLE).toBe('Pipeline');
    expect(copy.MISSIONS_CRUMB).toBe('Missions');
    expect(copy.PHASES_LABEL).toBe('Mission phases');
    expect(copy.PHASES_SCROLL_LABEL).toBe('Mission phases, scrollable');
    expect(copy.BOARD_LABEL).toBe('Work Package board');
    expect(copy.INSPECTOR_LABEL).toBe('Current step');
    expect(copy.PROGRESS_LABEL).toBe('Mission progress');
    expect(copy.BLOCKERS_LABEL).toBe('Blockers');
    expect(copy.TARGET_BRANCH_LABEL).toBe('Target branch');
    expect(copy.VIEW_ARTIFACTS_TEXT).toBe('View artifacts');
    expect(copy.PIPELINE_EMPTY_HEADING).toBe('No Mission to show');
  });
});
