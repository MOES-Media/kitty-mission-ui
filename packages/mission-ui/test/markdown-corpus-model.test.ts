// The model twin of the hostile corpus: the same entries, asserted on the model alone (no screen, no render), in the same
// Chromium project. It derives from the model what the rendered walk must find (the element count and the link controls), so
// the two tests agree by construction and a drift in either shows. No failure message here carries the escape token of the
// rendered corpus.
import { describe, expect, it } from 'vitest';
import { LINK_SUFFIX } from '../src/defaults/index.js';
import { resolveLinks, type LinkTarget, type ResolvedBlock, type ResolvedInline } from '../src/logic/markdown/links.js';
import { buildMarkdownModel } from '../src/logic/markdown/model.js';
import { parseTokens } from '../src/logic/markdown/parse.js';
import { CORPUS, LISTING, OPEN_PATH, expectedElementCount, type Activation, type CorpusEntry } from './support/markdown-corpus-entries.js';

const EXPECTED_ENTRIES = 328;

/** The plain text of an inline run: what the reader sees of the document's own words (suffix words are the renderer's). */
function inlineText(nodes: readonly ResolvedInline[]): string {
  let out = '';
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
      case 'code':
        out += node.text;
        break;
      case 'softbreak':
        out += '\n';
        break;
      case 'emphasis':
      case 'strong':
      case 'strike':
      case 'link':
        out += inlineText(node.children);
        break;
      case 'image':
        out += node.alt;
        break;
      case 'hardbreak':
        break;
    }
  }
  return out;
}

function blockText(blocks: readonly ResolvedBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
      case 'paragraph':
        parts.push(inlineText(block.inline));
        break;
      case 'list':
        for (const item of block.items) parts.push(blockText(item));
        break;
      case 'quote':
        parts.push(blockText(block.blocks));
        break;
      case 'code':
        parts.push(block.text);
        break;
      case 'table':
        for (const cell of block.head) parts.push(inlineText(cell));
        for (const row of block.rows) for (const cell of row) parts.push(inlineText(cell));
        break;
      case 'rule':
        break;
    }
  }
  return parts.join('\n');
}

const activation = (target: LinkTarget): Activation | null =>
  target.kind === 'artifact' ? { artifact: { path: target.path, kind: target.entryKind } } : target.kind === 'external' ? { external: target.href } : null;

/** Link controls in document order, and the inert links, derived from the resolved model. */
function controlsOf(blocks: readonly ResolvedBlock[]): { controls: Activation[]; inert: number } {
  const found = { controls: [] as Activation[], inert: 0 };
  const inline = (nodes: readonly ResolvedInline[], insideLink: boolean): void => {
    for (const node of nodes) {
      if (node.kind === 'link') {
        // A link inside a link is drawn as its text: no second control and no second inert span.
        if (!insideLink) {
          const act = activation(node.target);
          if (act === null) found.inert += 1;
          else found.controls.push(act);
        }
        inline(node.children, true);
      } else if (node.kind === 'image') {
        // An external image outside a link is the one placeholder that is a control.
        if (!insideLink && node.target.kind === 'external') found.controls.push({ external: node.target.href });
      } else if (node.kind === 'emphasis' || node.kind === 'strong' || node.kind === 'strike') {
        inline(node.children, insideLink);
      }
    }
  };
  const walk = (list: readonly ResolvedBlock[]): void => {
    for (const block of list) {
      if (block.kind === 'heading' || block.kind === 'paragraph') inline(block.inline, false);
      else if (block.kind === 'list') for (const item of block.items) walk(item);
      else if (block.kind === 'quote') walk(block.blocks);
      else if (block.kind === 'table') {
        for (const cell of block.head) inline(cell, false);
        for (const row of block.rows) for (const cell of row) inline(cell, false);
      }
    }
  };
  walk(blocks);
  return found;
}

const SUFFIX_WORDS: readonly string[] = Object.values(LINK_SUFFIX);
const RENDERER_WORDS: readonly string[] = [...SUFFIX_WORDS, 'Image'];

