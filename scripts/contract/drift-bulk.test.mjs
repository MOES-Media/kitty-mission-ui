// Tests of the bulk Drift report generator (mission-ui#10, NFR-005): exactly 1000 findings, the contract's maxItems.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ROOT } from './common.mjs';
import { driftFailures } from './check.mjs';
import { scanText } from '../hygiene/rules.mjs';
import { compile, loadSchema, validateWith } from './validate.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const validator = async () => compile(await loadSchema(ROOT, 'DriftReport'));

test('makeDriftReport(1000) holds exactly 1000 findings and validates against the closed DriftReport schema', async () => {
  const report = bulk.makeDriftReport(1000);
  assert.equal(report.findings.length, 1000);
  assert.equal(report.truncated, true, 'the first 1000 of more');
  const r = validateWith(await validator(), report);
  assert.deepEqual(r.errors, []);
  assert.equal(r.valid, true);
});

test('the validator is live: a 1001st finding breaks maxItems (positive control of the equality above)', async () => {
  const report = bulk.makeDriftReport(1000);
  report.findings.push(structuredClone(report.findings[0]));
  const r = validateWith(await validator(), report);
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => e.keyword === 'maxItems' && e.path === '/findings'), JSON.stringify(r.errors.slice(0, 2)));
});

test('the count is a parameter: 0, 1 and 999 findings, each valid; the default is 1000', async () => {
  const v = await validator();
  for (const n of [0, 1, 3, 999]) {
    const report = bulk.makeDriftReport(n, false);
    assert.equal(report.findings.length, n);
    assert.equal(report.truncated, false);
    assert.equal(validateWith(v, report).valid, true, `${n} findings`);
  }
  assert.equal(bulk.makeDriftReport().findings.length, 1000);
});

test('deterministic: two calls are deep-equal, and the scan time is a fixed literal, not a clock', () => {
  assert.deepEqual(bulk.makeDriftReport(1000), bulk.makeDriftReport(1000));
  assert.equal(bulk.makeDriftReport(1).scannedAt, '2026-10-06T09:00:00Z');
});

test('the findings are in byte order of (missionId, kind, artifactPath), keys unique, lane rows sorted: no failed rule', () => {
  assert.deepEqual(driftFailures(bulk.makeDriftReport(1000)), []);
});

test('all three kinds, both severities and every source code occur, with the contract pairs of summary and remedy', () => {
  const findings = bulk.makeDriftReport(1000).findings;
  assert.deepEqual([...new Set(findings.map((f) => f.kind))].sort(), ['lane_branch_missing', 'snapshot_disagrees_with_event_log', 'snapshot_or_event_log_missing']);
  assert.deepEqual([...new Set(findings.map((f) => f.severity))].sort(), ['error', 'warning']);
  assert.deepEqual([...new Set(findings.map((f) => f.sourceCode))].sort(), ['CORRUPT_JSON', 'SNAPSHOT_DRIFT', 'SNAPSHOT_DRIFT_PROVENANCE', 'SNAPSHOT_DRIFT_TERMINAL', null]);
  assert.ok(findings.some((f) => f.laneComparison.length > 0));
  assert.ok(findings.some((f) => f.remedy === 'materialize_status'));
  assert.ok(findings.some((f) => f.remedy === null));
  for (const f of findings) {
    assert.equal(f.authority, f.kind === 'lane_branch_missing' ? 'git' : 'event_log');
    assert.equal(f.derivedSide, f.kind === 'lane_branch_missing' ? 'lanes_json' : 'status_json');
  }
});

test('synthetic only: the hygiene rules find no path, e-mail or account name in the output', () => {
  assert.deepEqual(scanText('bulk-drift-report.json', JSON.stringify(bulk.makeDriftReport(1000))), []);
});

test('driftFailures is live: a duplicate key, a swapped pair and an unsorted lane row are each named (positive control for the sorted result above)', () => {
  const base = bulk.makeDriftReport(18);
  const dup = structuredClone(base);
  dup.findings[1] = structuredClone(dup.findings[0]);
  assert.ok(driftFailures(dup).includes('key-unique'));
  const swapped = structuredClone(base);
  [swapped.findings[0], swapped.findings[1]] = [swapped.findings[1], swapped.findings[0]];
  assert.ok(driftFailures(swapped).includes('key-order'));
  const lanes = structuredClone(base);
  const withRows = lanes.findings.find((f) => f.laneComparison.length > 1);
  assert.ok(withRows, 'a finding with two lane rows exists in the first eighteen');
  withRows.laneComparison.reverse();
  assert.ok(driftFailures(lanes).includes('lane-order'));
  const same = structuredClone(base);
  same.findings.find((f) => f.laneComparison.length > 0).laneComparison[0].derivedStatusLane = same.findings.find((f) => f.laneComparison.length > 0).laneComparison[0].persistedStatusLane;
  assert.ok(driftFailures(same).includes('lane-equal'));
});
