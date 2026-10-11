// Tests of the Ops slice of the contract tooling (mission-ui#11): the registered fixtures, the overlays, the
// `ops-vocab-open` relaxation (both ways) and the actor allow-list over Ops documents.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FIXTURES, RELAXATIONS, errorAllowed } from './registry.mjs';
import { ROOT } from './common.mjs';
import { loadSchema, relaxedSchema, compile, validateWith } from './validate.mjs';
import { loadExamples, generateFixturesSource } from './generate.mjs';
import { buildFixtures, OPS_ACTORS, SYNTHETIC_ACTORS } from './overlays.mjs';
import { actorProblems } from './check.mjs';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';

const fixtures = buildFixtures({ examples: loadExamples(ROOT), bulk });

const CONTRACT_DERIVED = [
  'opsPageFirst', 'opsPageLast', 'opsPageEmpty',
  'opsOpen', 'opsClosedByAgent', 'opsClosedBySweep', 'opsEvidenceNull', 'opsEvidenceRepoPath', 'opsEvidenceUrl',
  'opsEvidenceUrlRedacted', 'opsEvidenceText', 'opsEvidenceTextRedacted',
  'opsRefusalUnreadable', 'opsCursorRefusal',
];
const OVERLAYS = [
  'opsFailed', 'opsAbandoned', 'opsModeAdvisory', 'opsModeQuery', 'opsRedactedMarkers', 'opsActorNull', 'opsNoMissionNoWp',
  'opsMissionOnly', 'opsEvidence512', 'opsEvidenceMarkup', 'opsEvidenceJavascriptUrl', 'opsEvidenceUnbroken512', 'opsEvidenceBidi',
  'opsUnknownOutcome', 'opsUnknownCloser', 'opsUnknownMode', 'opsUnknownEvidenceKind', 'opsProfile128', 'opsActionLong',
  'opsOffsetStart', 'opsPageMixed', 'opsPageEmptySkipped',
];
const UNKNOWN = ['opsUnknownOutcome', 'opsUnknownCloser', 'opsUnknownMode', 'opsUnknownEvidenceKind'];

const SCHEMA_OF = (name) => FIXTURES[name].schema;
const strictValidate = async (schema, doc) => validateWith(compile(await loadSchema(ROOT, schema)), doc);
const relaxedValidate = async (schema, name, doc) =>
  validateWith(compile(relaxedSchema(await loadSchema(ROOT, schema), RELAXATIONS[name])), doc);

test('the Ops inventory: 14 contract-derived and 22 overlay fixtures, registered under the right schemas', () => {
  assert.equal(CONTRACT_DERIVED.length, 14);
  assert.equal(OVERLAYS.length, 22);
  let n = 0;
  for (const name of [...CONTRACT_DERIVED, ...OVERLAYS]) {
    assert.ok(Object.hasOwn(FIXTURES, name), `${name} is registered`);
    assert.ok(Object.hasOwn(fixtures, name), `${name} is built`);
    n += 1;
  }
  assert.equal(n, 36);
  const bySchema = (s) => Object.values(FIXTURES).filter((f) => f.schema === s).length;
  assert.equal(bySchema('OpsInvocationPage'), 5);
  assert.equal(bySchema('OpsInvocation'), 29);
  assert.equal(bySchema('OpsRefusal'), 1);
  assert.equal(bySchema('PageCursorRefusal'), 1);
});

