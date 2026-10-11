import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { ALL_NEEDS_ENV, ALL_RUN, NON_GATE_JOBS, assemble, coverageProblems, invariantOk, restorePlant, sanitise } from './lib.mjs';

// Every path-, token- and credential-shaped string is assembled at run time from fragments.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HOME_DIR = '/' + 'home' + '/';
const AUTH = '_auth' + 'Token';
const GATES = ['preflight', 'typecheck', 'eslint', 'stylelint', 'storybook-build', 'unit-tests', 'visual', 'manifest', 'no-io', 'hygiene', 'contract', 'data-driven'];
const ctx = { cwd: '/w/cwd', home: HOME_DIR + 'someone', repoRoot: '/w/main', user: '' };

test('sanitiser replaces a home path, cwd and the repository root', () => {
  const out = sanitise(`${HOME_DIR}someone/.npmrc and /w/cwd/src/a.ts and /w/main/x`, ctx);
  assert.equal(out, '<home>/.npmrc and <repo>/src/a.ts and <repo>/x');
});

test('sanitiser handles CI roots (/__w, /github/workspace, /github/home)', () => {
  const ci = '/' + '__w';
  assert.equal(sanitise(`${ci}/repo/repo/a.ts`, { ...ctx, home: '' }), '<repo>/a.ts');
  assert.equal(sanitise(`at ${ci} end`, { ...ctx, home: '' }), 'at <repo> end');
  assert.equal(sanitise('/github/workspace/a /github/home/.npmrc', { ...ctx, home: '' }), '<repo>/a <home>/.npmrc');
});

test('sanitiser redacts a non-placeholder token assignment, in both separators', () => {
  const secret = 'Zx9' + 'Qw8Er7Ty6';
  for (const sep of ['=', ': ']) {
    const out = sanitise(`//npm.pkg.github.com/:${AUTH}${sep}${secret}`, ctx);
    assert.ok(!out.includes(secret));
    assert.ok(out.includes(`${AUTH}${sep}<redacted>`), out);
  }
});

