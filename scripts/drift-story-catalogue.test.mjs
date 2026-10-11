// Row-to-story node test (IC-07): the specification's state matrix rows and the stories of the five real Drift story
// files must agree, with exact counts. The shell wiring (FR-023, amendment A-1) is asserted on the one frame every story
// sits in. The parser runs against the real files and, as the negative cases, against temporary copies. An empty parse
// fails because the counts are asserted.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = 'kitty-specs/drift-screen-01M4C93T/spec.md';
const STORIES = 'packages/mission-ui/src/elements/sk-drift-screen';
const FIXTURES = `${STORIES}/fixtures.ts`;

// 33 matrix rows, DR-07a and DR-07b counted separately; DR-09 is dropped by ruling, so 32 rows carry a story.
const EXPECTED = { rows: 33, dropped: ['DR-09'], rowStories: 32, extras: ['DR-10b', 'DR-25b', 'DR-25c', 'DR-25d', 'DR-26b', 'DR-30b'] };
const TOTAL = EXPECTED.rowStories + EXPECTED.extras.length;
const TITLES = {
  'Screens/Drift/Detail': 14,
  'Screens/Drift/List': 4,
  'Screens/Drift/States': 9,
  // the two whole-screen stories (DR-01, DR-24) share this title: the visual gate wants at least four stories per title
  'Screens/Drift/Tiers': 11,
};

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
// DR-07a and DR-07b are rows of their own; any other lettered id belongs to the row without the letter.
const rowOf = (id) => (/^DR-07[ab]$/.test(id) ? id : id.replace(/(\d)[a-z]$/, '$1'));

/** Matrix rows of the specification: one anchored pattern (DR-07a and DR-07b are rows of their own). */
export function parseRows(spec) {
  return [...spec.matchAll(/^\| (DR-\d+[a-z]?) \|/gm)].map((m) => m[1]);
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
    for (const part of text.split(/^export const /m).slice(1)) {
      const name = /^(\w+)/.exec(part)?.[1] ?? '';
      if (!/^Dr\d{2}/.test(name)) continue;
      const tags = /tags:\s*\[([^\]]*)\]/.exec(part)?.[1] ?? '';
      const rowTags = [...tags.matchAll(/'(dr-\d{2}[a-z]?)'/g)].map((m) => m[1]);
      if (rowTags.length !== 1) {
        problems.push(`${file}: ${name} has ${rowTags.length} row tags`);
        continue;
      }
      const id = rowTags[0].replace(/^dr-/, 'DR-');
      if (!name.startsWith(`Dr${rowTags[0].slice(3, 5)}`)) problems.push(`${file}: export ${name} disagrees with tag ${rowTags[0]}`);
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

/** FR-023: every story sits in the project shell with the Drift item marked and `flush`; the stories go through that frame. */
export function checkShellWiring(root) {
  const failures = [];
  const fixtures = read(root, FIXTURES);
  const frame = /export function driftFrame[\s\S]*?\n}\n/.exec(fixtures)?.[0] ?? '';
  if (!/current:\s*'nav-drift'/.test(frame)) failures.push("driftFrame does not set current: 'nav-drift'");
  if (!/flush:\s*true/.test(frame)) failures.push('driftFrame does not set flush: true');
  const dir = join(root, STORIES);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.stories.ts'))) {
    if (!/driftFrame\(/.test(readFileSync(join(dir, file), 'utf8'))) failures.push(`${file} does not render through driftFrame`);
  }
  return failures;
}

