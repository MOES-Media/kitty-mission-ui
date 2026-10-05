// pnpm contract:update --sha <sha> (needs the network): fetch that commit's contract, replace the vendored copy,
// regenerate types and fixtures, rewrite PIN.json, run the contract gate checks and print the diff summary.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAYOUT, ROOT, buildPin, stringifyPin } from './common.mjs';
import { generateAll } from './generate.mjs';
import { runChecks } from './check.mjs';
import { fetchRef } from './remote.mjs';

const utc = (iso) => new Date(iso).toISOString().replace('.000Z', 'Z');

async function main() {
  const i = process.argv.indexOf('--sha');
  const sha = i > 0 ? process.argv[i + 1] : undefined;
  if (!/^[0-9a-f]{40}$/.test(sha ?? '')) throw new Error('usage: contract:update --sha <40-hex commit sha>');
  const at = fetchRef(sha);
  try {
    if (at.commit !== sha) throw new Error(`fetched ${at.commit}, expected ${sha}`);
    const vendor = join(ROOT, LAYOUT.vendor);
    // files that disappeared upstream disappear here: the two vendored directories are replaced as a whole
    rmSync(join(vendor, 'mission-status'), { recursive: true, force: true });
    rmSync(join(vendor, '_shared'), { recursive: true, force: true });
    mkdirSync(vendor, { recursive: true });
    for (const [rel, bytes] of Object.entries(at.contractFiles())) {
      const dest = join(vendor, rel);
      mkdirSync(join(dest, '..'), { recursive: true });
      writeFileSync(dest, bytes);
    }
    writeFileSync(join(ROOT, LAYOUT.pin), stringifyPin(buildPin({ root: ROOT, sha, committerDate: utc(at.committerDate), retrievedAt: new Date().toISOString() })));
  } finally {
    at.cleanup();
  }
  await generateAll(ROOT);
  const { problems } = await runChecks({ root: ROOT });
  for (const p of problems) process.stdout.write(`contract: ${p.token}: ${p.message}\n`);
  process.stdout.write(execFileSync('git', ['status', '--short', '--', LAYOUT.vendor, LAYOUT.typesDir], { cwd: ROOT, encoding: 'utf8' }));
  process.stdout.write(problems.length ? `contract:update: ${problems.length} problem(s) after the update\n` : 'contract:update: done; read the diff (vendored files, types, fixtures) before committing\n');
  return problems.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main().catch((err) => {
    process.stdout.write(`contract:update: fail closed: ${err.message}\n`);
    return 2;
  });
}
