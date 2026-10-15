// The Cargo exact-pin rule (F-09, NFR-003): every registry requirement is `=x.y.z`. The titles and the dependency
// names below never use the hygiene plant's dependency name: node:test prints titles in the clean output, and the
// plant looks for that name in the planted output only.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkCargoManifest, checkCargoPins, workspaceMembers } from './cargo-pins.mjs';

const MEMBER = 'crates/demo/Cargo.toml';
const member = (deps, table = 'dependencies') => `[package]\nname = "demo"\nversion = "0.0.0"\n\n[${table}]\n${deps}\n`;
const report = (file, text, opts = { workspaceRoot: false }) => checkCargoManifest(file, text, opts).map((f) => `${f.rule}|${f.file}|${f.line}|${f.message}`);

test('cargo pins: non-exact requirements are reported with the dependency name and the manifest path', () => {
  const cases = [
    ['serde = "0.8"', 'dependency serde: requirement "0.8" is not an exact =x.y.z pin'],
    ['serde = "^1"', 'dependency serde: requirement "^1" is not an exact =x.y.z pin'],
    ['serde = "~1.2"', 'dependency serde: requirement "~1.2" is not an exact =x.y.z pin'],
    ['serde = ">=1"', 'dependency serde: requirement ">=1" is not an exact =x.y.z pin'],
    ['serde = "*"', 'dependency serde: requirement "*" is not an exact =x.y.z pin'],
    ['serde = { git = "https://example.com/serde.git" }', 'dependency serde: a git dependency has no exact =x.y.z pin'],
    // a bare full version is a caret requirement in Cargo, not an exact one
    ['serde = "1.2.3"', 'dependency serde: requirement "1.2.3" is not an exact =x.y.z pin'],
  ];
  let ran = 0;
  for (const [line, message] of cases) {
    assert.deepEqual(report(MEMBER, member(line)), [`cargo-pin|${MEMBER}|6|${message}`], line);
    ran += 1;
  }
  assert.equal(ran, 7);
});

test('cargo pins: an exact string, an exact inline table and a workspace reference are clean', () => {
  const clean = [
    'serde = "=1.2.3"',
    'serde = { version = "=1.2.3", default-features = false, features = ["derive"] }',
    'serde = { workspace = true }',
  ];
  let ran = 0;
  for (const line of clean) {
    assert.deepEqual(report(MEMBER, member(line)), [], line);
    ran += 1;
  }
  assert.equal(ran, 3);
});

test('cargo pins: dev- and build-dependencies are checked like dependencies, each with a clean control', () => {
  for (const table of ['dev-dependencies', 'build-dependencies']) {
    assert.deepEqual(report(MEMBER, member('tokio = "1"', table)),
      [`cargo-pin|${MEMBER}|6|dependency tokio: requirement "1" is not an exact =x.y.z pin`], table);
    assert.deepEqual(report(MEMBER, member('tokio = "=1.0.0"', table)), [], table);
  }
});

test('cargo pins: the workspace dependency table needs exact pins and cannot defer to itself', () => {
  const root = (deps) => `[workspace]\nmembers = ["crates/demo"]\n\n[workspace.dependencies]\n${deps}\n`;
  assert.deepEqual(report('Cargo.toml', root('anyhow = "1.0"'), { workspaceRoot: true }),
    ['cargo-pin|Cargo.toml|5|dependency anyhow: requirement "1.0" is not an exact =x.y.z pin']);
  assert.deepEqual(report('Cargo.toml', root('anyhow = { workspace = true }'), { workspaceRoot: true }),
    ['cargo-pin|Cargo.toml|5|dependency anyhow: workspace = true is only valid in a member manifest']);
  assert.deepEqual(report('Cargo.toml', root('anyhow = "=1.0.86"'), { workspaceRoot: true }), []);
});

