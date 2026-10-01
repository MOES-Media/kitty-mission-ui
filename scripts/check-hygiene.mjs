#!/usr/bin/env node
// Repository hygiene gate. Zero dependencies except `yaml`, loaded only when a workflow exists.
// Usage: check-hygiene.mjs [--root dir] [--list-allowed] [--storybook-static [dir]] [--scan-dir dir]
//        [--record path]... [--stories-index file]
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALLOW_LIST, checkBaselines, checkGateJobNames, checkGateScripts, checkLockfile, checkNpmrc, checkPackageJson, checkPlantFiles,
  checkPlaywrightTag, checkPng, checkTypecheckScripts, checkVitestFamily, checkWorkflow, checkWorkflowTriggers,
  scanText,
} from './hygiene/rules.mjs';

const SNAPSHOTS = 'apps/storybook/tests/visual/__snapshots__';
const DEFAULT_STATIC = 'apps/storybook/storybook-static';

function parseArgs(argv) {
  const opts = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), records: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[(i += 1)];
    const optional = () => (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[(i += 1)] : null);
    if (a === '--root') opts.root = resolve(next());
    else if (a === '--list-allowed') opts.listAllowed = true;
    else if (a === '--storybook-static') opts.staticDir = optional() ?? DEFAULT_STATIC;
    else if (a === '--scan-dir') opts.staticDir = next();
    else if (a === '--record') opts.records.push(next());
    else if (a === '--stories-index') opts.storiesIndex = next();
    else throw new Error(`unknown argument ${a}`);
  }
  return opts;
}

function listFiles(root) {
  const out = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
    cwd: root, encoding: 'utf8', maxBuffer: 1 << 28,
  });
  return out.split('\0').filter(Boolean);
}

function readText(path) {
  try {
    return readFileSync(path).toString('latin1');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function walkDir(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkDir(p));
    else out.push(p);
  }
  return out;
}

function scanFiles(paths, display, options = {}) {
  const findings = [];
  for (const p of paths) {
    const text = readText(p);
    if (text !== null) findings.push(...scanText(display(p), text, options));
  }
  return findings;
}

function readJson(path, findings) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    findings.push({ rule: 'unreadable', file: path, line: 0, message: 'cannot parse JSON' });
    return null;
  }
}