/** Every check, over one tree; returns the list of failures (empty means the tree is consistent). */
export function checkTree(root) {
  const failures = [];
  const rows = parseRows(read(root, SPEC));
  if (rows.length !== EXPECTED.rows) failures.push(`rows: expected ${EXPECTED.rows}, got ${rows.length}`);
  const { stories, problems } = parseStoryFiles(root);
  failures.push(...problems);
  if (stories.length !== TOTAL) failures.push(`story files: expected ${TOTAL}, got ${stories.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    const got = stories.filter((s) => s.title === title).length;
    if (got !== n) failures.push(`story files title ${title}: expected ${n}, got ${got}`);
  }
  const rowSet = new Set(rows);
  for (const s of stories) if (!rowSet.has(rowOf(s.id))) failures.push(`story ${s.id} maps to no row`);
  for (const row of rows) {
    const has = stories.some((s) => rowOf(s.id) === row);
    if (EXPECTED.dropped.includes(row)) {
      if (has) failures.push(`row ${row} is dropped by ruling but has a story`);
    } else if (!has) failures.push(`row ${row} has no story in the files`);
  }
  failures.push(...checkShellWiring(root));
  return { failures, rows, stories };
}

function copyTree() {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-drift-catalogue-'));
  mkdirSync(join(tmp, dirname(SPEC)), { recursive: true });
  mkdirSync(join(tmp, STORIES), { recursive: true });
  cpSync(join(ROOT, STORIES), join(tmp, STORIES), { recursive: true });
  writeFileSync(join(tmp, SPEC), read(ROOT, SPEC));
  return tmp;
}

test('the real tree: 33 rows, DR-09 dropped, 38 stories (32 row stories and six extras), per-title 14, 4, 9 and 11', () => {
  const { failures, rows, stories } = checkTree(ROOT);
  assert.deepEqual(failures, []);
  assert.equal(rows.length, 33);
  assert.equal(stories.length, 38);
  for (const [title, n] of Object.entries(TITLES)) assert.equal(stories.filter((s) => s.title === title).length, n, title);
  assert.equal(rows.length - EXPECTED.dropped.length, 32);
});

test('the stories whose id adds a letter to their row are exactly the six extras (DR-07a and DR-07b are rows of their own)', () => {
  const { stories } = checkTree(ROOT);
  const byRow = new Map();
  for (const s of stories) byRow.set(rowOf(s.id), [...(byRow.get(rowOf(s.id)) ?? []), s.id].sort());
  const extras = [...byRow.values()].flatMap((ids) => (ids.length > 1 ? ids.slice(1) : []));
  assert.equal(byRow.size, 32, 'one row group per row that carries a story');
  assert.deepEqual(extras.sort(), [...EXPECTED.extras].sort());
});

test('shell wiring: the real frame passes; a frame without nav-drift or without flush fails (positive control first)', () => {
  assert.deepEqual(checkShellWiring(ROOT), []);
  const tmp = copyTree();
  try {
    mkdirSync(join(tmp, STORIES), { recursive: true });
    const fixtures = read(ROOT, FIXTURES);
    writeFileSync(join(tmp, FIXTURES), fixtures);
    assert.deepEqual(checkShellWiring(tmp), [], 'positive control: the unmodified copy passes');
    writeFileSync(join(tmp, FIXTURES), fixtures.replace("current: 'nav-drift'", "current: 'nav-pipeline'"));
    assert.ok(checkShellWiring(tmp).some((f) => f.includes('nav-drift')));
    writeFileSync(join(tmp, FIXTURES), fixtures.replace('flush: true', 'flush: false'));
    assert.ok(checkShellWiring(tmp).some((f) => f.includes('flush')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('negative case: a copy with one row deleted fails', () => {
  const tmp = copyTree();
  try {
    assert.deepEqual(checkTree(tmp).failures, [], 'positive control: the unmodified copy passes');
    writeFileSync(join(tmp, SPEC), read(ROOT, SPEC).split('\n').filter((l) => !l.startsWith('| DR-13 |')).join('\n'));
    const { failures } = checkTree(tmp);
    assert.ok(failures.some((f) => f.startsWith('rows: expected 33, got 32')), failures.join('; '));
    assert.ok(failures.some((f) => f.includes('DR-13') && f.includes('maps to no row')), failures.join('; '));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('negative case: a story removed fails; a duplicate id and a mismatched export fail; a story for the dropped row fails', () => {
  const tmp = copyTree();
  try {
    const file = join(tmp, STORIES, 'sk-drift-screen.detail.stories.ts');
    const original = readFileSync(file, 'utf8');
    writeFileSync(file, original.replace(/^export const Dr13: .*$/m, ''));
    assert.ok(checkTree(tmp).failures.some((f) => f.includes('DR-13')));
    writeFileSync(file, original.replace(/^(export const Dr13: Story = \{ tags: \[)'dr-13'/m, "$1'dr-12'"));
    const dup = checkTree(tmp).failures;
    assert.ok(dup.some((f) => f.includes('disagrees')), dup.join('; '));
    assert.ok(dup.some((f) => f.includes('DR-12 is repeated')), dup.join('; '));
    writeFileSync(file, `${original}\nexport const Dr09: Story = { tags: ['dr-09', 'vw-1280'] };\n`);
    assert.ok(checkTree(tmp).failures.some((f) => f.includes('DR-09') && f.includes('dropped')));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('an empty parse fails: no rows and no stories cannot pass as equal', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-drift-catalogue-'));
  try {
    mkdirSync(join(tmp, dirname(SPEC)), { recursive: true });
    mkdirSync(join(tmp, STORIES), { recursive: true });
    writeFileSync(join(tmp, SPEC), '');
    writeFileSync(join(tmp, FIXTURES), '');
    const { failures } = checkTree(tmp);
    assert.ok(failures.length >= 2, failures.join('; '));
    assert.equal(parseRows('').length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
