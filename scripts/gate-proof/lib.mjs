// Gate-proof harness logic (FR-015, research R8). Top level imports Node built-ins ONLY: the preflight proof leg runs
// before any install. `ajv` and `yaml` are imported lazily, in the modes that run after the frozen install.
import { spawn, spawnSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir, userInfo } from 'node:os';
import { dirname, join, resolve } from 'node:path';

/** Jobs in ci.yml that are not gates. Exactly this set (research R8, contracts/ci-gates.md). */
export const NON_GATE_JOBS = Object.freeze(['proof', 'proof-leg', 'all']);
export const EXCERPT_MAX = 2000;
const OFFLINE_INSTALL = 'pnpm install --offline --frozen-lockfile';
const SCHEMA_PATH = 'kitty-specs/storybook-scaffold-01M3SYDA/contracts/gate-proof-record.schema.json';

// ---------------------------------------------------------------------------------------------------------------
// Sanitiser
// ---------------------------------------------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Assembled from parts so this file itself never carries a token-shaped literal.
const AUTH_KEY = '_auth' + 'Token';
const AUTH_VALUE = new RegExp(`(${AUTH_KEY}["']?\\s*[=:]\\s*)(?!<redacted>)("[^"\\n]*"|'[^'\\n]*'|[^\\s"',}]*)`, 'g');
const TOKEN_SHAPES = [/gh[pousr]_[A-Za-z0-9]{36,}/g, /github_pat_[A-Za-z0-9_]{22,}/g, /npm_[A-Za-z0-9]{36,}/g];
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

/**
 * Replace environment-specific roots with placeholders and redact credentials.
 * Order (research R8): cwd, $HOME, /__w, /github/workspace, /github/home, repository root; then any `_authToken`
 * value; then a last-resort sweep so a record can never carry an absolute user path, a drive path or a token body.
 * @param {string} text
 * @param {{cwd?: string, home?: string, repoRoot?: string|string[], user?: string}} [ctx]
 */
