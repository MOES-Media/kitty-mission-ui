import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { parse } from 'yaml';
import {
  ALLOW_LIST, checkBaselines, checkGateJobNames, checkGateScripts, checkLockfile, checkNpmrc, checkPackageJson, checkPlantFiles,
  checkPlaywrightTag, checkPng, checkTypecheckScripts, checkVitestFamily, checkWorkflow, checkWorkflowTriggers,
  scanText,
} from './rules.mjs';

// Every token-, path- and credential-shaped string is assembled at run time from fragments.
const SCRIPT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'check-hygiene.mjs');
const alnum36 = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
const tok = (prefix) => `x=${prefix}_${alnum36}`;
const HOME = '/' + 'home' + '/';
const USERS = '/' + 'Users' + '/';
const AUTH = '_auth' + 'Token';
const BEARER = 'Authorization' + ': Bearer ';
const flagged = (file, text) => scanText(file, text).length > 0;
const rules = (file, text) => scanText(file, text).map((f) => f.rule);

test('token shapes with bodies are flagged', () => {
  for (const p of ['ghp', 'gho', 'ghs', 'ghu', 'ghr', 'npm']) {
    assert.deepEqual(rules('a.txt', tok(p)), ['plant-hygiene-token'], p);
  }
  assert.deepEqual(rules('a.txt', `t=github_pat_${'a1B2c3D4e5F6g7H8i9J0k1'}`), ['plant-hygiene-token']);
});

test('token prefixes without bodies pass', () => {
  assert.deepEqual(rules('a.md', 'prefixes ghp_ gho_ github_pat_ and npm_ are named in prose'), []);
  assert.deepEqual(rules('a.md', `ghp_${'short'}`), []);
});

test('token finding never echoes the value', () => {
  const [f] = scanText('a.txt', tok('ghp'));
  assert.ok(!JSON.stringify(f).includes(alnum36));
});

test('auth token assignment with a real value is flagged, placeholders pass', () => {
  assert.deepEqual(rules('a.md', `//h/:${AUTH}=abcdef123456`), ['auth-token-assignment']);
  assert.deepEqual(rules('a.md', `${AUTH}: abcdef123456`), ['auth-token-assignment']);
  assert.deepEqual(rules('a.md', `//h/:${AUTH}=` + '${NODE_AUTH_TOKEN}'), ['auth-token-assignment']);
  assert.deepEqual(rules('a.md', `//h/:${AUTH}=<token>`), []);
  assert.deepEqual(rules('a.md', `printf '${AUTH}=%s'`), []);
  assert.deepEqual(rules('a.md', `${AUTH}=<redacted>`), []);
});

test('quoted auth token key with a real value is flagged in JSON and YAML, placeholders pass', () => {
  const q = '"';
  const json = `{${q}${AUTH}${q}: ${q}realvalue123${q}}`;
  assert.ok(flagged('c.json', json));
  assert.ok(flagged('c.json', `{${q}${AUTH.slice(1)}${q}: ${q}realvalue123${q}}`));
  assert.ok(flagged('c.yaml', `${q}//reg.example/:${AUTH}${q}: ${q}realvalue123${q}`));
  assert.ok(flagged('c.yaml', `${q}${AUTH.slice(1)}${q}: realvalue123`));
  assert.ok(flagged('c.md', `${q}${AUTH.slice(1)}${q}: ${q}realvalue123${q}`));
  assert.deepEqual(rules('c.json', `{${q}${AUTH.slice(1)}${q}: ${q}<token>${q}}`), []);
  assert.deepEqual(rules('c.json', `{${q}${AUTH.slice(1)}${q}: ${q}${q}}`), []);
});

