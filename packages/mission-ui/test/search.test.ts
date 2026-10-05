import { describe, expect, it } from 'vitest';
import { makeMission } from '../src/contract/bulk.js';
import type { MissionOverviewView } from '../src/contract/types.js';
import { FILTERS } from '../src/defaults/index.js';
import { matchesMission } from '../src/logic/search.js';

function mission(over: Partial<MissionOverviewView>): MissionOverviewView {
  return { ...makeMission(1), friendlyName: 'Alpha Beta', slug: 'alpha-beta-01', missionType: 'software-dev', topology: 'lanes', ...over };
}

const draft = mission({ lifecycleStatus: 'draft' });
const staleActive = mission({ lifecycleStatus: 'active', stale: true });
const discarded = mission({ lifecycleStatus: 'discarded' });
const planned = mission({ lifecycleStatus: 'planned' });
const done = mission({ lifecycleStatus: 'done' });
const active = mission({ lifecycleStatus: 'active' });

describe('matchesMission: the status filter', () => {
  it('the filter ids are the six the screen offers', () => {
    expect(FILTERS.map((f) => f.id)).toEqual(['all', 'active', 'planned', 'done', 'stale', 'discarded']);
  });

  it('all matches every Mission, a draft included', () => {
    for (const m of [draft, staleActive, discarded, planned, done, active]) expect(matchesMission(m, 'all', '')).toBe(true);
  });

  it('each lifecycle filter matches its own lifecycle value only', () => {
    const cases: Array<[string, MissionOverviewView, MissionOverviewView[]]> = [
      ['active', active, [draft, discarded, planned, done]],
      ['planned', planned, [draft, discarded, active, done]],
      ['done', done, [draft, discarded, active, planned]],
      ['discarded', discarded, [draft, active, planned, done]],
    ];
    let ran = 0;
    for (const [id, yes, no] of cases) {
      expect(matchesMission(yes, id, ''), id).toBe(true);
      for (const other of no) expect(matchesMission(other, id, ''), id).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('stale matches by the flag, whatever the lifecycle; a stale and active Mission is under both', () => {
    expect(matchesMission(staleActive, 'stale', '')).toBe(true);
    expect(matchesMission(staleActive, 'active', '')).toBe(true);
    expect(matchesMission(active, 'stale', '')).toBe(false);
    expect(matchesMission(mission({ lifecycleStatus: 'done', stale: false }), 'stale', '')).toBe(false);
  });

  it('a draft appears under All only', () => {
    const hits = FILTERS.filter((f) => matchesMission(draft, f.id, '')).map((f) => f.id);
    expect(hits).toEqual(['all']);
  });

  it('a stale draft is still under All only: a draft never appears under Stale or any other status (C-06, operator ruling)', () => {
    const staleDraft = mission({ lifecycleStatus: 'draft', stale: true });
    const hits = FILTERS.filter((f) => matchesMission(staleDraft, f.id, '')).map((f) => f.id);
    expect(hits).toEqual(['all']);
  });

  it('an unknown filter id behaves as All', () => {
    for (const id of ['', 'nonsense', 'constructor', '__proto__']) expect(matchesMission(draft, id, ''), id).toBe(true);
  });
});

describe('matchesMission: the search text', () => {
  const m = mission({ friendlyName: 'Checkout Flow', slug: 'checkout-flow-9', missionType: 'Research', topology: 'single_branch' });

  it('matches name, slug, type and topology, case-insensitively', () => {
    for (const q of ['checkout', 'FLOW', 'flow-9', 'research', 'RESEARCH', 'single_branch', 'Single_Branch']) expect(matchesMission(m, 'all', q), q).toBe(true);
  });

  it('does not match text that is nowhere', () => {
    for (const q of ['payments', 'lanes', 'zzz']) expect(matchesMission(m, 'all', q), q).toBe(false);
  });

  it('trims the query; blank means no query', () => {
    expect(matchesMission(m, 'all', '   checkout  ')).toBe(true);
    expect(matchesMission(m, 'all', '   ')).toBe(true);
    expect(matchesMission(m, 'all', '')).toBe(true);
  });

  it('treats the query as plain text, not a pattern', () => {
    const dotted = mission({ friendlyName: 'v1.2 release', slug: 'v1-2-release' });
    expect(matchesMission(dotted, 'all', 'v1.2')).toBe(true);
    expect(matchesMission(dotted, 'all', 'v1x2')).toBe(false);
    expect(matchesMission(dotted, 'all', 'a.b')).toBe(false);
    expect(matchesMission(mission({ friendlyName: 'call (draft)' }), 'all', '(')).toBe(true);
    expect(matchesMission(m, 'all', '(')).toBe(false);
    expect(matchesMission(m, 'all', '[')).toBe(false);
    expect(matchesMission(m, 'all', '.*')).toBe(false);
  });

  it('a null type does not match and does not throw (positive control: another field of the same Mission matches)', () => {
    const untyped = mission({ missionType: null, friendlyName: 'Plain' });
    expect(matchesMission(untyped, 'all', 'null')).toBe(false);
    expect(matchesMission(untyped, 'all', 'plain')).toBe(true);
  });

  it('needs the filter AND the query', () => {
    const hit = mission({ friendlyName: 'Needle', lifecycleStatus: 'planned' });
    expect(matchesMission(hit, 'planned', 'needle')).toBe(true);
    expect(matchesMission(hit, 'done', 'needle')).toBe(false);
    expect(matchesMission(hit, 'planned', 'haystack')).toBe(false);
  });
});
