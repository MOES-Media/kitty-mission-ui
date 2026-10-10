// Row-to-story node test (IC-11): the specification's state matrix rows, the contract's story catalogue, the pairing table of the
// fixtures and the stories of the four real story files must agree, with exact counts. It is run by `test:scripts` (so CI runs it:
// a new CI behaviour, PLAN-FRESH4-010). The parser runs against the real files and, as the negative cases, against temporary copies
// with a row, a pairing or a story deleted. An empty parse fails because the counts are asserted.
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'kitty-specs/artifact-viewer-screen-01M47VP5';
const SPEC = `${MISSION}/spec.md`;
const CATALOGUE = `${MISSION}/contracts/sk-artifact-screen.md`;
const SCREEN = 'packages/mission-ui/src/elements/sk-artifact-screen';
const FIXTURES = `${SCREEN}/fixtures.ts`;

// The counts below are a LITERAL PIN, typed in here: 35 rows and 45 stories. The guards cross-check them against the pairing table
// (its length) and against the catalogue (its own count), so a change to either source turns this file red until the pin is
// reviewed; the pin is not derived from them.
const EXPECTED = { rows: 35, stories: 45 };
// The four story groups sit under this prefix, as #5's sit under `Screens/Work Package/`; the catalogue may name a group with or without it.
const GROUP = 'Screens/Artifact/';
const groupName = (title) => (title.startsWith(GROUP) ? title.slice(GROUP.length) : title);
const TITLES = { Document: 9, 'Refusals and states': 10, 'Inspector and tree': 13, 'Tiers and edge cases': 13 };

const read = (root, rel) => readFileSync(join(root, rel), 'utf8');
/** `AV-30a` and `AV-30` share the row `AV-30`: a trailing letter is dropped. */
const rowOf = (id) => id.replace(/[a-z]$/, '');

/** Matrix rows of the specification: one anchored pattern. */
export function parseRows(spec) {
  return [...spec.matchAll(/^\| (AV-\d+) \|/gm)].map((m) => m[1]);
}

/** The pairing table of the fixtures: the keys between `export const PAIRINGS = {` and its closing `} as const`. */
export function parsePairings(fixtures) {
  const body = /export const PAIRINGS = \{\n([\s\S]*?)\n\} as const/.exec(fixtures)?.[1] ?? '';
  return [...body.matchAll(/^ {2}'(AV-\d+[a-z]?)':/gm)].map((m) => m[1]);
}

/** Expands a catalogue cell such as `AV-01, 02, 31 (note); AV-24, 25a` into ids; a bare number takes the `AV-` of the list. */
export function expandCell(cell) {
  const ids = [];
  for (const item of cell.split(/[;,]/)) {
    const m = /^\s*(?:AV-)?(\d{2}[a-z]?)\b/.exec(item);
    if (m) ids.push(`AV-${m[1]}`);
  }
  return ids;
}

