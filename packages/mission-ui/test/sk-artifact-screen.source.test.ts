// The raw and fallback source block (IC-07, E-25): the escaped-source equality (the block's text is `content`, character for character,
// for every non-empty file; the empty file has its own assertion), wrapping at spaces with a sideways scroll for an unbroken line,
// no measure (CONTRACT-002: the block takes its pane), no box. Each absence has its positive control.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { CONTENT_FIXTURES, artifactFrame, contentAt, contentProps, listingProps, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactScreenProps, ContentFixtureName } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

async function settle(screen: SkArtifactScreen): Promise<void> {
  await screen.updateComplete;
  for (let i = 0; i < 3; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
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
const block = (screen: Element): HTMLElement => {
  const found = root(screen).querySelector<HTMLElement>('pre[data-scroll="source"]');
  if (found === null) throw new Error('no source block');
  return found;
};
const text = (value: string, mediaType = 'text/plain'): ArtifactContentView => ({ path: 'spec.md', kind: 'spec', mediaType, encoding: 'utf-8', sizeBytes: value.length, redacted: false, content: value });

describe('the escaped-source equality', () => {
  it('shows every non-empty content fixture character for character in the Raw view (the empty one is asserted below)', async () => {
    const names = Object.keys(CONTENT_FIXTURES) as ContentFixtureName[];
    let ran = 0;
    for (const name of names) {
      const fixture = contentProps(name);
      if (fixture.content === '') continue;
      const screen = await mount({ content: fixture, selectedPath: fixture.path, listing: listingProps('listingPopulated', [fixture.path]), view: 'raw' });
      expect(block(screen).textContent, name).toBe(fixture.content);
      expect(block(screen).childNodes.length, name).toBeGreaterThan(0);
      ran += 1;
    }
    expect(names).toHaveLength(14);
    expect(ran).toBe(13);
  });

  it('shows the fallback source character for character, and the bulk long line (control: a changed character differs)', async () => {
    const fallback = pairingProps('AV-05');
    const screen = await mount(fallback);
    expect(block(screen).textContent).toBe(fallback.content?.content);
    const long = contentProps('bulkLongLine', 'notes/long-line.txt');
    const rawOnly = await mount({ content: long, selectedPath: long.path, listing: listingProps('listingPopulated', [long.path]) });
    expect(block(rawOnly).textContent).toBe(long.content);
    expect(block(rawOnly).textContent).not.toBe(`${long.content}x`);
  });

  it('keeps markup, entities, tabs, trailing blanks and a leading newline as text (nothing is parsed, trimmed or collapsed)', async () => {
    const source = '\n<b>bold</b> &amp; &lt;script&gt;\n\ttabbed    line  \n\n\n';
    const screen = await mount({ content: text(source) });
    expect(block(screen).textContent).toBe(source);
    expect(block(screen).querySelector('*')).toBeNull();
  });

  it('draws the empty file as the empty words and no source block (row 9a and 9b), not as an empty block (control: one character draws a block)', async () => {
    const plain = await mount(pairingProps('AV-07'));
    expect(root(plain).querySelector('pre[data-scroll="source"]')).toBeNull();
    expect(root(plain).querySelector('[data-document]')?.textContent?.trim()).toBe('This file is empty.');
    const markdownEmpty = await mount({ content: { ...contentAt(contentProps('contentEmpty'), 'spec.md'), mediaType: 'text/markdown' }, view: 'raw' });
    expect(root(markdownEmpty).querySelector('pre[data-scroll="source"]')).toBeNull();
    expect(root(markdownEmpty).querySelector('[role="tabpanel"]')?.textContent?.trim()).toBe('This file is empty.');
    const one = await mount({ content: text('x') });
    expect(block(one).textContent).toBe('x');
  });
});

describe('the block (E-25, DA-22; DA-39 superseded)', () => {
  it('is preformatted, wraps at spaces and never breaks a word, with no measure of its own (it takes its pane) and no box', async () => {
    const screen = await mount({ content: text('a line made of many short words that wrap at the spaces and never inside one '.repeat(8)) });
    const style = getComputedStyle(block(screen));
    expect(style.whiteSpace).toBe('pre-wrap');
    expect(style.overflowWrap).toBe('normal');
    expect(style.maxWidth).toBe('none');
    expect(style.fontFamily.toLowerCase()).toContain('mono');
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) expect(style[`border${side}Width` as 'borderTopWidth']).toBe('0px');
    expect(style.borderRadius).toBe('0px');
    expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    // It wrapped: the block is taller than one line and nothing overflows sideways.
    expect(block(screen).scrollWidth).toBeLessThanOrEqual(block(screen).clientWidth);
    expect(block(screen).getBoundingClientRect().height).toBeGreaterThan(2 * parseFloat(style.fontSize) * 1.2);
  });

  it('scrolls an unbroken line sideways inside the block, whole (control: a line with spaces does not)', async () => {
    const wrapped = await mount({ content: text('words with spaces '.repeat(200)) });
    expect(block(wrapped).scrollWidth).toBeLessThanOrEqual(block(wrapped).clientWidth);
    const unbroken = await mount({ content: text(`${'x'.repeat(4000)}\n`) });
    expect(block(unbroken).scrollWidth).toBeGreaterThan(block(unbroken).clientWidth);
    expect(getComputedStyle(block(unbroken)).overflowX).toBe('auto');
    block(unbroken).scrollLeft = 100;
    expect(block(unbroken).scrollLeft).toBeGreaterThan(0);
    expect(block(unbroken).textContent).toBe(`${'x'.repeat(4000)}\n`);
  });

  it('a code block of the rendered document keeps its own box (control for the absence of a box on the source block)', async () => {
    const screen = await mount({ content: text('# T\n\n```\ncode\n```\n', 'text/markdown') });
    const code = root(screen).querySelector<HTMLElement>('article pre');
    expect(code).not.toBeNull();
    expect(getComputedStyle(code!).borderTopWidth).not.toBe('0px');
  });
});
