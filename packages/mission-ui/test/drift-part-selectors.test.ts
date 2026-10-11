// The ::part rules of the Drift screen, pinned per file (CP-1 addendum at the WP04 review, after #5's wp-part-selectors.test.ts):
// a `::part` selector that is not listed for its file fails, so a new reach into a library element's shadow DOM needs a ruling first.
// The part files are stubs at WP04, so each list is the SET a file MAY use (the selectors the CP-1 grants G-4, G-5, G-7 and E-18 are
// written for); panel-parts.ts is complete and is pinned exactly, declarations included.
import { describe, expect, it } from 'vitest';
import libraryManifest from '@spec-kitty/elements/custom-elements.json';

type Glob = (pattern: string, options: { query: string; import: string; eager: boolean }) => Record<string, string>;
const sources = (import.meta as unknown as { glob: Glob }).glob('../src/elements/sk-drift-screen/*.ts', { query: '?raw', import: 'default', eager: true });

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
/** Every rule of every css`...` block (part or not), for the declarations a grant confines. */
function cssRules(source: string): Array<{ selector: string; declarations: string[] }> {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const found: Array<{ selector: string; declarations: string[] }> = [];
  for (const block of code.matchAll(/css`([^`]*)`/g)) {
    for (const rule of (block[1] ?? '').matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
      const declarations = (rule[2] ?? '').split(';').map((declaration) => declaration.replace(/\s+/g, ' ').trim()).filter((declaration) => declaration !== '');
      found.push({ selector: (rule[1] ?? '').replace(/\s+/g, ' ').trim(), declarations });
    }
  }
  return found;
}
// overflow-wrap: anywhere is also E-39's (long identifiers), so only the keywords G-10 alone grants are confined here.
const WRAP = /^(?:white-space|word-break)\b/;
const wrapLeaks = (name: string, source: string): string[] =>
  cssRules(source).filter((rule) => rule.declarations.some((declaration) => WRAP.test(declaration))).map((rule) => `${name} ${rule.selector}`);
const partSelectors = (source: string): string[] => partRules(source).map((rule) => rule.selector);

/** The selectors each file may use. A file with no row may use none. */
const ALLOWED: Record<string, string[]> = {
  'header-parts.ts': ['sk-page-header::part(header)', 'sk-page-header::part(text)', 'sk-page-header::part(meta)', 'sk-button[data-rescan]::part(button)', 'sk-button[data-rescan][busy]::part(button)'],
  'list-parts.ts': ["[data-region='list'] sk-pill-tag::part(tag)", "[data-region='detail'] sk-pill-tag::part(tag)"],
  'detail-parts.ts': ['sk-pill-tag[data-authority]::part(tag)', 'sk-button[data-mission-link]::part(button)'],
  'resolution-parts.ts': ['sk-button[data-copy]::part(button)'],
  'panel-parts.ts': ['sk-card::part(card)', 'sk-section-header::part(header)'],
};
/** panel-parts.ts is complete: its rules are pinned with their exact declarations (E-18 extension). */
const PANEL_PINNED: Record<string, string[]> = {
  'sk-card::part(card)': ['border-width: var(--sk-border-width-1)', 'border-radius: var(--sk-radius-md)', 'padding: var(--sk-space-5)'],
  'sk-section-header::part(header)': ['row-gap: 0'],
};
const FILES = ['sk-drift-screen.ts', 'header-parts.ts', 'list-parts.ts', 'state-parts.ts', 'detail-parts.ts', 'table-parts.ts', 'resolution-parts.ts', 'panel-parts.ts'];

const files = Object.entries(sources).filter(([path]) => !path.endsWith('.stories.ts') && !path.endsWith('fixtures.ts'));
const nameOf = (path: string): string => path.split('/').pop() as string;

describe('the ::part selectors of the Drift files stay inside the listed sets', () => {
  it('reads exactly the eight files, and the extractor sees a rule (positive control) but not a comment', () => {
    expect(files.map(([path]) => nameOf(path)).sort()).toEqual([...FILES].sort());
    expect(files).toHaveLength(8);
    expect(partSelectors('a::part(x), b > c::part(y) { color: red; }')).toEqual(['a::part(x)', 'b > c::part(y)']);
    expect(partSelectors('/* sk-card::part(card) { } */ // x::part(y) {\n.k { display: block; }')).toEqual([]);
  });

  it('no file uses a selector outside its set; a file with no row uses none', () => {
    let checked = 0;
    for (const [path, source] of files) {
      const name = nameOf(path);
      for (const selector of partSelectors(source)) expect(ALLOWED[name] ?? [], `${name}: ${selector}`).toContain(selector);
      checked += 1;
    }
    expect(checked).toBe(8);
  });

  it('panel-parts.ts carries exactly its two rules with their exact declarations', () => {
    const source = files.find(([path]) => nameOf(path) === 'panel-parts.ts')?.[1] ?? '';
    const rules = partRules(source);
    expect(rules.map((rule) => rule.selector)).toEqual(Object.keys(PANEL_PINNED));
    for (const rule of rules) expect(rule.declarations, rule.selector).toEqual(PANEL_PINNED[rule.selector]);
    expect(rules).toHaveLength(2);
  });

  // E-37 G-10: white-space is granted for the authority pill's part only (overflow-wrap is not confined: E-39 uses it too). The general pill rule (G-4) never carries it.
  it('G-10: white-space appears only in the authority pill rule of detail-parts.ts, which holds exactly the two declarations (overflow-wrap is shared with E-39)', () => {
    const wrapping: string[] = [];
    for (const [path, source] of files) wrapping.push(...wrapLeaks(nameOf(path), source));
    expect(wrapping).toEqual(['detail-parts.ts sk-pill-tag[data-authority]::part(tag)']);
    const detail = files.find(([path]) => nameOf(path) === 'detail-parts.ts')?.[1] ?? '';
    const rule = partRules(detail).find((candidate) => candidate.selector === 'sk-pill-tag[data-authority]::part(tag)');
    expect(rule?.declarations).toEqual(['white-space: normal', 'overflow-wrap: anywhere']);
    // the check sees a leak: the same declarations on the unscoped pill selector
    const leaked = partRules('sk-pill-tag::part(tag) { white-space: normal; }').filter((candidate) => candidate.declarations.some((declaration) => declaration.startsWith('white-space')));
    expect(leaked).toHaveLength(1);
    // the all-rules scan sees a leak on a non-part selector, in the grant's own file and in another
    expect(wrapLeaks('detail-parts.ts', 'const s = css`[data-kicker] { white-space: normal; }`;')).toEqual(['detail-parts.ts [data-kicker]']);
    expect(wrapLeaks('list-parts.ts', 'const s = css`.x { white-space: normal; }`;')).toEqual(['list-parts.ts .x']);
  });

  it('a planted leak is caught: an unlisted selector, a selector in a file with no row and a changed declaration (positive controls above)', () => {
    const plants: Array<[string, string]> = [
      ['header-parts.ts', 'sk-card::part(card) { padding: 0 }'],
      ['state-parts.ts', 'sk-button::part(button) { padding: 0 }'],
      ['table-parts.ts', 'sk-pill-tag::part(tag) { padding: 0 }'],
      ['list-parts.ts', 'sk-button::part(button) { padding: 0 }'],
      // The unscoped form hits every sk-button of the shared shadow root (the Mission link): refused in the three files that scope it.
      ['header-parts.ts', 'sk-button::part(button) { padding: 0 }'],
      ['resolution-parts.ts', 'sk-button::part(button) { padding: 0 }'],
      ['detail-parts.ts', 'sk-button::part(button) { padding: 0 }'],
      // and a scoped form for another control is refused too
      ['resolution-parts.ts', 'sk-button[data-mission-link]::part(button) { padding: 0 }'],
    ];
    let caught = 0;
    for (const [name, source] of plants) {
      const leaked = partSelectors(source).filter((selector) => !(ALLOWED[name] ?? []).includes(selector));
      expect(leaked, name).toHaveLength(1);
      caught += 1;
    }
    expect(caught).toBe(8);
    const changed = partRules('sk-card::part(card) { padding: var(--sk-space-7) }');
    expect(changed[0]?.declarations).not.toEqual(PANEL_PINNED['sk-card::part(card)']);
    // the listed selectors themselves pass the same check
    expect(partSelectors('sk-button[data-rescan]::part(button) { padding: 0 }').filter((s) => !(ALLOWED['header-parts.ts'] ?? []).includes(s))).toEqual([]);
  });
});

interface ManifestShape {
  modules: Array<{ declarations?: Array<{ tagName?: string; cssParts?: Array<{ name: string }> }> }>;
}

describe('every listed ::part names a part the library element declares', () => {
  it('each ::part(name) of an allowed selector exists in the cssParts of its element', () => {
    const parts = new Map<string, Set<string>>();
    for (const module of (libraryManifest as unknown as ManifestShape).modules) {
      for (const declaration of module.declarations ?? []) {
        if (declaration.tagName !== undefined) parts.set(declaration.tagName, new Set((declaration.cssParts ?? []).map((part) => part.name)));
      }
    }
    expect(parts.get('sk-button')?.has('no-such-part')).toBe(false);
    let checked = 0;
    for (const [file, selectors] of Object.entries(ALLOWED)) {
      for (const selector of selectors) {
        const match = /(sk-[a-z-]+)(?:\[[a-z-]+\])*::part\(([^)]+)\)$/.exec(selector);
        expect(match, `${file}: ${selector}`).not.toBeNull();
        const [, tag, part] = match as RegExpExecArray;
        expect(parts.get(tag as string)?.has(part as string), `${file}: ${selector}`).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBe(12);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------
// Confinement (pre-merge squad BOUNDARY-004, BOUNDARY-006): a part file's rules apply to the whole shadow root of the screen, so a
// rule may only reach markup that its own file draws. Each case below is a rule that once reached another part's markup.
// ---------------------------------------------------------------------------------------------------------------------------
const sourceOf = (name: string): string => files.find(([path]) => nameOf(path) === name)?.[1] ?? '';
/** The CSS of a file (the `css` template literals) and its markup (everything else), comments removed. */
function split(name: string): { css: string; markup: string } {
  const code = sourceOf(name).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const cssParts = [...code.matchAll(/css`([\s\S]*?)`;/g)].map((match) => match[1] ?? '');
  return { css: cssParts.join('\n'), markup: code.replace(/css`[\s\S]*?`;/g, '') };
}
/** The selectors (comma-separated parts) of the rules whose selector mentions `needle`. */
function selectorsMentioning(css: string, needle: string): string[] {
  const found: string[] = [];
  for (const rule of css.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    for (const selector of (rule[1] ?? '').split(',')) {
      const text = selector.replace(/\s+/g, ' ').trim();
      if (text.includes(needle)) found.push(text);
    }
  }
  return found;
}

describe('confinement: a rule reaches only the markup of its own part', () => {
  it('the selector extractor sees a rule and its comma parts (positive control)', () => {
    expect(selectorsMentioning('a [data-x], [data-x] { color: red; } b { color: blue; }', '[data-x]')).toEqual(['a [data-x]', '[data-x]']);
  });

  it('the last-scan rule of the header is scoped to the header\'s own element: the clean state draws a [data-last-scan] of its own', () => {
    const { css } = split('header-parts.ts');
    const selectors = selectorsMentioning(css, '[data-last-scan]');
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector, selector).toMatch(/^\[data-meta\] /);
    // the other part that draws the attribute carries no rule for it
    expect(split('state-parts.ts').markup).toContain('data-last-scan');
    expect(selectorsMentioning(split('state-parts.ts').css, '[data-last-scan]')).toEqual([]);
  });

  it('the pill rule (G-4) exists once, in the list file, scoped to the list and detail regions; the detail file carries only the authority pill rule', () => {
    const rules: string[] = [];
    for (const [path, source] of files) {
      for (const rule of partRules(source)) if (rule.selector.includes('sk-pill-tag') && !rule.selector.includes('[data-authority]')) rules.push(`${nameOf(path)} ${rule.selector}`);
    }
    expect(rules.sort()).toEqual([
      "list-parts.ts [data-region='detail'] sk-pill-tag::part(tag)",
      "list-parts.ts [data-region='list'] sk-pill-tag::part(tag)",
    ]);
  });

  it('the resolution section is drawn in one file, with one title id; its eyebrow and note rules are scoped to the region', () => {
    const drawing = FILES.filter((name) => /data-region="resolution"/.test(split(name).markup));
    expect(drawing).toEqual(['resolution-parts.ts']);
    const titleIds = files.filter(([, source]) => /resolution-title/.test(source)).map(([path]) => nameOf(path));
    expect(titleIds).toEqual(['resolution-parts.ts']);
    for (const name of FILES) {
      if (name === 'resolution-parts.ts') continue;
      expect(split(name).markup, name).not.toMatch(/data-eyebrow|data-resolution-note/);
    }
    const { css } = split('resolution-parts.ts');
    for (const needle of ['[data-eyebrow]', '[data-resolution-note]']) {
      const selectors = selectorsMentioning(css, needle);
      expect(selectors.length, needle).toBeGreaterThan(0);
      for (const selector of selectors) expect(selector, selector).toMatch(/^\[data-region='resolution'\] /);
    }
  });

  it('only the screen, the panel part and the resolution part draw a data-region of their own (BOUNDARY-006)', () => {
    const drawing = FILES.filter((name) => /data-region=/.test(split(name).markup));
    expect(drawing.sort()).toEqual(['panel-parts.ts', 'resolution-parts.ts', 'sk-drift-screen.ts']);
  });

  it('a [data-*] attribute a part styles is drawn by that part, apart from the regions and blocks the screen and the detail lay out', () => {
    const shared = new Set(['data-region', 'data-state', 'data-block', 'data-layout', 'data-root', 'data-live', 'data-detail']);
    let checked = 0;
    const unowned: string[] = [];
    for (const name of FILES.filter((file) => file !== 'sk-drift-screen.ts')) {
      const { css, markup } = split(name);
      for (const attribute of new Set([...css.matchAll(/\[(data-[a-z-]+)/g)].map((match) => match[1] ?? ''))) {
        if (shared.has(attribute)) continue;
        checked += 1;
        if (!markup.includes(attribute)) unowned.push(`${name} ${attribute}`);
      }
    }
    expect(checked).toBeGreaterThan(15);
    expect(unowned).toEqual([]);
  });
});