function resolved(entry: CorpusEntry): ResolvedBlock[] {
  const model = buildMarkdownModel(entry.source);
  if (model.kind !== 'ok') throw new Error(`${entry.name}: expected a document, got ${model.reason}`);
  return resolveLinks(model.blocks, { openPath: OPEN_PATH, kindOf: LISTING });
}

describe('the corpus on the model', () => {
  it('holds the pinned number of entries', () => {
    expect(CORPUS).toHaveLength(EXPECTED_ENTRIES);
  });

  it('reaches the expected model result for every entry, never throws, and never parses a source the pre-parse guard refuses', () => {
    let ran = 0;
    for (const entry of CORPUS) {
      const before = parseTokens.calls;
      const result = buildMarkdownModel(entry.source);
      const got = result.kind === 'ok' ? 'ok' : result.reason;
      expect({ name: entry.name, got }).toEqual({ name: entry.name, got: entry.outcome });
      if (entry.outcome === 'too-complex') expect(parseTokens.calls).toBe(before);
      else expect(parseTokens.calls).toBe(before + 1);
      ran += 1;
    }
    expect(ran).toBe(EXPECTED_ENTRIES);
  });

  it('derives, for every document, the link controls and inert links the entry names, and a positive element count', () => {
    let ran = 0;
    for (const entry of CORPUS.filter((candidate) => candidate.outcome === 'ok')) {
      const blocks = resolved(entry);
      const { controls, inert } = controlsOf(blocks);
      expect({ name: entry.name, controls }).toEqual({ name: entry.name, controls: entry.controls ?? [] });
      if (entry.inert !== undefined) expect({ name: entry.name, inert }).toEqual({ name: entry.name, inert: entry.inert });
      expect(expectedElementCount(blocks)).toBeGreaterThan(0);
      ran += 1;
    }
    expect(ran).toBe(CORPUS.filter((candidate) => candidate.outcome === 'ok').length);
    expect(ran).toBeGreaterThan(0);
  });

  it('holds the text each entry expects in the model (the renderer\'s own words are checked by the rendered corpus)', () => {
    let checked = 0;
    for (const entry of CORPUS.filter((candidate) => candidate.outcome === 'ok')) {
      const text = blockText(resolved(entry));
      for (const part of entry.text ?? []) {
        if (RENDERER_WORDS.includes(part)) continue;
        expect({ name: entry.name, has: text.includes(part), part: part.slice(0, 60) }).toEqual({ name: entry.name, has: true, part: part.slice(0, 60) });
        checked += 1;
      }
      for (const part of entry.absent ?? []) expect({ name: entry.name, has: text.includes(part) }).toEqual({ name: entry.name, has: false });
    }
    expect(checked).toBeGreaterThan(100);
  });
});

describe('the element count derived from the model (the twin of the walk), on hand-computed documents', () => {
  const count = (source: string): number => expectedElementCount(resolved({ name: source, origin: 'contract', source, outcome: 'ok' }));

  it('counts a paragraph with a break, code and emphasis', () => {
    expect(count('a  \nb `c` *d*')).toBe(1 + 1 + 1 + 1);
  });

  it('counts a list, a quote, a rule and a code block', () => {
    expect(count('- a\n- b')).toBe(1 + 2 * (1 + 1));
    expect(count('> a')).toBe(1 + 1);
    expect(count('---')).toBe(1);
    expect(count('```\nx\n```')).toBe(2);
  });

  it('counts a table: box, table, thead, row, tbody, then a cell and a row of cells', () => {
    expect(count('| h |\n| - |\n| c |')).toBe(5 + 1 + (1 + 1));
  });

  it('counts a link as control plus suffix word plus children, an image outside a link as a placeholder (two for an external one)', () => {
    expect(count('[x](b.md)')).toBe(1 + 2);
    expect(count('[x](nothing.md)')).toBe(1 + 2);
    expect(count('![x](http://remote.invalid/p.png)')).toBe(1 + 2);
    expect(count('![x](b.md)')).toBe(1 + 1);
    expect(count('[![x](http://remote.invalid/p.png)](b.md)')).toBe(1 + 2 + 1);
  });
});

// --- the parser configuration and the renderer's source, pinned on their own -------------------------------------------------------

