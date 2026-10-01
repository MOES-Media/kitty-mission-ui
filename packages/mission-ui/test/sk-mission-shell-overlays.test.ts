import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@spec-kitty/tokens';
import '../src/index.js';
import type { SkMissionShell } from '../src/elements/sk-mission-shell/sk-mission-shell.js';
import type { SkShellTree } from '../src/elements/sk-shell-tree/sk-shell-tree.js';
import { missionArgs, projectArgs, workPackageTree } from '../src/elements/sk-mission-shell/fixtures.js';
import type { ShellNavigateDetail, ShellTier, ToggleDrawerDetail, ToggleFlyoutDetail } from '../src/shell-types.js';

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.style.fontSize = '';
  vi.restoreAllMocks();
  await page.viewport(414, 896);
});

type Args = Partial<SkMissionShell>;

// Mounts a shell with one focusable anchor as its content. The viewport is set first: the default iframe is 414x896.
async function mount(width: number, args: Args = missionArgs, height = 800): Promise<SkMissionShell> {
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

// True when `node` is `container` or sits inside it in the flat tree (slots and shadow hosts included).
function inside(node: Node | null, container: Element): boolean {
  let walk: Node | null = node;
  while (walk) {
    if (walk === container) return true;
    const slot: Node | null = walk instanceof Element ? walk.assignedSlot : null;
    walk = slot ?? walk.parentNode ?? (walk instanceof ShadowRoot ? walk.host : null);
  }
  return false;
}

async function settleTier(el: SkMissionShell, tier: ShellTier): Promise<void> {
  await vi.waitFor(() => expect(el.tier).toBe(tier));
  await el.updateComplete;
}

function mountTree(el: SkMissionShell, current = ''): SkShellTree {
  const tree = document.createElement('sk-shell-tree');
  tree.slot = 'sidebar-section';
  tree.heading = 'Work packages';
  tree.label = 'Work packages';
  tree.items = workPackageTree;
  tree.current = current;
  el.append(tree);
  return tree;
}

function collect<T = unknown>(name: string): { calls: Array<CustomEvent<T>>; stop: () => void } {
  const calls: Array<CustomEvent<T>> = [];
  const listener = (event: Event): void => {
    calls.push(event as CustomEvent<T>);
  };
  document.addEventListener(name, listener);
  return { calls, stop: () => document.removeEventListener(name, listener) };
}

// Event names in the order they cross the document.
function recorder(names: string[]): { log: string[]; stop: () => void } {
  const log: string[] = [];
  const listeners = names.map((name) => {
    const listener = (event: Event): void => {
      const detail = (event as CustomEvent).detail as Record<string, unknown> | undefined;
      log.push(detail && 'reason' in detail ? `${name}:${String(detail.open)}:${String(detail.reason)}` : name);
    };
    document.addEventListener(name, listener);
    return [name, listener] as const;
  });
  return { log, stop: () => listeners.forEach(([name, listener]) => document.removeEventListener(name, listener)) };
}

const hamburger = (el: SkMissionShell): HTMLElement => one<HTMLElement>(root(el), 'header sk-button');
const dialog = (el: SkMissionShell): HTMLDialogElement => one<HTMLDialogElement>(root(el), 'dialog[data-drawer]');
const flyout = (el: SkMissionShell): HTMLElement => one<HTMLElement>(root(el), '[data-flyout]');
const icon = (el: SkMissionShell, id = 'nav-work-packages'): HTMLElement & { current: string } =>
  one<HTMLElement & { current: string }>(root(el), `[data-icon-column] sk-shell-nav-item[item-id="${id}"]`);
const mainBox = (el: SkMissionShell): { top: number; left: number } => {
  const box = one<HTMLElement>(root(el), 'main').getBoundingClientRect();
  return { top: box.top, left: box.left };
};

async function openDrawer(el: SkMissionShell): Promise<void> {
  hamburger(el).click();
  await vi.waitFor(() => expect(dialog(el).open).toBe(true));
  await el.updateComplete;
}

async function openFlyout(el: SkMissionShell): Promise<void> {
  icon(el).shadowRoot?.querySelector('sk-action-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  await vi.waitFor(() => expect(el.flyoutOpen).toBe(true));
  await el.updateComplete;
}

const pageAnchors = (el: SkMissionShell): Element[] =>
  deepAll(el, '[aria-current="page"]').filter((anchor) => {
    // A slotted tree that is not assigned to a rendered slot is outside the accessibility tree.
    let node: Node | null = anchor;
    while (node) {
      if (node instanceof Element && node.localName === 'sk-shell-tree') return node.assignedSlot !== null;
      node = node instanceof ShadowRoot ? node.host : node.parentNode;
    }
    return true;
  });

describe('drawer (mobile, FR-007)', () => {
  it('opens from the hamburger: cancelable event first, dialog modal, focus inside, drawerOpen reflects it', async () => {
    const el = await mount(390);
    const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
    expect(dialog(el).open).toBe(false);
    hamburger(el).click();
    await vi.waitFor(() => expect(dialog(el).open).toBe(true));
    heard.stop();
    expect(heard.calls).toHaveLength(1);
    expect(heard.calls[0]?.detail).toEqual({ open: true, reason: 'hamburger' });
    expect(heard.calls[0]?.cancelable && heard.calls[0]?.bubbles && heard.calls[0]?.composed).toBe(true);
    expect(el.drawerOpen).toBe(true);
    expect(dialog(el).matches(':modal')).toBe(true);
    await vi.waitFor(() => expect(root(el).activeElement?.hasAttribute('data-drawer-close')).toBe(true));
    expect(inside(deepActive(), dialog(el))).toBe(true);
  });

  it('is the only role: a labelled dialog, the page behind is inert, the head and sections are inside', async () => {
    const el = await mount(390);
    mountTree(el, 'wp-02');
    await openDrawer(el);
    expect(dialog(el).getAttribute('aria-label')).toBeTruthy();
    expect(dialog(el).querySelector('[role]')).toBeNull();
    expect(dialog(el).querySelector('nav[aria-label="Global navigation"]')).not.toBeNull();
    expect(dialog(el).querySelector('slot[name="sidebar-section"]')).not.toBeNull();
    expect(root(el).querySelectorAll('dialog')).toHaveLength(1);
    // The content behind a modal dialog cannot be focused.
    one<HTMLElement>(el, '[data-content]').focus();
    expect(document.activeElement).not.toBe(one(el, '[data-content]'));
  });

  it('fills the dialog with the library sidebar, so no UA panel shows (G-11)', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const side = one<HTMLElement>(dialog(el), 'sk-context-sidebar');
    const part = side.shadowRoot?.querySelector('aside');
    const box = dialog(el).getBoundingClientRect();
    const partBox = (part as HTMLElement).getBoundingClientRect();
    const border = parseFloat(getComputedStyle(dialog(el)).borderTopWidth);
    // The UA border stays (design-review item); inside it the sidebar covers the dialog edge to edge.
    expect(Math.round(partBox.height)).toBe(Math.round(box.height - 2 * border));
    expect(Math.round(partBox.width)).toBe(Math.round(box.width - 2 * border));
    expect(box.left).toBe(0);
    expect(box.height).toBe(document.documentElement.clientHeight);
  });

  it('the close button closes it: reason close, focus back on the hamburger', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
    one<HTMLElement>(dialog(el), '[data-drawer-close]').click();
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'close' }]);
    expect(el.drawerOpen).toBe(false);
    expect(root(el).activeElement).toBe(hamburger(el));
  });

  it('Escape closes it: reason escape, focus back on the hamburger, even on a second round', async () => {
    const el = await mount(390);
    for (let round = 0; round < 2; round += 1) {
      await openDrawer(el);
      const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
      await userEvent.keyboard('{Escape}');
      await vi.waitFor(() => expect(dialog(el).open).toBe(false));
      heard.stop();
      expect(heard.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'escape' }]);
      expect(root(el).activeElement).toBe(hamburger(el));
    }
  });

  it('a backdrop click closes it, a click inside does not', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
    one<HTMLElement>(dialog(el), '[data-drawer-body]').click();
    expect(dialog(el).open).toBe(true);
    expect(heard.calls).toHaveLength(0);
    dialog(el).click();
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'backdrop' }]);
    expect(root(el).activeElement).toBe(hamburger(el));
  });

  it('a real click on the backdrop (outside the panel) closes it', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
    // The panel is 15rem wide at the inline start; the backdrop covers the rest of the viewport.
    await page.elementLocator(dialog(el)).click({ position: { x: 380, y: 400 } });
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.calls.at(-1)?.detail).toEqual({ open: false, reason: 'backdrop' });
  });

  it('choosing a navigation item closes it after sk-navigate, focus on the content target', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = recorder(['sk-navigate', 'sk-toggle-drawer']);
    one<HTMLElement>(dialog(el), 'sk-shell-nav-item[item-id="nav-artifacts"]').focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.log).toEqual(['sk-navigate', 'sk-toggle-drawer:false:navigate']);
    expect(root(el).activeElement).toBe(one(root(el), '[data-focus-target]'));
  });

  it('a rail item and the back link close it too', async () => {
    const el = await mount(390);
    await openDrawer(el);
    one<HTMLElement>(dialog(el), 'nav[aria-label="Global navigation"] sk-shell-nav-item[item-id="rail-drift"]').focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    await openDrawer(el);
    one<HTMLElement>(dialog(el), 'sk-button[href]').click();
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
  });

  it('leaving the mobile tier closes it once: reason resize, no further events', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = recorder(['sk-toggle-drawer', 'sk-toggle-flyout']);
    await page.viewport(900, 800);
    await settleTier(el, 'collapsed');
    await new Promise((resolve) => setTimeout(resolve, 50));
    heard.stop();
    expect(heard.log).toEqual(['sk-toggle-drawer:false:resize']);
    expect(el.drawerOpen).toBe(false);
    expect(root(el).querySelector('dialog')).toBeNull();
  });

  it('a prevented sk-toggle-drawer leaves the state unchanged, closed and open', async () => {
    const el = await mount(390);
    const veto = (event: Event): void => event.preventDefault();
    el.addEventListener('sk-toggle-drawer', veto);
    hamburger(el).click();
    await el.updateComplete;
    expect(dialog(el).open).toBe(false);
    expect(el.drawerOpen).toBe(false);
    el.removeEventListener('sk-toggle-drawer', veto);
    await openDrawer(el);
    el.addEventListener('sk-toggle-drawer', veto);
    await userEvent.keyboard('{Escape}');
    one<HTMLElement>(dialog(el), '[data-drawer-close]').click();
    dialog(el).click();
    await el.updateComplete;
    expect(dialog(el).open).toBe(true);
    expect(el.drawerOpen).toBe(true);
    expect(dialog(el).querySelector('[data-drawer-body]')).not.toBeNull();
  });

  it('a host-set drawerOpen outside mobile is ignored', async () => {
    for (const width of [1280, 900]) {
      const el = await mount(width);
      const heard = collect('sk-toggle-drawer');
      el.drawerOpen = true;
      await el.updateComplete;
      heard.stop();
      expect(el.drawerOpen).toBe(false);
      expect(heard.calls).toHaveLength(0);
      el.remove();
    }
  });

  it('a host-set drawerOpen inside mobile opens and closes the dialog without events, focus moves the same way', async () => {
    const el = await mount(390);
    const heard = collect('sk-toggle-drawer');
    el.drawerOpen = true;
    await vi.waitFor(() => expect(dialog(el).open).toBe(true));
    await vi.waitFor(() => expect(root(el).activeElement?.hasAttribute('data-drawer-close')).toBe(true));
    el.drawerOpen = false;
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.calls).toHaveLength(0);
    expect(root(el).activeElement).toBe(hamburger(el));
  });

  it('a native close syncs drawerOpen, without events', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const heard = collect('sk-toggle-drawer');
    dialog(el).close();
    await vi.waitFor(() => expect(el.drawerOpen).toBe(false));
    await el.updateComplete;
    heard.stop();
    expect(heard.calls).toHaveLength(0);
  });

  it('does not move the content: main keeps its top and left edge while open', async () => {
    const el = await mount(390);
    const before = mainBox(el);
    await openDrawer(el);
    expect(mainBox(el)).toEqual(before);
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    expect(mainBox(el)).toEqual(before);
  });

  it('library events do not escape the shell while it is open', async () => {
    const el = await mount(390);
    mountTree(el);
    await openDrawer(el);
    const leaked = collect('sk-action-row-activate');
    one<HTMLElement>(dialog(el), 'sk-shell-nav-item[item-id="nav-artifacts"]').dispatchEvent(
      new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true }),
    );
    one<HTMLElement>(dialog(el), 'sk-shell-nav-item[item-id="nav-artifacts"]').focus();
    await userEvent.keyboard('{Enter}');
    leaked.stop();
    expect(leaked.calls).toHaveLength(0);
  });

  it('tab order: focus is contained in the modal drawer and cycles through its stops (NFR-004)', async () => {
    const el = await mount(390);
    mountTree(el, 'wp-02');
    await openDrawer(el);
    await vi.waitFor(() => expect(root(el).activeElement?.hasAttribute('data-drawer-close')).toBe(true));
    const stops: Element[] = [];
    for (let i = 0; i < 24; i += 1) {
      const active = deepActive();
      if (!active || stops.includes(active)) break;
      // Past the last stop a modal dialog hands focus to the browser UI (the body in a headless run): that is the wrap point.
      if (active === document.body) {
        await userEvent.tab();
        continue;
      }
      stops.push(active);
      await userEvent.tab();
    }
    // close + 4 rail items + back link + 3 navigation items + 4 tree leaves: more than the shell's own stops.
    expect(stops.length).toBeGreaterThanOrEqual(1 + 4 + 1 + 3 + 4);
    expect(new Set(stops).size).toBe(stops.length);
    for (const stop of stops) expect(inside(stop, dialog(el)), `${stop.localName} is inside the dialog`).toBe(true);
    expect((stops[0]?.getRootNode() as ShadowRoot).host).toBe(one(dialog(el), '[data-drawer-close]'));
    // The page behind is never reached: the skip link, the hamburger and the content are not among the stops.
    expect(stops.some((stop) => stop.closest('a[data-content]') !== null)).toBe(false);
    expect(stops.some((stop) => (stop.getRootNode() as ShadowRoot).host === hamburger(el))).toBe(false);
  });

  it('current marking: exactly one aria-current page per state, the leaf when the drawer shows the tree', async () => {
    const el = await mount(390, { ...missionArgs, current: 'nav-work-packages', railCurrent: 'rail-missions' });
    mountTree(el, 'wp-02');
    await el.updateComplete;
    // Closed: the tree is not shown, no drawer content at all.
    expect(pageAnchors(el)).toHaveLength(0);
    await openDrawer(el);
    await vi.waitFor(() => expect(pageAnchors(el).map((anchor) => anchor.getAttribute('href'))).toEqual(['#/wp/02']));
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    expect(pageAnchors(el)).toHaveLength(0);
  });

  it('current marking: without a selected leaf the drawer shows the sidebar item as the single page', async () => {
    const el = await mount(390, { ...missionArgs, current: 'nav-work-packages', railCurrent: 'rail-missions' });
    mountTree(el, '');
    await openDrawer(el);
    await vi.waitFor(() => expect(pageAnchors(el).map((anchor) => anchor.getAttribute('href'))).toEqual(['#/work-packages']));
  });

  it('the rail strip is one non-wrapping row of compact icons, with the nav and the tree above the fold at 390x800', async () => {
    const el = await mount(390, missionArgs, 800);
    mountTree(el, 'wp-02');
    await openDrawer(el);
    const items = Array.from(dialog(el).querySelectorAll<HTMLElement & { compact: boolean }>('[data-drawer-strip] sk-shell-nav-item'));
    expect(items).toHaveLength(missionArgs.railItems.length);
    expect(items.every((item) => item.compact)).toBe(true);
    const boxes = items.map((item) => item.getBoundingClientRect());
    expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1);
    boxes.forEach((box, index) => {
      if (index > 0) expect(box.left).toBeGreaterThan(boxes[index - 1]?.left ?? 0);
    });
    const strip = one<HTMLElement>(dialog(el), '[data-drawer-strip]');
    expect(getComputedStyle(strip).flexWrap).toBe('nowrap');
    expect(strip.getBoundingClientRect().bottom).toBeLessThan(150);
    const firstNav = one<HTMLElement>(dialog(el), 'nav[aria-label="Section navigation"]').getBoundingClientRect();
    expect(firstNav.bottom).toBeLessThan(560);
    await vi.waitFor(() => {
      const leaf = deepAll(one(el, 'sk-shell-tree').shadowRoot as ShadowRoot, 'a')[0] as HTMLElement;
      expect(leaf.getBoundingClientRect().bottom).toBeLessThanOrEqual(800);
    });
  });

  it('Escape with a strip label bubble visible closes only the bubble, the next Escape closes the drawer', async () => {
    const el = await mount(390);
    await openDrawer(el);
    const item = one<HTMLElement>(dialog(el), '[data-drawer-strip] sk-shell-nav-item');
    await userEvent.hover(page.elementLocator(item));
    await vi.waitFor(() => expect(item.shadowRoot?.querySelector('sk-pill-tag')).not.toBeNull());
    const heard = collect<ToggleDrawerDetail>('sk-toggle-drawer');
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(item.shadowRoot?.querySelector('sk-pill-tag')).toBeNull());
    expect(dialog(el).open).toBe(true);
    expect(el.drawerOpen).toBe(true);
    expect(heard.calls).toHaveLength(0);
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(dialog(el).open).toBe(false));
    heard.stop();
    expect(heard.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'escape' }]);
  });

  it('every strip icon label bubble lies fully inside the drawer, on hover and on focus (last icon included)', async () => {
    const el = await mount(390, missionArgs, 800);
    await openDrawer(el);
    const items = Array.from(dialog(el).querySelectorAll<HTMLElement>('[data-drawer-strip] sk-shell-nav-item'));
    const within = (item: HTMLElement): void => {
      const tag = item.shadowRoot?.querySelector('sk-pill-tag')?.getBoundingClientRect();
      const panel = dialog(el).getBoundingClientRect();
      expect(tag, 'bubble shown').toBeDefined();
      expect(tag?.right).toBeLessThanOrEqual(panel.right);
      expect(tag?.left).toBeGreaterThanOrEqual(panel.left);
      expect(tag?.bottom).toBeLessThanOrEqual(panel.bottom);
    };
    for (const item of items) {
      await userEvent.hover(page.elementLocator(item));
      await vi.waitFor(() => expect(item.shadowRoot?.querySelector('sk-pill-tag')).not.toBeNull());
      await vi.waitFor(() => within(item));
      await userEvent.unhover(page.elementLocator(item));
      item.focus();
      await vi.waitFor(() => expect(item.shadowRoot?.querySelector('sk-pill-tag')).not.toBeNull());
      await vi.waitFor(() => within(item));
      (item.shadowRoot?.querySelector('sk-action-row')?.shadowRoot?.querySelector('a') as HTMLElement).blur();
    }
  });

  it('project layout: no rail strip, the project head and the footer item are inside', async () => {
    const el = await mount(390, projectArgs);
    await openDrawer(el);
    expect(dialog(el).querySelector('[data-drawer-strip]')).toBeNull();
    expect(dialog(el).querySelector('sk-shell-nav-item[item-id="nav-projects"]')).not.toBeNull();
    expect(dialog(el).querySelector('sk-section-header')).not.toBeNull();
  });
});

