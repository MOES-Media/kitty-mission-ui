// Row-to-story node test (IC-09): the specification's state matrix rows, the contract's story catalogue and the stories
// of the five real story files must agree, with exact counts. The parser runs against the real files and, as the
// negative case, against a temporary copy with one row deleted. An empty parse fails because the counts are asserted.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'kitty-specs/work-package-screen-01M44DSJ';
const SPEC = `${MISSION}/spec.md`;
const CATALOGUE = `${MISSION}/contracts/sk-work-package-screen.md`;
const STORIES = 'packages/mission-ui/src/elements/sk-work-package-screen';

const EXPECTED = { rows: 50, stories: 56 };
const EXTRAS = ['WP-21b', 'WP-24b', 'WP-33b', 'WP-35b', 'WP-35c', 'WP-36b'];
// the per-title counts of the catalogue, in table order
const TITLES = {
  'Screens/Work Package/Header and facts': 10,
  'Screens/Work Package/Review and history': 13,
  'Screens/Work Package/Chains, subtasks, workspace and links': 19,
  'Screens/Work Package/States': 8,
  'Screens/Work Package/Tiers and edge cases': 6,
};

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

/** Matrix rows of the specification: one anchored pattern. */
export function parseRows(spec) {
  return [...spec.matchAll(/^\| (WP-\d+) \|/gm)].map((m) => m[1]);
}