async function workflowFindings(root, files) {
  const findings = [];
  const wfFiles = files.filter((f) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(f));
  const ci = '.github/workflows/ci.yml';
  if (!wfFiles.includes(ci)) findings.push({ rule: 'workflow-missing', file: ci, line: 0, message: 'ci.yml missing' });
  if (wfFiles.length === 0) return findings;
  const { parse } = await import('yaml');
  for (const f of wfFiles) {
    const doc = parse(readFileSync(join(root, f), 'utf8'));
    findings.push(...checkWorkflowTriggers(f, doc));
    if (f === ci) {
      const plantRoot = join(root, 'gates/plants');
      const plantDirs = existsSync(plantRoot)
        ? readdirSync(plantRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
        : [];
      findings.push(...checkWorkflow(f, doc, plantDirs));
    } else {
      findings.push(...checkGateJobNames(f, doc));
    }
  }
  return findings;
}

function pngFindings(root, files, storiesIndex) {
  const findings = [];
  const pngs = files.filter((f) => f.startsWith(`${SNAPSHOTS}/`) && f.endsWith('.png'));
  for (const f of pngs) {
    try {
      findings.push(...checkPng(f, readFileSync(join(root, f))));
    } catch {
      findings.push({ rule: 'unreadable', file: f, line: 0, message: 'cannot read PNG' });
    }
  }
  if (storiesIndex) {
    const index = readJson(resolve(storiesIndex), findings);
    const ids = index ? Object.values(index.entries ?? {}).filter((e) => e.type === 'story').map((e) => e.id) : [];
    findings.push(...checkBaselines(pngs.map((f) => f.split('/').pop()), index ? ids : null));
  }
  return findings;
}

function configFindings(root, files) {
  const findings = [];
  const manifests = [];
  const wsDirs = ['packages', 'apps'];
  for (const f of files.filter((p) => p === 'package.json' || /(^|\/)package\.json$/.test(p))) {
    if (f.includes('node_modules/')) continue;
    const json = readJson(join(root, f), findings);
    if (!json) continue;
    const isWorkspace = wsDirs.some((d) => f.startsWith(`${d}/`)) && f.split('/').length === 3;
    manifests.push({ file: f, json, isWorkspace });
    findings.push(...checkPackageJson(f, json), ...checkGateScripts(f, json.scripts ?? {}));
  }
  findings.push(...checkVitestFamily(manifests), ...checkTypecheckScripts(manifests));
  const rootPkg = manifests.find((m) => m.file === 'package.json');
  const pw = rootPkg?.json.devDependencies?.['@playwright/test'];
  if (pw) {
    const sources = ['scripts/visual.sh', '.github/workflows/ci.yml']
      .filter((f) => existsSync(join(root, f))).map((f) => ({ file: f, text: readFileSync(join(root, f), 'utf8') }));
    findings.push(...checkPlaywrightTag(pw, sources));
  }
  const npmrc = readText(join(root, '.npmrc'));
  findings.push(...(npmrc === null
    ? [{ rule: 'npmrc-bytes', file: '.npmrc', line: 0, message: '.npmrc is missing' }]
    : checkNpmrc(npmrc)));
  findings.push(...checkLockfile(readText(join(root, 'pnpm-lock.yaml'))));
  for (const f of files.filter((p) => p.endsWith('.sh'))) {
    const text = readText(join(root, f));
    if (text !== null) findings.push(...checkGateScripts(f, { [f]: text }));
  }
  findings.push(...checkPlantFiles(files));
  return findings;
}

function print(findings) {
  for (const f of findings) {
    const where = f.line ? `${f.file}:${f.line}` : f.file;
    console.log(`FINDING [${f.rule}] ${where}: ${f.message}`);
  }
  console.log(`hygiene: ${findings.length} finding(s)`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.listAllowed) {
    for (const e of ALLOW_LIST) console.log(`${e.file ?? e.filePattern.source}  ${(e.linePattern ?? e.stripPattern).source}  (${e.reason})`);
    return 0;
  }
  const { root } = opts;
  const findings = [];
  const staticPaths = (dir) => (existsSync(dir) ? walkDir(dir) : []);
  if (opts.staticDir) {
    const dir = resolve(root, opts.staticDir);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) {
      findings.push({ rule: 'unreadable', file: opts.staticDir, line: 0, message: 'scan directory not found' });
    }
    const built = staticPaths(dir);
    // Storybook writes a project.json with a per-machine `userSince` fingerprint into every build; it must not ship.
    for (const p of built.filter((f) => f.split(/[\\/]/).pop() === 'project.json')) {
      findings.push({ rule: 'storybook-project-json', file: relative(root, p), line: 0, message: 'build metadata with a machine fingerprint (userSince) must not be published; delete it after the build' });
    }
    findings.push(...scanFiles(built, (p) => relative(root, p), { strictCi: true }));
  } else {
    const files = listFiles(root);
    findings.push(...scanFiles(files.map((f) => join(root, f)), (p) => relative(root, p)));
    findings.push(...scanFiles(staticPaths(join(root, DEFAULT_STATIC)), (p) => relative(root, p)));
    findings.push(...configFindings(root, files), ...pngFindings(root, files, opts.storiesIndex));
    findings.push(...await workflowFindings(root, files));
  }
  for (const rec of opts.records) {
    const text = readText(resolve(root, rec));
    if (text === null) findings.push({ rule: 'unreadable', file: rec, line: 0, message: 'record not found' });
    else findings.push(...scanText(rec, text, { strictCi: Boolean(opts.staticDir) }));
  }
  print(findings);
  return findings.length === 0 ? 0 : 1;
}

main().then((code) => { process.exitCode = code; }, (err) => {
  console.error(`hygiene: fail closed: ${err.message}`);
  process.exitCode = 2;
});
