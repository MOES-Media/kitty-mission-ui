// The overflow wiring of the Artifact Viewer (IC-06b, A11Y-003, A11Y-004): the screen's scroll elements (the pane, the rendered
// article, the raw block, each table box) are the targets of the package's one OverflowRegion, on both axes. A scroll region is a tab
// stop only while it overflows; content that grows inside a box of unchanged size is seen; shrinking it flips the stop off.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { ArtifactContentView } from '../src/contract/types.js';

afterEach(() => document.body.replaceChildren());

const frames = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(content: ArtifactContentView, width = 1280): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, { ...pairingProps('AV-03'), content });
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frames();
  return screen;
}
const q = <T extends Element>(screen: Element, selector: string): T => {
  const found = screen.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`missing ${selector}`);
  return found;
};
const textFile = (text: string): ArtifactContentView => ({ path: 'plan.md', kind: 'plan', mediaType: 'text/plain', encoding: 'utf-8', sizeBytes: text.length, redacted: false, content: text });
const markdown = (text: string): ArtifactContentView => ({ ...textFile(text), mediaType: 'text/markdown' });
const WIDE_TABLE = `| ${Array.from({ length: 14 }, (_, i) => `column-${i}`).join(' | ')} |\n|${' --- |'.repeat(14)}\n| ${Array.from({ length: 14 }, () => 'a value of some length').join(' | ')} |\n`;
const NARROW_TABLE = '| a | b |\n| --- | --- |\n| 1 | 2 |\n';

describe('the raw block', () => {
  it('is a tab stop only while its line overflows, and flips when the content grows or shrinks inside a box of unchanged size', async () => {
    const screen = await mount(textFile('short'));
    const block = (): HTMLElement => q(screen, '[data-scroll="source"]');
    const before = block().getBoundingClientRect();
    expect(block().hasAttribute('tabindex')).toBe(false);
    // Positive control for the measurement itself: the same box with content that fits stays off.
    screen.content = textFile('still short, with spaces so it wraps');
    await screen.updateComplete;
    await frames();
    expect(block().hasAttribute('tabindex')).toBe(false);
    screen.content = textFile('x'.repeat(4000));
    await screen.updateComplete;
    await frames();
    expect(block().getAttribute('tabindex')).toBe('0');
    expect(Math.round(block().getBoundingClientRect().width)).toBe(Math.round(before.width));
    screen.content = textFile('short again');
    await screen.updateComplete;
    await frames();
    expect(block().hasAttribute('tabindex')).toBe(false);
  });

  it('sees content added to the block with no update of the screen at all', async () => {
    const screen = await mount(textFile('short'));
    const block = q<HTMLElement>(screen, '[data-scroll="source"]');
    expect(block.hasAttribute('tabindex')).toBe(false);
    block.append(document.createTextNode('y'.repeat(4000)));
    await frames();
    expect(block.getAttribute('tabindex')).toBe('0');
  });
});

describe('the table boxes', () => {
  it('make only the wide table a named region and tab stop (control: the narrow table stays a plain box)', async () => {
    const screen = await mount(markdown(`${NARROW_TABLE}\n${WIDE_TABLE}`));
    const boxes = Array.from(screen.shadowRoot!.querySelectorAll<HTMLElement>('[data-md="table-scroll"]'));
    expect(boxes).toHaveLength(2);
    expect(boxes[0]?.hasAttribute('tabindex')).toBe(false);
    expect(boxes[0]?.hasAttribute('role')).toBe(false);
    expect(boxes[1]?.getAttribute('tabindex')).toBe('0');
    expect(boxes[1]?.getAttribute('role')).toBe('region');
    expect(boxes[1]?.getAttribute('aria-label')).toBe('Table 2 of 2');
  });

  it('flips the stop on for a wide table at 620px and off at 1280px for the same document, with content growing inside a box of unchanged size', async () => {
    // Four short columns: with the 12ch cell floor (E-23 extension, WP13) six short columns no longer fit a 1280px pane, four fit even at 620px.
    const medium = '| a | b | c | d |\n| --- | --- | --- | --- |\n| 1 | 2 | 3 | 4 |\n';
    const wide = await mount(markdown(medium), 1280);
    expect(wide.shadowRoot!.querySelector('[data-md="table-scroll"]')?.hasAttribute('tabindex')).toBe(false);
    const grown = markdown(WIDE_TABLE);
    wide.content = grown;
    await wide.updateComplete;
    await frames();
    const box = wide.shadowRoot!.querySelector<HTMLElement>('[data-md="table-scroll"]')!;
    expect(box.getAttribute('tabindex')).toBe('0');
    wide.content = markdown(medium);
    await wide.updateComplete;
    await frames();
    expect(wide.shadowRoot!.querySelector('[data-md="table-scroll"]')?.hasAttribute('tabindex')).toBe(false);
  });
});

