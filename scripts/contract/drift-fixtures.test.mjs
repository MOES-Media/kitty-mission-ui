// Tests of the Drift fixtures of mission-ui#10: the six contract examples carried through unchanged and the overlays,
// each asserted on the property that makes it the fixture it is.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROOT } from './common.mjs';
import { driftFailures } from './check.mjs';
import { buildFixtures } from './overlays.mjs';
import { FIXTURES } from './registry.mjs';
import { loadExamples } from './generate.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const examples = loadExamples(ROOT);
const fixtures = buildFixtures({ examples, bulk });

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const NAMES = {
  reportPopulated: ['DriftReport', 'valid'],
  reportClean: ['DriftReport', 'valid'],
  reportCorruptJson: ['DriftReport', 'valid'],
  reportTruncated: ['DriftReport', 'valid'],
  refusalMissionNotFound: ['DriftRefusal', 'valid'],
  refusalScanUnreadable: ['DriftRefusal', 'valid'],
  reportUnknownKind: ['DriftReport', 'relaxed'],
  reportUnknownSeverity: ['DriftReport', 'relaxed'],
  reportUnknownAuthority: ['DriftReport', 'relaxed'],
  reportUnknownRemedy: ['DriftReport', 'relaxed'],
  reportUnknownSourceCode: ['DriftReport', 'valid'],
  reportOneSidedLane: ['DriftReport', 'valid'],
  reportManyLanes: ['DriftReport', 'valid'],
  reportLongSlugMission: ['DriftReport', 'valid'],
  reportMissionUnlisted: ['DriftReport', 'valid'],
  reportScoped: ['DriftReport', 'valid'],
  reportScopedForeign: ['DriftReport', 'valid'],
};

test('the registry holds the 17 Drift entries with their schema and kind, and the relaxed ones name drift-vocabulary-open', () => {
  let n = 0;
  for (const [name, [schema, kind]] of Object.entries(NAMES)) {
    assert.equal(FIXTURES[name]?.schema, schema, name);
    assert.equal(FIXTURES[name]?.kind, kind, name);
    assert.equal(FIXTURES[name]?.relaxation, kind === 'relaxed' ? 'drift-vocabulary-open' : undefined, name);
    n += 1;
  }
  assert.equal(n, 17);
  assert.equal(Object.keys(FIXTURES).filter((k) => /^(report|refusal)[A-Z]/.test(k)).length, 17, 'no other fixture is named like a Drift one');
});

test('the six contract examples are carried through byte for byte (deep-equal to the vendored example)', () => {
  assert.deepEqual(fixtures.reportPopulated, examples['DriftReport.populated']);
  assert.deepEqual(fixtures.reportClean, examples['DriftReport.clean']);
  assert.deepEqual(fixtures.reportCorruptJson, examples['DriftReport.corrupt-json']);
  assert.deepEqual(fixtures.reportTruncated, examples['DriftReport.truncated']);
  assert.deepEqual(fixtures.refusalMissionNotFound, examples['DriftRefusal.mission-not-found']);
  assert.deepEqual(fixtures.refusalScanUnreadable, examples['DriftRefusal.scan-unreadable']);
  assert.equal(fixtures.reportClean.findings.length, 0);
  assert.equal(fixtures.reportTruncated.truncated, true);
  assert.equal(fixtures.reportPopulated.findings.length, 5);
  assert.equal(fixtures.refusalMissionNotFound.code, 'mission_not_found');
  assert.equal(fixtures.refusalScanUnreadable.code, 'drift_scan_unreadable');
});

test('a fixture is a copy: mutating it does not change the vendored example the next build reads', () => {
  const first = buildFixtures({ examples, bulk });
  first.reportPopulated.findings.pop();
  assert.equal(buildFixtures({ examples, bulk }).reportPopulated.findings.length, 5);
  assert.equal(examples['DriftReport.populated'].findings.length, 5);
});

// ---- the vocabulary overlays: exactly one field of one finding differs from the contract's closed set ----
const KNOWN = { kind: ['snapshot_disagrees_with_event_log', 'snapshot_or_event_log_missing', 'lane_branch_missing'], severity: ['error', 'warning'], authority: ['event_log', 'git'], remedy: ['materialize_status', null] };
const foreign = (report, field) => report.findings.filter((f) => !KNOWN[field].includes(f[field]));

