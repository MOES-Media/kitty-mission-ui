// The document pane of the Artifact Viewer (IC-07): the toolbar, the eyebrow (DA-14), the bodies a file can have (rendered, Raw, the
// raw-only files, the empty file), the hidden h1 of the bodies that have none, and the scroll regions that are tab stops only while they
// overflow (A11Y-003 (a)), with a PageDown test that moves `scrollTop`. Every absence has its positive control in the same test.
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, contentAt, contentProps, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const frames = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  await frames();
}
async function mount(props: Partial<ArtifactScreenProps> = {}, width = 1280): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await settle(screen);
  return screen;
}
const root = (el: Element): ShadowRoot => {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
};
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const textOf = (el: Node | null): string => (el?.textContent ?? '').trim();
const markdown = (text: string, path = 'spec.md'): ArtifactContentView => ({
  path,
  kind: 'spec',
  mediaType: 'text/markdown',
  encoding: 'utf-8',
  sizeBytes: text.length,
  redacted: false,
  content: text,
});

describe('the toolbar', () => {
  it('shows the kind icon and the file name, the full path as its title, no Mission breadcrumb (DA-11)', async () => {
    const path = 'notes/handoff.md';
    const screen = await mount(pairingProps('AV-08'));
    const toolbar = one<HTMLElement>(root(screen), '[data-region="toolbar"]');
    const name = one<HTMLElement>(toolbar, 'strong');
    expect(textOf(name)).toBe('handoff.md');
    expect(name.getAttribute('title')).toBe(path);
    expect(toolbar.querySelector('svg')).not.toBeNull();
    expect(toolbar.querySelector('nav, ol, [aria-label*="readcrumb"], h1, h2')).toBeNull();
    // Control: the Mission slug is on the screen (in the inspector), so its absence from the toolbar is a real absence.
    expect(textOf(root(screen))).toContain('Sample mission');
    expect(textOf(toolbar)).not.toContain('Sample mission');
  });

  it('keeps the tablist in the toolbar band for a markdown file and draws none for a raw-only file (control)', async () => {
    const markdownScreen = await mount();
    expect(one(root(markdownScreen), '[data-region="toolbar"]').querySelector('[role="tablist"]')).not.toBeNull();
    const rawOnly = await mount(pairingProps('AV-06'));
    const toolbar = one(root(rawOnly), '[data-region="toolbar"]');
    expect(toolbar.querySelector('[role="tablist"]')).toBeNull();
    expect(textOf(toolbar)).toBe('schema.json');
  });

  it('is exactly 79 px tall with the tablist (the prototype: 78 px and its 1 px rule) and exactly 68 px for a raw-only file (DA-40)', async () => {
    const withTabs = await mount();
    expect(one<HTMLElement>(root(withTabs), '[data-region="toolbar"]').getBoundingClientRect().height).toBe(79);
    expect(getComputedStyle(one<HTMLElement>(root(withTabs), '[data-region="toolbar"]')).boxSizing).toBe('border-box');
    const rawOnly = await mount(pairingProps('AV-06'));
    expect(one<HTMLElement>(root(rawOnly), '[data-region="toolbar"]').getBoundingClientRect().height).toBe(68);
  });
});

describe('the eyebrow (DA-14)', () => {
  it('draws the kind word above the document title and not "factual" (control: another kind draws its own word)', async () => {
    const screen = await mount();
    const article = one(root(screen), 'article[data-scroll="article"]');
    const eyebrow = one<HTMLElement>(article, ':scope > p:first-child');
    expect(textOf(eyebrow)).toBe('Specification');
    expect(eyebrow.nextElementSibling?.localName).toBe('h1');
    expect(textOf(eyebrow.nextElementSibling)).toBe('Example Mission');
    expect(textOf(article)).not.toContain('factual');
    // The eyebrow is one element, not the document's own first paragraph.
    expect(Array.from(article.querySelectorAll(':scope > p')).filter((p) => textOf(p) === 'Specification')).toHaveLength(1);
    const plan = await mount(pairingProps('AV-03'));
    expect(textOf(one(one(root(plan), 'article[data-scroll="article"]'), ':scope > p:first-child'))).toBe('Plan');
  });

  it('draws the eyebrow in the rendered view only: the Raw tab and the raw-only file show the source alone (control: the Rendered tab)', async () => {
    const rawTab = await mount({ view: 'raw' });
    expect(root(rawTab).querySelector('article')).toBeNull();
    expect(textOf(one(root(rawTab), '[data-document]'))).not.toContain('Specification');
    const rawOnly = await mount(pairingProps('AV-06'));
    expect(textOf(one(root(rawOnly), '[data-document]'))).not.toContain('Specification');
    const rendered = await mount();
    expect(textOf(one(root(rendered), '[data-document]'))).toContain('Specification');
  });
});

