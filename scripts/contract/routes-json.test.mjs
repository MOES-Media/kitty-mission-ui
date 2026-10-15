// contracts/fixtures/mission-status.routes.json (WP03 T014, R-03): one route per operation of the vendored openapi.yaml,
// with its success schema, its reviewed default example and its refusal map. The oracles below parse the YAML here,
// independently of the generator.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { parse } from 'yaml';
import { LAYOUT, ROOT } from './common.mjs';
import { DEFAULT_EXAMPLES, FIXTURE_FILES, buildRoutes, loadExamples } from './generate.mjs';

const ROUTES = 10;
const openapiFile = join(ROOT, LAYOUT.openapi);
const yamlAt = (file) => parse(readFileSync(file, 'utf8'));

// ---- independent oracle: the operations of the vendored YAML, read here ----
function yamlOperations() {
  const doc = yamlAt(openapiFile);
  const out = [];
  for (const [path, item] of Object.entries(doc.paths)) {
    const file = join(dirname(openapiFile), item.$ref);
    for (const [method, op] of Object.entries(yamlAt(file))) out.push({ path, method: method.toUpperCase(), op, file });
  }
  return out;
}

/** The numbered responses of a path file, each resolved to the file that defines it. */
function resolvedResponse(pathFile, response) {
  if (!response.$ref) return response;
  return yamlAt(join(dirname(pathFile), response.$ref));
}

// Hand-written from the vendored paths (B4): the full refusal map of every operation.
const EXPECTED_REFUSALS = {
  getArtifactContent: { ArtifactRefusal: [400, 404, 413, 415, 422, 500] },
  getDriftReport: { DriftRefusal: [404, 500] },
  getMission: { Problem: [404] },
  getProject: {},
  getWorkPackage: { Problem: [404] },
  getWorkPackageDetail: { WorkPackageDetailRefusal: [404, 500] },
  listArtifacts: { ArtifactRefusal: [404, 500] },
  listMissions: { PageCursorRefusal: [400] },
  listOpsInvocations: { OpsRefusal: [500], PageCursorRefusal: [400] },
  streamEvents: { Problem: [404], StreamRefusal: [400, 409] },
};

const routes = buildRoutes();

test('routes: the operationIds equal the set parsed from the vendored YAML, ten of them', () => {
  const ops = yamlOperations();
  assert.equal(ops.length, ROUTES);
  assert.equal(routes.length, ROUTES);
  assert.deepEqual(routes.map((r) => r.operationId).sort(), ops.map((o) => o.op.operationId).sort());
  for (const o of ops) {
    const r = routes.find((x) => x.operationId === o.op.operationId);
    assert.equal(r.path, o.path);
    assert.equal(r.method, o.method);
  }
});

test('routes: sorted by operationId; only streamEvents is a stream, with no response schema and no default example', () => {
  const ids = routes.map((r) => r.operationId);
  assert.deepEqual(ids, [...ids].sort());
  assert.deepEqual(routes.filter((r) => r.kind === 'stream').map((r) => r.operationId), ['streamEvents']);
  const stream = routes.find((r) => r.kind === 'stream');
  assert.equal(stream.responseSchema, null);
  assert.equal(stream.defaultExample, null);
  assert.equal(routes.filter((r) => r.kind === 'read').length, ROUTES - 1);
});

test('routes: every read has a default example of its response schema, and that example exists', () => {
  const examples = loadExamples();
  let n = 0;
  for (const r of routes.filter((x) => x.kind === 'read')) {
    assert.equal(typeof r.responseSchema, 'string', r.operationId);
    assert.equal(r.defaultExample, DEFAULT_EXAMPLES[r.operationId]);
    assert.ok(Object.hasOwn(examples, r.defaultExample), `${r.operationId}: ${r.defaultExample} is a vendored example`);
    assert.equal(r.defaultExample.split('.')[0], r.responseSchema, r.operationId);
    n += 1;
  }
  assert.equal(n, ROUTES - 1);
});

test('routes: the full refusal map of every route equals the hand-written map', () => {
  assert.deepEqual(Object.fromEntries(routes.map((r) => [r.operationId, r.refusals])), EXPECTED_REFUSALS);
  assert.deepEqual(routes.find((r) => r.operationId === 'getArtifactContent').refusals.ArtifactRefusal, [400, 404, 413, 415, 422, 500]);
});

test('routes: no refusal map holds a default entry, and every status is a number in ascending order', () => {
  let statuses = 0;
  for (const r of routes) {
    for (const [schema, list] of Object.entries(r.refusals)) {
      assert.notEqual(schema, 'default');
      assert.deepEqual(list, [...list].sort((a, b) => a - b));
      for (const s of list) {
        assert.equal(typeof s, 'number');
        statuses += 1;
      }
    }
  }
  assert.equal(statuses, 20, 'the numbered problem+json responses of the vendored paths');
});

