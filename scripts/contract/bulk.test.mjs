// Tests of the Artifact Viewer's bulk generators (packages/mission-ui/src/contract/bulk.ts): pure, deterministic,
// never registered and never stored. That each output also validates against the contract is gate `contract`
// (check.mjs, checkBulk, with its own negative cases in check.test.mjs).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as bulk from '../../packages/mission-ui/src/contract/bulk.ts';
import { FIXTURES } from './registry.mjs';

const CAP = 262144;
const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));
const bytes = (s) => Buffer.byteLength(s);

test('makeArtifactListing(1000): one thousand unique paths in byte order, nested, not truncated', () => {
  const l = bulk.makeArtifactListing(1000, { truncated: false });
  assert.equal(l.entries.length, 1000);
  assert.equal(l.truncated, false);
  const paths = l.entries.map((e) => e.path);
  assert.equal(new Set(paths).size, 1000);
  assert.deepEqual(paths, [...paths].sort(byteOrder));
  assert.ok(Math.max(...paths.map((p) => p.split('/').length)) >= 3, 'a nested tree');
  assert.ok(paths.every((p) => p.length <= 512 && /^[\x20-\x7e]+$/.test(p) && !p.startsWith('/') && !p.endsWith('/')));
  for (const e of l.entries) assert.deepEqual(Object.keys(e), ['path', 'kind', 'sizeBytes', 'modifiedAt', 'readable']);
  assert.match(l.missionId, /^[0-9A-HJKMNP-TV-Z]{26}$/);
});

test('makeArtifactListing: the truncated form differs only in the flag; the same call twice is the same document', () => {
  const open = bulk.makeArtifactListing(1000, { truncated: false });
  const cut = bulk.makeArtifactListing(1000, { truncated: true });
  assert.equal(cut.truncated, true);
  assert.deepEqual({ ...cut, truncated: false }, open);
  assert.deepEqual(bulk.makeArtifactListing(1000, { truncated: false }), open);
  assert.notEqual(bulk.makeArtifactListing(1000, { truncated: false }), open, 'a fresh object each call');
});

test('makeArtifactListing: any size up to 1000, the forced paths included and counted, a size over the contract limit refused', () => {
  assert.deepEqual(bulk.makeArtifactListing(0, { truncated: false }).entries, []);
  const small = bulk.makeArtifactListing(40, { truncated: false, include: ['plan.md', 'notes/large.md', 'tasks/WP01-example.md'] });
  assert.equal(small.entries.length, 40);
  const kinds = Object.fromEntries(small.entries.map((e) => [e.path, e.kind]));
  assert.equal(kinds['plan.md'], 'plan');
  assert.equal(kinds['notes/large.md'], 'other');
  assert.equal(kinds['tasks/WP01-example.md'], 'work_package_prompt');
  const paths = small.entries.map((e) => e.path);
  assert.deepEqual(paths, [...paths].sort(byteOrder));
  assert.equal(new Set(paths).size, 40);
  assert.throws(() => bulk.makeArtifactListing(1001, { truncated: false }), RangeError);
  assert.throws(() => bulk.makeArtifactListing(-1, { truncated: false }), RangeError);
  assert.throws(() => bulk.makeArtifactListing(1, { truncated: false, include: ['a.md', 'b.md'] }), RangeError, 'more forced paths than entries');
});

test('makeLargeMarkdown: a 256 KiB markdown document of exactly the requested size, made of short lines, with structure', () => {
  const c = bulk.makeLargeMarkdown(CAP, 'plan.md');
  assert.equal(bytes(c.content), CAP);
  assert.equal(c.sizeBytes, CAP);
  assert.equal(c.path, 'plan.md');
  assert.equal(c.kind, 'plan');
  assert.equal(c.mediaType, 'text/markdown');
  assert.equal(c.encoding, 'utf-8');
  assert.equal(c.redacted, false);
  assert.ok(c.content.startsWith('# '));
  assert.ok(c.content.endsWith('\n'));
  const lines = c.content.split('\n');
  assert.ok(Math.max(...lines.map((l) => l.length)) < 20000, 'no line near the pre-parse line limit: this is the document that parses');
  assert.ok(c.content.split(/\n\n/).length > 200, 'many blocks');
  assert.equal(/\bfeature/i.test(c.content), false);
  assert.deepEqual(bulk.makeLargeMarkdown(CAP, 'plan.md'), c);
  const small = bulk.makeLargeMarkdown(4096, 'spec.md');
  assert.equal(bytes(small.content), 4096);
  assert.equal(small.kind, 'spec');
  assert.throws(() => bulk.makeLargeMarkdown(10, 'spec.md'), RangeError);
  assert.throws(() => bulk.makeLargeMarkdown(CAP + 1, 'spec.md'), RangeError, 'over the size cap of the contract');
});

