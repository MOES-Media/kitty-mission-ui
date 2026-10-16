// Properties of the bundled contract document (FR-012): deterministic, fully inlined, follows the pin, loud on a cycle.
// The plant token of gate contract is never printed here: failures are asserted through structured values (R6-09).
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { LAYOUT, ROOT } from './common.mjs';
import { FIXTURE_FILES, generateBundleSource } from './generate.mjs';
import { checkBundleFresh } from './check.mjs';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

// A throwaway copy of the vendored tree and the fixtures: all the bundle reads.
function tempRepo() {
  const root = mkdtempSync(join(tmpdir(), 'contract-bundle-'));
  dirs.push(root);
  cpSync(join(ROOT, LAYOUT.vendor), join(root, LAYOUT.vendor), { recursive: true });
  cpSync(join(ROOT, 'packages/mission-ui/src'), join(root, 'packages/mission-ui/src'), { recursive: true });
  cpSync(join(ROOT, 'contracts/fixtures'), join(root, 'contracts/fixtures'), { recursive: true });
  return root;
}

const laneFile = (root) => join(root, LAYOUT.schemas, 'StatusLane.yaml');

/** Walks a JSON value; counts every node and every object key named `$ref`. */
function walk(value, acc = { nodes: 0, refs: 0 }) {
  acc.nodes += 1;
  if (Array.isArray(value)) value.forEach((v) => walk(v, acc));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === '$ref') acc.refs += 1;
      walk(v, acc);
    }
  }
  return acc;
}

test('determinism: two generations give equal strings', async () => {
  const a = await generateBundleSource(ROOT);
  const b = await generateBundleSource(ROOT);
  assert.equal(a, b);
  assert.ok(a.length > 100_000);
  assert.ok(a.endsWith('}\n'));
});

test('inlined: the bundle has no $ref key anywhere', async () => {
  const doc = JSON.parse(await generateBundleSource(ROOT));
  const { nodes, refs } = walk(doc);
  assert.ok(nodes > 0);
  assert.equal(refs, 0);
  // positive control: the walker does count a $ref when one is present
  assert.equal(walk({ a: [{ $ref: 'x' }] }).refs, 1);
});

test('follows the pin: a changed vendored scalar changes the bundle; an untouched copy gives the committed text', async () => {
  const untouched = tempRepo();
  assert.equal(await generateBundleSource(untouched), readFileSync(join(ROOT, FIXTURE_FILES.openapi), 'utf8'));
  const changed = tempRepo();
  const text = readFileSync(laneFile(changed), 'utf8');
  assert.ok(text.includes('The display state'));
  writeFileSync(laneFile(changed), text.replace('The display state', 'The shown state'));
  const bundle = await generateBundleSource(changed);
  assert.notEqual(bundle, readFileSync(join(ROOT, FIXTURE_FILES.openapi), 'utf8'));
  assert.ok(bundle.includes('The shown state'));
});

test('a self-referencing schema makes generation reject, and the gate reports one bundle problem', async () => {
  const root = tempRepo();
  const text = readFileSync(laneFile(root), 'utf8');
  writeFileSync(join(root, LAYOUT.schemas, 'Loop.yaml'), 'type: object\nproperties:\n  again:\n    $ref: ./Loop.yaml\n');
  writeFileSync(laneFile(root), `${text}properties:\n  loop:\n    $ref: ./Loop.yaml\n`);
  await assert.rejects(() => generateBundleSource(root), /circular|Circular/);
  const problems = await checkBundleFresh(root);
  assert.equal(problems.length, 1);
  assert.equal(problems[0].token, 'stale generated file');
  assert.ok(problems[0].message.startsWith('the bundled contract document could not be regenerated: '));
  // positive control: the same function reports nothing on an untouched copy
  assert.deepEqual(await checkBundleFresh(tempRepo()), []);
});

test('R6-09: this file neither prints nor titles the plant token', () => {
  const token = ['stale generated file: contracts/fixtures/', 'mission-status.openapi.json differs'].join('');
  const source = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  assert.equal(source.includes(token), false);
  const printer = ['console', '.log('].join('');
  assert.equal(source.includes(printer), false);
  const titles = [...source.matchAll(/^test\('([^']*)'/gm)].map((m) => m[1]);
  assert.equal(titles.length, 5);
  assert.equal(titles.filter((t) => t.includes(token)).length, 0);
});