test('routes: every refusal schema is declared as application/problem+json in the YAML for each of its statuses', () => {
  let checked = 0;
  for (const o of yamlOperations()) {
    const r = routes.find((x) => x.operationId === o.op.operationId);
    for (const [schema, list] of Object.entries(r.refusals)) {
      for (const status of list) {
        const response = resolvedResponse(o.file, o.op.responses[String(status)]);
        const media = response.content['application/problem+json'];
        assert.ok(media, `${r.operationId} ${status} is problem+json`);
        assert.ok(media.schema.$ref.endsWith(`/${schema}.yaml`), `${r.operationId} ${status} names ${schema}`);
        checked += 1;
      }
    }
  }
  assert.equal(checked, 20);
});

test('routes: the committed routes.json is the generator output, formatted with two spaces and a trailing newline', () => {
  const text = readFileSync(join(ROOT, FIXTURE_FILES.routes), 'utf8');
  assert.deepEqual(JSON.parse(text), routes);
  assert.equal(text, `${JSON.stringify(routes, null, 2)}\n`);
});

// ---- synthetic contracts: the rules on inputs the vendored contract does not hold ----
const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const PROBLEM_RESPONSE = { description: 'p', content: { 'application/problem+json': { schema: { $ref: '../schemas/Problem.yaml' } } } };
const okResponse = (schema) => ({ description: 'ok', content: { 'application/json': { schema: { $ref: `../schemas/${schema}.yaml` } } } });

/** A minimal contract directory with one GET per entry of `ops` (`{ operationId: responses }`). */
function syntheticContract(ops) {
  const dir = mkdtempSync(join(tmpdir(), 'routes-json-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'paths'));
  mkdirSync(join(dir, 'responses'));
  writeFileSync(join(dir, 'responses/Problem.yaml'), JSON.stringify(PROBLEM_RESPONSE));
  const paths = {};
  for (const [operationId, responses] of Object.entries(ops)) {
    writeFileSync(join(dir, `paths/${operationId}.yaml`), JSON.stringify({ get: { operationId, responses } }));
    paths[`/${operationId}`] = { $ref: `paths/${operationId}.yaml` };
  }
  writeFileSync(join(dir, 'openapi.yaml'), JSON.stringify({ openapi: '3.1.0', paths }));
  assert.equal(readdirSync(join(dir, 'paths')).length, Object.keys(ops).length);
  return join(dir, 'openapi.yaml');
}

const synth = (openapi, defaultExamples, examples = { 'Thing.one': {}, 'Other.one': {} }) => buildRoutes({ openapi, examples, defaultExamples });

test('synthetic: a path whose only refusal is the default Problem response yields an empty refusal map', () => {
  const openapi = syntheticContract({ getThing: { 200: okResponse('Thing'), default: { $ref: '../responses/Problem.yaml' } } });
  const [r] = synth(openapi, { getThing: 'Thing.one' });
  assert.deepEqual(r.refusals, {});
  // positive control: the same shared response under a numbered status is a refusal
  const numbered = syntheticContract({ getThing: { 200: okResponse('Thing'), 404: { $ref: '../responses/Problem.yaml' }, default: { $ref: '../responses/Problem.yaml' } } });
  assert.deepEqual(synth(numbered, { getThing: 'Thing.one' })[0].refusals, { Problem: [404] });
});

test('synthetic: a numbered refusal declared as application/json is not a refusal; the same as problem+json is (positive control)', () => {
  const asJson = { description: 'r', content: { 'application/json': { schema: { $ref: '../schemas/ThingRefusal.yaml' } } } };
  const asProblem = { description: 'r', content: { 'application/problem+json': { schema: { $ref: '../schemas/ThingRefusal.yaml' } } } };
  const [json] = synth(syntheticContract({ getThing: { 200: okResponse('Thing'), 409: asJson } }), { getThing: 'Thing.one' });
  assert.deepEqual(json.refusals, {});
  const [problem] = synth(syntheticContract({ getThing: { 200: okResponse('Thing'), 409: asProblem, 400: asProblem } }), { getThing: 'Thing.one' });
  assert.deepEqual(problem.refusals, { ThingRefusal: [400, 409] });
});

test('synthetic: an explicit null in the default-example map is accepted; a read missing from the map fails generation', () => {
  const openapi = syntheticContract({ getThing: { 200: okResponse('Thing') } });
  assert.equal(synth(openapi, { getThing: null })[0].defaultExample, null);
  assert.equal(synth(openapi, { getThing: 'Thing.one' })[0].defaultExample, 'Thing.one');
  assert.throws(() => synth(openapi, {}), /getThing has no entry in DEFAULT_EXAMPLES/);
});

test('synthetic: a default example that does not exist, or is of another schema, fails generation (positive control passes)', () => {
  const openapi = syntheticContract({ getThing: { 200: okResponse('Thing') } });
  assert.throws(() => synth(openapi, { getThing: 'Thing.missing' }), /names Thing\.missing, which is not a vendored example/);
  assert.throws(() => synth(openapi, { getThing: 'Other.one' }), /names Other\.one, whose schema is not Thing/);
  assert.doesNotThrow(() => synth(openapi, { getThing: 'Thing.one' }));
});

test('synthetic: a map entry for an operation the contract does not have fails generation', () => {
  const openapi = syntheticContract({ getThing: { 200: okResponse('Thing') } });
  assert.throws(() => synth(openapi, { getThing: 'Thing.one', getGone: 'Thing.one' }), /getGone, but the contract has no such operation/);
});
