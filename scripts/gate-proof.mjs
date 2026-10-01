#!/usr/bin/env node
// Gate proof harness (FR-015, research R8).
//   gate-proof.mjs leg --gate <id> [--out <dir>]              clean run, plant, planted run, restore; writes <dir>/<id>.json
//   gate-proof.mjs coverage [--fragments <dir>]               job ids minus {proof, proof-leg, all} == matrix == plants == fragments
//   gate-proof.mjs assemble [--fragments <dir>] [--out <dir>] record + PROOF.md, schema-validated, hygiene-scanned, fail closed
//   gate-proof.mjs [local] [--only <id>] [--out <dir>] [--ref <rev>]
//                                                             every gate in a throwaway worktree of <rev> (default HEAD), then assemble
// Top level imports Node built-ins only: the preflight proof leg runs before any install.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assemble, cleanupWorktrees, coverageCheck, localGateRun, plantDirs, runLeg, sanitise,
} from './gate-proof/lib.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxFor = (cwd) => ({ cwd, repoRoot: ROOT });

function parse(argv) {
  const opts = { cmd: 'local' };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('--')) opts.cmd = rest.shift();
  while (rest.length) {
    const a = rest.shift();
    if (a === '--gate' || a === '--only') opts.gate = rest.shift();
    else if (a === '--out') opts.out = rest.shift();
    else if (a === '--ref') opts.ref = rest.shift();
    else if (a === '--fragments') opts.fragments = rest.shift();
    else if (a === '--snapshot-of') opts.snapshotOf = rest.shift();
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

function fail(lines) {
  for (const l of [lines].flat()) process.stderr.write(`gate-proof: ${l}\n`);
  return 1;
}

function writeFragment(out, fragment) {
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, `${fragment.gate}.json`), `${JSON.stringify(fragment, null, 2)}\n`);
}

async function leg(o) {
  if (!o.gate) return fail('leg needs --gate <id>');
  const { fragment, problems } = await runLeg({ cwd: process.cwd(), gate: o.gate, ctx: ctxFor(process.cwd()) });
  if (problems.length) return fail([`leg '${o.gate}' failed:`, ...problems.map((p) => `  ${p}`)]);
  writeFragment(resolve(o.out ?? 'proof-output/fragments'), fragment);
  process.stdout.write(`gate-proof: ${o.gate} proven (clean 0, planted ${fragment.plantedExit}, ${fragment.durationMs} ms)\n`);
  return 0;
}

async function coverage(o) {
  const problems = await coverageCheck(ROOT, o.fragments ? resolve(o.fragments) : null);
  if (problems.length) return fail(['coverage mismatch:', ...problems.map((p) => `  ${p}`)]);
  process.stdout.write('gate-proof: coverage ok\n');
  return 0;
}

async function assembleCmd(o, snapshotOf) {
  const res = await assemble({
    root: ROOT,
    fragmentsDir: resolve(o.fragments ?? 'proof-output/fragments'),
    outDir: resolve(o.out ?? 'proof-output'),
    snapshotOf: o.snapshotOf ?? snapshotOf,
    commit: o.commit,
  });
  if (!res.ok) return fail(['assemble failed closed:', ...res.problems.map((p) => `  ${p}`)]);
  process.stdout.write(`gate-proof: record written (${res.record.gates.length} gates, verdict ${res.record.verdict})\n`);
  return 0;
}

async function local(o) {
  const cov = await coverage({});
  if (cov !== 0) return cov;
  const gates = o.gate ? [o.gate] : plantDirs(ROOT);
  const frag = join(tmpdir(), `gp-fragments-${process.pid}`);
  let bad = false;
  for (const gate of gates) {
    process.stdout.write(`gate-proof: ${gate} ...\n`);
    try {
      const { fragment, problems } = await localGateRun({ root: ROOT, gate, ctx: ctxFor(ROOT), ref: o.ref });
      if (problems.length) {
        bad = true;
        fail([`${gate} FAILED:`, ...problems.map((p) => `  ${p}`)]);
      } else {
        writeFragment(frag, fragment);
        process.stdout.write(`gate-proof: ${gate} ok (planted exit ${fragment.plantedExit}, ${fragment.durationMs} ms)\n`);
      }
    } catch (err) {
      bad = true;
      fail(`${gate} ERROR: ${sanitise(err.message, ctxFor(ROOT))}`);
    }
  }
  try {
    if (bad) return 1;
    if (o.gate) return 0;
    const commit = execFileSync('git', ['rev-parse', `${o.ref ?? 'HEAD'}^{commit}`], { cwd: ROOT, encoding: 'utf8' }).trim();
    return await assembleCmd({ fragments: frag, out: o.out ?? join(ROOT, 'proof-output'), commit }, 'parent');
  } finally {
    rmSync(frag, { recursive: true, force: true });
  }
}

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    cleanupWorktrees();
    process.exit(130);
  });
}
process.on('exit', cleanupWorktrees);

try {
  const o = parse(process.argv.slice(2));
  const table = { leg, coverage, assemble: (x) => assembleCmd(x, 'head'), local };
  if (!table[o.cmd]) throw new Error(`unknown command ${o.cmd}`);
  process.exitCode = await table[o.cmd](o);
} catch (err) {
  process.exitCode = fail(sanitise(err.message, ctxFor(process.cwd())));
}
