// The Ops state card and the empty-look typography (WP07 fix round 1: Ops G-4 narrowed, Ops G-5, Ops G-6). Measured on the mounted screen,
// because the part's styles live in the screen's shadow root. Colours and radii are compared with a probe element that resolves
// the same token; the geometry INPUTS (padding 48, border 1, radius 16, line height 21) are pinned as literals.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkOpsScreen } from '../src/elements/sk-ops-screen/sk-ops-screen.js';
import { opsProps } from '../src/elements/sk-ops-screen/fixtures.js';
import type { OpsScreenProps } from '../src/elements/sk-ops-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(props: Partial<OpsScreenProps>, width = 1280): Promise<SkOpsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-ops-screen');
  Object.assign(screen, props);
  const box = document.createElement('div');
  document.body.append(box);
  box.append(screen);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}

const sel = (screen: SkOpsScreen, selector: string): HTMLElement => {
  const found = screen.shadowRoot?.querySelector<HTMLElement>(selector) ?? null;
  if (found === null) throw new Error(`no ${selector}`);
  return found;
};

/** The computed value a token resolves to for one property, read from a probe in the document. */
function resolved(property: 'borderTopColor' | 'backgroundColor' | 'borderTopLeftRadius' | 'fontWeight', token: string): string {
  const probe = document.createElement('div');
  const css = { borderTopColor: 'border-top-color', backgroundColor: 'background-color', borderTopLeftRadius: 'border-top-left-radius', fontWeight: 'font-weight' }[property];
  probe.style.setProperty(css, `var(${token})`);
  if (property === 'borderTopColor') probe.style.setProperty('border-top-style', 'solid');
  document.body.append(probe);
  const value = getComputedStyle(probe)[property];
  probe.remove();
  return value;
}

const CARD = '[data-ops-state] > .sk-empty-state';

describe('Ops G-4 (narrowed): the empty and loading looks draw the prototype card, the error look draws none', () => {
  it('the empty look: a dashed control border, the large radius and the card surface', async () => {
    const card = getComputedStyle(sel(await mount(opsProps.empty()), CARD));
    expect(card.borderTopStyle).toBe('dashed');
    expect(card.borderTopWidth).toBe('1px');
    expect(card.borderTopColor).toBe(resolved('borderTopColor', '--sk-border-control'));
    expect(card.borderTopLeftRadius).toBe('16px');
    expect(card.borderTopLeftRadius).toBe(resolved('borderTopLeftRadius', '--sk-radius-lg'));
    expect(card.backgroundColor).toBe(resolved('backgroundColor', '--sk-surface-card'));
  });

  it('the loading look: the same card with a solid default border (paired with the empty look)', async () => {
    const empty = getComputedStyle(sel(await mount(opsProps.empty()), CARD));
    const card = getComputedStyle(sel(await mount(opsProps.loading()), CARD));
    expect(card.borderTopStyle).toBe('solid');
    expect(card.borderTopWidth).toBe('1px');
    expect(card.borderTopColor).toBe(resolved('borderTopColor', '--sk-border-default'));
    expect(card.borderTopColor).not.toBe(empty.borderTopColor);
    expect(card.borderTopLeftRadius).toBe('16px');
    expect(card.backgroundColor).toBe(resolved('backgroundColor', '--sk-surface-card'));
  });

  it('the error look draws no card: no empty-state box, no border and no card surface on the panel', async () => {
    const screen = await mount(opsProps.error('opsRefusalUnreadable'));
    expect(screen.shadowRoot?.querySelectorAll('.sk-empty-state').length).toBe(0);
    const panel = getComputedStyle(sel(screen, '[data-ops-state]'));
    expect(panel.borderTopStyle).toBe('none');
    expect(panel.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    // positive control: the same measurement on the empty look's card finds a border
    const card = getComputedStyle(sel(await mount(opsProps.empty()), CARD));
    expect(card.borderTopStyle).not.toBe('none');
  });
});

describe('Ops G-5: a long profile in the empty look wraps instead of being clipped', () => {
  const LONG = 'averylongprofilenamewithoutanybreakopportunity'.repeat(4);
  /** The rendered lines of the text: the distinct tops of the client rects of a range over it. */
  const lines = (code: HTMLElement): number => {
    const range = document.createRange();
    range.selectNodeContents(code);
    return new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size;
  };

  it('a long profile wraps to more than one line and nothing overflows the box (390 px)', async () => {
    const code = sel(await mount(opsProps.emptyProfile(LONG), 390), 'code[data-empty-profile]');
    expect(code.textContent).toBe(LONG);
    expect(lines(code)).toBeGreaterThan(1);
    expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth);
    expect(getComputedStyle(code).overflowWrap).toBe('anywhere');
  });

  it('a short profile stays on one line at the same width (paired)', async () => {
    const code = sel(await mount(opsProps.emptyProfile('short'), 390), 'code[data-empty-profile]');
    expect(lines(code)).toBe(1);
    expect(code.scrollWidth).toBeLessThanOrEqual(code.clientWidth);
  });
});

