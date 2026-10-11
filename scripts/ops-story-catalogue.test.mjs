// Row-to-story node test (IC-08): the state-matrix rows of the Ops specification and the stories of the four Ops story files
// must agree, with exact counts. OP-34 is not built (OQ-2 a) and has no story. The parser runs against the real files and, as
// the negative cases, against temporary copies with a row or a story removed. An empty parse fails because counts are asserted.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = 'kitty-specs/ops-screen-01M4C92P/spec.md';
const STORIES = 'packages/mission-ui/src/elements/sk-ops-screen';

const NOT_BUILT = ['OP-34'];
const EXPECTED = { rows: 36, stories: 37 };
const TITLES = {
  'Screens/Ops/Rows': 16,
  'Screens/Ops/Paging and notices': 9,
  'Screens/Ops/States': 8,
  'Screens/Ops/Tiers and edge cases': 4,
};

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

/** Built matrix rows of the specification: one anchored pattern; the rows that are not built are dropped. */
export function parseRows(spec) {
  return [...spec.matchAll(/^\| (OP-\d+) \|/gm)].map((m) => m[1]).filter((id) => !NOT_BUILT.includes(id));
}

/** The stories of the real story files: id from the one row tag, export name checked against it. */
export function parseStoryFiles(root) {
  const dir = join(root, STORIES);
  const files = readdirSync(dir).filter((f) => f.endsWith('.stories.ts')).sort();
  const stories = [];
  const problems = [];
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    const title = /title:\s*'([^']+)'/.exec(text)?.[1] ?? '';
    const parts = text.split(/^export const /m).slice(1);
    for (const part of parts) {
      const name = /^(\w+)/.exec(part)?.[1] ?? '';
      if (!/^Op\d{2}[a-z]?$/.test(name)) continue;
      const tags = /tags:\s*\[([^\]]*)\]/.exec(part)?.[1] ?? '';
      const rowTags = [...tags.matchAll(/'(op-\d{2}[a-z]?)'/g)].map((m) => m[1]);
      if (rowTags.length !== 1) {
        problems.push(`${file}: ${name} has ${rowTags.length} row tags`);
        continue;
      }
      const id = rowTags[0].replace(/^op-/, 'OP-');
      if (name !== `Op${rowTags[0].slice(3)}`) problems.push(`${file}: export ${name} disagrees with tag ${rowTags[0]}`);
      stories.push({ id, title, file });
    }
  }
  const seen = new Set();
  for (const s of stories) {
    if (seen.has(s.id)) problems.push(`${s.id} is repeated`);
    seen.add(s.id);
  }
  return { stories, problems };
}

const rowOf = (id) => id.replace(/[a-z]$/, '');

