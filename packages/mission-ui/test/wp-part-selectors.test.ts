// The ::part rules of the Work Package screen, pinned per file (BOUNDARY-001, exception E-22 and the earlier E-18 and E-21 rows):
// a `::part` selector that is not listed here fails, so a new reach into a library element's shadow DOM needs a ruling and an
// entry in contracts/gates.md first. Each file's list is exact: no more and no fewer.
import { describe, expect, it } from 'vitest';

// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-work-package-screen/*.ts', { query: '?raw', import: 'default', eager: true });

/** Every selector of a rule whose selector list holds a `::part()`, comments removed, whitespace collapsed. */
function partSelectors(source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: string[] = [];
  for (const rule of code.matchAll(/([^{}`;]*::part\([^)]*\)[^{}`;]*)\{/g)) {
    for (const selector of (rule[1] ?? '').split(',')) {
      const text = selector.replace(/\s+/g, ' ').trim();
      if (text.includes('::part(')) found.push(text);
    }
  }
  return found;
}

/** Exception rows: E-18 panel-parts, E-21 shared-parts, chain-parts; E-22 header-parts, review-parts, files-parts. */
const LISTED: Record<string, string[]> = {
  'chain-parts.ts': ['[data-chain] sk-button::part(button)'],
  'files-parts.ts': [
    '[data-files] sk-action-row::part(trigger)',
    '[data-files] sk-action-row::part(title)',
    '[data-files] sk-action-row::part(metadata)',
    '[data-files] sk-action-row::part(supporting)',
    '[data-files] sk-action-row::part(controls)',
    '[data-files] sk-action-row::part(tags)',
  ],
  'header-parts.ts': ['.sk-breadcrumbs__item > sk-button::part(button)'],
  'panel-parts.ts': ['sk-card::part(card)', 'sk-section-header::part(header)'],
  'review-parts.ts': ['[data-cycles] sk-card::part(card)'],
  'shared-parts.ts': ['sk-pill-tag::part(tag)'],
};

describe('the ::part selectors of the screen files are the listed set (E-18, E-21, E-22)', () => {
  const files = Object.entries(sources).filter(([path]) => !path.endsWith('.stories.ts'));

  it('reads every screen source file, and the extractor sees a rule (positive control) but not a comment', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    expect(partSelectors('a::part(x), b > c::part(y) { color: red; }')).toEqual(['a::part(x)', 'b > c::part(y)']);
    expect(partSelectors('/* sk-card::part(card) { } */ // x::part(y) {\n.k { display: block; }')).toEqual([]);
  });

  it('each file carries exactly its listed selectors; a file with no row carries none', () => {
    let checked = 0;
    for (const [path, source] of files) {
      const name = path.split('/').pop() as string;
      expect(partSelectors(source), name).toEqual(LISTED[name] ?? []);
      checked += 1;
    }
    expect(checked).toBe(files.length);
    expect(Object.keys(LISTED).every((name) => files.some(([path]) => path.endsWith(`/${name}`)))).toBe(true);
  });
});
