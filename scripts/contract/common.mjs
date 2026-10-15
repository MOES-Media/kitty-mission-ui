// Shared helpers of the contract tooling: repository layout, file listing, hashing, the pin record.
// Plain Node (.mjs); nothing here reads the network.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Repository-relative locations, all posix. */
export const LAYOUT = {
  vendor: 'contracts/spec-kitty',
  pin: 'contracts/spec-kitty/PIN.json',
  openapi: 'contracts/spec-kitty/mission-status/openapi.yaml',
  changelog: 'contracts/spec-kitty/mission-status/CHANGELOG.md',
  schemas: 'contracts/spec-kitty/mission-status/schemas',
  examples: 'contracts/spec-kitty/mission-status/examples',
  typesDir: 'packages/mission-ui/src/contract',
  types: 'packages/mission-ui/src/contract/types.generated.ts',
  fixtures: 'packages/mission-ui/src/contract/fixtures.generated.ts',
  bulk: 'packages/mission-ui/src/contract/bulk.ts',
  checkScript: 'scripts/contract/check.mjs',
};

/** The two upstream directories vendored, relative to the contract repository root. */
export const UPSTREAM_PATHS = ['contracts/mission-status', 'contracts/_shared'];
export const REPO = 'spec-kitty/spec-kitty';

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

/** Every file below `dir`, as sorted posix paths relative to `dir`. */
export function listFiles(dir) {
  const out = [];
  const walk = (rel) => {
    for (const name of readdirSync(join(dir, rel))) {
      const next = rel ? `${rel}/${name}` : name;
      if (statSync(join(dir, next)).isDirectory()) walk(next);
      else out.push(next);
    }
  };
  walk('');
  return out.sort();
}

/** The vendored files (all of `contracts/spec-kitty` except PIN.json) with their hashes. */
export function vendoredHashes(root = ROOT) {
  const dir = join(root, LAYOUT.vendor);
  const files = {};
  for (const rel of listFiles(dir)) {
    if (rel === 'PIN.json') continue;
    files[rel] = sha256(readFileSync(join(dir, rel)));
  }
  return files;
}

/** Digest over the vendored bytes: the cache key of the dereferenced schemas. */
export function vendoredDigest(root = ROOT) {
  const files = vendoredHashes(root);
  return sha256(Object.entries(files).map(([k, v]) => `${k}\0${v}`).join('\n'));
}

export const readText = (root, rel) => readFileSync(join(root, rel), 'utf8');

export function readPin(root = ROOT) {
  return JSON.parse(readText(root, LAYOUT.pin));
}

/** `info.version` of the vendored openapi.yaml, read without a YAML parser (a two-space `version:` under `info:`). */
export function infoVersionOf(openapiText) {
  const info = /^info:\n((?: {2}.*\n|\n)+)/m.exec(openapiText);
  const v = info && /^ {2}version:\s*(\S+)\s*$/m.exec(info[1]);
  return v ? v[1].replace(/^['"]|['"]$/g, '') : null;
}

/** First `## x.y.z` heading of the vendored changelog. */
export function changelogTopVersionOf(changelogText) {
  const m = /^## (\d+\.\d+\.\d+\S*)\s*$/m.exec(changelogText);
  return m ? m[1] : null;
}

/** Build the pin record for the vendored files on disk. `retrievedAt` is informational. */
export function buildPin({ root = ROOT, sha, committerDate, retrievedAt, provenance = 'main', branch, reason }) {
  return {
    repo: REPO,
    sha,
    committerDate,
    retrievedAt,
    provenance,
    ...(provenance === 'branch' ? { branch, reason } : {}),
    paths: [...UPSTREAM_PATHS],
    infoVersion: infoVersionOf(readText(root, LAYOUT.openapi)),
    changelogTopVersion: changelogTopVersionOf(readText(root, LAYOUT.changelog)),
    files: vendoredHashes(root),
  };
}

export const stringifyPin = (pin) => `${JSON.stringify(pin, null, 2)}\n`;

/**
 * Pure, per file: the fetched upstream files (contracts/-relative path -> bytes) against PIN.json `files` (the same
 * keys -> sha256 hex). Each list is sorted: `added` upstream only, `removed` pinned only, `changed` a different hash.
 */
export function comparePinnedFiles(pinFiles, fetchedFiles) {
  const added = [];
  const changed = [];
  for (const [rel, bytes] of Object.entries(fetchedFiles)) {
    if (!Object.hasOwn(pinFiles, rel)) added.push(rel);
    else if (sha256(bytes) !== pinFiles[rel]) changed.push(rel);
  }
  const removed = Object.keys(pinFiles).filter((rel) => !Object.hasOwn(fetchedFiles, rel));
  return { added: added.sort(), removed: removed.sort(), changed: changed.sort() };
}
