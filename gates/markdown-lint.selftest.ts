// Self-test of the markdown renderer's lint rules R1 to R5 (contracts/gates.md "Lint rules for the renderer"). It runs the REAL
// configuration (eslint.config.mjs) through the ESLint API on code held in memory, filed under a path that decides which blocks
// apply, so a rule that is dropped, mis-scoped or silenced by an inline directive turns this file red. Table-driven: per rule one
// violating, one clean and one leak case (a `eslint-disable-next-line` above the banned construct, which must still report).
import { fileURLToPath } from 'node:url';
import { ESLint, Linter } from 'eslint';
// @ts-expect-error -- the local rule plugin is a plain .mjs module with no declaration file
import skLocal from '../eslint-rules/index.mjs';
// @ts-expect-error -- the scanner is a plain .mjs module with no declaration file
import { scanTemplate } from '../eslint-rules/markdown-renderer.mjs';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = `${ROOT}packages/mission-ui/src/`;
// Existing files: the type-aware parser needs a file the project knows; the text linted is the case's own.
const OUTSIDE = `${SRC}logic/summary.ts`;
const MARKDOWN_FILE = `${SRC}logic/markdown/render.ts`;
const PARSE_FILE = `${SRC}logic/markdown/parse.ts`;
const ELEMENT_FILE = `${SRC}elements/sk-pipeline-screen/pipeline-parts.ts`;
const OVERRIDDEN_FILE = `${SRC}elements/sk-work-package-screen/history-parts.ts`;
const STORY_FILE = `${SRC}elements/sk-mission-sample/sk-mission-sample.stories.ts`;

const TICK = '`';
const DISABLE = '// eslint-disable-next-line\n';

/** A lit template of `inner`, in a module that imports `html`. */
const template = (inner: string): string => `import { html } from 'lit';\nexport const t = (x: string, f: () => void) => html${TICK}${inner}${TICK};\n`;

/** The same, as plain script (no type annotations): the cases filed as .js, .mjs and .jsx are parsed as JavaScript. */
const scriptTemplate = (inner: string): string => `import { html } from 'lit';\nexport const t = (x, f) => html${TICK}${inner}${TICK};\n`;

type Kind = 'violating' | 'clean' | 'leak';
interface Case {
  rule: 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
  kind: Kind;
  name: string;
  file: string;
  code: string;
}