describe('the bodies a file can have (AV-06, AV-07, row 9a)', () => {
  const RAW_ONLY = ['contentJson', 'contentYaml', 'contentJsonl', 'contentCsv', 'contentPlain'] as const;

  it('shows Raw only for json, yaml, jsonl, csv and plain: no Rendered tab, no notice, the source (control: a markdown fixture shows the tab)', async () => {
    let ran = 0;
    for (const name of RAW_ONLY) {
      const fixture = contentProps(name);
      const screen = await mount({ content: fixture, selectedPath: fixture.path, listing: pairingProps('AV-06').listing });
      const scope = root(screen);
      expect(scope.querySelector('[role="tab"]'), name).toBeNull();
      expect(scope.querySelector('[data-document] sk-notice'), name).toBeNull();
      expect(one<HTMLElement>(scope, 'pre[data-scroll="source"]').textContent, name).toBe(fixture.content);
      ran += 1;
    }
    expect(ran).toBe(5);
    const control = await mount();
    expect(textOf(one(root(control), '[role="tab"]'))).toBe('Rendered');
  });

  it('draws the empty text/plain file with the empty words and no tablist, and keeps the toolbar and the inspector (AV-07)', async () => {
    const screen = await mount(pairingProps('AV-07'));
    const scope = root(screen);
    expect(textOf(one(scope, '[data-document]'))).toBe('This file is empty.');
    expect(scope.querySelector('[role="tablist"]')).toBeNull();
    expect(scope.querySelector('[data-document] h2')).toBeNull();
    expect(textOf(one(scope, '[data-region="toolbar"]'))).toBe('empty.txt');
    expect(scope.querySelector('[data-region="inspector"]')).not.toBeNull();
  });
});

describe('the hidden h1 (A11Y-005): drawn for the bodies that have none, not for a rendered body', () => {
  const headings = (screen: Element): HTMLElement[] => Array.from(root(screen).querySelectorAll<HTMLElement>('h1'));

  it('a rendered body keeps the headings it was authored with and draws no hidden h1 (control for every case below)', async () => {
    const screen = await mount();
    expect(headings(screen).map(textOf)).toEqual(['Example Mission']);
    expect(root(screen).querySelector('[data-hidden-heading]')).toBeNull();
  });

  it('a raw-only file, the Raw tab, the fallback and the empty files each draw exactly one hidden h1 naming the file', async () => {
    const cases: Array<[string, Partial<ArtifactScreenProps>, string]> = [
      ['raw-only', pairingProps('AV-06'), 'File: schema.json'],
      ['Raw tab', { view: 'raw' }, 'File: spec.md'],
      ['fallback', pairingProps('AV-05'), 'File: spec.md'],
      ['empty text/plain', pairingProps('AV-07'), 'File: empty.txt'],
      ['empty markdown', { content: { ...contentAt(contentProps('contentEmpty'), 'spec.md'), mediaType: 'text/markdown' } }, 'File: spec.md'],
    ];
    let ran = 0;
    for (const [name, props, label] of cases) {
      const screen = await mount(props);
      expect(headings(screen).map(textOf), name).toEqual([label]);
      expect(headings(screen)[0]?.hasAttribute('data-hidden-heading'), name).toBe(true);
      ran += 1;
    }
    expect(ran).toBe(5);
  });
});

