import { describe, expect, expectTypeOf, it } from 'vitest';
import { contentJson, contentMarkdown } from '../src/contract/fixtures.generated.js';
import { makeLargeMarkdown, makeLongLine, makeOverBudgetMarkdown } from '../src/contract/bulk.js';
import { MARKDOWN_BUDGET, MARKDOWN_MEDIA_TYPE, type MarkdownBudget } from '../src/defaults/index.js';
import type { MarkdownOutcome } from '../src/logic/artifact-types.js';
import { measureTokens } from '../src/logic/markdown/budget.js';
import { buildMarkdownModel, buildModelFromTokens, markdownFor, type Block, type MarkdownResult } from '../src/logic/markdown/model.js';
import { parseTokens } from '../src/logic/markdown/parse.js';

function ok(source: string, budget?: MarkdownBudget): Block[] {
  const result = buildMarkdownModel(source, budget);
  if (result.kind !== 'ok') throw new Error(`expected ok, got ${result.reason}`);
  return result.blocks;
}

const text = (t: string) => ({ kind: 'text', text: t });

describe('buildMarkdownModel: the token-to-node table', () => {
  it('maps headings, paragraphs, rules and code (fence and indented alike, the info string dropped)', () => {
    expect(ok('# One\n\n###### Six\n\npara\n\n---\n\n```js\ncode\n```\n\n    indented\n')).toEqual([
      { kind: 'heading', level: 1, inline: [text('One')] },
      { kind: 'heading', level: 6, inline: [text('Six')] },
      { kind: 'paragraph', inline: [text('para')] },
      { kind: 'rule' },
      { kind: 'code', text: 'code\n' },
      { kind: 'code', text: 'indented\n' },
    ]);
  });

  it('maps every inline node, including a reference link, a hard break and a soft break', () => {
    expect(ok('a *e* **s** ~~d~~ `c` [l](x.md)\nsoft  \nhard')).toEqual([
      {
        kind: 'paragraph',
        inline: [
          text('a '),
          { kind: 'emphasis', children: [text('e')] },
          text(' '),
          { kind: 'strong', children: [text('s')] },
          text(' '),
          { kind: 'strike', children: [text('d')] },
          text(' '),
          { kind: 'code', text: 'c' },
          text(' '),
          { kind: 'link', destination: 'x.md', children: [text('l')] },
          { kind: 'softbreak' },
          text('soft'),
          { kind: 'hardbreak' },
          text('hard'),
        ],
      },
    ]);
    expect(ok('[a][r]\n\n[r]: y.md "T"')).toEqual([{ kind: 'paragraph', inline: [{ kind: 'link', destination: 'y.md', children: [text('a')] }] }]);
    expect(ok('[^1]\n\n[^1]: n')).toEqual([{ kind: 'paragraph', inline: [{ kind: 'link', destination: 'n', children: [text('^1')] }] }]);
  });

  it('never reads a link title attribute, and reads the destination by name', () => {
    const [block] = ok('[l](x.md "the document title")');
    expect(JSON.stringify(block)).not.toContain('the document title');
  });

  it('maps blockquotes, nested lists with the ordered start, tight and loose items', () => {
    expect(ok('> q\n> > inner')).toEqual([
      { kind: 'quote', blocks: [{ kind: 'paragraph', inline: [text('q')] }, { kind: 'quote', blocks: [{ kind: 'paragraph', inline: [text('inner')] }] }] },
    ]);
    expect(ok('3. a\n4. b\n   - c\n')).toEqual([
      {
        kind: 'list',
        ordered: true,
        start: 3,
        items: [
          [{ kind: 'paragraph', inline: [text('a')] }],
          [{ kind: 'paragraph', inline: [text('b')] }, { kind: 'list', ordered: false, start: 1, items: [[{ kind: 'paragraph', inline: [text('c')] }]] }],
        ],
      },
    ]);
    expect(ok('1. only')).toEqual([{ kind: 'list', ordered: true, start: 1, items: [[{ kind: 'paragraph', inline: [text('only')] }]] }]);
  });

  it('clamps an ordered start outside 0..999999999 to 1 and keeps 0 and the maximum', () => {
    const start = (source: string): number => (ok(source)[0] as { start: number }).start;
    expect(start('0. a')).toBe(0);
    expect(start('999999999. a')).toBe(999999999);
    // markdown-it itself stops at nine digits, so ten digits are a paragraph, not a list
    expect(ok('1000000000. a')[0]?.kind).toBe('paragraph');
    expect(start('7. a')).toBe(7);
  });

  it('maps a table with exact alignment and position, counting tables in document order, nested ones too', () => {
    const blocks = ok(
      '| a | b | c | d |\n|:-|:-:|-:|-|\n| 1 | 2 | 3 | 4 |\n| *5* |   |   |   |\n\ntext\n\n> | x |\n> |---|\n> | y |\n\n- | z |\n  |---|\n  | w |\n',
    );
    const first = blocks[0] as Extract<Block, { kind: 'table' }>;
    expect(first.kind).toBe('table');
    expect(first.align).toEqual(['left', 'center', 'right', 'none']);
    expect(first.head).toEqual([[text('a')], [text('b')], [text('c')], [text('d')]]);
    expect(first.rows.length).toBe(2);
    expect(first.rows[1]?.[0]).toEqual([{ kind: 'emphasis', children: [text('5')] }]);
    expect(first.rows[1]?.[1]).toEqual([]);
    expect(first.position).toEqual({ index: 1, total: 3 });
    const quoted = (blocks[2] as { blocks: Block[] }).blocks[0] as Extract<Block, { kind: 'table' }>;
    expect(quoted.position).toEqual({ index: 2, total: 3 });
    const listed = (blocks[3] as { items: Block[][] }).items[0]?.[0] as Extract<Block, { kind: 'table' }>;
    expect(listed.position).toEqual({ index: 3, total: 3 });
  });

  it('gives an image its flattened alt text, truncated, and its destination', () => {
    expect(ok('![a *b* `c` ![n](i.png) [l](x.md)\nd](r.png)')).toEqual([
      { kind: 'paragraph', inline: [{ kind: 'image', alt: 'a b c n l d', destination: 'r.png' }] },
    ]);
    expect(ok('![](r.png)')).toEqual([{ kind: 'paragraph', inline: [{ kind: 'image', alt: '', destination: 'r.png' }] }]);
    const long = ok(`![${'w'.repeat(2000)}](r.png)`, { ...MARKDOWN_BUDGET, maxLineChars: 5000 });
    expect((long[0] as { inline: Array<{ alt: string }> }).inline[0]?.alt).toBe('w'.repeat(MARKDOWN_BUDGET.maxAltChars));
  });

  it('keeps raw HTML, a script tag, entities and escapes as plain text (positive control for html: false)', () => {
    expect(ok('<script>alert(1)</script>')).toEqual([{ kind: 'paragraph', inline: [text('<script>alert(1)</script>')] }]);
    expect(ok('<div>x</div>\n\n&lt;b&gt; \\*s\\* &#106;avascript:')).toEqual([
      { kind: 'paragraph', inline: [text('<div>x</div>')] },
      { kind: 'paragraph', inline: [text('<b> *s* javascript:')] },
    ]);
  });

  it('turns a blocked-scheme link into its literal source text (layer 1, A-8a) and keeps a surviving one a link', () => {
    expect(ok('[x](javascript:1)')).toEqual([{ kind: 'paragraph', inline: [text('[x](javascript:1)')] }]);
    expect(ok('[x](data:image/png;base64,AAA)')).toEqual([
      { kind: 'paragraph', inline: [{ kind: 'link', destination: 'data:image/png;base64,AAA', children: [text('x')] }] },
    ]);
  });

  it('is deterministic and returns a fresh tree per call', () => {
    const a = buildMarkdownModel('# a');
    const b = buildMarkdownModel('# a');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

describe('buildMarkdownModel: fallbacks, never a throw', () => {
  it('pre-parse guards end as too-complex', () => {
    expect(buildMarkdownModel('a'.repeat(30000))).toEqual({ kind: 'fallback', reason: 'too-complex' });
    expect(buildMarkdownModel('a'.repeat(MARKDOWN_BUDGET.maxLineChars))).toMatchObject({ kind: 'ok' });
    expect(buildMarkdownModel(`${'a'.repeat(100)}\n`.repeat(2800))).toEqual({ kind: 'fallback', reason: 'too-complex' });
    expect(`${'a'.repeat(100)}\n`.repeat(2800).length).toBeGreaterThan(MARKDOWN_BUDGET.maxSourceChars);
  });

  it('an unknown token type is an error fallback (html_block, a future type), positive control: the same stream without it is ok', () => {
    const tokens = parseTokens('para');
    expect(buildModelFromTokens(tokens, MARKDOWN_BUDGET).kind).toBe('ok');
    const plant = (type: string) => [{ type, tag: '', content: '<div>', level: 0, nesting: 0, attrs: null, children: null }];
    let ran = 0;
    for (const type of ['html_block', 'html_inline', 'footnote_ref', 'made_up']) {
      expect(buildModelFromTokens(plant(type) as never, MARKDOWN_BUDGET), type).toEqual({ kind: 'fallback', reason: 'error' });
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('an exception, including a RangeError, anywhere in the build is an error fallback', () => {
    const hostile = [
      {
        type: 'paragraph_open',
        tag: 'p',
        content: '',
        level: 0,
        nesting: 1,
        attrs: null,
        get children(): never {
          throw new RangeError('Maximum call stack size exceeded');
        },
      },
    ];
    expect(buildModelFromTokens(hostile as never, MARKDOWN_BUDGET)).toEqual({ kind: 'fallback', reason: 'error' });
  });

  it('an unbalanced token stream is an error fallback', () => {
    const open = [{ type: 'blockquote_open', tag: 'blockquote', content: '', level: 0, nesting: 1, attrs: null, children: null }];
    expect(buildModelFromTokens(open as never, MARKDOWN_BUDGET)).toEqual({ kind: 'fallback', reason: 'error' });
    const close = [{ type: 'blockquote_close', tag: 'blockquote', content: '', level: 0, nesting: -1, attrs: null, children: null }];
    expect(buildModelFromTokens(close as never, MARKDOWN_BUDGET)).toEqual({ kind: 'fallback', reason: 'error' });
  });
});

function nestedInline(depth: number): string {
  const marks = ['*', '**', '~~'];
  const opens: string[] = [];
  const closes: string[] = [];
  for (let i = 0; i < depth; i += 1) {
    const mark = marks[i % 3] ?? '*';
    opens.push(`${mark}a `);
    closes.unshift(` a${mark}`);
  }
  return `${opens.join('')}x${closes.join('')}`;
}

describe('buildMarkdownModel: the budget over the flattened stream', () => {
  it('a nested INLINE document at the depth limit is a model, one level deeper is a budget fallback', () => {
    let lastOk = 0;
    let firstFallback = 0;
    let ran = 0;
    for (let depth = 1; depth <= 40; depth += 1) {
      const result = buildMarkdownModel(nestedInline(depth));
      ran += 1;
      if (result.kind === 'ok') lastOk = depth;
      else if (firstFallback === 0) {
        firstFallback = depth;
        expect(result).toEqual({ kind: 'fallback', reason: 'budget' });
      }
    }
    expect(ran).toBe(40);
    expect(firstFallback).toBe(lastOk + 1);
    expect(lastOk).toBeGreaterThan(5);
    expect(lastOk).toBeLessThan(25);
    expect(buildMarkdownModel(nestedInline(25))).toEqual({ kind: 'fallback', reason: 'budget' });
  });

  it('exactly maxDepth renders and one less falls back, by measured depth, for block quotes and inline nesting', () => {
    let ran = 0;
    for (const source of ['> '.repeat(8) + 'text', nestedInline(8)]) {
      const { depth } = measureTokens(parseTokens(source));
      expect(buildMarkdownModel(source, { ...MARKDOWN_BUDGET, maxDepth: depth }).kind).toBe('ok');
      expect(buildMarkdownModel(source, { ...MARKDOWN_BUDGET, maxDepth: depth - 1 })).toEqual({ kind: 'fallback', reason: 'budget' });
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('nested inline emphasis 40,000 deep: too-complex on the default budget, a budget fallback once the line guards are lifted', () => {
    const source = nestedInline(40000);
    expect(buildMarkdownModel(source)).toEqual({ kind: 'fallback', reason: 'too-complex' });
    const lifted: MarkdownBudget = { ...MARKDOWN_BUDGET, maxSourceChars: source.length, maxLineChars: source.length };
    const stats = measureTokens(parseTokens(source));
    expect(stats.depth).toBeGreaterThan(30000);
    expect(buildMarkdownModel(source, lifted)).toEqual({ kind: 'fallback', reason: 'budget' });
  });

  it('nested block quotes past maxDepth, and past markdown-it nesting limit of 100, are a budget fallback', () => {
    expect(buildMarkdownModel('> '.repeat(30) + 'x')).toEqual({ kind: 'fallback', reason: 'budget' });
    expect(buildMarkdownModel('> '.repeat(300) + 'x')).toEqual({ kind: 'fallback', reason: 'budget' });
    expect(buildMarkdownModel('> '.repeat(3) + 'x').kind).toBe('ok');
    expect(buildMarkdownModel(`${'- '.repeat(1)}${'  '.repeat(0)}x`).kind).toBe('ok');
  });

  it('more inline tokens than maxTokens in ONE paragraph is a budget fallback, with the node limit lifted to isolate the token limit', () => {
    const lines = 37501;
    const source = Array.from({ length: lines }, () => '*a*').join('\n');
    const tokens = measureTokens(parseTokens(source)).tokens;
    expect(tokens).toBeGreaterThan(MARKDOWN_BUDGET.maxTokens);
    const noNodeLimit: MarkdownBudget = { ...MARKDOWN_BUDGET, maxNodes: 1_000_000 };
    expect(buildMarkdownModel(source, noNodeLimit)).toEqual({ kind: 'fallback', reason: 'budget' });
    const small = Array.from({ length: 1000 }, () => '*a*').join('\n');
    expect(buildMarkdownModel(small, noNodeLimit).kind).toBe('ok');
    expect(parseTokens(source).filter((t) => t.type === 'inline').length).toBe(1);
  });

  it('an unclosed bracket line over maxLineChars is caught before the parse, with 4 flattened tokens', () => {
    const source = `${'['.repeat(30000)}`;
    expect(measureTokens(parseTokens(source)).tokens).toBeLessThan(10);
    expect(buildMarkdownModel(source)).toEqual({ kind: 'fallback', reason: 'too-complex' });
  });

  it('a table past maxTableCells is a budget fallback, at the limit it renders', () => {
    const row = (cells: number) => `|${' x |'.repeat(cells)}`;
    const table = (rows: number, cells: number) => `${row(cells)}\n|${'---|'.repeat(cells)}\n${Array.from({ length: rows }, () => row(cells)).join('\n')}`;
    const tight: MarkdownBudget = { ...MARKDOWN_BUDGET, maxTableCells: 12 };
    expect(buildMarkdownModel(table(2, 4), tight).kind).toBe('ok');
    expect(buildMarkdownModel(table(3, 4), tight)).toEqual({ kind: 'fallback', reason: 'budget' });
  });

  it('at the ruled maxTableCells a real table renders and one cell more is a budget fallback', () => {
    const cells = (count: number) => {
      const head = '| h0 | h1 | h2 | h3 | h4 |\n| --- | --- | --- | --- | --- |';
      const rows = Array.from({ length: Math.ceil((count - 5) / 5) }, (_, at) => {
        const width = Math.min(5, count - 5 - at * 5);
        return `| ${Array.from({ length: 5 }, (_, i) => (i < width ? 'c' : '')).join(' | ')} |`;
      });
      return [head, ...rows].join('\n');
    };
    expect(MARKDOWN_BUDGET.maxTableCells).toBe(32000);
    expect(buildMarkdownModel(cells(32000)).kind).toBe('ok');
    expect(buildMarkdownModel(cells(32001))).toEqual({ kind: 'fallback', reason: 'budget' });
    expect(new TextEncoder().encode(cells(32001)).length).toBeLessThan(262144);
  });

  it('a text run past maxTextRun is a budget fallback, never split', () => {
    const tight: MarkdownBudget = { ...MARKDOWN_BUDGET, maxTextRun: 50 };
    expect(buildMarkdownModel('a'.repeat(50), tight).kind).toBe('ok');
    expect(buildMarkdownModel('a'.repeat(51), tight)).toEqual({ kind: 'fallback', reason: 'budget' });
  });

  it('is deterministic over the same hostile input (no state leaks between calls)', () => {
    const source = nestedInline(30);
    expect(buildMarkdownModel(source)).toEqual(buildMarkdownModel(source));
    expect(buildMarkdownModel('ok').kind).toBe('ok');
  });
});

describe('the pinned branch per fixture generator', () => {
  it('makeLargeMarkdown at 256 KiB resolves to ok with blocks above 0', () => {
    const result = buildMarkdownModel(makeLargeMarkdown(262144, 'kitty-specs/large/doc.md').content);
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') expect(result.blocks.length).toBeGreaterThan(0);
  });

  it('makeOverBudgetMarkdown resolves to a fallback with the reason budget', () => {
    const over = makeOverBudgetMarkdown('kitty-specs/large/over.md');
    expect(buildMarkdownModel(over.content)).toEqual({ kind: 'fallback', reason: 'budget' });
    // Both properties pinned, so the generator cannot drift under the limit or over the size cap unnoticed.
    expect(new TextEncoder().encode(over.content).length).toBeLessThanOrEqual(262144);
    expect(measureTokens(parseTokens(over.content)).tokens).toBeGreaterThan(MARKDOWN_BUDGET.maxTokens);
  });

  it('makeLongLine resolves to the too-complex fallback', () => {
    expect(buildMarkdownModel(makeLongLine(262144, 'kitty-specs/large/long.md').content)).toEqual({ kind: 'fallback', reason: 'too-complex' });
  });
});

describe('the model with and without an explicit budget', () => {
  it('uses MARKDOWN_BUDGET by default and the given budget otherwise (positive control: the same source flips)', () => {
    const source = '> '.repeat(3) + 'x';
    expect(buildMarkdownModel(source).kind).toBe('ok');
    expect(buildMarkdownModel(source, MARKDOWN_BUDGET)).toEqual(buildMarkdownModel(source));
    expect(buildMarkdownModel(source, { ...MARKDOWN_BUDGET, maxDepth: 2 })).toEqual({ kind: 'fallback', reason: 'budget' });
  });
});

describe('markdownFor: the one decision to parse', () => {
  const markdown = { ...contentMarkdown, mediaType: MARKDOWN_MEDIA_TYPE };

  it('is null for no content and for every non-markdown media type, and never parses them', () => {
    const before = parseTokens.calls;
    expect(markdownFor(null)).toBeNull();
    expect(markdownFor(contentJson)).toBeNull();
    expect(markdownFor({ ...markdown, mediaType: 'text/plain' })).toBeNull();
    expect(markdownFor({ ...markdown, mediaType: 'TEXT/MARKDOWN' })).toBeNull();
    expect(parseTokens.calls).toBe(before);
  });

  it('builds the model of the content for the markdown media type, with one parse per call', () => {
    const before = parseTokens.calls;
    const result = markdownFor(markdown);
    expect(parseTokens.calls).toBe(before + 1);
    expect(result).toEqual(buildMarkdownModel(markdown.content));
    expect(result?.kind).toBe('ok');
  });

  it('reads the media type and the budget of an explicit vocabulary, completing it per group', () => {
    const custom = { ...markdown, mediaType: 'text/x-notes' };
    expect(markdownFor(custom)).toBeNull();
    expect(markdownFor(custom, { mediaType: 'text/x-notes' })).toEqual(buildMarkdownModel(markdown.content));
    expect(markdownFor(markdown, { mediaType: 'text/x-notes' })).toBeNull();
    expect(markdownFor(markdown, {})).toEqual(buildMarkdownModel(markdown.content));
    expect(markdownFor(markdown, null)).toEqual(buildMarkdownModel(markdown.content));
    const tight: MarkdownBudget = { ...MARKDOWN_BUDGET, maxTokens: 2 };
    expect(markdownFor(markdown, { budget: tight })).toEqual({ kind: 'fallback', reason: 'budget' });
    expect(markdownFor(markdown, { budget: null })?.kind).toBe('ok');
  });
});

describe('the structural seam of WP03', () => {
  it('MarkdownResult satisfies MarkdownOutcome, and a call of markdownFor is accepted where the resolver wants one', () => {
    expectTypeOf<MarkdownResult>().toExtend<MarkdownOutcome>();
    expectTypeOf<ReturnType<typeof markdownFor>>().toExtend<MarkdownOutcome | null>();
    const outcome: MarkdownOutcome | null = markdownFor(null);
    expect(outcome).toBeNull();
    const result: MarkdownOutcome = buildMarkdownModel('x');
    expect(result.kind).toBe('ok');
  });
});
