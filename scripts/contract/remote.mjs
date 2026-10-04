// Network side of the contract tooling: fetch a commit of the public contract repository into a temporary
// directory with `git fetch --depth 1`. Used by contract:update and contract:verify-remote only; no gate runs this.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO, UPSTREAM_PATHS } from './common.mjs';

const git = (cwd, args, opts = {}) => execFileSync('git', args, { cwd, encoding: opts.buffer ? 'buffer' : 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });

export const repoUrl = () => `https://github.com/${REPO}.git`;

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
