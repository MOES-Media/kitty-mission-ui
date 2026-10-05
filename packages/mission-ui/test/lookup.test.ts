import { describe, expect, it } from 'vitest';
import { DEFAULT_PHASE_STATE, PHASE_STATE } from '../src/defaults/index.js';
import { lookup, phaseState } from '../src/logic/lookup.js';

describe('lookup', () => {
  const table: Readonly<Record<string, number>> = { alpha: 1, beta: 2 };

  it('reads an own key', () => {
    expect(lookup(table, 'alpha')).toBe(1);
    expect(lookup(table, 'beta')).toBe(2);
  });

  it('returns undefined for an unknown key', () => {
    expect(lookup(table, 'gamma')).toBeUndefined();
  });

  it('treats names that exist on every object as unknown keys (positive control: an own key of the same table resolves)', () => {
    const names = ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf'];
    let ran = 0;
    for (const name of names) {
      expect(lookup(table, name), name).toBeUndefined();
      ran += 1;
    }
    expect(ran).toBe(5);
    expect(lookup(table, 'alpha')).toBe(1);
  });

  it('reads a key that shadows a prototype name when the table owns it', () => {
    const own: Readonly<Record<string, string>> = Object.fromEntries([['constructor', 'mine']]);
    expect(lookup(own, 'constructor')).toBe('mine');
  });
});

describe('phaseState', () => {
  it('maps each contract status through PHASE_STATE', () => {
    const statuses = Object.keys(PHASE_STATE);
    expect(statuses.length).toBe(3);
    for (const status of statuses) expect(phaseState(status), status).toBe(PHASE_STATE[status]);
  });

  it('gives three distinct states for the three statuses', () => {
    const states = new Set(Object.keys(PHASE_STATE).map((s) => phaseState(s)));
    expect(states.size).toBe(3);
  });

  it('falls back to the default state for an unknown status, an empty string and a prototype name', () => {
    let ran = 0;
    for (const status of ['unheard-of', '', 'constructor', '__proto__']) {
      expect(phaseState(status), status).toBe(DEFAULT_PHASE_STATE);
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});
