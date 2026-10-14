// CLI-level tests: the real scripts are spawned against a temporary copy of the repository files. They prove that the
// `--require-main` flag really reaches check.mjs and verify-remote.mjs (a function-level test cannot see argv), and the
// ancestry decision of a `main` pin. No real network anywhere: CONTRACT_REMOTE_URL points at a temporary repository.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, after } from 'node:test';
import { LAYOUT, ROOT } from './common.mjs';
import { isAncestor, isOnUpstreamMain } from './remote.mjs';
import { provenanceDecision } from './verify-remote.mjs';

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

/** A project copy: the scripts, the vendored contract and the sources the checks read; node_modules is linked. */
function project() {
  const root = temp('contract-cli-');
  cpSync(join(ROOT, 'scripts'), join(root, 'scripts'), { recursive: true });
  cpSync(join(ROOT, LAYOUT.vendor), join(root, LAYOUT.vendor), { recursive: true });
  cpSync(join(ROOT, 'packages/mission-ui/src'), join(root, 'packages/mission-ui/src'), { recursive: true });
  cpSync(join(ROOT, 'contracts/fixtures'), join(root, 'contracts/fixtures'), { recursive: true });
  symlinkSync(join(ROOT, 'node_modules'), join(root, 'node_modules'));
  return root;
}
const editPin = (root, mutate) => {
  const file = join(root, LAYOUT.pin);
  const pin = JSON.parse(readFileSync(file, 'utf8'));
  mutate(pin);
  writeFileSync(file, `${JSON.stringify(pin, null, 2)}\n`);
};
const asMain = (pin) => {
  pin.provenance = 'main';
  delete pin.branch;
  delete pin.reason;
};
const asBranch = (pin) => {
  pin.provenance = 'branch';
  pin.branch = 'lane-x';
  pin.reason = 'not on main yet';
};
const run = (root, script, args = [], env = {}) => {
  const r = spawnSync(process.execPath, [join(root, 'scripts/contract', script), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};

test('check.mjs --require-main on a branch pin exits non-zero and prints the C8 token', () => {
  const root = project();
  editPin(root, asBranch);
  const r = run(root, 'check.mjs', ['--require-main']);
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /pin provenance/);
});

test('check.mjs --require-main on a main pin exits 0 (positive control)', () => {
  const root = project();
  editPin(root, asMain);
  const r = run(root, 'check.mjs', ['--require-main']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /contract gate: ok/);
});

test('check.mjs without the flag on a branch pin exits 0', () => {
  const root = project();
  editPin(root, asBranch);
  const r = run(root, 'check.mjs');
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(r.out, /pin provenance/);
});

test('provenanceDecision: a branch pin is not verifiable upstream (exit 0), and exit non-zero with --require-main', () => {
  const branch = { provenance: 'branch', branch: 'lane-x', reason: 'r' };
  assert.deepEqual(provenanceDecision(branch, { requireMain: false }), { verifiable: false, exitCode: 0, message: 'not verifiable upstream (local lane commit)' });
  const strict = provenanceDecision(branch, { requireMain: true });
  assert.equal(strict.verifiable, false);
  assert.notEqual(strict.exitCode, 0);
  assert.match(strict.message, /not verifiable upstream \(local lane commit\)/);
  assert.deepEqual(provenanceDecision({ provenance: 'main' }, { requireMain: true }), { verifiable: true, exitCode: 0, message: '' });
  assert.deepEqual(provenanceDecision({ provenance: 'main' }, { requireMain: false }), { verifiable: true, exitCode: 0, message: '' });
});

test('verify-remote.mjs spawned on a branch pin: not verifiable upstream, exit 0; --require-main reaches it and exits non-zero', () => {
  const root = project();
  editPin(root, asBranch);
  const plain = run(root, 'verify-remote.mjs');
  assert.equal(plain.code, 0, plain.out);
  assert.match(plain.out, /not verifiable upstream \(local lane commit\)/);
  const strict = run(root, 'verify-remote.mjs', ['--require-main']);
  assert.notEqual(strict.code, 0, strict.out);
  assert.match(strict.out, /not verifiable upstream/);
});

// ---- ancestry of a main pin ----
function upstream() {
  const dir = temp('contract-upstream-');
  git(dir, 'init', '-q', '-b', 'main');
  writeFileSync(join(dir, 'f.txt'), 'one\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'one');
  const onMain = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '-q', '-b', 'side');
  writeFileSync(join(dir, 'f.txt'), 'two\n');
  git(dir, 'commit', '-q', '-am', 'side only');
  const sideOnly = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'checkout', '-q', 'main');
  return { dir, onMain, sideOnly };
}

test('ancestry: isAncestor is true on main, false for a side-branch sha, false (fail closed) for an unknown sha', () => {
  const { dir, onMain, sideOnly } = upstream();
  assert.equal(isAncestor(dir, onMain, 'main'), true);
  assert.equal(isAncestor(dir, sideOnly, 'main'), false);
  assert.equal(isAncestor(dir, 'e'.repeat(40), 'main'), false);
  assert.equal(isAncestor(dir, onMain, 'no-such-ref'), false);
});

test('ancestry: isOnUpstreamMain fetches main from the given url and decides the same', () => {
  const { dir, onMain, sideOnly } = upstream();
  assert.equal(isOnUpstreamMain(onMain, { url: dir }), true);
  assert.equal(isOnUpstreamMain(sideOnly, { url: dir }), false);
  assert.equal(isOnUpstreamMain(onMain, { url: join(dir, 'does-not-exist') }), false);
});

test('ancestry: update.mjs refuses to write a main pin for a side-branch sha, and leaves the files as they were', () => {
  const { dir, sideOnly } = upstream();
  const root = project();
  const before = readFileSync(join(root, LAYOUT.pin), 'utf8');
  const r = run(root, 'update.mjs', ['--sha', sideOnly], { CONTRACT_REMOTE_URL: dir });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /not an ancestor of upstream main/);
  assert.equal(readFileSync(join(root, LAYOUT.pin), 'utf8'), before);
});

test('ancestry: verify-remote.mjs exits non-zero for a main pin whose sha is on a side branch only', () => {
  const { dir, sideOnly } = upstream();
  const root = project();
  editPin(root, (p) => {
    asMain(p);
    p.sha = sideOnly;
  });
  const r = run(root, 'verify-remote.mjs', [], { CONTRACT_REMOTE_URL: dir });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /not an ancestor of upstream main/);
});

test('CONTRACT_REMOTE_URL: the notice is printed only when the override is set', () => {
  const { dir } = upstream();
  const root = project();
  editPin(root, (p) => asMain(p));
  const set = run(root, 'verify-remote.mjs', [], { CONTRACT_REMOTE_URL: dir });
  assert.match(set.out, /NOTICE: CONTRACT_REMOTE_URL is set/);
  const unset = run(root, 'check.mjs', [], { CONTRACT_REMOTE_URL: '' });
  assert.doesNotMatch(unset.out, /NOTICE: CONTRACT_REMOTE_URL/);
});
