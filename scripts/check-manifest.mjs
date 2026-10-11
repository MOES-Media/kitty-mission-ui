// manifest gate (FR-011): regenerate the custom-elements manifest to a temp dir, require byte
// equality with the committed file, then assert the screen contract on the manifest and on the
// element source (every dispatchEvent is `new CustomEvent('<string literal>', ...)`).
// Known limitations (a source scan cannot be complete; recorded after the final fix round):
//  - Events dispatched by code outside packages/*/src, or from .d.ts files, are not seen.
//  - `class X extends Event` / `extends CustomEvent` subclasses and Event factories in other packages
//    are not followed (only `new Event` and `CustomEvent` references in packages/*/src are flagged).
//  - Events created by other constructors (MessageEvent, KeyboardEvent, ...) and dispatched directly are not
//    declared events; only Event/CustomEvent are policed.
//  - A @fires JSDoc tag with no matching dispatch is accepted (the analyzer declares it).
// The required `status` property applies to SCREENS only: a module under packages/*/src/screens/ (the analyzer globs cover it), or one whose source
// carries a `@screen` JSDoc line (scripts/manifest-screen.mjs). sk-mission-sample is marked `@screen`, so the sample
// template stays covered; reusable widgets under src/elements/ are not forced to carry a view state.
// Sees untracked files: sources are listed with `git ls-files --cached --others --exclude-standard`.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { isScreen } from './manifest-screen.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const pkg = 'packages/mission-ui';
const committedPath = join(root, pkg, 'custom-elements.json');
const failures = [];

function regenerate() {
  const dir = mkdtempSync(join(tmpdir(), 'cem-'));
  try {
    execFileSync(
      'pnpm',
      ['--filter', '@moes-media/mission-ui', 'exec', 'cem', 'analyze', '--config', 'custom-elements-manifest.config.mjs', '--outdir', relative(join(root, pkg), dir)],
      { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return readFileSync(join(dir, 'custom-elements.json'), 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function eventNames(manifestText) {
  const names = new Set();
  for (const mod of JSON.parse(manifestText).modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      for (const ev of decl.events ?? []) names.add(ev.name);
    }
  }
  return names;
}

function listedFiles() {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'packages'], {
    cwd: root,
    encoding: 'utf8',
  });
  return out.split('\n').filter((f) => /^packages\/[^/]+\/src\/.+/.test(f) && !f.endsWith('.d.ts'));
}

const SOURCE_EXT = /\.(ts|mts|cts|tsx|js|mjs|cjs|jsx)$/;
const isDispatchName = (n) => ts.isIdentifier(n) && n.text === 'dispatchEvent';
const isStringLit = (n) => n !== undefined && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n));

// Scans one source file. Every dispatchEvent reference (property, string element access, bare
// identifier, bind/call alias) must be the direct callee of X.dispatchEvent(new CustomEvent('<literal>', ...)).
// Returns the CustomEvent literal names found; non-literal CustomEvent names fail.
function scanSource(file) {
  const names = [];
  const sf = ts.createSourceFile(file, readFileSync(join(root, file), 'utf8'), ts.ScriptTarget.Latest, true);
  const where = (node) => `${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
  const unwrap = (n) => {
    let cur = n;
    while (cur && (ts.isParenthesizedExpression(cur) || ts.isAsExpression(cur) || ts.isNonNullExpression(cur) || ts.isSatisfiesExpression(cur) || ts.isTypeAssertionExpression(cur))) cur = cur.expression;
    return cur;
  };
  const allowedRefs = new Set(); // dispatchEvent names that are direct callees
  const allowedNews = new Set(); // CustomEvent constructions passed directly to such a call
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && isDispatchName(node.expression.name)) {
      const arg = node.arguments.length === 1 ? unwrap(node.arguments[0]) : undefined;
      const callee = arg !== undefined && ts.isNewExpression(arg) ? unwrap(arg.expression) : undefined;
      if (callee !== undefined && ts.isIdentifier(callee) && callee.text === 'CustomEvent' && isStringLit(arg.arguments?.[0])) {
        allowedRefs.add(node.expression.name);
        allowedNews.add(arg);
        names.push({ name: arg.arguments[0].text, at: where(arg) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  const visitRefs = (node) => {
    const stringAccess = ts.isElementAccessExpression(node) && isStringLit(node.argumentExpression) && node.argumentExpression.text === 'dispatchEvent';
    if ((isDispatchName(node) && !allowedRefs.has(node)) || stringAccess) {
      failures.push(`${where(node)}: dispatchEvent must only be called as X.dispatchEvent(new CustomEvent('<string literal>', ...))`);
    }
    if (ts.isNewExpression(node)) {
      const callee = unwrap(node.expression);
      if (ts.isIdentifier(callee) && callee.text === 'Event') failures.push(`${where(node)}: new Event is forbidden; use a directly dispatched new CustomEvent('<literal>')`);
      if (ts.isIdentifier(callee) && callee.text === 'CustomEvent' && !allowedNews.has(node)) {
        failures.push(`${where(node)}: new CustomEvent must be passed directly to X.dispatchEvent(...) with a string literal name`);
      }
    } else if (ts.isIdentifier(node) && node.text === 'CustomEvent' && !ts.isTypeReferenceNode(node.parent) && !ts.isExpressionWithTypeArguments(node.parent)) {
      const parentNew = ts.isNewExpression(node.parent) || ts.isParenthesizedExpression(node.parent) || ts.isAsExpression(node.parent) || ts.isNonNullExpression(node.parent);
      if (!parentNew) failures.push(`${where(node)}: CustomEvent may only be used as new CustomEvent('<literal>') passed directly to dispatchEvent`);
    }
    ts.forEachChild(node, visitRefs);
  };
  visitRefs(sf);
  return names;
}

const committed = readFileSync(committedPath, 'utf8');
const fresh = regenerate();

if (fresh !== committed) {
  const before = eventNames(committed);
  const after = eventNames(fresh);
  for (const n of after) if (!before.has(n)) failures.push(`manifest drift: event '${n}' is in source but not in the committed manifest`);
  for (const n of before) if (!after.has(n)) failures.push(`manifest drift: event '${n}' is in the committed manifest but not in source`);
  failures.push('manifest drift: committed custom-elements.json differs from regenerated output (run pnpm manifest:generate)');
}

const manifest = JSON.parse(fresh);
for (const mod of manifest.modules ?? []) {
  for (const decl of mod.declarations ?? []) {
    if (decl.customElement !== true) continue;
    const source = readFileSync(join(root, pkg, mod.path), 'utf8');
    if (isScreen(mod.path, source) && !(decl.members ?? []).some((m) => m.kind === 'field' && m.name === 'status')) {
      failures.push(`${decl.name}: screen-contract element must declare a 'status' property`);
    }
    for (const ev of decl.events ?? []) {
      if (!/^sk-/.test(ev.name)) failures.push(`${decl.name}: event '${ev.name}' must start with 'sk-'`);
    }
  }
}

const declared = eventNames(fresh);
for (const file of listedFiles()) {
  if (!SOURCE_EXT.test(file)) continue;
  if (!file.endsWith('.ts')) {
    failures.push(`${file}: element packages are TypeScript only (.ts); other source extensions are not analysed`);
    continue;
  }
  for (const { name, at } of scanSource(file)) {
    if (!declared.has(name)) failures.push(`${at}: event '${name}' is dispatched in source but not declared in the manifest`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  console.error(`manifest gate: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log('manifest gate: ok');
