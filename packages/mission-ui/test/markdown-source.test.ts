import { describe, expect, it } from 'vitest';

// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

/** The file text without line comments and block comments, so prose that names a rule is not a use of it. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('source scan of packages/mission-ui/src', () => {
  it('scans a non-trivial set of files (positive control for the glob)', () => {
    const names = Object.keys(sources);
    expect(names.length).toBeGreaterThan(50);
    expect(names).toContain('../src/logic/markdown/parse.ts');
  });

  it('imports markdown-it from parse.ts alone', () => {
    const importers = Object.entries(sources)
      .filter(([, text]) => /from\s+['"]markdown-it(?:[/'"])|import\s*\(\s*['"]markdown-it|require\(\s*['"]markdown-it/.test(code(text)))
      .map(([name]) => name);
    expect(importers).toEqual(['../src/logic/markdown/parse.ts']);
  });

  it('calls .render( or .renderInline( in no file, positive control: the pattern matches a sample call', () => {
    const pattern = /\.render(?:Inline)?\s*\(/;
    expect(pattern.test('md.render(source)')).toBe(true);
    expect(pattern.test('md.renderInline(source)')).toBe(true);
    const offenders = Object.entries(sources)
      .filter(([, text]) => pattern.test(code(text)))
      .map(([name]) => name);
    expect(offenders).toEqual([]);
  });

  it('keeps lit out of the four pure model files', () => {
    const lit = /from\s+['"]lit/;
    const pure = ['parse', 'model', 'links', 'budget'].map((name) => `../src/logic/markdown/${name}.ts`);
    let ran = 0;
    for (const name of pure) {
      expect(sources[name], name).toBeDefined();
      expect(lit.test(code(sources[name] ?? '')), name).toBe(false);
      ran += 1;
    }
    expect(ran).toBe(4);
    expect(lit.test("import { html } from 'lit';")).toBe(true);
  });
});