const cases: Case[] = [
  // R1: markdown-it only from parse.ts (rule sk/markdown-it-import-home)
  { rule: 'R1', kind: 'violating', name: 'an import in a logic file', file: OUTSIDE, code: "import MarkdownIt from 'markdown-it';\nexport const m = MarkdownIt;\n" },
  { rule: 'R1', kind: 'violating', name: 'an import in model.ts', file: `${SRC}logic/markdown/model.ts`, code: "import MarkdownIt from 'markdown-it';\nexport const m = MarkdownIt;\n" },
  { rule: 'R1', kind: 'violating', name: 'an import in an element file (a rule of its own, so the no-restricted-imports block cannot replace it)', file: ELEMENT_FILE, code: "import MarkdownIt from 'markdown-it';\nexport const m = MarkdownIt;\n" },
  { rule: 'R1', kind: 'violating', name: 'a type-only import', file: OUTSIDE, code: "import type MarkdownIt from 'markdown-it';\nexport type M = MarkdownIt;\n" },
  { rule: 'R1', kind: 'violating', name: 'a deep import (markdown-it/...)', file: OUTSIDE, code: "import { default as MarkdownIt } from 'markdown-it/lib/index.mjs';\nexport const m = MarkdownIt;\n" },
  { rule: 'R1', kind: 'violating', name: 'a re-export with a source', file: OUTSIDE, code: "export { default } from 'markdown-it';\n" },
  { rule: 'R1', kind: 'violating', name: 'an export-all with a source', file: OUTSIDE, code: "export * from 'markdown-it';\n" },
  { rule: 'R1', kind: 'violating', name: 'a dynamic import', file: OUTSIDE, code: "export const m = () => import('markdown-it');\n" },
  { rule: 'R1', kind: 'violating', name: 'a require call', file: OUTSIDE, code: "declare const require: (name: string) => unknown;\nexport const m = require('markdown-it');\n" },
  { rule: 'R1', kind: 'violating', name: 'an import type expression', file: OUTSIDE, code: "export type M = typeof import('markdown-it');\n" },
  { rule: 'R1', kind: 'violating', name: 'an import-equals require', file: OUTSIDE, code: "import m = require('markdown-it');\nexport const x = m;\n" },
  { rule: 'R1', kind: 'clean', name: 'the one allowed importer, parse.ts', file: PARSE_FILE, code: "import MarkdownIt from 'markdown-it';\nexport const m = MarkdownIt;\n" },
  { rule: 'R1', kind: 'clean', name: 'a package whose name only starts the same way', file: OUTSIDE, code: "import other from 'markdown-itx';\nexport const m = other;\n" },
  { rule: 'R1', kind: 'leak', name: 'an inline disable above the import', file: OUTSIDE, code: `${DISABLE}import MarkdownIt from 'markdown-it';\nexport const m = MarkdownIt;\n` },

  // R2: no render, renderInline, renderToken, renderAttrs member call and no .renderer access
  { rule: 'R2', kind: 'violating', name: 'md.render()', file: OUTSIDE, code: 'declare const md: { render(s: string): string };\nexport const out = md.render("x");\n' },
  { rule: 'R2', kind: 'violating', name: 'md.renderInline()', file: OUTSIDE, code: 'declare const md: { renderInline(s: string): string };\nexport const out = md.renderInline("x");\n' },
  { rule: 'R2', kind: 'violating', name: 'md.renderToken()', file: OUTSIDE, code: 'declare const md: { renderToken(a: number): string };\nexport const out = md.renderToken(1);\n' },
  { rule: 'R2', kind: 'violating', name: 'md.renderAttrs()', file: OUTSIDE, code: 'declare const md: { renderAttrs(a: number): string };\nexport const out = md.renderAttrs(1);\n' },
  { rule: 'R2', kind: 'violating', name: 'a computed member call', file: OUTSIDE, code: 'declare const md: { render(s: string): string };\nexport const out = md["render"]("x");\n' },
  { rule: 'R2', kind: 'violating', name: 'a .renderer access', file: OUTSIDE, code: 'declare const md: { renderer: object };\nexport const r = md.renderer;\n' },
  { rule: 'R2', kind: 'violating', name: 'in an element file that an exception overrides', file: OVERRIDDEN_FILE, code: 'declare const md: { render(s: string): string };\nexport const out = md.render("x");\n' },
  { rule: 'R2', kind: 'clean', name: 'a this.renderNode() call (no render* glob), a Map.set and the lit render function', file: OUTSIDE, code: "import { render, html } from 'lit';\nexport class A {\n  renderNode(n: number): number { return n; }\n  run(el: HTMLElement): number {\n    new Map<string, number>().set('a', 1);\n    render(html`x`, el);\n    return this.renderNode(1);\n  }\n}\n" },
  { rule: 'R2', kind: 'leak', name: 'an inline disable above md.render()', file: OUTSIDE, code: `declare const md: { render(s: string): string };\n${DISABLE}export const out = md.render("x");\n` },

  // R3: no string is parsed as markup
  { rule: 'R3', kind: 'violating', name: 'new DOMParser()', file: MARKDOWN_FILE, code: 'export const p = new DOMParser();\n' },
  { rule: 'R3', kind: 'violating', name: 'createContextualFragment', file: OUTSIDE, code: 'export const f = (r: Range) => r.createContextualFragment("x");\n' },
  { rule: 'R3', kind: 'violating', name: 'setHTML', file: OUTSIDE, code: 'export const f = (e: { setHTML(s: string): void }) => e.setHTML("x");\n' },
  { rule: 'R3', kind: 'violating', name: 'insertAdjacentElement', file: OUTSIDE, code: 'export const f = (e: Element, c: Element) => e.insertAdjacentElement("beforeend", c);\n' },
  { rule: 'R3', kind: 'violating', name: 'insertAdjacentHTML', file: OUTSIDE, code: 'export const f = (e: Element) => e.insertAdjacentHTML("beforeend", "x");\n' },
  { rule: 'R3', kind: 'violating', name: 'a template element', file: OUTSIDE, code: "export const t = document.createElement('template');\n" },
  { rule: 'R3', kind: 'violating', name: 'an innerHTML assignment', file: OUTSIDE, code: 'export const f = (e: Element) => { e.innerHTML = "x"; };\n' },
  { rule: 'R3', kind: 'violating', name: 'an outerHTML read', file: OUTSIDE, code: 'export const f = (e: Element) => e.outerHTML;\n' },
  { rule: 'R3', kind: 'violating', name: "a string-literal key: el['innerHTML'] = x", file: OUTSIDE, code: "export const f = (e: Element) => { e['innerHTML'] = 'x'; };\n" },
  { rule: 'R3', kind: 'violating', name: 'a template-literal key: el[`innerHTML`] = x', file: OUTSIDE, code: 'export const f = (e: Element) => { e[`innerHTML`] = "x"; };\n' },
  { rule: 'R3', kind: 'violating', name: "a string-literal object key: { 'outerHTML': x }", file: OUTSIDE, code: "export const f = (e: Element) => Object.assign(e, { 'outerHTML': 'x' });\n" },
  { rule: 'R3', kind: 'violating', name: 'a template-literal computed object key: { [`outerHTML`]: x }', file: OUTSIDE, code: 'export const f = (e: Element) => Object.assign(e, { [`outerHTML`]: "x" });\n' },
  { rule: 'R3', kind: 'violating', name: 'a template-literal template element: createElement(`template`)', file: OUTSIDE, code: 'export const t = document.createElement(`template`);\n' },
  { rule: 'R3', kind: 'violating', name: "a template element with a computed method: document['createElement']('template')", file: OUTSIDE, code: "export const t = document['createElement']('template');\n" },
  { rule: 'R3', kind: 'violating', name: "a name passed as an argument: Reflect.set(e, 'innerHTML', x)", file: OUTSIDE, code: "export const f = (e: Element) => Reflect.set(e, 'innerHTML', 'x');\n" },
  { rule: 'R3', kind: 'violating', name: 'a name passed as a template literal argument: globalThis[`DOMParser`]', file: OUTSIDE, code: 'export const p = (globalThis as Record<string, unknown>)[`DOMParser`];\n' },
  { rule: 'R3', kind: 'violating', name: 'setHTMLUnsafe', file: OUTSIDE, code: 'export const f = (e: { setHTMLUnsafe(s: string): void }) => e.setHTMLUnsafe("x");\n' },
  { rule: 'R3', kind: 'violating', name: 'Document.parseHTMLUnsafe', file: OUTSIDE, code: 'export const f = () => (Document as unknown as { parseHTMLUnsafe(s: string): Document }).parseHTMLUnsafe("x");\n' },
  { rule: 'R3', kind: 'violating', name: 'createHTMLDocument', file: OUTSIDE, code: "export const f = () => document.implementation.createHTMLDocument('x');\n" },
  { rule: 'R3', kind: 'violating', name: 'document.write', file: OUTSIDE, code: "export const f = () => { document.write('x'); };\n" },
  { rule: 'R3', kind: 'violating', name: 'document.writeln', file: OUTSIDE, code: "export const f = () => { document.writeln('x'); };\n" },
  { rule: 'R3', kind: 'violating', name: "a computed write: document['write']", file: OUTSIDE, code: "export const f = () => { document['write']('x'); };\n" },
  { rule: 'R3', kind: 'violating', name: "a template element through createElementNS", file: OUTSIDE, code: "export const t = document.createElementNS('http://www.w3.org/1999/xhtml', 'template');\n" },
  { rule: 'R3', kind: 'violating', name: 'a template-literal createElementNS template element', file: OUTSIDE, code: "export const t = document.createElementNS('http://www.w3.org/1999/xhtml', `template`);\n" },
  { rule: 'R3', kind: 'violating', name: "a computed createElementNS template element", file: OUTSIDE, code: "export const t = document['createElementNS']('http://www.w3.org/1999/xhtml', 'template');\n" },
  { rule: 'R3', kind: 'clean', name: 'createElementNS for an svg element and a method named write on another object', file: OUTSIDE, code: "export const f = (s: { write(x: string): void }) => { s.write('x'); return document.createElementNS('http://www.w3.org/2000/svg', 'path'); };\n" },
  { rule: 'R3', kind: 'clean', name: 'string and template literals that are not one of the names', file: OUTSIDE, code: "export const f = (e: Element) => { e['title'] = `x`; return document.createElement(`div`); };\n" },
  { rule: 'R3', kind: 'clean', name: 'an ordinary element and a text node', file: OUTSIDE, code: "export const f = () => document.createElement('div').append(document.createTextNode('x'));\n" },
  { rule: 'R3', kind: 'violating', name: 'document.execCommand', file: OUTSIDE, code: "export const f = () => document.execCommand('insertHTML', false, 'x');\n" },
  { rule: 'R3', kind: 'violating', name: "a computed execCommand: document['execCommand']", file: OUTSIDE, code: "export const f = () => document['execCommand']('insertHTML', false, 'x');\n" },
  { rule: 'R3', kind: 'violating', name: "setAttribute('onclick', x)", file: OUTSIDE, code: "export const f = (e: Element) => e.setAttribute('onclick', 'x');\n" },
  { rule: 'R3', kind: 'violating', name: "setAttribute('OnError', x) in any case", file: OUTSIDE, code: "export const f = (e: Element) => e.setAttribute('OnError', 'x');\n" },
  { rule: 'R3', kind: 'violating', name: 'setAttribute with a template-literal on* name', file: OUTSIDE, code: 'export const f = (e: Element) => e.setAttribute(`onload`, "x");\n' },
  { rule: 'R3', kind: 'violating', name: "a computed setAttribute: e['setAttribute']('onclick', x)", file: OUTSIDE, code: "export const f = (e: Element) => e['setAttribute']('onclick', 'x');\n" },
  { rule: 'R3', kind: 'violating', name: "a computed setAttributeNS: e['setAttributeNS'](null,'onclick','x')", file: OUTSIDE, code: "export const f = (e: Element) => e['setAttributeNS'](null,'onclick','x');\n" },
  { rule: 'R3', kind: 'violating', name: "setAttributeNS(null, 'onclick', x)", file: OUTSIDE, code: "export const f = (e: Element) => e.setAttributeNS(null, 'onclick', 'x');\n" },
  { rule: 'R3', kind: 'violating', name: "toggleAttribute('onclick')", file: OUTSIDE, code: "export const f = (e: Element) => e.toggleAttribute('onclick', true);\n" },
  { rule: 'R3', kind: 'clean', name: 'setAttribute, setAttributeNS and toggleAttribute with ordinary names', file: OUTSIDE, code: "export const f = (e: Element) => { e.setAttribute('role', 'tab'); e.setAttributeNS(null, 'title', 'x'); e.toggleAttribute('hidden', true); e.setAttribute('data-one', 'x'); };\n" },
  { rule: 'R3', kind: 'leak', name: 'an inline disable above new DOMParser()', file: MARKDOWN_FILE, code: `${DISABLE}export const p = new DOMParser();\n` },

  // R4: an allowlist of attribute names, no property or boolean binding (rule sk/markdown-template-attributes)
  { rule: 'R4', kind: 'violating', name: '.innerHTML=${x}', file: MARKDOWN_FILE, code: template('<p .innerHTML=${x}></p>') },
  { rule: 'R4', kind: 'violating', name: '.href=${x}', file: MARKDOWN_FILE, code: template('<a .href=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: '?href=${x}', file: MARKDOWN_FILE, code: template('<a ?href=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: '.srcdoc=${x}', file: MARKDOWN_FILE, code: template('<p .srcdoc=${x}></p>') },
  { rule: 'R4', kind: 'violating', name: 'any other property binding (.listing=${x})', file: MARKDOWN_FILE, code: template('<p .listing=${x}></p>') },
  { rule: 'R4', kind: 'violating', name: 'HREF with a space before the equals sign', file: MARKDOWN_FILE, code: template('<a HREF ="x">t</a>') },
  { rule: 'R4', kind: 'violating', name: 'a bound href', file: MARKDOWN_FILE, code: template('<a href=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: 'an attribute glued to the quote before it', file: MARKDOWN_FILE, code: template('<a role="link"href="x">t</a>') },
  { rule: 'R4', kind: 'violating', name: 'xlink:href', file: MARKDOWN_FILE, code: template('<a xlink:href="x">t</a>') },
  { rule: 'R4', kind: 'violating', name: 'an on* attribute', file: MARKDOWN_FILE, code: template('<p onclick="x">t</p>') },
  { rule: 'R4', kind: 'violating', name: 'a ping attribute', file: MARKDOWN_FILE, code: template('<a ping="https://x.test/">t</a>') },
  { rule: 'R4', kind: 'violating', name: 'a bound ping', file: MARKDOWN_FILE, code: template('<a PING=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: 'a ping binding (.ping=${x})', file: MARKDOWN_FILE, code: template('<a .ping=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: 'a class attribute', file: MARKDOWN_FILE, code: template('<p class="x">t</p>') },
  { rule: 'R4', kind: 'violating', name: 'an img src', file: MARKDOWN_FILE, code: template('<img src=${x}>') },
  { rule: 'R4', kind: 'violating', name: 'a listener that is not click or keydown', file: MARKDOWN_FILE, code: template('<p @mouseover=${f}>t</p>') },
  { rule: 'R4', kind: 'violating', name: 'an element binding where an attribute belongs', file: MARKDOWN_FILE, code: template('<p ${x}>t</p>') },
  { rule: 'R4', kind: 'violating', name: 'a bound element name', file: MARKDOWN_FILE, code: template('<${x}>t</${x}>') },
  { rule: 'R4', kind: 'violating', name: '.innerHTML=${x} in a .js file under logic/markdown', file: `${SRC}logic/markdown/x.js`, code: scriptTemplate('<p .innerHTML=${x}></p>') },
  { rule: 'R4', kind: 'violating', name: 'a bound href in a .mjs file under logic/markdown', file: `${SRC}logic/markdown/x.mjs`, code: scriptTemplate('<a href=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: '.href=${x} in a .jsx file under logic/markdown', file: `${SRC}logic/markdown/x.jsx`, code: scriptTemplate('<a .href=${x}>t</a>') },
  { rule: 'R4', kind: 'violating', name: 'an anchor written as \\x3c (cooked, not raw, is what lit parses)', file: MARKDOWN_FILE, code: template('<p>\\x3ca href=${x}>go</a></p>') },
  { rule: 'R4', kind: 'violating', name: 'an href after a cooked \\x22 closes the title value', file: MARKDOWN_FILE, code: template('<p title="a\\x22 href=${x}">go</p>') },
  { rule: 'R4', kind: 'violating', name: 'a template with an invalid escape (cooked is null)', file: MARKDOWN_FILE, code: template('<p>\\xzz</p>') },
  { rule: 'R4', kind: 'violating', name: 'an anchor after the empty comment <!-->', file: MARKDOWN_FILE, code: template('<p><!--><a href=${x}>') },
  { rule: 'R4', kind: 'violating', name: 'an anchor after the empty comment <!--->', file: MARKDOWN_FILE, code: template('<p><!---><a href=${x}>') },
  { rule: 'R4', kind: 'violating', name: 'an anchor after a style element whose body changes length when lower-cased', file: MARKDOWN_FILE, code: template('<style>' + '\u0130'.repeat(20) + '</style><a href=${x}>') },
  { rule: 'R4', kind: 'violating', name: 'a hole inside a style element', file: MARKDOWN_FILE, code: template('<style>${x}</style><p>t</p>') },
  { rule: 'R4', kind: 'violating', name: 'a hole inside a textarea element', file: MARKDOWN_FILE, code: template('<textarea>${x}</textarea>') },
  { rule: 'R4', kind: 'violating', name: 'an iframe with a bound title (a tag outside the element list)', file: MARKDOWN_FILE, code: template('<iframe title=${x}></iframe>') },
  { rule: 'R4', kind: 'violating', name: 'a hole inside an svg style element', file: MARKDOWN_FILE, code: template('<svg><style>${x}</style></svg>') },
  { rule: 'R4', kind: 'violating', name: 'an img element with no attribute at all (a tag outside the element list)', file: MARKDOWN_FILE, code: template('<img>') },
  { rule: 'R4', kind: 'clean', name: 'every allowed attribute and both listeners', file: MARKDOWN_FILE, code: template('<th scope="col" data-align="left" data-md="x" title=${x} role="link" tabindex="0" aria-label=${x} aria-hidden="true" start="3" @click=${f} @keydown=${f}>t</th><!-- a href="x" in a comment --><p>a < b and "quoted" text</p>') },
  { rule: 'R4', kind: 'clean', name: 'a story file binding a property (.listing=${x}): the rule is not set there', file: STORY_FILE, code: template('<p .listing=${x}></p>') },
  { rule: 'R4', kind: 'leak', name: 'an inline disable above a property binding', file: MARKDOWN_FILE, code: `import { html } from 'lit';\n${DISABLE}export const t = (x: string) => html${TICK}<p .innerHTML=\${x}></p>${TICK};\n` },

  // R5: no import() and no new URL() under logic/markdown/
  { rule: 'R5', kind: 'violating', name: 'import() under logic/markdown', file: MARKDOWN_FILE, code: "export const m = () => import('./x.js');\n" },
  { rule: 'R5', kind: 'violating', name: 'new URL() under logic/markdown', file: MARKDOWN_FILE, code: "export const u = new URL('x', 'http://example.invalid/');\n" },
  { rule: 'R5', kind: 'violating', name: 'import() in a .js file under logic/markdown', file: `${SRC}logic/markdown/x.js`, code: "export const m = () => import('./x.js');\n" },
  { rule: 'R5', kind: 'clean', name: 'new URL() outside logic/markdown', file: OUTSIDE, code: "export const u = new URL('x', 'http://example.invalid/');\n" },
  { rule: 'R5', kind: 'leak', name: 'an inline disable above new URL()', file: MARKDOWN_FILE, code: `${DISABLE}export const u = new URL('x', 'http://example.invalid/');\n` },
];

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: ROOT, overrideConfigFile: `${ROOT}eslint.config.mjs` });
});

/** The messages of one rule that the real configuration reports for the case's code. */
async function reported(rule: string, file: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: file });
  return (result?.messages ?? []).filter((message) => message.message.startsWith(`markdown-renderer: ${rule} `)).map((message) => message.message);
}

