// Landing pass (#5), CORR-003: see kitty-specs/work-package-screen-01M44DSJ/contracts/sk-work-package-screen.md.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import type { WpScreenProps } from '../src/elements/sk-work-package-screen/fixtures.js';

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


describe('CORR-003: focus restoration ignores effective-state and shown-WP changes', () => {
  it('ready -> workPackage null (effective state empty) detaches the focused crumb: focus must land in the screen', async () => {
    const s = await mount({});
    const crumb = sr(s).querySelector<HTMLElement>('[data-region="header"] nav sk-button') as HTMLElement;
    crumb.shadowRoot?.querySelector('button')?.focus();
    expect(sr(s).activeElement).toBe(crumb);
    s.workPackage = null;
    await settle(s);
    await settle(s);
    expect(crumb.isConnected).toBe(false);
    expect(document.activeElement).toBe(s);
  });
  it('a dependency-node swap by a host that leaves wpId empty loses focus to body', async () => {
    const s = await mount({ ...pairingProps('WP-49'), wpId: '' });
    const node = sr(s).querySelector<HTMLElement>('[data-region="dependency-chain"] ul sk-button') as HTMLElement;
    node.shadowRoot?.querySelector('button')?.focus();
    const next = WORK_PACKAGE_FIXTURES.wpActorHandle;
    s.workPackage = next;
    s.detail = pairDetail(next, DETAIL_FIXTURES.detailDepsNone);
    await settle(s);
    await settle(s);
    expect(node.isConnected).toBe(false);
    expect(document.activeElement).toBe(s);
  });
});
