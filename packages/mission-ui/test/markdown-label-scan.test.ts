// The cost of an unclosed bracket, asserted on counts and not on time. The library's link and image rules ask `parseLinkLabel`
// for a label at every `[`; when no `]` follows, each ask scans to the end of the inline run, so n brackets cost n squared.
// `parseTokens.labelScans` counts the asks that reach the library's scanner, and `parseTokens.labelEarlyOut` switches the
// early-out on and off so the second half can prove the output identical either way.
import { describe, expect, it } from 'vitest';
import { parseTokens } from '../src/logic/markdown/parse.js';
import { CORPUS } from './support/markdown-corpus-entries.js';

const scansFor = (source: string): number => {
  const before = parseTokens.labelScans;
  parseTokens(source);
  return parseTokens.labelScans - before;
};

const unclosed = (count: number): string => Array.from({ length: count }, () => '[a'.repeat(100)).join('\n');

describe('a bracket with no closing bracket after it costs nothing to scan', () => {
  it('runs no label scan for any number of unclosed brackets', () => {
    expect(scansFor(unclosed(10))).toBe(0);
    expect(scansFor(unclosed(1000))).toBe(0);
  });

  it('runs no label scan for unclosed image openers either', () => {
    expect(scansFor('![a'.repeat(5000))).toBe(0);
  });

  it('still scans when a later bracket closes, so the scan count is bounded by the bracket count', () => {
    const source = `${'[a'.repeat(500)}]`;
    const scans = scansFor(source);
    expect(scans).toBeGreaterThan(0);
    expect(scans).toBeLessThanOrEqual(2 * 500);
  });
});

const EDGE_CASES = [
  '[a](b)',
  '[a][ref]\n\n[ref]: c.md "T"',
  '[a\\]b](c)',
  '[`]`](d)',
  '![x](y)',
  '[[a]](b)',
  '[a\nb\n\nc]',
  '[unclosed\nlater line with ] here',
  '[unclosed\n\nlater paragraph with ] here',
  '[a [b] c](d) and [e',
  '![a [b] c](d) and ![e',
  '*[a*](b) [c',
  '[a](<b c>) [d',
  '<http://x.y/[z> [w',
  '[x]: y\n\n[x] [x',
  '> [quote\n> still ]',
  '- [item\n- other ]',
  '| [a | b |\n|---|---|\n| ] | [c |',
  '\\[a] [b\\]',
  '[a]( b "t" ) ![c]( d ',
];

const stream = (source: string): string => JSON.stringify(parseTokens(source));

describe('the early-out leaves every token stream identical', () => {
  const render = (source: string, earlyOut: boolean): string => {
    parseTokens.labelEarlyOut = earlyOut;
    try {
      return stream(source);
    } finally {
      parseTokens.labelEarlyOut = true;
    }
  };

  it.each(EDGE_CASES.map((source) => [source]))('the link edge case %j', (source) => {
    expect(render(source, true)).toBe(render(source, false));
  });

  it('every corpus entry', { timeout: 300_000 }, () => {
    const differing = CORPUS.filter((entry) => render(entry.source, true) !== render(entry.source, false)).map((entry) => entry.name);
    expect(differing).toEqual([]);
  });
});
