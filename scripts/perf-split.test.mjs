// The timing-ceiling tests run in their own vitest project (`perf`), one file at a time, so that a wall-clock ceiling is not
// measured while other test files share the browser. This guard keeps the split honest in both directions: a test file that
// reads `performance.now()` and asserts a ceiling must be a `*.perf.test.ts`, and a `*.perf.test.ts` must hold one.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERF = /\.perf\.test\.ts$/;
const CLOCK = /\bperformance\.now\s*\(/;
// A ceiling assertion: an upper-bound matcher, or a list of the entries that went over their ceiling (the word "ceiling").
const CEILING = /\.toBeLessThan(?:OrEqual)?\s*\(|\bceiling/i;

/** The test files of every package, relative to the root, sorted. `support/` holds helpers and is not a test file. */
function testFiles(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'support') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.test.ts')) found.push(relative(root, path));
    }
  };
  const packages = join(root, 'packages');
  for (const pkg of readdirSync(packages, { withFileTypes: true })) {
    if (pkg.isDirectory()) walk(join(packages, pkg.name, 'test'));
  }
  return found.sort();
}

/** True when the source measures with the clock and asserts a ceiling. */
export function hasTimingCeiling(source) {
  return CLOCK.test(source) && CEILING.test(source);
}

/** The two violation lists for a root: timing files not named perf, and perf files without a timing ceiling. */
export function audit(root) {
  const files = testFiles(root);
  const misplaced = files.filter((file) => !PERF.test(file) && hasTimingCeiling(readFileSync(join(root, file), 'utf8')));
  const empty = files.filter((file) => PERF.test(file) && !hasTimingCeiling(readFileSync(join(root, file), 'utf8')));
  return { files, misplaced, empty };
}

test('the classifier: a clock plus an upper bound is a timing ceiling, either alone is not', () => {
  assert.equal(hasTimingCeiling('const t = performance.now();\nexpect(t).toBeLessThan(200);'), true);
  assert.equal(hasTimingCeiling('const t = performance.now();\nexpect(slow).toEqual([]); // every entry under its ceiling'), true);
  assert.equal(hasTimingCeiling('const t = performance.now();\nexpect(t).toBeGreaterThan(0);'), false);
  assert.equal(hasTimingCeiling('expect(n).toBeLessThan(500);'), false);
});

test('every test file that asserts a timing ceiling is a *.perf.test.ts', () => {
  const { files, misplaced } = audit(ROOT);
  assert.ok(files.length > 100, `${files.length} test files were scanned`);
  assert.deepEqual(misplaced, [], 'a timing-ceiling test belongs in a sibling *.perf.test.ts (vitest project "perf")');
});

test('no *.perf.test.ts lacks a timing ceiling', () => {
  const { files, empty } = audit(ROOT);
  assert.ok(files.filter((file) => PERF.test(file)).length >= 7, 'the seven known perf files were scanned');
  assert.deepEqual(empty, [], 'a *.perf.test.ts with no clock and ceiling should be a plain *.test.ts');
});
