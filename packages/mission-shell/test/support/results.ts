// Result builders for the logic tests.
import type { ReadOp, Result } from '../../src/client/port';

/** A success whose value the test shapes itself (the scheduler never looks inside, except at `pageInfo`). */
export function ok<Op extends ReadOp>(op: Op, value: unknown): Result<Op> {
  void op;
  return { ok: true, value } as Result<Op>;
}

export function unavailable<Op extends ReadOp>(op: Op): Result<Op> {
  void op;
  return { ok: false, unavailable: 'transport' };
}

/** A page of a chain: `tag` identifies it, `next` is its `nextPageCursor`. */
export function page(tag: string, next: string | null): { tag: string; items: string[]; pageInfo: { hasNextPage: boolean; nextPageCursor: string | null; pageSize: number } } {
  return { tag, items: [tag], pageInfo: { hasNextPage: next !== null, nextPageCursor: next, pageSize: 1 } };
}
