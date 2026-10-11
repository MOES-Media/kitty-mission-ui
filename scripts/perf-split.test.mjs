// The timing-ceiling tests run in their own vitest project (`perf`), one file at a time, so that a wall-clock ceiling is not
// measured while other test files share the browser. This guard keeps the split honest in both directions: a test file that
// reads `performance.now()` and asserts a ceiling must be a `*.perf.test.ts`, and a `*.perf.test.ts` must hold one.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PERF = /\.perf\.test\.ts$/;
// Every clock a test can read: the monotonic one, the wall one, and the User Timing marks and measures.
const CLOCK = /\b(?:performance\.(?:now|mark|measure)|Date\.now)\s*\(/;
// A ceiling assertion: an upper-bound matcher call. A comment or a variable that merely says "ceiling" is not an assertion.
const CEILING = /\.toBeLessThan(?:OrEqual)?\s*\(/;

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

/** True when the source reads a clock and asserts a ceiling with an upper-bound matcher. */
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
  assert.equal(hasTimingCeiling('const t = performance.now();\nexpect(t).toBeLessThanOrEqual(200);'), true);
  assert.equal(hasTimingCeiling('const t = performance.now();\nexpect(t).toBeGreaterThan(0);'), false);
  assert.equal(hasTimingCeiling('expect(n).toBeLessThan(500);'), false);
});

test('the classifier sees every clock, and needs a real matcher rather than the word ceiling', () => {
  // A unit file that reads the wall clock and asserts an upper bound is a timing test, whichever clock it reads.
  assert.equal(hasTimingCeiling('const t = Date.now();\nexpect(Date.now() - t).toBeLessThan(200);'), true);
  assert.equal(hasTimingCeiling('performance.mark("a");\nexpect(elapsed).toBeLessThan(200);'), true);
  assert.equal(hasTimingCeiling('performance.measure("a", "b");\nexpect(elapsed).toBeLessThanOrEqual(200);'), true);
  // A clock alone, or an upper bound alone, is not.
  assert.equal(hasTimingCeiling('const t = Date.now();\nexpect(t).toBeGreaterThan(0);'), false);
  assert.equal(hasTimingCeiling('performance.mark("a");\nexpect(n).toBe(1);'), false);
  // A perf file whose only "ceiling" is a comment or a name asserts nothing and is flagged as empty.
  const commentOnly = 'const t = performance.now();\n// every entry stays under its ceiling\nconst ceiling = 200;\nexpect(slow).toEqual([]);';
  assert.equal(hasTimingCeiling(commentOnly), false);
  const root = mkdtempSync(join(tmpdir(), 'perf-split-'));
  try {
    mkdirSync(join(root, 'packages/p/test'), { recursive: true });
    writeFileSync(join(root, 'packages/p/test/a.test.ts'), 'const t = Date.now();\nexpect(Date.now() - t).toBeLessThan(200);\n');
    writeFileSync(join(root, 'packages/p/test/b.perf.test.ts'), commentOnly);
    writeFileSync(join(root, 'packages/p/test/c.perf.test.ts'), 'const t = performance.now();\nexpect(performance.now() - t).toBeLessThan(200);\n');
    const { misplaced, empty } = audit(root);
    assert.deepEqual(misplaced, ['packages/p/test/a.test.ts']);
    assert.deepEqual(empty, ['packages/p/test/b.perf.test.ts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
