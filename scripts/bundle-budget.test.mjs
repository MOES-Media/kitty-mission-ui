// The bundle budget of the markdown parser (NFR-013). `parse.ts` is the one importer of `markdown-it`, so its built chunk IS the
// parser's cost in the bundle. The test builds it with the programmatic `build` of the root `vite` devDependency (the engine
// Storybook's own build uses, with its defaults: esbuild minify), gzips the chunk at level 9 and fails above the budget.
//
// The constants cite the S-A0 measurement (research D-05):
//   step one (IC-01b, raw markdown-it with the contract's option table, scratch script): 143,755 B minified, 49,467 B gzip.
//   step two (IC-04, this test, the real parse.ts chunk): 143,755 B minified, 49,463 B gzip (4 B under step one: the one file
//   adds `parseTokens` and loses nothing).
// The budget is the step-two figure x 1.15, rounded up to the next KiB (NFR-013): 49,463 x 1.15 = 56,882 B, 56 KiB = 57,344 B.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = 'packages/mission-ui/src/logic/markdown/parse.ts';
const KIB = 1024;

/** S-A0 step two: the real parse.ts chunk, measured by this test's own build. */
export const MEASURED_GZIP_BYTES = 49463;
export const MEASURED_MINIFIED_BYTES = 143755;
/** NFR-013: the measured figure x 1.15, rounded up to the next KiB. */
export const BUDGET_GZIP_BYTES = Math.ceil((MEASURED_GZIP_BYTES * 1.15) / KIB) * KIB;

/** Whether `gzipBytes` is over the budget (a limit is inclusive: a chunk at exactly the budget passes). */
export function overBudget(gzipBytes, budget = BUDGET_GZIP_BYTES) {
  return gzipBytes > budget;
}

/** Builds `entry` as one ES module chunk, in memory, and returns its code. */
async function chunkOf(entry) {
  const result = await build({
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
    build: { write: false, minify: 'esbuild', lib: { entry, formats: ['es'], fileName: 'chunk' } },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((one) => one.output);
  const chunks = outputs.filter((output) => output.type === 'chunk');
  assert.equal(chunks.length, 1, 'parse.ts builds to exactly one chunk (no split, no dynamic import)');
  return chunks[0].code;
}

describe('the parser bundle budget (NFR-013)', () => {
  test('the budget is the S-A0 figure x 1.15 rounded up to the next KiB, which is 56 KiB', () => {
    assert.equal(BUDGET_GZIP_BYTES, 57344);
    assert.equal(BUDGET_GZIP_BYTES % KIB, 0);
    assert.ok(BUDGET_GZIP_BYTES >= MEASURED_GZIP_BYTES * 1.15, 'at least 15 percent above the measured figure');
    assert.ok(BUDGET_GZIP_BYTES < MEASURED_GZIP_BYTES * 1.15 + KIB, 'less than one KiB above that');
  });

  test('the over-budget check can fail: one byte over fails, the budget itself and zero pass', () => {
    assert.equal(overBudget(BUDGET_GZIP_BYTES + 1), true);
    assert.equal(overBudget(BUDGET_GZIP_BYTES), false);
    assert.equal(overBudget(0), false);
    assert.equal(overBudget(MEASURED_GZIP_BYTES, MEASURED_GZIP_BYTES - 1), true);
  });

  test('the real parse.ts chunk, gzipped at level 9, is within the budget', async () => {
    const code = await chunkOf(ENTRY);
    const gzip = gzipSync(code, { level: 9 }).length;
    assert.ok(!overBudget(gzip), `parse.ts is ${gzip} B gzip, over the budget of ${BUDGET_GZIP_BYTES} B (measured at ${MEASURED_GZIP_BYTES} B)`);
  });

  test('the build is representative: markdown-it is inside the chunk (control), nothing is left external, the size is near the S-A0 figure', async () => {
    const code = await chunkOf(ENTRY);
    const gzip = gzipSync(code, { level: 9 }).length;
    // A build that failed to include the parser would be tiny and pass the budget vacuously.
    assert.ok(gzip > MEASURED_GZIP_BYTES * 0.8, `${gzip} B gzip is below 80 percent of the measured figure: the parser is not in the chunk`);
    assert.ok(code.length > MEASURED_MINIFIED_BYTES * 0.8, 'the minified chunk is far smaller than the measured one');
    // A doc comment inside the bundled library mentions the package; an import statement or call is what would be external.
    assert.ok(!/(^|[;}\n])\s*import[\s{*"'(]/.test(code), 'markdown-it is bundled: the chunk has no import statement and no import()');
    assert.ok(/parseTokens/.test(code) || /export\s*\{/.test(code), 'the chunk exports the seam');
  });

  test('the control for the measurement: a build of a larger entry is bigger, so the figure moves with what is bundled', async () => {
    const parser = gzipSync(await chunkOf(ENTRY), { level: 9 }).length;
    const withModel = gzipSync(await chunkOf('packages/mission-ui/src/logic/markdown/model.ts'), { level: 9 }).length;
    assert.ok(withModel > parser, `model.ts (${withModel} B) bundles parse.ts and more, so it is bigger than parse.ts (${parser} B)`);
  });
});
