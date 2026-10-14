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
  checkGateStructure, checkPlaywrightTag, checkPng, checkTypecheckScripts, checkVitestFamily, checkWorkflow,
  checkWorkflowSecurity, checkWorkflowTriggers, forbiddenNames, scanText,
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

// E-mail rule: path scoped to the contract, fixtures and stories. Addresses are assembled at
// run time so this file never carries one. The titles avoid the rule id: node:test prints titles in the clean output,
// and the plant looks for the rule id in the planted output only.
const at = '@';
const mail = (local, domain) => `${local}${at}${domain}`;
const SCOPED = [
  'contracts/spec-kitty/mission-status/examples/a.yaml',
  'packages/mission-ui/src/contract/fixtures.generated.ts',
  'packages/mission-ui/src/elements/x/fixtures.ts',
  'packages/mission-ui/src/elements/x/x.fixtures.ts',
  'packages/mission-ui/src/elements/x/x.stories.ts',
];

test('an e-mail address is flagged in every scoped path, once per occurrence, without echoing it', () => {
  let n = 0;
  for (const file of SCOPED) {
    const found = scanText(file, `owner: ${mail('person', 'corp.test')}`);
    assert.deepEqual(found.map((f) => f.rule), ['email-address'], file);
    assert.ok(!JSON.stringify(found).includes('person'), file);
    n += 1;
  }
  assert.equal(n, 5);
  assert.equal(scanText(SCOPED[0], `${mail('a', 'corp.test')} and ${mail('b', 'corp.test')}`).length, 2);
});

test('an e-mail address outside the scoped paths is left alone (the CLI event log carries a noreply actor)', () => {
  const unscoped = ['kitty-specs/m/status.events.jsonl', 'README.md', 'packages/mission-ui/src/elements/x/x.ts', 'scripts/contract/a.mjs'];
  for (const file of unscoped) assert.deepEqual(scanText(file, mail('person', 'users.noreply.github.com')), [], file);
  assert.equal(unscoped.length, 4);
  // positive control: the same text in a scoped path is flagged
  assert.equal(scanText(SCOPED[0], mail('person', 'users.noreply.github.com')).length, 1);
});

test('example domains and the invalid TLD are allow-listed, look-alikes are not', () => {
  for (const d of ['example.com', 'example.org', 'example.net', 'mail.example.com', 'host.invalid']) {
    assert.deepEqual(scanText(SCOPED[0], mail('person', d)), [], d);
  }
  for (const d of ['example.com.evil.test', 'notexample.com', 'example.co', 'corp.test']) {
    assert.equal(scanText(SCOPED[0], mail('person', d)).length, 1, d);
  }
});

