// pnpm contract:update --sha <sha> (needs the network), or --from-repo <git dir> --sha <sha> (a local commit): read that
// commit's contract, replace the vendored copy, regenerate types and fixtures, rewrite PIN.json, run the contract gate
// checks and print the diff summary.
//
// --from-repo reads git objects only (`git ls-tree -r` and `git cat-file blob`, never a working tree) and the path is
// an argument only: it is not written to PIN.json, a generated header, a fixture or any output of this command.
// A network pin (`provenance: main`) requires the sha to be an ancestor of upstream `main`; a pin read from a local
// repository is `provenance: branch` with a branch label and a reason, which `check.mjs --require-main` refuses.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT, ROOT, buildPin, stringifyPin } from './common.mjs';
import { generateAll } from './generate.mjs';
import { runChecks } from './check.mjs';
import { fetchRef, isOnUpstreamMain, readCommitFromRepo } from './remote.mjs';

const utc = (iso) => new Date(iso).toISOString().replace('.000Z', 'Z');

const USAGE = 'usage: contract:update --sha <40-hex commit sha> | contract:update --from-repo <git directory> --sha <40-hex commit sha> [--branch <label>] [--reason <text>]';
export const DEFAULT_BRANCH_REASON = 'the pinned commit is not on main at vendoring time; re-pin before the pull request';

/** Pure: the update arguments. `--from-repo` requires `--sha`; `--sha` alone is the network path. */
export function parseUpdateArgs(argv) {
  const value = (flag) => {
    const i = argv.indexOf(flag);
    if (i < 0) return undefined;
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new Error(`${flag} needs a value; ${USAGE}`);
    return v;
  };
  const sha = value('--sha');
  const fromRepo = value('--from-repo');
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error(USAGE);
  return { sha, fromRepo, branch: value('--branch'), reason: value('--reason') };
}

/**
 * The update flow. `deps` lets the node tests inject the network fetch, the local read and the ancestry decision
 * (no real network in any test) and capture the output.
 */
export async function runUpdate({ argv, root = ROOT, deps = {}, write = (t) => process.stdout.write(t) }) {
  const opts = parseUpdateArgs(argv);
  const fetch = deps.fetchRef ?? fetchRef;
  const read = deps.readCommitFromRepo ?? readCommitFromRepo;
  const onMain = deps.isOnUpstreamMain ?? isOnUpstreamMain;
  let at;
  let pinOptions;
  if (opts.fromRepo) {
    at = read(opts.fromRepo, opts.sha);
    const branch = opts.branch ?? at.branchLabel?.();
    if (!branch) throw new Error('no branch label: pass --branch <label>');
    pinOptions = { provenance: 'branch', branch, reason: opts.reason ?? DEFAULT_BRANCH_REASON };
  } else {
    if (opts.branch || opts.reason) throw new Error('--branch and --reason belong to --from-repo');
    at = fetch(opts.sha);
    pinOptions = { provenance: 'main' };
  }
  try {
    if (at.commit !== opts.sha) throw new Error(`fetched ${at.commit}, expected ${opts.sha}`);
    if (pinOptions.provenance === 'main' && !onMain(opts.sha)) {
      throw new Error(`${opts.sha} is not an ancestor of upstream main; a main pin needs a commit that is on main`);
    }
    const vendor = join(root, LAYOUT.vendor);
    // files that disappeared upstream disappear here: the two vendored directories are replaced as a whole
    rmSync(join(vendor, 'mission-status'), { recursive: true, force: true });
    rmSync(join(vendor, '_shared'), { recursive: true, force: true });
    mkdirSync(vendor, { recursive: true });
    for (const [rel, bytes] of Object.entries(at.contractFiles())) {
      const dest = join(vendor, rel);
      mkdirSync(join(dest, '..'), { recursive: true });
      writeFileSync(dest, bytes);
    }
    writeFileSync(join(root, LAYOUT.pin), stringifyPin(buildPin({ root, sha: opts.sha, committerDate: utc(at.committerDate), retrievedAt: new Date().toISOString(), ...pinOptions })));
  } finally {
    at.cleanup();
  }
  await generateAll(root);
  const { problems } = await runChecks({ root });
  for (const p of problems) write(`contract: ${p.token}: ${p.message}\n`);
  write(execFileSync('git', ['status', '--short', '--', LAYOUT.vendor, LAYOUT.typesDir], { cwd: root, encoding: 'utf8' }));
  write(problems.length ? `contract:update: ${problems.length} problem(s) after the update\n` : 'contract:update: done; read the diff (vendored files, types, fixtures) before committing\n');
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await runUpdate({ argv: process.argv.slice(2) }).catch((err) => {
    process.stdout.write(`contract:update: fail closed: ${err.message}\n`);
    return 2;
  });
}
