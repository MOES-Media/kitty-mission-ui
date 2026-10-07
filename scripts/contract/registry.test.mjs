// Tests of the registry: the fixture inventory and the named relaxations (reverted-must-fail by construction).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURES, RELAXATIONS, errorAllowed } from './registry.mjs';
import { ROOT } from './common.mjs';
import { loadSchema, relaxedSchema, compile, validateWith } from './validate.mjs';
import { loadExamples } from './generate.mjs';
import { buildFixtures } from './overlays.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const detailBase = () => structuredClone(loadExamples(ROOT)['MissionDetail.populated']);

test('the inventory has 70 fixtures: 59 valid, 4 host, 7 relaxed', () => {
  const kinds = Object.values(FIXTURES).map((f) => f.kind);
  assert.equal(kinds.length, 70);
  assert.equal(kinds.filter((k) => k === 'valid').length, 59);
  assert.equal(kinds.filter((k) => k === 'host').length, 4);
  assert.equal(kinds.filter((k) => k === 'relaxed').length, 7);
  const bySchema = (name) => Object.values(FIXTURES).filter((f) => f.schema === name).length;
  assert.equal(bySchema('WorkPackage'), 27);
  assert.equal(bySchema('WorkPackageDetail') + bySchema('WorkPackageDetailRefusal'), 21);
  assert.equal(bySchema('WorkPackageDetailRefusal'), 2);
  for (const f of Object.values(FIXTURES)) {
    assert.equal(f.kind === 'relaxed', typeof f.relaxation === 'string');
  }
});