test('contract-derived Ops fixtures are the vendored examples, byte for byte as data', () => {
  const ex = loadExamples(ROOT);
  const pairs = [
    ['opsPageFirst', 'OpsInvocationPage.first'], ['opsPageLast', 'OpsInvocationPage.last'], ['opsPageEmpty', 'OpsInvocationPage.empty'],
    ['opsOpen', 'OpsInvocation.open'], ['opsClosedByAgent', 'OpsInvocation.closed-by-agent'],
    ['opsClosedBySweep', 'OpsInvocation.closed-by-doctor-sweep'], ['opsEvidenceNull', 'OpsInvocation.evidence-null'],
    ['opsEvidenceRepoPath', 'OpsInvocation.evidence-repo-path'], ['opsEvidenceUrl', 'OpsInvocation.evidence-url'],
    ['opsEvidenceUrlRedacted', 'OpsInvocation.evidence-url-redacted'], ['opsEvidenceText', 'OpsInvocation.evidence-text'],
    ['opsEvidenceTextRedacted', 'OpsInvocation.evidence-text-redacted'], ['opsRefusalUnreadable', 'OpsRefusal.ops-unreadable'],
    ['opsCursorRefusal', 'PageCursorRefusal.invalid'],
  ];
  let n = 0;
  for (const [name, example] of pairs) {
    assert.ok(ex[example], `${example} exists`);
    assert.deepEqual(fixtures[name], ex[example], name);
    assert.equal(FIXTURES[name].kind, 'valid', name);
    n += 1;
  }
  assert.equal(n, 14);
  // the page `first` is the one the spec names: an open Op and a closed one, a next page, total 5, one skipped
  const first = fixtures.opsPageFirst;
  assert.deepEqual(first.items.map((i) => i.status), ['open', 'closed']);
  assert.equal(first.pageInfo.hasNextPage, true);
  assert.equal(first.totalCount, 5);
  assert.equal(first.skippedCount, 1);
});

test('every Ops overlay except the four foreign-vocabulary ones validates against the strict contract', async () => {
  let n = 0;
  for (const name of OVERLAYS.filter((o) => !UNKNOWN.includes(o))) {
    assert.equal(FIXTURES[name].kind, 'valid', name);
    const r = await strictValidate(SCHEMA_OF(name), fixtures[name]);
    assert.equal(r.valid, true, `${name}: ${JSON.stringify(r.errors.slice(0, 2))}`);
    n += 1;
  }
  assert.equal(n, 18);
});

test('overlays cover every outcome, closer, mode and evidence kind of the contract (positive controls for the sweep)', () => {
  const rows = [];
  for (const name of [...CONTRACT_DERIVED, ...OVERLAYS].filter((x) => !UNKNOWN.includes(x))) {
    const d = fixtures[name];
    if (Array.isArray(d.items)) rows.push(...d.items);
    else if (d.invocationId) rows.push(d);
  }
  assert.ok(rows.length >= 30, `rows seen: ${rows.length}`);
  const seen = (key) => new Set(rows.map((r) => (key === 'kind' ? r.evidence?.kind : r[key])).filter((v) => v !== undefined && v !== null));
  assert.deepEqual([...seen('outcome')].sort(), ['abandoned', 'done', 'failed']);
  assert.deepEqual([...seen('closedBy')].sort(), ['agent', 'doctor_sweep']);
  assert.deepEqual([...seen('modeOfWork')].sort(), ['advisory', 'mission_step', 'query', 'task_execution']);
  assert.deepEqual([...seen('kind')].sort(), ['repo_path', 'text', 'url']);
  assert.deepEqual([...seen('status')].sort(), ['closed', 'open']);
});

test('single-row overlays carry the one state they are named for', () => {
  assert.equal(fixtures.opsFailed.outcome, 'failed');
  assert.equal(fixtures.opsAbandoned.outcome, 'abandoned');
  assert.equal(fixtures.opsAbandoned.closedBy, 'doctor_sweep');
  assert.equal(fixtures.opsModeAdvisory.modeOfWork, 'advisory');
  assert.equal(fixtures.opsModeQuery.modeOfWork, 'query');
  assert.equal(fixtures.opsActorNull.actor, null);
  assert.equal(fixtures.opsNoMissionNoWp.missionId, null);
  assert.equal(fixtures.opsNoMissionNoWp.wpId, null);
  assert.notEqual(fixtures.opsMissionOnly.missionId, null);
  assert.equal(fixtures.opsMissionOnly.wpId, null);
  assert.equal(fixtures.opsProfile128.profileId.length, 128);
  assert.equal(fixtures.opsActionLong.action.length, 128);
  assert.match(fixtures.opsOffsetStart.startedAt, /\+02:00$/);
  assert.notEqual(fixtures.opsOpen.actor, null, 'positive control for the null actor');
});

