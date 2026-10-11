import { describe, expect, it } from 'vitest';
import { MARKDOWN_BUDGET, type MarkdownBudget } from '../src/defaults/index.js';
import { checkSource, checkTokens, measureTokens } from '../src/logic/markdown/budget.js';
import { parseTokens } from '../src/logic/markdown/parse.js';

const measure = (source: string) => measureTokens(parseTokens(source));

/** Matched nested emphasis, strong and strike, `depth` levels, closed in reverse. */
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

const nestedQuote = (levels: number): string => `${'> '.repeat(levels)}text`;

describe('measureTokens counts the FLATTENED stream', () => {
  it('counts inline children that the three top-level tokens hide', () => {
    const tokens = parseTokens(nestedInline(30));
    expect(tokens.length).toBe(3);
    const stats = measureTokens(tokens);
    expect(stats.tokens).toBeGreaterThan(100);
    expect(stats.tokens).toBe(3 + (tokens[1]?.children?.length ?? 0));
  });

  it('counts equal numbers for a hand-built document (equality, not a bound)', () => {
    // paragraph_open, inline, paragraph_close; the inline holds text, softbreak, text
    expect(measure('a\nb')).toMatchObject({ tokens: 3 + 3, nodes: 2 + 3, tableCells: 0, maxTextRun: 1 });
    // a table of 2x2 cells
    expect(measure('| a | b |\n|---|---|\n| c | d |')).toMatchObject({ tableCells: 4 });
    expect(measure('x'.repeat(77))).toMatchObject({ maxTextRun: 77 });
  });

  it('gives a flat paragraph a small depth and a nested one a large depth (positive control)', () => {
    const flat = measure('plain text').depth;
    expect(flat).toBeLessThan(5);
    expect(measure(nestedInline(30)).depth).toBeGreaterThan(30);
    expect(measure(nestedQuote(30)).depth).toBeGreaterThan(29);
  });

  it('counts the children of an image token as well (alt text nests)', () => {
    const flat = measure('![a](x.png)');
    const nested = measure('![![![b](y.png)](y.png)](x.png)');
    expect(nested.tokens).toBeGreaterThan(flat.tokens);
    expect(nested.depth).toBeGreaterThanOrEqual(flat.depth);
  });
});

describe('checkTokens boundaries', () => {
  it('accepts a document at exactly maxDepth and refuses one level deeper, for block and for inline nesting', () => {
    let ran = 0;
    for (const source of [nestedQuote(10), nestedInline(10)]) {
      const stats = measure(source);
      const at: MarkdownBudget = { ...MARKDOWN_BUDGET, maxDepth: stats.depth };
      const below: MarkdownBudget = { ...MARKDOWN_BUDGET, maxDepth: stats.depth - 1 };
      expect(checkTokens(stats, at)).toBe('ok');
      expect(checkTokens(stats, below)).toBe('budget');
      ran += 1;
    }
    expect(ran).toBe(2);
  });

  it('refuses each limit by exactly one', () => {
    const stats = { tokens: 10, nodes: 8, depth: 4, tableCells: 3, maxTextRun: 6 };
    const exact: MarkdownBudget = { ...MARKDOWN_BUDGET, maxTokens: 10, maxNodes: 8, maxDepth: 4, maxTableCells: 3, maxTextRun: 6 };
    expect(checkTokens(stats, exact)).toBe('ok');
    const cases: Array<[string, Partial<MarkdownBudget>]> = [
      ['maxTokens', { maxTokens: 9 }],
      ['maxNodes', { maxNodes: 7 }],
      ['maxDepth', { maxDepth: 3 }],
      ['maxTableCells', { maxTableCells: 2 }],
      ['maxTextRun', { maxTextRun: 5 }],
    ];
    for (const [name, change] of cases) expect(checkTokens(stats, { ...exact, ...change }), name).toBe('budget');
    expect(cases.length).toBe(5);
  });
});

describe('checkSource: the pre-parse guards', () => {
  it('accepts a source of exactly maxSourceChars and refuses one more', () => {
    const budget: MarkdownBudget = { ...MARKDOWN_BUDGET, maxSourceChars: 100, maxLineChars: 1000 };
    expect(checkSource(`${'a\n'.repeat(49)}ab`, budget)).toBe('ok');
    expect(`${'a\n'.repeat(49)}ab`.length).toBe(100);
    expect(checkSource(`${'a\n'.repeat(49)}abc`, budget)).toBe('too-complex');
  });

  it('accepts a line of exactly maxLineChars and refuses one more, for every line break form', () => {
    const budget: MarkdownBudget = { ...MARKDOWN_BUDGET, maxLineChars: 10 };
    let ran = 0;
    for (const newline of ['\n', '\r', '\r\n']) {
      expect(checkSource(`${'a'.repeat(10)}${newline}${'b'.repeat(10)}`, budget), JSON.stringify(newline)).toBe('ok');
      expect(checkSource(`ab${newline}${'b'.repeat(11)}`, budget), JSON.stringify(newline)).toBe('too-complex');
      expect(checkSource(`${'a'.repeat(11)}${newline}b`, budget), JSON.stringify(newline)).toBe('too-complex');
      ran += 1;
    }
    expect(ran).toBe(3);
  });

  it('refuses an unbroken 256 KiB line under the default budget', () => {
    expect(checkSource('a'.repeat(262144), MARKDOWN_BUDGET)).toBe('too-complex');
    expect(checkSource('a'.repeat(20000), MARKDOWN_BUDGET)).toBe('ok');
  });
});
