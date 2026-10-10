// The header band and the toolbar of the Projects screen (FR-010, FR-013, PR-18): four parts, the count hidden while the whole
// list is not ready, the band's own geometry, and the parts called directly with their handler.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import { html, render } from 'lit';
import type { SkProjectsScreen } from '../src/elements/sk-projects-screen/sk-projects-screen.js';
import { renderHeader, renderToolbar } from '../src/elements/sk-projects-screen/header-parts.js';
import { NOW, threeEntries } from '../src/elements/sk-projects-screen/fixtures.js';
import { OPEN_PROJECT_LABEL, PROJECTS_EYEBROW, PROJECTS_INTRO, PROJECTS_TITLE, RECENT_PROJECTS_EYEBROW, projectCountText } from '../src/defaults/index.js';
import { shellFrame } from '../src/story-support/shell-frame.js';

afterEach(() => {
  document.body.replaceChildren();
});

async function settle(screen: SkProjectsScreen): Promise<void> {
  await screen.updateComplete;
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
}

async function mount(props: Partial<SkProjectsScreen> = {}, width = 1280): Promise<SkProjectsScreen> {
  await page.viewport(width, 900);
  const screen = document.createElement('sk-projects-screen');
  Object.assign(screen, { status: 'ready', entries: threeEntries(), now: NOW, ...props });
  const box = document.createElement('div');
  document.body.append(box);
  render(shellFrame(html`${screen}`, { layout: 'picker', flush: true }), box);
  await settle(screen);
  // The library header and button render in their own update cycle.
  await Promise.all(Array.from(screen.shadowRoot?.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('sk-page-header, sk-button') ?? []).map((el) => el.updateComplete));
  return screen;
}

function root(el: Element): ShadowRoot {
  if (el.shadowRoot === null) throw new Error('no shadow root');
  return el.shadowRoot;
}
function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (found === null) throw new Error(`missing ${selector}`);
  return found;
}
const text = (el: Element): string => (el.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('the header band: four parts (PR-18)', () => {
  it('draws the eyebrow, the title as the one h1, the muted copy and the "Open project" button, in the band', async () => {
    const screen = await mount();
    const band = one(root(screen), '[data-region="header"]');
    const header = one(band, 'sk-page-header');
    expect(text(one(header, '[slot="eyebrow"]'))).toBe(PROJECTS_EYEBROW);
    const title = one(header, 'h1[slot="title"]');
    expect(text(title)).toBe(PROJECTS_TITLE);
    expect(root(screen).querySelectorAll('h1')).toHaveLength(1);
    expect(text(one(header, '[slot="supporting"]'))).toBe(PROJECTS_INTRO);
    const button = one<HTMLElement>(band, ':scope > sk-button');
    expect(text(button)).toBe(OPEN_PROJECT_LABEL);
    expect(button.getAttribute('variant')).toBe('primary');
    expect(band.querySelectorAll('sk-button')).toHaveLength(1);
  });

  it('keeps the band at the prototype minimum (76px) with the 24px title and the 12px eyebrow (E-34)', async () => {
    const screen = await mount();
    const band = one<HTMLElement>(root(screen), '[data-region="header"]');
    expect(band.getBoundingClientRect().height).toBeGreaterThanOrEqual(76);
    expect(getComputedStyle(band).borderBlockEndWidth).toBe('1px');
    const title = one<HTMLElement>(band, 'h1');
    expect(getComputedStyle(title).fontSize).toBe('24px');
    const eyebrow = one<HTMLElement>(band, 'sk-page-header')?.shadowRoot?.querySelector<HTMLElement>('[part="eyebrow"]');
    expect(eyebrow).toBeTruthy();
    expect(getComputedStyle(eyebrow as HTMLElement).fontSize).toBe('12px');
    expect(getComputedStyle(eyebrow as HTMLElement).textTransform).toBe('uppercase');
  });

  it('puts the button on the right of the copy at 1280 and below it at 800 (the band stacks)', async () => {
    const wide = await mount({}, 1280);
    const wideButton = one<HTMLElement>(root(wide), '[data-region="header"] > sk-button').getBoundingClientRect();
    const wideTitle = one<HTMLElement>(root(wide), 'h1').getBoundingClientRect();
    expect(wideButton.left).toBeGreaterThan(wideTitle.right);
    document.body.replaceChildren();
    const narrow = await mount({}, 800);
    const narrowButton = one<HTMLElement>(root(narrow), '[data-region="header"] > sk-button').getBoundingClientRect();
    const narrowCopy = one<HTMLElement>(root(narrow), '[slot="supporting"]').getBoundingClientRect();
    expect(narrowButton.top).toBeGreaterThanOrEqual(narrowCopy.bottom - 1);
  });
});

describe('the toolbar: "Recent projects" and the count', () => {
  it('shows the eyebrow and the entry count in plural form when the list is ready', async () => {
    const screen = await mount();
    const toolbar = one(root(screen), '[data-region="toolbar"]');
    expect(text(one(toolbar, '[data-eyebrow]'))).toBe(RECENT_PROJECTS_EYEBROW);
    expect(text(one(toolbar, '[data-count]'))).toBe(projectCountText(3));
    expect(projectCountText(3)).toBe('3 projects');
    expect(getComputedStyle(one(toolbar, '[data-count]')).fontFamily).toContain('JetBrains Mono');
  });

  it('counts every entry the host gave, singular for one', async () => {
    const screen = await mount({ entries: threeEntries().slice(0, 1) });
    expect(text(one(root(screen), '[data-count]'))).toBe(projectCountText(1));
    expect(projectCountText(1)).toBe('1 project');
  });

  it('hides the count while the whole list loads, fails or is empty, and keeps the eyebrow (DOM absence, ready is the present case)', async () => {
    const ready = await mount();
    expect(root(ready).querySelectorAll('[data-count]')).toHaveLength(1);
    document.body.replaceChildren();
    let ran = 0;
    for (const status of ['loading', 'error', 'empty'] as const) {
      const screen = await mount({ status, entries: [] });
      expect(root(screen).querySelectorAll('[data-count]'), status).toHaveLength(0);
      expect(text(one(root(screen), '[data-region="toolbar"] [data-eyebrow]')), status).toBe(RECENT_PROJECTS_EYEBROW);
      ran += 1;
      document.body.replaceChildren();
    }
    expect(ran).toBe(3);
  });
});

describe('the parts called directly', () => {
  it('renderHeader hands the click of the button to its handler once, and draws it only through that handler', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    let calls = 0;
    render(renderHeader({ onRequestOpen: () => (calls += 1) }), host);
    const button = one<HTMLElement & { updateComplete: Promise<unknown> }>(host, 'sk-button');
    await button.updateComplete;
    button.click();
    expect(calls).toBe(1);
    // Positive control: a second click reaches the same handler (the first count was not an accident of setup).
    button.click();
    expect(calls).toBe(2);
  });

  it('renderToolbar draws the count only for a text, and nothing for null', () => {
    const withCount = document.createElement('div');
    const without = document.createElement('div');
    render(renderToolbar({ countText: '7 projects' }), withCount);
    render(renderToolbar({ countText: null }), without);
    expect(text(one(withCount, '[data-count]'))).toBe('7 projects');
    expect(without.querySelectorAll('[data-count]')).toHaveLength(0);
    expect(text(one(without, '[data-eyebrow]'))).toBe(RECENT_PROJECTS_EYEBROW);
  });
});