test('cargo pins: dotted-key and sub-table forms are read too', () => {
  assert.deepEqual(report(MEMBER, member('serde.version = "1"')),
    [`cargo-pin|${MEMBER}|6|dependency serde: requirement "1" is not an exact =x.y.z pin`]);
  assert.deepEqual(report(MEMBER, member('serde.workspace = true')), []);
  const sub = (v) => `[package]\nname = "demo"\n\n[dependencies.serde]\nversion = "${v}"\nfeatures = ["derive"]\n`;
  assert.deepEqual(report(MEMBER, sub('1.0')), [`cargo-pin|${MEMBER}|5|dependency serde: requirement "1.0" is not an exact =x.y.z pin`]);
  assert.deepEqual(report(MEMBER, sub('=1.0.5')), []);
});

test('cargo pins: comments, package fields and a local path crate without a version are not requirements', () => {
  const text = '[package]\nversion = "0.1" # not a dependency\n\n[dependencies]\n# serde = "1"\nlocal = { path = "../local" }\n';
  assert.deepEqual(report(MEMBER, text), []);
  assert.deepEqual(report(MEMBER, text.replace('{ path = "../local" }', '{ path = "../local", version = "0.1" }')),
    [`cargo-pin|${MEMBER}|6|dependency local: requirement "0.1" is not an exact =x.y.z pin`]);
});

test('workspaceMembers reads a single-line and a multi-line members array', () => {
  assert.deepEqual(workspaceMembers('[workspace]\nmembers = ["a", "b/c"]\n'), ['a', 'b/c']);
  assert.deepEqual(workspaceMembers('[workspace]\nresolver = "2"\nmembers = [\n  "a", # first\n  "b",\n]\n[workspace.package]\n'), ['a', 'b']);
});

