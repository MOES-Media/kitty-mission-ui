// The scheduled drift alert (FR-012): drift.mjs against temporary local git repositories only. No network anywhere:
// CONTRACT_REMOTE_URL points at a local repository, and "unreachable" is a local path that does not exist (A13).
// These tests run inside every contract gate clean run, so child output is captured and asserted on, never echoed
// (D9), and no contract plant token may appear in it (E5).
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { comparePinnedFiles, LAYOUT, ROOT } from './common.mjs';
import { exitCodeFor } from './drift.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const temp = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
};
const hash = (s) => createHash('sha256').update(s).digest('hex');
const git = (cwd, ...args) => execFileSync('git', [
  '-c', 'user.name=Test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false', '-c', 'init.defaultBranch=main', ...args,
], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** The upstream files below UPSTREAM_PATHS, relative to `contracts/`, plus one file outside them. */
const UPSTREAM = {
  'mission-status/openapi.yaml': 'openapi: 3.1.0\n',
  'mission-status/schemas/Mission.json': '{"type":"object"}\n',
  '_shared/parameters/PageSize.yaml': 'name: page_size\n',
};

/** A local upstream repository with `files` (contracts/-relative) committed on main; returns its path and HEAD. */
function upstream(files) {
  const dir = temp('drift-upstream-');
  git(dir, 'init', '-q');
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, 'contracts', rel)), { recursive: true });
    writeFileSync(join(dir, 'contracts', rel), text);
  }
  writeFileSync(join(dir, 'README.md'), 'not a contract file\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'upstream');
  return { url: dir, head: git(dir, 'rev-parse', 'HEAD') };
}

/**
 * A project copy holding only drift.mjs, common.mjs, remote.mjs and a PIN.json: no node_modules, so every run also
 * proves the script loads with Node built-ins only. `pinText` is written verbatim.
 */
function project(pinText) {
  const root = temp('drift-project-');
  mkdirSync(join(root, 'scripts/contract'), { recursive: true });
  for (const f of ['drift.mjs', 'common.mjs', 'remote.mjs']) copyFileSync(join(HERE, f), join(root, 'scripts/contract', f));
  mkdirSync(dirname(join(root, LAYOUT.pin)), { recursive: true });
  writeFileSync(join(root, LAYOUT.pin), pinText);
  return root;
}
const PIN_SHA = 'b'.repeat(40);
const pinFor = (files) => `${JSON.stringify({
  repo: 'spec-kitty/spec-kitty', sha: PIN_SHA, provenance: 'main',
  files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, hash(v)])),
}, null, 2)}\n`;

/** Spawn drift.mjs; a private TMPDIR keeps every fetch directory inside the test's own temporary tree. */
function run(root, url, { summary } = {}) {
  const env = { ...process.env, CONTRACT_REMOTE_URL: url, TMPDIR: temp('drift-tmp-') };
  delete env.GITHUB_STEP_SUMMARY;
  if (summary) env.GITHUB_STEP_SUMMARY = summary;
  const r = spawnSync(process.execPath, [join(root, 'scripts/contract/drift.mjs')], { cwd: root, encoding: 'utf8', env });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}

// The contract plant tokens, read from the plant descriptor itself, plus the `contract: ` message prefix (WP03).
const PLANT_TOKENS = [
  ...JSON.parse(readFileSync(join(ROOT, 'gates/plants/contract/plant.json'), 'utf8')).map((p) => p.expectFailPattern),
  'contract: ',
];
const assertNoPlantToken = (r) => {
  const all = `${r.stdout}${r.stderr}`;
  assert.equal(all.includes('## Contract drift'), true);
  assert.deepEqual(PLANT_TOKENS.filter((t) => all.includes(t)), []);
};
const outputs = [];

test('drift: the upstream files equal the pin, exit 0', () => {
  const up = upstream(UPSTREAM);
  const summary = join(temp('drift-summary-'), 'summary.md');
  const r = run(project(pinFor(UPSTREAM)), up.url, { summary });
  outputs.push(r);
  assert.equal(r.code, 0);
  const expected = [
    '## Contract drift', '',
    `Upstream \`spec-kitty/spec-kitty\` HEAD \`${up.head}\` compared with the pinned \`${PIN_SHA}\`.`, '',
    'In sync: 3 files match PIN.json.', '',
  ].join('\n');
  assert.equal(r.stdout, expected);
  assert.equal(readFileSync(summary, 'utf8'), expected);
});