test('redaction overlay: redacted is true and the value carries both markers; the 512 value is cut and redacted', () => {
  const r = fixtures.opsRedactedMarkers.evidence;
  assert.equal(r.redacted, true);
  assert.ok(r.value.includes('[path]'));
  assert.ok(r.value.includes('[email]'));
  const long = fixtures.opsEvidence512.evidence;
  assert.equal(long.value.length, 512);
  assert.equal(long.redacted, true);
  assert.equal(fixtures.opsEvidenceRepoPath.evidence.redacted, false, 'positive control');
});

test('hostile evidence is inert text: markup, a javascript address, an unbroken 512-character token, a bidirectional override', () => {
  assert.match(fixtures.opsEvidenceMarkup.evidence.value, /<[a-z]+ /);
  assert.equal(fixtures.opsEvidenceJavascriptUrl.evidence.kind, 'url');
  assert.ok(fixtures.opsEvidenceJavascriptUrl.evidence.value.startsWith('javascript:'));
  const token = fixtures.opsEvidenceUnbroken512.evidence.value;
  assert.equal(token.length, 512);
  assert.equal(/\s/.test(token), false);
  assert.equal(fixtures.opsEvidenceBidi.evidence.value.includes(String.fromCharCode(0x202e)), true);
  assert.equal(fixtures.opsEvidenceText.evidence.value.includes(String.fromCharCode(0x202e)), false, 'positive control');
});

test('pages: mixed has a next page and a cursor; empty-with-skipped has no items and a skipped count; order is service order', () => {
  const mixed = fixtures.opsPageMixed;
  assert.equal(mixed.pageInfo.hasNextPage, true);
  assert.equal(typeof mixed.pageInfo.nextPageCursor, 'string');
  assert.ok(mixed.items.length >= 4);
  const keys = mixed.items.map((i) => `${i.startedAt}|${i.invocationId}`);
  assert.deepEqual(keys, [...keys].sort().reverse(), 'startedAt descending with ties by invocationId descending');
  const empty = fixtures.opsPageEmptySkipped;
  assert.deepEqual(empty.items, []);
  assert.equal(empty.totalCount, 0);
  assert.ok(empty.skippedCount > 0);
  assert.equal(fixtures.opsPageEmpty.skippedCount, 0, 'positive control');
});

test('ops-vocab-open: the four foreign-vocabulary overlays fail strict, pass relaxed, and every strict error is at an allowed place', async () => {
  assert.equal(RELAXATIONS['ops-vocab-open'].schema, 'OpsInvocation');
  let n = 0;
  for (const name of UNKNOWN) {
    assert.equal(FIXTURES[name].kind, 'relaxed', name);
    assert.equal(FIXTURES[name].relaxation, 'ops-vocab-open', name);
    const doc = fixtures[name];
    assert.equal((await relaxedValidate('OpsInvocation', 'ops-vocab-open', doc)).valid, true, `${name} passes relaxed`);
    const strict = await strictValidate('OpsInvocation', doc);
    assert.equal(strict.valid, false, `${name} is refused without the relaxation`);
    assert.ok(strict.errors.length > 0);
    for (const e of strict.errors) assert.ok(errorAllowed(RELAXATIONS['ops-vocab-open'], e), `${name}: ${e.path} ${e.message}`);
    n += 1;
  }
  assert.equal(n, 4);
  // each one is foreign in exactly its own field
  assert.equal(fixtures.opsUnknownOutcome.outcome, 'paused');
  assert.equal(fixtures.opsUnknownCloser.closedBy, 'operator');
  assert.equal(fixtures.opsUnknownMode.modeOfWork, 'pairing');
  assert.equal(fixtures.opsUnknownEvidenceKind.evidence.kind, 'screenshot');
});

test('ops-vocab-open is narrow: a second defect, a foreign status, a non-string and another field still fail the relaxed schema', async () => {
  const base = fixtures.opsUnknownOutcome;
  assert.equal((await relaxedValidate('OpsInvocation', 'ops-vocab-open', base)).valid, true, 'positive control');
  const defects = [
    (d) => { d.status = 'paused'; },
    (d) => { d.outcome = 7; },
    (d) => { d.closedBy = 7; },
    (d) => { d.modeOfWork = null; },
    (d) => { d.evidence = { kind: 'screenshot', value: 'x', redacted: 'yes' }; },
    (d) => { d.extra = 1; },
    (d) => { d.profileId = 'has space'; },
    (d) => { d.startedAt = 'yesterday'; },
  ];
  let n = 0;
  for (const mutate of defects) {
    const d = structuredClone(base);
    mutate(d);
    assert.equal((await relaxedValidate('OpsInvocation', 'ops-vocab-open', d)).valid, false);
    n += 1;
  }
  assert.equal(n, 8);
  // a null outcome and a null evidence stay allowed (an open Op)
  assert.equal((await relaxedValidate('OpsInvocation', 'ops-vocab-open', fixtures.opsOpen)).valid, true);
});

