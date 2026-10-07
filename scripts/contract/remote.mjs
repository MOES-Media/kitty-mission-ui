// Network side of the contract tooling: fetch a commit of the public contract repository into a temporary
// directory with `git fetch --depth 1`. Used by contract:update and contract:verify-remote only; no gate runs this.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO, UPSTREAM_PATHS } from './common.mjs';

const git = (cwd, args, opts = {}) => execFileSync('git', args, { cwd, encoding: opts.buffer ? 'buffer' : 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });

// CONTRACT_REMOTE_URL lets the node tests point the network path at a temporary local repository; no real network there.
export const repoUrl = () => {
  const override = process.env.CONTRACT_REMOTE_URL;
  if (!override) return `https://github.com/${REPO}.git`;
  // An overridden remote can make a main pin look verified against a repository that is not upstream: say so, loudly.
  process.stderr.write('NOTICE: CONTRACT_REMOTE_URL is set; the remote is overridden and nothing here is verified against upstream.\n');
  return override;
};

const stripPrefix = (n) => n.slice('contracts/'.length);

/**
 * Pure of the working tree: every file below `paths` at `sha` of the git directory `repoPath`, read with
 * `git ls-tree -r` and `git cat-file blob` only. Returns full path -> Buffer. Fails closed (the messages never
 * contain `repoPath`) on an unknown sha or when one of `paths` is absent from that commit's tree.
 */
export function readTreeFromRepo(repoPath, sha, paths = UPSTREAM_PATHS) {
  const run = (args, buffer = false) => {
    try {
      return git(repoPath, args, { buffer });
    } catch {
      throw new Error(`git ${args[0]} failed for the given repository and sha`);
    }
  };
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error('the sha must be 40 lowercase hex characters');
  try {
    git(repoPath, ['cat-file', '-e', `${sha}^{commit}`]);
  } catch {
    throw new Error(`commit ${sha} does not exist in the given repository`);
  }
  const names = run(['ls-tree', '-r', '--name-only', sha, '--', ...paths]).split('\n').filter(Boolean);
  for (const p of paths) {
    if (!names.some((n) => n.startsWith(`${p}/`))) throw new Error(`commit ${sha} has no files below ${p}`);
  }
  return Object.fromEntries(names.map((n) => [n, run(['cat-file', 'blob', `${sha}:${n}`], true)]));
}

/** The same shape as fetchRef for a commit of a local git directory: nothing is fetched and nothing is written. */
export function readCommitFromRepo(repoPath, sha) {
  const files = readTreeFromRepo(repoPath, sha);
  return {
    commit: sha,
    committerDate: git(repoPath, ['show', '-s', '--format=%cI', sha]).trim(),
    /** Name of a local branch whose history contains `sha`, as a human label (never a path). */
    branchLabel() {
      const out = git(repoPath, ['name-rev', '--name-only', '--no-undefined', '--refs=refs/heads/*', sha]).trim();
      return out.replace(/[~^].*$/, '');
    },
    contractFiles: () => Object.fromEntries(Object.entries(files).map(([n, b]) => [stripPrefix(n), b])),
    cleanup: () => {},
  };
}

/**
 * Whether `sha` is an ancestor of `ref` in the git directory `dir`; fails closed: an unknown commit, an unknown ref
 * or any git error is "not an ancestor".
 */
export function isAncestor(dir, sha, ref) {
  try {
    git(dir, ['merge-base', '--is-ancestor', sha, ref]);
    return true;
  } catch {
    return false;
  }
}

/** Fetch the commit history of upstream `main` (no blobs) into a temporary repository and test the ancestry of `sha`. */
export function isOnUpstreamMain(sha, { url = repoUrl() } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'contract-main-'));
  try {
    git(dir, ['init', '-q']);
    git(dir, ['fetch', '-q', '--filter=blob:none', '--no-tags', url, 'main']);
    return isAncestor(dir, sha, 'FETCH_HEAD');
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Fetch `ref` (a sha or HEAD) at depth 1 into a fresh temporary repository; returns helpers and a cleanup function. */
export function fetchRef(ref, { url = repoUrl() } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'contract-remote-'));
  git(dir, ['init', '-q']);
  git(dir, ['fetch', '-q', '--depth', '1', url, ref]);
  const commit = git(dir, ['rev-parse', 'FETCH_HEAD']).trim();
  return {
    dir,
    commit,
    committerDate: git(dir, ['show', '-s', '--format=%cI', commit]).trim(),
    /** Every file below the vendored upstream paths: relative-to-`contracts/` path -> Buffer. */
    contractFiles() {
      const names = git(dir, ['ls-tree', '-r', '--name-only', commit, '--', ...UPSTREAM_PATHS]).split('\n').filter(Boolean);
      return Object.fromEntries(names.map((n) => [n.slice('contracts/'.length), git(dir, ['cat-file', 'blob', `${commit}:${n}`], { buffer: true })]));
    },
    treeIds: () => Object.fromEntries(UPSTREAM_PATHS.map((p) => [p, git(dir, ['rev-parse', `${commit}:${p}`]).trim()])),
    file: (path) => git(dir, ['show', `${commit}:${path}`]),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
