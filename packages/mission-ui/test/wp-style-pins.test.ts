// Computed-style pins the lint cannot give (WP10, carry-forward from WP06 and WP09): the review latest-result values break an
// unbroken reference, the shared pill rule keeps max-width 100% on the pill and on its `tag` part, and the 200 percent
// large-text check also runs on the long fixture. Each pin is paired with a control that does NOT carry the rule.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';

afterEach(() => {
  document.documentElement.style.fontSize = '';
  document.body.replaceChildren();
});

async function mount(props: Partial<WpScreenProps>, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const rootOf = (screen: SkWorkPackageScreen): ShadowRoot => screen.shadowRoot as ShadowRoot;
const longProps = (): Partial<WpScreenProps> => ({
  ...pairingProps('WP-44'),
  workPackage: { ...WORK_PACKAGE_FIXTURES.wpLong, history: WORK_PACKAGE_FIXTURES.wpBulkHistory.history },
});

describe('review latest-result break-word (E-21)', () => {
  it('the value cells of the latest result compute overflow-wrap break-word, and an unbroken reference stays inside its cell', async () => {
    const screen = await mount(longProps());
    const summary = rootOf(screen).querySelector('[data-region="review-summary"]') as HTMLElement;
    const values = [...summary.querySelectorAll<HTMLElement>('[data-rows] > dd')];
    expect(values.length).toBeGreaterThanOrEqual(3);
    for (const dd of values) expect(getComputedStyle(dd).overflowWrap).toBe('break-word');
    // control: the label cells and an element outside the rule do not break words
    const labels = [...summary.querySelectorAll<HTMLElement>('[data-rows] > dt')];
    expect(labels.length).toBe(values.length);
    for (const dt of labels) expect(getComputedStyle(dt).overflowWrap).toBe('normal');
    // behaviour: the long reference does not push the cell past the summary
    const right = summary.getBoundingClientRect().right;
    for (const dd of values) expect(dd.getBoundingClientRect().right).toBeLessThanOrEqual(right + 1);
  });
});

describe('the shared pill rule', () => {
  it('pins max-width 100% and min-width 0 on every pill, and max-width 100% with the ellipsis on its tag part', async () => {
    const screen = await mount(longProps());
    const pills = [...rootOf(screen).querySelectorAll<HTMLElement>('sk-pill-tag')];
    expect(pills.length).toBeGreaterThan(15);
    for (const pill of pills) {
      const host = getComputedStyle(pill);
      expect(host.maxWidth).toBe('100%');
      expect(host.minWidth).toBe('0px');
      const part = getComputedStyle(pill.shadowRoot?.querySelector('.sk-pill-tag') as HTMLElement);
      expect(part.maxWidth).toBe('100%');
      expect(part.textOverflow).toBe('ellipsis');
    }
    // control: a pill outside the screen carries neither rule
    const bare = document.createElement('sk-pill-tag');
    bare.textContent = 'bare';
    document.body.append(bare);
    await (bare as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    expect(getComputedStyle(bare).maxWidth).toBe('none');
    expect(getComputedStyle(bare.shadowRoot?.querySelector('.sk-pill-tag') as HTMLElement).maxWidth).toBe('none');
  });
});

describe('200 percent root font size on the long fixture', () => {
  it('wpLong with the 60-entry history and detailLong at 1100 and 720 px: nothing leaves the screen', async () => {
    let ran = 0;
    for (const width of [1100, 720]) {
      document.documentElement.style.fontSize = '200%';
      const screen = await mount(longProps(), width);
      document.documentElement.style.fontSize = '200%';
      await screen.updateComplete;
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      expect(Number.parseFloat(getComputedStyle(document.documentElement).fontSize)).toBe(32);
      expect(rootOf(screen).querySelectorAll('[data-region="owned-files"] li')).toHaveLength(100);
      expect(screen.scrollWidth - screen.clientWidth, `${width} host`).toBeLessThanOrEqual(0);
      expect(document.documentElement.scrollWidth - document.documentElement.clientWidth, `${width} document`).toBeLessThanOrEqual(0);
      const right = screen.getBoundingClientRect().right;
      const past = [...rootOf(screen).querySelectorAll('*')].filter((el) => el.closest('[data-live]') === null && el.localName !== 'h1' && el.getBoundingClientRect().right > right + 1);
      expect(past.map((el) => el.localName), `${width}`).toEqual([]);
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(2);
  });
});