test('ops-vocab-open does not exempt a fixture that is not registered with it: the same document, registered valid, is refused', async () => {
  const strictAjv = compile(await loadSchema(ROOT, 'OpsInvocation'));
  assert.equal(validateWith(strictAjv, fixtures.opsFailed).valid, true, 'positive control: a known vocabulary passes strict');
  assert.equal(validateWith(strictAjv, fixtures.opsUnknownMode).valid, false);
});

test('ops-field-length: none was needed, so it is not registered', () => {
  assert.equal(Object.hasOwn(RELAXATIONS, 'ops-field-length'), false);
  assert.equal(Object.keys(RELAXATIONS).length, 11);
});

test('every Ops actor handle is in the allow-list, and the allow-list rejects a handle that is not', () => {
  let n = 0;
  for (const name of [...CONTRACT_DERIVED, ...OVERLAYS]) {
    const d = fixtures[name];
    if (!(d.items || d.invocationId)) continue;
    assert.deepEqual(actorProblems(d, [...SYNTHETIC_ACTORS, ...OPS_ACTORS]), [], name);
    n += 1;
  }
  assert.equal(n, 34);
  assert.ok(SYNTHETIC_ACTORS.includes('claude'));
  for (const handle of ['codex', 'operator']) {
    assert.ok(OPS_ACTORS.includes(handle), handle);
    assert.equal(SYNTHETIC_ACTORS.includes(handle), false, `${handle} is not a general synthetic actor`);
  }
  const bad = structuredClone(fixtures.opsOpen);
  bad.actor = 'someone-real';
  assert.deepEqual(actorProblems(bad), ['someone-real']);
  const page = structuredClone(fixtures.opsPageFirst);
  page.items[1].actor = 'someone-real';
  assert.deepEqual(actorProblems(page), ['someone-real']);
  assert.deepEqual(actorProblems(fixtures.opsActorNull), [], 'a null actor is no handle');
});

test('no Ops fixture carries an absolute path, an e-mail address, a credential-shaped string or a real-looking host', () => {
  const text = JSON.stringify(Object.fromEntries([...CONTRACT_DERIVED, ...OVERLAYS].map((n) => [n, fixtures[n]])));
  assert.equal(/(^|[^a-z])\/(home|Users|root|tmp|var|etc)\//.test(text), false);
  assert.equal(/[A-Za-z0-9._-]+@[A-Za-z0-9-]+\.[a-z]{2,}/.test(text), false);
  assert.equal(/gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|BEGIN [A-Z ]*PRIVATE KEY/.test(text), false);
  assert.ok(text.length > 5000, 'the scan saw the fixtures');
});

test('the generated fixtures source escapes bidirectional controls, so the committed file holds no raw one', async () => {
  const source = await generateFixturesSource(ROOT);
  const raw = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x200e, 0x200f];
  let n = 0;
  for (const code of raw) {
    assert.equal(source.includes(String.fromCharCode(code)), false, `U+${code.toString(16)}`);
    n += 1;
  }
  assert.equal(n, 11);
  assert.ok(source.includes('\\u202e'), 'the override is written as an escape (positive control)');
});

test('the generated fixtures source escapes the Arabic letter mark as well (positive control: a plain letter stays raw)', async () => {
  const mark = String.fromCharCode(0x061c);
  const docs = { probe: { text: `a${mark}b`, plain: 'c' } };
  const source = await generateFixturesSource(ROOT, {
    buildFixtures: () => docs,
    bulk,
    registry: { probe: { satisfies: 'Probe' } },
  });
  assert.equal(source.includes(mark), false, 'no raw U+061C');
  assert.ok(source.includes('a\\u061cb'), 'written as an escape');
  assert.ok(source.includes('plain: "c"'), 'positive control');
});