test('package specs and scoped npm names are not mistaken for addresses', () => {
  const text = `import x from '${at}spec-kitty/elements'; lit${at}3.3.3 playwright:v1.62.1-noble${at}sha256:abc ${at}customElement('a-b')`;
  assert.deepEqual(scanText(SCOPED[0], text), []);
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

test('the charter source_path line is flagged like any other path', () => {
  const line = `    source_path: ${HOME}exampleuser/.local/share/uv/tools/spec-kitty-cli/lib/packs/built-in/missions/software-dev/mission.yaml`;
  const f = '.kittify/charter/charter.yaml';
  assert.deepEqual(rules(f, line), ['user-path']);
  assert.deepEqual(rules(f, `    source_path: ~/.local/share/uv/tools/spec-kitty-cli/lib/packs/built-in/missions/software-dev/mission.yaml`), []);
});

test('a CLI review feedback_path with a home path is flagged in the status files', () => {
  const val = (v) => `{"feedback_path": "${v}"}`;
  const good = `${HOME}exampleuser/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md`;
  for (const f of ['kitty-specs/m/status.events.jsonl', 'kitty-specs/m/status.json']) {
    assert.deepEqual(rules(f, val(good)), f.endsWith('.jsonl') ? ['cli-absolute-path', 'user-path'] : ['user-path'], f);
    assert.deepEqual(rules(f, val('~/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md')), [], f);
  }
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

test('the allow-list is empty: nothing is exempt from the path rules', () => {
  assert.equal(ALLOW_LIST.length, 0);
  assert.ok(Object.isFrozen(ALLOW_LIST));
  const fb = `{"review_result": {"feedback_path": "${HOME}exampleuser/r/kitty-specs/m/tasks/WP01-x/review-cycle-1.md",`;
  for (const f of ['kitty-specs/m/status.events.jsonl', 'kitty-specs/m/status.json', 'kitty-specs/m/meta.json', 'docs/status.json']) {
    assert.deepEqual(rules(f, fb), /(?:meta\.json|events\.jsonl)$/.test(f) ? ['cli-absolute-path', 'user-path'] : ['user-path'], f);
  }
});

test('plant: a status-file retrospective record_path with a home path is flagged', () => {
  const rec = (v) => `{"provenance_kind": "runtime_post_completion", "record_path": "${v}"}`;
  const planted = `${HOME}exampleuser/dev/r/kitty-specs/m/retrospective.yaml`;
  for (const f of ['kitty-specs/m/status.events.jsonl', 'kitty-specs/m/status.json']) {
    const absolute = f.endsWith('.jsonl') ? ['cli-absolute-path', 'user-path'] : ['user-path'];
    assert.deepEqual(rules(f, rec(planted)), absolute, f);
    assert.deepEqual(rules(f, rec(`\\/${'home'}\\/exampleuser\\/r\\/kitty-specs\\/m\\/retrospective.yaml`)), absolute, f);
    assert.deepEqual(rules(f, rec('~/dev/r/kitty-specs/m/retrospective.yaml')), [], f);
  }
});

// Private-workspace markers, assembled from fragments so this file never carries one.
const SCRATCH = '/' + 'tmp/' + 'claude-';
const LEDGER = (n) => 'S' + `K-${n}`;

test('an agent scratchpad path is flagged', () => {
  assert.deepEqual(rules('a.md', `see ${SCRATCH}1000/-proj/sess/scratchpad/x.txt`), ['scratchpad-path']);
  assert.deepEqual(rules('kitty-specs/m/status.events.jsonl', `{"p": "${SCRATCH}1000/x"}`), ['scratchpad-path']);
  assert.deepEqual(rules('a.md', 'see <scratchpad>/x.txt and /tmp/other'), []);
});

test('a private ledger id is flagged; two-digit finding codes pass', () => {
  assert.deepEqual(rules('a.md', `tracked as ${LEDGER(223)}`), ['ledger-id']);
  assert.deepEqual(rules('kitty-specs/m/status.events.jsonl', `{"reason": "PASS; ${LEDGER(306)} false positive"}`), ['ledger-id']);
  assert.deepEqual(rules('kitty-specs/m/meta.json', `{"note": "(${LEDGER(1042)})"}`), ['ledger-id']);
  assert.deepEqual(rules('a.ts', `const codes = ['${LEDGER('02')}', '${LEDGER(91)}'];`), []);
  assert.deepEqual(rules('a.md', `${LEDGER('nnn')} entries and sk-missions-screen`), []);
});

test('the username of the running account is flagged as a whole word, case-insensitively', () => {
  const names = forbiddenNames('exampleuser');
  const r = (file, text) => scanText(file, text, { names }).map((f) => f.rule);
  assert.deepEqual(r('kitty-specs/m/meta.json', '{"accepted_by": "exampleuser"}'), ['cli-identity', 'os-username']);
  assert.deepEqual(r('a.md', 'by ExampleUser.'), ['os-username']);
  assert.deepEqual(r('a.md', 'see -dev-exampleuser-x'), ['os-username']);
  assert.deepEqual(r('a.md', 'exampleusers and myexampleuser'), []);
  // Without the account name the structural identity rule still fires, and no name is echoed.
  assert.deepEqual(rules('kitty-specs/m/meta.json', '{"accepted_by": "exampleuser"}'), ['cli-identity']);
});

test('forbiddenNames skips short names and shared accounts and adds the extra list', () => {
  assert.deepEqual(forbiddenNames('runner'), []);
  assert.deepEqual(forbiddenNames('root', ''), []);
  assert.deepEqual(forbiddenNames('abc'), []);
  assert.deepEqual(forbiddenNames('Exampleuser', 'other-person, runner,,exampleuser'), ['exampleuser', 'other-person']);
  assert.deepEqual(forbiddenNames(undefined, undefined), []);
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

// Every workflow file gets the security rules (F-27, B12); the gate structure, including the main-only trigger rule,
// is ci.yml's alone (A10). The titles never quote a rule message: node:test prints titles in the clean output, and the
// hygiene plants look for those messages in the planted output only.
const OTHER = '.github/workflows/other.yml';
const nonCiWorkflow = () => ({
  on: { schedule: [{ cron: '17 5 * * *' }], workflow_dispatch: {} },
  permissions: { contents: 'read' },
  jobs: {
    drift: {
      name: 'Contract drift',
      permissions: { contents: 'read' },
      steps: [
        { uses: `actions/checkout@${sha}`, with: { 'persist-credentials': false } },
        { uses: `actions/setup-node@${sha}`, with: { 'node-version': '22.22.2' } },
        { run: 'node scripts/contract/drift.mjs' },
      ],
    },
  },
});
const security = (doc) => checkWorkflowSecurity(OTHER, doc).map((f) => `${f.rule}|${f.file}|${f.message}`);
const mutateNonCi = (fn) => { const d = nonCiWorkflow(); fn(d); return security(d); };

test('non-ci workflow security: the clean scheduled document passes (positive control for every negative below)', () => {
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security: an action referenced by tag is reported, the SHA-pinned original is clean', () => {
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift.steps[0].uses = 'actions/checkout@v4'; }),
    [`action-pin|${OTHER}|actions/checkout is not pinned to a 40-hex SHA`]);
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift.steps[1].uses = 'actions/setup-node@main'; }),
    [`action-pin|${OTHER}|actions/setup-node is not pinned to a 40-hex SHA`]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security: a document without any permissions block is reported at workflow and job level', () => {
  assert.deepEqual(mutateNonCi((d) => { delete d.permissions; delete d.jobs.drift.permissions; }), [
    `workflow-permissions|${OTHER}|workflow-level permissions must include contents: read`,
    `workflow-permissions|${OTHER}|job drift lacks permissions contents: read`,
  ]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security: checkout without the credential opt-out is reported, missing or true', () => {
  assert.deepEqual(mutateNonCi((d) => { delete d.jobs.drift.steps[0].with; }),
    [`checkout-credentials|${OTHER}|actions/checkout without persist-credentials: false`]);
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift.steps[0].with['persist-credentials'] = true; }),
    [`checkout-credentials|${OTHER}|actions/checkout without persist-credentials: false`]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security, mutate style: removing only the workflow-level permissions is reported', () => {
  assert.deepEqual(mutateNonCi((d) => { delete d.permissions; }),
    [`workflow-permissions|${OTHER}|workflow-level permissions must include contents: read`]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security, mutate style: a job granted contents write is reported', () => {
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift.permissions = { contents: 'write' }; }),
    [`workflow-permissions|${OTHER}|job drift lacks permissions contents: read`]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('non-ci workflow security: continue-on-error and a long artifact retention are reported', () => {
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift['continue-on-error'] = true; }),
    [`continue-on-error|${OTHER}|continue-on-error is forbidden`]);
  assert.deepEqual(mutateNonCi((d) => { d.jobs.drift.steps.push({ uses: `actions/upload-artifact@${sha}`, with: { 'retention-days': 7 } }); }),
    [`artifact-retention|${OTHER}|upload-artifact without retention-days: 1`]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('gate structure is ci-only: it judges the schedule trigger, the security rules never do', () => {
  const structure = checkGateStructure(OTHER, nonCiWorkflow(), ['hygiene']).map((f) => `${f.rule}|${f.message}`);
  assert.deepEqual(structure.filter((f) => f.startsWith('workflow-trigger')), [
    'workflow-trigger|trigger schedule not allowed',
    'workflow-trigger|trigger workflow_dispatch not allowed',
    'workflow-trigger|pull_request must target main only',
    'workflow-trigger|push must target main only',
  ]);
  assert.deepEqual(security(nonCiWorkflow()), []);
});

test('checkWorkflow on ci.yml is exactly the gate structure plus the security rules', () => {
  const docs = [goodWorkflow(), (() => { const d = goodWorkflow(); delete d.permissions; d.on.push.branches = ['dev']; d.jobs.all.steps.push({ uses: 'actions/checkout@v4' }); delete d.jobs.proof; return d; })()];
  const key = (f) => `${f.rule}|${f.message}`;
  for (const d of docs) {
    const both = [...checkGateStructure('ci.yml', d, ['hygiene', 'preflight']), ...checkWorkflowSecurity('ci.yml', d)].map(key).sort();
    assert.deepEqual(wf(d).map(key).sort(), both);
  }
  assert.equal(docs.length, 2);
  assert.equal(wf(docs[1]).length > 0, true);
});

test('the hygiene script applies the security rules to a second workflow file, and not the ci-only structure', () => {
  const ci = readFileSync(resolve(dirname(SCRIPT), '..', '.github/workflows/ci.yml'), 'utf8');
  const good = [
    'on:', '  schedule:', "    - cron: '17 5 * * *'", '  workflow_dispatch:', 'permissions:', '  contents: read', 'jobs:', '  drift:',
    "    name: 'Contract drift'", '    runs-on: ubuntu-24.04', '    permissions:', '      contents: read', '    steps:',
    `      - uses: actions/checkout@${sha}`, '        with:', '          persist-credentials: false', '      - run: node x.mjs', '',
  ].join('\n');
  const dir = repo({ '.github/workflows/ci.yml': ci, '.github/workflows/extra.yml': good });
  const extraLines = (out) => out.split('\n').filter((l) => l.includes('.github/workflows/extra.yml'));
  try {
    assert.deepEqual(extraLines(run(dir).stdout), []);
    writeFileSync(join(dir, '.github/workflows/extra.yml'), good.replace(`checkout@${sha}`, 'checkout@v4').replace('          persist-credentials: false\n', '').replace('permissions:\n  contents: read\n', ''));
    assert.deepEqual(extraLines(run(dir).stdout), [
      'FINDING [workflow-permissions] .github/workflows/extra.yml: workflow-level permissions must include contents: read',
      'FINDING [action-pin] .github/workflows/extra.yml: actions/checkout is not pinned to a 40-hex SHA',
      'FINDING [checkout-credentials] .github/workflows/extra.yml: actions/checkout without persist-credentials: false',
    ]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
  const plants = JSON.parse(text);
  assert.deepEqual(plants.map((p) => p.expectFailPattern), ['plant-hygiene-token', 'email-address', 'plant-hygiene-node-test']);
  assert.equal(new Set(plants.map((p) => p.ciCommand)).size, 1);
  assert.deepEqual(rules('gates/plants/hygiene/plant.json', text), []);
  // the descriptor commits neither a token body nor an address: both are assembled when the generator runs
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/.test(text.replaceAll("'@'", '')));
});

test('--list-allowed prints nothing', () => {
  const r = spawnSync('node', [SCRIPT, '--list-allowed'], { encoding: 'utf8' });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
});

test('plant: the gate fails on a tracked status-file record_path, scratchpad path, ledger id and username', () => {
  const plants = {
    'kitty-specs/m/status.events.jsonl': `{"record_path": "${HOME}exampleuser/r/kitty-specs/m/retrospective.yaml"}\n`,
    'kitty-specs/m/status.json': `{"note": "${SCRATCH}1000/x"}\n`,
    'kitty-specs/m/plan.md': `see ${LEDGER(342)}\n`,
    'kitty-specs/m/meta.json': '{"accepted_by": "exampleuser"}\n',
  };
  const expected = {
    'kitty-specs/m/status.events.jsonl': 'user-path',
    'kitty-specs/m/status.json': 'scratchpad-path',
    'kitty-specs/m/plan.md': 'ledger-id',
    'kitty-specs/m/meta.json': 'os-username',
  };
  const dir = repo(plants);
  try {
    const r = spawnSync('node', [SCRIPT, '--root', dir], {
      encoding: 'utf8', env: { ...process.env, HYGIENE_FORBIDDEN_NAMES: 'exampleuser' },
    });
    assert.notEqual(r.status, 0);
    for (const [file, rule] of Object.entries(expected)) assert.match(r.stdout, new RegExp(`\\[${rule}\\] ${file}:1`), file);
    assert.ok(!r.stdout.includes('exampleuser'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// CLI-written identity: the structural rules do not need the account name of the machine that runs the gate.
test('plant: an actor field that names a person is flagged in meta.json and the event log, without the account name', () => {
  const person = 'jane' + 'doe';
  for (const f of ['kitty-specs/m/meta.json', 'kitty-specs/m/status.events.jsonl']) {
    for (const key of ['accepted_by', 'actor', 'actor_id', 'agent', 'resolved_by']) {
      const found = scanText(f, `{"${key}": "${person}"}`);
      assert.deepEqual(found.map((x) => x.rule), ['cli-identity'], `${f} ${key}`);
      assert.ok(!JSON.stringify(found).includes(person), `${f} ${key}`);
    }
  }
});

test('clean control: neutral actors pass in meta.json and the event log', () => {
  let n = 0;
  for (const value of ['<user>', 'claude', 'claude:opus', 'user', 'cli', 'merge', 'finalize-tasks', '', 'spec-kitty mission create',
    'spec-kitty agent mission finalize-tasks', mail('34285209+Org-Name', 'users.noreply.github.com')]) {
    for (const f of ['kitty-specs/m/meta.json', 'kitty-specs/m/status.events.jsonl']) {
      assert.deepEqual(scanText(f, `{"accepted_by": ${JSON.stringify(value)}, "actor": ${JSON.stringify(value)}}`), [], `${f} ${value}`);
      n += 1;
    }
  }
  assert.equal(n, 22);
  // the rule is scoped: the same name in another file or under a non-actor key is not this rule's business
  assert.deepEqual(scanText('docs/meta.json', '{"accepted_by": "' + 'jane' + 'doe"}'), []);
  assert.deepEqual(scanText('kitty-specs/m/meta.json', '{"title": "' + 'jane' + 'doe"}'), []);
});

test('plant: an absolute record_path or feedback_path is flagged in meta.json and the event log, a relative or home-relative one passes', () => {
  for (const f of ['kitty-specs/m/meta.json', 'kitty-specs/m/status.events.jsonl']) {
    for (const key of ['record_path', 'feedback_path']) {
      for (const bad of ['/srv/work/kitty-specs/m/x.md', 'C:\\\\work\\\\x.md', '\\/srv\\/work\\/x.md']) {
        const found = scanText(f, `{"${key}": "${bad}"}`);
        assert.deepEqual(found.map((x) => x.rule), ['cli-absolute-path'], `${f} ${key} ${bad}`);
        assert.ok(!JSON.stringify(found).includes('srv'), f);
      }
      for (const good of ['kitty-specs/m/x.md', '~/work/kitty-specs/m/x.md', '<workspace>/kitty-specs/m/x.md']) {
        assert.deepEqual(scanText(f, `{"${key}": "${good}"}`), [], `${f} ${key} ${good}`);
      }
    }
  }
});

test('plant: an e-mail address that is not a noreply address is flagged in any tracked kitty-specs file, noreply and example addresses pass', () => {
  for (const f of ['kitty-specs/m/spec.md', 'kitty-specs/m/meta.json', 'kitty-specs/m/status.events.jsonl', 'kitty-specs/m/tasks/WP01-x.md']) {
    const found = scanText(f, `contact ${mail('person', 'corp.test')}`);
    assert.deepEqual(found.map((x) => x.rule), ['email-address'], f);
    assert.ok(!JSON.stringify(found).includes('person'), f);
    for (const ok of [mail('12345+name', 'users.noreply.github.com'), mail('noreply', 'anthropic.com'), mail('person', 'example.com')]) {
      assert.deepEqual(scanText(f, `contact ${ok}`), [], `${f} ${ok}`);
    }
  }
});

test('plant: the gate fails on a tracked actor name, absolute record_path and non-noreply address, with no account name given', () => {
  const plants = {
    'kitty-specs/m/meta.json': '{"accepted_by": "' + 'jane' + 'doe"}\n',
    'kitty-specs/m/status.events.jsonl': '{"record_path": "/srv/work/r.yaml"}\n',
    'kitty-specs/m/spec.md': `owner ${mail('person', 'corp.test')}\n`,
  };
  const expected = { 'kitty-specs/m/meta.json': 'cli-identity', 'kitty-specs/m/status.events.jsonl': 'cli-absolute-path', 'kitty-specs/m/spec.md': 'email-address' };
  const dir = repo(plants);
  try {
    const r = spawnSync('node', [SCRIPT, '--root', dir], { encoding: 'utf8', env: { ...process.env, HYGIENE_FORBIDDEN_NAMES: '' } });
    assert.notEqual(r.status, 0);
    for (const [file, rule] of Object.entries(expected)) assert.match(r.stdout, new RegExp(`\\[${rule}\\] ${file}:1`), file);
  } finally { rmSync(dir, { recursive: true, force: true }); }
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
