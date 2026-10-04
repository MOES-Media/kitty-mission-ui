// The terminology scan must be able to fail: a known-positive sample is found, whole-word matching holds, and the real tree
// is clean. The temporary tree is created under the OS temp directory and removed through its own handle.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { findForbidden, QUICKSTART, scan, scannedFiles } from './terminology.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('a known-positive sample is found, case-insensitively, with its line number', () => {
  const sample = ['const a = 1;', '// A new Feature screen', 'const b = "feature";'].join('\n');
  assert.deepEqual(findForbidden(sample), [
    { line: 2, text: '// A new Feature screen' },
    { line: 3, text: 'const b = "feature";' },
  ]);
});

test('positive control: whole-word only, other words are not findings', () => {
  assert.equal(findForbidden('a featureless day, the featured one, prefeature').length, 0);
  assert.equal(findForbidden('the feature, here').length, 1);
});

test('the scan reports a planted word in a package source and in the quickstart of a temporary tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'sk-terminology-'));
  try {
    mkdirSync(join(root, 'packages', 'p', 'src'), { recursive: true });
    mkdirSync(join(root, dirname(QUICKSTART)), { recursive: true });
    writeFileSync(join(root, 'packages', 'p', 'src', 'a.ts'), 'export const label = "Feature";\n');
    writeFileSync(join(root, 'packages', 'p', 'src', 'clean.ts'), 'export const label = "Mission";\n');
    writeFileSync(join(root, QUICKSTART), '# Quickstart\n\nOpen the feature list.\n');
    const found = scan(root);
    assert.equal(found.length, 2);
    assert.deepEqual(found.map((f) => f.file).sort(), [QUICKSTART, join('packages', 'p', 'src', 'a.ts')].sort());
    assert.equal(scannedFiles(root).length, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the real tree has no finding, and the scan covered the quickstart and every package source', () => {
  const files = scannedFiles(ROOT);
  assert.ok(files.some((f) => f.endsWith(QUICKSTART)), 'quickstart.md is scanned');
  assert.ok(files.some((f) => f.endsWith(join('src', 'elements', 'sk-pipeline-screen', 'sk-pipeline-screen.ts'))));
  assert.deepEqual(scan(ROOT), []);
});
