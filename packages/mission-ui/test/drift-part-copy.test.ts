// The WP06 ruling "the part files hold no copy" (pre-merge squad CONTRACT-008): every word the Drift screen draws is in `src/defaults/`.
// The scan walks the TypeScript syntax tree (`typescript`, already a devDependency), so comments, regex literals, tagged templates and
// nesting are the compiler's business and not a hand-rolled tokenizer's (round 3, S-3).
//
// What counts as copy:
//  - the static text of an `html` template: a text node with a letter, or a static `aria-label`, `aria-description`, `title`, `alt`,
//    `label` or `placeholder` value;
//  - EVERY other string literal, no-substitution template and template span (the static parts of an untagged or non-`html`/`css` tagged
//    template, `String.raw` included), single lowercase words too, as long as it holds a letter.
// What does not:
//  - an import specifier; the static parts of an `html` or `css` template (the first is read as markup above, the second is CSS);
//  - a `new Error(...)` message (developer text, never drawn); a type-position literal (`'a' | 'b'`) and a property name;
//  - an attribute or data-attribute value: the expression of an `html` attribute that is not an accessible name, and the arguments of
//    `setAttribute`/`getAttribute`/`hasAttribute`/`removeAttribute`/`toggleAttribute`;
//  - a CSS selector string: the arguments of `querySelector`, `querySelectorAll`, `closest` and `matches`;
//  - an entry of `TOKENS`, below.
import { describe, expect, it } from 'vitest';
import ts from 'typescript';

type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-drift-screen/*.ts', { query: '?raw', import: 'default', eager: true });
const nameOf = (path: string): string => path.split('/').pop() as string;
const files = Object.entries(sources).filter(([path]) => !/\.stories\.ts$|fixtures\.ts$/.test(path));

/**
 * The tokens that are code, not words: the whole list, each with its reason. A new word-like literal fails the scan until it is
 * either moved to `src/defaults/` or added here with a reason that holds.
 */
const TOKENS: Readonly<Record<string, string>> = {
  // the screen's states and the copy-result values: `DriftScreenStatus` and the host's `copyResult` enum, compared and defaulted by name
  ready: 'state / status enum value',
  empty: 'state enum value',
  error: 'state enum value',
  loading: 'state enum value',
  'not-found': 'state enum value',
  manual: 'copyResult enum value',
  // element ids the template binds `aria-labelledby` to (not shown)
  authority: 'panel id option, becomes an element id',
  facts: 'panel id option, becomes an element id',
  'resolution-title': 'element id for aria-labelledby',
  'panel-title-': 'prefix of a generated element id',
  // the contract's event names, as `new CustomEvent` takes them (FR-023, the contract's event table)
  'sk-select-finding': 'contract event name',
  'sk-rescan-drift': 'contract event name',
  'sk-copy-command': 'contract event name',
  'sk-open-mission': 'contract event name',
  'sk-open-missions': 'contract event name',
  'sk-retry-load': 'contract event name',
  // the `@property({ attribute })` names of the host contract
  'mission-id': 'attribute name of the missionId property',
  'copy-result': 'attribute name of the copyResult property',
  'refusal-code': 'attribute name of the refusalCode property',
  'error-message': 'attribute name of the errorMessage property',
  // Lit's `changed.has(name)` takes a property name
  copyResult: 'property name given to changed.has',
  selectedFinding: 'property name given to changed.has',
  report: 'property name given to changed.has',
};
const ACCESSIBLE = /^(aria-label|aria-description|title|alt|label|placeholder)$/;
const SELECTOR_CALLS = new Set(['querySelector', 'querySelectorAll', 'closest', 'matches']);
const ATTRIBUTE_CALLS = new Set(['setAttribute', 'getAttribute', 'hasAttribute', 'removeAttribute', 'toggleAttribute']);

const parse = (source: string): ts.SourceFile => ts.createSourceFile('part.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const tagOf = (node: ts.TaggedTemplateExpression): string => node.tag.getText();
/** The static text of a template, `§` standing for each expression. */
const staticText = (template: ts.TemplateLiteral): string =>
  ts.isNoSubstitutionTemplateLiteral(template) ? template.text : template.head.text + template.templateSpans.map((span) => `§${span.literal.text}`).join('');
const hasLetter = (text: string): boolean => /[A-Za-z]/.test(text);

/** The copy an `html` template's static markup holds: text nodes with a letter, and static accessible-name attributes with a letter. */
function markupCopy(template: string): string[] {
  const found: string[] = [];
  for (const node of template.matchAll(/>([^<>]*)</g)) {
    const words = (node[1] ?? '').replace(/§/g, '');
    if (hasLetter(words)) found.push(`text "${words.trim()}"`);
  }
  for (const attribute of template.matchAll(/(?:^|\s)(aria-label|aria-description|title|alt|label|placeholder)="([^"]*)"/g)) {
    if (hasLetter((attribute[2] ?? '').replace(/§/g, ''))) found.push(`${attribute[1]}="${attribute[2]}"`);
  }
  return found;
}