test('quoted auth token key without a separator needs a quoted real value to fire', () => {
  const q = '"';
  // .yarnrc v1 form: quoted key, space, quoted real value
  assert.ok(flagged('.yarnrc', `${q}//reg.example/:${AUTH}${q} ${q}realvalue123${q}`));
  assert.deepEqual(rules('.yarnrc', `${q}//reg.example/:${AUTH}${q} ${q}<token>${q}`), []);
  // reviewer prose quoting the key, no separator and no quoted value
  assert.deepEqual(rules('r.md', `{${q}${AUTH}${q} + quote + ": " + quoted real value}`), []);
  assert.deepEqual(rules('r.md', `a line of the form {${q}${AUTH}${q} followed by prose`), []);
  // with a separator the unquoted value still fires
  assert.ok(flagged('c.yaml', `${q}${AUTH}${q}: realvalue123`));
});

test('any auth line in an .npmrc is rejected and the file must be byte-equal', () => {
  assert.deepEqual(rules('sub/.npmrc', `${AUTH}=<token>`), ['npmrc-auth']);
  assert.deepEqual(checkNpmrc('@spec-kitty:registry=https://npm.pkg.github.com\n'), []);
  assert.equal(checkNpmrc('@spec-kitty:registry=https://npm.pkg.github.com').length, 1);
  assert.equal(checkNpmrc('@spec-kitty:registry=https://npm.pkg.github.com\nfoo=bar\n').length, 1);
});

test('Bearer literal is flagged, placeholder passes', () => {
  assert.deepEqual(rules('a.md', `${BEARER}abc123def456`), ['bearer-literal']);
  assert.deepEqual(rules('a.md', `${BEARER}<token>`), []);
});

test('absolute user paths are flagged on all three platforms', () => {
  assert.deepEqual(rules('a.md', `see ${HOME}someone/x`), ['user-path']);
  assert.deepEqual(rules('a.md', `see x${USERS}someone/x`), ['user-path']);
  assert.deepEqual(rules('a.md', `C:\\${'Users'}\\someone\\x`), ['user-path']);
  assert.deepEqual(rules('a.json', `"C:\\\\${'Users'}\\\\someone\\\\x"`), ['user-path']);
});

test('paths without a trailing slash are flagged up to a boundary', () => {
  assert.deepEqual(rules('a.md', `cd ${HOME}someone`), ['user-path']);
  assert.deepEqual(rules('a.md', `p="${HOME}someone"`), ['user-path']);
  assert.deepEqual(rules('a.md', `${HOME}<user>foo`), ['user-path']);
  assert.deepEqual(rules('a.md', `${USERS}someone`), ['user-path']);
  assert.deepEqual(rules('a.md', `cd ${HOME}<user>`), []);
  assert.deepEqual(rules('a.md', `cd ${HOME}runner`), []);
  assert.deepEqual(rules('a.md', `cd ${HOME}runnerx`), ['user-path']);
});

test('JSON slash-escaped home paths are flagged', () => {
  const esc = `"\\/${'home'}\\/someone\\/x"`;
  assert.deepEqual(rules('a.json', esc), ['user-path']);
});

test('a second path on the charter source_path line is not hidden', () => {
  const ok = `    source_path: ${HOME}someone/.local/share/uv/tools/spec-kitty-cli/lib/packs/built-in/missions/software-dev/mission.yaml`;
  const f = '.kittify/charter/charter.yaml';
  assert.deepEqual(rules(f, ok), []);
  assert.ok(flagged(f, `${ok} ${HOME}other/x`));
  assert.ok(flagged(f, `${ok}/../${HOME}other`));
});

test('feedback_path strip covers only a CLI review-feedback path value', () => {
  const ev = 'kitty-specs/m/status.events.jsonl';
  const val = (v) => `{"feedback_path": "${v}"}`;
  const good = `${HOME}someone/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md`;
  assert.deepEqual(rules(ev, val(good)), []);
  assert.ok(flagged(ev, val(`${good} ${HOME}other/y`)));
  assert.ok(flagged(ev, val(`${HOME}someone/secret/notes.txt`)));
});