/** The catalogue table: title cell -> the story ids that open each `;`-separated item. */
export function parseCatalogue(md) {
  const byTitle = {};
  for (const line of md.split('\n')) {
    const m = /^\| `(Screens\/Work Package\/[^`]+)` \([^)]*\) \| (.+) \|$/.exec(line);
    if (!m) continue;
    byTitle[m[1]] = m[2]
      .split(';')
      .map((item) => /^\s*(WP-\d+[a-z]?)\b/.exec(item)?.[1])
      .filter(Boolean);
  }
  return byTitle;
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
      if (!/^Wp\d{2}[a-z]?$/.test(name)) continue;
      const tags = /tags:\s*\[([^\]]*)\]/.exec(part)?.[1] ?? '';
      const rowTags = [...tags.matchAll(/'(wp-\d{2}[a-z]?)'/g)].map((m) => m[1]);
      if (rowTags.length !== 1) {
        problems.push(`${file}: ${name} has ${rowTags.length} row tags`);
        continue;
      }
      const id = rowTags[0].replace(/^wp-/, 'WP-');
      if (name !== `Wp${rowTags[0].slice(3)}`) problems.push(`${file}: export ${name} disagrees with tag ${rowTags[0]}`);
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
  const catalogue = parseCatalogue(read(root, CATALOGUE));
  const catalogueIds = Object.values(catalogue).flat();
  if (catalogueIds.length !== EXPECTED.stories) failures.push(`catalogue stories: expected ${EXPECTED.stories}, got ${catalogueIds.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    if ((catalogue[title] ?? []).length !== n) failures.push(`catalogue title ${title}: expected ${n}, got ${(catalogue[title] ?? []).length}`);
  }
  const { stories, problems } = parseStoryFiles(root);
  failures.push(...problems);
  if (stories.length !== EXPECTED.stories) failures.push(`story files: expected ${EXPECTED.stories}, got ${stories.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    const got = stories.filter((s) => s.title === title).length;
    if (got !== n) failures.push(`story files title ${title}: expected ${n}, got ${got}`);
  }
  const rowSet = new Set(rows);
  for (const id of catalogueIds) if (!rowSet.has(rowOf(id))) failures.push(`catalogue story ${id} maps to no row`);
  for (const s of stories) if (!rowSet.has(rowOf(s.id))) failures.push(`story ${s.id} maps to no row`);
  for (const row of rows) {
    if (!catalogueIds.some((id) => rowOf(id) === row)) failures.push(`row ${row} has no catalogue story`);
    if (!stories.some((s) => rowOf(s.id) === row)) failures.push(`row ${row} has no story in the files`);
  }
  const sortedA = [...catalogueIds].sort().join();
  const sortedB = stories.map((s) => s.id).sort().join();
  if (sortedA !== sortedB) failures.push('the catalogue and the story files list different ids');
  return { failures, rows, catalogueIds, stories };
}

test('the real tree: 50 rows, 56 catalogue stories, 56 story-file stories, per-title 10, 13, 19, 8 and 6', () => {
  const { failures, rows, catalogueIds, stories } = checkTree(ROOT);
  assert.deepEqual(failures, []);
  assert.equal(rows.length, 50);
  assert.equal(catalogueIds.length, 56);
  assert.equal(stories.length, 56);
  for (const [title, n] of Object.entries(TITLES)) {
    assert.equal(stories.filter((s) => s.title === title).length, n, title);
  }
});

test('the stories whose id differs from their row (a letter beyond the row) are the six extras, besides the a-suffixed pairs', () => {
  const { rows, stories } = checkTree(ROOT);
  // a story id equals its row only when the row id has no letter; every lettered story is "different"; the extras are the
  // lettered stories that are the second or later of their row
  const byRow = new Map();
  for (const s of stories) byRow.set(rowOf(s.id), [...(byRow.get(rowOf(s.id)) ?? []), s.id].sort());
  const extras = [...byRow.values()].flatMap((ids) => (ids.length > 1 ? ids.slice(1) : []));
  assert.deepEqual(extras.sort(), [...EXTRAS].sort());
  assert.equal(rows.length + extras.length, 56);
});

test('negative case: a copy with one row deleted fails', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-wp-catalogue-'));
  try {
    mkdirSync(join(tmp, MISSION, 'contracts'), { recursive: true });
    mkdirSync(join(tmp, STORIES), { recursive: true });
    cpSync(join(ROOT, STORIES), join(tmp, STORIES), { recursive: true });
    cpSync(join(ROOT, CATALOGUE), join(tmp, CATALOGUE));
    const spec = read(ROOT, SPEC);
    writeFileSync(join(tmp, SPEC), spec);
    assert.deepEqual(checkTree(tmp).failures, [], 'positive control: the unmodified copy passes');
    writeFileSync(join(tmp, SPEC), spec.split('\n').filter((l) => !l.startsWith('| WP-33 |')).join('\n'));
    const { failures } = checkTree(tmp);
    assert.ok(failures.some((f) => f.startsWith('rows: expected 50, got 49')), failures.join('; '));
    assert.ok(failures.some((f) => f.includes('WP-33') && f.includes('maps to no row')), failures.join('; '));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('negative case: a story removed from a copy of the story files fails; a duplicate id and a mismatched export fail', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-wp-catalogue-'));
  try {
    mkdirSync(join(tmp, MISSION, 'contracts'), { recursive: true });
    mkdirSync(join(tmp, STORIES), { recursive: true });
    cpSync(join(ROOT, STORIES), join(tmp, STORIES), { recursive: true });
    cpSync(join(ROOT, CATALOGUE), join(tmp, CATALOGUE));
    writeFileSync(join(tmp, SPEC), read(ROOT, SPEC));
    const file = join(tmp, STORIES, 'sk-work-package-screen.tiers.stories.ts');
    const original = readFileSync(file, 'utf8');
    writeFileSync(file, original.replace(/^export const Wp45: .*$/m, ''));
    assert.ok(checkTree(tmp).failures.some((f) => f.includes('WP-45')));
    writeFileSync(file, original.replace(/^export const Wp45: Story = \{ tags: \['vw-1280', 'wp-45'\]/m, "export const Wp45: Story = { tags: ['vw-1280', 'wp-44']"));
    const dup = checkTree(tmp).failures;
    assert.ok(dup.some((f) => f.includes('disagrees')), dup.join('; '));
    assert.ok(dup.some((f) => f.includes('WP-44 is repeated')), dup.join('; '));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('an empty parse fails: no rows, no catalogue and no stories cannot pass as equal', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-wp-catalogue-'));
  try {
    mkdirSync(join(tmp, MISSION, 'contracts'), { recursive: true });
    mkdirSync(join(tmp, STORIES), { recursive: true });
    writeFileSync(join(tmp, SPEC), '');
    writeFileSync(join(tmp, CATALOGUE), '');
    const { failures } = checkTree(tmp);
    assert.ok(failures.length >= 3, failures.join('; '));
    assert.equal(parseRows('').length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