describe('the markdown renderer lint rules R1 to R5 (the real configuration, run through the ESLint API)', () => {
  it('exercises exactly five rules, each with a violating, a clean and a leak case (a rule removed from the table turns this red)', () => {
    const rules = [...new Set(cases.map((c) => c.rule))].sort();
    expect(rules).toEqual(['R1', 'R2', 'R3', 'R4', 'R5']);
    for (const rule of rules) {
      for (const kind of ['violating', 'clean', 'leak'] as const) {
        expect(cases.filter((c) => c.rule === rule && c.kind === kind).length, `${rule} ${kind}`).toBeGreaterThan(0);
      }
    }
  });

  for (const c of cases) {
    it(`${c.rule} ${c.kind}: ${c.name}`, { timeout: 120_000 }, async () => {
      const found = await reported(c.rule, c.file, c.code);
      if (c.kind === 'clean') expect(found).toEqual([]);
      else expect(found.length).toBeGreaterThan(0);
    });
  }

  it('says which rule is on in the same case a violating one is not: the clean twin of every violating case differs only by the construct', async () => {
    // The control of the whole table: the same file with no banned construct reports nothing at all of the five rules.
    for (const rule of ['R1', 'R2', 'R3', 'R4', 'R5']) expect(await reported(rule, MARKDOWN_FILE, 'export const ok = 1;\n')).toEqual([]);
  });
});