/** The catalogue table: title -> ids. */
export function parseCatalogue(md) {
  const byTitle = {};
  for (const line of md.split('\n')) {
    const m = /^\| `([^`]+)` \(IC-\d+\) \| (.+) \|$/.exec(line);
    if (m) byTitle[groupName(m[1])] = expandCell(m[2]);
  }
  return byTitle;
}

/** The stories of the real story files: id from the one `av-` row tag, the export name checked against it. */
export function parseStoryFiles(root) {
  const dir = join(root, SCREEN);
  const stories = [];
  const problems = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.stories.ts')).sort()) {
    const text = readFileSync(join(dir, file), 'utf8');
    const fullTitle = /title:\s*'([^']+)'/.exec(text)?.[1] ?? '';
    if (!fullTitle.startsWith(GROUP)) problems.push(`${file}: the story title ${fullTitle} is not under ${GROUP}`);
    const title = groupName(fullTitle);
    for (const part of text.split(/^export const /m).slice(1)) {
      const name = /^(\w+)/.exec(part)?.[1] ?? '';
      if (!/^Av\d{2}[a-z]?$/.test(name)) continue;
      const tags = /tags:\s*\[([^\]]*)\]/.exec(part)?.[1] ?? '';
      const rowTags = [...tags.matchAll(/'(av-\d{2}[a-z]?)'/g)].map((m) => m[1]);
      if (rowTags.length !== 1) {
        problems.push(`${file}: ${name} has ${rowTags.length} row tags`);
        continue;
      }
      if (name !== `Av${rowTags[0].slice(3)}`) problems.push(`${file}: export ${name} disagrees with tag ${rowTags[0]}`);
      stories.push({ id: rowTags[0].replace(/^av-/, 'AV-'), title, file });
    }
  }
  const seen = new Set();
  for (const s of stories) {
    if (seen.has(s.id)) problems.push(`${s.id} is repeated`);
    seen.add(s.id);
  }
  return { stories, problems };
}

/** Every check, over one tree; returns the list of failures (empty means the tree is consistent). */
export function checkTree(root) {
  const failures = [];
  const rows = parseRows(read(root, SPEC));
  if (rows.length !== EXPECTED.rows) failures.push(`rows: expected ${EXPECTED.rows}, got ${rows.length}`);
  const pairings = parsePairings(read(root, FIXTURES));
  if (pairings.length !== EXPECTED.stories) failures.push(`pairing table: expected ${EXPECTED.stories}, got ${pairings.length}`);
  const catalogue = parseCatalogue(read(root, CATALOGUE));
  const catalogueIds = Object.values(catalogue).flat();
  if (catalogueIds.length !== pairings.length) failures.push(`catalogue stories ${catalogueIds.length} differ from the pairing table's ${pairings.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    if ((catalogue[title] ?? []).length !== n) failures.push(`catalogue title ${title}: expected ${n}, got ${(catalogue[title] ?? []).length}`);
  }
  const { stories, problems } = parseStoryFiles(root);
  failures.push(...problems);
  if (stories.length !== pairings.length) failures.push(`story files: ${stories.length} stories differ from the pairing table's ${pairings.length}`);
  for (const [title, n] of Object.entries(TITLES)) {
    const got = stories.filter((s) => s.title === title).length;
    if (got !== n) failures.push(`story files title ${title}: expected ${n}, got ${got}`);
  }
  const rowSet = new Set(rows);
  for (const id of [...catalogueIds, ...pairings, ...stories.map((s) => s.id)]) if (!rowSet.has(rowOf(id))) failures.push(`${id} maps to no row`);
  for (const row of rows) {
    if (!catalogueIds.some((id) => rowOf(id) === row)) failures.push(`row ${row} has no catalogue story`);
    if (!pairings.some((id) => rowOf(id) === row)) failures.push(`row ${row} has no pairing`);
    if (!stories.some((s) => rowOf(s.id) === row)) failures.push(`row ${row} has no story in the files`);
  }
  const sorted = (ids) => [...ids].sort().join();
  if (sorted(catalogueIds) !== sorted(pairings)) failures.push('the catalogue and the pairing table list different ids');
  if (sorted(stories.map((s) => s.id)) !== sorted(pairings)) failures.push('the story files and the pairing table list different ids');
  return { failures, rows, pairings, catalogueIds, stories };
}

