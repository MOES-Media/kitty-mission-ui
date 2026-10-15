// SO-DES-005: toStreamCursorString is the one place the shell turns the contract's cursor object into the text form that
// the SSE `id:` line, the streamCursor parameter and Last-Event-ID carry. Oracle: the scopedId of each changes.json item.
import { describe, expect, it } from 'vitest';
import changes from '../../../contracts/fixtures/mission-status.changes.json' with { type: 'json' };
import { toStreamCursorString } from '../src/contract/stream';
import { toStreamCursorString as fromEntry } from '../src';

describe('toStreamCursorString', () => {
  type Item = (typeof changes.items)[number];
  const cursorOf = (item: Item) => (item.data as { streamCursor: { offset: number; invariant: string } }).streamCursor;
  const scoped = changes.items.filter((item) => item.event !== 'log-truncated');

  it('every event of changes.json carries a cursor object, and every scoped one a scopedId', () => {
    expect(changes.items.every((item) => 'streamCursor' in item.data)).toBe(true);
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every((item) => typeof item.scopedId === 'string')).toBe(true);
  });

  it('writes offset, a colon and the invariant, equal to the scopedId of each scoped item', () => {
    for (const item of scoped) expect(toStreamCursorString(cursorOf(item)), item.event).toBe(item.scopedId);
  });

  it('writes the reset cursor of a truncation marker as offset 0 and the digest of the empty input', () => {
    const marker = changes.items.find((item) => item.event === 'log-truncated');
    expect(marker && toStreamCursorString(cursorOf(marker))).toBe('0:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  it('is pure: the input is not changed and the same input gives the same text', () => {
    const cursor = Object.freeze({ offset: 0, invariant: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' });
    expect(toStreamCursorString(cursor)).toBe(`0:${cursor.invariant}`);
    expect(toStreamCursorString(cursor)).toBe(toStreamCursorString({ ...cursor }));
  });

  it('is re-exported from the package entry', () => {
    expect(fromEntry).toBe(toStreamCursorString);
  });
});