describe('the wiring of the real configuration (calculateConfigForFile)', () => {
  const messagesOf = (config: Awaited<ReturnType<ESLint['calculateConfigForFile']>>): string => JSON.stringify(config?.rules?.['no-restricted-syntax'] ?? '');

  it('turns inline config off for every file under packages/*/src, so no disable comment can silence a rule', async () => {
    for (const file of [MARKDOWN_FILE, OUTSIDE, ELEMENT_FILE, OVERRIDDEN_FILE, STORY_FILE]) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config?.linterOptions?.noInlineConfig, file).toBe(true);
    }
  });

  it('keeps R1 (own rule id) and R2 and R3 (carried by withoutClassBan) for a file that an exception overrides, and a normal element file', async () => {
    for (const file of [OUTSIDE, ELEMENT_FILE, OVERRIDDEN_FILE, MARKDOWN_FILE]) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config?.rules?.['sk/markdown-it-import-home'], file).toEqual([2, { home: 'src/logic/markdown/parse.ts' }]);
      const restricted = messagesOf(config);
      expect(restricted, file).toContain('markdown-renderer: R2');
      expect(restricted, file).toContain('markdown-renderer: R3');
    }
  });

  it('sets R4 and R5 under logic/markdown only', async () => {
    const inside = await eslint.calculateConfigForFile(MARKDOWN_FILE);
    expect(inside?.rules?.['sk/markdown-template-attributes']).toEqual([2, { strictBindings: true }]);
    expect(messagesOf(inside)).toContain('markdown-renderer: R5');
    for (const file of [OUTSIDE, ELEMENT_FILE, STORY_FILE]) {
      const outside = await eslint.calculateConfigForFile(file);
      expect(outside?.rules?.['sk/markdown-template-attributes'], file).toBeUndefined();
      expect(messagesOf(outside), file).not.toContain('markdown-renderer: R5');
    }
  });

  it('does not touch the unchanged base: the real files of the package report none of the five rules', async () => {
    const results = await eslint.lintFiles(['packages/mission-ui/src/logic/**/*.ts', 'packages/mission-ui/src/elements/sk-pipeline-screen/*.ts']);
    expect(results.length).toBeGreaterThan(10);
    const own = results.flatMap((result) => result.messages).filter((message) => message.message.startsWith('markdown-renderer: '));
    expect(own).toEqual([]);
  });
});