test('drift: one changed file and one added file are listed per category, exit 1', () => {
  const up = upstream({
    ...UPSTREAM,
    'mission-status/openapi.yaml': 'openapi: 3.1.1\n',
    'mission-status/schemas/Wp.json': '{"type":"object","title":"Wp"}\n',
  });
  const r = run(project(pinFor(UPSTREAM)), up.url);
  outputs.push(r);
  assert.equal(r.code, 1);
  assert.equal(r.stdout, [
    '## Contract drift', '',
    `Upstream \`spec-kitty/spec-kitty\` HEAD \`${up.head}\` compared with the pinned \`${PIN_SHA}\`.`, '',
    'Drift: 2 files differ from PIN.json. Review with `pnpm contract:update` and re-pin.', '',
    '### Added (1)', '', '- `mission-status/schemas/Wp.json`', '',
    '### Removed (0)', '',
    '### Changed (1)', '', '- `mission-status/openapi.yaml`', '',
  ].join('\n'));
});

test('drift: an upstream that cannot be fetched (a local path that does not exist) is unreachable, exit 2', () => {
  const missing = join(temp('drift-gone-'), 'missing.git');
  const r = run(project(pinFor(UPSTREAM)), missing);
  outputs.push(r);
  assert.equal(r.code, 2);
  assert.equal(r.stdout, [
    '## Contract drift', '',
    'Upstream unreachable: the git fetch of `spec-kitty/spec-kitty` failed, so nothing was compared.', '',
  ].join('\n'));
});

test('drift: a malformed PIN.json is an error, exit 3, before any fetch', () => {
  const up = upstream(UPSTREAM);
  const cases = [
    ['{ not json', 'Error: PIN.json is not valid JSON.'],
    ['{"sha":"x"}\n', 'Error: PIN.json has no files map of sha256 hashes.'],
  ];
  let ran = 0;
  for (const [pinText, line] of cases) {
    const r = run(project(pinText), up.url);
    outputs.push(r);
    assert.equal(r.code, 3, pinText);
    assert.equal(r.stdout, ['## Contract drift', '', line, ''].join('\n'));
    assert.equal(r.stderr, '', pinText);
    ran += 1;
  }
  assert.equal(ran, 2);
});

test('drift: no run printed a contract plant token', () => {
  assert.equal(outputs.length, 5);
  for (const r of outputs) assertNoPlantToken(r);
  assert.equal(PLANT_TOKENS.length > 1, true);
});

test('comparePinnedFiles: added, removed and changed are sorted lists of contracts-relative paths', () => {
  const pin = { 'b.yaml': hash('b'), 'a.yaml': hash('a'), 'gone.yaml': hash('g'), 'z.yaml': hash('z') };
  const fetched = { 'z.yaml': Buffer.from('Z'), 'a.yaml': Buffer.from('a'), 'b.yaml': Buffer.from('B'), 'new2.yaml': Buffer.from('n'), 'new1.yaml': Buffer.from('n') };
  assert.deepEqual(comparePinnedFiles(pin, fetched), {
    added: ['new1.yaml', 'new2.yaml'], removed: ['gone.yaml'], changed: ['b.yaml', 'z.yaml'],
  });
  assert.deepEqual(comparePinnedFiles({ 'a.yaml': hash('a') }, { 'a.yaml': Buffer.from('a') }), { added: [], removed: [], changed: [] });
});

test('exitCodeFor: only a failed git fetch is unreachable; every other error is 3', () => {
  const failed = (cmd) => Object.assign(new Error(`Command failed: ${cmd}\nfatal: boom`), { status: 128 });
  assert.equal(exitCodeFor(failed('git fetch -q --depth 1 x HEAD')), 2);
  assert.equal(exitCodeFor(failed('git rev-parse FETCH_HEAD')), 3);
  assert.equal(exitCodeFor(Object.assign(new Error('spawnSync git ENOENT'), { code: 'ENOENT' })), 3);
  assert.equal(exitCodeFor(new SyntaxError('Unexpected token')), 3);
});

test('drift.mjs imports Node built-ins, common.mjs and remote.mjs only (F-41)', () => {
  const seen = new Set();
  const graph = new Set();
  const visit = (file) => {
    if (seen.has(file)) return;
    seen.add(file);
    const text = readFileSync(join(HERE, file), 'utf8');
    for (const m of text.matchAll(/^\s*(?:import|export)\s[^;]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]/gm)) {
      const spec = m[1] ?? m[2] ?? m[3];
      graph.add(spec);
      if (spec.startsWith('./')) visit(spec.slice(2));
    }
  };
  visit('drift.mjs');
  assert.deepEqual([...seen].sort(), ['common.mjs', 'drift.mjs', 'remote.mjs']);
  assert.deepEqual([...graph].sort(), [
    './common.mjs', './remote.mjs', 'node:child_process', 'node:crypto', 'node:fs', 'node:os', 'node:path', 'node:url',
  ]);
});
