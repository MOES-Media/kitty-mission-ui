import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkMissionShell } from '../src/elements/sk-mission-shell/sk-mission-shell.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import {
  artifactsTree,
  longMission,
  longProject,
  longTree,
  missionArgs,
  projectArgs,
  statusArgs,
  workPackageTree,
} from '../src/elements/sk-mission-shell/fixtures.js';
import type { ShellNavigateDetail, ShellTier, TreeToggleDetail } from '../src/shell-types.js';
import type { ViewState } from '../src/view-state.js';

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.style.fontSize = '';
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

type Args = Partial<SkMissionShell>;

// Mounts a shell with one focusable anchor as its content. The viewport is set first: the default iframe is 414x896.
async function mount(width: number, args: Args = projectArgs, height = 800): Promise<SkMissionShell> {
  await page.viewport(width, height);
  const el = document.createElement('sk-mission-shell');
  Object.assign(el, args);
  el.style.blockSize = '100vh';
  const content = document.createElement('a');
  content.href = '#content-link';
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

function one<T extends Element>(scope: ParentNode, selector: string): T {
  const found = scope.querySelector<T>(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

// Every element matching `selector`, crossing shadow roots and light DOM alike.
function deepAll(scope: Element | ShadowRoot, selector: string): Element[] {
  const found: Element[] = [];
  const visit = (node: Element | ShadowRoot): void => {
    for (const child of Array.from(node.children)) {
      if (child.matches(selector)) found.push(child);
      visit(child);
      if (child.shadowRoot) visit(child.shadowRoot);
    }
  };
  visit(scope);
  if (scope instanceof Element && scope.shadowRoot) visit(scope.shadowRoot);
  return found;
}

function deepActive(): Element | null {
  let active: Element | null = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

async function settleTier(el: SkMissionShell, tier: ShellTier): Promise<void> {
  await vi.waitFor(() => expect(el.tier).toBe(tier));
  await el.updateComplete;
}

// A slotted tree that is not assigned to a rendered slot (collapsed and mobile tiers) is outside the accessibility
// tree, so its marks do not count.
function hiddenTree(node: Element): boolean {
  let current: Node = node;
  while (current instanceof Element || current instanceof ShadowRoot) {
    if (current instanceof Element && current.localName === 'sk-shell-tree') return current.assignedSlot === null;
    current = current instanceof ShadowRoot ? current.host : ((current.getRootNode() as ShadowRoot).host ?? current.parentNode);
    if (!current) break;
  }
  return false;
}

function pageAnchors(el: SkMissionShell): Element[] {
  return deepAll(el, '[aria-current="page"]').filter((anchor) => !hiddenTree(anchor));
}

function pageMarks(el: SkMissionShell): number {
  return pageAnchors(el).length;
}

function navItems(el: SkMissionShell, scope: string): Array<{ id: string; current: string }> {
  return Array.from(root(el).querySelectorAll<HTMLElement & { current: string }>(`${scope} sk-shell-nav-item`)).map((item) => ({
    id: item.getAttribute('item-id') ?? '',
    current: item.current,
  }));
}

// The landmark names, in document order: the library rail's label stands for the navigation inside its own shadow root.
function navLabels(el: SkMissionShell): string[] {
  return Array.from(root(el).querySelectorAll('nav, sk-personal-rail')).map((nav) => nav.getAttribute('aria-label') ?? nav.getAttribute('label') ?? '');
}

function complementaryCount(el: SkMissionShell): number {
  return Array.from(root(el).querySelectorAll('sk-context-sidebar')).filter((side) => side.shadowRoot?.querySelector('aside')).length;
}

function mountTree(el: SkMissionShell, items = workPackageTree, current = ''): SkShellTree {
  const tree = document.createElement('sk-shell-tree');
  tree.slot = 'sidebar-section';
  tree.heading = 'Work packages';
  tree.label = 'Work packages';
  tree.items = items;
  tree.current = current;
  el.append(tree);
  return tree;
}

describe('tier (FR-005, D-02)', () => {
  const cases: Array<[number, ShellTier]> = [
    [719, 'mobile'],
    [720, 'collapsed'],
    [800, 'collapsed'],
    [1099, 'collapsed'],
    [1100, 'expanded'],
  ];
  for (const [width, tier] of cases) {
    it(`is ${tier} at ${width}px and reflects it`, async () => {
      const el = await mount(width);
      expect(el.tier).toBe(tier);
      expect(el.getAttribute('tier')).toBe(tier);
    });
  }

  it('follows the window across both breakpoints', async () => {
    const el = await mount(1280);
    await page.viewport(900, 800);
    await settleTier(el, 'collapsed');
    await page.viewport(500, 800);
    await settleTier(el, 'mobile');
    await page.viewport(1280, 800);
    await settleTier(el, 'expanded');
  });

  it('overwrites a host-set tier and a host-set attribute', async () => {
    const el = await mount(1280);
    el.tier = 'mobile';
    await el.updateComplete;
    expect(el.tier).toBe('expanded');
    expect(el.getAttribute('tier')).toBe('expanded');
    el.setAttribute('tier', 'collapsed');
    await el.updateComplete;
    expect(el.tier).toBe('expanded');
    expect(el.getAttribute('tier')).toBe('expanded');
  });

  it('stops listening when disconnected and catches up when connected again', async () => {
    const el = await mount(1280);
    el.remove();
    await page.viewport(500, 800);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(el.tier).toBe('expanded');
    document.body.append(el);
    await el.updateComplete;
    expect(el.tier).toBe('mobile');
  });
});

describe('frame and landmarks (FR-001, FR-002, FR-004, FR-008)', () => {
  it('project layout: top bar and one sidebar, no rail', async () => {
    const el = await mount(1280, projectArgs);
    expect(root(el).querySelector('[data-rail]')).toBeNull();
    expect(root(el).querySelectorAll('sk-context-sidebar')).toHaveLength(1);
    expect(root(el).querySelectorAll('header')).toHaveLength(1);
  });

  it('mission layout: top bar, local rail and the mission sidebar', async () => {
    const el = await mount(1280, missionArgs);
    expect(root(el).querySelectorAll('[data-rail] sk-shell-nav-item')).toHaveLength(missionArgs.railItems.length);
    expect(root(el).querySelectorAll('sk-context-sidebar')).toHaveLength(1);
  });

  it('puts pinned rail items in the bottom group', async () => {
    const el = await mount(1280, missionArgs);
    const pinned = root(el).querySelectorAll('[data-rail-pinned] sk-shell-nav-item');
    expect(pinned).toHaveLength(1);
    expect(pinned[0]?.getAttribute('item-id')).toBe('rail-projects');
  });

  it('falls back to the project layout for an unknown layout', async () => {
    const el = await mount(1280, { ...projectArgs, layout: 'bogus' as never });
    expect(root(el).querySelector('[data-rail]')).toBeNull();
    expect(one(root(el), '[data-body]').getAttribute('data-layout')).toBe('project');
  });

  const landmarkCases: Array<[string, number, Args, string[], number]> = [
    ['expanded mission', 1280, missionArgs, ['Global navigation', 'Section navigation'], 1],
    ['expanded project', 1280, projectArgs, ['Section navigation'], 1],
    ['collapsed mission', 900, missionArgs, ['Global navigation', 'Section navigation'], 0],
    ['collapsed project', 900, projectArgs, ['Section navigation'], 0],
    ['mobile mission', 390, missionArgs, [], 0],
    ['mobile project', 390, projectArgs, [], 0],
  ];
  for (const [name, width, args, navs, complementary] of landmarkCases) {
    it(`landmarks, ${name}: one banner, one main, ${complementary} complementary`, async () => {
      const el = await mount(width, args);
      expect(root(el).querySelectorAll('header')).toHaveLength(1);
      expect(root(el).querySelectorAll('main')).toHaveLength(1);
      expect(navLabels(el)).toEqual(navs);
      expect(complementaryCount(el)).toBe(complementary);
    });
  }

  it('collapsed: the icon column is a local nav of compact items, not the library sidebar', async () => {
    const el = await mount(900, missionArgs);
    expect(root(el).querySelector('sk-context-sidebar')).toBeNull();
    const column = one(root(el), '[data-icon-column]');
    const items = Array.from(column.querySelectorAll<HTMLElement & { compact: boolean }>('sk-shell-nav-item'));
    expect(items).toHaveLength(missionArgs.navItems.length);
    expect(items.every((item) => item.compact)).toBe(true);
    expect(getComputedStyle(column).overflow).toBe('visible');
    expect(root(el).querySelector('[data-rail]')).not.toBeNull();
  });

  it('collapsed: sidebar sections are not rendered', async () => {
    const el = await mount(900, missionArgs);
    mountTree(el);
    await el.updateComplete;
    expect(root(el).querySelector('slot[name="sidebar-section"]')).toBeNull();
  });

  it('mobile: neither rail nor sidebar, and the hamburger is in the top bar', async () => {
    const el = await mount(390, missionArgs);
    expect(root(el).querySelector('[data-rail]')).toBeNull();
    expect(root(el).querySelector('[data-icon-column]')).toBeNull();
    expect(root(el).querySelector('sk-context-sidebar')).toBeNull();
    const hamburger = one<HTMLElement>(root(el), 'header sk-button');
    expect(hamburger.getAttribute('label')).toBe('Open navigation');
    expect(hamburger.getAttribute('size')).toBe('icon');
  });

  it('has no hamburger outside mobile', async () => {
    const el = await mount(1280, missionArgs);
    expect(root(el).querySelector('header sk-button')).toBeNull();
  });

  it('closed overlays add nothing to the landmarks: the drawer dialog is empty and shut, no flyout', async () => {
    const el = await mount(390, missionArgs);
    const dialog = one<HTMLDialogElement>(root(el), 'dialog');
    expect(dialog.open).toBe(false);
    expect(dialog.children).toHaveLength(0);
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
  });

  it('top bar offers the brand and top-bar-actions slots with the brand fallback', async () => {
    const el = await mount(1280);
    const brand = one<HTMLSlotElement>(root(el), 'slot[name="brand"]');
    expect(brand.assignedNodes()).toHaveLength(0);
    expect(brand.textContent?.trim()).toBe('kitty desktop');
    const action = document.createElement('span');
    action.slot = 'top-bar-actions';
    action.textContent = 'Theme';
    const mark = document.createElement('span');
    mark.slot = 'brand';
    mark.textContent = 'Custom brand';
    el.append(action, mark);
    await el.updateComplete;
    expect(one<HTMLSlotElement>(root(el), 'slot[name="brand"]').assignedNodes()).toEqual([mark]);
    expect(one<HTMLSlotElement>(root(el), 'slot[name="top-bar-actions"]').assignedNodes()).toEqual([action]);
  });

  it('wraps the default slot in main > the focus target, and the target is focusable by script only', async () => {
    const el = await mount(1280);
    const main = one<HTMLElement>(root(el), 'main#content');
    const target = one<HTMLElement>(main, 'div[tabindex="-1"]');
    expect(target.querySelector('slot:not([name])')).not.toBeNull();
    expect(Array.from(root(el).querySelectorAll('main'))).toHaveLength(1);
  });
});

describe('status (FR-010, D-04)', () => {
  const statuses: ViewState[] = ['loading', 'error', 'empty', 'ready'];

  function region(el: SkMissionShell): HTMLElement {
    return one<HTMLElement>(root(el), '[data-status]');
  }

  it('loading: a pulsing indicator, aria-busy on the region only', async () => {
    const el = await mount(1280, { ...projectArgs, ...statusArgs('loading') });
    expect(region(el).querySelector('sk-status-indicator[pulsing]')).not.toBeNull();
    expect(region(el).getAttribute('aria-busy')).toBe('true');
    expect(deepAll(root(el), '[aria-busy]')).toEqual([region(el)]);
    expect(one(root(el), 'main').closest('[aria-busy]')).toBeNull();
    expect(el.hasAttribute('aria-busy')).toBe(false);
  });

  it('error: a danger notice with Retry in its actions slot, and the message', async () => {
    const el = await mount(1280, { ...projectArgs, ...statusArgs('error', 'Boom') });
    const notice = one<HTMLElement>(region(el), 'sk-notice');
    expect(notice.getAttribute('tone')).toBe('danger');
    expect(notice.textContent).toContain('Boom');
    expect(one(notice, 'sk-button[slot="actions"]').textContent?.trim()).toBe('Retry');
    expect(region(el).hasAttribute('aria-busy')).toBe(false);
  });

  it('error without a message shows a generic one', async () => {
    const el = await mount(1280, { ...projectArgs, status: 'error' });
    expect(one(region(el), 'sk-notice').textContent?.trim().length).toBeGreaterThan(0);
  });

  it('retry emits sk-shell-retry with an empty detail, bubbling and composed', async () => {
    const el = await mount(1280, { ...projectArgs, ...statusArgs('error') });
    const heard = vi.fn();
    document.addEventListener('sk-shell-retry', heard);
    one<HTMLElement>(region(el), 'sk-button[slot="actions"]').click();
    document.removeEventListener('sk-shell-retry', heard);
    expect(heard).toHaveBeenCalledTimes(1);
    const event = heard.mock.calls[0]?.[0] as CustomEvent;
    expect(event.detail).toEqual({});
    expect(event.bubbles && event.composed).toBe(true);
  });

  it('empty: an info notice', async () => {
    const el = await mount(1280, { ...projectArgs, status: 'empty' });
    expect(one(region(el), 'sk-notice').getAttribute('tone')).toBe('info');
  });

  it('ready: nothing in the region', async () => {
    const el = await mount(1280, { ...projectArgs, status: 'ready' });
    expect(region(el).querySelector('sk-notice, sk-status-indicator')).toBeNull();
    expect(region(el).hasAttribute('aria-busy')).toBe(false);
  });

  for (const width of [1280, 900, 390]) {
    for (const status of ['loading', 'error', 'empty'] as const) {
      it(`${status} renders in normal flow above main at ${width}px`, async () => {
        const el = await mount(width, { ...projectArgs, ...statusArgs(status) });
        const status$ = region(el);
        const main = one<HTMLElement>(root(el), 'main');
        const body = one<HTMLElement>(status$, '[data-status-body]');
        expect(getComputedStyle(body).position).toBe('static');
        expect(getComputedStyle(status$).position).toBe('static');
        expect(status$.parentElement).toBe(main.parentElement);
        expect(body.getBoundingClientRect().bottom).toBeLessThanOrEqual(main.getBoundingClientRect().top);
      });
    }
  }

  it('keeps the frame the same in every status', async () => {
    for (const status of statuses) {
      const el = await mount(1280, { ...missionArgs, ...statusArgs(status) });
      expect(root(el).querySelectorAll('[data-rail] sk-shell-nav-item')).toHaveLength(missionArgs.railItems.length);
      expect(root(el).querySelectorAll('sk-context-sidebar')).toHaveLength(1);
      expect(root(el).querySelectorAll('main')).toHaveLength(1);
      el.remove();
    }
  });
});

describe('no layout shift across a breakpoint (NFR-003)', () => {
  const crossings: Array<[number, number]> = [
    [1100, 1099],
    [720, 719],
  ];
  for (const status of ['loading', 'error', 'empty', 'ready'] as const) {
    for (const [from, to] of crossings) {
      it(`${status}: the content top edge is unchanged from ${from}px to ${to}px`, async () => {
        const el = await mount(from, { ...missionArgs, ...statusArgs(status, 'Short') });
        const tier = el.tier;
        const top = (): number => one<HTMLElement>(root(el), 'main').getBoundingClientRect().top;
        const before = top();
        await page.viewport(to, 800);
        await vi.waitFor(() => expect(el.tier).not.toBe(tier));
        await el.updateComplete;
        expect(top()).toBe(before);
      });
    }
  }
});

describe('tab order (NFR-004, SC-003)', () => {
  // Tabs from a sentinel before the shell until the content link, and returns every stop in order.
  async function walk(el: SkMissionShell): Promise<Element[]> {
    const before = document.createElement('a');
    before.href = '#before';
    before.textContent = 'before';
    document.body.prepend(before);
    before.focus();
    const content = one<HTMLElement>(el, '[data-content]');
    const stops: Element[] = [];
    for (let i = 0; i < 40; i += 1) {
      await userEvent.tab();
      const active = deepActive();
      if (!active) break;
      stops.push(active);
      if (active === content) break;
    }
    return stops;
  }

  const cases: Array<[string, number, Args, number]> = [
    // skip link + rail 4 + back link + 3 sidebar items + content
    ['expanded mission', 1280, missionArgs, 1 + 4 + 1 + 3 + 1],
    // skip link + 3 sidebar items + footer + content
    ['expanded project', 1280, projectArgs, 1 + 3 + 1 + 1],
    // skip link + rail 4 + 3 icons + content
    ['collapsed mission', 900, missionArgs, 1 + 4 + 3 + 1],
    // skip link + 3 icons + footer icon + content
    ['collapsed project', 900, projectArgs, 1 + 3 + 1 + 1],
    // skip link + hamburger + content
    ['mobile mission', 390, missionArgs, 1 + 1 + 1],
    ['mobile project', 390, projectArgs, 1 + 1 + 1],
  ];
  for (const [name, width, args, expected] of cases) {
    it(`${name}: ${expected} stops, skip link first`, async () => {
      const el = await mount(width, args);
      const stops = await walk(el);
      expect(stops).toHaveLength(expected);
      expect(new Set(stops).size).toBe(expected);
      expect((stops[0]?.getRootNode() as ShadowRoot).host.closest('[data-skip-link]')).not.toBeNull();
      expect(stops[stops.length - 1]?.getAttribute('data-content')).not.toBeNull();
    });
  }

  it('the skip link focuses the content target and shows its per-screen text', async () => {
    const el = await mount(1280);
    const text = document.createElement('span');
    text.slot = 'skip-link';
    text.textContent = 'Skip to Missions';
    el.append(text);
    await el.updateComplete;
    const before = document.createElement('a');
    before.href = '#before';
    document.body.prepend(before);
    before.focus();
    await userEvent.tab();
    const skip = one<HTMLElement>(root(el), '[data-skip-link]');
    expect(skip.matches(':focus-within')).toBe(true);
    expect(skip.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(one<HTMLSlotElement>(skip, 'slot[name="skip-link"]').assignedNodes()).toEqual([text]);
    await userEvent.keyboard('{Enter}');
    expect(root(el).activeElement).toBe(one(root(el), '[data-focus-target]'));
  });

  it('the skip link is hidden until focused and falls back to "Skip to content"', async () => {
    const el = await mount(1280);
    const skip = one<HTMLElement>(root(el), '[data-skip-link]');
    expect(skip.getBoundingClientRect().width).toBe(0);
    expect(one(skip, 'slot[name="skip-link"]').textContent?.trim()).toBe('Skip to content');
  });
});

describe('long content (NFR-005)', () => {
  // At 200% root font size the content area must not overflow horizontally. (The tier is a window-width query in
  // CSS pixels, so it does not move with the font size: nothing to assert there.)
  for (const width of [1100, 720]) {
    it(`no horizontal overflow at 200% root font size, ${width}px`, async () => {
      const el = await mount(width, { ...missionArgs, ...statusArgs('error', 'A fairly long error message that has to wrap inside the column') });
      document.documentElement.style.fontSize = '200%';
      // Regression guard only, not NFR-005 evidence: the tier is a CSS-px window-width query and cannot move with font size.
      expect(el.tier).toBe(width === 1100 ? 'expanded' : 'collapsed');
      const wide = document.createElement('p');
      wide.textContent = 'Words that wrap normally '.repeat(40);
      el.append(wide);
      await el.updateComplete;
      const content = one<HTMLElement>(root(el), '[data-content]');
      expect(content.scrollWidth).toBeLessThanOrEqual(content.clientWidth);
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
    });
  }

  it('wraps long project and mission names instead of widening the sidebar', async () => {
    const project = await mount(1280, { ...projectArgs, project: longProject });
    const side = one<HTMLElement>(root(project), 'sk-context-sidebar');
    expect(side.scrollWidth).toBeLessThanOrEqual(side.clientWidth);
    project.remove();
    const mission = await mount(1280, { ...missionArgs, mission: longMission });
    mountTree(mission, longTree);
    await mission.updateComplete;
    const missionSide = one<HTMLElement>(root(mission), 'sk-context-sidebar');
    expect(missionSide.getBoundingClientRect().width).toBeLessThanOrEqual(parseFloat(getComputedStyle(document.documentElement).fontSize) * 15 + 1);
  });
});

describe('current marking (FR-018)', () => {
  it('project: the sidebar item announces page, the others nothing', async () => {
    const el = await mount(1280, { ...projectArgs, current: 'nav-drift' });
    const marks = navItems(el, 'sk-context-sidebar');
    expect(marks.find((m) => m.id === 'nav-drift')?.current).toBe('page');
    expect(marks.filter((m) => m.current !== '' && m.id !== 'nav-drift')).toHaveLength(0);
    expect(pageMarks(el)).toBe(1);
  });

  it('mission without a leaf: sidebar page, rail true, a single page mark', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages', railCurrent: 'rail-missions' });
    expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('page');
    expect(navItems(el, '[data-rail]').find((m) => m.id === 'rail-missions')?.current).toBe('true');
    expect(pageMarks(el)).toBe(1);
  });

  it('expanded: a shown tree makes the leaf the page and both shell ancestors true, without manual updates', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages', railCurrent: 'rail-missions' });
    expect(pageMarks(el)).toBe(1);
    const tree = mountTree(el, workPackageTree, 'wp-02');
    await vi.waitFor(() => expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('true'));
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
    expect(navItems(el, '[data-rail]').find((m) => m.id === 'rail-missions')?.current).toBe('true');
    expect(pageAnchors(el)[0]?.getAttribute('href')).toBe('#/wp/02');
    tree.current = 'wp-03';
    await tree.updateComplete;
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/wp/03']));
    tree.current = '';
    await tree.updateComplete;
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/work-packages']));
    expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('page');
    tree.current = 'wp-01';
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/wp/01']));
    tree.current = '';
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
    tree.remove();
    await vi.waitFor(() => expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('page'));
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
  });

  it('an expanded tree with no selected leaf leaves the sidebar item as the single page', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages' });
    mountTree(el, workPackageTree, '');
    await el.updateComplete;
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/work-packages']));
  });

  it('stops observing the tree when disconnected and catches up when connected again', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages' });
    const tree = mountTree(el, workPackageTree, '');
    await el.updateComplete;
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
    el.remove();
    await el.updateComplete;
    const update = vi.spyOn(el, 'requestUpdate');
    tree.current = 'wp-02';
    await tree.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(update).not.toHaveBeenCalled();
    expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('page');
    document.body.append(el);
    await vi.waitFor(() => expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-work-packages')?.current).toBe('true'));
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/wp/02']));
  });

  it('setting the shell current moves the single page mark', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages' });
    el.current = 'nav-artifacts';
    await vi.waitFor(() => expect(navItems(el, 'sk-context-sidebar').find((m) => m.id === 'nav-artifacts')?.current).toBe('page'));
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
  });

  it('collapsed with a tree and a selected leaf: the icon item is the single page, the rail true', async () => {
    const el = await mount(900, { ...missionArgs, current: 'nav-work-packages', railCurrent: 'rail-missions' });
    mountTree(el, workPackageTree, 'wp-02');
    await el.updateComplete;
    expect(navItems(el, '[data-icon-column]').find((m) => m.id === 'nav-work-packages')?.current).toBe('page');
    expect(navItems(el, '[data-rail]').find((m) => m.id === 'rail-missions')?.current).toBe('true');
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
    const icon = one<HTMLElement>(root(el), '[data-icon-column] sk-shell-nav-item[item-id="nav-work-packages"]');
    const row = icon.shadowRoot?.querySelector('sk-action-row');
    expect(row?.hasAttribute('selected')).toBe(true);
  });

  it('collapsing from expanded with a tree moves the page mark from the leaf to the icon item', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nav-work-packages' });
    mountTree(el, workPackageTree, 'wp-02');
    await vi.waitFor(() => expect(pageMarks(el)).toBe(1));
    await page.viewport(900, 800);
    await settleTier(el, 'collapsed');
    await vi.waitFor(() => expect(pageAnchors(el).map((a) => a.getAttribute('href'))).toEqual(['#/work-packages']));
  });

  it('the rail item is the page when it is the only marked item', async () => {
    const el = await mount(1280, { ...missionArgs, current: '', railCurrent: 'rail-drift' });
    expect(navItems(el, '[data-rail]').find((m) => m.id === 'rail-drift')?.current).toBe('page');
    expect(pageMarks(el)).toBe(1);
  });

  it('an unknown id marks nothing', async () => {
    const el = await mount(1280, { ...missionArgs, current: 'nope', railCurrent: 'nada' });
    expect(pageMarks(el)).toBe(0);
    expect(navItems(el, '[data-rail]').every((m) => m.current === '')).toBe(true);
  });

  it('the collapsed icon column and the rail are marked the same way', async () => {
    const el = await mount(900, { ...missionArgs, current: 'nav-artifacts', railCurrent: 'rail-missions' });
    expect(navItems(el, '[data-icon-column]').find((m) => m.id === 'nav-artifacts')?.current).toBe('page');
    expect(navItems(el, '[data-rail]').find((m) => m.id === 'rail-missions')?.current).toBe('true');
    expect(pageMarks(el)).toBe(1);
  });
});

