// The Rust toolchain rule (NFR-003, CODE-TEST-005): `rust-toolchain.toml` pins an exact x.y.z channel. The titles
// below never use the rule id: node:test prints titles in the clean output, and the hygiene plant looks for that id in
// the planted output only.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkRustToolchain, checkRustToolchainPin } from './rust-toolchain.mjs';

const toolchain = (channel) => `# comment\n[toolchain]\nchannel = ${channel}\ncomponents = ["rustfmt", "clippy"]\n`;
const lines = (text) => checkRustToolchain(text).map((f) => `${f.rule}|${f.file}|${f.line}|${f.message}`);

test('toolchain: floating, partial and dated channels are reported with their line', () => {
  const cases = ['"stable"', '"beta"', '"nightly"', '"1.98"', '"1"', '"nightly-2026-09-01"', '"1.98.1-x86_64-unknown-linux-gnu"', '"=1.98.1"', '""'];
  let ran = 0;
  for (const channel of cases) {
    const value = channel.slice(1, -1);
    assert.deepEqual(lines(toolchain(channel)), [`rust-toolchain-pin|rust-toolchain.toml|3|channel "${value}" is not an exact x.y.z release`], channel);
    ran += 1;
  }
  assert.equal(ran, cases.length);
});

test('toolchain: an exact x.y.z channel is clean, in either quote style and with a trailing comment', () => {
  assert.deepEqual(lines(toolchain('"1.98.1"')), []);
  assert.deepEqual(lines(toolchain("'1.98.1'")), []);
  assert.deepEqual(lines(toolchain('"1.98.1" # pinned')), []);
});

test('toolchain: a missing, repeated or misplaced channel is reported', () => {
  assert.equal(checkRustToolchain('[toolchain]\ncomponents = []\n').length, 1);
  assert.equal(checkRustToolchain('[toolchain]\nchannel = "1.98.1"\nchannel = "1.98.1"\n')[0].line, 3);
  // a channel outside [toolchain] does not count
  assert.equal(checkRustToolchain('[other]\nchannel = "1.98.1"\n').length, 1);
});

test('toolchain: the workspace check needs the file only when a root Cargo.toml exists', () => {
  const dir = mkdtempSync(join(tmpdir(), 'toolchain-'));
  const put = (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); };
  try {
    assert.deepEqual(checkRustToolchainPin(dir), []);
    put('Cargo.toml', '[workspace]\nmembers = []\n');
    assert.deepEqual(checkRustToolchainPin(dir).map((f) => f.line), [0]);
    put('rust-toolchain.toml', toolchain('"1.98.1"'));
    assert.deepEqual(checkRustToolchainPin(dir), []);
    put('rust-toolchain.toml', toolchain('"stable"'));
    assert.deepEqual(checkRustToolchainPin(dir).map((f) => f.line), [3]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the hygiene script reports a floating toolchain channel', () => {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-hygiene.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'toolchain-hyg-'));
  const put = (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); };
  const found = () => spawnSync(process.execPath, [script, '--root', dir], { encoding: 'utf8' }).stdout
    .split('\n').filter((l) => l.includes('rust-toolchain.toml'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    put('Cargo.toml', '[workspace]\nmembers = []\n');
    put('rust-toolchain.toml', toolchain('"stable"'));
    assert.deepEqual(found(), ['FINDING [rust-toolchain-pin] rust-toolchain.toml:3: channel "stable" is not an exact x.y.z release']);
    put('rust-toolchain.toml', toolchain('"1.98.1"'));
    assert.deepEqual(found(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// SO-CORR-002: an extensionless `rust-toolchain` file overrides `rust-toolchain.toml` in rustup, so it must not exist.
test('toolchain: a legacy extensionless toolchain file at the root is reported', () => {
  const dir = mkdtempSync(join(tmpdir(), 'toolchain-legacy-'));
  const put = (p, c) => writeFileSync(join(dir, p), c);
  try {
    put('Cargo.toml', '[workspace]\nmembers = []\n');
    put('rust-toolchain.toml', toolchain('"1.98.1"'));
    assert.deepEqual(checkRustToolchainPin(dir), []);
    put('rust-toolchain', '1.97.0\n');
    assert.deepEqual(checkRustToolchainPin(dir).map((f) => `${f.rule}|${f.file}|${f.line}`), ['rust-toolchain-pin|rust-toolchain|0']);
    assert.match(checkRustToolchainPin(dir)[0].message, /overrides rust-toolchain\.toml/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
