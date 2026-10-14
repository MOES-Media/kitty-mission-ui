// Svelte element typings from the custom-elements manifest (IC-04, FR-004; our own generator, no third-party one: F-30).
// Reads packages/mission-ui/custom-elements.json and writes packages/mission-shell/src/generated/elements.d.ts, which
// augments `svelte/elements` (SvelteHTMLElements; HTMLElementTagNameMap alone does not type Svelte markup, F-17) with each
// element's public properties and one `on<event>` handler per declared event. Every named type, of a property or of an
// event detail, is imported by name from @moes-media/mission-ui; one that the package index does not export fails the run.
//
// Event typing (T021, F-02): svelte-check reports both a wrong handler type on `onsk-open-mission` and the unknown
// hyphenated attribute `onsk-open-misson` against this typing, so the attribute path is enough and no `intents` Svelte
// action (binding helper) is generated. The generated directory therefore holds exactly one file, and `--check` also
// reports any other file found there.
//
// Usage: node scripts/typings.mjs [--check] [--root <dir>]
//   (no flag)  write every generated file
//   --check    regenerate in memory; exit 1 with `<file> is stale` for each file that differs from disk
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const MANIFEST = 'packages/mission-ui/custom-elements.json';
export const INDEX = 'packages/mission-ui/src/index.ts';
export const GENERATED_DIR = 'packages/mission-shell/src/generated';
export const ELEMENTS_FILE = `${GENERATED_DIR}/elements.d.ts`;
const PACKAGE = '@moes-media/mission-ui';
// The ambient `*.css?inline` module of mission-ui, relative to the generated file: importing the package's types pulls its
// sources into the shell program, and they import stylesheets with Vite's `?inline` suffix.
const CSS_INLINE_REFERENCE = '../../../mission-ui/src/css-inline.d.ts';

// Words a manifest type may use without an import: TypeScript's own types, keywords and utility types.
const BUILT_IN = new Set([
  'string',
  'number',
  'boolean',
  'bigint',
  'symbol',
  'object',
  'unknown',
  'never',
  'void',
  'null',
  'undefined',
  'true',
  'false',
  'readonly',
  'Array',
  'ReadonlyArray',
  'Readonly',
  'Record',
  'Partial',
  'Required',
]);

/** Every name the package index exports, as a value or as a type. */
export function exportedNames(indexText) {
  const names = new Set();
  const source = ts.createSourceFile('index.ts', indexText, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  for (const node of source.statements) {
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const el of node.exportClause.elements) names.add(el.name.text);
      continue;
    }
    const exported = ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) continue;
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
    } else if (node.name && ts.isIdentifier(node.name)) {
      names.add(node.name.text);
    }
  }
  return names;
}

/** The identifiers of a type text, string literals left out. */
export function typeNames(text) {
  const bare = text.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, "''");
  return [...bare.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]);
}

/** The public elements of a manifest: tag, properties and events, each sorted. */
function readElements(manifest) {
  const elements = [];
  for (const mod of manifest.modules ?? []) {
    for (const decl of mod.declarations ?? []) {
      if (!decl.tagName) continue;
      const props = (decl.members ?? [])
        .filter((m) => m.kind === 'field' && !m.static && (m.privacy ?? 'public') === 'public')
        .map((m) => {
          if (typeof m.type?.text !== 'string') throw new Error(`typings: ${decl.tagName}.${m.name} has no type in ${MANIFEST}`);
          return { name: m.name, type: m.type.text };
        });
      const events = (decl.events ?? []).map((e) => {
        const match = /^CustomEvent<(.+)>$/.exec(e.type?.text ?? '');
        if (!match) throw new Error(`typings: ${decl.tagName}.${e.name} is not typed CustomEvent<Detail> in ${MANIFEST}`);
        return { name: e.name, detail: match[1] };
      });
      const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      elements.push({ tag: decl.tagName, props: props.sort(byName), events: events.sort(byName) });
    }
  }
  return elements.sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
}