describe('the scroll regions are tab stops only while they overflow (A11Y-003 (a))', () => {
  const WIDE = `# ${'W'.repeat(600)}\n\nA short paragraph.\n`;
  const article = (screen: Element): HTMLElement => one(root(screen), 'article[data-scroll="article"]');
  const pane = (screen: Element): HTMLElement => one(root(screen), '[data-region="document-pane"]');

  it('the rendered article is named and a tab stop while a wide child overflows it, and neither once the child is removed (positive control)', async () => {
    const screen = await mount({ content: markdown('# Short\n\nA short paragraph.\n') });
    expect(article(screen).hasAttribute('tabindex')).toBe(false);
    expect(article(screen).hasAttribute('aria-label')).toBe(false);
    screen.content = markdown(WIDE);
    await settle(screen);
    expect(article(screen).getAttribute('tabindex')).toBe('0');
    expect(article(screen).getAttribute('aria-label')).toBe('Document: spec.md');
    screen.content = markdown('# Short again\n');
    await settle(screen);
    expect(article(screen).hasAttribute('tabindex')).toBe(false);
    expect(article(screen).hasAttribute('aria-label')).toBe(false);
  });

  it('the article that overflows scrolls sideways itself (the element that carries the tab stop is the one that scrolls)', async () => {
    const screen = await mount({ content: markdown(WIDE) });
    const element = article(screen);
    expect(element.scrollWidth).toBeGreaterThan(element.clientWidth);
    expect(getComputedStyle(element).overflowX).toBe('auto');
    element.scrollLeft = 40;
    expect(element.scrollLeft).toBeGreaterThan(0);
  });

  it('the pane is a tab stop while a long document overflows it, and PageDown moves its scrollTop (control: a short document is not one and has nothing to scroll)', async () => {
    const long = Array.from({ length: 120 }, (_, i) => `Paragraph ${i} of a long document.`).join('\n\n');
    const screen = await mount({ content: markdown(long) });
    // The screen does not bound its own height (the host does, as the shell does for its content cell): the test plays the host.
    expect(pane(screen).getAttribute('tabindex')).toBe('-1');
    pane(screen).style.maxHeight = '400px';
    await frames();
    expect(pane(screen).getAttribute('tabindex')).toBe('0');
    expect(pane(screen).scrollHeight).toBeGreaterThan(pane(screen).clientHeight);
    expect(pane(screen).scrollTop).toBe(0);
    pane(screen).focus();
    await userEvent.keyboard('{PageDown}');
    await frames();
    expect(pane(screen).scrollTop).toBeGreaterThan(0);
    const short = await mount({ content: markdown('# Short\n') });
    expect(pane(short).getAttribute('tabindex')).toBe('-1');
    pane(short).focus();
    await userEvent.keyboard('{PageDown}');
    await frames();
    expect(pane(short).scrollTop).toBe(0);
  });

  it('the Raw tab block is named, and a tab stop only while its line overflows (control: wrapped text is not)', async () => {
    const screen = await mount({ content: markdown('A line that wraps at spaces because it has spaces in it.\n'), view: 'raw' });
    const block = (): HTMLElement => one(root(screen), 'pre[data-scroll="source"]');
    expect(block().getAttribute('aria-label')).toBe('File source');
    expect(block().hasAttribute('tabindex')).toBe(false);
    screen.content = markdown(`${'x'.repeat(4000)}\n`);
    await settle(screen);
    expect(block().getAttribute('tabindex')).toBe('0');
    expect(block().getAttribute('aria-label')).toBe('File source');
  });
});

describe('the prototype look the WP09 grants allow (operator ruling 2026-10-08)', () => {
  const px = (value: string): number => parseFloat(value);

  it('the eyebrow is uppercase with 0.08em tracking, and the document paragraphs are neither (control)', async () => {
    const screen = await mount();
    const article = one(root(screen), 'article[data-scroll="article"]');
    const eyebrow = getComputedStyle(one(article, ':scope > p:first-child'));
    expect(eyebrow.textTransform).toBe('uppercase');
    expect(px(eyebrow.letterSpacing)).toBeCloseTo(px(eyebrow.fontSize) * 0.08, 1);
    const body = await mount({ content: markdown('# T\n\nA paragraph.\n') });
    const paragraph = getComputedStyle(one(root(body), 'article p:nth-of-type(2)'));
    expect(paragraph.textTransform).toBe('none');
    expect(paragraph.letterSpacing).toBe('normal');
  });

  it('headings take line-height 1.2 and the prose keeps 1.65', async () => {
    const screen = await mount({ content: markdown('# Title\n\n## Sub\n\nA paragraph.\n') });
    const article = one(root(screen), 'article[data-scroll="article"]');
    for (const selector of ['h1', 'h2']) {
      const style = getComputedStyle(one(article, selector));
      expect(px(style.lineHeight), selector).toBeCloseTo(px(style.fontSize) * 1.2, 1);
    }
    const p = getComputedStyle(one(article, 'p:nth-of-type(2)'));
    expect(px(p.lineHeight)).toBeCloseTo(px(p.fontSize) * 1.65, 1);
  });

  it('the toolbar file name is mono, one line, and ellipsizes with the full name in its title (control: a short name does not)', async () => {
    const long = `${'a-very-long-file-name-'.repeat(12)}end.md`;
    const screen = await mount({ content: markdown('# T\n', long), selectedPath: long });
    const name = one<HTMLElement>(root(screen), '[data-region="toolbar"] strong');
    const style = getComputedStyle(name);
    expect(style.fontFamily.toLowerCase()).toContain('mono');
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.overflow).toBe('hidden');
    expect(name.getAttribute('title')).toBe(long);
    expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
    const toolbar = one<HTMLElement>(root(screen), '[data-region="toolbar"]');
    expect(toolbar.scrollWidth).toBeLessThanOrEqual(toolbar.clientWidth);
    const short = await mount();
    const shortName = one<HTMLElement>(root(short), '[data-region="toolbar"] strong');
    expect(shortName.scrollWidth).toBeLessThanOrEqual(shortName.clientWidth);
  });

  it('the raw block has line-height 1.5', async () => {
    const screen = await mount({ view: 'raw' });
    const style = getComputedStyle(one(root(screen), 'pre[data-scroll="source"]'));
    expect(px(style.lineHeight)).toBeCloseTo(px(style.fontSize) * 1.5, 1);
  });
});
