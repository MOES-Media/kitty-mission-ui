// The Drift listbox key table (DR-17) as a pure function. Keys follow the prototype's `bindArrowKeys`: Up and Left previous,
// Down and Right next, both wrapping, Home first, End last, no other key. The element calls `listboxTarget` and only then
// `preventDefault`, so a chord with Alt, Ctrl, Meta or Shift is never swallowed.

/** The six keys the listbox handles. */
export const LISTBOX_KEYS: readonly string[] = ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Home', 'End'];

/** The part of a keyboard event the table reads. */
export interface KeyChord {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

const PREVIOUS: readonly string[] = ['ArrowUp', 'ArrowLeft'];
const NEXT: readonly string[] = ['ArrowDown', 'ArrowRight'];

/**
 * The index a key moves to, or null when the key does not move (an unhandled key, or an empty list). `index` is the current
 * item; -1 or past the end means none is current, so next starts at the first item and previous at the last. With one item
 * every handled key returns 0: the item stays put.
 */
export function nextIndex(key: string, index: number, count: number): number | null {
  if (count <= 0 || !LISTBOX_KEYS.includes(key)) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const current = Number.isInteger(index) && index >= 0 && index < count ? index : -1;
  if (PREVIOUS.includes(key)) return current === -1 ? count - 1 : (current - 1 + count) % count;
  if (NEXT.includes(key)) return current === -1 ? 0 : (current + 1) % count;
  return null;
}

/** `nextIndex` for a key event: null for a chord with a modifier, so the handler returns early before `preventDefault`. */
export function listboxTarget(chord: KeyChord, index: number, count: number): number | null {
  if (chord.altKey === true || chord.ctrlKey === true || chord.metaKey === true || chord.shiftKey === true) return null;
  return nextIndex(chord.key, index, count);
}