test('sanitiser consumes QUOTED token values (JSON, = and single-quote forms)', () => {
  const secret = 'Zx9' + 'Qw8Er7Ty6';
  const forms = [`"${AUTH}": "${secret}"`, `${AUTH} = "${secret}"`, `${AUTH}='${secret}'`, `"${AUTH}":"${secret}",`];
  for (const f of forms) {
    const out = sanitise(f, ctx);
    assert.ok(!out.includes(secret), out);
    assert.ok(!/<redacted>["']/.test(out), out);
    assert.ok(out.includes('<redacted>'), out);
  }
});

test('a quoted token value in a fragment excerpt never reaches the record (fail closed or redacted)', async () => {
  const secret = 'Zx9' + 'Qw8Er7Ty6';
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    // Unsanitised fragment: assemble must refuse it.
    writeFragments(join(dir, 'raw'), (g) => (g === 'eslint' ? { excerpt: `"${AUTH}": "${secret}"` } : {}));
    const raw = await assemble({ root: ROOT, fragmentsDir: join(dir, 'raw'), outDir: join(dir, 'o1'), snapshotOf: 'head' });
    assert.equal(raw.ok, false);
    // Sanitised fragment: assemble accepts it and the secret is absent from the output.
    writeFragments(join(dir, 'ok'), (g) => (g === 'eslint' ? { excerpt: sanitise(`"${AUTH}": "${secret}"`, ctx) } : {}));
    const ok = await assemble({ root: ROOT, fragmentsDir: join(dir, 'ok'), outDir: join(dir, 'o2'), snapshotOf: 'head' });
    assert.equal(ok.ok, true, ok.problems.join('|'));
    assert.ok(!readFileSync(join(dir, 'o2', 'proof-record.json'), 'utf8').includes(secret));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sanitiser removes unknown absolute user paths and token bodies as a last resort', () => {
  const body = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8';
  const out = sanitise(`${HOME_DIR}other/x ${'ghp'}_${body}`, ctx);
  assert.ok(!out.includes(HOME_DIR) && !out.includes(body), out);
});

const fragmentFor = (gate, extra = {}) => ({
  gate, cleanExit: 0, plantedExit: 1, patternMatched: true, tokenAbsentFromCleanOutput: true, durationMs: 5,
  excerpt: 'ok', ...extra,
});

function writeFragments(dir, mutate) {
  mkdirSync(dir, { recursive: true });
  for (const g of GATES) writeFileSync(join(dir, `${g}.json`), JSON.stringify(fragmentFor(g, mutate?.(g) ?? {})));
}

test('assemble merges fragments into a schema-valid, hygiene-clean record', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    writeFragments(join(dir, 'frag'));
    const res = await assemble({ root: ROOT, fragmentsDir: join(dir, 'frag'), outDir: join(dir, 'out'), snapshotOf: 'head' });
    assert.deepEqual(res.problems, []);
    const rec = JSON.parse(readFileSync(join(dir, 'out', 'proof-record.json'), 'utf8'));
    assert.equal(rec.verdict, 'pass');
    assert.equal(rec.gates.length, 12);
    assert.match(readFileSync(join(dir, 'out', 'PROOF.md'), 'utf8'), /Verdict: \*\*pass\*\*/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Exception X-1 widened the proof-record schema's gate enum and GATES by `contract` and `data-driven`. The widening adds ids; it must not
// let a registered id pass without a real proof entry, so each way of having no real entry is asserted to fail.
test('a registered gate id without a real proof entry still fails: no fragment, a non-proof fragment, a phantom id', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    const assembleFrom = (name) =>
      assemble({ root: ROOT, fragmentsDir: join(dir, name), outDir: join(dir, `out-${name}`), snapshotOf: 'head' });
    // positive control: with a real entry for every registered id, assemble passes
    writeFragments(join(dir, 'real'));
    const real = await assembleFrom('real');
    assert.deepEqual(real.problems, []);
    for (const id of ['contract', 'data-driven']) {
      assert.equal(real.record.gates.some((g) => g.gate === id), true, id);
      // no entry for the newly registered id
      writeFragments(join(dir, `none-${id}`));
      rmSync(join(dir, `none-${id}`, `${id}.json`));
      const none = await assembleFrom(`none-${id}`);
      assert.equal(none.ok, false, id);
      assert.ok(none.problems.some((p) => p.includes('coverage') && p.includes(id)), none.problems.join('\n'));
      // an entry that proves nothing: the planted run exited 0 / the token never matched
      for (const bad of [{ plantedExit: 0 }, { patternMatched: false }, { cleanExit: 1 }]) {
        writeFragments(join(dir, `weak-${id}`), (g) => (g === id ? bad : {}));
        const weak = await assembleFrom(`weak-${id}`);
        assert.equal(weak.ok, false, `${id} ${JSON.stringify(bad)}`);
      }
    }
    // an id the schema enum does not list and no job or plant backs
    writeFragments(join(dir, 'phantom'));
    writeFileSync(join(dir, 'phantom', 'phantom-gate.json'), JSON.stringify(fragmentFor('phantom-gate')));
    const phantom = await assembleFrom('phantom');
    assert.equal(phantom.ok, false);
    assert.ok(phantom.problems.some((p) => p.includes('phantom-gate')), phantom.problems.join('\n'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('assemble fails closed on a home path planted in a fragment and writes nothing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    writeFragments(join(dir, 'frag'), (g) => (g === 'eslint' ? { excerpt: `see ${HOME_DIR}someone/x.ts` } : {}));
    const res = await assemble({ root: ROOT, fragmentsDir: join(dir, 'frag'), outDir: join(dir, 'out'), snapshotOf: 'head' });
    assert.equal(res.ok, false);
    const rec = spawnSync('test', ['-e', join(dir, 'out', 'proof-record.json')]);
    assert.notEqual(rec.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('assemble fails closed on a failing invariant and on a missing gate', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    writeFragments(join(dir, 'bad'), (g) => (g === 'hygiene' ? { tokenAbsentFromCleanOutput: false } : {}));
    const bad = await assemble({ root: ROOT, fragmentsDir: join(dir, 'bad'), outDir: join(dir, 'o1'), snapshotOf: 'head' });
    assert.equal(bad.ok, false);
    writeFragments(join(dir, 'few'));
    rmSync(join(dir, 'few', 'visual.json'));
    const few = await assemble({ root: ROOT, fragmentsDir: join(dir, 'few'), outDir: join(dir, 'o2'), snapshotOf: 'head' });
    assert.equal(few.ok, false);
    assert.ok(few.problems.some((p) => p.includes('coverage')));
    const none = await assemble({ root: ROOT, fragmentsDir: join(dir, 'absent'), outDir: join(dir, 'o3'), snapshotOf: 'head' });
    assert.equal(none.ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('invariantOk rejects each broken field', () => {
  assert.ok(invariantOk(fragmentFor('eslint')));
  for (const bad of [{ cleanExit: 1 }, { plantedExit: 0 }, { patternMatched: false }, { tokenAbsentFromCleanOutput: false },
    { localWorktreeCleanAfterRestore: false }]) assert.ok(!invariantOk(fragmentFor('eslint', bad)), JSON.stringify(bad));
});

// --- coverage -------------------------------------------------------------------------------------------------

const workflow = () => ({
  jobs: {
    ...Object.fromEntries(GATES.map((g) => [g, { name: `Gate: ${g}`, steps: [{ name: 'setup', run: 'true' }, { id: 'gate', run: `cmd ${g}` }] }])),
    'proof-leg': { name: 'Gate: proof', strategy: { matrix: { gate: [...GATES] } } },
    proof: { name: 'Gate: proof' },
    all: { name: 'Gate: all', needs: [...GATES, 'proof-leg', 'proof'], if: 'always()', steps: [{ name: 'Require', env: { NEEDS: ALL_NEEDS_ENV }, run: ALL_RUN }] },
  },
});
const ciCmds = () => Object.fromEntries(GATES.map((g) => [g, [`cmd ${g}`]]));
const cov = (doc, plants = GATES, fragmentIds = null, ciCommands = ciCmds()) =>
  coverageProblems({ doc, plantDirs: plants, fragmentIds, ciCommands });

test('coverage holds for matching job ids, matrix, plant dirs and fragments', () => {
  assert.deepEqual(cov(workflow(), GATES, [...GATES]), []);
  assert.deepEqual([...NON_GATE_JOBS].sort(), ['all', 'proof', 'proof-leg']);
});

test('coverage fails on a missing plant directory', () => {
  const p = cov(workflow(), GATES.filter((g) => g !== 'visual'));
  assert.ok(p.some((m) => m.includes('gates/plants dirs lacks: visual')), p.join('|'));
});

test('coverage fails on an extra matrix id and on a gate job without a matrix entry', () => {
  const extra = workflow();
  extra.jobs['proof-leg'].strategy.matrix.gate.push('ghost');
  assert.ok(cov(extra).some((m) => m.includes('matrix.gate has extra: ghost')));
  const dropped = workflow();
  dropped.jobs['proof-leg'].strategy.matrix.gate.pop();
  assert.ok(cov(dropped).some((m) => m.includes('matrix.gate lacks')));
});

test('coverage fails on a job-id mismatch and on a fragment mismatch', () => {
  const doc = workflow();
  doc.jobs.lint2 = { name: 'Gate: lint2' };
  assert.ok(cov(doc).length > 0);
  assert.ok(cov(workflow(), GATES, GATES.slice(1)).some((m) => m.includes('fragments lacks')));
});

test('coverage fails on duplicate ids', () => {
  const doc = workflow();
  doc.jobs['proof-leg'].strategy.matrix.gate = [...GATES, 'eslint'];
  assert.ok(cov(doc).some((m) => m.includes('not pairwise distinct')));
});

test('renaming display names does not change the coverage result', () => {
  const renamed = workflow();
  for (const job of Object.values(renamed.jobs)) job.name = `Renamed ${Math.random()}`;
  assert.deepEqual(cov(renamed), cov(workflow()));
  const broken = workflow();
  broken.jobs['proof-leg'].strategy.matrix.gate.pop();
  const brokenRenamed = JSON.parse(JSON.stringify(broken));
  for (const job of Object.values(brokenRenamed.jobs)) job.name = 'Gate: same';
  assert.deepEqual(cov(brokenRenamed), cov(broken));
});

test('coverage: all.needs must be exactly the gate jobs plus proof-leg and proof', () => {
  const dropped = workflow();
  dropped.jobs.all.needs = dropped.jobs.all.needs.filter((n) => n !== 'visual');
  assert.ok(cov(dropped).some((m) => m.includes("'all' needs lacks: visual")));
  const noProof = workflow();
  noProof.jobs.all.needs = noProof.jobs.all.needs.filter((n) => n !== 'proof' && n !== 'proof-leg');
  assert.ok(cov(noProof).some((m) => m.includes('needs lacks: proof-leg, proof')));
  const extra = workflow();
  extra.jobs.all.needs = [...extra.jobs.all.needs, 'ghost'];
  assert.ok(cov(extra).some((m) => m.includes("'all' needs has extra: ghost")));
  const str = workflow();
  str.jobs.all.needs = 'typecheck';
  assert.ok(cov(str).some((m) => m.includes("'all' needs lacks")));
});

test('coverage: a gate ciCommand must equal the run of the single gating step', () => {
  assert.deepEqual(cov(workflow()), []);
  const drift = workflow();
  drift.jobs.visual.steps[1].run = 'cmd visual --repeat-each=5';
  assert.ok(cov(drift).some((m) => m.includes("job 'visual' gating step runs") && m.includes('ciCommand')));
  const trimmed = workflow();
  trimmed.jobs.eslint.steps[1].run = 'cmd eslint\n';
  assert.deepEqual(cov(trimmed), []);
});

test('coverage: the gating step must exist exactly once and carry no if: or continue-on-error', () => {
  const none = workflow();
  delete none.jobs.hygiene.steps[1].id;
  assert.ok(cov(none).some((m) => m.includes("job 'hygiene' must have exactly one step with id 'gate' (found 0)")));
  const two = workflow();
  two.jobs.hygiene.steps.push({ id: 'gate', run: 'cmd hygiene' });
  assert.ok(cov(two).some((m) => m.includes('(found 2)')));
  const cond = workflow();
  cond.jobs.manifest.steps[1].if = "github.event_name == 'push'";
  assert.ok(cov(cond).some((m) => m.includes("job 'manifest' gating step must not have an 'if:'")));
  const soft = workflow();
  soft.jobs.manifest.steps[1]['continue-on-error'] = true;
  assert.ok(cov(soft).some((m) => m.includes('must not set continue-on-error')));
});

test('coverage: the gating step may only carry id, name, run and env', () => {
  for (const key of ['working-directory', 'shell', 'timeout-minutes', 'uses', 'with']) {
    const doc = workflow();
    doc.jobs.typecheck.steps[1][key] = 'x';
    assert.ok(cov(doc).some((m) => m.includes("job 'typecheck' gating step has disallowed keys") && m.includes(key)), key);
  }
  const ok = workflow();
  ok.jobs.typecheck.steps[1].name = 'typecheck';
  ok.jobs.typecheck.steps[1].env = { A: '1' };
  assert.deepEqual(cov(ok), []);
});

test("coverage: the 'all' aggregation step is pinned to the jq all-success check", () => {
  const mutate = (fn) => { const d = workflow(); fn(d.jobs.all); return cov(d); };
  assert.ok(mutate((a) => { a.steps[0].run = 'true'; }).some((m) => m.includes('exactly the jq all-success check')));
  assert.ok(mutate((a) => { a.steps[0].run = ALL_RUN.replace('"success"', '"skipped"'); }).some((m) => m.includes('exactly the jq')));
  assert.ok(mutate((a) => { a.steps[0].if = 'false'; }).some((m) => m.includes("step must not have an 'if:'")));
  assert.ok(mutate((a) => { a.steps[0]['continue-on-error'] = true; }).some((m) => m.includes('continue-on-error')));
  assert.ok(mutate((a) => { a.steps[0].shell = 'bash'; }).some((m) => m.includes('disallowed keys: shell')));
  assert.ok(mutate((a) => { a.steps[0].env = { NEEDS: '{}' }; }).some((m) => m.includes('NEEDS')));
  assert.ok(mutate((a) => { a.steps.push({ run: 'true' }); }).some((m) => m.includes('exactly one step')));
  assert.ok(mutate((a) => { delete a.if; }).some((m) => m.includes('if: always()')));
  assert.ok(mutate((a) => { a['continue-on-error'] = true; }).some((m) => m.includes("job 'all' must not set continue-on-error")));
});

test('coverage: continue-on-error is rejected by presence, at step and job level, literal or expression', () => {
  const step = workflow();
  step.jobs.manifest.steps[1]['continue-on-error'] = '${{ true }}';
  assert.ok(cov(step).some((m) => m.includes("job 'manifest' gating step must not set continue-on-error")));
  for (const id of [...GATES, 'proof-leg', 'proof', 'all']) {
    for (const v of [true, '${{ true }}', false]) {
      const doc = workflow();
      doc.jobs[id]['continue-on-error'] = v;
      assert.ok(cov(doc).some((m) => m.includes(`job '${id}' must not set continue-on-error`)), `${id} ${v}`);
    }
  }
});

test('coverage: plants must declare exactly one distinct ciCommand per gate', () => {
  const missing = ciCmds();
  missing.typecheck = [];
  assert.ok(cov(workflow(), GATES, null, missing).some((m) => m.includes('gates/plants/typecheck: plants must declare exactly one')));
  const split = ciCmds();
  split.typecheck = ['cmd typecheck', 'cmd other'];
  assert.ok(cov(workflow(), GATES, null, split).some((m) => m.includes('found 2')));
});

test('the real ci.yml, plant directories and plant ciCommands satisfy coverage', async () => {
  const { coverageCheck } = await import('./lib.mjs');
  assert.deepEqual(await coverageCheck(ROOT, null), []);
});

test('non-preflight plants cannot override the command the proof runs', async () => {
  const { loadPlants, commandOf } = await import('./lib.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    mkdirSync(join(dir, 'gates/plants/x'), { recursive: true });
    const file = join(dir, 'gates/plants/x/plant.json');
    writeFileSync(file, JSON.stringify({ gate: 'x', ciCommand: 'pnpm a', command: 'pnpm b', expectFailPattern: 't' }));
    assert.throws(() => loadPlants(dir, 'x'), /must not override command/);
    writeFileSync(file, JSON.stringify({ gate: 'x', command: 'pnpm b', expectFailPattern: 't' }));
    assert.throws(() => loadPlants(dir, 'x'), /needs ciCommand/);
    writeFileSync(file, JSON.stringify({ gate: 'x', ciCommand: 'pnpm a', expectFailPattern: 't' }));
    assert.equal(commandOf(loadPlants(dir, 'x')[0]), 'pnpm a');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the visual plant runs the exact command the visual gate job runs, after a build', () => {
  const doc = parse(readFileSync(join(ROOT, '.github/workflows/ci.yml'), 'utf8'));
  const step = doc.jobs.visual.steps.find((st) => st.id === 'gate');
  const plant = JSON.parse(readFileSync(join(ROOT, 'gates/plants/visual/plant.json'), 'utf8'));
  assert.equal(plant.command, undefined);
  assert.equal(plant.ciCommand, step.run.trim());
  assert.equal(plant.prepare, 'pnpm storybook:build-only');
});

test('leg-mode entry points import only Node built-ins at top level', () => {
  for (const f of ['scripts/gate-proof.mjs', 'scripts/gate-proof/lib.mjs']) {
    const tops = [...readFileSync(join(ROOT, f), 'utf8').matchAll(/^import [^\n]*from '([^']+)'/gm)].map((m) => m[1]);
    for (const spec of tops) assert.ok(spec.startsWith('node:') || spec.startsWith('./'), `${f} imports ${spec}`);
  }
});

// --- anchored plant edits ---------------------------------------------------------------------------------------

test('an anchored plant edit replaces only the anchor and survives unrelated edits to the file', async () => {
  const { applyPlant, applyEdit } = await import('./lib.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    const target = 'src/a.ts';
    mkdirSync(join(dir, 'src'), { recursive: true });
    const plant = { gate: 'x', overlays: [{ target, edits: [{ find: 'const v = 1;', replace: 'const v = 2;' }] }] };
    for (const body of ['const v = 1;\n', '// unrelated churn\nimport x from "y";\nconst v = 1;\nexport {};\n']) {
      writeFileSync(join(dir, target), body);
      const written = await applyPlant(dir, dir, plant);
      assert.deepEqual(written, [target]);
      assert.equal(readFileSync(join(dir, target), 'utf8'), body.replace('const v = 1;', 'const v = 2;'));
    }
    assert.equal(applyEdit('a b c', { find: 'b', replace: 'z' }, 't'), 'a z c');
    assert.throws(() => applyEdit('a b a', { find: 'a', replace: 'z' }, 't'), /ambiguous/);
    assert.throws(() => applyEdit('a b', { find: 'a', replace: 'a' }, 't'), /changes nothing/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a plant edit fails when its anchor is missing, and on malformed edits', async () => {
  const { applyPlant } = await import('./lib.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    writeFileSync(join(dir, 'a.ts'), 'const w = 1;\n');
    await assert.rejects(
      applyPlant(dir, dir, { gate: 'x', overlays: [{ target: 'a.ts', edits: [{ find: 'const v = 1;', replace: 'q' }] }] }),
      /plant anchor not found in a\.ts/);
    await assert.rejects(
      applyPlant(dir, dir, { gate: 'x', overlays: [{ target: 'a.ts', edits: [{ find: '', replace: 'q' }] }] }), /needs string find/);
    await assert.rejects(
      applyPlant(dir, dir, { gate: 'x', overlays: [{ target: 'missing.ts', edits: [{ find: 'a', replace: 'b' }] }] }),
      /plant target missing/);
    assert.equal(readFileSync(join(dir, 'a.ts'), 'utf8'), 'const w = 1;\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every committed edit-overlay anchor occurs exactly once in its target (all plant dirs)', () => {
  const dirs = readdirSync(join(ROOT, 'gates/plants'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  let checked = 0;
  for (const gate of dirs) {
    const plants = [JSON.parse(readFileSync(join(ROOT, 'gates/plants', gate, 'plant.json'), 'utf8'))].flat();
    for (const o of plants.flatMap((p) => p.overlays ?? []).filter((x) => x.edits)) {
      const text = readFileSync(join(ROOT, o.target), 'utf8');
      for (const e of o.edits) {
        assert.equal(text.split(e.find).length - 1, 1, `${gate}: anchor ${JSON.stringify(e.find)} in ${o.target}`);
        assert.notEqual(e.find, e.replace, gate);
        checked += 1;
      }
    }
  }
  assert.ok(checked >= 2, 'at least the unit-tests and visual edits are checked');
});

test('a failing clean run reports a sanitised output excerpt in the problems', async () => {
  const { runLeg } = await import('./lib.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    mkdirSync(join(dir, 'gates/plants/x'), { recursive: true });
    const cmd = `sh -c 'echo clean-boom at ${HOME_DIR}someone/f.ts; exit 3'`;
    writeFileSync(join(dir, 'gates/plants/x/plant.json'), JSON.stringify({ gate: 'x', ciCommand: cmd, expectFailPattern: 'never-appears' }));
    const { problems } = await runLeg({ cwd: dir, gate: 'x', ctx: { cwd: dir, home: HOME_DIR + 'someone', user: '' } });
    const msg = problems.find((p) => p.startsWith('clean run exited 3'));
    assert.ok(msg, problems.join('|'));
    assert.ok(msg.includes('clean-boom at <home>/f.ts'), msg);
    assert.ok(!msg.includes(HOME_DIR), msg);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A throwaway repository with one commit; git runs with the ambient GIT_* variables removed so it cannot touch another repository. */
function scratchRepo(files) {
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
  const git = (...args) => {
    const r = spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env, encoding: 'utf8' });
    assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  };
  git('init', '-q');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  git('add', '--', ...Object.keys(files));
  git('commit', '-q', '-m', 'base');
  return dir;
}

test('restorePlant puts a tracked file back from HEAD and removes an untracked one', () => {
  const dir = scratchRepo({ 'tracked.ts': 'original\n' });
  try {
    writeFileSync(join(dir, 'tracked.ts'), 'planted\n');
    writeFileSync(join(dir, 'created.ts'), 'planted\n');
    restorePlant(dir, ['tracked.ts', 'created.ts']);
    assert.equal(readFileSync(join(dir, 'tracked.ts'), 'utf8'), 'original\n');
    assert.equal(existsSync(join(dir, 'created.ts')), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('restorePlant treats the target literally: an untracked [a].ts is removed, the tracked a.ts it would glob-match is kept', () => {
  const dir = scratchRepo({ 'a.ts': 'original\n', '[b].ts': 'original\n' });
  try {
    writeFileSync(join(dir, '[a].ts'), 'planted\n');
    writeFileSync(join(dir, '[b].ts'), 'planted\n');
    restorePlant(dir, ['[a].ts', '[b].ts']);
    assert.equal(existsSync(join(dir, '[a].ts')), false, 'an untracked file whose name is a glob is removed');
    assert.equal(readFileSync(join(dir, 'a.ts'), 'utf8'), 'original\n');
    assert.equal(readFileSync(join(dir, '[b].ts'), 'utf8'), 'original\n', 'a tracked file with brackets in its name is restored');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('restorePlant throws and keeps the file when git cannot say whether it is tracked', () => {
  // Not a repository: `git ls-files` fails (exit 128), as it does in a container whose checkout belongs to another
  // user ("dubious ownership"). The old restore read that failure as "untracked" and deleted the tracked file.
  const dir = mkdtempSync(join(tmpdir(), 'gp-test-'));
  try {
    writeFileSync(join(dir, 'tracked.ts'), 'planted\n');
    assert.throws(() => restorePlant(dir, ['tracked.ts']), /cannot restore tracked\.ts/);
    assert.ok(existsSync(join(dir, 'tracked.ts')), 'the file must survive a git failure');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
