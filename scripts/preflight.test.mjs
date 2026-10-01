// Harness tests for the credential preflight (verifier N2). Run with `pnpm test:preflight`.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { cpSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { shouldSkip, isFetchCommand } = require('./preflight-core.cjs');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('shouldSkip', () => {
  const argv = (...flags) => ['node', 'pnpm', 'install', ...flags];
  test('true for --offline with --frozen-lockfile', () => {
    assert.equal(shouldSkip(argv('--offline', '--frozen-lockfile')), true);
  });
  test('false for --prefer-offline with --frozen-lockfile', () => {
    assert.equal(shouldSkip(argv('--prefer-offline', '--frozen-lockfile')), false);
  });
  test('false for --offline only', () => {
    assert.equal(shouldSkip(argv('--offline')), false);
  });
  test('false for --frozen-lockfile only', () => {
    assert.equal(shouldSkip(argv('--frozen-lockfile')), false);
  });
  test('false for neither flag', () => {
    assert.equal(shouldSkip(argv()), false);
  });
});

describe('isFetchCommand with value-taking global flags outside VALUE_FLAGS', () => {
  const cmd = (...a) => ['node', 'pnpm', ...a];
  for (const flag of ['--store-dir', '--registry', '--cache-dir', '--virtual-store-dir', '--lockfile-dir']) {
    test(`${flag} X install is a fetch command`, () => {
      assert.equal(isFetchCommand(cmd(flag, 'some/value', 'install')), true);
      assert.equal(isFetchCommand(cmd(flag, 'some/value', 'add', 'left-pad')), true);
    });
    test(`${flag} X run/exec/ls is not a fetch command`, () => {
      assert.equal(isFetchCommand(cmd(flag, 'some/value', 'run', 'install')), false);
      assert.equal(isFetchCommand(cmd(flag, 'some/value', 'exec', 'x')), false);
      assert.equal(isFetchCommand(cmd(flag, 'some/value', 'ls')), false);
    });
  }
  test('plain commands are unchanged', () => {
    assert.equal(isFetchCommand(cmd('install')), true);
    assert.equal(isFetchCommand(cmd('--frozen-lockfile', 'install')), true);
    assert.equal(isFetchCommand(cmd('--filter', 'x', 'test')), false);
    assert.equal(isFetchCommand(cmd('lint')), false);
    assert.equal(isFetchCommand(cmd()), false);
  });
});

describe('pnpm hook in a scratch workspace with no credential', () => {
  const scratch = mkdtempSync(join(tmpdir(), 'preflight-scratch-'));
  const home = mkdtempSync(join(tmpdir(), 'preflight-home-'));
  mkdirSync(join(scratch, 'scripts'));
  for (const f of ['.pnpmfile.cjs', '.npmrc', 'scripts/preflight-core.cjs']) cpSync(join(root, f), join(scratch, f));
  writeFileSync(join(scratch, 'package.json'), JSON.stringify({ name: 'scratch', private: true, version: '0.0.0' }));
  writeFileSync(join(scratch, 'pnpm-workspace.yaml'), 'packages: []\n');
  // The scratch copy of .pnpmfile.cjs is byte-identical, so the repo lockfile's pnpmfileChecksum is valid here
  // and a frozen install of the empty workspace can succeed (exit 0).
  const checksum = /^pnpmfileChecksum: (\S+)$/m.exec(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'));
  assert.ok(checksum, 'repo lockfile has a pnpmfileChecksum');
  writeFileSync(join(scratch, 'pnpm-lock.yaml'), `lockfileVersion: '9.0'\n\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\n\npnpmfileChecksum: ${checksum[1]}\n\nimporters:\n\n  .: {}\n`);

  const pnpm = (...args) => spawnSync('pnpm', ['install', ...args], {
    cwd: scratch,
    encoding: 'utf8',
    env: { PATH: process.env.PATH, HOME: home, CI: 'true' },
  });
  const blocked = (r) => r.status === 9 && r.stderr.includes('Missing GitHub Packages credential');

  test('(a) --offline --frozen-lockfile is not blocked by the credential check', () => {
    const r = pnpm('--offline', '--frozen-lockfile');
    assert.equal(blocked(r), false, r.stderr);
    assert.equal(r.status, 0, r.stderr);
  });
  test('(b) --frozen-lockfile alone exits 9 with the named message', () => {
    const r = pnpm('--frozen-lockfile');
    assert.equal(r.status, 9, r.stderr);
    assert.match(r.stderr, /Missing GitHub Packages credential for @spec-kitty\/\*/);
    assert.match(r.stderr, /~\/\.npmrc/);
  });
  test('(c) the .pnpmfile.cjs hook still fires under the installed pnpm', () => {
    const r = pnpm();
    assert.ok(blocked(r), `hook did not fire: status ${r.status}\n${r.stderr}`);
  });

  after(() => {
    rmSync(scratch, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  });
});
