// pnpm contract:drift (the scheduled drift alert, FR-012; needs the network, not a CI gate): fetch upstream `main`
// (HEAD) with the existing remote path, keep the files below UPSTREAM_PATHS and compare them, file by file, with the
// sha256 hashes of PIN.json. Exit 0 in sync, 1 drift, 2 upstream unreachable (a failed git fetch), 3 any other error.
// The Markdown summary goes to stdout and, when GITHUB_STEP_SUMMARY is set, to that file (never through a shell).
// Imports: Node built-ins, common.mjs and remote.mjs only (F-41).
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO, ROOT, comparePinnedFiles, readText, LAYOUT } from './common.mjs';
import { fetchRef } from './remote.mjs';

const HEADING = '## Contract drift';

class PinError extends Error {}

/** Exit code of a thrown error: 2 only when a `git fetch` command failed (network or remote), 3 for anything else. */
export function exitCodeFor(err) {
  const fetchFailed = typeof err?.status === 'number' && /^Command failed: git (?:\S+ )*?fetch\b/.test(String(err?.message));
  return fetchFailed ? 2 : 3;
}

function readPinFiles(root) {
  let pin;
  try {
    pin = JSON.parse(readText(root, LAYOUT.pin));
  } catch (err) {
    if (err instanceof SyntaxError) throw new PinError('PIN.json is not valid JSON.');
    throw new PinError('PIN.json cannot be read.');
  }
  const files = pin?.files;
  const valid = files && typeof files === 'object' && !Array.isArray(files) && Object.keys(files).length > 0 &&
    Object.values(files).every((v) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v));
  if (!valid) throw new PinError('PIN.json has no files map of sha256 hashes.');
  return { sha: typeof pin.sha === 'string' ? pin.sha : 'unknown', files };
}

const files = (n) => `${n} file${n === 1 ? '' : 's'}`;
const list = (title, paths) => [`### ${title} (${paths.length})`, '', ...(paths.length ? [...paths.map((p) => `- \`${p}\``), ''] : [])];

/** Pure: the Markdown summary of a comparison. */
export function summarise({ head, pinSha, result, total }) {
  const lines = [HEADING, '', `Upstream \`${REPO}\` HEAD \`${head}\` compared with the pinned \`${pinSha}\`.`, ''];
  const count = result.added.length + result.removed.length + result.changed.length;
  if (count === 0) return [...lines, `In sync: ${files(total)} match PIN.json.`, ''].join('\n');
  return [
    ...lines,
    `Drift: ${files(count)} differ from PIN.json. Review with \`pnpm contract:update\` and re-pin.`, '',
    ...list('Added', result.added), ...list('Removed', result.removed), ...list('Changed', result.changed),
  ].join('\n');
}

/** Run the comparison; returns { code, text }. Nothing here prints. */
export function drift(root = ROOT) {
  let pin;
  try {
    pin = readPinFiles(root);
  } catch (err) {
    return { code: 3, text: [HEADING, '', `Error: ${err.message}`, ''].join('\n') };
  }
  let head;
  try {
    head = fetchRef('HEAD');
  } catch (err) {
    const code = exitCodeFor(err);
    const line = code === 2
      ? `Upstream unreachable: the git fetch of \`${REPO}\` failed, so nothing was compared.`
      : `Error: ${err.message.split('\n')[0]}`;
    return { code, text: [HEADING, '', line, ''].join('\n') };
  }
  try {
    const fetched = head.contractFiles();
    const result = comparePinnedFiles(pin.files, fetched);
    const drifted = result.added.length + result.removed.length + result.changed.length > 0;
    return { code: drifted ? 1 : 0, text: summarise({ head: head.commit, pinSha: pin.sha, result, total: Object.keys(fetched).length }) };
  } catch (err) {
    return { code: 3, text: [HEADING, '', `Error: ${err.message.split('\n')[0]}`, ''].join('\n') };
  } finally {
    head.cleanup();
  }
}

function main() {
  const { code, text } = drift();
  process.stdout.write(text);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    try {
      appendFileSync(summary, text);
    } catch {
      process.stderr.write('contract drift: cannot write the step summary\n');
      return 3;
    }
  }
  return code;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
