// Landing pass (#5), DESIGN-005: the screen's `mission` has the contract's field names, so the Pipeline screen's Mission
// object is assignable to it unchanged.
import { afterEach, describe, expect, it } from 'vitest';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkWorkPackageScreen, WpScreenMission } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { implementInProgress } from '../src/elements/sk-pipeline-screen/fixtures.js';
import { LANE_COUNT_TEXT } from '../src/defaults/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

describe('DESIGN-005: a Pipeline Mission object feeds the Work Package screen unchanged', () => {
  it('is assignable and names its slug and count in the nothing-selected header', async () => {
    const mission: WpScreenMission = implementInProgress;
    const s = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
    Object.assign(s, { status: 'nothing-selected', mission });
    document.body.append(s);
    await s.updateComplete;
    const text = (s.shadowRoot as ShadowRoot).textContent?.replace(/\s+/g, ' ') ?? '';
    expect(text).toContain(LANE_COUNT_TEXT(implementInProgress.wpTotal));
    expect(text).toContain(implementInProgress.slug);
    expect(text).not.toContain('undefined');
  });
  it('the crumb names the Mission by its friendlyName', async () => {
    const s = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
    Object.assign(s, { status: 'loading', wpId: 'WP01', mission: implementInProgress });
    document.body.append(s);
    await s.updateComplete;
    expect((s.shadowRoot as ShadowRoot).querySelector('nav')?.textContent).toContain(implementInProgress.friendlyName);
  });
});
