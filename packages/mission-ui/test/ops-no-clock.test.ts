// FR-018 (NFR-005): the Ops screen reads no clock and draws no relative time. A source scan of the Ops element and the
// Ops logic modules (the `defaults/` copy tables are out of scope): no `Date`, no `.now(`, no `performance.now`, no
// `Intl.RelativeTimeFormat`, no relative-time words. Comments are stripped first, so a doc comment may say "no `Date`".
import { describe, expect, it } from 'vitest';

type Glob = (pattern: string, options: { eager: true; query: '?raw'; import: 'default' }) => Record<string, string>;

const elementFiles = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-ops-screen/*.ts', { eager: true, query: '?raw', import: 'default' });
const logicFiles = (import.meta as unknown as { glob: Glob }).glob('../src/logic/ops-*.ts', { eager: true, query: '?raw', import: 'default' });
const files: Record<string, string> = { ...elementFiles, ...logicFiles };

const EXPECTED_FILE_COUNT = 14;

const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const CLOCK_PATTERNS: readonly [string, RegExp][] = [
  ['Date', /\bDate\b/],
  ['.now(', /\.now\s*\(/],
  ['performance.now', /\bperformance\b/],
  ['Intl.RelativeTimeFormat', /\bRelativeTimeFormat\b/],
  ['"ago"', /\bago\b/i],
  ['"in N minutes"', /\bin\s+\d+\s+(second|minute|hour|day)s?\b/i],
  ['"just now"', /\bjust now\b/i],
];

const violations = (source: string): string[] => CLOCK_PATTERNS.filter(([, re]) => re.test(stripComments(source))).map(([name]) => name);

describe('FR-018: the Ops screen reads no clock', () => {
  it('scans exactly the Ops element and logic files', () => {
    expect(Object.keys(files).length).toBe(EXPECTED_FILE_COUNT);
  });

  it.each(Object.entries(files))('%s holds no clock read and no relative time', (_path, source) => {
    expect(violations(source)).toEqual([]);
  });

  it('positive control: planted clock reads and relative words are detected, comments are not', () => {
    expect(violations('const t = Date.now();')).toEqual(['Date', '.now(']);
    expect(violations('const d = new Date();')).toEqual(['Date']);
    expect(violations('const t = performance.now();')).toEqual(['.now(', 'performance.now']);
    expect(violations('new Intl.RelativeTimeFormat("en")')).toEqual(['Intl.RelativeTimeFormat']);
    expect(violations('const s = "5 minutes ago";')).toEqual(['"ago"']);
    expect(violations('const s = "in 5 minutes";')).toEqual(['"in N minutes"']);
    expect(violations('// Date.now() is banned\n/* new Date() */ const x = 1;')).toEqual([]);
  });
});
