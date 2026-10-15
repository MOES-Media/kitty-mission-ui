// SO-BND-011: the generated contract fixtures are pinned to LF and marked generated, so a checkout on any platform
// reads the same bytes and the review diff folds them; the hand-written changes script is pinned to LF only.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const attrs = (file) => Object.fromEntries(execFileSync('git', ['check-attr', 'text', 'eol', 'linguist-generated', '--', file], { cwd: ROOT, encoding: 'utf8' })
  .trim().split('\n').map((l) => l.split(': ').slice(1)));

test('gitattributes: the generated mission-status fixtures are LF text marked generated', () => {
  let ran = 0;
  for (const name of ['examples', 'fixtures', 'routes']) {
    assert.deepEqual(attrs(`contracts/fixtures/mission-status.${name}.json`), { text: 'set', eol: 'lf', 'linguist-generated': 'true' }, name);
    ran += 1;
  }
  assert.equal(ran, 3);
});

test('gitattributes: the hand-written changes script is LF text and not marked generated', () => {
  assert.deepEqual(attrs('contracts/fixtures/mission-status.changes.json'), { text: 'set', eol: 'lf', 'linguist-generated': 'unspecified' });
});
