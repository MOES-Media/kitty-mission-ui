// Landing pass (#5), CORR-001: see kitty-specs/work-package-screen-01M44DSJ/contracts/sk-work-package-screen.md.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps, sampleMission, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
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
const ids = (s: SkWorkPackageScreen): string[] => [...sr(s).querySelectorAll('[data-region]')].map((e) => e.getAttribute('data-region') as string);


describe('CORR-001: a detail of another Mission (same wpId) must count as omitted (WpId is unique only within a Mission)', () => {
  it('detail.missionId !== mission.missionId: no detail-only region, bare lists', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    // control: same Mission -> the detail-only regions draw
    const ok = await mount({ workPackage: wp, detail: pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: wp.wpId });
    expect(ids(ok)).toEqual(expect.arrayContaining(['workspace', 'artifact-links', 'review-cycles']));
    document.body.replaceChildren();
    const foreign = { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), missionId: '01JZZZZZZZZZZZZZZZZZZZZZZZ' };
    const s = await mount({ workPackage: wp, detail: foreign, wpId: wp.wpId, mission: sampleMission });
    expect(ids(s)).not.toContain('workspace');
    expect(ids(s)).not.toContain('artifact-links');
  });
  it('Open spec.md of a foreign-Mission detail must not emit a payload pairing this missionId with that Mission\'s path', async () => {
    const wp = WORK_PACKAGE_FIXTURES.wpPopulated;
    const foreign = { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), missionId: '01JZZZZZZZZZZZZZZZZZZZZZZZ' };
    const s = await mount({ workPackage: wp, detail: foreign, wpId: wp.wpId });
    const seen: CustomEvent[] = [];
    s.parentElement?.addEventListener('sk-open-artifact', (e) => seen.push(e as CustomEvent));
    const btn = sr(s).querySelector<HTMLElement>('[data-region="artifact-links"] sk-button');
    btn?.shadowRoot?.querySelector('button')?.click();
    expect(seen).toEqual([]);
  });
});