type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/logic/markdown/*.ts', { query: '?raw', import: 'default', eager: true });

/** The file text without line comments and block comments, so prose that names a construct is not a use of it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('the parser configuration is pinned on its own (the option and the disabled rules each stand alone)', () => {
  const parse = code(sources['../src/logic/markdown/parse.ts'] ?? '');

  it('finds the file (positive control for the glob)', () => {
    expect(Object.keys(sources).sort()).toEqual([
      '../src/logic/markdown/budget.ts',
      '../src/logic/markdown/index.ts',
      '../src/logic/markdown/links.ts',
      '../src/logic/markdown/model.ts',
      '../src/logic/markdown/parse.ts',
      '../src/logic/markdown/render.ts',
    ]);
    expect(parse).toContain('new MarkdownIt(');
  });

  it('sets html: false, linkify, typographer and breaks off in the constructor options', () => {
    const options = /new MarkdownIt\(\{([^}]*)\}\)/.exec(parse)?.[1] ?? '';
    expect(options).toMatch(/['"]?html['"]?\s*:\s*false/);
    expect(options).toMatch(/linkify\s*:\s*false/);
    expect(options).toMatch(/typographer\s*:\s*false/);
    expect(options).toMatch(/breaks\s*:\s*false/);
    expect(options).not.toMatch(/html['"]?\s*:\s*true/);
  });

  it('also disables the html and typographer rules explicitly, and enables, uses and configures nothing else', () => {
    expect(parse).toMatch(/md\.disable\(\[\s*'html_block',\s*'html_inline',\s*'replacements',\s*'smartquotes'\s*\]\)/);
    expect(parse).not.toMatch(/\.(use|enable|set)\(/);
    expect(parse).not.toMatch(/\.render(Inline)?\(/);
    expect(parse).not.toMatch(/validateLink/);
  });

  it('behaves as the configuration says: raw HTML is text, never an html token', () => {
    const types = parseTokens('<b>x</b>')[1]?.children?.map((child) => child.type) ?? [];
    expect(types).toEqual(['text']);
  });
});

describe('render.ts, read as source (the templates only)', () => {
  const render = code(sources['../src/logic/markdown/render.ts'] ?? '');
  const templates = Array.from(render.matchAll(/html`([^`]*)`/g)).map((match) => match[1] ?? '');
  const BAD = [/href/i, /src\s*=/i, /<img/i, /<picture/i, /<svg/i, /<script/i, /<style/i, /<iframe/i, /srcdoc/i, /\sclass\s*=/i, /\sstyle\s*=/i, /\son[a-z]+\s*=/i, /\s[.?][a-z]/i, /<template/i, /<slot/i];

  it('has templates to read (positive control: the extraction found them, and the pattern list flags a hostile sample)', () => {
    expect(templates.length).toBeGreaterThan(15);
    for (const sample of ['<a href="x">', '<img src=x>', '<p .innerHTML=${x}>', '<p onclick="x">', '<p class="x">']) {
      expect(BAD.some((pattern) => pattern.test(sample)), sample).toBe(true);
    }
  });

  it('writes no href, src, img, class, style, event attribute, property or boolean binding in any template', () => {
    const offenders = templates.filter((template) => BAD.some((pattern) => pattern.test(template)));
    expect(offenders).toEqual([]);
  });

  it('never reaches for innerHTML, unsafeHTML, DOMParser or a template element, and imports only lit and the defaults and types', () => {
    expect(render).not.toMatch(/innerHTML|outerHTML|unsafeHTML|unsafeSVG|DOMParser|createContextualFragment|insertAdjacent|setHTML/);
    const imports = Array.from(render.matchAll(/from\s+'([^']+)'/g)).map((match) => match[1]);
    expect(imports).toEqual(['lit', '../../defaults/index.js', './links.js', './model.js']);
  });

  it('does not appear in the pure surface: index.ts neither imports nor re-exports render.ts or parse.ts', () => {
    const index = code(sources['../src/logic/markdown/index.ts'] ?? '');
    expect(index).not.toMatch(/render\.js|parse\.js/);
  });
});
