// G-9 (E-37): the busy Rescan button starts its padding at --sk-space-7 so the library's spinner (absolute, at --sk-space-2, one
// --sk-space-4 wide) clears the label. The idle button keeps the G-7 padding. The expected lengths are resolved from the tokens
// through a probe element, and also pinned as the literal 32px that --sk-space-7 means.
// Revert check (temporary local edit, never committed): in `header-parts.ts` delete the `sk-button[data-rescan][busy]::part(button)`
// rule and "a busy Rescan button starts its padding at --sk-space-7" fails.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkDriftScreen } from '../src/elements/sk-drift-screen/sk-drift-screen.js';
import { driftFrame, reportProps } from '../src/elements/sk-drift-screen/fixtures.js';
import type { DriftScreenProps } from '../src/elements/sk-drift-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<DriftScreenProps>): Promise<SkDriftScreen> {
  await page.viewport(1280, 800);
  const screen = document.createElement('sk-drift-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  render(driftFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
  await screen.updateComplete;
  return screen;
}
/** A token's length in px, resolved by the browser on a probe element. */
function token(name: string): number {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;width:var(${name})`;
  document.body.append(probe);
  const px = probe.getBoundingClientRect().width;
  probe.remove();
  return px;
}
function padding(screen: SkDriftScreen): { start: number; end: number } {
  const button = screen.shadowRoot?.querySelector('[data-rescan]')?.shadowRoot?.querySelector('button');
  if (!(button instanceof HTMLElement)) throw new Error('no rescan button');
  const style = getComputedStyle(button);
  return { start: Number.parseFloat(style.paddingInlineStart), end: Number.parseFloat(style.paddingInlineEnd) };
}

describe('G-9: the Rescan button while busy', () => {
  it('the tokens resolve as the grant assumes (probe works): space-7 is 32px, space-4 is 16px', () => {
    expect(token('--sk-space-7')).toBe(32);
    expect(token('--sk-space-4')).toBe(16);
  });

  it('a busy Rescan button starts its padding at --sk-space-7 and keeps the G-7 end padding', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 0 }));
    const idle = padding(screen);
    expect(idle).toEqual({ start: token('--sk-space-4'), end: token('--sk-space-4') });
    screen.rescanning = true;
    await screen.updateComplete;
    expect(screen.shadowRoot?.querySelector('[data-rescan]')?.hasAttribute('busy')).toBe(true);
    expect(padding(screen)).toEqual({ start: token('--sk-space-7'), end: token('--sk-space-4') });
    expect(padding(screen).start).toBe(32);
  });

  // TESTS-010: the property the grant exists for is that the spinner clears the label, so it is measured, not only the padding.
  it('the busy spinner ends before the label starts (positive control: without the padding grant they overlap)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 0 }));
    screen.rescanning = true;
    await screen.updateComplete;
    const host = screen.shadowRoot?.querySelector('[data-rescan]') as HTMLElement;
    const cue = host.shadowRoot?.querySelector('.sk-button__busy-cue');
    expect(cue, 'the library draws a busy cue').toBeInstanceOf(HTMLElement);
    const range = document.createRange();
    range.selectNodeContents(host);
    const label = [...range.getClientRects()].filter((rect) => rect.width > 0);
    expect(label.length).toBeGreaterThan(0);
    const labelLeft = Math.min(...label.map((rect) => rect.left));
    const cueRight = (cue as HTMLElement).getBoundingClientRect().right;
    expect(cueRight).toBeLessThanOrEqual(labelLeft);
    // The control: the same measurement with the start padding of an idle button would put the cue over the label.
    const button = host.shadowRoot?.querySelector('button') as HTMLElement;
    button.style.setProperty('padding-inline-start', '16px', 'important');
    expect(getComputedStyle(button).paddingInlineStart).toBe('16px');
    range.selectNodeContents(host);
    const squeezed = Math.min(...[...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => rect.left));
    expect((cue as HTMLElement).getBoundingClientRect().right, 'squeezed: the cue runs past the label start').toBeGreaterThan(squeezed);
    button.style.removeProperty('padding-inline-start');
  });

  it('the rule reaches the Rescan button only: Copy and the Mission link keep their idle padding while the screen is busy', async () => {
    const idleScreen = await mount(reportProps('reportPopulated', { select: 1 }));
    const idle = new Map<string, number>();
    for (const selector of ['[data-copy]', '[data-mission-link]']) {
      const button = idleScreen.shadowRoot?.querySelector(selector)?.shadowRoot?.querySelector('button');
      expect(button, selector).toBeInstanceOf(HTMLElement);
      idle.set(selector, Number.parseFloat(getComputedStyle(button as HTMLElement).paddingInlineStart));
    }
    expect(idle.size).toBe(2);
    document.body.replaceChildren();
    const screen = await mount({ ...reportProps('reportPopulated', { select: 1 }), rescanning: true });
    for (const selector of ['[data-copy]', '[data-mission-link]']) {
      const button = screen.shadowRoot?.querySelector(selector)?.shadowRoot?.querySelector('button');
      expect(button, selector).toBeInstanceOf(HTMLElement);
      expect(Number.parseFloat(getComputedStyle(button as HTMLElement).paddingInlineStart), selector).toBe(idle.get(selector));
    }
    // positive control: the Rescan button's padding DOES change while busy
    expect(padding(screen).start).toBe(32);
  });
});

// TESTS-004: the tests above run at the two-pane tier (the stories' tier), not at the 414 px default, which is the shell's mobile tier.
describe('the tier of this file', () => {
  it('mounts at the two-pane tier: the list and the detail sit side by side (positive control: at 414 px they stack)', async () => {
    const screen = await mount(reportProps('reportPopulated', { select: 1 }));
    const layout = (screen.shadowRoot as ShadowRoot).querySelector('[data-layout]') as HTMLElement;
    expect(window.innerWidth).toBe(1280);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(2);
    await page.viewport(414, 800);
    expect(getComputedStyle(layout).gridTemplateColumns.split(' ')).toHaveLength(1);
  });
});
