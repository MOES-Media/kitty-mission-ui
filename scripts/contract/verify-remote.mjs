// pnpm contract:verify-remote (needs the network, not a CI gate): the pinned sha exists remotely, the vendored bytes
// equal the upstream bytes, and the producer's lane weights still equal PRODUCER_LANE_WEIGHTS in check.mjs.
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { LAYOUT, ROOT, listFiles, readPin } from './common.mjs';
import { PRODUCER_LANE_WEIGHTS } from './check.mjs';
import { fetchRef } from './remote.mjs';

const NINE = Object.keys(PRODUCER_LANE_WEIGHTS);

/**
 * Pure: the nine lane weights of `DEFAULT_LANE_WEIGHTS` in the text of src/specify_cli/status/progress.py.
 * Throws when the dict or any of the nine lanes is missing. (`genesis` and `uninitialized` are not display lanes.)
 */
export function extractLaneWeights(pythonText) {
  const dict = /DEFAULT_LANE_WEIGHTS[^=\n]*=\s*\{([^}]*)\}/.exec(pythonText);
  if (!dict) throw new Error('DEFAULT_LANE_WEIGHTS not found in progress.py');
  const out = {};
  for (const lane of NINE) {
    const m = new RegExp(`["']${lane}["']\\s*:\\s*([0-9]*\\.?[0-9]+)`).exec(dict[1]);
    if (!m) throw new Error(`DEFAULT_LANE_WEIGHTS has no weight for the lane ${lane}`);
    out[lane] = Number(m[1]);
  }
  return out;
}

/** Pure: the lanes whose extracted weight differs from PRODUCER_LANE_WEIGHTS, as messages. */
export function compareLaneWeights(extracted) {
  return NINE.filter((lane) => extracted[lane] !== PRODUCER_LANE_WEIGHTS[lane])
    .map((lane) => `lane weight ${lane}: producer ${extracted[lane]}, PRODUCER_LANE_WEIGHTS ${PRODUCER_LANE_WEIGHTS[lane]}`);
}

async function main() {
  const pin = readPin(ROOT);
  const problems = [];
  const at = fetchRef(pin.sha);
  try {
    if (at.commit !== pin.sha) problems.push(`fetched ${at.commit}, expected ${pin.sha}`);
    const upstream = at.contractFiles();
    const vendorDir = join(ROOT, LAYOUT.vendor);
    const local = listFiles(vendorDir).filter((f) => f !== 'PIN.json');
    for (const f of local) {
      if (!Object.hasOwn(upstream, f)) problems.push(`vendored but not upstream: ${f}`);
      else if (!readFileSync(join(vendorDir, f)).equals(upstream[f])) problems.push(`bytes differ from upstream: ${f}`);
    }
    for (const f of Object.keys(upstream)) if (!local.includes(f)) problems.push(`upstream but not vendored: ${f}`);
    problems.push(...compareLaneWeights(extractLaneWeights(at.file('src/specify_cli/status/progress.py'))));
    process.stdout.write(`contract:verify-remote: pin ${pin.sha} exists; ${local.length} vendored files compared with ${Object.keys(upstream).length} upstream files; lane weights compared\n`);
    const head = fetchRef('HEAD');
    try {
      const was = at.treeIds();
      const now = head.treeIds();
      const changed = Object.keys(was).filter((p) => was[p] !== now[p]);
      process.stdout.write(`contract:verify-remote: upstream head ${head.commit}; contract paths ${changed.length ? `changed since the pin (${changed.join(', ')})` : 'unchanged since the pin'}\n`);
    } finally {
      head.cleanup();
    }
  } finally {
    at.cleanup();
  }
  for (const p of problems) process.stdout.write(`contract:verify-remote: ${p}\n`);
  process.stdout.write(problems.length ? `contract:verify-remote: ${problems.length} problem(s)\n` : 'contract:verify-remote: ok\n');
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main().catch((err) => {
    process.stdout.write(`contract:verify-remote: fail closed: ${err.message}\n`);
    return 2;
  });
}