test('every relaxation named by a fixture exists, and every relaxation is used', () => {
  const used = new Set(Object.values(FIXTURES).filter((f) => f.relaxation).map((f) => f.relaxation));
  assert.deepEqual([...used].sort(), Object.keys(RELAXATIONS).sort());
  assert.equal(used.size, 6);
  for (const [name, def] of Object.entries(FIXTURES).filter(([, f]) => f.relaxation)) {
    assert.equal(def.schema, RELAXATIONS[def.relaxation].schema, `${name}: the fixture and its relaxation name the same schema`);
  }
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

// ---- the four relaxations new in this mission: relaxed passes, strict fails, every strict error is allowed, a second
// defect still fails, and the patch reverted (the strict schema) makes the fixture fail ----
const fixtures = buildFixtures({ examples: loadExamples(ROOT), bulk });
const strictErrors = async (schema, doc) => validateWith(compile(await loadSchema(ROOT, schema)), doc);
const relaxedValidate = async (schema, name, doc) => validateWith(compile(relaxedSchema(await loadSchema(ROOT, schema), RELAXATIONS[name])), doc);

/** [relaxation, fixture, a second defect that must still fail, how many strict errors at least] */
const NEW_RELAXATIONS = [
  ['wp-lane-open', 'wpUnknownLane', (d) => { d.review.latestResult = { reviewer: 'reviewer-renata', verdict: 'unheard-of', reference: 'x' }; }],
  ['detail-lane-open', 'detailUnknownLanes', (d) => { d.reviewCycles[0].verdict = 'unheard-of'; }],
  ['provisional-omittable', 'wpStalenessOmitted', (d) => { delete d.readiness; }],
  ['detail-omittable', 'detailOmittedProvisional', (d) => { delete d.ownedFiles; }],
];

test('each new relaxation: passes relaxed, fails strict, every strict error at an allowed place, reverted-must-fail', async () => {
  let n = 0;
  for (const [name, fixture, second] of NEW_RELAXATIONS) {
    const rel = RELAXATIONS[name];
    const doc = structuredClone(fixtures[fixture]);
    assert.equal(FIXTURES[fixture].relaxation, name);
    const relaxed = await relaxedValidate(rel.schema, name, doc);
    assert.equal(relaxed.valid, true, `${fixture} passes ${name}: ${JSON.stringify(relaxed.errors.slice(0, 2))}`);
    const strict = await strictErrors(rel.schema, doc);
    assert.equal(strict.valid, false, `${fixture} fails the strict schema (reverted patch)`);
    for (const e of strict.errors) assert.ok(errorAllowed(rel, e), `${name}: ${e.path} ${e.message}`);
    const defective = structuredClone(doc);
    second(defective);
    assert.equal((await relaxedValidate(rel.schema, name, defective)).valid, false, `${name}: a second defect still fails the relaxed schema`);
    n += 1;
  }
  assert.equal(n, 4);
});

test('wp-lane-open and detail-lane-open: a number or an object is still refused, a null lane is accepted only where the contract allows it', async () => {
  const wp = structuredClone(fixtures.wpUnknownLane);
  assert.equal((await relaxedValidate('WorkPackage', 'wp-lane-open', wp)).valid, true, 'positive control');
  const numeric = structuredClone(wp);
  numeric.statusLane = 7;
  assert.equal((await relaxedValidate('WorkPackage', 'wp-lane-open', numeric)).valid, false);
  const nullTo = structuredClone(wp);
  nullTo.history[nullTo.history.length - 1].toStatusLane = null;
  assert.equal((await relaxedValidate('WorkPackage', 'wp-lane-open', nullTo)).valid, false, 'toStatusLane stays non-null');
  const subtaskNumber = structuredClone(wp);
  subtaskNumber.subtasks.T018 = 3;
  assert.equal((await relaxedValidate('WorkPackage', 'wp-lane-open', subtaskNumber)).valid, false);
  const detail = structuredClone(fixtures.detailUnknownLanes);
  assert.equal((await relaxedValidate('WorkPackageDetail', 'detail-lane-open', detail)).valid, true, 'positive control');
  detail.dependencies[0].statusLane = 5;
  assert.equal((await relaxedValidate('WorkPackageDetail', 'detail-lane-open', detail)).valid, false);
});

test('the omittable relaxations remove only their own members from required', async () => {
  const wp = structuredClone(fixtures.wpStalenessOmitted);
  assert.equal(Object.hasOwn(wp, 'staleness'), false);
  const other = structuredClone(wp);
  delete other.review;
  assert.equal((await relaxedValidate('WorkPackage', 'provisional-omittable', other)).valid, false, 'review is still required');
  const detail = structuredClone(fixtures.detailOmittedProvisional);
  assert.equal(Object.hasOwn(detail, 'reviewCycles') || Object.hasOwn(detail, 'workspace'), false);
  const onlyOne = structuredClone(fixtures.detailPopulated);
  delete onlyOne.workspace;
  assert.equal((await relaxedValidate('WorkPackageDetail', 'detail-omittable', onlyOne)).valid, true, 'either member may be omitted alone');
  const missingSubtasks = structuredClone(detail);
  delete missingSubtasks.subtasks;
  assert.equal((await relaxedValidate('WorkPackageDetail', 'detail-omittable', missingSubtasks)).valid, false, 'subtasks is still required');
});

test('the allowed patterns of the new relaxations cover them and nothing wider', () => {
  const lane = RELAXATIONS['wp-lane-open'].allowedPath;
  for (const ok of ['/statusLane', '/history/0/fromStatusLane', '/history/12/toStatusLane', '/subtasks/T018']) assert.ok(lane.test(ok), ok);
  for (const no of ['/statusLanes', '/history/0/actor', '/history/x/toStatusLane', '/subtasks', '/subtasks/T1/extra', '/readiness']) assert.equal(lane.test(no), false, no);
  const detail = RELAXATIONS['detail-lane-open'].allowedPath;
  for (const ok of ['/subtasks/0/statusLane', '/dependencies/3/statusLane']) assert.ok(detail.test(ok), ok);
  for (const no of ['/subtasks/0/title', '/dependencies/statusLane', '/workspace/laneId']) assert.equal(detail.test(no), false, no);
  const rootOnly = [RELAXATIONS['provisional-omittable'], RELAXATIONS['detail-omittable']];
  for (const r of rootOnly) {
    assert.ok(r.allowedPath.test(''));
    assert.equal(r.allowedPath.test('/staleness'), false);
  }
  const missing = (property) => ({ path: '', keyword: 'required', message: '', missingProperty: property });
  const allowed = (name, e) => errorAllowed(RELAXATIONS[name], e);
  assert.ok(allowed('provisional-omittable', missing('staleness')));
  assert.equal(allowed('provisional-omittable', missing('review')), false);
  assert.equal(allowed('provisional-omittable', { path: '', keyword: 'type', message: '' }), false);
  assert.ok(allowed('detail-omittable', missing('reviewCycles')));
  assert.ok(allowed('detail-omittable', missing('workspace')));
  assert.equal(allowed('detail-omittable', missing('ownedFiles')), false);
});