describe('Ops G-6: the empty-look typography matches the prototype (heading weight, no gap, body line height 1.5)', () => {
  const rect = (el: HTMLElement): DOMRect => el.getBoundingClientRect();
  const LOOK = '[data-look="empty"]';

  it('the heading is bold (the weight token, 700)', async () => {
    const screen = await mount(opsProps.empty());
    const weight = getComputedStyle(sel(screen, `${LOOK} .sk-empty-state__heading`)).fontWeight;
    expect(weight).toBe('700');
    expect(weight).toBe(resolved('fontWeight', '--sk-weight-bold'));
  });

  it('the body follows the heading with no gap, and its font size is 14 px', async () => {
    const screen = await mount(opsProps.empty());
    const heading = sel(screen, `${LOOK} .sk-empty-state__heading`);
    const body = sel(screen, `${LOOK} .sk-empty-state__body`);
    expect(rect(body).top - rect(heading).bottom).toBe(0);
    expect(getComputedStyle(body).fontSize).toBe('14px');
  });

  it('the body carries 1.5 times its font size (the card sets it) and the heading 1.3 times its own', async () => {
    const screen = await mount(opsProps.empty());
    const body = getComputedStyle(sel(screen, `${LOOK} .sk-empty-state__body`));
    expect(parseFloat(body.fontSize)).toBeGreaterThan(0);
    expect(parseFloat(body.lineHeight)).toBe(1.5 * parseFloat(body.fontSize));
    // The prototype's h2 keeps its own 1.3 (Ops G-6, pinned on the empty heading only).
    const heading = getComputedStyle(sel(screen, `${LOOK} .sk-empty-state__heading`));
    expect(parseFloat(heading.fontSize)).toBeGreaterThan(0);
    expect(parseFloat(heading.lineHeight)).toBeCloseTo(1.3 * parseFloat(heading.fontSize), 5);
  });

  it('the loading label and body each carry a line height of 1.5 times their own font size', async () => {
    const screen = await mount(opsProps.loading());
    for (const part of ['.sk-progress__label', '.sk-empty-state__body']) {
      const style = getComputedStyle(sel(screen, `[data-ops-state][aria-busy="true"] ${part}`));
      expect(parseFloat(style.fontSize)).toBeGreaterThan(0);
      expect(parseFloat(style.lineHeight)).toBe(1.5 * parseFloat(style.fontSize));
    }
  });

  it('the card height is its pinned inputs plus the two blocks: 48 padding and 1 border on each side, no gap', async () => {
    const screen = await mount(opsProps.empty());
    const card = sel(screen, CARD);
    const heading = sel(screen, `${LOOK} .sk-empty-state__heading`);
    const body = sel(screen, `${LOOK} .sk-empty-state__body`);
    expect(rect(card).height).toBe(2 * 48 + 2 * 1 + rect(heading).height + rect(body).height);
  });

  it('a profile keeps its 12 px (space-3) spacing after the body', async () => {
    const screen = await mount(opsProps.emptyProfile('short'));
    const body = sel(screen, `${LOOK} .sk-empty-state__body`);
    const code = sel(screen, 'code[data-empty-profile]');
    expect(rect(code).top - rect(body).bottom).toBe(12);
  });

  it('does not leak into the loading look: its label-to-body gap stays 12 px (paired)', async () => {
    const screen = await mount(opsProps.loading());
    const label = sel(screen, '[data-ops-state][aria-busy="true"] .sk-progress');
    const body = sel(screen, '[data-ops-state][aria-busy="true"] .sk-empty-state__body');
    expect(rect(body).top - rect(label).bottom).toBe(12);
  });
});