describe('flyout (collapsed tier, FR-007, FR-011)', () => {
  const sectionArgs = { ...missionArgs, current: 'nav-work-packages' };

  async function mountFlyout(current = ''): Promise<{ el: SkMissionShell; tree: SkShellTree }> {
    const el = await mount(900, sectionArgs);
    const tree = mountTree(el, current);
    await el.updateComplete;
    return { el, tree };
  }

  it('the current icon opens it with no sk-navigate: one cancelable event, content unmoved, focus inside', async () => {
    const { el } = await mountFlyout();
    const before = mainBox(el);
    const navigate = collect<ShellNavigateDetail>('sk-navigate');
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    icon(el).focus();
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(true));
    await el.updateComplete;
    navigate.stop();
    toggle.stop();
    expect(navigate.calls).toHaveLength(0);
    expect(toggle.calls).toHaveLength(1);
    expect(toggle.calls[0]?.detail).toEqual({ open: true, reason: 'activate' });
    expect(toggle.calls[0]?.cancelable && toggle.calls[0]?.bubbles && toggle.calls[0]?.composed).toBe(true);
    expect(mainBox(el)).toEqual(before);
    await vi.waitFor(() => expect(inside(deepActive(), flyout(el))).toBe(true));
    expect(flyout(el).querySelector('sk-context-sidebar')).not.toBeNull();
    expect(flyout(el).querySelector('slot[name="sidebar-section"]')).not.toBeNull();
    // Beside the icon column, over the content cell, at the sidebar width.
    const box = flyout(el).getBoundingClientRect();
    expect(box.left).toBeGreaterThanOrEqual(mainBox(el).left - 1);
    expect(Math.round(box.width)).toBe(Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 15));
  });

  it('the icon toggles it shut again (reason activate)', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    icon(el).shadowRoot?.querySelector('sk-action-row')?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    toggle.stop();
    expect(toggle.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'activate' }]);
  });

  it('other icons navigate normally, and so does the current icon without section content', async () => {
    const { el } = await mountFlyout();
    const navigate = collect<ShellNavigateDetail>('sk-navigate');
    const toggle = collect('sk-toggle-flyout');
    icon(el, 'nav-artifacts').focus();
    await userEvent.keyboard('{Enter}');
    navigate.stop();
    toggle.stop();
    expect(navigate.calls.map((call) => call.detail)).toEqual([{ id: 'nav-artifacts', href: '#/artifacts' }]);
    expect(toggle.calls).toHaveLength(0);
    expect(el.flyoutOpen).toBe(false);

    const bare = await mount(900, sectionArgs);
    const bareNavigate = collect<ShellNavigateDetail>('sk-navigate');
    icon(bare).focus();
    await userEvent.keyboard('{Enter}');
    bareNavigate.stop();
    expect(bareNavigate.calls.map((call) => call.detail)).toEqual([{ id: 'nav-work-packages', href: '#/work-packages' }]);
    expect(bare.flyoutOpen).toBe(false);
  });

  it('Escape closes it: reason escape, focus back on the icon', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    await el.updateComplete;
    toggle.stop();
    expect(toggle.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'escape' }]);
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
    await vi.waitFor(() => expect(root(el).activeElement).toBe(icon(el)));
  });

  it('a pointerdown outside closes it (composedPath), one inside the tree shadow does not', async () => {
    const { el, tree } = await mountFlyout();
    await openFlyout(el);
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    const deepInTree = deepAll(tree.shadowRoot as ShadowRoot, 'a')[0] as HTMLElement;
    deepInTree.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    one<HTMLElement>(flyout(el), 'sk-section-header').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    icon(el).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.flyoutOpen).toBe(true);
    expect(toggle.calls).toHaveLength(0);
    // Far right of the content cell: the flyout covers its start.
    await page.elementLocator(one(root(el), 'main')).click({ position: { x: 600, y: 300 } });
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    toggle.stop();
    expect(toggle.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'outside' }]);
  });

  it('tabbing out of it closes it (reason outside), tabbing inside does not', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    await vi.waitFor(() => expect(inside(deepActive(), flyout(el))).toBe(true));
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    const stops: Element[] = [];
    for (let i = 0; i < 12 && el.flyoutOpen; i += 1) {
      const active = deepActive();
      if (active) stops.push(active);
      await userEvent.tab();
      await el.updateComplete;
    }
    toggle.stop();
    expect(el.flyoutOpen).toBe(false);
    // back link first (the head), then the four tree leaves: all inside the flyout.
    expect(stops.length).toBeGreaterThanOrEqual(1 + 4);
    expect(toggle.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'outside' }]);
    // The flyout precedes the content in the DOM, so Tab-out lands on the content.
    expect(deepActive()).toBe(one(el, '[data-content]'));
  });

  it('tab order: Shift+Tab out of the flyout lands on the icon column and closes it', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    await vi.waitFor(() => expect(inside(deepActive(), flyout(el))).toBe(true));
    await userEvent.tab({ shift: true });
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    // The flyout follows the icon column in the DOM: Shift+Tab from its first stop lands on an icon.
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
    expect(root(el).activeElement?.closest('[data-icon-column]')).not.toBeNull();
  });

  it('choosing an item closes it after sk-navigate, focus on the content target', async () => {
    const { el, tree } = await mountFlyout();
    await openFlyout(el);
    const heard = recorder(['sk-navigate', 'sk-toggle-flyout']);
    (deepAll(tree.shadowRoot as ShadowRoot, 'a')[1] as HTMLElement).click();
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    await el.updateComplete;
    heard.stop();
    expect(heard.log).toEqual(['sk-navigate', 'sk-toggle-flyout:false:navigate']);
    await vi.waitFor(() => expect(root(el).activeElement).toBe(one(root(el), '[data-focus-target]')));
  });

  it('leaving the collapsed tier closes it once: reason tier, no further events', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    const heard = recorder(['sk-toggle-flyout', 'sk-toggle-drawer']);
    await page.viewport(1280, 800);
    await settleTier(el, 'expanded');
    await new Promise((resolve) => setTimeout(resolve, 50));
    heard.stop();
    expect(heard.log).toEqual(['sk-toggle-flyout:false:tier']);
    expect(el.flyoutOpen).toBe(false);
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
  });

  it('a prevented sk-toggle-flyout leaves it unchanged, closed and open', async () => {
    const { el } = await mountFlyout();
    const veto = (event: Event): void => event.preventDefault();
    el.addEventListener('sk-toggle-flyout', veto);
    icon(el).focus();
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(el.flyoutOpen).toBe(false);
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
    el.removeEventListener('sk-toggle-flyout', veto);
    await openFlyout(el);
    el.addEventListener('sk-toggle-flyout', veto);
    await userEvent.keyboard('{Escape}');
    await page.elementLocator(one(root(el), 'main')).click({ position: { x: 600, y: 300 } });
    await el.updateComplete;
    expect(el.flyoutOpen).toBe(true);
    expect(root(el).querySelector('[data-flyout]')).not.toBeNull();
  });

  it('Escape with the label bubble visible closes only the bubble, the next Escape closes the flyout', async () => {
    const { el } = await mountFlyout();
    await openFlyout(el);
    await userEvent.hover(page.elementLocator(icon(el)));
    await vi.waitFor(() => expect(icon(el).shadowRoot?.querySelector('sk-pill-tag')).not.toBeNull());
    const toggle = collect<ToggleFlyoutDetail>('sk-toggle-flyout');
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(icon(el).shadowRoot?.querySelector('sk-pill-tag')).toBeNull());
    expect(el.flyoutOpen).toBe(true);
    expect(toggle.calls).toHaveLength(0);
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    toggle.stop();
    expect(toggle.calls.map((call) => call.detail)).toEqual([{ open: false, reason: 'escape' }]);
  });

  it('adds its document listeners on open, removes them on close and on disconnect', async () => {
    const { el } = await mountFlyout();
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const names = (spy: typeof add): string[] => spy.mock.calls.map((call) => String(call[0]));
    await openFlyout(el);
    expect(names(add)).toEqual(expect.arrayContaining(['keydown', 'pointerdown']));
    add.mockClear();
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    await el.updateComplete;
    expect(names(remove)).toEqual(expect.arrayContaining(['keydown', 'pointerdown']));
    // Open again, then remove the element while open.
    await openFlyout(el);
    remove.mockClear();
    el.remove();
    expect(names(remove)).toEqual(expect.arrayContaining(['keydown', 'pointerdown']));
    // Gone for good: neither listener is left to react.
    const toggle = collect('sk-toggle-flyout');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    toggle.stop();
    expect(toggle.calls).toHaveLength(0);
  });

  it('library events do not escape the shell while it is open', async () => {
    const { el, tree } = await mountFlyout();
    await openFlyout(el);
    const leaked = collect('sk-action-row-activate');
    tree.dispatchEvent(new CustomEvent('sk-action-row-activate', { bubbles: true, composed: true }));
    (deepAll(tree.shadowRoot as ShadowRoot, 'a')[0] as HTMLElement).click();
    leaked.stop();
    expect(leaked.calls).toHaveLength(0);
  });

  it('a host-set flyoutOpen outside collapsed is ignored, inside collapsed it opens without events', async () => {
    for (const width of [1280, 390]) {
      const el = await mount(width, sectionArgs);
      const heard = collect('sk-toggle-flyout');
      el.flyoutOpen = true;
      await el.updateComplete;
      heard.stop();
      expect(el.flyoutOpen).toBe(false);
      expect(heard.calls).toHaveLength(0);
      el.remove();
    }
    const { el } = await mountFlyout();
    const heard = collect('sk-toggle-flyout');
    el.flyoutOpen = true;
    await vi.waitFor(() => expect(root(el).querySelector('[data-flyout]')).not.toBeNull());
    el.flyoutOpen = false;
    await vi.waitFor(() => expect(root(el).querySelector('[data-flyout]')).toBeNull());
    heard.stop();
    expect(heard.calls).toHaveLength(0);
  });

  it('current marking: the leaf is the single page while the flyout is open, the icon item the single page when shut', async () => {
    const { el } = await mountFlyout('wp-02');
    const marks = (): Array<string | null> => pageAnchors(el).map((anchor) => anchor.getAttribute('href'));
    await vi.waitFor(() => expect(marks()).toEqual(['#/work-packages']));
    await openFlyout(el);
    await vi.waitFor(() => expect(marks()).toEqual(['#/wp/02']));
    expect(icon(el).current).toBe('true');
    await userEvent.keyboard('{Escape}');
    await vi.waitFor(() => expect(el.flyoutOpen).toBe(false));
    await vi.waitFor(() => expect(marks()).toEqual(['#/work-packages']));
    expect(icon(el).current).toBe('page');
  });

  it('current marking follows a tree selection change while open, without a manual update', async () => {
    const { el, tree } = await mountFlyout('wp-02');
    await openFlyout(el);
    tree.current = 'wp-03';
    await vi.waitFor(() => expect(pageAnchors(el).map((anchor) => anchor.getAttribute('href'))).toEqual(['#/wp/03']));
    tree.current = '';
    await vi.waitFor(() => expect(pageAnchors(el).map((anchor) => anchor.getAttribute('href'))).toEqual(['#/work-packages']));
  });
});

describe('frame stays consistent around the overlays', () => {
  it('the drawer and the flyout never coexist', async () => {
    const el = await mount(900, { ...missionArgs, current: 'nav-work-packages' });
    mountTree(el);
    await openFlyout(el);
    await page.viewport(390, 800);
    await settleTier(el, 'mobile');
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
    expect(el.flyoutOpen).toBe(false);
    expect(dialog(el).open).toBe(false);
  });

  it('the expanded tier renders neither overlay', async () => {
    const el = await mount(1280, missionArgs);
    expect(root(el).querySelector('dialog')).toBeNull();
    expect(root(el).querySelector('[data-flyout]')).toBeNull();
  });
});