interface Scan {
  /** What the file draws as words, as `text "..."`, `aria-label="..."` or `string "..."`. */
  copy: string[];
  /** How many `html` templates were read. */
  templates: number;
}
/** Reads the syntax tree of `source`. */
function scan(source: string): Scan {
  const result: Scan = { copy: [], templates: 0 };
  const literal = (text: string): void => {
    if (hasLetter(text) && !Object.hasOwn(TOKENS, text)) result.copy.push(`string "${text}"`);
  };
  /** True when `node` sits where its text is a name, a selector, an attribute value, a type or a developer message. */
  const exempt = (node: ts.Node): boolean => {
    const parent = node.parent;
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent) || ts.isLiteralTypeNode(parent)) return true;
    if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node) return true;
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
    for (let up: ts.Node | undefined = parent; up !== undefined; up = up.parent) {
      if (ts.isNewExpression(up) && up.expression.getText() === 'Error') return true;
      if (ts.isCallExpression(up) && ts.isPropertyAccessExpression(up.expression)) {
        const callee = up.expression.name.text;
        if (SELECTOR_CALLS.has(callee) || ATTRIBUTE_CALLS.has(callee)) return true;
      }
      if (ts.isCallExpression(up) && up.expression.kind === ts.SyntaxKind.ImportKeyword) return true;
    }
    return false;
  };
  const visit = (node: ts.Node, attributeValue: boolean): void => {
    if (ts.isTaggedTemplateExpression(node)) {
      const tag = tagOf(node);
      const template = node.template;
      if (tag === 'html') {
        result.templates += 1;
        result.copy.push(...markupCopy(staticText(template)));
        if (ts.isTemplateExpression(template)) {
          // An expression after `name=` is that attribute's value; only an accessible name's value is read.
          let before = template.head.text;
          for (const span of template.templateSpans) {
            const attribute = /(?:^|\s)([\w:.@?-]+)=("?)$/.exec(before)?.[1];
            visit(span.expression, attribute !== undefined && !ACCESSIBLE.test(attribute));
            before = span.literal.text;
          }
        }
      } else {
        visit(node.tag, false);
        if (tag === 'css') {
          if (ts.isTemplateExpression(template)) for (const span of template.templateSpans) visit(span.expression, false);
        } else {
          visit(template, false);
        }
      }
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!attributeValue && !exempt(node)) literal(node.text);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const skip = attributeValue || exempt(node);
      if (!skip) literal(node.head.text);
      for (const span of node.templateSpans) {
        visit(span.expression, attributeValue);
        if (!skip) literal(span.literal.text);
      }
      return;
    }
    ts.forEachChild(node, (child) => visit(child, attributeValue));
  };
  visit(parse(source), false);
  return result;
}
const copyIn = (source: string): string[] => scan(source).copy;