test('CI roots and placeholder segments pass', () => {
  assert.deepEqual(rules('a.md', `${HOME}runner/work/x`), []);
  assert.deepEqual(rules('a.md', '/github/workspace/x /__w/r/r /github/home/x'), []);
  for (const seg of ['<user>', '<name>', '<repo>', '${USER}']) {
    assert.deepEqual(rules('a.md', `${HOME}${seg}/x`), [], seg);
  }
});

test('a name glued to a placeholder is still flagged', () => {
  assert.deepEqual(rules('a.md', `${HOME}<user>foo/x`), ['user-path']);
  assert.deepEqual(rules('a.md', `${HOME}runnerx/x`), ['user-path']);
});

test('allow-list has exactly two entries; the charter entry exempts only the CLI-written line in its file', () => {
  assert.equal(ALLOW_LIST.length, 2);
  const line = `    source_path: ${HOME}someone/.local/share/uv/tools/spec-kitty-cli/lib/packs/built-in/missions/software-dev/mission.yaml`;
  assert.deepEqual(rules('.kittify/charter/charter.yaml', line), []);
  assert.deepEqual(rules('.kittify/charter/other.yaml', line), ['user-path']);
  assert.deepEqual(rules('.kittify/charter/charter.yaml', `note: ${HOME}someone/x`), ['user-path']);
  assert.deepEqual(rules('.kittify/charter/charter.yaml', `    source_path: ${HOME}someone/elsewhere/x`), ['user-path']);
});

test('feedback_path home paths are allowed only under that key in the status files', () => {
  const events = 'kitty-specs/m/status.events.jsonl';
  const fb = `{"review_result": {"feedback_path": "${HOME}someone/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md",`;
  assert.deepEqual(rules(events, fb), []);
  assert.deepEqual(rules('kitty-specs/m/status.json', `        "feedback_path": "${HOME}someone/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md",`), []);
  assert.deepEqual(rules(events, `{"other_path": "${HOME}someone/r/x.md",`), ['user-path']);
  assert.deepEqual(rules(events, `${fb} "note": "${HOME}someone/y"`), ['user-path']);
  assert.deepEqual(rules('kitty-specs/m/other.json', fb), ['user-path']);
  assert.deepEqual(rules('docs/status.json', fb), ['user-path']);
});

test('retrospective record_path is allowed only in the exact CLI shape', () => {
  const ev = 'kitty-specs/m/status.events.jsonl';
  const rec = (v) => `{"record_path": "${v}"}`;
  const good = `${HOME}someone/r/kitty-specs/m/retrospective.yaml`;
  assert.deepEqual(rules(ev, rec(good)), []);
  assert.deepEqual(rules('kitty-specs/m/status.json', rec(good)), []);
  assert.ok(flagged(ev, rec(`${HOME}someone/r/kitty-specs/m/notes.yaml`)));
  assert.ok(flagged(ev, rec(`${HOME}someone/elsewhere/retrospective.yaml`)));
  assert.ok(flagged(ev, `${rec(good)} ${HOME}other/y`));
  assert.ok(flagged('kitty-specs/m/other.json', rec(good)));
});

test('package specs must be exact', () => {
  const pkg = (spec) => ({ dependencies: { lit: spec } });
  assert.deepEqual(checkPackageJson('p', pkg('3.3.3')), []);
  assert.deepEqual(checkPackageJson('p', pkg('workspace:*')), []);
  assert.deepEqual(checkPackageJson('p', pkg('1.1.0-rc.10')), []);
  for (const bad of ['^3.3.3', '~3.3.3', '>=3', '*', 'x', 'latest', '3.x', '3.3']) {
    assert.equal(checkPackageJson('p', pkg(bad)).length, 1, bad);
  }
  assert.equal(checkPackageJson('p', { engines: { node: '>=22' } }).length, 1);
  assert.deepEqual(checkPackageJson('p', { engines: { node: '22.22.2' } }), []);
  assert.equal(checkPackageJson('p', { pnpm: { overrides: { a: '^1.0.0' } } }).length, 1);
});

