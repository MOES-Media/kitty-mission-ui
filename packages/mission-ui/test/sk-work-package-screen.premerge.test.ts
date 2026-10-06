// Pre-merge squad R2 findings, each pinned: the live region's repeat announcement (A11Y-001), the effective state of a ready
// screen with no Work Package (A11Y-003), the Assignment draw rule (CONTRACT-001), the shell lookup across shadow roots
// (BOUNDARY-005), the tier observer's detach and re-parent (TESTS-001) and the heading outline of the canceled screens (A11Y-002).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkWorkPackageScreen } from '../src/elements/sk-work-package-screen/sk-work-package-screen.js';
import { WORK_PACKAGE_FIXTURES, pairingProps, stateProps, workPackageFrame } from '../src/elements/sk-work-package-screen/fixtures.js';
import { CANCELLED_NOTICE_HEADING, announceLoaded } from '../src/defaults/index.js';

afterEach(() => {
  document.body.replaceChildren();
});

const tick = async (screen: SkWorkPackageScreen): Promise<void> => {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
};
async function mount(props: Record<string, unknown>, width = 1280): Promise<SkWorkPackageScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-work-package-screen');
  Object.assign(screen, { ...pairingProps('WP-01'), ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(workPackageFrame(html`${screen}`), box);
  await tick(screen);
  return screen;
}
const root = (screen: SkWorkPackageScreen): ShadowRoot => {
  if (screen.shadowRoot === null) throw new Error('no shadow root');
  return screen.shadowRoot;
};
const live = (screen: SkWorkPackageScreen): Element => {
  const found = root(screen).querySelector('[data-live]');
  if (found === null) throw new Error('no live region');
  return found;
};
const norm = (value: string | null | undefined): string => (value ?? '').replace(/\s+/g, ' ').trim();

describe('A11Y-001: a repeated announcement is a change in the live region', () => {
  it('loading, error, loading again: the same words are written anew (a childList mutation), and a silent update writes nothing', async () => {
    const screen = await mount({ status: 'loading', workPackage: null, detail: null, wpId: 'WP04' });
    screen.status = 'error';
    await tick(screen);
    screen.status = 'loading';
    await tick(screen);
    const first = norm(live(screen).textContent);
    expect(first).toContain('WP04');
    const records: MutationRecord[] = [];
    const observer = new MutationObserver((list) => records.push(...list));
    observer.observe(live(screen), { childList: true, characterData: true, subtree: true });
    screen.status = 'error';
    await tick(screen);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(records.length, 'error announces nothing of its own').toBe(0);
    screen.status = 'loading';
    await tick(screen);
    await new Promise((resolve) => setTimeout(resolve, 0));
    observer.disconnect();
    expect(norm(live(screen).textContent), 'the same words').toBe(first);
    expect(records.filter((record) => record.type === 'childList').length, 'a node was replaced').toBeGreaterThan(0);
  });
});

describe('A11Y-003: the announcement follows the effective state', () => {
  it('ready with no Work Package renders the empty form and announces no load (positive control: a Work Package does)', async () => {
    const screen = await mount({ status: 'loading', workPackage: null, detail: null, wpId: 'WP04' });
    screen.status = 'ready';
    await tick(screen);
    expect(root(screen).querySelectorAll('[data-region]').length).toBe(0);
    expect(norm(live(screen).textContent)).not.toBe(announceLoaded('WP04'));
    expect(norm(live(screen).textContent)).not.toContain('loaded');
    screen.workPackage = WORK_PACKAGE_FIXTURES.wpPopulated;
    await tick(screen);
    expect(norm(live(screen).textContent)).toBe(announceLoaded('WP04'));
  });
});

describe('CONTRACT-001: the Assignment panel is drawn from what it renders', () => {
  it('all-null assignment and authored members with subtasks present draws no Assignment region (positive control: one member does)', async () => {
    const base = WORK_PACKAGE_FIXTURES.wpPopulated;
    const empty = { agent: null, assignee: null, role: null, agentProfile: null, agentProfileVersion: null, model: null, provider: null };
    const subtasks = [{ id: 'T1', title: 'A subtask', done: false }] as unknown as typeof base.authored.subtasks;
    const wp = { ...base, assignment: empty, authored: { role: null, agentProfile: null, model: null, subtasks } };
    const screen = await mount({ workPackage: wp, detail: null });
    expect(root(screen).querySelector('[data-region="assignment"]')).toBeNull();
    screen.workPackage = { ...wp, assignment: { ...empty, agent: 'claude' } };
    await tick(screen);
    expect(root(screen).querySelector('[data-region="assignment"]')).not.toBeNull();
  });
});

describe('BOUNDARY-005: the enclosing shell is found across shadow roots', () => {
  it('a screen inside a wrapper shadow root under the shell follows the mobile tier', async () => {
    await page.viewport(700, 900);
    const box = document.createElement('div');
    document.body.append(box);
    const host = document.createElement('div');
    render(workPackageFrame(html`${host}`), box);
    const screen = document.createElement('sk-work-package-screen');
    Object.assign(screen, pairingProps('WP-01'));
    host.attachShadow({ mode: 'open' }).append(screen);
    await tick(screen);
    const shell = document.querySelector('sk-mission-shell');
    expect(shell?.getAttribute('tier')).toBe('mobile');
    expect(screen.hasAttribute('data-shell-mobile')).toBe(true);
    await page.viewport(1280, 900);
    await expect.poll(() => screen.hasAttribute('data-shell-mobile')).toBe(false);
  });
});

describe('TESTS-001: the tier observer is released on detach and follows only the new shell on re-parent', () => {
  const shellOf = (box: Element): HTMLElement => box.querySelector('sk-mission-shell') as HTMLElement;

  it('a detached screen does not follow the shell, and the attribute is cleared', async () => {
    await page.viewport(700, 900);
    const screen = document.createElement('sk-work-package-screen');
    Object.assign(screen, pairingProps('WP-01'));
    const box = document.createElement('div');
    document.body.append(box);
    render(workPackageFrame(html`${screen}`), box);
    await tick(screen);
    expect(screen.hasAttribute('data-shell-mobile')).toBe(true);
    screen.remove();
    expect(screen.hasAttribute('data-shell-mobile')).toBe(false);
    await page.viewport(1280, 900);
    await expect.poll(() => shellOf(box).getAttribute('tier')).toBe('expanded');
    await page.viewport(700, 900);
    await expect.poll(() => shellOf(box).getAttribute('tier')).toBe('mobile');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.hasAttribute('data-shell-mobile'), 'a detached screen sets nothing').toBe(false);
  });

  it('a re-parented screen follows the new shell only (positive control: the new shell drives it)', async () => {
    await page.viewport(1280, 900);
    const screen = document.createElement('sk-work-package-screen');
    Object.assign(screen, pairingProps('WP-01'));
    const first = document.createElement('div');
    document.body.append(first);
    render(workPackageFrame(html`${screen}`), first);
    await tick(screen);
    const oldShell = shellOf(first);
    // The second shell: only its reflected attribute matters to the screen.
    const second = document.createElement('sk-mission-shell');
    document.body.append(second);
    second.append(screen);
    await tick(screen);
    expect(screen.closest('sk-mission-shell')).toBe(second);
    expect(screen.hasAttribute('data-shell-mobile')).toBe(false);
    oldShell.setAttribute('tier', 'mobile');
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.hasAttribute('data-shell-mobile'), 'the old shell no longer drives it').toBe(false);
    second.setAttribute('tier', 'mobile');
    await expect.poll(() => screen.hasAttribute('data-shell-mobile')).toBe(true);
  });
});