// --- IC-06a (mission-ui#7, the Artifact Viewer): R4 clause (b) options schema with the EMPTY named list, and the wiring of every file
// an exception overrides. The screen's part files are stubs written by IC-06b, so these cases run the real configuration's resolved
// rule options (calculateConfigForFile) through a bare Linter on code held in memory: no file has to exist on disk.

const SCREEN = `${SRC}elements/sk-artifact-screen/`;
const SCREEN_FILES = [
  'sk-artifact-screen.ts', 'toolbar-parts.ts', 'document-parts.ts', 'source-parts.ts', 'prose-styles.ts',
  'tab-parts.ts', 'inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts',
];
const OVERRIDDEN_SCREEN_FILES = ['inspector-parts.ts', 'state-parts.ts', 'refusal-parts.ts', 'tab-parts.ts'];
const R4_RULE = 'sk/markdown-template-attributes';

/** The R4 messages the REAL configuration reports for `code` filed under `file` (clause (b) when the file is an element file). */
async function r4(file: string, code: string): Promise<string[]> {
  const config = await eslint.calculateConfigForFile(file);
  const options = config?.rules?.[R4_RULE];
  if (options === undefined) return [];
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(
    code,
    [{ files: ['**/*.js'], plugins: { sk: skLocal }, linterOptions: { noInlineConfig: config?.linterOptions?.noInlineConfig === true }, rules: { [R4_RULE]: options } }],
    { filename: file.replace(/\.ts$/, '.js') },
  );
  // A parse error is never a finding: only the rule's own messages count, so a malformed case cannot pass vacuously.
  expect(messages.filter((message) => message.fatal)).toEqual([]);
  return messages.map((message) => message.message);
}