test('vitest family versions must agree', () => {
  const m = (v1, v2) => [
    { file: 'a', json: { devDependencies: { vitest: v1 } } },
    { file: 'b', json: { devDependencies: { '@vitest/browser': v2 } } },
  ];
  assert.deepEqual(checkVitestFamily(m('4.1.11', '4.1.11')), []);
  assert.equal(checkVitestFamily(m('4.1.11', '4.1.10')).length, 1);
});

test('playwright version must equal the image tag', () => {
  const src = (tag) => [{ file: 'v.sh', text: `mcr.microsoft.com/playwright:v${tag}-noble` }];
  assert.deepEqual(checkPlaywrightTag('1.62.1', src('1.62.1')), []);
  assert.equal(checkPlaywrightTag('1.62.1', src('1.61.0')).length, 1);
});

test('lockfile needs integrity and a private-registry tarball for each spec-kitty package', () => {
  const entry = (res) => `packages:\n\n  '@spec-kitty/tokens@1.1.0-rc.10':\n    resolution: {${res}}\n`;
  const url = 'https://npm.pkg.github.com/download/@spec-kitty/tokens/1.1.0-rc.10/abc123';
  assert.deepEqual(checkLockfile(entry(`integrity: sha512-abc, tarball: ${url}`)), []);
  assert.deepEqual(checkLockfile(entry(`tarball: ${url}, integrity: sha512-abc`)), []);
  assert.equal(checkLockfile(entry(`tarball: ${url}`)).length, 1);
  assert.equal(checkLockfile(null).length, 1);
  assert.equal(checkLockfile('packages:\n').length, 1);
  for (const bad of ['https://registry.npmjs.org/@spec-kitty/tokens/-/tokens-1.1.0-rc.10.tgz', 'https://evil.example/download/@spec-kitty/tokens/x',
    'http://npm.pkg.github.com/download/@spec-kitty/tokens/x', 'https://npm.pkg.github.com/download/@other/tokens/x']) {
    const r = checkLockfile(entry(`integrity: sha512-abc, tarball: ${bad}`));
    assert.equal(r.length, 1, bad);
    assert.match(r[0].message, /tarball/);
  }
  assert.equal(checkLockfile(entry('integrity: sha512-abc')).length, 1);
});

test('workspace packages need a typecheck script', () => {
  const pkg = (scripts) => [{ file: 'packages/a/package.json', isWorkspace: true, json: { scripts } }];
  assert.deepEqual(checkTypecheckScripts(pkg({ typecheck: 'tsc' })), []);
  assert.equal(checkTypecheckScripts(pkg({})).length, 1);
});

test('gate scripts may not use changed-files modes', () => {
  assert.deepEqual(checkGateScripts('p', { lint: 'eslint .' }), []);
  assert.equal(checkGateScripts('p', { lint: 'eslint --' + 'changed' }).length, 1);
  assert.equal(checkGateScripts('p', { lint: 'git ' + 'diff --name-only | xargs eslint' }).length, 1);
  assert.equal(checkGateScripts('p', { lint: 'lint' + '-staged' }).length, 1);
});

test('plant directory may hold no lintable file', () => {
  assert.deepEqual(checkPlantFiles(['gates/plants/x/plant.json', 'gates/plants/x/a.ts.plant']), []);
  assert.equal(checkPlantFiles(['gates/plants/x/a.ts']).length, 1);
  assert.equal(checkPlantFiles(['gates/plants/x/a.css']).length, 1);
  assert.equal(checkPlantFiles(['gates/plants/x/a.json']).length, 1);
});

