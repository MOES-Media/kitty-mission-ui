// F1 (operator ruling): the tier controller degrades loudly. A browser without custom states, or one whose `states.add`
// throws, never stops the screen rendering; one console warning per page names the missing feature, and the tier is still tracked.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import { resetShellTierWarning } from '../src/shell-tier.js';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { pairingProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';

afterEach(() => {
  vi.restoreAllMocks();
  resetShellTierWarning();
  document.body.replaceChildren();
});

async function mountWith(internals: object): Promise<{ screen: SkWorkPackageScreen; warn: ReturnType<typeof vi.spyOn> }> {
  await page.viewport(700, 900);
  resetShellTierWarning();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(HTMLElement.prototype, 'attachInternals').mockReturnValue(internals as ElementInternals);
  const screen = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
  Object.assign(screen, pairingProps('WP-01'));
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  return { screen, warn };
}

describe('the tier controller degrades loudly', () => {
  it('without ElementInternals.states the screen still renders, tracks the tier and warns once', async () => {
    const { screen, warn } = await mountWith({ states: undefined });
    expect(screen.shadowRoot?.querySelector('[data-grid]')).not.toBeNull();
    expect((screen as unknown as { shellTier: { tier: string } }).shellTier.tier).toBe('mobile');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('custom states');
  });
  it('a states object whose add() throws: the screen still renders and one warning is logged', async () => {
    const { screen, warn } = await mountWith({
      states: {
        add: () => {
          throw new DOMException("The state must start with '--'", 'SyntaxError');
        },
        delete: () => true,
      },
    });
    expect(screen.shadowRoot?.querySelector('[data-grid]')).not.toBeNull();
    expect((screen as unknown as { shellTier: { tier: string } }).shellTier.tier).toBe('mobile');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('custom states');
  });
  it('an attachInternals() that throws (internals already attached) warns once with its own message and the screen renders', async () => {
    await page.viewport(700, 900);
    resetShellTierWarning();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, 'attachInternals').mockImplementation(() => {
      throw new DOMException('ElementInternals already attached', 'NotSupportedError');
    });
    const screen = document.createElement('sk-work-package-screen') as SkWorkPackageScreen;
    Object.assign(screen, pairingProps('WP-01'));
    const box = document.createElement('div');
    document.body.append(box);
    render(workPackageFrame(html`${screen}`), box);
    await screen.updateComplete;
    expect(screen.shadowRoot?.querySelector('[data-grid]')).not.toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('internals already attached');
    expect(String(warn.mock.calls[0]?.[0])).not.toContain('not available in this browser');
  });
});