/** The named types a list of elements uses; throws, naming it, on one the package does not export. */
function importsOf(elements, exported) {
  const used = new Set();
  const take = (owner, text) => {
    for (const name of typeNames(text)) {
      if (BUILT_IN.has(name)) continue;
      if (name === 'any') throw new Error(`typings: ${owner} names 'any'; the typings emit no any`);
      if (!exported.has(name)) {
        throw new Error(`typings: ${owner} names '${name}', which ${PACKAGE} does not export (${INDEX}); request the export, do not edit mission-ui`);
      }
      used.add(name);
    }
  };
  for (const el of elements) {
    for (const p of el.props) take(`${el.tag}.${p.name}`, p.type);
    for (const e of el.events) take(`${el.tag}.${e.name}`, e.detail);
  }
  return [...used].sort();
}

const key = (name) => (/^[A-Za-z_$][\w$]*$/.test(name) ? name : `'${name}'`);

function renderElement(el) {
  const base = el.props.length
    ? `Omit<HTMLAttributes<HTMLElement>, ${el.props.map((p) => `'${p.name}'`).join(' | ')}>`
    : 'HTMLAttributes<HTMLElement>';
  return [
    `    '${el.tag}': ${base} & {`,
    ...el.props.map((p) => `      ${key(p.name)}?: ${p.type};`),
    ...el.events.map((e) => `      'on${e.name}'?: (event: CustomEvent<${e.detail}>) => void;`),
    '    };',
  ];
}

/** Every generated file, as a map of repository-relative path to text. */
export function generate(manifest, indexText) {
  const elements = readElements(manifest);
  const imports = importsOf(elements, exportedNames(indexText));
  const lines = [
    `// GENERATED by scripts/typings.mjs from ${MANIFEST} — do not edit.`,
    '// The Svelte typings of the mission-ui elements: each public property, and one `on<event>` handler per declared event,',
    '// so a renamed property or event fails svelte-check (FR-004). Regenerate with `node scripts/typings.mjs`.',
    '// The reference brings in the `*.css?inline` declaration of mission-ui, whose sources the imports below pull in.',
    `/// <reference path="${CSS_INLINE_REFERENCE}" />`,
  ];
  if (imports.length) lines.push('import type {', ...imports.map((n) => `  ${n},`), `} from '${PACKAGE}';`);
  lines.push('', "declare module 'svelte/elements' {", '  export interface SvelteHTMLElements {');
  for (const el of elements) lines.push(...renderElement(el));
  lines.push('  }', '}', '', 'export {};', '');
  return new Map([[ELEMENTS_FILE, lines.join('\n')]]);
}

function generateFrom(root) {
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  return generate(manifest, readFileSync(join(root, INDEX), 'utf8'));
}

/** Write every generated file under `root`. */
export function writeGenerated(root) {
  for (const [path, text] of generateFrom(root)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
}

/** The problems of the generated files under `root`: each stale or missing file, and each file the generator does not write. */
export function checkGenerated(root) {
  const files = generateFrom(root);
  const problems = [];
  for (const [path, text] of files) {
    const onDisk = existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null;
    if (onDisk !== text) problems.push(`${path} is stale`);
  }
  const dir = join(root, GENERATED_DIR);
  if (existsSync(dir)) {
    for (const name of readdirSync(dir).sort()) {
      const path = posix.join(GENERATED_DIR, name);
      if (!files.has(path)) problems.push(`${path} is not generated by scripts/typings.mjs`);
    }
  }
  return problems;
}

function main(argv) {
  const at = argv.indexOf('--root');
  const root = at >= 0 ? resolve(argv[at + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (argv.includes('--check')) {
    const problems = checkGenerated(root);
    for (const p of problems) console.error(`typings: ${p}`);
    if (problems.length) {
      console.error('typings: run `node scripts/typings.mjs` and commit the result');
      return 1;
    }
    console.log(`typings: ${ELEMENTS_FILE} is current`);
    return 0;
  }
  writeGenerated(root);
  console.log(`typings: wrote ${ELEMENTS_FILE}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
