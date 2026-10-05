// Tests of the overlays: the mechanical lane tally, the declared derived values of contract-pin.md, the synthetic actors.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SYNTHETIC_ACTORS, buildFixtures, tallyLanes } from './overlays.mjs';
import { FIXTURES } from './registry.mjs';
import { loadExamples } from './generate.mjs';
import { ROOT } from './common.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const LANES = ['planned', 'claimed', 'in_progress', 'for_review', 'in_review', 'approved', 'done', 'blocked', 'canceled'];
const fixtures = buildFixtures({ examples: loadExamples(ROOT), bulk });

test('tallyLanes counts the nine known lanes and leaves null and unknown lanes uncounted', () => {
  const { statusLaneCounts, wpTotal } = tallyLanes([
    { statusLane: 'planned' }, { statusLane: 'planned' }, { statusLane: 'done' },
    { statusLane: null }, { statusLane: 'on_hold' },
  ]);
  assert.deepEqual(Object.keys(statusLaneCounts), LANES);
  assert.equal(statusLaneCounts.planned, 2);
  assert.equal(statusLaneCounts.done, 1);
  assert.equal(wpTotal, 3);
  assert.equal(Object.values(statusLaneCounts).reduce((a, b) => a + b, 0), wpTotal);
});

test('tallyLanes of nothing is nine zeros', () => {
  const { statusLaneCounts, wpTotal } = tallyLanes([]);
  assert.equal(wpTotal, 0);
  assert.deepEqual(Object.values(statusLaneCounts), Array(9).fill(0));
});

test('the overlays build exactly the registered fixtures, in registry order', () => {
  assert.deepEqual(Object.keys(fixtures), Object.keys(FIXTURES));
  assert.equal(Object.keys(fixtures).length, 22);
});

// The declared values of contract-pin.md, "Declared derived values": [wpTotal, blockedCount, doneCount, donePercentage, W].
const DECLARED = {
  detailImplement: [7, 0, 0, 0, 17.8571, 'active', 'in_progress', 'in_progress'],
  detailBothInProgress: [6, 0, 3, 50, 65, 'active', 'in_progress', 'in_progress'],
  detailEarly: [0, 0, 0, 0, 0, 'draft', 'pending', 'pending'],
  detailAllPending: [0, 0, 0, 0, 0, 'draft', 'pending', 'pending'],
  detailAllComplete: [4, 0, 3, 75, 75, 'active', 'complete', 'complete'],
  detailBlockers: [3, 1, 0, 0, 10, 'active', 'in_progress', 'pending'],
  detailBadges: [4, 1, 0, 0, 25, 'active', 'in_progress', 'in_progress'],
  detailSubtasks: [9, 1, 1, 11.1111, 38.3333, 'active', 'in_progress', 'in_progress'],
  detailLongNames: [7, 0, 0, 0, 17.8571, 'active', 'in_progress', 'in_progress'],
  detailCustomGroups: [7, 0, 0, 0, 17.8571, 'active', 'in_progress', 'in_progress'],
  detailUnknownLane: [2, 0, 0, 0, 15, 'active', 'in_progress', 'pending'],
};

test('every detail fixture carries the declared derived values of contract-pin.md', () => {
  let n = 0;
  for (const [name, want] of Object.entries(DECLARED)) {
    const d = fixtures[name];
    const phase = (p) => d.phases.find((x) => x.name === p)?.status;
    assert.deepEqual(
      [d.wpTotal, d.blockedCount, d.progress.doneCount, d.progress.donePercentage, d.progress.weightedPercentage, d.lifecycleStatus, phase('implement'), phase('review')],
      want,
      name,
    );
    n += 1;
  }
  assert.equal(n, 11);
});

test('phases-open fixtures carry three and seven phases whose names are outside the enum', () => {
  const names = (f) => fixtures[f].phases.map((p) => p.name);
  assert.equal(names('detailPhases3').length, 3);
  assert.equal(names('detailPhases7').length, 7);
  for (const n of [...names('detailPhases3'), ...names('detailPhases7')]) {
    assert.ok(!['specify', 'plan', 'tasks', 'implement', 'review'].includes(n), n);
  }
});

test('detailUnknownLane has one unknown-lane and one null-lane work package, uncounted', () => {
  const lanes = fixtures.detailUnknownLane.workPackages.map((w) => w.statusLane);
  assert.deepEqual(lanes, ['planned', 'in_progress', 'on_hold', null]);
  assert.equal(fixtures.detailUnknownLane.wpTotal, 2);
});

test('detailAllComplete: accepted-at is null and the next action is the consolidate sentence', () => {
  assert.equal(fixtures.detailAllComplete.acceptedAt, null);
  assert.match(fixtures.detailAllComplete.nextAction, /consolidate/);
  assert.ok(fixtures.detailAllComplete.nextAction.includes(fixtures.detailAllComplete.slug));
});

test('actors come only from SYNTHETIC_ACTORS and exist on detailBadges', () => {
  assert.ok(SYNTHETIC_ACTORS.length >= 2);
  const seen = [];
  for (const [name, d] of Object.entries(fixtures)) {
    for (const wp of d.workPackages ?? []) if ('actor' in wp) seen.push([name, wp.actor]);
  }
  assert.equal(seen.length, 1);
  assert.deepEqual(seen[0][0], 'detailBadges');
  assert.ok(SYNTHETIC_ACTORS.includes(seen[0][1]));
});

test('host stale appears only on host-kind pages, on exactly the declared items', () => {
  const stale = (f) => fixtures[f].items.filter((i) => i.stale === true).map((i) => i.friendlyName);
  assert.equal(stale('pageMixed').length, 1);
  assert.equal(stale('pageFull').length, 2);
  assert.equal(stale('pageLast').length, 2);
  for (const f of ['pageFirst', 'pageExhausted', 'pageLong', 'pageLongNames']) {
    assert.equal(fixtures[f].items.filter((i) => 'stale' in i).length, 0, f);
  }
});

test('page shapes: counts, next-page flags', () => {
  assert.equal(fixtures.pageMixed.items.length, 6);
  assert.equal(fixtures.pageMixed.pageInfo.hasNextPage, true);
  assert.equal(fixtures.pageFull.items.length, 9);
  assert.equal(fixtures.pageLast.items.length, 9);
  assert.equal(fixtures.pageLast.pageInfo.hasNextPage, false);
  assert.equal(fixtures.pageLast.pageInfo.nextPageCursor, null);
  assert.equal(fixtures.pageLong.items.length, 40);
  assert.equal(fixtures.pageExhausted.items.length, 0);
  assert.equal(fixtures.pageLongNames.items.length, 1);
  assert.equal(fixtures.projectEmpty.missionCount, 0);
});
