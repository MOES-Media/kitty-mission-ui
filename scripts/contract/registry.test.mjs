// Tests of the registry: the fixture inventory and the named relaxations (reverted-must-fail by construction).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURES, RELAXATIONS, errorAllowed, relaxationSchemas } from './registry.mjs';
import { ROOT } from './common.mjs';
import { loadSchema, relaxedSchema, compile, validateWith } from './validate.mjs';
import { loadExamples } from './generate.mjs';
import { buildFixtures } from './overlays.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const detailBase = () => structuredClone(loadExamples(ROOT)['MissionDetail.populated']);

test('the inventory has 100 fixtures: 86 valid, 4 host, 10 relaxed (30 of them are the Artifact Viewer documents)', () => {
  const kinds = Object.values(FIXTURES).map((f) => f.kind);
  assert.equal(kinds.length, 100);
  assert.equal(kinds.filter((k) => k === 'valid').length, 86);
  assert.equal(kinds.filter((k) => k === 'host').length, 4);
  assert.equal(kinds.filter((k) => k === 'relaxed').length, 10);
  const artifact = Object.values(FIXTURES).filter((f) => f.schema.startsWith('Artifact'));
  assert.equal(artifact.length, 30);
  assert.equal(artifact.filter((f) => f.kind === 'valid').length, 27);
  assert.equal(artifact.filter((f) => f.kind === 'relaxed').length, 3);
  assert.equal(artifact.filter((f) => f.kind === 'host').length, 0);
  assert.equal(artifact.filter((f) => f.schema === 'ArtifactListing').length, 8);
  assert.equal(artifact.filter((f) => f.schema === 'ArtifactContent').length, 14);
  assert.equal(artifact.filter((f) => f.schema === 'ArtifactRefusal').length, 8);
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
  assert.equal(used.size, 8);
  for (const [name, def] of Object.entries(FIXTURES).filter(([, f]) => f.relaxation)) {
    assert.ok(relaxationSchemas(RELAXATIONS[def.relaxation]).includes(def.schema), `${name}: the fixture and its relaxation name the same schema`);
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

// ---- the two relaxations of the Artifact Viewer: artifact-kind-open (two schemas) and refusal-code-open ----
const KIND_FIXTURES = [['listingUnknownKind', 'ArtifactListing'], ['contentUnknownKind', 'ArtifactContent']];

test('artifact-kind-open: an unknown kind fails strict at the kind alone and passes relaxed, in a listing and in a content', async () => {
  const rel = RELAXATIONS['artifact-kind-open'];
  assert.deepEqual(relaxationSchemas(rel), ['ArtifactListing', 'ArtifactContent']);
  let n = 0;
  for (const [fixture, schema] of KIND_FIXTURES) {
    assert.equal(FIXTURES[fixture].relaxation, 'artifact-kind-open');
    assert.equal(FIXTURES[fixture].schema, schema);
    const doc = structuredClone(fixtures[fixture]);
    const relaxed = await relaxedValidate(schema, 'artifact-kind-open', doc);
    assert.equal(relaxed.valid, true, `${fixture}: ${JSON.stringify(relaxed.errors.slice(0, 2))}`);
    // reverted: the strict schema refuses the fixture, and only at the kind
    const strict = await strictErrors(schema, doc);
    assert.equal(strict.valid, false, `${fixture} fails the strict schema (patch reverted)`);
    assert.ok(strict.errors.length > 0);
    for (const e of strict.errors) assert.ok(errorAllowed(rel, e), `${fixture}: ${e.path} ${e.message}`);
    n += 1;
  }
  assert.equal(n, 2);
});

test('artifact-kind-open lets nothing else through: a number, an empty string and a second defect still fail relaxed', async () => {
  for (const [fixture, schema] of KIND_FIXTURES) {
    const doc = () => structuredClone(fixtures[fixture]);
    const kindOf = (d) => (schema === 'ArtifactListing' ? d.entries[0] : d);
    assert.equal((await relaxedValidate(schema, 'artifact-kind-open', doc())).valid, true, `${fixture} positive control`);
    const numeric = doc();
    kindOf(numeric).kind = 7;
    assert.equal((await relaxedValidate(schema, 'artifact-kind-open', numeric)).valid, false, `${fixture}: a number`);
    const empty = doc();
    kindOf(empty).kind = '';
    assert.equal((await relaxedValidate(schema, 'artifact-kind-open', empty)).valid, false, `${fixture}: an empty kind`);
    const second = doc();
    if (schema === 'ArtifactListing') second.entries[0].readable = 'yes';
    else second.encoding = 'latin1';
    assert.equal((await relaxedValidate(schema, 'artifact-kind-open', second)).valid, false, `${fixture}: a second defect`);
  }
  // the pristine schemas are unchanged by relaxing (no leak): a known kind still passes strict, an unknown one still fails
  const known = structuredClone(fixtures.listingPopulated);
  assert.equal((await strictErrors('ArtifactListing', known)).valid, true);
  assert.equal((await strictErrors('ArtifactListing', fixtures.listingUnknownKind)).valid, false);
});

test('refusal-code-open: an unknown code fails strict at /code alone and passes relaxed; the status rules of the seven stay', async () => {
  const rel = RELAXATIONS['refusal-code-open'];
  assert.equal(rel.schema, 'ArtifactRefusal');
  assert.equal(FIXTURES.refusalUnknownCode.relaxation, 'refusal-code-open');
  const doc = structuredClone(fixtures.refusalUnknownCode);
  const relaxed = await relaxedValidate('ArtifactRefusal', 'refusal-code-open', doc);
  assert.equal(relaxed.valid, true, JSON.stringify(relaxed.errors.slice(0, 2)));
  const strict = await strictErrors('ArtifactRefusal', doc);
  assert.equal(strict.valid, false, 'the patch reverted: the strict schema refuses the unknown code');
  assert.ok(strict.errors.length > 0);
  for (const e of strict.errors) assert.ok(errorAllowed(rel, e), `${e.path} ${e.message}`);
  // a number, an empty string and a missing code still fail; a known code with the wrong status still fails (the if/then rules stay)
  const mutate = (change) => {
    const d = structuredClone(doc);
    change(d);
    return relaxedValidate('ArtifactRefusal', 'refusal-code-open', d);
  };
  assert.equal((await mutate((d) => { d.code = 7; })).valid, false, 'a number');
  assert.equal((await mutate((d) => { d.code = ''; })).valid, false, 'an empty code');
  assert.equal((await mutate((d) => { delete d.code; })).valid, false, 'a missing code');
  assert.equal((await mutate((d) => { d.status = 200; })).valid, false, 'a second defect: the status');
  assert.equal((await mutate((d) => { d.code = 'not_found'; d.status = 500; })).valid, false, 'a known code keeps its fixed status');
  assert.equal((await mutate((d) => { d.code = 'not_found'; d.status = 404; })).valid, true, 'positive control: a known code with its status');
});

test('the allowed patterns of the Artifact relaxations cover them and nothing wider', () => {
  const kind = RELAXATIONS['artifact-kind-open'].allowedPath;
  for (const ok of ['/kind', '/entries/0/kind', '/entries/999/kind']) assert.ok(kind.test(ok), ok);
  for (const no of ['/kinds', '/entries/kind', '/entries/0/path', '/entries/0/kind/x', '/path', '/entries/x/kind', '/entries']) assert.equal(kind.test(no), false, no);
  const code = RELAXATIONS['refusal-code-open'].allowedPath;
  assert.ok(code.test('/code'));
  for (const no of ['/codes', '/status', '/code/x', '', '/title']) assert.equal(code.test(no), false, no);
});