/** Whether an R4 options object is accepted by the rule's schema (a bare Linter validates the options against it). */
function schemaAccepts(options: unknown): boolean {
  const linter = new Linter({ configType: 'flat' });
  try {
    const messages = linter.verify('export const a = 1;\n', [{ files: ['**/*.js'], plugins: { sk: skLocal }, rules: { [R4_RULE]: ['error', options as object] } }], { filename: 'x.js' });
    return messages.every((message) => !message.fatal);
  } catch {
    return false;
  }
}

// IC-06b filled the named lists from its stubs and part signatures: the exact names are pinned here, so removing or adding one is a
// reviewed change that turns this case red (the list in `eslint.config.mjs` is the reviewed artifact, each name with a reason).
const REVIEWED_BINDINGS = ['?disabled', '?data-single'];
const REVIEWED_ATTRIBUTES = [
  'data-region', 'data-root', 'data-layout', 'data-hidden-heading', 'data-scroll', 'data-document', 'data-toolbar-name', 'data-inspector-group',
  'data-inspector-pills', 'data-refusal', 'data-refusal-path', 'data-state-panel', 'id', 'aria-labelledby', 'aria-controls', 'aria-selected',
  'aria-live', 'aria-busy', 'type', 'class', 'tone', 'announce', 'variant',
];

