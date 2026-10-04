// C-009 terminology rule: the word "feature" (whole word, case-insensitive) never appears in package sources, stories,
// fixtures or the mission quickstart. The canonical term is "mission".
// CLI: `node scripts/terminology.mjs` scans the repository and exits 1 on any finding.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const FORBIDDEN = /\bfeature\b/i;
export const QUICKSTART = 'kitty-specs/missions-and-pipeline-screens-01M40SKZ/quickstart.md';
const SOURCE_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.css', '.json', '.md']);

/** Lines of `text` that contain the forbidden word, as `{ line, text }` (1-based line numbers). */
export function findForbidden(text) {
  const found = [];
  text.split('\n').forEach((content, index) => {
    if (FORBIDDEN.test(content)) found.push({ line: index + 1, text: content.trim() });
  });
  return found;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

/** The files the rule covers under `root`: every source file of `packages/*\/src`, plus the quickstart. */
export function scannedFiles(root) {
  const files = [];
  const packages = join(root, 'packages');
  for (const name of readdirSync(packages)) {
    const src = join(packages, name, 'src');
    try {
      if (!statSync(src).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const file of walk(src)) {
      const dot = file.lastIndexOf('.');
      if (SOURCE_EXTENSIONS.has(file.slice(dot))) files.push(file);
    }
  }
  try {
    statSync(join(root, QUICKSTART));
    files.push(join(root, QUICKSTART));
  } catch {
    // A tree without the mission directory has no quickstart to scan.
  }
  return files;
}

/** Every finding under `root` as `{ file, line, text }` with `file` relative to `root`. */
export function scan(root) {
  const findings = [];
  for (const file of scannedFiles(root)) {
    for (const hit of findForbidden(readFileSync(file, 'utf8'))) {
      findings.push({ file: relative(root, file), ...hit });
    }
  }
  return findings;
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(here, '..');
  const findings = scan(root);
  for (const hit of findings) console.error(`terminology: ${hit.file}:${hit.line}: "feature" (use "mission"): ${hit.text}`);
  console.log(`terminology: ${scannedFiles(root).length} file(s) scanned, ${findings.length} finding(s)`);
  process.exit(findings.length === 0 ? 0 : 1);
}