const sha = 'a'.repeat(40);
const goodWorkflow = () => ({
  on: { pull_request: { branches: ['main'] }, push: { branches: ['main'] } },
  permissions: { contents: 'read' },
  jobs: {
    preflight: {
      permissions: { contents: 'read' },
      steps: [{ uses: `actions/checkout@${sha}`, with: { 'persist-credentials': false } }],
    },
    hygiene: { permissions: { contents: 'read' }, steps: [] },
    'proof-leg': {
      permissions: { contents: 'read' },
      strategy: { matrix: { gate: ['hygiene', 'preflight'] } },
      steps: [{ uses: `actions/upload-artifact@${sha}`, with: { 'retention-days': 1 } }],
    },
    proof: { permissions: { contents: 'read' }, steps: [] },
    all: { permissions: { contents: 'read' }, steps: [] },
  },
});
const wf = (doc, plants = ['hygiene', 'preflight']) => checkWorkflow('ci.yml', doc, plants);

test('a compliant workflow passes', () => {
  assert.deepEqual(wf(goodWorkflow()), []);
});

test('forbidden triggers are caught in any workflow', () => {
  for (const t of ['pull_request_target', 'workflow_run']) {
    assert.equal(checkWorkflowTriggers('w.yml', { on: { [t]: {} } }).length, 1, t);
    const doc = goodWorkflow();
    doc.on[t] = {};
    assert.ok(wf(doc).length >= 1, t);
  }
  assert.deepEqual(checkWorkflowTriggers('w.yml', parse('on: [push]\njobs: {}')), []);
});

test('workflow permission, checkout, pin, retention and continue-on-error rules', () => {
  const mutate = (fn) => { const d = goodWorkflow(); fn(d); return wf(d).map((f) => f.rule); };
  assert.ok(mutate((d) => { delete d.permissions; }).includes('workflow-permissions'));
  assert.ok(mutate((d) => { delete d.jobs.hygiene.permissions; }).includes('workflow-permissions'));
  assert.ok(mutate((d) => { d.jobs.preflight.steps[0].with['persist-credentials'] = true; }).includes('checkout-credentials'));
  assert.ok(mutate((d) => { d.jobs.preflight.steps[0].uses = 'actions/checkout@v4'; }).includes('action-pin'));
  assert.ok(mutate((d) => { d.jobs['proof-leg'].steps[0].with['retention-days'] = 7; }).includes('artifact-retention'));
  assert.ok(mutate((d) => { d.jobs.hygiene['continue-on-error'] = true; }).includes('continue-on-error'));
  assert.ok(mutate((d) => { d.jobs.hygiene.env = { VITE_X: '${{ secrets.S }}' }; }).includes('secret-env'));
  assert.ok(mutate((d) => { d.jobs.hygiene.container = 'mcr.microsoft.com/playwright:v1.0.0'; }).includes('image-digest'));
  assert.ok(mutate((d) => { d.on.push.branches = ['develop']; }).includes('workflow-trigger'));
});

test('trace uploads must name the sanitiser', () => {
  const d = goodWorkflow();
  const step = (name) => ({
    name, uses: `actions/upload-artifact@${sha}`, with: { path: 'test-results/trace.zip', 'retention-days': 1 },
  });
  d.jobs.hygiene.steps = [step('Upload traces')];
  assert.ok(wf(d).some((f) => f.rule === 'trace-upload'));
  d.jobs.hygiene.steps = [step('Upload sanitised traces')];
  assert.deepEqual(wf(d), []);
});

test('digest-pinned container passes', () => {
  const d = goodWorkflow();
  d.jobs.hygiene.container = `mcr.microsoft.com/playwright:v1.0.0@sha256:${'b'.repeat(64)}`;
  assert.deepEqual(wf(d), []);
});

test('matrix-supplied container: every include image must be empty or digest-pinned', () => {
  const d = goodWorkflow();
  d.jobs['proof-leg'].container = '${{ matrix.image }}';
  d.jobs['proof-leg'].strategy.matrix.include = [
    { gate: 'hygiene', image: '' },
    { gate: 'preflight', image: `mcr.microsoft.com/playwright:v1.0.0@sha256:${'b'.repeat(64)}` },
  ];
  assert.deepEqual(wf(d), []);
  d.jobs['proof-leg'].strategy.matrix.include[1].image = 'mcr.microsoft.com/playwright:v1.0.0';
  assert.ok(wf(d).some((f) => f.rule === 'image-digest'));
});

