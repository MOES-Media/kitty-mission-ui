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
  assert.equal(Object.keys(fixtures).length, 89);
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
    for (const item of d.workPackages ?? []) if ('actor' in item) seen.push([name, item.actor]);
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

// ---- the Projects screen fixtures (mission-ui#9): two host overlays the contract examples do not give ----
test('projectUnknownHealth: a project whose health is outside the enum, every other member as the example', () => {
  const base = loadExamples(ROOT)['Project.example'];
  const p = fixtures.projectUnknownHealth;
  assert.equal(p.health, 'unheard_of_health');
  assert.deepEqual({ ...p, health: base.health }, base);
  assert.equal(Object.keys(p).length, 7);
});

test('projectLong: a 255-character branch, a 64-character version and a long name, all matching the contract patterns', () => {
  const p = fixtures.projectLong;
  assert.equal(Object.keys(p).length, 7);
  assert.equal(p.currentBranch.length, 255);
  assert.match(p.currentBranch, /^[A-Za-z0-9][A-Za-z0-9._/-]*$/);
  assert.equal(p.specKittyVersion.length, 64);
  assert.match(p.specKittyVersion, /^[0-9A-Za-z][0-9A-Za-z.+!_-]{0,63}$/);
  assert.ok(p.name.length > 100 && !/\s/.test(p.name.slice(0, 60)), 'a long unbroken name');
  assert.equal(p.health, 'healthy');
  assert.equal(Number.isInteger(p.missionCount) && p.missionCount > 0, true);
});

// ---- the Work Package fixtures: the lane-rewrite rule and the facts the pairing relies on ----
const wp = (name) => fixtures[name];
const DETAIL_IDS = ['T017', 'T018', 'T019'];

test('wpPopulated: in progress after two events, three subtasks equal to detailPopulated, one dependency, the same owned files', () => {
  const d = wp('wpPopulated');
  assert.equal(d.statusLane, 'in_progress');
  assert.equal(d.history.length, 2);
  assert.deepEqual(d.subtasks, { T017: 'done', T018: 'in_progress', T019: 'planned' });
  assert.deepEqual(d.subtaskProgress, { done: 1, total: 3 });
  assert.deepEqual(Object.keys(d.subtasks), fixtures.detailPopulated.subtasks.map((x) => x.id));
  assert.deepEqual(Object.keys(d.subtasks), DETAIL_IDS);
  assert.deepEqual(d.dependencies, ['WP03']);
  assert.deepEqual(d.dependencies, fixtures.detailPopulated.dependencies.map((x) => x.wpId));
  assert.deepEqual(d.ownedFiles, fixtures.detailPopulated.ownedFiles.map((x) => x.pattern));
  assert.equal(d.ownedFiles.length, 3);
  assert.deepEqual(d.review, { latestResult: null, override: null });
  assert.equal(d.lastEventId, d.history[1].eventId);
  assert.equal(d.lastTransitionAt, d.history[1].at);
});

test('the lane overlays end their history on the lane and carry the review the table of contract-pin.md gives', () => {
  const want = {
    wpPopulated: ['in_progress', 2, [1, 3], null],
    wpReviewNone: ['for_review', 3, [3, 3], null],
    wpChangesRequested: ['in_progress', 4, [1, 3], 'changes_requested'],
    wpApproved: ['approved', 6, [3, 3], 'approved'],
    wpDone: ['done', 7, [3, 3], 'approved'],
    wpReady: ['planned', 1, [0, 3], null],
    wpBlocked: ['planned', 1, [0, 3], null],
  };
  let n = 0;
  for (const [name, [lane, entries, progress, verdict]] of Object.entries(want)) {
    const d = wp(name);
    assert.equal(d.statusLane, lane, name);
    assert.equal(d.history.length, entries, name);
    assert.equal(d.history.at(-1).toStatusLane, lane, name);
    assert.deepEqual([d.subtaskProgress.done, d.subtaskProgress.total], progress, name);
    assert.equal(d.review.latestResult?.verdict ?? null, verdict, name);
    assert.equal(d.lastEventId, d.history.at(-1).eventId, name);
    assert.equal(d.lastTransitionAt, d.history.at(-1).at, name);
    n += 1;
  }
  assert.equal(n, 7);
  assert.equal(wp('wpChangesRequested').history[3].reviewVerdict, 'changes_requested');
  assert.equal(wp('wpApproved').history[5].reviewVerdict, 'approved');
});

