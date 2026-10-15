// The terminology scan must be able to fail: a known-positive sample is found, whole-word matching holds, and the real tree
// is clean. The temporary tree is created under the OS temp directory and removed through its own handle.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// TESTS-005: the story-catalogue and visual-tag tests guard that every matrix row has a story and a baseline and that no story
// silently collapses into another's look. CI runs `pnpm test:scripts` (the hygiene job) and never ran `test:terminology`, so the
// three tests are listed in `test:scripts`, which this file is part of.
test('test:scripts runs the Ops and Work Package story-catalogue tests and the visual-tag test (a script that is not listed is not run in CI)', () => {
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  const listed = String(scripts['test:scripts']).split(/\s+/);
  const required = ['scripts/ops-story-catalogue.test.mjs', 'scripts/wp-story-catalogue.test.mjs', 'scripts/visual-tags.test.mjs'];
  for (const file of required) {
    assert.ok(existsSync(join(ROOT, file)), `${file} exists`);
    assert.ok(listed.includes(file), `test:scripts lists ${file}`);
    assert.ok(!String(scripts['test:terminology']).includes(file), `${file} is not left behind in test:terminology`);
  }
  assert.equal(required.length, 3);
  // positive control: a file that is listed is found by the same check
  assert.ok(listed.includes('scripts/terminology.test.mjs'));
});

// F-48: the scan covers Svelte components of every package and the Rust sources and tests of every crate; build output under
// target/ is skipped. Each banned-word file is paired with a clean twin of the same kind (positive control).
test('the scan reports a planted word in a .svelte source and in a crate .rs source and test, and skips target/', () => {
  const root = mkdtempSync(join(tmpdir(), 'sk-terminology-'));
  const word = ['fea', 'ture'].join('');
  try {
    const shellSrc = join(root, 'packages', 'shell', 'src');
    const crate = join(root, 'crates', 'core');
    for (const dir of [shellSrc, join(crate, 'src', 'nested'), join(crate, 'tests'), join(crate, 'target', 'debug'), join(root, 'crates', 'target', 'src'), join(crate, 'benches')]) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(join(shellSrc, 'Bad.svelte'), `<p>A ${word} list</p>\n`);
    writeFileSync(join(shellSrc, 'Clean.svelte'), '<p>A mission list</p>\n');
    writeFileSync(join(crate, 'src', 'nested', 'bad.rs'), `// the ${word} flag\n`);
    writeFileSync(join(crate, 'src', 'clean.rs'), '// the mission flag\n');
    writeFileSync(join(crate, 'tests', 'bad.rs'), `// a ${word} test\n`);
    writeFileSync(join(crate, 'tests', 'clean.rs'), '// a mission test\n');
    writeFileSync(join(crate, 'target', 'debug', 'skipped.rs'), `// ${word}\n`);
    writeFileSync(join(root, 'crates', 'target', 'src', 'skipped.rs'), `// ${word}\n`);
    writeFileSync(join(crate, 'benches', 'outside.rs'), `// ${word}\n`);
    writeFileSync(join(crate, 'src', 'notes.txt'), `${word}\n`);
    const found = scan(root).map((f) => f.file).sort();
    assert.deepEqual(found, [
      join('crates', 'core', 'src', 'nested', 'bad.rs'),
      join('crates', 'core', 'tests', 'bad.rs'),
      join('packages', 'shell', 'src', 'Bad.svelte'),
    ].sort());
    // positive control: the clean twins are scanned, the skipped files are not
    const scanned = scannedFiles(root).map((f) => f.slice(root.length + 1)).sort();
    assert.deepEqual(scanned, [
      join('crates', 'core', 'src', 'clean.rs'),
      join('crates', 'core', 'src', 'nested', 'bad.rs'),
      join('crates', 'core', 'tests', 'bad.rs'),
      join('crates', 'core', 'tests', 'clean.rs'),
      join('packages', 'shell', 'src', 'Bad.svelte'),
      join('packages', 'shell', 'src', 'Clean.svelte'),
    ].sort());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a tree without crates/ scans its packages only (the crates walk is optional)', () => {
  const root = mkdtempSync(join(tmpdir(), 'sk-terminology-'));
  try {
    mkdirSync(join(root, 'packages', 'p', 'src'), { recursive: true });
    writeFileSync(join(root, 'packages', 'p', 'src', 'A.svelte'), '<p>mission</p>\n');
    assert.equal(scannedFiles(root).length, 1);
    assert.deepEqual(scan(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
