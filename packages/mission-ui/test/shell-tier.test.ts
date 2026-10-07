// The shell tier controller (DESIGN-003, DESIGN-004): it finds the enclosing shell across shadow roots, observes its `tier`,
// stops on detach, follows only the new shell after a re-parent, and exposes the tier as the CSS custom state
// `:state(shell-mobile)` (no attribute on the host).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { LitElement, html, render } from 'lit';
import { SHELL_MOBILE_STATE, ShellTierController } from '../src/shell-tier.js';
import * as entry from '../src/index.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

class TierProbeHost extends LitElement {
  readonly shellTier = new ShellTierController(this);
  updates = 0;
  protected override render(): unknown {
    this.updates += 1;
    return html`<slot></slot>`;
  }
}
customElements.define('tier-probe-host', TierProbeHost);

afterEach(() => {
  document.body.replaceChildren();
});

const mobile = (el: Element): boolean => el.matches(':state(shell-mobile)');
const tick = async (el: TierProbeHost): Promise<void> => {
  await el.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
const frame = (probe: Element): HTMLElement => {
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${probe}`, { layout: 'mission', current: 'nav-work-packages', flush: true }), box);
  return box;
};
const shellOf = (box: Element): HTMLElement => box.querySelector('sk-mission-shell') as HTMLElement;

describe('the custom state', () => {
  it('is available in this browser, and the host gets no data-shell-mobile attribute', async () => {
    await page.viewport(700, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    frame(probe);
    await tick(probe);
    expect(shellOf(document.body).getAttribute('tier')).toBe('mobile');
    expect(probe.shellTier.tier).toBe('mobile');
    expect(mobile(probe)).toBe(true);
    expect(probe.hasAttribute('data-shell-mobile')).toBe(false);
  });
  it('follows the live tier of the shell, and a host outside a shell has no tier (control)', async () => {
    await page.viewport(1280, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    const box = frame(probe);
    await tick(probe);
    expect(probe.shellTier.tier).toBe('expanded');
    expect(mobile(probe)).toBe(false);
    await page.viewport(700, 900);
    await expect.poll(() => mobile(probe)).toBe(true);
    await page.viewport(900, 900);
    await expect.poll(() => shellOf(box).getAttribute('tier')).toBe('collapsed');
    await expect.poll(() => mobile(probe)).toBe(false);
    expect(probe.shellTier.tier).toBe('collapsed');
    const bare = document.createElement('tier-probe-host') as TierProbeHost;
    document.body.append(bare);
    await tick(bare);
    expect(bare.shellTier.tier).toBeNull();
    expect(mobile(bare)).toBe(false);
  });
  it('asks the host to update when the tier changes', async () => {
    await page.viewport(1280, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    frame(probe);
    await tick(probe);
    const before = probe.updates;
    await page.viewport(700, 900);
    await expect.poll(() => probe.updates).toBeGreaterThan(before);
  });
});

describe('BOUNDARY-005: the enclosing shell is found across shadow roots', () => {
  it('a host inside a wrapper shadow root under the shell follows the mobile tier', async () => {
    await page.viewport(700, 900);
    const wrapper = document.createElement('div');
    frame(wrapper);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    wrapper.attachShadow({ mode: 'open' }).append(probe);
    await tick(probe);
    expect(document.querySelector('sk-mission-shell')?.getAttribute('tier')).toBe('mobile');
    expect(mobile(probe)).toBe(true);
    await page.viewport(1280, 900);
    await expect.poll(() => mobile(probe)).toBe(false);
  });
});

describe('TESTS-001: the observer is released on detach and follows only the new shell on re-parent', () => {
  it('a detached host does not follow the shell, and the state is cleared', async () => {
    await page.viewport(700, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    const box = frame(probe);
    await tick(probe);
    expect(mobile(probe)).toBe(true);
    probe.remove();
    expect(mobile(probe)).toBe(false);
    expect(probe.shellTier.tier).toBeNull();
    await page.viewport(1280, 900);
    await expect.poll(() => shellOf(box).getAttribute('tier')).toBe('expanded');
    await page.viewport(700, 900);
    await expect.poll(() => shellOf(box).getAttribute('tier')).toBe('mobile');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mobile(probe), 'a detached host sets nothing').toBe(false);
  });
  it('releases its MutationObserver on disconnect', async () => {
    await page.viewport(700, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    frame(probe);
    await tick(probe);
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    probe.remove();
    expect(disconnect).toHaveBeenCalledTimes(1);
    disconnect.mockRestore();
  });
  it('a re-parented host follows the new shell only (positive control: the new shell drives it)', async () => {
    await page.viewport(1280, 900);
    const probe = document.createElement('tier-probe-host') as TierProbeHost;
    const first = frame(probe);
    await tick(probe);
    const oldShell = shellOf(first);
    const second = document.createElement('sk-mission-shell');
    document.body.append(second);
    second.append(probe);
    await tick(probe);
    expect(probe.closest('sk-mission-shell')).toBe(second);
    expect(mobile(probe)).toBe(false);
    oldShell.setAttribute('tier', 'mobile');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mobile(probe), 'the old shell no longer drives it').toBe(false);
    second.setAttribute('tier', 'mobile');
    await expect.poll(() => mobile(probe)).toBe(true);
  });
});

describe('the package entry exports the tier seam', () => {
  it('exports ShellTierController and SHELL_MOBILE_STATE as the very values of src/shell-tier.ts', () => {
    expect(entry.ShellTierController).toBe(ShellTierController);
    expect(entry.SHELL_MOBILE_STATE).toBe(SHELL_MOBILE_STATE);
    expect(SHELL_MOBILE_STATE).toBe('shell-mobile');
  });
});
