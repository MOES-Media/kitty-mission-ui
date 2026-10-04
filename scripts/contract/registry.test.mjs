// Tests of the registry: the fixture inventory and the named relaxations (reverted-must-fail by construction).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURES, RELAXATIONS } from './registry.mjs';
import { ROOT } from './common.mjs';
import { loadSchema, relaxedSchema, compile, validateWith } from './validate.mjs';
import { loadExamples } from './generate.mjs';

const detailBase = () => structuredClone(loadExamples(ROOT)['MissionDetail.populated']);

test('the inventory has 22 fixtures: 15 valid, 4 host, 3 relaxed', () => {
  const kinds = Object.values(FIXTURES).map((f) => f.kind);
  assert.equal(kinds.length, 22);
  assert.equal(kinds.filter((k) => k === 'valid').length, 15);
  assert.equal(kinds.filter((k) => k === 'host').length, 4);
  assert.equal(kinds.filter((k) => k === 'relaxed').length, 3);
  for (const f of Object.values(FIXTURES)) {
    assert.equal(f.kind === 'relaxed', typeof f.relaxation === 'string');
  }
});

test('every relaxation named by a fixture exists, and every relaxation is used', () => {
  const used = new Set(Object.values(FIXTURES).filter((f) => f.relaxation).map((f) => f.relaxation));
  assert.deepEqual([...used].sort(), Object.keys(RELAXATIONS).sort());
  assert.equal(used.size, 2);
});

test('phases-open: three phases with unknown names fail strict and pass relaxed', async () => {
  const strict = await loadSchema(ROOT, 'MissionDetail');
  const doc = detailBase();
  doc.phases = [
    { name: 'discover', status: 'complete', basis: 'artifact' },
    { name: 'shape', status: 'in_progress', basis: 'lifecycle_event' },
    { name: 'build', status: 'pending', basis: 'derived_from_status_lanes' },
  ];
  assert.equal(validateWith(compile(strict), doc).valid, false);
  const relaxed = compile(relaxedSchema(strict, RELAXATIONS['phases-open']));
  assert.equal(validateWith(relaxed, doc).valid, true);
  assert.equal(validateWith(compile(strict), doc).valid, false, 'the strict validator is unchanged after relaxing (no leak)');
});

test('phases-open keeps the name-conditioned basis rule: a known name with a wrong basis fails the relaxed run', async () => {
  const strict = await loadSchema(ROOT, 'MissionDetail');
  const doc = detailBase();
  doc.phases = [
    { name: 'discover', status: 'complete', basis: 'artifact' },
    { name: 'implement', status: 'pending', basis: 'artifact' },
    { name: 'build', status: 'pending', basis: 'artifact' },
  ];
  const result = validateWith(compile(relaxedSchema(strict, RELAXATIONS['phases-open'])), doc);
  assert.equal(result.valid, false);
});

test('lane-open: an unknown lane value fails strict and passes relaxed; a number still fails relaxed', async () => {
  const strict = await loadSchema(ROOT, 'MissionDetail');
  const doc = detailBase();
  doc.workPackages[0].statusLane = 'on_hold';
  assert.equal(validateWith(compile(strict), doc).valid, false);
  const relaxed = compile(relaxedSchema(strict, RELAXATIONS['lane-open']));
  assert.equal(validateWith(relaxed, doc).valid, true);
  doc.workPackages[0].statusLane = 7;
  assert.equal(validateWith(relaxed, doc).valid, false);
});

test('the allowed-path patterns cover the relaxation and nothing wider', () => {
  const po = RELAXATIONS['phases-open'].allowedPath;
  assert.ok(po.test('/phases'));
  assert.ok(po.test('/phases/3/name'));
  assert.ok(!po.test('/phases/3/basis'));
  assert.ok(!po.test('/phases/3'));
  assert.ok(!po.test('/workPackages/0/statusLane'));
  const lo = RELAXATIONS['lane-open'].allowedPath;
  assert.ok(lo.test('/workPackages/2/statusLane'));
  assert.ok(!lo.test('/workPackages/2/title'));
  assert.ok(!lo.test('/phases'));
});
