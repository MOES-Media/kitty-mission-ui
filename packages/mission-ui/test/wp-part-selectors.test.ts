// The ::part rules of the Work Package screen, pinned per file (BOUNDARY-001, exception E-22 and the earlier E-18 and E-21 rows):
// a `::part` selector that is not listed here fails, so a new reach into a library element's shadow DOM needs a ruling and an
// entry in contracts/gates.md first. Each file's list is exact: no more and no fewer.
import { describe, expect, it } from 'vitest';

// Vite resolves `import.meta.glob` at build time; this package carries no vite types, so the call is typed here.
type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-work-package-screen/*.ts', { query: '?raw', import: 'default', eager: true });

/** Every selector of a rule whose selector list holds a `::part()`, comments removed, whitespace collapsed, with its declarations. */
function partRules(source: string): Array<{ selector: string; declarations: string[] }> {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: Array<{ selector: string; declarations: string[] }> = [];
  for (const rule of code.matchAll(/([^{}`;]*::part\([^)]*\)[^{}`;]*)\{([^{}]*)\}/g)) {
    const declarations = (rule[2] ?? '')
      .split(';')
      .map((declaration) => declaration.replace(/\s+/g, ' ').trim())
      .filter((declaration) => declaration !== '');
    for (const selector of (rule[1] ?? '').split(',')) {
      const text = selector.replace(/\s+/g, ' ').trim();
      if (text.includes('::part(')) found.push({ selector: text, declarations });
    }
  }
  return found;
}
const partSelectors = (source: string): string[] => partRules(source).map((rule) => rule.selector);

/**
 * Exception rows: E-18 panel-parts, E-21 shared-parts, chain-parts; E-22 header-parts, review-parts, files-parts. Each rule is
 * pinned with its exact declarations (property and value, in source order): a changed or added declaration needs a ruling and
 * an entry in contracts/gates.md first, as a new selector does.
 */
const PINNED: Record<string, Record<string, string[]>> = {
  'chain-parts.ts': {
    '[data-chain] sk-button::part(button)': [
      'box-sizing: border-box',
      'min-width: 0',
      'display: flex',
      'justify-content: flex-start',
      'overflow-wrap: break-word',
      'text-align: start',
    ],
  },
  'files-parts.ts': {
    '[data-files] sk-action-row::part(trigger)': [
      "grid-template-areas: 'marker' 'reference' 'tags'",
      'grid-template-columns: minmax(0, 1fr)',
      'row-gap: 0',
    ],
    '[data-files] sk-action-row::part(title)': ['display: none'],
    '[data-files] sk-action-row::part(metadata)': ['display: none'],
    '[data-files] sk-action-row::part(supporting)': ['display: none'],
    '[data-files] sk-action-row::part(controls)': ['display: none'],
    '[data-files] sk-action-row::part(tags)': ['margin-block: var(--sk-space-2) 0'],
  },
  'header-parts.ts': { '.sk-breadcrumbs__item > sk-button::part(button)': ['padding-inline: var(--sk-space-1)'] },
  'panel-parts.ts': {
    'sk-card::part(card)': ['border-width: var(--sk-border-width-1)', 'border-radius: var(--sk-radius-md)', 'padding: var(--sk-space-5)'],
    'sk-section-header::part(header)': ['row-gap: 0'],
  },
  'review-parts.ts': { '[data-cycles] sk-card::part(card)': ['padding: var(--sk-space-3)'] },
  'shared-parts.ts': {
    'sk-pill-tag::part(tag)': [
      'display: block',
      'box-sizing: border-box',
      'max-width: 100%',
      'overflow: hidden',
      'text-overflow: ellipsis',
      'white-space: nowrap',
    ],
  },
};
/** The selectors alone, in source order. */
const LISTED: Record<string, string[]> = Object.fromEntries(Object.entries(PINNED).map(([name, rules]) => [name, Object.keys(rules)]));

describe('the ::part selectors of the screen files are the listed set (E-18, E-21, E-22)', () => {
  const files = Object.entries(sources).filter(([path]) => !path.endsWith('.stories.ts'));

  it('reads every screen source file, and the extractor sees a rule (positive control) but not a comment', () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
    expect(partSelectors('a::part(x), b > c::part(y) { color: red; }')).toEqual(['a::part(x)', 'b > c::part(y)']);
    expect(partSelectors('/* sk-card::part(card) { } */ // x::part(y) {\n.k { display: block; }')).toEqual([]);
    expect(partRules('a::part(x) { color: red; margin: 0 }')).toEqual([{ selector: 'a::part(x)', declarations: ['color: red', 'margin: 0'] }]);
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

  it('each rule carries exactly its pinned declarations: one more, one fewer or a changed value fails', () => {
    let rules = 0;
    for (const [path, source] of files) {
      const name = path.split('/').pop() as string;
      for (const rule of partRules(source)) {
        expect(rule.declarations, `${name}: ${rule.selector}`).toEqual(PINNED[name]?.[rule.selector]);
        rules += 1;
      }
    }
    expect(rules).toBe(Object.values(PINNED).reduce((sum, file) => sum + Object.keys(file).length, 0));
  });
});