describe('IC-06a and IC-06b: R4 for the element files of the Artifact Viewer (options schema, the reviewed named list)', () => {
  it('sets clause (b) for every non-story file of the screen with the reviewed lists, and for no story or fixtures file', async () => {
    let ran = 0;
    for (const name of SCREEN_FILES) {
      const config = await eslint.calculateConfigForFile(`${SCREEN}${name}`);
      const rule = config?.rules?.[R4_RULE] as [number, { strictBindings: boolean; allowBindings: { name: string; reason: string }[]; allowAttributes: { name: string; reason: string }[]; allowListeners: unknown[] }];
      expect(rule[0], name).toBe(2);
      expect(rule[1].strictBindings, name).toBe(false);
      expect(rule[1].allowBindings.map((entry) => entry.name), name).toEqual(REVIEWED_BINDINGS);
      expect(rule[1].allowAttributes.map((entry) => entry.name), name).toEqual(REVIEWED_ATTRIBUTES);
      expect(rule[1].allowListeners, name).toEqual([]);
      for (const entry of [...rule[1].allowBindings, ...rule[1].allowAttributes]) expect(entry.reason.length, `${name} ${entry.name}`).toBeGreaterThanOrEqual(12);
      ran += 1;
    }
    expect(ran).toBe(9);
    for (const name of ['sk-artifact-screen.stories.ts', 'fixtures.ts']) {
      expect((await eslint.calculateConfigForFile(`${SCREEN}${name}`))?.rules?.[R4_RULE], name).toBeUndefined();
    }
  });

  it('reports a property binding in a non-story screen file, the same text in render.ts, and is clean in a story file (the scoped pair)', async () => {
    const code = scriptTemplate('<p .listing=${x}></p>');
    expect((await r4(`${SCREEN}toolbar-parts.ts`, code)).join('|')).toContain('not on the reviewed list');
    expect((await r4(MARKDOWN_FILE, code)).length).toBeGreaterThan(0);
    expect(await r4(`${SCREEN}sk-artifact-screen.stories.ts`, code)).toEqual([]);
    expect(await r4(`${SCREEN}fixtures.ts`, code)).toEqual([]);
  });

  it('an unlisted boolean binding, an unlisted attribute and an unlisted listener are reported, and the contract and reviewed names are clean', async () => {
    const file = `${SCREEN}state-parts.ts`;
    expect((await r4(file, scriptTemplate('<p ?hidden=${x}></p>'))).length).toBe(1);
    expect((await r4(file, scriptTemplate('<p aria-checked="true"></p>'))).length).toBe(1);
    expect(await r4(file, scriptTemplate('<p aria-selected="true" ?disabled=${x}></p>'))).toEqual([]);
    expect((await r4(file, scriptTemplate('<p @sk-select=${f}></p>'))).length).toBe(1);
    expect(await r4(file, scriptTemplate('<p role="link" title=${x} aria-label=${x} tabindex="0" @click=${f} @keydown=${f}>t</p>'))).toEqual([]);
  });

  it('never accepts href, src, srcset, srcdoc, style, on* or .innerHTML, empty list or not: the rule reports them in every screen file', async () => {
    let ran = 0;
    for (const name of SCREEN_FILES) {
      for (const markup of ['<a href="x">t</a>', '<img src=${x}>', '<img srcset="x">', '<p srcdoc="x"></p>', '<p style="x"></p>', '<p onclick="x"></p>', '<p .innerHTML=${x}></p>']) {
        expect((await r4(`${SCREEN}${name}`, scriptTemplate(markup))).length, `${name} ${markup}`).toBeGreaterThan(0);
        ran += 1;
      }
    }
    expect(ran).toBe(9 * 7);
  });

  it('leak: an inline disable above a binding in a screen file is still reported (noInlineConfig)', async () => {
    const code = `import { html } from 'lit';\n${DISABLE}export const t = (x) => html${TICK}<p .innerHTML=\${x}></p>${TICK};\n`;
    expect((await r4(`${SCREEN}document-parts.ts`, code)).length).toBeGreaterThan(0);
  });

  it('the schema accepts the empty lists and a reviewed entry with a reason, and a listed name takes effect', async () => {
    expect(schemaAccepts({ strictBindings: false, allowBindings: [], allowAttributes: [], allowListeners: [] })).toBe(true);
    expect(schemaAccepts({ strictBindings: false, allowAttributes: [{ name: 'aria-selected', reason: 'The selected state of a tab.' }] })).toBe(true);
    expect(schemaAccepts({ strictBindings: false, allowBindings: [{ name: '?disabled', reason: 'An inert control while loading.' }], allowListeners: [{ name: '@sk-select', reason: 'The screen event of the tree.' }] })).toBe(true);
    // The control of the refusals below: the same schema, the same entry shape, refuses nothing it should accept.
    const linter = new Linter({ configType: 'flat' });
    const options = { strictBindings: false, allowTags: [{ name: 'p', reason: 'A paragraph of the control case.' }], allowAttributes: [{ name: 'aria-selected', reason: 'The selected state of a tab.' }] };
    const run = (markup: string) => {
      const messages = linter.verify(scriptTemplate(markup), [{ files: ['**/*.js'], plugins: { sk: skLocal }, rules: { [R4_RULE]: ['error', options] } }], { filename: 'x.js' });
      expect(messages.filter((message) => message.fatal)).toEqual([]);
      return messages.length;
    };
    expect(run('<p aria-selected="true"></p>')).toBe(0);
    expect(run('<p aria-checked="true"></p>')).toBe(1);
  });

  it('the schema refuses href, src, srcset, srcdoc, style, on* and .innerHTML as entries, in any case, and an entry without a reason', () => {
    const reason = 'A reason on one line.';
    let ran = 0;
    for (const name of ['href', 'HREF', 'src', 'Srcset', 'srcdoc', 'style', 'STYLE', 'onclick', 'onFoo', 'xlink:href', 'action', 'formaction', 'poster', 'data', 'background', 'ping', 'PING']) {
      expect(schemaAccepts({ allowAttributes: [{ name, reason }] }), `attribute ${name}`).toBe(false);
      ran += 1;
    }
    for (const name of ['.innerHTML', '.outerHTML', '?innerHTML', '.href', '.src', '.srcdoc', '.style', '.textContent', '.onclick', '.onfoo', '?src', '.SRCDOC', '.ping', '?PING']) {
      expect(schemaAccepts({ allowBindings: [{ name, reason }] }), `binding ${name}`).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(31);
    for (const bad of [
      { allowAttributes: [{ name: 'aria-selected' }] },
      { allowAttributes: [{ name: 'aria-selected', reason: '' }] },
      { allowAttributes: [{ name: 'aria-selected', reason: 'short' }] },
      { allowAttributes: [{ name: 'aria-selected', reason: 'two\nlines of reason' }] },
      { allowAttributes: ['aria-selected'] },
      { allowAttributes: [{ name: 'aria-selected', reason, extra: 1 }] },
      { allowBindings: [{ name: 'disabled', reason }] },
      { allowListeners: [{ name: 'click', reason }] },
      { allowBindings: ['?disabled'] },
    ]) {
      expect(schemaAccepts(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe('R4 tags and raw-text holes for the element files of the Artifact Viewer (clause (b))', () => {
  const file = `${SCREEN}state-parts.ts`;
  it('reports an element outside the reviewed list, and a hole inside a raw-text element, in every non-story screen file', async () => {
    for (const name of SCREEN_FILES) {
      expect((await r4(`${SCREEN}${name}`, scriptTemplate('<iframe title=${x}></iframe>'))).join('|'), name).toContain('not on the list of reviewed elements');
      expect((await r4(`${SCREEN}${name}`, scriptTemplate('<style>${x}</style>'))).join('|'), name).toContain('raw-text element');
      expect((await r4(`${SCREEN}${name}`, scriptTemplate('<svg><style>${x}</style></svg>'))).length, name).toBeGreaterThan(0);
    }
  });
  it('is clean for the reviewed elements, and for a hole in an ordinary element', async () => {
    expect(await r4(file, scriptTemplate('<div><p>${x}</p><sk-notice tone="info">${x}</sk-notice><wbr></div>'))).toEqual([]);
  });
  it('reads the cooked text: an escaped less-than sign still opens the anchor', async () => {
    expect((await r4(file, scriptTemplate('<p>\\x3ciframe title=${x}></iframe></p>'))).length).toBeGreaterThan(0);
  });
  it('pins the reviewed element list of the screen files', async () => {
    const config = await eslint.calculateConfigForFile(`${SCREEN}toolbar-parts.ts`);
    const rule = config?.rules?.[R4_RULE] as [number, { allowTags: { name: string; reason: string }[] }];
    expect(rule[1].allowTags.map((entry) => entry.name)).toEqual([
      'article', 'button', 'code', 'dd', 'div', 'dl', 'dt', 'h1', 'h2', 'h3', 'li', 'p', 'pre', 'progress', 'sk-button', 'sk-notice', 'span', 'strong', 'ul', 'wbr',
    ]);
    for (const entry of rule[1].allowTags) expect(entry.reason.length, entry.name).toBeGreaterThanOrEqual(12);
  });
});

describe('the element-syntax selectors read the cooked text of a template', () => {
  // A file with no class= exception (E-01 to E-27 relax class= per file), so the selectors for class= and style= are live.
  const lintElement = async (inner: string, filePath = `${SRC}elements/sk-mission-sample/sk-mission-sample.ts`): Promise<string[]> => {
    const [result] = await eslint.lintText(template(inner), { filePath });
    return (result?.messages ?? []).map((message) => message.message);
  };
  it('reports a raw control, a class= and a style= written with an escape', async () => {
    expect((await lintElement('\\x3cbutton>x</button>')).join('|')).toContain('Raw <button>');
    expect((await lintElement('<p\\x20class="x">t</p>')).join('|')).toContain('class= is forbidden');
    expect((await lintElement('<p\\x20style="x">t</p>')).join('|')).toContain('Inline style=');
  });
  it('reports a template with an invalid escape', async () => {
    expect((await lintElement('<p>\\xzz</p>')).join('|')).toContain('invalid escape');
  });
  it('reports nothing for an ordinary template (the control)', async () => {
    const found = await lintElement('<p>${x}</p>');
    expect(found.filter((message) => !message.includes('is defined but never used'))).toEqual([]);
  });
});

describe('IC-06a: every file an exception overrides keeps R1 to R5 (calculateConfigForFile)', () => {
  it('keeps R1 (own rule id), R2 and R3 (carried by the restrictions), R4 (own rule id) and noInlineConfig in every overridden screen file, every other screen file and one elements/** file', async () => {
    let ran = 0;
    for (const file of [...OVERRIDDEN_SCREEN_FILES.map((name) => `${SCREEN}${name}`), ...SCREEN_FILES.map((name) => `${SCREEN}${name}`), ELEMENT_FILE]) {
      const config = await eslint.calculateConfigForFile(file);
      expect(config?.linterOptions?.noInlineConfig, file).toBe(true);
      expect(config?.rules?.['sk/markdown-it-import-home'], file).toEqual([2, { home: 'src/logic/markdown/parse.ts' }]);
      const restricted = JSON.stringify(config?.rules?.['no-restricted-syntax'] ?? '');
      expect(restricted, file).toContain('markdown-renderer: R2');
      expect(restricted, file).toContain('markdown-renderer: R3');
      // R5 belongs to logic/markdown/ only, as in the base wiring: an element file must not carry it.
      expect(restricted, file).not.toContain('markdown-renderer: R5');
      if (file.startsWith(SCREEN)) expect(config?.rules?.[R4_RULE], file).toBeDefined();
      else expect(config?.rules?.[R4_RULE], file).toBeUndefined();
      ran += 1;
    }
    expect(ran).toBe(4 + 9 + 1);
  });

  it('reports R2 and R3 constructs through the REAL overrides of the four overridden screen files', async () => {
    let ran = 0;
    for (const name of OVERRIDDEN_SCREEN_FILES) {
      const config = await eslint.calculateConfigForFile(`${SCREEN}${name}`);
      const linter = new Linter({ configType: 'flat' });
      for (const [rule, code] of [
        ['R2', 'const md = { render: (s) => s };\nexport const o = md.render("x");\n'],
        ['R3', 'export const f = (e) => { e.innerHTML = "x"; };\n'],
      ] as const) {
        const messages = linter.verify(code, [{ files: ['**/*.js'], rules: { 'no-restricted-syntax': config?.rules?.['no-restricted-syntax'] } }], { filename: 'x.js' });
        expect(messages.some((message) => message.message.startsWith(`markdown-renderer: ${rule} `)), `${name} ${rule}`).toBe(true);
        ran += 1;
      }
    }
    expect(ran).toBe(8);
  });
});

describe('scanTemplate: raw-text end tags and empty comments', () => {
  const scan = (chunks: string[]): string[] => {
    const seen: string[] = [];
    scanTemplate(chunks, (found: { type: string; name?: string }) => seen.push(`${found.type}:${found.name ?? ''}`));
    return seen;
  };
  it('finds the end tag of a style element after a character whose lower-case form is longer', () => {
    expect(scan(['<style>' + '\u0130'.repeat(20) + '</style><a href=', ''])).toContain('name:href');
  });
  it('treats <!--> and <!---> as complete comments', () => {
    expect(scan(['<p><!--><a href=', ''])).toContain('name:href');
    expect(scan(['<p><!---><a href=', ''])).toContain('name:href');
  });
});

describe('global ignores of the main configuration', () => {
  it('ignore the Cargo build output under target/ (CODE-BOUNDARY-006), and nothing beside it', async () => {
    expect(await eslint.isPathIgnored(`${ROOT}target/debug/build/out.ts`)).toBe(true);
    expect(await eslint.isPathIgnored(`${ROOT}target/release/bundle.js`)).toBe(true);
    // Positive controls: a source file and a script beside target/ are still linted.
    expect(await eslint.isPathIgnored(OUTSIDE)).toBe(false);
    expect(await eslint.isPathIgnored(`${ROOT}scripts/typings.mjs`)).toBe(false);
  });

  it('lint the generated element typings of the shell (E-46 withdrawn 2026-10-15)', async () => {
    expect(await eslint.isPathIgnored(`${ROOT}packages/mission-shell/src/generated/elements.d.ts`)).toBe(false);
  });
});