export function sanitise(text, ctx = {}) {
  const cwd = ctx.cwd ?? process.cwd();
  const home = ctx.home ?? process.env.HOME ?? '';
  const repoRoots = [ctx.repoRoot ?? []].flat().filter(Boolean);
  const user = ctx.user ?? safeUser();
  const literal = (s, to) => (t) => (s && s.length > 1 && s !== '/' ? t.split(s).join(to) : t);
  let out = String(text).replace(ANSI, '');
  out = literal(cwd, '<repo>')(out);
  out = literal(home, '<home>')(out);
  out = out.replace(/\/__w\/[^/\s]+\/[^/\s]+/g, '<repo>').replace(/\/__w(?=[/\s]|$)/g, '<repo>');
  out = literal('/github/workspace', '<repo>')(out);
  out = literal('/github/home', '<home>')(out);
  for (const root of repoRoots) out = literal(root, '<repo>')(out);
  out = out.replace(AUTH_VALUE, '$1<redacted>');
  for (const re of TOKEN_SHAPES) out = out.replace(re, '<redacted>');
  out = out.replace(/\/(?:home|Users)\/[^/\s"']+/g, '<home>');
  out = out.replace(/\b[A-Za-z]:\\/g, '<drive>/');
  if (user && user.length >= 3 && user !== 'root') out = out.replace(new RegExp(`\\b${escapeRe(user)}\\b`, 'g'), '<user>');
  return out;
}

function safeUser() {
  try {
    return userInfo().username;
  } catch {
    return '';
  }
}

/** Sanitised window of output around the plant token, at most EXCERPT_MAX characters. */
export function excerptAround(output, token, ctx) {
  const lines = String(output).replace(ANSI, '').split('\n');
  const at = lines.findIndex((l) => l.includes(token));
  const from = Math.max(0, (at < 0 ? lines.length - 8 : at - 3));
  const slice = lines.slice(from, from + 10).join('\n');
  return sanitise(slice, ctx).slice(0, EXCERPT_MAX);
}

// ---------------------------------------------------------------------------------------------------------------
// Plants
// ---------------------------------------------------------------------------------------------------------------

export function plantDirs(root) {
  const base = join(root, 'gates/plants');
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

/** The command the proof actually runs for a plant: the gate's CI command, unless the plant is an explicit wrapper. */
export const commandOf = (plant) => plant.command ?? plant.ciCommand;

/**
 * plant.json holds one object or an array of them; always returned as an array. Every plant declares the gate's
 * `ciCommand` (coverage binds it to ci.yml). Only `preflight` may carry its own `command`: its real command needs a
 * network and a secret, so its plants are wrappers. Every other plant runs `ciCommand` itself, so the proof cannot
 * drift from what CI runs. An optional `prepare` command (for example a Storybook build) runs after the overlays.
 */
export function loadPlants(root, gate) {
  const file = join(root, 'gates/plants', gate, 'plant.json');
  if (!existsSync(file)) throw new Error(`no plant for gate '${gate}': ${file.slice(root.length + 1)} is missing`);
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const plants = Array.isArray(raw) ? raw : [raw];
  for (const p of plants) {
    if (p.gate !== gate) throw new Error(`plant.json for '${gate}' declares gate '${p.gate}'`);
    if (!p.ciCommand || !p.expectFailPattern) throw new Error(`plant for '${gate}' needs ciCommand and expectFailPattern`);
    if (p.command !== undefined && gate !== 'preflight') {
      throw new Error(`plant for '${gate}' must not override command: the proof runs ciCommand, exactly as CI does`);
    }
  }
  return plants;
}

const liveChildren = new Set();

/** Run the plant's optional `prepare` command, then its command; a failing prepare is the run's result. */
async function runPrepared(plant, cwd) {
  if (plant.prepare) {
    const prep = await run(plant.prepare, cwd);
    if (prep.status !== 0) return { ...prep, output: `prepare '${plant.prepare}' failed\n${prep.output}` };
    const main = await run(commandOf(plant), cwd);
    return { ...main, ms: prep.ms + main.ms };
  }
  return run(commandOf(plant), cwd);
}

/** Kill every command started by `run` (used by the SIGINT/SIGTERM cleanup path). */
export function killChildren() {
  for (const c of liveChildren) c.kill('SIGKILL');
}

function run(command, cwd, env) {
  const t0 = Date.now();
  return new Promise((resolveRun) => {
    const child = spawn('sh', ['-c', command], { cwd, env: env ?? process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    liveChildren.add(child);
    const chunks = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => chunks.push(d));
    child.on('close', (code, signal) => {
      liveChildren.delete(child);
      resolveRun({ status: code ?? (signal ? 128 : 1), output: Buffer.concat(chunks).toString('utf8'), ms: Date.now() - t0 });
    });
  });
}

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 26 });
  return { status: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

/**
 * The clean run. The preflight gate's real command needs the network and a real secret, which the proof leg does
 * not have, so its clean run is the offline credential detection against a temporary HOME holding a placeholder
 * npmrc line. Every other gate's clean command is its plant's command.
 */
async function cleanRun(gate, plant, cwd) {
  if (gate !== 'preflight') return runPrepared(plant, cwd);
  const t0 = Date.now();
  const home = mkdtempSync(join(tmpdir(), 'gp-home-'));
  try {
    writeFileSync(join(home, '.npmrc'), `//npm.pkg.github.com/:${AUTH_KEY}=placeholder-${process.pid}\n`);
    const code = 'process.exit(require(process.argv[1]).hasCredential() ? 0 : 1)';
    const r = spawnSync(process.execPath, ['-e', code, resolve(cwd, 'scripts/preflight-core.cjs')], {
      cwd, env: { PATH: process.env.PATH, HOME: home }, encoding: 'utf8',
    });
    return { status: r.status ?? 1, output: `${r.stdout ?? ''}${r.stderr ?? ''}`, ms: Date.now() - t0 };
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}

/**
 * Apply one anchored edit: the single occurrence of `find` becomes `replace`. Fails when the anchor is missing or
 * ambiguous (more than one occurrence) or when the edit changes nothing, so unrelated edits to the same file never
 * invalidate a plant (no whole-file pinning) but a plant can never silently plant nothing or the wrong place.
 */
export function applyEdit(text, edit, target) {
  if (typeof edit?.find !== 'string' || edit.find === '' || typeof edit.replace !== 'string') {
    throw new Error(`plant edit for ${target} needs string find (non-empty) and replace`);
  }
  if (edit.find === edit.replace) throw new Error(`plant edit for ${target} changes nothing (find equals replace)`);
  const at = text.indexOf(edit.find);
  if (at < 0) throw new Error(`plant anchor not found in ${target}: ${JSON.stringify(edit.find)}; update the plant's find`);
  if (text.indexOf(edit.find, at + 1) >= 0) {
    throw new Error(`plant anchor is ambiguous in ${target}: ${JSON.stringify(edit.find)} occurs more than once; lengthen the find`);
  }
  return text.slice(0, at) + edit.replace + text.slice(at + edit.find.length);
}

/** Apply overlays in `cwd`; returns the targets that were written so they can be restored. */
export async function applyPlant(cwd, plantRoot, plant) {
  const written = [];
  for (const o of plant.overlays ?? []) {
    if (Array.isArray(o.edits)) {
      const target = join(cwd, o.target);
      if (!existsSync(target)) throw new Error(`plant target missing: ${o.target}`);
      let text = readFileSync(target, 'utf8');
      for (const edit of o.edits) text = applyEdit(text, edit, o.target);
      writeFileSync(target, text);
      written.push(o.target);
    } else if (o.source) {
      const target = join(cwd, o.target);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(plantRoot, plant.gate, o.source), target);
      written.push(o.target);
    } else if (o.generator) {
      const r = await run(o.generator, cwd);
      if (r.status !== 0) throw new Error(`plant generator failed for ${plant.gate}: ${o.target}`);
      written.push(o.target);
    }
    // an overlay with neither edits, source nor generator is descriptive: the plant command is self-contained.
  }
  return written;
}

/**
 * Put every written target back: tracked files from HEAD, untracked ones removed. Git must answer; when it cannot
 * (for example "dubious ownership" in a container whose checkout belongs to another user) this throws rather than
 * guess, because guessing "untracked" would delete a tracked source file.
 */
export function restorePlant(cwd, targets) {
  for (const t of targets) {
    const listed = git(cwd, ['ls-files', '--', t]);
    if (listed.status !== 0) throw new Error(`cannot restore ${t}: git ls-files exited ${listed.status}: ${listed.err.trim()}`);
    if (listed.out.trim() === '') {
      rmSync(join(cwd, t), { force: true });
      continue;
    }
    const back = git(cwd, ['checkout', 'HEAD', '--', t]);
    if (back.status !== 0) throw new Error(`cannot restore ${t}: git checkout exited ${back.status}: ${back.err.trim()}`);
  }
}

/**
 * One proof leg for one gate in `cwd`: clean run, plant(s), planted run(s), restore. Returns a fragment.
 * Throws (after restoring) if any invariant fails, so a green leg means a fully proven gate.
 * @param {{cwd: string, gate: string, ctx?: object, local?: boolean}} o
 */
export async function runLeg({ cwd, gate, ctx = {}, local = false }) {
  const plantRoot = join(cwd, 'gates/plants');
  const plants = loadPlants(cwd, gate);
  const t0 = Date.now();
  const clean = await cleanRun(gate, plants[0], cwd);
  const problems = [];
  if (clean.status !== 0) {
    const tail = sanitise(String(clean.output).replace(ANSI, '').trimEnd().split('\n').slice(-25).join('\n'), ctx).slice(-EXCERPT_MAX);
    problems.push(`clean run exited ${clean.status}; last output (sanitised):\n${tail}`);
  }
  const tokenAbsent = plants.every((p) => !clean.output.includes(p.expectFailPattern));
  if (!tokenAbsent) problems.push('a plant token appears in the clean output');
  const planted = [];
  for (const plant of plants) {
    let written = [];
    try {
      written = await applyPlant(cwd, plantRoot, plant);
      const r = await runPrepared(plant, cwd);
      planted.push({ plant, r, matched: r.output.includes(plant.expectFailPattern) });
    } finally {
      restorePlant(cwd, written);
    }
  }
  for (const { plant, r, matched } of planted) {
    if (r.status === 0) problems.push(`planted run of '${plant.expectFailPattern}' exited 0`);
    if (!matched) problems.push(`token '${plant.expectFailPattern}' not found in planted output`);
  }
  let cleanAfter = true;
  if (local) {
    const st = git(cwd, ['status', '--porcelain']);
    cleanAfter = st.status === 0 && st.out.trim() === '';
    if (!cleanAfter) problems.push(`worktree not clean after restore: ${sanitise(st.out.trim().slice(0, 200), ctx)}`);
  }
  const fragment = {
    gate,
    cleanExit: clean.status,
    plantedExit: Math.min(...planted.map((p) => p.r.status)),
    patternMatched: planted.every((p) => p.matched),
    tokenAbsentFromCleanOutput: tokenAbsent,
    durationMs: Date.now() - t0,
    excerpt: planted.map((p) => excerptAround(p.r.output, p.plant.expectFailPattern, ctx)).join('\n---\n').slice(0, EXCERPT_MAX),
    ...(local ? { localWorktreeCleanAfterRestore: cleanAfter } : {}),
  };
  return { fragment, problems };
}

// ---------------------------------------------------------------------------------------------------------------
// Coverage
// ---------------------------------------------------------------------------------------------------------------

/** Step id that marks the one step of a gate job whose exit status IS the gate (coverage binds it to the plant). */
export const GATING_STEP_ID = 'gate';

/** Keys a gating step may carry: anything else (working-directory, shell, if, continue-on-error, uses, ...) can change what the exit status means. */
const GATING_STEP_KEYS = new Set(['id', 'name', 'run', 'env']);
const ALL_STEP_KEYS = new Set(['name', 'env', 'run']);
/** The one aggregation command of the `all` job: prints each need's result, fails unless every one is success. */
export const ALL_RUN = [
  `echo "$NEEDS" | jq -r 'to_entries[] | "\\(.key): \\(.value.result)"'`,
  `echo "$NEEDS" | jq -e 'all(.[]; .result == "success")' > /dev/null`,
].join('\n');
export const ALL_NEEDS_ENV = '${{ toJSON(needs) }}';

const asList = (v) => (Array.isArray(v) ? v.map(String) : v === undefined || v === null ? [] : [String(v)]);

/**
 * Pure coverage check. Gate ids come from JOB IDS (minus NON_GATE_JOBS) and the proof-leg `matrix.gate` list; display
 * names are never read. Also checked: `all.needs` is exactly the gate jobs plus proof-leg and proof, and every gate's
 * `ciCommand` (from its plants) equals the `run:` of the one step with `id: gate` in that gate job, which must carry
 * no `if:`. Returns the list of problems, empty when coverage holds.
 * @param {{doc: object, plantDirs: string[], fragmentIds?: string[]|null, ciCommands?: Record<string, string[]>|null}} o
 */
export function coverageProblems({ doc, plantDirs: plants, fragmentIds = null, ciCommands = null }) {
  const problems = [];
  const jobs = doc?.jobs ?? {};
  const jobIds = Object.keys(jobs).filter((id) => !NON_GATE_JOBS.includes(id));
  for (const ex of NON_GATE_JOBS) if (!(ex in jobs)) problems.push(`job '${ex}' is missing from the workflow`);
  const matrix = jobs['proof-leg']?.strategy?.matrix?.gate;
  if (!Array.isArray(matrix)) problems.push("job 'proof-leg' has no matrix.gate list");
  const matrixIds = Array.isArray(matrix) ? matrix.map(String) : [];
  const sets = [['gate job ids', jobIds], ['matrix.gate', matrixIds], ['gates/plants dirs', plants]];
  if (fragmentIds) sets.push(['fragments', fragmentIds]);
  for (const [name, ids] of sets) {
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dup.length) problems.push(`${name} are not pairwise distinct: ${[...new Set(dup)].join(', ')}`);
  }
  const base = new Set(jobIds);
  for (const [name, ids] of sets.slice(1)) {
    const s = new Set(ids);
    const missing = [...base].filter((x) => !s.has(x));
    const extra = [...s].filter((x) => !base.has(x));
    if (missing.length) problems.push(`${name} lacks: ${missing.join(', ')} (present as gate job ids)`);
    if (extra.length) problems.push(`${name} has extra: ${extra.join(', ')} (not gate job ids)`);
  }
  if ('all' in jobs) {
    const needs = asList(jobs.all?.needs);
    const want = new Set([...jobIds, 'proof-leg', 'proof']);
    const have = new Set(needs);
    if (needs.length !== have.size) problems.push(`job 'all' needs are not pairwise distinct: ${needs.join(', ')}`);
    const missing = [...want].filter((x) => !have.has(x));
    const extra = [...have].filter((x) => !want.has(x));
    if (missing.length) problems.push(`job 'all' needs lacks: ${missing.join(', ')} (every gate job, proof-leg and proof must be required)`);
    if (extra.length) problems.push(`job 'all' needs has extra: ${extra.join(', ')} (not a gate job, proof-leg or proof)`);
  }
  for (const [id, job] of Object.entries(jobs)) {
    if (job && typeof job === 'object' && 'continue-on-error' in job) {
      problems.push(`job '${id}' must not set continue-on-error (any value, including an expression)`);
    }
  }
  if ('all' in jobs) {
    const all = jobs.all;
    if (String(all.if ?? '').trim() !== 'always()') problems.push("job 'all' must have `if: always()` so a failed need cannot skip it into a pass");
    const steps = all.steps ?? [];
    if (steps.length !== 1) problems.push(`job 'all' must have exactly one step (found ${steps.length})`);
    else {
      const [st] = steps;
      if (String(st.run ?? '').trim() !== ALL_RUN) problems.push("job 'all' step must run exactly the jq all-success check on $NEEDS");
      if (st.env?.NEEDS !== ALL_NEEDS_ENV) problems.push("job 'all' step must set NEEDS to ${{ toJSON(needs) }}");
      if ('if' in st) problems.push("job 'all' step must not have an 'if:'");
      if ('continue-on-error' in st) problems.push("job 'all' step must not set continue-on-error");
      const extra = Object.keys(st).filter((k) => !ALL_STEP_KEYS.has(k) && k !== 'if' && k !== 'continue-on-error');
      if (extra.length) problems.push(`job 'all' step has disallowed keys: ${extra.join(', ')}`);
    }
  }
  if (ciCommands) {
    for (const id of jobIds) {
      const declared = [...new Set(ciCommands[id] ?? [])];
      if (declared.length !== 1) {
        problems.push(`gates/plants/${id}: plants must declare exactly one distinct ciCommand (found ${declared.length})`);
        continue;
      }
      const steps = (jobs[id]?.steps ?? []).filter((st) => st?.id === GATING_STEP_ID);
      if (steps.length !== 1) {
        problems.push(`job '${id}' must have exactly one step with id '${GATING_STEP_ID}' (found ${steps.length})`);
        continue;
      }
      const [step] = steps;
      if (String(step.run ?? '').trim() !== declared[0]) {
        problems.push(`job '${id}' gating step runs ${JSON.stringify(String(step.run ?? '').trim())} but the plant's ciCommand is ${JSON.stringify(declared[0])}`);
      }
      if ('if' in step) problems.push(`job '${id}' gating step must not have an 'if:' (a skipped gate would pass)`);
      const extraKeys = Object.keys(step).filter((k) => !GATING_STEP_KEYS.has(k) && k !== 'if' && k !== 'continue-on-error');
      if (extraKeys.length) problems.push(`job '${id}' gating step has disallowed keys: ${extraKeys.join(', ')} (allowed: id, name, run, env)`);
      if ('continue-on-error' in step) problems.push(`job '${id}' gating step must not set continue-on-error`);
    }
  }
  return problems;
}

export function fragmentIdsIn(dir) {
  if (!dir || !existsSync(dir)) return null;
  const ids = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  return ids.length ? ids.sort() : null;
}

export async function coverageCheck(root, fragmentsDir) {
  const { parse } = await import('yaml');
  const doc = parse(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'));
  const dirs = plantDirs(root);
  const ciCommands = {};
  for (const gate of dirs) {
    try {
      ciCommands[gate] = loadPlants(root, gate).map((p) => p.ciCommand);
    } catch (err) {
      return [`gates/plants/${gate}: ${err.message}`];
    }
  }
  return coverageProblems({ doc, plantDirs: dirs, fragmentIds: fragmentIdsIn(fragmentsDir), ciCommands });
}

// ---------------------------------------------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------------------------------------------

export function readFragments(dir) {
  if (!existsSync(dir)) throw new Error(`fragments directory not found: ${dir}`);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  if (files.length === 0) throw new Error(`no fragments in ${dir}`);
  return files.map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
}

export const invariantOk = (g) =>
  g.cleanExit === 0 && Number.isInteger(g.plantedExit) && g.plantedExit >= 1 && g.patternMatched === true &&
  g.tokenAbsentFromCleanOutput === true && g.localWorktreeCleanAfterRestore !== false;

export function renderProofMd(record) {
  const rows = record.gates.map((g) =>
    `| ${g.gate} | ${g.cleanExit} | ${g.plantedExit} | ${g.patternMatched} | ${g.tokenAbsentFromCleanOutput} | ${g.durationMs} |`);
  return [
    '# Gate proof record',
    '',
    `Verdict: **${record.verdict}**. Commit \`${record.commit}\` (${record.snapshotOf === 'parent'
      ? 'a snapshot of the parent commit, informational only; CI evidence is the green `Gate: proof` on the PR head'
      : 'the commit the proof ran against'}).`,
    '',
    `Rendering image: \`${record.image}\``,
    `Generated: ${record.generatedAt}`,
    '',
    '| Gate | Clean exit | Planted exit | Token in planted output | Token absent from clean output | Duration (ms) |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

/** Build the record object from fragments. `verdict` is 'pass' only when every invariant holds. */
export function buildRecord({ fragments, commit, snapshotOf, image, now = new Date() }) {
  const gates = [...fragments].sort((a, b) => a.gate.localeCompare(b.gate));
  const verdict = gates.every(invariantOk) ? 'pass' : 'fail';
  return { schemaVersion: 2, commit, snapshotOf, image, generatedAt: now.toISOString(), verdict, gates };
}

export async function validateRecord(root, record) {
  const { default: Ajv2020 } = await import('ajv/dist/2020.js');
  const ajv = new Ajv2020({ allErrors: true });
  ajv.addFormat('date-time', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/);
  const validate = ajv.compile(JSON.parse(readFileSync(join(root, SCHEMA_PATH), 'utf8')));
  return validate(record) ? [] : validate.errors.map((e) => `${e.instancePath || '/'} ${e.message}`);
}

/** Fail-closed hygiene re-scan of candidate files via the repository's own scanner. */
export function hygieneScan(root, files) {
  const stage = files.map((f) => resolve(f));
  const args = ['scripts/check-hygiene.mjs', '--scan-dir', dirname(stage[0]), ...stage.flatMap((f) => ['--record', f])];
  const r = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  return { ok: r.status === 0, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function visualImage(root) {
  const m = /^IMAGE='([^']+)'/m.exec(readFileSync(join(root, 'scripts/visual.sh'), 'utf8'));
  if (!m) throw new Error('cannot read the pinned image from scripts/visual.sh');
  return m[1];
}

/**
 * Merge fragments into proof-record.json and PROOF.md. Nothing lands in `outDir` unless coverage, the schema and
 * the hygiene re-scan all pass (fail closed). Returns {ok, problems}.
 */
export async function assemble({ root, fragmentsDir, outDir, snapshotOf, commit }) {
  const problems = [];
  let fragments;
  try {
    fragments = readFragments(fragmentsDir);
  } catch (err) {
    return { ok: false, problems: [err.message] };
  }
  problems.push(...(await coverageCheck(root, fragmentsDir)).map((p) => `coverage: ${p}`));
  const sha = commit ?? git(root, ['rev-parse', 'HEAD']).out.trim();
  const record = buildRecord({ fragments, commit: sha, snapshotOf, image: visualImage(root) });
  if (record.verdict !== 'pass') problems.push('verdict is fail: an invariant does not hold for at least one gate');
  problems.push(...(await validateRecord(root, record)).map((p) => `schema: ${p}`));
  if (problems.length) return { ok: false, problems };
  const stage = mkdtempSync(join(tmpdir(), 'gp-stage-'));
  try {
    const rec = join(stage, 'proof-record.json');
    const md = join(stage, 'PROOF.md');
    writeFileSync(rec, `${JSON.stringify(record, null, 2)}\n`);
    writeFileSync(md, renderProofMd(record));
    // The record is JSON, so quotes inside an excerpt are escaped and a quoted-value pattern would not match.
    // Scan the decoded excerpts as plain text too.
    const decoded = join(stage, 'excerpts.txt');
    writeFileSync(decoded, record.gates.map((g) => g.excerpt).join('\n'));
    const scan = hygieneScan(root, [rec, md, decoded]);
    if (!scan.ok) return { ok: false, problems: [`hygiene re-scan failed closed:\n${sanitise(scan.output, { repoRoot: root })}`] };
    mkdirSync(outDir, { recursive: true });
    for (const [from, name] of [[rec, 'proof-record.json'], [md, 'PROOF.md']]) {
      copyFileSync(from, join(outDir, name));
    }
    return { ok: true, problems: [], record };
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Local mode
// ---------------------------------------------------------------------------------------------------------------

const activeWorktrees = new Map();

/** Synchronously remove every throwaway worktree still registered (signal and exit path). */
export function cleanupWorktrees() {
  killChildren();
  for (const [base, { root, wt }] of activeWorktrees) {
    git(root, ['worktree', 'remove', '--force', wt]);
    git(root, ['worktree', 'prune']);
    rmSync(base, { recursive: true, force: true });
  }
  activeWorktrees.clear();
}

export async function localGateRun({ root, gate, ctx, ref = 'HEAD' }) {
  // Inside the repository (proof-output/ is gitignored), not the system temp dir: pnpm keeps a separate, cold
  // store per filesystem, so a worktree on another device would fail the offline install.
  const parent = join(root, 'proof-output', 'worktrees');
  mkdirSync(parent, { recursive: true });
  const base = mkdtempSync(join(parent, 'gp-wt-'));
  const wt = join(base, 'wt');
  let added = false;
  activeWorktrees.set(base, { root, wt });
  try {
    const add = git(root, ['worktree', 'add', '--detach', wt, ref]);
    if (add.status !== 0) throw new Error(`git worktree add failed: ${sanitise(add.err, ctx)}`);
    added = true;
    if (gate !== 'preflight') {
      const r = await run(OFFLINE_INSTALL, wt);
      if (r.status !== 0) {
        throw new Error('offline frozen install failed in the throwaway worktree. The pnpm store must be warm: ' +
          'run one online `pnpm install --frozen-lockfile` in the main checkout first (needs ~/.npmrc). ' +
          sanitise(r.output.slice(-600), { ...ctx, cwd: wt }));
      }
    }
    return await runLeg({ cwd: wt, gate, ctx: { ...ctx, cwd: wt }, local: true });
  } finally {
    if (added) git(root, ['worktree', 'remove', '--force', wt]);
    git(root, ['worktree', 'prune']);
    rmSync(base, { recursive: true, force: true });
    activeWorktrees.delete(base);
  }
}
