import { describe, expect, it } from 'vitest';
import { CHANGE_STATE_BADGES, UNKNOWN_CHANGE_STATE } from '../src/defaults/index.js';
import { filesView, resolveChangeState } from '../src/logic/wp-files.js';

const file = (pattern: string, changeState: string | null, isGlob = false) => ({ pattern, isGlob, changeState });

describe('resolveChangeState', () => {
  it('maps each known state through the table, with its tone (positive controls)', () => {
    expect(resolveChangeState('changed')).toEqual({ label: 'changed', tone: 'info' });
    expect(resolveChangeState('unchanged')).toEqual({ label: 'unchanged', tone: 'neutral' });
    expect(resolveChangeState(UNKNOWN_CHANGE_STATE)).toEqual({ label: 'unknown', tone: 'neutral' });
    expect(Object.keys(CHANGE_STATE_BADGES).length).toBe(3);
  });

  it('gives null for a null state (no badge)', () => {
    expect(resolveChangeState(null)).toBeNull();
  });

  it('shows a foreign state raw and neutral, never undefined', () => {
    expect(resolveChangeState('renamed')).toEqual({ label: 'renamed', tone: 'neutral' });
    expect(resolveChangeState('toString')).toEqual({ label: 'toString', tone: 'neutral' });
  });
});

describe('filesView', () => {
  it('lists a mixed set with a badge per row and no collapse', () => {
    const view = filesView([file('a.py', 'changed'), file('b.py', 'unchanged'), file('c/**', UNKNOWN_CHANGE_STATE, true)]);
    expect(view.allUnknown).toBe(false);
    expect(view.rows.length).toBe(3);
    expect(view.rows.map((r) => r.pattern)).toEqual(['a.py', 'b.py', 'c/**']);
    expect(view.rows.map((r) => r.isGlob)).toEqual([false, false, true]);
    expect(view.rows.map((r) => r.badge?.label)).toEqual(['changed', 'unchanged', 'unknown']);
  });

  it('collapses when the list is non-empty and every state is the unknown key', () => {
    const view = filesView([file('a.py', UNKNOWN_CHANGE_STATE), file('b/**', UNKNOWN_CHANGE_STATE, true)]);
    expect(view.allUnknown).toBe(true);
    expect(view.rows.length).toBe(2);
    expect(view.rows.map((r) => r.badge)).toEqual([null, null]);
  });

  it('treats a single file whose state is unknown as all unknown, and one unknown among others as shown', () => {
    expect(filesView([file('a.py', UNKNOWN_CHANGE_STATE)]).allUnknown).toBe(true);
    const mixed = filesView([file('a.py', UNKNOWN_CHANGE_STATE), file('b.py', 'changed')]);
    expect(mixed.allUnknown).toBe(false);
    expect(mixed.rows.map((r) => r.badge?.label)).toEqual(['unknown', 'changed']);
  });

  it('is not all unknown for an empty list', () => {
    expect(filesView([])).toEqual({ allUnknown: false, rows: [] });
  });

  it('shows a foreign state raw among known ones and does not collapse the list', () => {
    const view = filesView([file('a.py', 'changed'), file('b.py', 'renamed'), file('c.py', UNKNOWN_CHANGE_STATE)]);
    expect(view.allUnknown).toBe(false);
    expect(view.rows.map((r) => r.badge)).toEqual([
      { label: 'changed', tone: 'info' },
      { label: 'renamed', tone: 'neutral' },
      { label: 'unknown', tone: 'neutral' },
    ]);
  });

  it('does not collapse when the only non-unknown state is foreign', () => {
    expect(filesView([file('a.py', UNKNOWN_CHANGE_STATE), file('b.py', 'renamed')]).allUnknown).toBe(false);
  });

  it('shows no badge and no note for a null state (bare degradation), with a control that does', () => {
    const bare = filesView([file('a.py', null), file('b.py', null)]);
    expect(bare.allUnknown).toBe(false);
    expect(bare.rows.map((r) => r.badge)).toEqual([null, null]);
    expect(filesView([file('a.py', 'changed')]).rows[0]?.badge).not.toBeNull();
  });

  it('keeps the input order and does not sort', () => {
    const view = filesView([file('z.py', 'changed'), file('a.py', 'changed'), file('m.py', 'changed')]);
    expect(view.rows.map((r) => r.pattern)).toEqual(['z.py', 'a.py', 'm.py']);
  });
});