test('checkCargoPins walks the root manifest and every member manifest on disk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cargo-pins-'));
  const put = (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); };
  try {
    put('Cargo.toml', '[workspace]\nmembers = ["crates/one", "apps/two/server"]\n\n[workspace.dependencies]\nlog = "=0.4.22"\n');
    put('crates/one/Cargo.toml', member('log = { workspace = true }'));
    put('apps/two/server/Cargo.toml', member('rand = "0.8"'));
    const found = checkCargoPins(dir).map((f) => `${f.file}:${f.line}: ${f.message}`);
    assert.deepEqual(found, ['apps/two/server/Cargo.toml:6: dependency rand: requirement "0.8" is not an exact =x.y.z pin']);
    put('apps/two/server/Cargo.toml', member('rand = "=0.8.5"'));
    assert.deepEqual(checkCargoPins(dir), []);
    put('Cargo.toml', '[workspace]\nmembers = ["crates/one", "crates/missing"]\n');
    assert.deepEqual(checkCargoPins(dir).map((f) => `${f.rule}|${f.file}`), ['cargo-pin|crates/missing/Cargo.toml']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the hygiene script runs the exact-pin rule only when a root Cargo.toml exists', () => {
  const script = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-hygiene.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'cargo-hyg-'));
  const put = (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); };
  const cargoLines = () => spawnSync(process.execPath, [script, '--root', dir], { encoding: 'utf8' }).stdout
    .split('\n').filter((l) => l.includes('[cargo-pin]'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    put('crates/one/Cargo.toml', member('rand = "0.8"'));
    assert.deepEqual(cargoLines(), []);
    put('Cargo.toml', '[workspace]\nmembers = ["crates/one"]\n');
    assert.deepEqual(cargoLines(), ['FINDING [cargo-pin] crates/one/Cargo.toml:6: dependency rand: requirement "0.8" is not an exact =x.y.z pin']);
    put('crates/one/Cargo.toml', member('rand = "=0.8.5"'));
    assert.deepEqual(cargoLines(), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// SO-CORR-001: the rule must fail closed. Each form below used to yield zero members or zero findings.
test('workspace members: a [workspace] header with a trailing comment still yields its members', () => {
  assert.deepEqual(workspaceMembers('[workspace] # the root\nmembers = ["a", "b"]\n'), ['a', 'b']);
});

test('workspace members: a [workspace] header with inner spaces still yields its members', () => {
  assert.deepEqual(workspaceMembers('[ workspace ]\nmembers = ["a"]\n'), ['a']);
});

test('workspace members: a root-level dotted workspace.members key yields its members', () => {
  assert.deepEqual(workspaceMembers('workspace.members = ["a", "b/c"]\n\n[workspace.dependencies]\n'), ['a', 'b/c']);
  assert.deepEqual(workspaceMembers('"workspace" . "members" = [\n  "a", # x\n  "b",\n]\n'), ['a', 'b']);
  assert.deepEqual(workspaceMembers('workspace = { members = ["z"] }\n'), ['z']);
});

test('cargo pins: a quoted dotted key is read, not skipped', () => {
  assert.deepEqual(report(MEMBER, member('"serde".version = "1"')),
    [`cargo-pin|${MEMBER}|6|dependency serde: requirement "1" is not an exact =x.y.z pin`]);
  assert.deepEqual(report(MEMBER, member('"serde".version = "=1.0.0"')), []);
});

test('cargo pins: a dotted key with spaces around the dot is read, not skipped', () => {
  assert.deepEqual(report(MEMBER, member('serde . version = "1"')),
    [`cargo-pin|${MEMBER}|6|dependency serde: requirement "1" is not an exact =x.y.z pin`]);
  assert.deepEqual(report(MEMBER, member('serde . version = "=1.0.0"')), []);
});

test('cargo pins: a line the reader cannot parse inside a dependency table is a finding', () => {
  const found = report(MEMBER, member('serde = "=1.0.0"\n!!! not toml'));
  assert.equal(found.length, 1);
  assert.match(found[0], /^cargo-pin\|crates\/demo\/Cargo\.toml\|7\|unparsed line in a dependency table/);
  // a multi-line inline table is one entry, not unparsed lines
  assert.deepEqual(report(MEMBER, member('serde = { version = "=1.0.0",\n  features = [\n    "derive",\n  ] }')), []);
});

test('cargo pins: every entry under a patch table is a finding', () => {
  const found = report(MEMBER, '[patch.crates-io]\nserde = { path = "../serde" }\nlog = { git = "https://example.com/log" }\n');
  assert.equal(found.length, 2);
  assert.match(found[0], /^cargo-pin\|crates\/demo\/Cargo\.toml\|2\|patch entry serde:/);
  assert.match(found[1], /\|3\|patch entry log:/);
  assert.deepEqual(report(MEMBER, '[patch.crates-io]\n'), []);
});

test('cargo pins: a patch sub-table (also under a quoted registry url) is a finding', () => {
  const a = report(MEMBER, '[patch.crates-io.serde]\npath = "../serde"\n');
  assert.equal(a.length, 1);
  assert.match(a[0], /\|1\|patch entry serde:/);
  const b = report(MEMBER, "[patch.'https://github.com/x/y'.serde]\npath = \"../s\"\n");
  assert.equal(b.length, 1);
  assert.match(b[0], /\|1\|patch entry serde:/);
});

test('cargo pins: every entry under a replace table is a finding', () => {
  const found = report(MEMBER, '[replace]\n"serde:1.0.0" = { path = "../serde" }\n');
  assert.equal(found.length, 1);
  assert.match(found[0], /\|2\|patch entry serde:1\.0\.0:/);
  const sub = report(MEMBER, '[replace."serde:1.0.0"]\npath = "../serde"\n');
  assert.equal(sub.length, 1);
  assert.match(sub[0], /\|1\|patch entry serde:1\.0\.0:/);
});

test('cargo pins: a root-level dotted patch key is a finding', () => {
  const found = report(MEMBER, 'patch.crates-io.serde = { path = "../serde" }\n');
  assert.equal(found.length, 1);
  assert.match(found[0], /\|1\|patch entry /);
});

test('cargo pins: an array-table header ends the dependency table', () => {
  assert.deepEqual(report(MEMBER, member('serde = "=1.0.0"\n\n[[bin]]\nname = "x"\npath = "src/x.rs"')), []);
});

test('cargo pins: an integration walk finds members listed under a commented workspace header', () => {
  const dir = mkdtempSync(join(tmpdir(), 'cargo-pins-'));
  const put = (p, c) => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), c); };
  try {
    put('Cargo.toml', '[workspace] # root\nmembers = ["crates/one"]\n');
    put('crates/one/Cargo.toml', member('rand = "0.8"'));
    assert.deepEqual(checkCargoPins(dir).map((f) => f.file), ['crates/one/Cargo.toml']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
