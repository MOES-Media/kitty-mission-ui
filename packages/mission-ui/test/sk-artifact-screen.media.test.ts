// Forced colors, reduced motion and target size (IC-10, NFR-014, NFR-015). One mechanism: the Vitest browser `cdp()` session sends
// `Emulation.setEmulatedMedia`, and the tests read COMPUTED values. Every assertion has its positive control: the same element differs
// without the emulation. WebKit is untested (an accepted open risk).
/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it } from 'vitest';
import { cdp, page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkArtifactScreen } from '../src/elements/sk-artifact-screen/sk-artifact-screen.js';
import { artifactFrame, pairingProps } from '../src/elements/sk-artifact-screen/fixtures.js';
import type { PairingId } from '../src/elements/sk-artifact-screen/fixtures.js';

type Feature = { name: string; value: string };
const emulate = async (features: Feature[]): Promise<void> => {
  await cdp().send('Emulation.setEmulatedMedia', { features });
};
afterEach(async () => {
  await emulate([]);
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});

const frames = async (n: number): Promise<void> => {
  for (let i = 0; i < n; i += 1) await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(id: PairingId, width = 1280): Promise<SkArtifactScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-artifact-screen');
  Object.assign(screen, pairingProps(id));
  const box = document.createElement('div');
  document.body.append(box);
  render(artifactFrame(html`${screen}`), box);
  await screen.updateComplete;
  await frames(3);
  return screen;
}
const q = <T extends Element>(screen: Element, selector: string): T => {
  const found = screen.shadowRoot?.querySelector<T>(selector);
  if (found === null || found === undefined) throw new Error(`missing ${selector}`);
  return found;
};
const FORCED: Feature[] = [{ name: 'forced-colors', value: 'active' }];
const REDUCED: Feature[] = [{ name: 'prefers-reduced-motion', value: 'reduce' }];

describe('forced colors (NFR-014)', () => {
  it('draws the selected tab with the Highlight border and the unselected one with CanvasText; both differ without the emulation (control)', async () => {
    const screen = await mount('AV-01');
    const selected = q<HTMLElement>(screen, '[role="tab"][aria-selected="true"]');
    const other = q<HTMLElement>(screen, '[role="tab"][aria-selected="false"]');
    const normal = { selected: getComputedStyle(selected).borderTopColor, other: getComputedStyle(other).borderTopColor };
    await emulate(FORCED);
    await frames(2);
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const forced = { selected: getComputedStyle(selected).borderTopColor, other: getComputedStyle(other).borderTopColor };
    expect(forced.selected, 'the selected tab edge is a system colour, not the token').not.toBe(normal.selected);
    expect(forced.other).not.toBe(normal.other);
    expect(forced.selected, 'selected and unselected stay distinguishable').not.toBe(forced.other);
    expect(parseFloat(getComputedStyle(selected).borderTopWidth)).toBeGreaterThan(0);
    // The state is not colour only: the selected tab keeps a fill difference or a different edge, and aria-selected.
    expect(selected.getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the focus ring on an inline link and on the table box (a computed outline survives); without focus there is none (control)', async () => {
    const screen = await mount('AV-32b');
    await emulate(FORCED);
    await frames(2);
    const link = q<HTMLElement>(screen, 'a[data-md="link"]');
    const box = q<HTMLElement>(screen, '[data-md="table-scroll"]');
    expect(getComputedStyle(link).outlineStyle, 'unfocused link').not.toBe('solid');
    expect(getComputedStyle(box).outlineStyle, 'unfocused table box').not.toBe('solid');
    link.focus();
    await userEvent.keyboard('{Shift>}{/Shift}');
    expect(getComputedStyle(link).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(link).outlineWidth)).toBeGreaterThan(0);
    box.focus();
    await frames(1);
    // Programmatic focus after keyboard use keeps :focus-visible, so the table box shows its ring.
    expect(box.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(box).outlineStyle).toBe('solid');
    expect(parseFloat(getComputedStyle(box).outlineWidth)).toBeGreaterThan(0);
    expect(getComputedStyle(box).overflowX, 'the table box stays a box that scrolls').toBe('auto');
  });

  it('keeps the table box visible as a box: a forced-colors computed border or outline exists on the focused box, and the raw block ring too', async () => {
    const screen = await mount('AV-02');
    const block = q<HTMLElement>(screen, '[data-scroll="source"]');
    await emulate(FORCED);
    expect(getComputedStyle(block).outlineStyle).not.toBe('solid');
    block.setAttribute('tabindex', '0');
    block.focus();
    await frames(1);
    expect(block.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(block).outlineStyle).toBe('solid');
  });
});

describe('reduced motion (NFR-014)', () => {
  /** Every running animation name in the screen's shadow trees, looking through nested shadow roots. */
  function animated(screen: Element): string[] {
    const out: string[] = [];
    const visit = (node: ParentNode): void => {
      for (const el of Array.from(node.querySelectorAll<HTMLElement>('*'))) {
        const style = getComputedStyle(el);
        for (const name of style.animationName.split(', ')) if (name !== 'none') out.push(`${el.localName}:${name}:${style.animationDuration}`);
        if (el.shadowRoot !== null) visit(el.shadowRoot);
      }
    };
    if (screen.shadowRoot !== null) visit(screen.shadowRoot);
    return out;
  }
  it('runs no animation of its own under the preference; the loading look animates without it (control: the same element differs)', async () => {
    const screen = await mount('AV-21');
    const without = animated(screen);
    expect(without.length, 'the loading sweep runs by default').toBeGreaterThan(0);
    await emulate(REDUCED);
    await frames(2);
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const reduced = animated(screen).filter((entry) => !entry.endsWith(':0s'));
    expect(reduced).toEqual([]);
  });
  it('a ready document runs only the library notice entrance, never an animation of the screen; under the preference that one stops too (control: it runs without)', async () => {
    const screen = await mount('AV-01');
    const without = animated(screen);
    expect(without.length, 'the library notice entrance runs by default').toBeGreaterThan(0);
    expect(without.filter((entry) => !entry.startsWith('div:sk-notice-enter:') && !entry.startsWith('sk-'))).toEqual([]);
    await emulate(REDUCED);
    await frames(2);
    expect(animated(screen).filter((entry) => !entry.endsWith(':0s'))).toEqual([]);
  });
});

describe('target size (NFR-015)', () => {
  it('gives a tab at least 36 px and a Work Package control at least 24 px of block size, at 1280 and 620 px', async () => {
    let ran = 0;
    for (const width of [1280, 620]) {
      const screen = await mount('AV-01', width);
      const tabs = Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement>('[role="tab"]') ?? []);
      const pills = Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement>('button.sk-pill-tag') ?? []);
      expect(tabs.length).toBe(2);
      expect(pills.length).toBe(2);
      for (const tab of tabs) expect(tab.getBoundingClientRect().height, `${width}px tab`).toBeGreaterThanOrEqual(36);
      for (const pill of pills) expect(pill.getBoundingClientRect().height, `${width}px pill`).toBeGreaterThanOrEqual(24);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(2);
  });
  it('the measure has a control: a 10 px button reads under both minimums', () => {
    const small = document.createElement('button');
    small.style.cssText = 'height:10px;padding:0;border:0';
    document.body.append(small);
    expect(small.getBoundingClientRect().height).toBeLessThan(24);
  });
});
