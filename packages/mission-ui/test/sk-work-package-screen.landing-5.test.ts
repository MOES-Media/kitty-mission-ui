// Landing pass (#5), CORR-005: see kitty-specs/work-package-screen-01M44DSJ/contracts/sk-work-package-screen.md.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { announceLoadedDetailUnavailable } from '../src/defaults/index.js';

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


describe('CORR-005: a load that completes with a refused detail never announces the refusal', () => {
  it('loading -> ready with detailStatus error in the same update: one line says loaded and the detail is unavailable', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const s = await mount({ status: 'loading', workPackage: null, detail: null, wpId: wp.wpId, detailStatus: 'loading' });
    s.status = 'ready';
    s.workPackage = wp;
    s.detailStatus = 'error';
    await settle(s);
    expect(sr(s).querySelector('[data-region="detail-notice"]')).not.toBeNull();
    expect(liveText(s)).toBe(announceLoadedDetailUnavailable(wp.wpId));
  });
});
