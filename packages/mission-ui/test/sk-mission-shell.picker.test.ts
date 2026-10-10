import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkMissionShell } from '../src/elements/sk-mission-shell/sk-mission-shell.js';
import { missionArgs, projectArgs } from '../src/elements/sk-mission-shell/fixtures.js';
import type { ShellTier } from '../src/shell-types.js';

afterEach(async () => {
  document.body.replaceChildren();
  await page.viewport(414, 896);
});

type Args = Partial<Record<keyof SkMissionShell, unknown>>;

// The viewport is set first: the default iframe is 414x896.
async function mount(width: number, args: Args): Promise<SkMissionShell> {
  await page.viewport(width, 800);
  const el = document.createElement('sk-mission-shell');
  Object.assign(el, args);
  el.style.blockSize = '100vh';
  const content = document.createElement('p');
  content.dataset.content = '';
  content.textContent = 'Screen content';
  el.append(content);
  document.body.append(el);
  await el.updateComplete;
  return el;
}

function root(el: SkMissionShell): ShadowRoot {
  if (!el.shadowRoot) throw new Error('no shadow root');
  return el.shadowRoot;
}

const CHROME = {
  sidebar: 'sk-context-sidebar',
  rail: 'sk-personal-rail',
  iconColumn: '[data-icon-column]',
  flyout: '[data-flyout]',
  drawer: 'dialog[data-drawer]',
  hamburger: 'header sk-button[label="Open navigation"]',
  navItems: 'sk-shell-nav-item',
};

function counts(el: SkMissionShell): Record<keyof typeof CHROME, number> {
  const out = {} as Record<keyof typeof CHROME, number>;
  let ran = 0;
  for (const [name, selector] of Object.entries(CHROME)) {
    out[name as keyof typeof CHROME] = root(el).querySelectorAll(selector).length;
    ran += 1;
  }
  expect(ran).toBe(7);
  return out;
}

// Nav items carry their mark in a `current` property; the aria-current attribute lives inside their own shadow root.
function markedCount(el: SkMissionShell): number {
  const items = Array.from(root(el).querySelectorAll<HTMLElement & { current?: string }>('sk-shell-nav-item'));
  return items.filter((item) => item.current !== undefined && item.current !== '').length;
}

const NONE = { sidebar: 0, rail: 0, iconColumn: 0, flyout: 0, drawer: 0, hamburger: 0, navItems: 0 };
const TIERS: Array<[number, ShellTier]> = [
  [1280, 'expanded'],
  [1100, 'expanded'],
  [800, 'collapsed'],
  [620, 'mobile'],
];

describe('sk-mission-shell layout="picker"', () => {
  it('draws no navigation chrome at 1280, 1100, 800 and 620, paired with the project layout drawing it', async () => {
    let ran = 0;
    for (const [width, tier] of TIERS) {
      const picker = await mount(width, { ...projectArgs, layout: 'picker' });
      expect(counts(picker), `picker at ${width}`).toEqual(NONE);
      expect(picker.tier).toBe(tier);
      expect(root(picker).querySelectorAll('header[data-top-bar]').length).toBe(1);
      expect(root(picker).querySelectorAll('[data-skip-link]').length).toBe(1);
      picker.remove();

      const project = await mount(width, projectArgs);
      const drawn = counts(project);
      if (tier === 'expanded') expect(drawn.sidebar).toBe(1);
      if (tier === 'collapsed') expect(drawn.iconColumn).toBe(1);
      if (tier === 'mobile') expect(drawn.hamburger).toBe(1);
      project.remove();
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('draws no rail where the mission layout draws one', async () => {
    const mission = await mount(1280, missionArgs);
    expect(counts(mission).rail).toBe(1);
    mission.remove();
    const picker = await mount(1280, { ...missionArgs, layout: 'picker' });
    expect(counts(picker).rail).toBe(0);
    expect(counts(picker).sidebar).toBe(0);
  });

  it('lays the body out as one column at every tier', async () => {
    let ran = 0;
    for (const [width] of TIERS) {
      const el = await mount(width, { ...projectArgs, layout: 'picker' });
      const body = root(el).querySelector('[data-body]') as HTMLElement;
      expect(body.dataset.layout).toBe('picker');
      expect(getComputedStyle(body).gridTemplateColumns.split(' ').length).toBe(1);
      expect(root(el).querySelectorAll('[data-content]').length).toBe(1);
      el.remove();
      ran += 1;
    }
    expect(ran).toBe(4);
  });

  it('falls back to project for an unknown or near-miss layout value', async () => {
    let ran = 0;
    for (const value of ['Picker', 'picker ', 'pickers', 'bogus', '']) {
      const el = await mount(1280, { ...projectArgs, layout: value });
      const body = root(el).querySelector('[data-body]') as HTMLElement;
      expect(body.dataset.layout, value).toBe('project');
      expect(counts(el).sidebar, value).toBe(1);
      el.remove();
      ran += 1;
    }
    expect(ran).toBe(5);
  });

  it('ignores navigation data in picker and still reflects the tier', async () => {
    // Positive controls: the project layout draws a marked item (expanded) and the context label (mobile) from the same data.
    const marked = await mount(1280, projectArgs);
    expect(markedCount(marked)).toBeGreaterThan(0);
    marked.remove();
    const labelled = await mount(620, projectArgs);
    expect(root(labelled).querySelectorAll('[data-top-bar-context]').length).toBe(1);
    labelled.remove();

    let ran = 0;
    for (const width of [1280, 620]) {
      const bare = await mount(width, { ...projectArgs, layout: 'picker' });
      expect(markedCount(bare), `marked items at ${width}`).toBe(0);
      expect(root(bare).querySelector('[data-top-bar-context]'), `context at ${width}`).toBeNull();
      bare.remove();
      ran += 1;
    }
    expect(ran).toBe(2);
    const el = await mount(800, { ...missionArgs, layout: 'picker' });
    expect(counts(el)).toEqual(NONE);
    expect(el.getAttribute('tier')).toBe('collapsed');
  });

  it('forces drawer-open and flyout-open false', async () => {
    let ran = 0;
    for (const width of [620, 800]) {
      const el = await mount(width, { ...projectArgs, layout: 'picker', drawerOpen: true, flyoutOpen: true });
      await el.updateComplete;
      expect(el.drawerOpen, `drawer at ${width}`).toBe(false);
      expect(el.flyoutOpen, `flyout at ${width}`).toBe(false);
      expect(counts(el)).toEqual(NONE);
      el.remove();
      ran += 1;
    }
    expect(ran).toBe(2);
    // Positive control: the project layout at the mobile tier does open its drawer.
    const project = await mount(620, { ...projectArgs, drawerOpen: true });
    expect(project.drawerOpen).toBe(true);
    expect(counts(project).drawer).toBe(1);
  });

  it('keeps the status region and the content slot', async () => {
    const el = await mount(1280, { ...projectArgs, layout: 'picker', status: 'error', errorMessage: 'Broken.' });
    expect(root(el).textContent).toContain('Broken.');
    expect(root(el).querySelectorAll('main slot').length).toBe(1);
  });
});