/** A temporary copy of the files the checks read; `edit` may change them before the copy is checked. */
function withCopy(edit, check) {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-av-catalogue-'));
  try {
    mkdirSync(join(tmp, MISSION, 'contracts'), { recursive: true });
    mkdirSync(join(tmp, SCREEN), { recursive: true });
    cpSync(join(ROOT, SCREEN), join(tmp, SCREEN), { recursive: true });
    cpSync(join(ROOT, CATALOGUE), join(tmp, CATALOGUE));
    cpSync(join(ROOT, SPEC), join(tmp, SPEC));
    edit(tmp);
    check(tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test('the real tree: 35 rows, 45 pairings, 45 catalogue stories, 45 story-file stories, per-title 9, 10, 13 and 13', () => {
  const { failures, rows, pairings, catalogueIds, stories } = checkTree(ROOT);
  assert.deepEqual(failures, []);
  assert.equal(rows.length, 35);
  assert.equal(pairings.length, 45);
  assert.equal(catalogueIds.length, 45);
  assert.equal(stories.length, 45);
  for (const [title, n] of Object.entries(TITLES)) assert.equal(stories.filter((s) => s.title === title).length, n, title);
});

test('the lettered stories are the ten that share a row: AV-25, 26 two each, AV-30 six, AV-32 four', () => {
  const { rows, stories } = checkTree(ROOT);
  const byRow = new Map();
  for (const s of stories) byRow.set(rowOf(s.id), [...(byRow.get(rowOf(s.id)) ?? []), s.id]);
  const shared = [...byRow.entries()].filter(([, ids]) => ids.length > 1).map(([row, ids]) => `${row}:${ids.length}`).sort();
  assert.deepEqual(shared, ['AV-25:2', 'AV-26:2', 'AV-30:6', 'AV-32:4']);
  assert.equal(rows.length + 1 + 1 + 5 + 3, 45); // 35 rows plus the extra story of each shared row
});

test('negative case: a copy with one row deleted fails (positive control: the unmodified copy passes)', () => {
  withCopy(() => {}, (tmp) => assert.deepEqual(checkTree(tmp).failures, []));
  withCopy(
    (tmp) => writeFileSync(join(tmp, SPEC), read(ROOT, SPEC).split('\n').filter((l) => !l.startsWith('| AV-19 |')).join('\n')),
    (tmp) => {
      const { failures } = checkTree(tmp);
      assert.ok(failures.some((f) => f.startsWith('rows: expected 35, got 34')), failures.join('; '));
      assert.ok(failures.some((f) => f.includes('AV-19') && f.includes('maps to no row')), failures.join('; '));
    },
  );
});

test('negative case: a copy with one pairing deleted fails', () => {
  withCopy(
    (tmp) => writeFileSync(join(tmp, FIXTURES), read(ROOT, FIXTURES).split('\n').filter((l) => !l.startsWith("  'AV-30e':")).join('\n')),
    (tmp) => {
      const { failures } = checkTree(tmp);
      assert.ok(failures.some((f) => f.startsWith('pairing table: expected 45, got 44')), failures.join('; '));
      assert.ok(failures.some((f) => f.includes('differ')), failures.join('; '));
    },
  );
});

test('negative case: a copy with one story deleted fails', () => {
  withCopy(
    (tmp) => {
      const file = join(tmp, SCREEN, 'refusals-states.stories.ts');
      writeFileSync(file, readFileSync(file, 'utf8').split('\n').filter((l) => !l.startsWith('export const Av22:')).join('\n'));
    },
    (tmp) => {
      const { failures } = checkTree(tmp);
      assert.ok(failures.some((f) => f.includes('story files')), failures.join('; '));
    },
  );
});

test('negative case: a story group outside Screens/Artifact/ fails', () => {
  withCopy(
    (tmp) => {
      const file = join(tmp, SCREEN, 'document.stories.ts');
      writeFileSync(file, readFileSync(file, 'utf8').replace("title: 'Screens/Artifact/Document'", "title: 'Document'"));
    },
    (tmp) => {
      const { failures } = checkTree(tmp);
      assert.ok(failures.some((f) => f.includes('is not under Screens/Artifact/')), failures.join('; '));
    },
  );
});

test('an empty parse fails: no rows, no catalogue, no pairings and no stories cannot pass as equal', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'sk-av-catalogue-'));
  try {
    mkdirSync(join(tmp, MISSION, 'contracts'), { recursive: true });
    mkdirSync(join(tmp, SCREEN), { recursive: true });
    writeFileSync(join(tmp, SPEC), '');
    writeFileSync(join(tmp, CATALOGUE), '');
    writeFileSync(join(tmp, FIXTURES), '');
    const { failures } = checkTree(tmp);
    assert.ok(failures.length >= 3, failures.join('; '));
    assert.equal(parseRows('').length, 0);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