test('matrix-supplied container: a matrix.image axis is validated too', () => {
  const d = goodWorkflow();
  d.jobs['proof-leg'].container = '${{ matrix.image }}';
  d.jobs['proof-leg'].strategy.matrix.image = ['', `mcr.microsoft.com/playwright:v1.0.0@sha256:${'b'.repeat(64)}`];
  assert.deepEqual(wf(d), []);
  d.jobs['proof-leg'].strategy.matrix.image.push('mcr.microsoft.com/playwright:v1.0.0');
  assert.ok(wf(d).some((f) => f.rule === 'image-digest'));
  d.jobs['proof-leg'].strategy.matrix.image = 'mcr.microsoft.com/playwright:v1.0.0';
  assert.ok(wf(d).some((f) => f.rule === 'image-digest'));
});

test('gate ids derive from job ids, matrix and plant directories must agree', () => {
  const d = goodWorkflow();
  d.jobs.hygiene.name = 'Gate: something-else';
  assert.deepEqual(wf(d), []);
  const extra = goodWorkflow();
  extra.jobs.lint = { permissions: { contents: 'read' }, steps: [] };
  assert.ok(wf(extra).some((f) => f.rule === 'gate-coverage'));
  assert.ok(wf(goodWorkflow(), ['hygiene']).some((f) => f.rule === 'gate-coverage'));
  const dup = goodWorkflow();
  dup.jobs['proof-leg'].strategy.matrix.gate = ['hygiene', 'hygiene'];
  assert.ok(wf(dup).some((f) => f.rule === 'gate-coverage'));
  const noProof = goodWorkflow();
  delete noProof.jobs.all;
  assert.ok(wf(noProof).some((f) => f.rule === 'gate-coverage'));
});

// Build a real PNG in the test itself; no binary fixture is committed.
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(extra = []) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    sig, chunk('IHDR', ihdr), ...extra, chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 0]))), chunk('IEND', Buffer.alloc(0)),
  ]);
}

test('PNG with only critical chunks passes', () => {
  assert.deepEqual(checkPng('a.png', png()), []);
  assert.deepEqual(checkPng('a.png', png([chunk('PLTE', Buffer.alloc(3)), chunk('tRNS', Buffer.alloc(1))])), []);
});

test('PNG with an added tEXt chunk fails', () => {
  const dirty = png([chunk('tEXt', Buffer.from('k\0v', 'latin1'))]);
  const [f] = checkPng('a.png', dirty);
  assert.equal(f.rule, 'png-chunks');
  assert.match(f.message, /tEXt/);
  for (const t of ['iTXt', 'eXIf']) assert.equal(checkPng('a.png', png([chunk(t, Buffer.alloc(2))])).length, 1, t);
});

test('malformed PNG fails closed', () => {
  assert.equal(checkPng('a.png', Buffer.from('nope')).length, 1);
  assert.equal(checkPng('a.png', png().subarray(0, 40)).length, 1);
  assert.equal(checkPng('a.png', Buffer.concat([png(), Buffer.from('trailing')])).length, 1);
});

test('baselines map 1:1 to story ids', () => {
  assert.deepEqual(checkBaselines(['a--x-chromium-linux.png'], ['a--x']), []);
  assert.equal(checkBaselines(['a--x.png', 'b.png'], ['a--x']).length, 1);
  assert.equal(checkBaselines(['a--x.png'], ['a--x', 'c']).length, 1);
  assert.equal(checkBaselines([], ['a']).length, 1);
  assert.deepEqual(checkBaselines([], []), []);
  assert.deepEqual(checkBaselines(['a.png'], null), []);
});

// End to end against a throwaway git repository.
function repo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'hyg-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  mkdirSync(join(dir, 'gates/plants'), { recursive: true });
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  git('add', '-A');
  return dir;
}
const run = (dir, ...args) => spawnSync('node', [SCRIPT, '--root', dir, ...args], { encoding: 'utf8' });