describe('events', () => {
  function collect(name: string): { calls: CustomEvent[]; stop: () => void } {
    const calls: CustomEvent[] = [];
    const listener = (event: Event): void => {
      calls.push(event as CustomEvent);
    };
    document.addEventListener(name, listener);
    return { calls, stop: () => document.removeEventListener(name, listener) };
  }

  it('sk-navigate from a sidebar item carries id and href', async () => {
    const el = await mount(1280, missionArgs);
    const heard = collect('sk-navigate');
    one<HTMLElement>(root(el), 'sk-context-sidebar sk-shell-nav-item[item-id="nav-artifacts"]').focus();
    await userEvent.keyboard('{Enter}');
    heard.stop();
    expect(heard.calls).toHaveLength(1);
    expect(heard.calls[0]?.detail).toEqual<ShellNavigateDetail>({ id: 'nav-artifacts', href: '#/artifacts' });
    expect(heard.calls[0]?.bubbles && heard.calls[0]?.composed).toBe(true);
  });

  it('sk-navigate from a rail item and from the back link', async () => {
    const el = await mount(1280, missionArgs);
    const heard = collect('sk-navigate');
    one<HTMLElement>(root(el), '[data-rail] sk-shell-nav-item[item-id="rail-missions"]').focus();
    await userEvent.keyboard('{Enter}');
    const back = one<HTMLElement>(root(el), 'sk-context-sidebar sk-button');
    back.click();
    heard.stop();
    expect(heard.calls.map((call) => call.detail)).toEqual([
      { id: 'rail-missions', href: '#/missions' },
      { id: 'back-missions', href: '#/missions' },
    ]);
  });

  it('sk-navigate and sk-tree-toggle from a slotted tree pass through as-is', async () => {
    const el = await mount(1280, missionArgs);
    const tree = mountTree(el, artifactsTree);
    await tree.updateComplete;
    const navigate = collect('sk-navigate');
    const toggle = collect('sk-tree-toggle');
    const summary = one<HTMLElement>(tree.shadowRoot as ShadowRoot, 'summary');
    summary.click();
    await vi.waitFor(() => expect(toggle.calls).toHaveLength(1));
    const anchor = deepAll(tree.shadowRoot as ShadowRoot, 'a')[0] as HTMLElement;
    anchor.click();
    navigate.stop();
    toggle.stop();
    expect(toggle.calls[0]?.detail).toEqual<TreeToggleDetail>({ id: 'art-research', expanded: false });
    expect(navigate.calls).toHaveLength(1);
    expect(navigate.calls[0]?.detail).toEqual<ShellNavigateDetail>({ id: 'art-spec', href: '#/artifacts/spec' });
  });

  it('library events do not escape the shell', async () => {
    const el = await mount(1280, missionArgs);
    const tree = mountTree(el, artifactsTree);
    await tree.updateComplete;
    const leaked = collect('sk-action-row-activate');
    // Synthetic, from the content and from inside the shell.
    one(el, '[data-content]').dispatchEvent(new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true }));
    one(root(el), '[data-rail] sk-shell-nav-item').dispatchEvent(new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true }));
    // Real, from activating items.
    one<HTMLElement>(root(el), 'sk-context-sidebar sk-shell-nav-item[item-id="nav-artifacts"]').focus();
    await userEvent.keyboard('{Enter}');
    (deepAll(tree.shadowRoot as ShadowRoot, 'a')[0] as HTMLElement).click();
    leaked.stop();
    expect(leaked.calls).toHaveLength(0);
  });

  it('only declared sk-* events cross the shell on a retry click', async () => {
    const el = await mount(1280, { ...projectArgs, ...statusArgs('error') });
    const names: string[] = [];
    const listener = (event: Event): void => {
      if (event.type.startsWith('sk-')) names.push(event.type);
    };
    for (const name of ['sk-shell-retry', 'sk-action-row-activate', 'sk-button-press', 'sk-navigate']) {
      document.addEventListener(name, listener);
    }
    one<HTMLElement>(root(el), 'sk-button[slot="actions"]').click();
    for (const name of ['sk-shell-retry', 'sk-action-row-activate', 'sk-button-press', 'sk-navigate']) {
      document.removeEventListener(name, listener);
    }
    expect(names).toEqual(['sk-shell-retry']);
  });

  it('two items with the same label are told apart by id', async () => {
    const el = await mount(1280, {
      ...projectArgs,
      navItems: [
        { id: 'a', label: 'Overview', href: '#/a', icon: 'file' },
        { id: 'b', label: 'Overview', href: '#/b', icon: 'folder' },
      ],
    });
    const heard: CustomEvent[] = [];
    const listener = (event: Event): void => {
      heard.push(event as CustomEvent);
    };
    document.addEventListener('sk-navigate', listener);
    one<HTMLElement>(root(el), 'sk-shell-nav-item[item-id="b"]').focus();
    await userEvent.keyboard('{Enter}');
    document.removeEventListener('sk-navigate', listener);
    expect(heard.map((event) => event.detail)).toEqual([{ id: 'b', href: '#/b' }]);
  });
});