describe('the pane', () => {
  it('is a tab stop only while it scrolls, on both axes (vertical: a pane of fixed height; horizontal: an unbroken line)', async () => {
    const screen = await mount(textFile('short'), 620);
    const pane = q<HTMLElement>(screen, '[data-region="document-pane"]');
    pane.style.height = '240px';
    await frames();
    expect(pane.getAttribute('tabindex')).toBe('-1');
    const size = pane.getBoundingClientRect();
    screen.content = textFile(Array.from({ length: 200 }, (_, i) => `line ${i}`).join('\n'));
    await screen.updateComplete;
    await frames();
    expect(pane.getAttribute('tabindex')).toBe('0');
    expect(pane.getBoundingClientRect().height).toBe(size.height);
    screen.content = textFile('short');
    await screen.updateComplete;
    await frames();
    expect(pane.getAttribute('tabindex')).toBe('-1');
    pane.style.height = '';
    screen.content = textFile('z'.repeat(5000));
    await screen.updateComplete;
    await frames();
    // The raw block is the element that scrolls sideways (E-25, A11Y-003 (a)), so the pane itself does not overflow: the stop is the
    // block's. (Before the document pane work package the stub block did not scroll and the pane carried it.)
    const block = q<HTMLElement>(screen, '[data-scroll="source"]');
    expect(block.scrollWidth).toBeGreaterThan(block.clientWidth);
    expect(block.getAttribute('tabindex')).toBe('0');
    expect(pane.scrollWidth).toBeLessThanOrEqual(pane.clientWidth);
    expect(pane.getAttribute('tabindex')).toBe('-1');
  });
});

describe('the tab stops on the rendered article and on the pane (WP13: test-local overflowing content, no fixture)', () => {
  it('the article takes focus and is in the tab order only while a wide heading overflows it (control: a short document is neither)', async () => {
    const screen = await mount(markdown('# Short\n\nA paragraph.\n'));
    const article = (): HTMLElement => q(screen, 'article[data-scroll="article"]');
    article().focus();
    expect(screen.shadowRoot?.activeElement, 'a short article cannot take focus').not.toBe(article());
    expect(article().tabIndex).toBe(-1);
    screen.content = markdown(`# ${'W'.repeat(600)}\n\nA paragraph.\n`);
    await screen.updateComplete;
    await frames();
    expect(article().scrollWidth).toBeGreaterThan(article().clientWidth);
    expect(article().tabIndex).toBe(0);
    article().focus();
    expect(screen.shadowRoot?.activeElement, 'an overflowing article takes focus').toBe(article());
  });

  it('the pane is in the tab order only while its long document overflows it (control: a short document leaves it at -1)', async () => {
    const screen = await mount(markdown('# Short\n'), 620);
    const pane = q<HTMLElement>(screen, '[data-region="document-pane"]');
    pane.style.height = '400px';
    await frames();
    expect(pane.scrollHeight).toBeLessThanOrEqual(pane.clientHeight);
    expect(pane.tabIndex).toBe(-1);
    screen.content = markdown(Array.from({ length: 120 }, (_, i) => `Paragraph ${i}.\n`).join('\n'));
    await screen.updateComplete;
    await frames();
    expect(pane.scrollHeight).toBeGreaterThan(pane.clientHeight);
    expect(pane.tabIndex).toBe(0);
  });
});