test('makeLongLine: one unbroken line of exactly the requested size, past the pre-parse line limit', () => {
  const c = bulk.makeLongLine(CAP, 'notes/long-line.md');
  assert.equal(bytes(c.content), CAP);
  assert.equal(c.sizeBytes, CAP);
  assert.equal(c.content.includes('\n'), false);
  assert.equal(c.content.includes('\r'), false);
  assert.ok(c.content.length > 20000);
  assert.equal(c.path, 'notes/long-line.md');
  assert.equal(c.kind, 'other');
  assert.equal(c.mediaType, 'text/markdown');
  assert.deepEqual(bulk.makeLongLine(CAP, 'notes/long-line.md'), c);
  assert.throws(() => bulk.makeLongLine(0, 'notes/long-line.md'), RangeError);
  assert.throws(() => bulk.makeLongLine(CAP + 1, 'notes/long-line.md'), RangeError);
});

test('makeOverBudgetMarkdown: a valid document under the size cap with far more blocks than the budget allows, every line short', () => {
  const c = bulk.makeOverBudgetMarkdown('research.md');
  assert.equal(c.path, 'research.md');
  assert.equal(c.kind, 'research');
  assert.equal(c.mediaType, 'text/markdown');
  assert.equal(c.sizeBytes, bytes(c.content));
  assert.ok(c.sizeBytes <= CAP, 'readable: the contract serves it');
  const lines = c.content.split('\n').filter((l) => l.length > 0);
  const items = lines.filter((l) => l.startsWith('- '));
  assert.ok(items.length >= 12000, `${items.length} list items`);
  assert.equal(lines.length - items.length, 1, 'the one heading');
  assert.ok(lines.every((l) => l.length < 80));
  assert.ok(items.every((l) => /^- \S/.test(l)));
  assert.deepEqual(bulk.makeOverBudgetMarkdown('research.md'), c);
});

test('the media type follows the extension and the kind follows the path, as the contract says', () => {
  const type = (path) => bulk.makeLongLine(2000, path).mediaType;
  assert.equal(type('a.md'), 'text/markdown');
  assert.equal(type('a.json'), 'application/json');
  assert.equal(type('a.yaml'), 'application/yaml');
  assert.equal(type('a.yml'), 'application/yaml');
  assert.equal(type('a.jsonl'), 'application/x-ndjson');
  assert.equal(type('a.csv'), 'text/csv');
  assert.equal(type('a.txt'), 'text/plain');
  assert.equal(type('a.unknown'), 'text/plain');
  assert.equal(type('noextension'), 'text/plain');
  const kind = (path) => bulk.makeLongLine(2000, path).kind;
  const cases = {
    'tasks/WP01-example/review-cycle-1.md': 'review_cycle',
    'tasks/WP01-example.md': 'work_package_prompt',
    'spec.md': 'spec', 'plan.md': 'plan', 'tasks.md': 'tasks', 'data-model.md': 'data_model', 'quickstart.md': 'quickstart', 'analysis-report.md': 'analysis_report',
    'research.md': 'research', 'research/notes.md': 'research', 'contracts/api.yaml': 'contract', 'checklists/requirements.md': 'checklist',
    'notes/anything.md': 'other', 'tasks/readme.md': 'other', 'tasks/WP1-short.md': 'other',
  };
  for (const [path, want] of Object.entries(cases)) assert.equal(kind(path), want, path);
  assert.equal(Object.keys(cases).length, 15);
});

test('no generator is a registry entry: the stored fixtures stay small', () => {
  const names = Object.keys(FIXTURES);
  for (const fn of ['makeArtifactListing', 'makeLargeMarkdown', 'makeLongLine', 'makeOverBudgetMarkdown']) {
    assert.equal(typeof bulk[fn], 'function', fn);
    assert.equal(names.includes(fn), false);
  }
});
