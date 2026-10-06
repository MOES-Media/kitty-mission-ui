// Tests of `contract:update --from-repo`: the git read is one function (readTreeFromRepo), reads objects and never a
// working tree, fails closed, and the path argument never reaches a committed or printed byte.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { test, after } from 'node:test';
import { LAYOUT, ROOT } from './common.mjs';
import { readTreeFromRepo } from './remote.mjs';
import { parseUpdateArgs, runUpdate } from './update.mjs';

const dirs = [];
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});
const temp = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(d);
  return d;
};
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A source repository whose commit holds `files` (path -> text) on `branch`; returns { dir, sha }. */
function sourceRepo(files, branch = 'lane-x') {
  const dir = temp('contract-source-');
  git(dir, 'init', '-q', '-b', branch);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'contract');
  return { dir, sha: git(dir, 'rev-parse', 'HEAD') };
}

const TWO_DIRS = { 'contracts/mission-status/a.txt': 'committed a\n', 'contracts/_shared/b.txt': 'committed b\n' };

test('(a) the vendored bytes are the committed blobs: a working-tree edit and an untracked file do not enter', () => {
  const { dir, sha } = sourceRepo(TWO_DIRS);
  writeFileSync(join(dir, 'contracts/mission-status/a.txt'), 'edited after the commit\n');
  writeFileSync(join(dir, 'contracts/mission-status/untracked.txt'), 'never committed\n');
  const tree = readTreeFromRepo(dir, sha, ['contracts/mission-status', 'contracts/_shared']);
  assert.deepEqual(Object.keys(tree).sort(), ['contracts/_shared/b.txt', 'contracts/mission-status/a.txt']);
  assert.equal(tree['contracts/mission-status/a.txt'].toString(), 'committed a\n');
  assert.equal(tree['contracts/_shared/b.txt'].toString(), 'committed b\n');
});

test('(b) a missing sha throws, without the path in the message; a tree lacking a vendored path fails closed', () => {
  const { dir, sha } = sourceRepo(TWO_DIRS);
  const missing = 'f'.repeat(40);
  assert.throws(() => readTreeFromRepo(dir, missing), (err) => /does not exist/.test(err.message) && !err.message.includes(dir) && !err.message.includes(basename(dir)));
  assert.throws(() => readTreeFromRepo(dir, 'abc'), /40 lowercase hex/);
  const only = sourceRepo({ 'contracts/mission-status/a.txt': 'x\n' });
  assert.throws(() => readTreeFromRepo(only.dir, only.sha), /no files below contracts\/_shared/);
  assert.equal(Object.keys(readTreeFromRepo(dir, sha)).length, 2, 'positive control: the full tree reads');
});

test('(c) --from-repo without --sha is refused; --sha alone takes the network path (injected fetcher, no real fetch)', async () => {
  assert.throws(() => parseUpdateArgs(['--from-repo', 'somewhere']), /usage/);
  assert.deepEqual(parseUpdateArgs(['--sha', 'a'.repeat(40)]), { sha: 'a'.repeat(40), fromRepo: undefined, branch: undefined, reason: undefined });
  assert.equal(parseUpdateArgs(['--from-repo', 'x', '--sha', 'a'.repeat(40)]).fromRepo, 'x');
  const calls = [];
  const stop = new Error('stop after the branch decision');
  const deps = {
    fetchRef: (sha) => { calls.push(['network', sha]); throw stop; },
    readCommitFromRepo: (path, sha) => { calls.push(['local', sha]); throw stop; },
  };
  const sha = 'b'.repeat(40);
  await assert.rejects(runUpdate({ argv: ['--sha', sha], deps, write: () => {} }), stop);
  await assert.rejects(runUpdate({ argv: ['--from-repo', 'x', '--sha', sha], deps, write: () => {} }), stop);
  await assert.rejects(runUpdate({ argv: ['--from-repo', 'x'], deps, write: () => {} }), /usage/);
  assert.deepEqual(calls, [['network', sha], ['local', sha]]);
});

test('(d) a full update from a uniquely named directory vendors the committed bytes and leaks the path nowhere', async () => {
  // the source commit holds the repository's own vendored contract, so the checks after the update have real input
  const stage = temp('contract-from-repo-');
  cpSync(join(ROOT, LAYOUT.vendor, 'mission-status'), join(stage, 'contracts/mission-status'), { recursive: true });
  cpSync(join(ROOT, LAYOUT.vendor, '_shared'), join(stage, 'contracts/_shared'), { recursive: true });
  git(stage, 'init', '-q', '-b', 'lane-x');
  git(stage, 'add', '-A');
  git(stage, 'commit', '-q', '-m', 'contract');
  const sha = git(stage, 'rev-parse', 'HEAD');
  const committed = readFileSync(join(stage, 'contracts/mission-status/openapi.yaml'));
  writeFileSync(join(stage, 'contracts/mission-status/openapi.yaml'), 'uncommitted edit\n');
  writeFileSync(join(stage, 'contracts/mission-status/untracked.yaml'), 'untracked\n');

  const root = temp('contract-root-');
  cpSync(join(ROOT, LAYOUT.vendor), join(root, LAYOUT.vendor), { recursive: true });
  cpSync(join(ROOT, 'packages/mission-ui/src'), join(root, 'packages/mission-ui/src'), { recursive: true });
  git(root, 'init', '-q');
  let printed = '';
  const code = await runUpdate({ argv: ['--from-repo', stage, '--sha', sha], root, write: (t) => { printed += t; } });
  assert.equal(code, 0, printed);
  assert.deepEqual(readFileSync(join(root, LAYOUT.vendor, 'mission-status/openapi.yaml')), committed);
  assert.throws(() => readFileSync(join(root, LAYOUT.vendor, 'mission-status/untracked.yaml')));
  const pin = JSON.parse(readFileSync(join(root, LAYOUT.pin), 'utf8'));
  assert.equal(pin.sha, sha);
  assert.equal(pin.provenance, 'branch');
  assert.equal(pin.branch, 'lane-x', 'the label is the branch name, read from git');
  assert.ok(pin.reason.length > 0);
  const name = basename(stage);
  assert.ok(name.startsWith('contract-from-repo-') && name.length > 'contract-from-repo-'.length);
  for (const [label, text] of Object.entries({
    'PIN.json': readFileSync(join(root, LAYOUT.pin), 'utf8'),
    'types header': readFileSync(join(root, LAYOUT.types), 'utf8').slice(0, 600),
    'fixtures header': readFileSync(join(root, LAYOUT.fixtures), 'utf8').slice(0, 600),
    'captured output': printed,
  })) {
    assert.ok(!text.includes(name), `${label} contains the source directory name`);
    assert.ok(!text.includes(stage), `${label} contains the source path`);
  }
});

test('--branch overrides the label read from git; --branch without --from-repo is refused', async () => {
  const { dir, sha } = sourceRepo(TWO_DIRS);
  const seen = [];
  const deps = { readCommitFromRepo: (p, s) => { seen.push(s); throw new Error('stop'); } };
  await assert.rejects(runUpdate({ argv: ['--from-repo', dir, '--sha', sha, '--branch', 'my-label'], deps, write: () => {} }), /stop/);
  assert.deepEqual(seen, [sha]);
  await assert.rejects(runUpdate({ argv: ['--sha', sha, '--branch', 'my-label'], deps, write: () => {} }), /belong to --from-repo/);
});