describe('WP06 ruling: the header type of the prototype (E-34 c)', () => {
  it('draws the h1 in the display face, default colour, -0.01em tracking and a 1.2 line, and the muted copy in the muted colour', async () => {
    const screen = await mount();
    const band = one<HTMLElement>(root(screen), '[data-region="header"]');
    const title = getComputedStyle(one<HTMLElement>(band, 'h1'));
    expect(title.fontFamily).toContain('Falling Sky');
    expect(title.letterSpacing).toBe('-0.24px');
    expect(title.lineHeight).toBe('28.8px');
    const sample = document.createElement('span');
    sample.style.color = 'var(--sk-fg-default)';
    document.body.append(sample);
    expect(title.color).toBe(getComputedStyle(sample).color);
    sample.style.color = 'var(--sk-fg-muted)';
    expect(getComputedStyle(one<HTMLElement>(band, '[slot="supporting"]')).color).toBe(getComputedStyle(sample).color);
    expect(getComputedStyle(one<HTMLElement>(band, '[slot="supporting"]')).fontSize).toBe('14px');
  });

  it('draws the eyebrows semibold and the count at 14px mono', async () => {
    const screen = await mount();
    const eyebrow = one<HTMLElement>(one<HTMLElement>(root(screen), 'sk-page-header').shadowRoot as ShadowRoot, '[part="eyebrow"]');
    expect(getComputedStyle(eyebrow).fontWeight).toBe('600');
    const toolbarEyebrow = one<HTMLElement>(one<HTMLElement>(root(screen), 'sk-section-header').shadowRoot as ShadowRoot, '[part="eyebrow"]');
    expect(getComputedStyle(toolbarEyebrow).fontWeight).toBe('600');
    expect(getComputedStyle(one<HTMLElement>(root(screen), '[data-count]')).fontSize).toBe('14px');
  });
});

describe('E-34 (d): the "Open project" button box of the prototype', () => {
  it('is 44px high at 14px and weight 600, the library button otherwise', async () => {
    const screen = await mount();
    const part = one<HTMLElement>(one<HTMLElement>(root(screen), '[data-region="header"] > sk-button').shadowRoot as ShadowRoot, 'button');
    const style = getComputedStyle(part);
    expect(part.getBoundingClientRect().height).toBe(44);
    expect(style.fontSize).toBe('14px');
    expect(style.fontWeight).toBe('600');
    expect(style.paddingTop).toBe('8px');
    expect(style.paddingLeft).toBe('16px');
  });
});
