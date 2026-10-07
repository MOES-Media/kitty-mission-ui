// Landing pass (#5), CORR-002: see kitty-specs/work-package-screen-01M44DSJ/contracts/sk-work-package-screen.md.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { announceLoaded, announceLoading } from '../src/defaults/index.js';

afterEach(() => {
  (document.activeElement as HTMLElement | null)?.blur();
  document.body.replaceChildren();
});
async function settle(s: SkWorkPackageScreen): Promise<void> {
  await s.updateComplete;
  await new Promise((r) => requestAnimationFrame(() => r(null)));
}
async function mount(props: Partial<WpScreenProps>): Promise<SkWorkPackageScreen> {
  await page.viewport(1280, 900);
  const s = document.createElement('sk-work-package-screen');
  Object.assign(s, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${s}`), box);
  await settle(s);
  return s;
}
const sr = (s: Element): ShadowRoot => s.shadowRoot as ShadowRoot;
const liveText = (s: SkWorkPackageScreen): string => (sr(s).querySelector('[data-live]')?.textContent ?? '').replace(/\s+/g, ' ').trim();


describe('CORR-002: "loaded" must be announced only when the shown Work Package is the selected one', () => {
  it('host selects WP99 (wpId only, data not yet swapped, status still ready): no "WP99 loaded" over the old WP', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const s = await mount({ workPackage: wp, detail: pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: wp.wpId });
    s.wpId = 'WP99';
    await settle(s);
    expect(liveText(s)).not.toBe(announceLoaded('WP99'));
    expect(liveText(s)).toBe(announceLoading('WP99'));
    // the data arrives: the shown Work Package is now the selected one, and only then is it announced as loaded
    const next = { ...wp, wpId: 'WP99' };
    s.workPackage = next;
    await settle(s);
    expect(liveText(s)).toBe(announceLoaded('WP99'));
  });
  it('a host that drives by workPackage only (wpId stays empty) hears the new Work Package announced as loaded', async () => {
    const a = WORK_PACKAGE_FIXTURES.wpPopulated;
    const b = WORK_PACKAGE_FIXTURES.wpActorHandle;
    expect(a.wpId).not.toBe(b.wpId);
    const s = await mount({ workPackage: a, detail: null, wpId: '' });
    s.workPackage = b;
    await settle(s);
    expect(liveText(s)).toBe(announceLoaded(b.wpId));
  });
});