test('untracked files are scanned', () => {
  const dir = repo({ 'ok.txt': 'fine\n' });
  try {
    writeFileSync(join(dir, 'new-untracked.txt'), tok('ghp'));
    const r = run(dir);
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /plant-hygiene-token/);
    assert.ok(!r.stdout.includes(alnum36));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('--storybook-static scans the built output and fails closed on a missing directory', () => {
  const dir = repo({ 'ok.txt': 'fine\n' });
  try {
    mkdirSync(join(dir, 'out'));
    writeFileSync(join(dir, 'out/a.js'), 'clean');
    assert.equal(run(dir, '--storybook-static', 'out').status, 0);
    writeFileSync(join(dir, 'out/b.map'), tok('npm'));
    assert.notEqual(run(dir, '--storybook-static', 'out').status, 0);
    assert.notEqual(run(dir, '--storybook-static', 'missing').status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('--record scans a gate-proof record', () => {
  const dir = repo({ 'ok.txt': 'fine\n' });
  try {
    writeFileSync(join(dir, 'rec.json'), `{"p":"${HOME}someone/x"}`);
    assert.notEqual(run(dir, '--record', 'rec.json').status, 0);
    assert.notEqual(run(dir, '--record', 'absent.json').status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the plant descriptor names the unique label and commits no token literal', () => {
  const plantPath = resolve(dirname(SCRIPT), '..', 'gates/plants/hygiene/plant.json');
  const text = readFileSync(plantPath, 'utf8');
  assert.equal(JSON.parse(text).expectFailPattern, 'plant-hygiene-token');
  assert.deepEqual(rules('gates/plants/hygiene/plant.json', text), []);
});

test('--list-allowed prints exactly the two CLI-record-path entries', () => {
  const r = spawnSync('node', [SCRIPT, '--list-allowed'], { encoding: 'utf8' });
  assert.equal(r.stdout.trim().split('\n').length, 2);
  assert.match(r.stdout, /CLI record path/);
});

test("a job named 'Gate: ...' is rejected outside ci.yml (rule), allowed in no other workflow", () => {
  const doc = (name, id = 'build') => parse(`on: [push]\njobs:\n  ${JSON.stringify(id)}:\n    name: ${JSON.stringify(name)}\n    runs-on: x\n`);
  assert.equal(checkGateJobNames('.github/workflows/other.yml', doc('Gate: typecheck')).length, 1);
  assert.equal(checkGateJobNames('.github/workflows/other.yml', doc('gate : all')).length, 1);
  assert.equal(checkGateJobNames('.github/workflows/other.yml', doc('Gate: proof (${{ matrix.gate }})')).length, 1);
  assert.equal(checkGateJobNames('.github/workflows/other.yml', doc('Build', 'Gate: x')).length, 1);
  assert.deepEqual(checkGateJobNames('.github/workflows/other.yml', doc('Build and test')), []);
  assert.deepEqual(checkGateJobNames('.github/workflows/other.yml', doc('Aggregate gate')), []);
});

test("the hygiene script flags a 'Gate:' job in a second workflow file", () => {
  const ci = readFileSync(resolve(dirname(SCRIPT), '..', '.github/workflows/ci.yml'), 'utf8');
  const spoof = 'on:\n  pull_request:\n    branches: [main]\njobs:\n  fake:\n    name: "Gate: typecheck"\n    runs-on: ubuntu-24.04\n    steps:\n      - run: "true"\n';
  const dir = repo({ '.github/workflows/ci.yml': ci, '.github/workflows/extra.yml': spoof });
  try {
    const r = run(dir);
    assert.match(r.stdout, /FINDING \[gate-name\] \.github\/workflows\/extra\.yml/);
    writeFileSync(join(dir, '.github/workflows/extra.yml'), spoof.replace('Gate: typecheck', 'Extra check'));
    assert.doesNotMatch(run(dir).stdout, /gate-name/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('scan-dir / --storybook-static mode flags CI runner roots instead of stripping them', () => {
  const roots = ['/' + 'home' + '/runner/work/r/r/x.ts', '/' + '__w' + '/r/r/x.ts', '/github/' + 'workspace/x.ts', '/github/' + 'home/.npmrc'];
  for (const r of roots) {
    assert.deepEqual(scanText('a.js', `at ${r}`), [], `repository mode strips ${r}`);
    assert.ok(scanText('a.js', `at ${r}`, { strictCi: true }).some((f) => f.rule === 'ci-path' || f.rule === 'user-path'), r);
  }
  assert.deepEqual(scanText('a.js', 'at <repo>/x.ts and ./rel', { strictCi: true }), []);
  const dir = repo({ 'ok.txt': 'fine\n' });
  try {
    mkdirSync(join(dir, 'out'));
    writeFileSync(join(dir, 'out/a.js'), 'clean');
    assert.equal(run(dir, '--storybook-static', 'out').status, 0);
    for (const r of roots) {
      writeFileSync(join(dir, 'out/b.js'), `// built at ${r}`);
      assert.notEqual(run(dir, '--storybook-static', 'out').status, 0, r);
      assert.notEqual(run(dir, '--scan-dir', 'out').status, 0, r);
    }
    writeFileSync(join(dir, 'out/b.js'), 'clean');
    writeFileSync(join(dir, 'rec.json'), '{"p":"' + roots[1] + '"}');
    assert.notEqual(run(dir, '--scan-dir', 'out', '--record', 'rec.json').status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('packageManager must carry the exact version and the sha512 hash, matching engines.pnpm', () => {
  const hash = 'ab'.repeat(64);
  const ok = { engines: { pnpm: '11.18.0' }, packageManager: `pnpm@11.18.0+sha512.${hash}` };
  assert.deepEqual(checkPackageJson('package.json', ok), []);
  assert.equal(checkPackageJson('package.json', { ...ok, packageManager: 'pnpm@11.18.0' }).length, 1);
  assert.equal(checkPackageJson('package.json', { ...ok, packageManager: 'pnpm@^11.18.0+sha512.' + hash }).length, 1);
  assert.equal(checkPackageJson('package.json', { ...ok, packageManager: 'pnpm@11.18.0+sha512.abc' }).length, 1);
  assert.equal(checkPackageJson('package.json', { ...ok, packageManager: `pnpm@11.17.0+sha512.${hash}` }).length, 1);
  assert.deepEqual(checkPackageJson('apps/x/package.json', { dependencies: { a: '1.0.0+build.5' } }), []);
});

test('a Storybook project.json (userSince fingerprint) in the scanned output is flagged', () => {
  const dir = repo({ 'ok.txt': 'fine\n' });
  try {
    mkdirSync(join(dir, 'out'));
    writeFileSync(join(dir, 'out/a.js'), 'clean');
    assert.equal(run(dir, '--storybook-static', 'out').status, 0);
    writeFileSync(join(dir, 'out/project.json'), '{"generatedAt":1,"userSince":1}');
    const r = run(dir, '--storybook-static', 'out');
    assert.notEqual(r.status, 0);
    assert.match(r.stdout, /storybook-project-json/);
    mkdirSync(join(dir, 'out/nested'));
    rmSync(join(dir, 'out/project.json'));
    writeFileSync(join(dir, 'out/nested/project.json'), '{}');
    assert.match(run(dir, '--storybook-static', 'out').stdout, /storybook-project-json/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the committed Storybook app config disables telemetry and deletes project.json after the build', () => {
  const root = resolve(dirname(SCRIPT), '..');
  assert.match(readFileSync(join(root, 'apps/storybook/.storybook/main.ts'), 'utf8'), /disableTelemetry:\s*true/);
  const build = JSON.parse(readFileSync(join(root, 'apps/storybook/package.json'), 'utf8')).scripts.build;
  assert.match(build, /storybook build/);
  assert.match(build, /storybook-static\/project\.json/);
});
