// contracts/fixtures/mission-status.examples.json and mission-status.fixtures.json (WP03 T015, T016; F-04, F-21).
// The examples oracle parses the vendored YAML here, independently of the generator: it is the oracle the stub's tests rely on.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';
import { LAYOUT, ROOT } from './common.mjs';
import { FIXTURE_FILES, buildFixturesDoc, jsonText } from './generate.mjs';
import { FIXTURES } from './registry.mjs';
import { compile, loadSchema, validateWith } from './validate.mjs';

const EXAMPLES = 77;
const BOM = String.fromCharCode(0xfeff);
const RLO = String.fromCharCode(0x202e);

const examplesText = readFileSync(join(ROOT, FIXTURE_FILES.examples), 'utf8');
const fixturesText = readFileSync(join(ROOT, FIXTURE_FILES.fixtures), 'utf8');
const examplesDoc = JSON.parse(examplesText);
const fixturesDoc = JSON.parse(fixturesText);

/** The independent parse: every `<Schema>.<name>.yaml` of the vendored examples directory, `_index.yaml` excluded. */
function yamlExamples() {
  const dir = join(ROOT, LAYOUT.examples);
  const out = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.yaml') || file === '_index.yaml') continue;
    out[file.replace(/\.yaml$/, '')] = parse(readFileSync(join(dir, file), 'utf8'));
  }
  return out;
}

test('examples.json: exactly the 77 vendored examples, no _index, keys sorted', () => {
  const keys = Object.keys(examplesDoc);
  assert.equal(keys.length, EXAMPLES);
  assert.deepEqual(keys, [...keys].sort());
  assert.ok(!keys.some((k) => k.startsWith('_index')));
  assert.deepEqual(new Set(keys), new Set(Object.keys(yamlExamples())));
});

test('examples.json: every entry is deep-equal to an independent YAML parse of its file, with the schema of its name', () => {
  const oracle = yamlExamples();
  let n = 0;
  for (const [key, entry] of Object.entries(examplesDoc)) {
    assert.deepEqual(Object.keys(entry), ['schema', 'value'], key);
    assert.equal(entry.schema, key.split('.')[0], key);
    assert.deepEqual(entry.value, oracle[key], key);
    n += 1;
  }
  assert.equal(n, EXAMPLES);
});

test('JSON emitter: a byte order mark and the bidi controls are written as escapes and parse back unchanged', () => {
  const controls = [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069].map((c) => String.fromCharCode(c));
  const value = { [`k${RLO}`]: `${BOM}lead`, list: controls.map((c) => `a${c}b`) };
  const text = jsonText(value);
  assert.ok(!text.includes(BOM) && !text.includes(RLO), 'no raw BOM or RLO');
  for (const c of controls) assert.ok(!text.includes(c), `no raw U+${c.charCodeAt(0).toString(16)}`);
  assert.ok(text.includes('\\uFEFF') && text.includes('\\u202e'));
  assert.deepEqual(JSON.parse(text), value);
  assert.ok(text.endsWith('}\n'));
  // positive control: plain text is untouched, two-space indent
  assert.equal(jsonText({ a: 'b' }), '{\n  "a": "b"\n}\n');
});

test('examples.json and fixtures.json: the committed files hold no raw BOM or RLO character', () => {
  for (const text of [examplesText, fixturesText]) {
    assert.ok(text.length > 0);
    assert.ok(!text.includes(BOM));
    assert.ok(!text.includes(RLO));
  }
});

const validNames = Object.entries(FIXTURES).filter(([, def]) => def.kind === 'valid').map(([name]) => name);

test('fixtures.json: exactly the valid registry fixtures, keyed by registry name', () => {
  assert.equal(validNames.length, 134);
  assert.equal(Object.keys(fixturesDoc).length, validNames.length);
  assert.deepEqual(new Set(Object.keys(fixturesDoc)), new Set(validNames));
});

test('fixtures.json: a host and a relaxed fixture are absent, a valid one is present (positive control)', () => {
  const host = Object.keys(FIXTURES).find((n) => FIXTURES[n].kind === 'host');
  const relaxed = Object.keys(FIXTURES).find((n) => FIXTURES[n].kind === 'relaxed');
  assert.ok(host && relaxed);
  assert.ok(!Object.hasOwn(fixturesDoc, host), host);
  assert.ok(!Object.hasOwn(fixturesDoc, relaxed), relaxed);
  assert.ok(Object.hasOwn(fixturesDoc, 'project'));
  assert.equal(fixturesDoc.project.schema, 'Project');
});

test('fixtures.json: every value validates against its registry schema with no relaxation', async () => {
  let n = 0;
  for (const [name, entry] of Object.entries(fixturesDoc)) {
    assert.equal(entry.schema, FIXTURES[name].schema, name);
    const r = validateWith(compile(await loadSchema(ROOT, entry.schema)), entry.value);
    assert.ok(r.valid, `${name}: ${JSON.stringify(r.errors.slice(0, 2))}`);
    n += 1;
  }
  assert.equal(n, validNames.length);
});

test('fixtures.json: the committed file is the generator output of the same documents the .ts emitter writes', async () => {
  assert.deepEqual(JSON.parse(jsonText(await buildFixturesDoc(ROOT))), fixturesDoc);
});