describe('A11Y-002: the heading outline of the canceled screens', () => {
  it('the cancellation heading is an h2 at the panel level, and no outline skips a level', async () => {
    let ran = 0;
    for (const key of ['wpCanceled', 'wpCanceledSynthetic', 'wpCanceledNullReason'] as const) {
      const screen = await mount({ workPackage: WORK_PACKAGE_FIXTURES[key], detail: null });
      const headings = [...root(screen).querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const levels = headings.map((heading) => Number(heading.localName.slice(1)));
      const cancel = headings.find((heading) => norm(heading.textContent) === CANCELLED_NOTICE_HEADING);
      expect(cancel?.localName, key).toBe('h2');
      expect(levels[0], key).toBe(1);
      levels.forEach((level, index) => {
        if (index > 0) expect(level - (levels[index - 1] as number), `${key} #${index}`).toBeLessThanOrEqual(1);
      });
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(3);
  });
});

describe('A11Y-004: the h1 of a data-less state carries its text as a title, like the ready h1', () => {
  it('loading, not-found and nothing-selected (with and without an id) each have an h1 whose title is its text', async () => {
    const cases: Array<[string, Record<string, unknown>]> = [
      ['loading', { ...stateProps.loading(), wpId: 'WP07' }],
      ['loading without an id', { ...stateProps.loading(), wpId: '' }],
      ['not-found', { ...stateProps.notFound(), wpId: 'WP09' }],
      ['nothing-selected', stateProps.nothingSelected()],
    ];
    let ran = 0;
    for (const [name, props] of cases) {
      const screen = await mount(props);
      const h1 = root(screen).querySelector('h1');
      expect(h1, name).not.toBeNull();
      expect(norm(h1?.textContent), name).not.toBe('');
      expect(h1?.getAttribute('title'), name).toBe(norm(h1?.textContent));
      document.body.replaceChildren();
      ran += 1;
    }
    expect(ran).toBe(4);
    const ready = await mount({});
    const readyH1 = root(ready).querySelector('h1');
    expect(readyH1?.getAttribute('title'), 'positive control: the ready h1').toBe(norm(readyH1?.textContent));
  });
});