test('each vocabulary overlay carries exactly one foreign word in its own field, and no other field is foreign', () => {
  const cases = { reportUnknownKind: 'kind', reportUnknownSeverity: 'severity', reportUnknownAuthority: 'authority', reportUnknownRemedy: 'remedy' };
  let n = 0;
  for (const [name, field] of Object.entries(cases)) {
    assert.equal(foreign(fixtures[name], field).length, 1, `${name}: one finding with a foreign ${field}`);
    for (const other of Object.keys(KNOWN).filter((k) => k !== field)) assert.equal(foreign(fixtures[name], other).length, 0, `${name}: ${other} stays in the contract set`);
    assert.equal(fixtures[name].findings.length, fixtures.reportPopulated.findings.length, `${name}: the populated list with one word changed`);
    n += 1;
  }
  assert.equal(n, 4);
});

test('reportUnknownSourceCode: a code outside the four, matching the contract pattern, so it needs no relaxation', () => {
  const codes = fixtures.reportUnknownSourceCode.findings.map((f) => f.sourceCode).filter((c) => c !== null);
  const odd = codes.filter((c) => !['SNAPSHOT_DRIFT', 'SNAPSHOT_DRIFT_PROVENANCE', 'SNAPSHOT_DRIFT_TERMINAL', 'CORRUPT_JSON'].includes(c));
  assert.equal(odd.length, 1);
  assert.match(odd[0], /^[A-Z][A-Z0-9_]*$/);
  assert.equal(FIXTURES.reportUnknownSourceCode.kind, 'valid');
});

// ---- lane rows ----
test('reportOneSidedLane: one row with a null persisted lane, one with a null derived lane, none with both null', () => {
  const rows = fixtures.reportOneSidedLane.findings.flatMap((f) => f.laneComparison);
  assert.equal(rows.length, 2);
  assert.equal(rows.filter((r) => r.persistedStatusLane === null && r.derivedStatusLane !== null).length, 1);
  assert.equal(rows.filter((r) => r.derivedStatusLane === null && r.persistedStatusLane !== null).length, 1);
});

test('reportManyLanes: one finding with exactly 40 distinct, sorted lane rows', () => {
  assert.equal(fixtures.reportManyLanes.findings.length, 1);
  const rows = fixtures.reportManyLanes.findings[0].laneComparison;
  assert.equal(rows.length, 40);
  assert.equal(new Set(rows.map((r) => r.wpId)).size, 40);
  assert.deepEqual(driftFailures(fixtures.reportManyLanes), []);
});

// ---- Mission identity overlays ----
test('reportLongSlugMission and reportMissionUnlisted each name one Mission the populated report does not', () => {
  const populated = new Set(fixtures.reportPopulated.findings.map((f) => f.missionId));
  for (const name of ['reportLongSlugMission', 'reportMissionUnlisted']) {
    const ids = new Set(fixtures[name].findings.map((f) => f.missionId));
    assert.equal(ids.size, 1, name);
    const [id] = [...ids];
    assert.match(id, ULID, name);
    assert.equal(populated.has(id), false, `${name}: not a populated-report Mission`);
  }
  assert.notEqual(fixtures.reportLongSlugMission.findings[0].missionId, fixtures.reportMissionUnlisted.findings[0].missionId);
});

test('reportScoped: every finding belongs to one Mission; reportScopedForeign: the same plus exactly one finding of another', () => {
  const ids = (name) => fixtures[name].findings.map((f) => f.missionId);
  assert.equal(new Set(ids('reportScoped')).size, 1);
  assert.equal(fixtures.reportScoped.findings.length, 3);
  const mine = ids('reportScoped')[0];
  assert.equal(ids('reportScopedForeign').filter((i) => i !== mine).length, 1);
  assert.equal(ids('reportScopedForeign').filter((i) => i === mine).length, 3);
});

test('every Drift report is coherent: sorted, unique keys, sorted lane rows, no row with equal sides', () => {
  let n = 0;
  for (const name of Object.keys(FIXTURES).filter((k) => FIXTURES[k].schema === 'DriftReport')) {
    assert.deepEqual(driftFailures(fixtures[name]), [], name);
    n += 1;
  }
  assert.equal(n, 15);
});
