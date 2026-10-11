// T009: resolveOpsLook, the six rows of contracts/sk-ops-screen.md in the order stated.
import { describe, expect, it } from 'vitest';
import { resolveOpsLook, type OpsLookProps } from '../src/logic/ops-look.js';

const row = (profileId: string): { profileId: string } => ({ profileId });
const props = (over: Partial<OpsLookProps>): OpsLookProps => ({ status: 'ready', items: [row('python-pedro')], profile: null, ...over });

describe('resolveOpsLook: the precedence table', () => {
  it('row 1: loading is loading, reason status (whatever else is set)', () => {
    expect(resolveOpsLook(props({ status: 'loading' }))).toEqual({ look: 'loading', reason: 'status' });
    expect(resolveOpsLook(props({ status: 'loading', items: [], profile: 'x' }))).toEqual({ look: 'loading', reason: 'status' });
  });

  it('row 2: error is error, even with rows and a mismatched profile', () => {
    expect(resolveOpsLook(props({ status: 'error' }))).toEqual({ look: 'error', reason: 'status' });
    expect(resolveOpsLook(props({ status: 'error', profile: 'other' }))).toEqual({ look: 'error', reason: 'status' });
  });

  it('row 3: empty is empty, reason status, even with rows', () => {
    expect(resolveOpsLook(props({ status: 'empty' }))).toEqual({ look: 'empty', reason: 'status' });
    expect(resolveOpsLook(props({ status: 'empty', items: [] }))).toEqual({ look: 'empty', reason: 'status' });
  });

  it('row 3: an unknown status collapses to empty', () => {
    const unknown = ['paused', '', 'READY', 'Loading', 'constructor'];
    expect(unknown.length).toBe(5);
    let ran = 0;
    for (const status of unknown) {
      expect(resolveOpsLook(props({ status })), status).toEqual({ look: 'empty', reason: 'status' });
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('row 4: ready with zero items is empty, reason empty-ready (OP-37)', () => {
    expect(resolveOpsLook(props({ items: [] }))).toEqual({ look: 'empty', reason: 'empty-ready' });
    expect(resolveOpsLook(props({ items: [], profile: 'p' }))).toEqual({ look: 'empty', reason: 'empty-ready' });
  });

  it('row 5: ready with a profile and one item of another profile is loading, reason mismatch', () => {
    expect(resolveOpsLook(props({ profile: 'architect-alphonso' }))).toEqual({ look: 'loading', reason: 'mismatch' });
    expect(resolveOpsLook(props({ profile: 'a', items: [row('a'), row('b'), row('a')] }))).toEqual({ look: 'loading', reason: 'mismatch' });
    expect(resolveOpsLook(props({ profile: 'a', items: [row('b'), row('a'), row('a')] }))).toEqual({ look: 'loading', reason: 'mismatch' });
    expect(resolveOpsLook(props({ profile: 'a', items: [row('a'), row('a'), row('b')] }))).toEqual({ look: 'loading', reason: 'mismatch' });
  });

  it('row 5 compares by exact equality: case, padding and an empty profile all disagree', () => {
    const cases: Array<[string, string]> = [
      ['Ops-A', 'ops-a'],
      ['ops-a', 'Ops-A'],
      ['ops-a ', 'ops-a'],
      [' ops-a', 'ops-a'],
      ['ops-a', ''],
      ['', 'ops-a'],
    ];
    for (const [profile, profileId] of cases) {
      expect(resolveOpsLook(props({ profile, items: [row(profileId)] })), `${profile}|${profileId}`).toEqual({ look: 'loading', reason: 'mismatch' });
    }
    expect(cases.length).toBe(6);
    // positive control: the identical strings agree
    expect(resolveOpsLook(props({ profile: 'Ops-A', items: [row('Ops-A')] }))).toEqual({ look: 'ready', reason: 'ready' });
    expect(resolveOpsLook(props({ profile: '', items: [row('')] }))).toEqual({ look: 'ready', reason: 'ready' });
  });

  it('row 6: a null profile makes no check; agreeing items are ready', () => {
    expect(resolveOpsLook(props({ profile: null, items: [row('a'), row('b')] }))).toEqual({ look: 'ready', reason: 'ready' });
    expect(resolveOpsLook(props({ profile: 'a', items: [row('a'), row('a')] }))).toEqual({ look: 'ready', reason: 'ready' });
  });

  it('the status check wins over the item checks (row order)', () => {
    // a mismatched profile and no rows: empty-ready (row 4) comes before the mismatch (row 5)
    expect(resolveOpsLook(props({ items: [], profile: 'x' })).reason).toBe('empty-ready');
    // a mismatch under loading/error/empty status keeps the status look
    expect(resolveOpsLook(props({ status: 'empty', profile: 'x' })).reason).toBe('status');
  });
});

describe('resolveOpsLook: defensive input and purity', () => {
  it('reads only status, items and profile: an Op that is open with an outcome, or closed with none, makes no difference', () => {
    const odd = [
      { profileId: 'p', status: 'open', outcome: 'done' },
      { profileId: 'p', status: 'closed', outcome: null, completedAt: null },
    ];
    expect(resolveOpsLook(props({ items: odd as never }))).toEqual({ look: 'ready', reason: 'ready' });
  });

  it('does not sort, copy or mutate the items', () => {
    const items = [row('b'), row('a')];
    const before = [...items];
    resolveOpsLook(props({ items, profile: null }));
    expect(items).toEqual(before);
    expect(items[0]).toBe(before[0]);
  });

  it('returns a fresh result each call', () => {
    const a = resolveOpsLook(props({}));
    const b = resolveOpsLook(props({}));
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
