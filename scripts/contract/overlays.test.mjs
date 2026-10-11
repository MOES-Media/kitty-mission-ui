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
  assert.equal(Object.keys(fixtures).length, 157);
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

test('projectSchemaDrift and projectAllNull: the vendored examples, byte for byte', () => {
  const ex = loadExamples(ROOT);
  assert.deepEqual(fixtures.projectSchemaDrift, ex['Project.schema-drift']);
  assert.deepEqual(fixtures.projectAllNull, ex['Project.all-null']);
  assert.equal(fixtures.projectAllNull.currentBranch, null);
  assert.equal(fixtures.projectSchemaDrift.currentBranch, 'topic/example');
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

// ---- the Artifact Viewer documents: 13 contract examples and 17 overlays (30 registered documents) ----
const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const ARTIFACT_NAMES = Object.keys(FIXTURES).filter((n) => FIXTURES[n].schema.startsWith('Artifact'));
const CONTENT_NAMES = ARTIFACT_NAMES.filter((n) => FIXTURES[n].schema === 'ArtifactContent');
const REFUSAL_NAMES = ARTIFACT_NAMES.filter((n) => FIXTURES[n].schema === 'ArtifactRefusal');
const pathsOf = (listing) => listing.entries.map((e) => e.path);

test('the thirty Artifact Viewer documents are registered under the names of contracts/contract-pin.md, in that order', () => {
  assert.deepEqual(ARTIFACT_NAMES, [
    'listingPopulated', 'listingTruncated', 'contentMarkdown', 'contentRedacted', 'contentJson', 'contentEmpty',
    'refusalInvalidPath', 'refusalNotFound', 'refusalTooLarge', 'refusalNotText', 'refusalSecret', 'refusalUnreadable', 'refusalListingUnreadable',
    'listingWithOpenFiles', 'listingEmpty', 'listingUnreadableRows', 'listingUnknownKind', 'contentUnknownKind', 'refusalUnknownCode',
    'listingLongNames', 'listingDeep', 'contentFeatures', 'contentHostile', 'contentYaml', 'contentJsonl', 'contentCsv', 'contentPlain',
    'contentBom', 'contentPrompt', 'contentReviewCycle',
  ]);
  assert.equal(ARTIFACT_NAMES.length, 30);
  assert.equal(CONTENT_NAMES.length, 14);
  assert.equal(REFUSAL_NAMES.length, 8);
});

test('the thirteen examples are the vendored examples, untouched', () => {
  const ex = loadExamples(ROOT);
  const pairs = [
    ['listingPopulated', 'ArtifactListing.populated'], ['listingTruncated', 'ArtifactListing.truncated'],
    ['contentMarkdown', 'ArtifactContent.markdown'], ['contentRedacted', 'ArtifactContent.redacted'],
    ['contentJson', 'ArtifactContent.json'], ['contentEmpty', 'ArtifactContent.empty'],
    ['refusalInvalidPath', 'ArtifactRefusal.invalid-artifact-path'], ['refusalNotFound', 'ArtifactRefusal.not-found'],
    ['refusalTooLarge', 'ArtifactRefusal.artifact-too-large'], ['refusalNotText', 'ArtifactRefusal.artifact-not-text'],
    ['refusalSecret', 'ArtifactRefusal.artifact-secret'], ['refusalUnreadable', 'ArtifactRefusal.artifact-unreadable'],
    ['refusalListingUnreadable', 'ArtifactRefusal.artifact-listing-unreadable'],
  ];
  assert.equal(pairs.length, 13);
  for (const [name, example] of pairs) assert.deepEqual(fixtures[name], ex[example], name);
  assert.equal(fixtures.listingPopulated.truncated, false);
  assert.equal(fixtures.listingTruncated.truncated, true);
  assert.deepEqual(REFUSAL_NAMES.slice(0, 7).map((n) => fixtures[n].code), [
    'invalid_artifact_path', 'not_found', 'artifact_too_large', 'artifact_not_text', 'artifact_secret', 'artifact_unreadable', 'artifact_listing_unreadable',
  ]);
});

test('listingWithOpenFiles: the populated entries untouched plus one entry per open path, in byte order, none truncated', () => {
  const base = fixtures.listingPopulated;
  const l = fixtures.listingWithOpenFiles;
  assert.equal(l.missionId, base.missionId);
  assert.equal(l.truncated, false);
  const paths = pathsOf(l);
  assert.deepEqual(paths, [...paths].sort(byteOrder), 'byte order');
  assert.equal(new Set(paths).size, paths.length, 'no duplicate path');
  for (const e of base.entries) assert.deepEqual(l.entries.find((x) => x.path === e.path), e, e.path);
  const added = paths.filter((p) => !pathsOf(base).includes(p));
  assert.deepEqual(added.sort(byteOrder), ['contracts/schema.json', 'notes/empty.txt', 'notes/handoff.md', fixtures.contentCsv.path, fixtures.contentJsonl.path, fixtures.contentPlain.path].sort(byteOrder));
  assert.equal(added.length, 6);
  // every open path of the content documents is in the listing, with the content's own kind
  let n = 0;
  for (const name of CONTENT_NAMES.filter((x) => x !== 'contentUnknownKind')) {
    const c = fixtures[name];
    const entry = l.entries.find((e) => e.path === c.path);
    assert.ok(entry, `${name}: ${c.path} is in the listing`);
    assert.equal(entry.kind, c.kind, name);
    assert.equal(entry.readable, true, name);
    n += 1;
  }
  assert.equal(n, 13);
  for (const e of l.entries.filter((x) => added.includes(x.path))) assert.equal(e.sizeBytes, Buffer.byteLength(fixtures[CONTENT_NAMES.find((nm) => fixtures[nm].path === e.path)].content), e.path);
});

test('listingEmpty, listingUnreadableRows, listingLongNames and listingDeep have the shapes the stories need', () => {
  assert.deepEqual(fixtures.listingEmpty.entries, []);
  assert.equal(fixtures.listingEmpty.truncated, false);
  const u = fixtures.listingUnreadableRows;
  assert.equal(u.entries.length, 3);
  assert.deepEqual(u.entries.map((e) => e.readable), [false, false, false]);
  assert.deepEqual(pathsOf(u), [...pathsOf(u)].sort(byteOrder));
  const long = fixtures.listingLongNames;
  const names = long.entries.map((e) => e.path.split('/').at(-1));
  assert.equal(names.filter((x) => x.length === 200).length, 1, 'one 200-character file name');
  const longest = Math.max(...long.entries.map((e) => e.path.length));
  assert.ok(longest >= 480 && longest <= 512, `a path near 512 characters (${longest})`);
  assert.deepEqual(pathsOf(long), [...pathsOf(long)].sort(byteOrder));
  const deep = fixtures.listingDeep;
  const folders = Math.max(...deep.entries.map((e) => e.path.split('/').length - 1));
  assert.equal(folders, 10, 'ten nested folders');
  assert.deepEqual(pathsOf(deep), [...pathsOf(deep)].sort(byteOrder));
});

test('the unknown-kind pair: one listing entry and its content share a path and a kind outside the twelve', () => {
  const known = new Set(fixtures.listingPopulated.entries.map((e) => e.kind));
  const l = fixtures.listingUnknownKind;
  const c = fixtures.contentUnknownKind;
  assert.equal(l.entries.length, 1);
  assert.equal(l.entries[0].path, c.path);
  assert.equal(l.entries[0].kind, c.kind);
  assert.ok(l.entries[0].kind.length > 0);
  assert.equal(known.has(c.kind), false);
  const twelve = ['review_cycle', 'work_package_prompt', 'spec', 'plan', 'tasks', 'data_model', 'quickstart', 'analysis_report', 'research', 'contract', 'checklist', 'other'];
  assert.equal(twelve.includes(c.kind), false);
  assert.notEqual(fixtures.listingUnknownKind, fixtures.listingEmpty);
});

test('refusalUnknownCode: a code outside the seven with status 500', () => {
  const r = fixtures.refusalUnknownCode;
  const seven = REFUSAL_NAMES.slice(0, 7).map((n) => fixtures[n].code);
  assert.equal(seven.length, 7);
  assert.equal(seven.includes(r.code), false);
  assert.ok(r.code.length > 0);
  assert.equal(r.status, 500);
});

test('contentFeatures: every markdown element of the renderer, at path plan.md, and never the whole word the terminology check forbids', () => {
  const c = fixtures.contentFeatures;
  assert.equal(c.path, 'plan.md');
  assert.equal(c.kind, 'plan');
  assert.equal(c.mediaType, 'text/markdown');
  assert.equal(c.sizeBytes, Buffer.byteLength(c.content));
  assert.equal(/\bfeature/i.test(c.content), false, 'the whole word, any case');
  const text = c.content;
  const each = {
    'heading levels 1 to 6': [/^# /m, /^## /m, /^### /m, /^#### /m, /^##### /m, /^###### /m],
    'ordered list': [/^1\. /m],
    'unordered list': [/^- /m],
    'nested list': [/^ {2,4}- /m],
    'table with a header row': [/^\|.*\|\n\|[ :|-]+\|/m],
    'fenced code': [/^```/m],
    'indented code': [/\n\n {4}\S/],
    'inline code': [/`[^`\n]+`/],
    'block quote': [/^> /m],
    'thematic break': [/^\*\*\*$/m],
    emphasis: [/(?<![*\w])\*[^*\n]+\*(?![*\w])/],
    strong: [/\*\*[^*\n]+\*\*/],
    strikethrough: [/~~[^~\n]+~~/],
    'internal link': [/\]\((?:data-model\.md|tasks\/WP01-example\.md|spec\.md)[^)]*\)/],
    'external link': [/\]\(https:\/\/[^)]+\)/],
    image: [/!\[[^\]]*\]\([^)]+\)/],
  };
  let n = 0;
  for (const [what, res] of Object.entries(each)) {
    for (const re of res) assert.ok(re.test(text), `${what}: ${re}`);
    n += 1;
  }
  assert.equal(n, 16);
  const wide = text.split('\n').find((line) => /^\|/.test(line));
  assert.ok(wide.split('|').length - 2 >= 8, 'a wide table');
  assert.ok(Math.max(...text.split('\n').map((l) => l.length)) < 20000);
});