/** Every check, over one tree; returns the list of failures (empty means the tree is consistent). */
export function checkTree(root) {
  const failures = [];
  const rows = parseRows(read(root, SPEC));
  if (rows.length !== EXPECTED.rows) failures.push(`rows: expected ${EXPECTED.rows}, got ${rows.length}`);
  const { stories, problems } = parseStoryFiles(root);
  failures.push(...problems);
  if (stories.length !== EXPECTED.stories) failures.push(`story files: expected ${EXPECTED.stories}, got ${stories.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    const got = stories.filter((s) => s.title === title).length;
    if (got !== n) failures.push(`story files title ${title}: expected ${n}, got ${got}`);
  }
  const rowSet = new Set(rows);
  for (const s of stories) if (!rowSet.has(rowOf(s.id))) failures.push(`story ${s.id} maps to no row`);
  for (const row of rows) {
    if (!stories.some((s) => rowOf(s.id) === row)) failures.push(`row ${row} has no story in the files`);
  }
  return { failures, rows, stories };
}

function copyTree() {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-ops-catalogue-'));
  mkdirSync(join(tmp, dirname(SPEC)), { recursive: true });
  mkdirSync(join(tmp, STORIES), { recursive: true });
  cpSync(join(ROOT, STORIES), join(tmp, STORIES), { recursive: true });
  writeFileSync(join(tmp, SPEC), read(ROOT, SPEC));
  return tmp;
}

test('the real tree: 36 built rows, 37 stories (OP-21a is a second story of row OP-21), per-title 16, 9, 8 and 4, OP-34 absent', () => {
  const { failures, rows, stories } = checkTree(ROOT);
  assert.deepEqual(failures, []);
  assert.equal(rows.length, 36);
  assert.equal(stories.length, 37);
  assert.equal(new Set(stories.map((s) => s.id)).size, 37);
  for (const [title, n] of Object.entries(TITLES)) {
    assert.equal(stories.filter((s) => s.title === title).length, n, title);
  }
  assert.equal(rows.includes('OP-34'), false);
  assert.equal(stories.some((s) => s.id === 'OP-34'), false);
  assert.deepEqual(stories.map((s) => s.id).sort(), [...rows, 'OP-21a'].sort());
});

test('negative case: a copy with one row deleted fails; the unmodified copy passes', () => {
  const tmp = copyTree();
  try {
    assert.deepEqual(checkTree(tmp).failures, [], 'positive control: the unmodified copy passes');
    const spec = read(ROOT, SPEC);
    writeFileSync(join(tmp, SPEC), spec.split('\n').filter((l) => !l.startsWith('| OP-33 |')).join('\n'));
    const { failures } = checkTree(tmp);
    assert.ok(failures.some((f) => f.startsWith('rows: expected 36, got 35')), failures.join('; '));
    assert.ok(failures.some((f) => f.includes('OP-33') && f.includes('maps to no row')), failures.join('; '));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('negative case: a story removed fails; a duplicate id and a mismatched export fail', () => {
  const tmp = copyTree();
  try {
    const file = join(tmp, STORIES, 'sk-ops-screen.tiers.stories.ts');
    const original = readFileSync(file, 'utf8');
    assert.match(original, /^export const Op32: .*$/m);
    writeFileSync(file, original.replace(/^export const Op32: .*$/m, ''));
    const removed = checkTree(tmp).failures;
    assert.ok(removed.some((f) => f.includes('OP-32')), removed.join('; '));
    writeFileSync(file, original.replace(/^export const Op32: Story = \{ tags: \['vw-620', 'op-32'\]/m, "export const Op32: Story = { tags: ['vw-620', 'op-31']"));
    const dup = checkTree(tmp).failures;
    assert.ok(dup.some((f) => f.includes('disagrees')), dup.join('; '));
    assert.ok(dup.some((f) => f.includes('OP-31 is repeated')), dup.join('; '));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('an empty parse fails: no rows and no stories cannot pass as equal', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-ops-catalogue-'));
  try {
    mkdirSync(join(tmp, dirname(SPEC)), { recursive: true });
    mkdirSync(join(tmp, STORIES), { recursive: true });
    writeFileSync(join(tmp, SPEC), '');
    const { failures } = checkTree(tmp);
    assert.ok(failures.length >= 2, failures.join('; '));
    assert.equal(parseRows('').length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('OP-34 in the specification is excluded from the built rows (positive control: OP-33 is kept)', () => {
  const rows = parseRows('| OP-33 | a |\n| OP-34 | b |\n| OP-35 | c |\n');
  assert.deepEqual(rows, ['OP-33', 'OP-35']);
});

test('every Ops story file frames its stories with the Ops nav item current and binds a project (positive control: a copy without it fails)', () => {
  const dir = join(ROOT, STORIES);
  const files = readdirSync(dir).filter((f) => f.endsWith('.stories.ts')).sort();
  assert.equal(files.length, 4);
  const check = (text) => {
    const problems = [];
    if ((text.match(/current: 'nav-ops'/g) ?? []).length !== 1) problems.push('nav-ops is not set exactly once');
    if ((text.match(/\.project=\$\{args\.project\}/g) ?? []).length !== 1) problems.push('the project is not bound exactly once');
    if (/^\s*project:/m.test(text)) problems.push('a story overrides the project');
    return problems;
  };
  let ran = 0;
  for (const file of files) {
    const text = readFileSync(join(dir, file), 'utf8');
    assert.deepEqual(check(text), [], file);
    ran += 1;
  }
  assert.equal(ran, 4);
  const sample = readFileSync(join(dir, files[0]), 'utf8');
  assert.equal(check(sample.replace("current: 'nav-ops'", "current: 'nav-missions'")).length, 1);
  assert.equal(check(sample.replace('.project=${args.project}', '')).length, 1);
});

// Baseline distinctness: two stories may share a baseline only when the specification says their looks are the same.
const SAME_LOOK = [
  ['op-22', 'op-35', 'op-36'], // the loading look (OP-35 and OP-36 are the loading look reached by other inputs)
  ['op-19', 'op-37'], // the empty look (OP-37 is the empty look reached with status ready)
];

test('Ops baselines: byte-identical groups are exactly the intended same-look sets', async () => {
  const { createHash } = await import('node:crypto');
  const dir = join(ROOT, 'apps/storybook/tests/visual/__snapshots__');
  const files = readdirSync(dir).filter((f) => /^screens-ops-.*--op-\d{2}(-[a-z])?\.png$/.test(f)).sort();
  assert.equal(files.length, 37);
  const groups = new Map();
  for (const f of files) {
    const hash = createHash('sha256').update(readFileSync(join(dir, f))).digest('hex');
    groups.set(hash, [...(groups.get(hash) ?? []), /--(op-\d{2}(?:-[a-z])?)\.png$/.exec(f)[1]]);
  }
  const identical = [...groups.values()].filter((g) => g.length > 1).map((g) => g.sort());
  assert.deepEqual(identical.sort((a, b) => a[0].localeCompare(b[0])), SAME_LOOK.map((g) => [...g].sort()).sort((a, b) => a[0].localeCompare(b[0])));
  assert.equal(groups.size, 34);
});