test('wpReady and wpBlocked: readiness follows the dependencies, ready to start only when satisfied', () => {
  assert.deepEqual([wp('wpReady').readyToStart, wp('wpReady').readiness.satisfied, wp('wpReady').dependencies], [true, true, ['WP03']]);
  assert.deepEqual(wp('wpBlocked').dependencies, ['WP01', 'WP02']);
  assert.deepEqual(wp('wpBlocked').readiness, { satisfied: false, unsatisfied: ['WP01', 'WP02'] });
  assert.equal(wp('wpBlocked').readyToStart, false);
  assert.deepEqual(fixtures.detailDepsBlocked.dependencies.map((x) => x.wpId), wp('wpBlocked').readiness.unsatisfied);
  assert.deepEqual(fixtures.detailDepsBlocked.dependencies.map((x) => x.statusLane), ['planned', 'in_progress']);
  assert.ok(fixtures.detailDepsBlocked.dependencies.every((x) => x.title.length > 0));
});

test('named cases: cancellation, history, staleness, nulls and the long and bulk documents', () => {
  assert.equal(wp('wpCanceledSynthetic').cancellation.reasonSource, 'synthetic');
  assert.equal(wp('wpCanceled').cancellation.reasonSource, 'operator');
  assert.equal(wp('wpCanceledNullReason').cancellation.reason, null);
  const rich = wp('wpHistoryRich');
  assert.equal(rich.history[0].fromStatusLane, null);
  assert.equal(rich.forceCount, rich.history.filter((e) => e.force).length);
  assert.ok(rich.forceCount >= 1);
  assert.ok(rich.history.some((e) => e.reason !== null));
  assert.deepEqual([wp('wpStale').staleness.status, wp('wpFresh').staleness.status, wp('wpNotApplicable').staleness.status], ['stale', 'fresh', 'not_applicable']);
  assert.equal(typeof wp('wpStale').staleness.minutesSinceCommit, 'number');
  assert.equal(typeof wp('wpStale').staleness.reason, 'string');
  assert.equal(Object.hasOwn(wp('wpStalenessOmitted'), 'staleness'), false);
  assert.equal(Object.hasOwn(wp('wpPopulated'), 'staleness'), true);
  const nulls = wp('wpFactsNull');
  assert.deepEqual([nulls.executionMode, nulls.priority, nulls.mergeTargetBranch, nulls.phaseLabel, nulls.implementerOfRecord], [null, null, null, null, null]);
  assert.deepEqual(nulls.trackerRefs, []);
  assert.equal(wp('wpBulkHistory').history.length, 60);
  assert.equal(wp('wpBulkHistory').history.at(-1).toStatusLane, wp('wpBulkHistory').statusLane);
  assert.equal(fixtures.detailLong.subtasks.length, 40);
  assert.equal(fixtures.detailLong.ownedFiles.length, 100);
  assert.ok(wp('wpLong').title.length > 200 && wp('wpLong').review.latestResult !== null);
  const lanes = wp('wpUnknownLane');
  assert.equal(lanes.statusLane, 'on_hold');
  assert.equal(lanes.history.at(-1).toStatusLane, 'on_hold');
  assert.ok(Object.values(lanes.subtasks).includes('on_hold'));
  assert.equal(wp('wpWithPrompt').promptMarkdown.length > 0, true);
});

test('detail fixtures: the one-member variations of detailPopulated', () => {
  const base = fixtures.detailPopulated;
  assert.equal(base.reviewCycles.length, 2);
  assert.deepEqual(fixtures.detailNoCycles.reviewCycles, []);
  assert.equal(fixtures.detailSubtasksNone.subtasks.length, 0);
  assert.equal(fixtures.detailDepsNone.dependencies.length, 0);
  assert.equal(fixtures.detailOwnedNone.ownedFiles.length, 0);
  assert.deepEqual(fixtures.detailSubtaskNulls.subtasks.filter((x) => x.title === null && x.statusLane === null).length, 1);
  assert.deepEqual(fixtures.detailDepNullLane.dependencies.map((x) => [x.statusLane, x.title === x.wpId]), [[null, true]]);
  assert.equal(fixtures.detailWorkspaceNoWorktree.workspace.worktreePresent, false);
  assert.ok(fixtures.detailWorkspaceNoWorktree.workspace.laneId.length > 0);
  assert.equal(fixtures.detailLinksPromptNull.artifactReferences.prompt, null);
  assert.notEqual(fixtures.detailLinksPromptNull.artifactReferences.spec, null);
  assert.deepEqual(fixtures.detailLinksNone.artifactReferences, { prompt: null, spec: null });
  assert.ok(JSON.stringify(fixtures.detailRedaction).includes('[path]') && JSON.stringify(fixtures.detailRedaction).includes('[email]'));
  assert.deepEqual(fixtures.detailRefusalNotFound.code, 'not_found');
  assert.deepEqual(fixtures.detailRefusalUnreadable.code, 'source_unreadable');
  assert.equal(Object.hasOwn(fixtures.detailOmittedProvisional, 'reviewCycles'), false);
  assert.equal(Object.hasOwn(fixtures.detailOmittedProvisional, 'workspace'), false);
  assert.ok(fixtures.detailUnknownLanes.subtasks.some((x) => x.statusLane === 'on_hold') && fixtures.detailUnknownLanes.dependencies.some((x) => x.statusLane === 'on_hold'));
});
