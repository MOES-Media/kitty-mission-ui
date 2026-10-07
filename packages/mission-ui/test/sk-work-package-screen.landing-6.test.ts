// Landing pass (#5), F6: "detail loaded" is announced only when a detail is actually drawn; a withheld (foreign-Mission or
// mismatched) detail announces nothing new.
import { afterEach, describe, expect, it } from 'vitest';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { DETAIL_FIXTURES, WORK_PACKAGE_FIXTURES, pairDetail, pairingProps } from '../src/elements/sk-work-package-screen/fixtures.js';
import { ANNOUNCE_DETAIL_LOADED } from '../src/defaults/index.js';

afterEach(() => {
  document.body.replaceChildren();
});
const live = (s: Element): string => ((s.shadowRoot as ShadowRoot).querySelector('[data-live]')?.textContent ?? '').trim();
const wp = WORK_PACKAGE_FIXTURES.wpPopulated;

async function loadingThenReady(detail: SkWorkPackageScreen['detail']): Promise<SkWorkPackageScreen> {
  const s = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
  Object.assign(s, { ...pairingProps('WP-01'), detailStatus: 'loading', detail });
  document.body.append(s);
  await s.updateComplete;
  s.detailStatus = 'ready';
  await s.updateComplete;
  return s;
}

describe('F6: the detail-loaded announcement follows the detail that is drawn', () => {
  it('a matching detail announces "detail loaded" (control)', async () => {
    const s = await loadingThenReady(pairDetail(wp, DETAIL_FIXTURES.detailPopulated));
    expect(live(s)).toBe(ANNOUNCE_DETAIL_LOADED);
  });
  it('a foreign-Mission detail announces nothing new', async () => {
    const foreign = { ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), missionId: '01JZZZZZZZZZZZZZZZZZZZZZZZ' };
    const s = await loadingThenReady(foreign);
    expect(live(s)).toBe('');
  });
  it('a detail of another Work Package announces nothing new', async () => {
    const s = await loadingThenReady({ ...pairDetail(wp, DETAIL_FIXTURES.detailPopulated), wpId: 'WP99' });
    expect(live(s)).toBe('');
  });
  it('the matching detail arriving later, with the status already ready, is announced then', async () => {
    const s = await loadingThenReady(null);
    expect(live(s)).toBe('');
    s.detail = pairDetail(wp, DETAIL_FIXTURES.detailPopulated);
    await s.updateComplete;
    expect(live(s)).toBe(ANNOUNCE_DETAIL_LOADED);
  });
});