test('contentHostile: hostile text at research.md, with no credential-shaped string', () => {
  const c = fixtures.contentHostile;
  assert.equal(c.path, 'research.md');
  assert.equal(c.kind, 'research');
  assert.equal(c.mediaType, 'text/markdown');
  assert.equal(c.sizeBytes, Buffer.byteLength(c.content));
  for (const re of [/<script/i, /javascript:/i, /!\[[^\]]*\]\(https?:\/\//, /<iframe/i, /onerror=/i]) assert.ok(re.test(c.content), String(re));
  assert.ok(/^```/m.test(c.content), 'an unclosed fence is among the constructs');
  assert.equal((c.content.match(/^```/gm) ?? []).length % 2, 1, 'the fence is never closed');
  const credential = [/gh[pousr]_[A-Za-z0-9]{36}/, /github_pat_\w{22,}/, /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/, new RegExp('-----BEGIN [A-Z ]*PRIVATE ' + 'KEY-----')];
  for (const re of credential) assert.equal(re.test(c.content), false, String(re));
  assert.equal(/\bfeature/i.test(c.content), false);
});

test('the media-type overlays: path and media type changed, the content kept short', () => {
  const want = [
    ['contentYaml', 'contracts/api.yaml', 'application/yaml', 'contract'],
    ['contentJsonl', null, 'application/x-ndjson', 'other'],
    ['contentCsv', null, 'text/csv', 'other'],
    ['contentPlain', null, 'text/plain', 'other'],
  ];
  assert.equal(want.length, 4);
  for (const [name, path, mediaType, kind] of want) {
    const c = fixtures[name];
    if (path) assert.equal(c.path, path, name);
    else assert.ok(c.path.startsWith('notes/'), name);
    assert.equal(c.mediaType, mediaType, name);
    assert.equal(c.kind, kind, name);
    assert.ok(c.content.length > 0 && c.content.length < 600, `${name} is short`);
    assert.equal(c.sizeBytes, Buffer.byteLength(c.content), name);
  }
  assert.ok(fixtures.contentJsonl.path.endsWith('.jsonl'));
  assert.ok(fixtures.contentCsv.path.endsWith('.csv'));
  assert.ok(fixtures.contentPlain.path.endsWith('.txt'));
});

test('contentBom starts with U+FEFF and counts its three bytes; the prompt and the review cycle carry their kinds and paths', () => {
  const b = fixtures.contentBom;
  assert.equal(b.path, 'notes/with space.md');
  assert.equal(b.content.charCodeAt(0), 0xfeff);
  assert.equal(b.content.charCodeAt(1) === 0xfeff, false);
  assert.equal(b.sizeBytes, Buffer.byteLength(b.content));
  assert.equal(fixtures.contentPrompt.kind, 'work_package_prompt');
  assert.equal(fixtures.contentPrompt.path, 'tasks/WP01-example.md');
  assert.equal(fixtures.contentReviewCycle.kind, 'review_cycle');
  assert.equal(fixtures.contentReviewCycle.path, 'tasks/WP01-example/review-cycle-1.md');
  for (const n of ['contentPrompt', 'contentReviewCycle']) assert.equal(fixtures[n].mediaType, 'text/markdown');
});
