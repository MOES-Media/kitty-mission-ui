// The shell's mobile tier shows ONE column (operator ruling during WP10). The shell reflects its `tier` attribute (a public
// surface, documented on the shell); the screen follows it through the ShellTierController (`test/shell-tier.test.ts`). Columns are measured from the computed grid of the detail grid.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function mountAt(width: number, framed = true): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, pairingProps('WP-01'));
  const box = document.createElement('div');
  document.body.append(box);
  if (framed) render(workPackageFrame(html`${screen}`), box);
  else {
    box.style.width = `${width}px`;
    box.append(screen);
  }
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return screen;
}
const columns = (screen: SkWorkPackageScreen): number => {
  const grid = screen.shadowRoot?.querySelector('[data-grid]') as HTMLElement;
  return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
};
const shellOf = (screen: SkWorkPackageScreen): HTMLElement => screen.closest('sk-mission-shell') as HTMLElement;

describe('columns by viewport inside the shell', () => {
  const cases: Array<[number, string, number]> = [
    [689, 'mobile', 1],
    [700, 'mobile', 1],
    [719, 'mobile', 1],
    [720, 'collapsed', 1],
    [760, 'collapsed', 1],
    [900, 'collapsed', 2],
    [1100, 'expanded', 2],
    [1280, 'expanded', 3],
  ];
  for (const [width, tier, expected] of cases) {
    it(`${width}px: shell tier ${tier}, ${expected} column(s)`, async () => {
      const screen = await mountAt(width);
      expect(shellOf(screen).getAttribute('tier')).toBe(tier);
      expect(screen.matches(':state(shell-mobile)')).toBe(tier === 'mobile');
      expect(columns(screen)).toBe(expected);
    });
  }

  it('follows the tier when the viewport changes, and a screen outside a shell keeps the container rule (control)', async () => {
    const screen = await mountAt(1280);
    expect(columns(screen)).toBe(3);
    await page.viewport(700, 900);
    await expect.poll(() => shellOf(screen).getAttribute('tier')).toBe('mobile');
    await expect.poll(() => columns(screen)).toBe(1);
    await page.viewport(1280, 900);
    await expect.poll(() => columns(screen)).toBe(3);
    document.body.replaceChildren();
    const bare = await mountAt(700, false);
    expect(bare.matches(':state(shell-mobile)')).toBe(false);
    expect(columns(bare)).toBe(2);
  });
});
