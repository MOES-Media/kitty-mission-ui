// Landing pass (#5), CORR-004: the screen never shows a mixed identity; a `wpId` that differs from the Work Package fails closed.
import { afterEach, describe, expect, it } from 'vitest';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps } from '../src/elements/sk-work-package-screen/fixtures.js';

afterEach(() => {
  document.body.replaceChildren();
});
const sr = (s: Element): ShadowRoot => s.shadowRoot as ShadowRoot;

describe('CORR-004: wpId and workPackage disagree', () => {
  it('renders the data-less loading header of the selected id, never the old Work Package', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const s = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
    Object.assign(s, pairingProps('WP-01'));
    document.body.append(s);
    await s.updateComplete;
    expect(sr(s).querySelector('[data-grid]')).not.toBeNull();
    s.wpId = 'WP99';
    await s.updateComplete;
    expect(sr(s).querySelector('[data-grid]')).toBeNull();
    expect(sr(s).querySelector('h1')?.textContent?.trim()).toBe('WP99');
    expect(sr(s).querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(sr(s).textContent).not.toContain(wp.title);
  });
  it('an empty wpId, or one equal to the Work Package id, keeps the ready screen', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const s = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
    Object.assign(s, { ...pairingProps('WP-01'), wpId: '' });
    document.body.append(s);
    await s.updateComplete;
    expect(sr(s).querySelector('[data-grid]')).not.toBeNull();
    s.wpId = wp.wpId;
    await s.updateComplete;
    expect(sr(s).querySelector('[data-grid]')).not.toBeNull();
  });
});
