import { describe, expect, it } from 'vitest';
import { LISTBOX_KEYS, listboxTarget, nextIndex } from '../src/logic/drift-keys.js';

describe('nextIndex: the listbox key table (DR-17)', () => {
  it('names the six keys and no other', () => {
    expect([...LISTBOX_KEYS]).toEqual(['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Home', 'End']);
  });

  it('moves previous on Up and Left and next on Down and Right, wrapping at both ends', () => {
    let ran = 0;
    for (const key of ['ArrowUp', 'ArrowLeft']) {
      expect(nextIndex(key, 2, 5), key).toBe(1);
      expect(nextIndex(key, 0, 5), key).toBe(4);
      ran += 1;
    }
    for (const key of ['ArrowDown', 'ArrowRight']) {
      expect(nextIndex(key, 2, 5), key).toBe(3);
      expect(nextIndex(key, 4, 5), key).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('goes to the first on Home and the last on End, from anywhere', () => {
    expect(nextIndex('Home', 3, 5)).toBe(0);
    expect(nextIndex('Home', 0, 5)).toBe(0);
    expect(nextIndex('End', 1, 5)).toBe(4);
    expect(nextIndex('End', 4, 5)).toBe(4);
  });

  it('enumerates every key against 0, 1 and n items', () => {
    const expected: Record<string, [number | null, number | null, number | null]> = {
      // [count 0, count 1 (index 0), count 3 (index 1)]
      ArrowUp: [null, 0, 0],
      ArrowLeft: [null, 0, 0],
      ArrowDown: [null, 0, 2],
      ArrowRight: [null, 0, 2],
      Home: [null, 0, 0],
      End: [null, 0, 2],
    };
    let ran = 0;
    for (const key of LISTBOX_KEYS) {
      const [none, one, many] = expected[key] as [number | null, number | null, number | null];
      expect(nextIndex(key, 0, 0), `${key} with none`).toBe(none);
      expect(nextIndex(key, 0, 1), `${key} with one`).toBe(one);
      expect(nextIndex(key, 1, 3), `${key} with three`).toBe(many);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('keeps a single item in place on every arrow, never moving to another index', () => {
    let ran = 0;
    for (const key of LISTBOX_KEYS) {
      expect(nextIndex(key, 0, 1), key).toBe(0);
      ran += 1;
    }
    expect(ran).toBe(6);
  });

  it('starts from the first on Down and from the last on Up when no item is current (index -1 or past the end)', () => {
    let ran = 0;
    for (const index of [-1, 5, 99]) {
      expect(nextIndex('ArrowDown', index, 5), `down from ${index}`).toBe(0);
      expect(nextIndex('ArrowRight', index, 5), `right from ${index}`).toBe(0);
      expect(nextIndex('ArrowUp', index, 5), `up from ${index}`).toBe(4);
      expect(nextIndex('ArrowLeft', index, 5), `left from ${index}`).toBe(4);
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('has no move for any other key (positive control: the six above move)', () => {
    let ran = 0;
    for (const key of ['PageUp', 'PageDown', 'Enter', ' ', 'Tab', 'a', 'Escape', 'arrowdown', 'home', '']) {
      expect(nextIndex(key, 1, 5), JSON.stringify(key)).toBeNull();
      ran += 1;
    }
    expect(ran).toBe(10);
    expect(nextIndex('ArrowDown', 1, 5)).toBe(2);
  });

  it('keeps hostile keys that are Object members as plain unknown keys', () => {
    let ran = 0;
    for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      expect(nextIndex(key, 1, 5), key).toBeNull();
      ran += 1;
    }
    expect(ran).toBe(4);
  });
});

describe('listboxTarget: a key chord (the handler returns early on a modified chord, before preventDefault)', () => {
  it('moves for the plain key and for a key with no modifier fields at all', () => {
    expect(listboxTarget({ key: 'ArrowDown' }, 0, 3)).toBe(1);
    expect(listboxTarget({ key: 'ArrowDown', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false }, 0, 3)).toBe(1);
  });

  it('declines a chord with Alt, Ctrl, Meta or Shift, for each of the six keys', () => {
    let ran = 0;
    for (const key of LISTBOX_KEYS) {
      expect(listboxTarget({ key }, 1, 3), `${key} plain`).not.toBeNull();
      for (const modifier of ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const) {
        expect(listboxTarget({ key, [modifier]: true }, 1, 3), `${key} with ${modifier}`).toBeNull();
        ran += 1;
      }
    }
    expect(ran).toBe(24);
  });

  it('declines an unhandled key and an empty list', () => {
    expect(listboxTarget({ key: 'Tab' }, 0, 3)).toBeNull();
    expect(listboxTarget({ key: 'ArrowDown' }, 0, 0)).toBeNull();
  });
});