describe('the part files and the screen hold no copy (WP06 ruling)', () => {
  it('reads the eight files of the screen, and the scan sees templates (positive control)', () => {
    expect(files.map(([path]) => nameOf(path)).sort()).toEqual(
      ['detail-parts.ts', 'header-parts.ts', 'list-parts.ts', 'panel-parts.ts', 'resolution-parts.ts', 'sk-drift-screen.ts', 'state-parts.ts', 'table-parts.ts'],
    );
    let templates = 0;
    for (const [, source] of files) templates += scan(source).templates;
    expect(templates).toBeGreaterThan(30);
  });

  it('no file draws a text node with a letter, a static accessible name, or a string literal of words', () => {
    const offences: string[] = [];
    for (const [path, source] of files) for (const offence of copyIn(source)) offences.push(`${nameOf(path)}: ${offence}`);
    expect(offences).toEqual([]);
  });

  it('every entry of the token list is still used by a file (the list stays small and honest)', () => {
    const used = new Set<string>();
    const note = (node: ts.Node): void => {
      if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && Object.hasOwn(TOKENS, node.text)) used.add(node.text);
      if (ts.isTemplateExpression(node)) used.add(node.head.text);
      ts.forEachChild(node, note);
    };
    for (const [, source] of files) note(parse(source));
    expect(Object.keys(TOKENS).filter((token) => !used.has(token))).toEqual([]);
  });

  it('the literal scan catches a lowercase word, String.raw text, an untagged template, a constant and an interpolated literal (plants)', () => {
    expect(copyIn("const a = 'severity';")).toEqual(['string "severity"']);
    expect(copyIn("const a = 'rescanning…'; const b = 'no-changes';")).toEqual(['string "rescanning…"', 'string "no-changes"']);
    expect(copyIn('const a = String.raw`Severity ${x}`;')).toEqual(['string "Severity "']);
    expect(copyIn('const a = svg`Severity ${x}`;')).toEqual(['string "Severity "']);
    expect(copyIn("const a = html`<b>${'Severity of the finding'}</b>`;")).toEqual(['string "Severity of the finding"']);
    expect(copyIn('const SEV = `Rescan now ${x}`;')).toEqual(['string "Rescan now "']);
    expect(copyIn("const SEV = 'Severity of the finding';")).toEqual(['string "Severity of the finding"']);
    expect(copyIn('const SEV = "Warnings";')).toEqual(['string "Warnings"']);
    expect(copyIn("const a = html`<p aria-label=${'Close it'}>${x}</p>`;")).toEqual(['string "Close it"']);
  });

  it('a regex literal holding a quote does not desynchronise the scan, in either quote style (plants)', () => {
    expect(copyIn("const r = /'/; const a = 'Severity of the finding';")).toEqual(['string "Severity of the finding"']);
    expect(copyIn('const r = /"/.test(x) ? "Some words" : \'Other words\';')).toEqual(['string "Some words"', 'string "Other words"']);
    expect(copyIn("const r = /'/; const ok = html`<i>${x}</i>`; const k = 'ready';")).toEqual([]);
  });

  it('comments are not read, and an unterminated block comment ends the file without a loop (plants)', () => {
    expect(copyIn("// it's 'Some words'\n/* \"Other words\" */ const a = html`<i>${x}</i>`;")).toEqual([]);
    expect(copyIn("const a = 1; /* never closed 'Some words'")).toEqual([]);
  });

  it('the exemptions hold: imports, css, html markup, Error messages, selectors, attribute values, types, names and listed tokens (plants)', () => {
    expect(copyIn("import { a } from 'lit/Some Words.js'; export { b } from './Other Words.js'; const m = import('./Late Words.js');")).toEqual([]);
    expect(copyIn("const s = css`a { content: 'Some words'; } ${tokenWidth}`;")).toEqual([]);
    expect(copyIn("throw new Error('Something broke');")).toEqual([]);
    expect(copyIn("throw new Error(`Something broke ${x}`);")).toEqual([]);
    expect(copyIn("const a = el.querySelector('[data-region=\"x\"]') ?? el.closest('.some words') ?? el.matches('h1');")).toEqual([]);
    expect(copyIn("el.setAttribute('data-x', 'Some words'); el.getAttribute('aria-live') === 'polite';")).toEqual(['string "polite"']);
    expect(copyIn("const b = html`<p slot=\"title\" data-x=${'sk-open-mission'} aria-busy=${busy ? 'true' : 'false'} role=${ifDefined(o ? 'region' : undefined)}>${x}</p>`;")).toEqual([]);
    expect(copyIn("type K = 'copied' | 'manual'; const o = { 'some key': 1 }; const v = o['other key'];")).toEqual([]);
    expect(copyIn("const state = 'ready'; changed.has('copyResult');")).toEqual([]);
  });

  it('the markup scan catches a planted sentence, a planted label and a planted title, in a nested template too, and passes an expression-only template (plants)', () => {
    expect(copyIn('const a = html`<p>Hello there</p>`;')).toEqual(['text "Hello there"']);
    expect(copyIn('const a = html`<sk-button aria-label="Close it">${x}</sk-button>`;')).toEqual(['aria-label="Close it"']);
    expect(copyIn('const a = html`<span title="Tip">${x}</span>`;')).toEqual(['title="Tip"']);
    expect(copyIn('const a = html`<div>${ok ? html`<b>Nested words</b>` : nothing}</div>`;')).toEqual(['text "Nested words"']);
    expect(copyIn('const a = html`<p slot="title" data-x="Plain">${DRIFT_TITLE}</p> <span>${a}${b}</span>`;')).toEqual([]);
    expect(copyIn('// html`<p>commented</p>`\nconst a = html`<i>${x}</i>`;')).toEqual([]);
  });
});
